"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Minus, Plus, ShoppingCart, Trash2 } from "lucide-react";
import { useCart } from "./cart-provider";
import type { PricedCart } from "@/lib/cart/types";
import { formatTaka, toBanglaDigits } from "@/lib/utils";
import { MEDICAL_DISCLAIMER } from "@/lib/config";

/**
 * কার্ট পেজ — localStorage কার্ট, কিন্তু দাম সার্ভারে রি-ভ্যালিডেট
 * (/api/cart/validate)। স্টক শেষ হওয়া লাইন স্পষ্টভাবে দেখায়।
 */
export function CartView() {
  const { items, setQuantity, remove, ready } = useCart();
  const [priced, setPriced] = useState<PricedCart | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!ready) return;
      setLoading(true);
      try {
        const response = await fetch("/api/cart/validate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items }),
        });
        const payload = (await response.json()) as PricedCart;
        if (!cancelled) setPriced(payload);
      } catch {
        if (!cancelled) setPriced({ lines: [], subtotal: 0, unavailableCount: 0 });
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [items, ready]);

  if (!ready || loading) {
    return (
      <section className="section">
        <div className="container container-narrow stack stack-sm">
          <div className="skeleton card" style={{ height: 96 }} />
          <div className="skeleton card" style={{ height: 96 }} />
          <div className="skeleton card" style={{ height: 140 }} />
        </div>
      </section>
    );
  }

  const lines = priced?.lines ?? [];

  return (
    <section className="section">
      <div className="container container-narrow">
        <p className="eyebrow">কার্ট</p>
        <h1 className="section-title">আপনার কার্ট</h1>

        {lines.length === 0 ? (
          <div className="empty-state">
            <ShoppingCart aria-hidden="true" />
            <p className="empty-state-title">কার্ট খালি</p>
            <p>পছন্দের পণ্য যোগ করুন — ডেলিভারি সারা বাংলাদেশে।</p>
            <Link className="btn" href="/products">
              পণ্য দেখুন
            </Link>
          </div>
        ) : (
          <div className="checkout-grid">
            <div className="card card-plain">
              {lines.map((line) => (
                <div className="cart-line" key={`${line.productId}-${line.variantId ?? 0}`}>
                  <div className="cart-line-media">
                    {line.image ? (
                      <Image src={line.image} alt={line.name} width={76} height={76} />
                    ) : null}
                  </div>
                  <div>
                    <Link className="cart-line-name" href={`/products/${line.slug}`}>
                      {line.name}
                    </Link>
                    {line.variantName ? (
                      <span className="text-small text-muted"> · {line.variantName}</span>
                    ) : null}
                    <div className="price-row mt-1">
                      <span className="price">{formatTaka(line.unitPrice)}</span>
                      {line.compareAtPrice ? (
                        <span className="price-old">{formatTaka(line.compareAtPrice)}</span>
                      ) : null}
                    </div>
                    {!line.available ? (
                      <p className="error-text mt-1">এই পণ্যটির স্টক শেষ — কার্ট থেকে সরান।</p>
                    ) : null}
                    <div className="cart-line-actions">
                      <div className="qty">
                        <button
                          type="button"
                          className="qty-btn"
                          aria-label="কমান"
                          disabled={line.quantity <= 1}
                          onClick={() => setQuantity(line.productId, line.variantId, line.quantity - 1)}
                        >
                          <Minus aria-hidden="true" />
                        </button>
                        <span className="qty-value">{toBanglaDigits(line.quantity)}</span>
                        <button
                          type="button"
                          className="qty-btn"
                          aria-label="বাড়ান"
                          disabled={line.quantity >= line.maxQuantity}
                          onClick={() => setQuantity(line.productId, line.variantId, line.quantity + 1)}
                        >
                          <Plus aria-hidden="true" />
                        </button>
                      </div>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => remove(line.productId, line.variantId)}
                      >
                        <Trash2 aria-hidden="true" />
                        সরান
                      </button>
                      <span className="spacer" />
                      <span className="price">{formatTaka(line.lineTotal)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="stack stack-sm sticky-summary">
              <div className="summary" aria-live="polite">
                <div className="summary-row">
                  <span className="summary-label">সাবটোটাল</span>
                  <span className="summary-value">{formatTaka(priced?.subtotal ?? 0)}</span>
                </div>
                <div className="summary-row">
                  <span className="summary-label">ডেলিভারি</span>
                  <span className="summary-value">চেকআউটে হিসাব হবে</span>
                </div>
                <div className="summary-total">
                  <span className="summary-total-label">সর্বমোট (আনুমানিক)</span>
                  <span className="summary-total-value">{formatTaka(priced?.subtotal ?? 0)}</span>
                </div>
              </div>
              <Link
                className="btn btn-lg btn-block"
                href="/checkout"
                aria-disabled={lines.some((l) => !l.available)}
              >
                চেকআউটে যান
              </Link>
              <Link className="btn btn-outline btn-block" href="/products">
                আরও পণ্য যোগ করুন
              </Link>
              <p className="help-text text-center mb-0">{MEDICAL_DISCLAIMER}</p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
