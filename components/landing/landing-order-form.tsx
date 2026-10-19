"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Minus, Plus, ShoppingCart } from "lucide-react";
import { isValidAddress, isValidBdPhone } from "@/lib/orders/validation-client";
import { formatTaka, toBanglaDigits } from "@/lib/utils";
import { whatsappLink, phoneDisplay } from "@/lib/contact-links";
import type { BrandSettings } from "@/lib/config";
import type { LandingOrderProduct } from "@/lib/landing/product-types";

export type { LandingOrderProduct } from "@/lib/landing/product-types";

/**
 * ল্যান্ডিং পেজের ইনলাইন অর্ডার ফর্ম — শুধু productId + quantity পাঠায়;
 * দাম/ছাড়/ডেলিভারি/মোট সার্ভারে হিসাব হয় (/api/orders)।
 */
export function LandingOrderForm({
  product,
  landingSlug,
  couponCode,
  deliveryInside,
  deliveryOutside,
  brand,
  maxQuantity,
  title,
  subtitle,
  preview = false,
}: {
  product: LandingOrderProduct;
  landingSlug: string;
  couponCode: string | null;
  deliveryInside: number;
  deliveryOutside: number;
  brand: BrandSettings;
  maxQuantity: number;
  title?: string;
  subtitle?: string;
  /** বিল্ডার/ড্রাফট প্রিভিউ — অর্ডার কখনো সাবমিট হবে না */
  preview?: boolean;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const openedAt = useRef<number>(Date.now());
  const idempotencyKey = useRef<string>(
    typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `lp-${Date.now()}-${Math.random()}`,
  );

  const [quantity, setQuantity] = useState(1);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [area, setArea] = useState<"inside_dhaka" | "outside_dhaka">("inside_dhaka");
  const [note, setNote] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ orderNumber: string; token: string } | null>(null);

  useEffect(() => {
    openedAt.current = Date.now();
  }, []);

  const delivery = area === "inside_dhaka" ? deliveryInside : deliveryOutside;
  const lineTotal = product.price * quantity;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (preview) {
      setServerError("প্রিভিউ মোড — অর্ডার পাঠানো হবে না।");
      return;
    }
    const next: Record<string, string> = {};
    if (name.trim().length < 3) next.name = "পূর্ণ নাম লিখুন";
    if (!isValidBdPhone(phone)) next.phone = "সঠিক মোবাইল নম্বর দিন (যেমন 01712345678)";
    if (!isValidAddress(address)) next.address = "বিস্তারিত ঠিকানা দিন";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setBusy(true);
    setServerError(null);
    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: [{ productId: product.id, quantity }],
          name: name.trim(),
          phone: phone.trim(),
          address: address.trim(),
          area,
          note: note.trim() || undefined,
          couponCode: couponCode ?? undefined,
          website,
          idempotencyKey: idempotencyKey.current,
          formOpenedAt: openedAt.current,
          landingSlug,
        }),
      });
      const json = (await response.json()) as {
        ok?: boolean;
        error?: string;
        data?: { orderNumber?: string; publicToken?: string };
      };
      if (response.ok && json.ok && json.data?.publicToken) {
        setDone({ orderNumber: json.data.orderNumber ?? "", token: json.data.publicToken });
        router.push(`/thank-you?token=${json.data.publicToken}`);
        return;
      }
      setServerError(json.error ?? "অর্ডার করা যায়নি। আবার চেষ্টা করুন।");
    } catch {
      setServerError("নেটওয়ার্ক সমস্যা। আবার চেষ্টা করুন।");
    } finally {
      setBusy(false);
    }
  };

  if (!product.inStock) {
    return (
      <div className="lp-section" id="order_form">
        <div className="lp-inner">
          <div className="card" style={{ textAlign: "center", padding: "2rem" }}>
            <h3 className="lp-heading">আপাতত অর্ডার বন্ধ</h3>
            <p className="lp-text">এই পণ্যটির স্টক শেষ। জানতে কল করুন — {phoneDisplay(brand)}</p>
            <a className="btn btn-whatsapp" href={whatsappLink(brand, `আমি ${product.name} সম্পর্কে জানতে চাই`)}>
              WhatsApp-এ যোগাযোগ
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="lp-section" id="order_form">
        <div className="lp-inner">
          <div className="card" style={{ textAlign: "center", padding: "2rem" }}>
            <CheckCircle2 aria-hidden="true" style={{ color: "var(--color-success)", width: 40, height: 40 }} />
            <h3 className="lp-heading">অর্ডার গৃহীত হয়েছে</h3>
            <p className="lp-text">অভিনন্দন! আপনার অর্ডার নম্বর {done.orderNumber}। ধীরে ধীরে পেজটি খুলছে…</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <section className="lp-section lp-section-alt" id="order_form" aria-labelledby="lp-order-title">
      <div className="lp-inner">
        <h2 className="lp-heading" id="lp-order-title">
          {title?.trim() || "অর্ডার করুন"}
        </h2>
        <p className="lp-text">
          {subtitle?.trim() || "পণ্য হাতে পেয়ে টাকা পরিশোধ করুন (ক্যাশ অন ডেলিভারি)।"}
        </p>

        <form ref={formRef} className="card order-form-card" onSubmit={submit} noValidate>
          <div className="order-form-product">
            {product.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={product.image} alt={product.name} width={72} height={72} />
            ) : null}
            <div>
              <p className="mb-0">
                <strong>{product.name}</strong>
                {product.unitSize ? <span className="text-muted"> · {product.unitSize}</span> : null}
              </p>
              <p className="mb-0">
                {formatTaka(product.price)}
                {product.compareAtPrice && product.compareAtPrice > product.price ? (
                  <s className="text-muted"> {formatTaka(product.compareAtPrice)}</s>
                ) : null}
              </p>
              {product.requiresPrescription ? (
                <p className="text-small mb-0">ডাক্তারের পরামর্শ অনুযায়ী সেবন করুন।</p>
              ) : null}
            </div>
          </div>

          <div className="qty-row">
            <span className="label">পরিমাণ</span>
            <div className="qty-control">
              <button
                type="button"
                className="icon-btn"
                aria-label="কমান"
                onClick={() => setQuantity((value) => Math.max(1, value - 1))}
                disabled={quantity <= 1}
              >
                <Minus aria-hidden="true" />
              </button>
              <span aria-live="polite">{toBanglaDigits(quantity)}</span>
              <button
                type="button"
                className="icon-btn"
                aria-label="বাড়ান"
                onClick={() => setQuantity((value) => Math.min(maxQuantity, value + 1))}
                disabled={quantity >= maxQuantity}
              >
                <Plus aria-hidden="true" />
              </button>
            </div>
          </div>

          <label className="field">
            <span className="label">আপনার নাম *</span>
            <input
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              aria-invalid={Boolean(errors.name)}
            />
            {errors.name ? <span className="error-text">{errors.name}</span> : null}
          </label>

          <label className="field">
            <span className="label">মোবাইল নম্বর *</span>
            <input
              className="input"
              type="tel"
              inputMode="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="01XXXXXXXXX"
              autoComplete="tel"
              aria-invalid={Boolean(errors.phone)}
            />
            {errors.phone ? <span className="error-text">{errors.phone}</span> : null}
          </label>

          <label className="field">
            <span className="label">সম্পূর্ণ ঠিকানা *</span>
            <textarea
              className="input"
              rows={3}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="বাসা/হোল্ডিং, রোড, থানা, জেলা"
              autoComplete="street-address"
              aria-invalid={Boolean(errors.address)}
            />
            {errors.address ? <span className="error-text">{errors.address}</span> : null}
          </label>

          <fieldset className="field">
            <legend className="label">ডেলিভারি এলাকা</legend>
            <div className="radio-row">
              <label className="radio-card">
                <input
                  type="radio"
                  name="lp-area"
                  checked={area === "inside_dhaka"}
                  onChange={() => setArea("inside_dhaka")}
                />
                <span>
                  ঢাকার ভিতরে — {formatTaka(deliveryInside)}
                </span>
              </label>
              <label className="radio-card">
                <input
                  type="radio"
                  name="lp-area"
                  checked={area === "outside_dhaka"}
                  onChange={() => setArea("outside_dhaka")}
                />
                <span>
                  ঢাকার বাইরে — {formatTaka(deliveryOutside)}
                </span>
              </label>
            </div>
          </fieldset>

          <label className="field">
            <span className="label">নোট (ঐচ্ছিক)</span>
            <input className="input" value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} />
          </label>

          {/* honeypot — বট স্প্যাম আটকাতে; মানুষ দেখে না */}
          <div aria-hidden="true" style={{ position: "absolute", left: "-9999px", top: "-9999px" }}>
            <label>
              Website
              <input value={website} onChange={(e) => setWebsite(e.target.value)} tabIndex={-1} autoComplete="off" />
            </label>
          </div>

          <div className="order-form-summary">
            <p className="mb-0">
              পণ্যের মূল্য: <strong>{formatTaka(lineTotal)}</strong>
            </p>
            <p className="mb-0">
              ডেলিভারি: <strong>{formatTaka(delivery)}</strong>
            </p>
            {couponCode ? (
              <p className="mb-0 text-small">কুপন {couponCode} প্রযোজ্য হলে ছাড় চূড়ান্ত হিসাবে দেখানো হবে।</p>
            ) : null}
          </div>

          {serverError ? <p className="error-text" role="alert">{serverError}</p> : null}

          <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={busy || preview}>
            <ShoppingCart aria-hidden="true" />
            {preview ? "প্রিভিউ মোড" : busy ? "পাঠানো হচ্ছে…" : "অর্ডার নিশ্চিত করুন"}
          </button>
          <p className="text-small text-muted" style={{ textAlign: "center" }}>
            অর্ডারের পর আমরা কল করে নিশ্চিত করব। ডেলিভারি ম্যানের সামনে পণ্য দেখে টাকা পরিশোধ করুন।
          </p>
        </form>
      </div>
    </section>
  );
}
