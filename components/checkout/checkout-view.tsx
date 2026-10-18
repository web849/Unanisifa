"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import {
  BadgePercent,
  Banknote,
  MapPin,
  ShieldCheck,
  Stethoscope,
  Tag,
  X,
} from "lucide-react";
import { useCart } from "@/components/cart/cart-provider";
import { useToast } from "@/components/store/toast";
import type { PricedCart } from "@/lib/cart/types";
import { formatTaka, toBanglaDigits } from "@/lib/utils";
import { MEDICAL_DISCLAIMER } from "@/lib/config";
import { isValidAddress, isValidBdPhone } from "@/lib/orders/validation-client";
import { AddToCartButton } from "@/components/cart/add-to-cart-button";

type CommerceInfo = {
  deliveryInsideDhaka: number;
  deliveryOutsideDhaka: number;
  freeDeliveryThreshold: number;
  codEnabled: boolean;
  maxQuantity: number;
};

type OfferProduct = {
  id: number;
  name: string;
  slug: string;
  price: number;
  compareAtPrice: number | null;
  image: string | null;
  badge: string | null;
};

type CouponState =
  | { status: "idle" }
  | { status: "checking" }
  | { status: "applied"; code: string; discount: number; summary: string }
  | { status: "error"; message: string };

const STEPS = ["আপনার তথ্য", "ডেলিভারি এরিয়া", "নিশ্চিতকরণ"] as const;

/**
 * চেকআউট — ৩-স্টেপ ইন্ডিকেটর, সার্ভার-অথরিটেটিভ সামারি,
 * কুপন (?coupon= প্রি-ফিল), হানি-পট, অ্যাবান্ডনড অটো-সেভ, idempotencyKey।
 */
export function CheckoutView({ commerce }: { commerce: CommerceInfo }) {
  const router = useRouter();
  const params = useSearchParams();
  const toast = useToast();
  const { items, clear } = useCart();

  const [priced, setPriced] = useState<PricedCart | null>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [area, setArea] = useState<"inside_dhaka" | "outside_dhaka">("inside_dhaka");
  const [note, setNote] = useState("");
  const [honey, setHoney] = useState("");
  const [couponInput, setCouponInput] = useState(params.get("coupon") ?? "");
  const [coupon, setCoupon] = useState<CouponState>({ status: "idle" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [offers, setOffers] = useState<OfferProduct[]>([]);
  const formOpenedAt = useRef(Date.now());
  const idempotencyKey = useRef(
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `ik-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );

  /* ---- কার্ট প্রাইসিং (সার্ভার) ---- */
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (items.length === 0) {
        setPriced({ lines: [], subtotal: 0, unavailableCount: 0 });
        setLoading(false);
        return;
      }
      const response = await fetch("/api/cart/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      const payload = (await response.json()) as PricedCart;
      if (!cancelled) {
        setPriced(payload);
        setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [items]);

  /* ---- চেকআউট-এক্সক্লুসিভ অফার ---- */
  useEffect(() => {
    void fetch("/api/offers/checkout", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { offers: [] }))
      .then((payload: { offers?: OfferProduct[] }) => setOffers(payload.offers ?? []))
      .catch(() => setOffers([]));
  }, []);

  /* ---- অ্যাবান্ডনড অটো-সেভ (debounce) ---- */
  useEffect(() => {
    if (!name || !phone || address.trim().length < 8) return;
    const timer = window.setTimeout(() => {
      void fetch("/api/orders", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          phone,
          address,
          area,
          email,
          items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
          subtotal: priced?.subtotal ?? 0,
        }),
      }).catch(() => undefined);
    }, 1600);
    return () => window.clearTimeout(timer);
  }, [name, phone, address, area, email, items, priced]);

  const subtotal = priced?.subtotal ?? 0;
  const baseDelivery = area === "inside_dhaka" ? commerce.deliveryInsideDhaka : commerce.deliveryOutsideDhaka;
  const freeByThreshold = commerce.freeDeliveryThreshold > 0 && subtotal >= commerce.freeDeliveryThreshold;
  const delivery = useMemo(() => {
    if (freeByThreshold) return 0;
    if (coupon.status === "applied") return Math.max(0, baseDelivery - Math.min(baseDelivery, couponDiscountWaiver(coupon.summary, baseDelivery)));
    return baseDelivery;
  }, [freeByThreshold, baseDelivery, coupon]);

  const discount = coupon.status === "applied" ? coupon.discount : 0;
  const total = Math.max(1, subtotal - discount + delivery);

  const step1Done = name.trim().length >= 2 && isValidBdPhone(phone) && isValidAddress(address);
  const step2Done = step1Done && Boolean(area);
  const currentStep = !step1Done ? 0 : !step2Done ? 1 : 2;

  const requiresPrescription = (priced?.lines ?? []).some((line) => line.requiresPrescription);

  const applyCoupon = async (code: string) => {
    if (!code.trim()) return;
    setCoupon({ status: "checking" });
    try {
      const response = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, subtotal }),
      });
      const payload = (await response.json()) as {
        ok?: boolean;
        error?: string;
        code?: string;
        discount?: number;
        summary?: string;
      };
      if (!response.ok || !payload.ok) {
        setCoupon({ status: "error", message: payload.error ?? "কুপন প্রযোজ্য নয়।" });
        return;
      }
      setCoupon({
        status: "applied",
        code: payload.code ?? code.toUpperCase(),
        discount: payload.discount ?? 0,
        summary: payload.summary ?? "",
      });
    } catch {
      setCoupon({ status: "error", message: "কুপন যাচাই করা যায়নি। আবার চেষ্টা করুন।" });
    }
  };

  useEffect(() => {
    const preset = params.get("coupon");
    if (preset && subtotal > 0) void applyCoupon(preset);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subtotal]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const nextErrors: Record<string, string> = {};
    if (name.trim().length < 2) nextErrors.name = "নাম লিখুন";
    if (!isValidBdPhone(phone)) nextErrors.phone = "সঠিক বাংলাদেশি মোবাইল নম্বর দিন";
    if (!isValidAddress(address)) nextErrors.address = "সম্পূর্ণ ঠিকানা লিখুন (কমপক্ষে ৮ অক্ষর)";
    if (honey) nextErrors.honey = "ফর্ম সঠিক নয়";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((i) => ({
            productId: i.productId,
            variantId: i.variantId,
            quantity: i.quantity,
          })),
          name: name.trim(),
          phone,
          email,
          address: address.trim(),
          area,
          note,
          couponCode: coupon.status === "applied" ? coupon.code : "",
          idempotencyKey: idempotencyKey.current,
          formOpenedAt: formOpenedAt.current,
          website: honey,
        }),
      });
      const payload = (await response.json()) as {
        ok?: boolean;
        error?: string;
        publicToken?: string;
        orderNumber?: string;
      };
      if (!response.ok || !payload.ok || !payload.publicToken) {
        toast(payload.error ?? "অর্ডার করা যায়নি। আবার চেষ্টা করুন।", "error");
        setSubmitting(false);
        return;
      }
      clear();
      router.push(`/thank-you?token=${payload.publicToken}`);
    } catch {
      toast("নেটওয়ার্ক সমস্যা। আবার চেষ্টা করুন।", "error");
      setSubmitting(false);
    }
  };

  if (!loading && (priced?.lines.length ?? 0) === 0) {
    return (
      <section className="section">
        <div className="container container-narrow">
          <div className="empty-state">
            <Banknote aria-hidden="true" />
            <p className="empty-state-title">কার্ট খালি</p>
            <p>চেকআউটের আগে কার্টে পণ্য যোগ করুন।</p>
            <Link className="btn" href="/products">
              পণ্য দেখুন
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="section">
      <div className="container">
        <p className="eyebrow">চেকআউট</p>
        <h1 className="section-title">অর্ডার নিশ্চিত করুন</h1>

        <ol className="stepper" aria-label="চেকআউট ধাপ">
          {STEPS.map((label, index) => (
            <li
              key={label}
              className="stepper-item"
              data-state={index < currentStep ? "done" : index === currentStep ? "active" : "todo"}
            >
              <span className="stepper-dot">{toBanglaDigits(index + 1)}</span>
              <span className="stepper-label">{label}</span>
              {index < STEPS.length - 1 ? <span className="stepper-line" aria-hidden="true" /> : null}
            </li>
          ))}
        </ol>

        <form onSubmit={submit} className="checkout-grid" noValidate>
          <div className="stack stack-sm">
            <div className="card card-plain card-pad-lg">
              <h2 className="card-title">১. আপনার তথ্য</h2>
              <div className={`field ${errors.name ? "field-error" : ""}`}>
                <label className="label" htmlFor="co-name">
                  নাম <span className="required-mark">*</span>
                </label>
                <input
                  id="co-name"
                  className="input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                  required
                />
                {errors.name ? <span className="error-text">{errors.name}</span> : null}
              </div>

              <div className={`field ${errors.phone ? "field-error" : ""}`}>
                <label className="label" htmlFor="co-phone">
                  মোবাইল নম্বর <span className="required-mark">*</span>
                </label>
                <input
                  id="co-phone"
                  className="input"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="01XXXXXXXXX"
                  inputMode="numeric"
                  autoComplete="tel"
                  required
                />
                {errors.phone ? <span className="error-text">{errors.phone}</span> : null}
              </div>

              <div className="field">
                <label className="label" htmlFor="co-email">
                  ইমেইল <span className="label-optional">(ঐচ্ছিক)</span>
                </label>
                <input
                  id="co-email"
                  className="input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>

              <div className={`field ${errors.address ? "field-error" : ""}`}>
                <label className="label" htmlFor="co-address">
                  সম্পূর্ণ ঠিকানা <span className="required-mark">*</span>
                </label>
                <textarea
                  id="co-address"
                  className="textarea"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="বাসা/হোল্ডিং, রোড, এলাকা, থানা, জেলা"
                  autoComplete="street-address"
                  required
                />
                {errors.address ? <span className="error-text">{errors.address}</span> : null}
              </div>

              <div className="field">
                <label className="label" htmlFor="co-note">
                  নোট <span className="label-optional">(ঐচ্ছিক)</span>
                </label>
                <input
                  id="co-note"
                  className="input"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="ডেলিভারি সংক্রান্ত বিশেষ নির্দেশনা"
                />
              </div>

              {/* হানি-পট — মানুষের চোখে অদৃশ্য */}
              <div className="hp-field" aria-hidden="true">
                <label htmlFor="co-website">ওয়েবসাইট</label>
                <input
                  id="co-website"
                  tabIndex={-1}
                  autoComplete="off"
                  value={honey}
                  onChange={(e) => setHoney(e.target.value)}
                />
              </div>
            </div>

            <div className="card card-plain card-pad-lg">
              <h2 className="card-title">২. ডেলিভারি এরিয়া</h2>
              <div className="stack stack-sm" role="radiogroup" aria-label="ডেলিভারি এরিয়া">
                <label className="radio-card" data-checked={area === "inside_dhaka"}>
                  <input
                    type="radio"
                    name="area"
                    value="inside_dhaka"
                    checked={area === "inside_dhaka"}
                    onChange={() => setArea("inside_dhaka")}
                  />
                  <span className="radio-card-content">
                    <span className="text-strong">ঢাকার ভিতরে</span>
                    <span className="text-small text-muted">সাধারণত ১-২ কার্যদিবস</span>
                  </span>
                  <span className="radio-card-price">{formatTaka(commerce.deliveryInsideDhaka)}</span>
                </label>
                <label className="radio-card" data-checked={area === "outside_dhaka"}>
                  <input
                    type="radio"
                    name="area"
                    value="outside_dhaka"
                    checked={area === "outside_dhaka"}
                    onChange={() => setArea("outside_dhaka")}
                  />
                  <span className="radio-card-content">
                    <span className="text-strong">ঢাকার বাইরে</span>
                    <span className="text-small text-muted">সাধারণত ২-৪ কার্যদিবস</span>
                  </span>
                  <span className="radio-card-price">{formatTaka(commerce.deliveryOutsideDhaka)}</span>
                </label>
              </div>
              {freeByThreshold ? (
                <p className="alert alert-success mt-3 mb-0">
                  <BadgePercent aria-hidden="true" />
                  <span>অভিনন্দন! আপনার অর্ডারে ডেলিভারি চার্জ প্রযোজ্য নয়।</span>
                </p>
              ) : null}
            </div>

            <div className="card card-plain card-pad-lg">
              <h2 className="card-title">
                <Tag aria-hidden="true" style={{ display: "inline", verticalAlign: "-3px" }} /> কুপন
              </h2>
              {coupon.status === "applied" ? (
                <div className="coupon-applied">
                  <span>
                    <strong className="mono">{coupon.code}</strong> — {coupon.summary}
                  </span>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => {
                      setCoupon({ status: "idle" });
                      setCouponInput("");
                    }}
                  >
                    <X aria-hidden="true" />
                    সরান
                  </button>
                </div>
              ) : (
                <>
                  <div className="coupon-row">
                    <input
                      className="input"
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value)}
                      placeholder="কুপন কোড"
                      aria-label="কুপন কোড"
                    />
                    <button
                      type="button"
                      className="btn btn-emerald"
                      disabled={coupon.status === "checking"}
                      onClick={() => applyCoupon(couponInput)}
                    >
                      {coupon.status === "checking" ? "যাচাই হচ্ছে…" : "প্রয়োগ করুন"}
                    </button>
                  </div>
                  {coupon.status === "error" ? (
                    <p className="error-text mt-2">{coupon.message}</p>
                  ) : null}
                </>
              )}
            </div>

            {offers.length > 0 ? (
              <div className="card card-plain card-pad-lg">
                <h2 className="card-title">চেকআউট-এক্সক্লুসিভ অফার</h2>
                <div className="stack stack-sm">
                  {offers.map((offer) => (
                    <div className="offer-card" key={offer.id}>
                      <div className="offer-card-media">
                        {offer.image ? (
                          <Image src={offer.image} alt={offer.name} width={74} height={74} />
                        ) : null}
                      </div>
                      <div>
                        <strong className="text-small">{offer.name}</strong>
                        <div className="price-row">
                          <span className="price">{formatTaka(offer.price)}</span>
                          {offer.compareAtPrice ? (
                            <span className="price-old">{formatTaka(offer.compareAtPrice)}</span>
                          ) : null}
                        </div>
                        <AddToCartButton productId={offer.id} label="কার্টে যোগ করুন" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <div className="stack stack-sm sticky-summary">
            <div className="summary" aria-live="polite">
              <h2 className="card-title">৩. অর্ডার সামারি</h2>
              <div className="summary-row">
                <span className="summary-label">সাবটোটাল</span>
                <span className="summary-value">{formatTaka(subtotal)}</span>
              </div>
              {discount > 0 ? (
                <div className="summary-row">
                  <span className="summary-label">কুপন ছাড়</span>
                  <span className="summary-value summary-discount">-{formatTaka(discount)}</span>
                </div>
              ) : null}
              <div className="summary-row">
                <span className="summary-label">ডেলিভারি চার্জ</span>
                <span className="summary-value">
                  {delivery === 0 ? "ফ্রি" : formatTaka(delivery)}
                </span>
              </div>
              <div className="summary-total">
                <span className="summary-total-label">সর্বমোট</span>
                <span className="summary-total-value">{formatTaka(total)}</span>
              </div>
              <p className="help-text mb-0">
                পণ্য হাতে পেয়ে টাকা পরিশোধ করবেন (ক্যাশ অন ডেলিভারি)।
              </p>
            </div>

            {commerce.codEnabled ? (
              <div className="card card-plain">
                <div className="row">
                  <Banknote aria-hidden="true" style={{ color: "var(--gold-hover)" }} />
                  <div>
                    <strong className="text-small">ক্যাশ অন ডেলিভারি</strong>
                    <p className="text-small text-muted mb-0">
                      ডেলিভারিম্যানের হাতে টাকা দিন — কোনো অগ্রিম লাগবে না।
                    </p>
                  </div>
                </div>
              </div>
            ) : null}

            {requiresPrescription ? (
              <div className="alert alert-warning">
                <Stethoscope aria-hidden="true" />
                <span>কার্টে প্রেসক্রিপশন-আবশ্যক পণ্য আছে — ডেলিভারির সময় ব্যবস্থাপত্র দেখাতে হবে।</span>
              </div>
            ) : null}

            <div className="disclaimer-box">
              <Stethoscope aria-hidden="true" />
              <span>{MEDICAL_DISCLAIMER}</span>
            </div>

            <button type="submit" className="btn btn-lg btn-block" disabled={submitting || loading}>
              {submitting ? "অর্ডার হচ্ছে…" : `অর্ডার কনফার্ম করুন — ${formatTaka(total)}`}
            </button>
            <p className="help-text text-center mb-0">
              <ShieldCheck aria-hidden="true" style={{ display: "inline", verticalAlign: "-3px" }} /> আপনার
              তথ্য শুধু ডেলিভারির জন্য ব্যবহৃত হবে।
            </p>
            <p className="help-text text-center mb-0">
              <MapPin aria-hidden="true" style={{ display: "inline", verticalAlign: "-3px" }} /> সার্ভিস
              এরিয়া: সারা বাংলাদেশ
            </p>
          </div>
        </form>
      </div>
    </section>
  );
}

/** free_delivery কুপনের সর্বোচ্চ ওয়েভার সামারি টেক্সট থেকে অনুমান (ডিসপ্লে-ওনলি) */
function couponDiscountWaiver(summary: string, baseDelivery: number): number {
  const match = summary.match(/সর্বোচ্চ\s*৳?([\d,]+)/);
  if (!match) return baseDelivery;
  const value = Number(match[1]?.replace(/,/g, ""));
  return Number.isFinite(value) ? Math.min(value, baseDelivery) : baseDelivery;
}
