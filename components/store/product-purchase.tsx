"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { MessageCircle, Minus, Plus, ShoppingCart } from "lucide-react";
import { useCart } from "@/components/cart/cart-provider";
import { useToast } from "./toast";
import { formatTaka, toBanglaDigits } from "@/lib/utils";
import { whatsappLink, whatsappProductMessage } from "@/lib/contact-links";
import type { BrandSettings } from "@/lib/config";

type Variant = { id: number; name: string; priceDelta: number; stock: number; active: boolean };

/**
 * PDP পারচেজ বক্স — ভ্যারিয়েন্ট, কোয়ান্টিটি, "অর্ডার করুন" (ডাইরেক্ট চেকআউট)
 * ও "কার্টে যোগ"। দাম সবসময় সার্ভার থেকে আসা unitPrice + variantDelta;
 * ব্রাউজার থেকে দাম পাঠানো হয় না।
 */
export function ProductPurchaseBox({
  productId,
  productName,
  slug,
  unitPrice,
  variants,
  stock,
  trackStock,
  maxQuantity,
  brand,
}: {
  productId: number;
  productName: string;
  slug: string;
  unitPrice: number;
  variants: Variant[];
  stock: number;
  trackStock: boolean;
  maxQuantity: number;
  brand: BrandSettings;
}) {
  const router = useRouter();
  const { add, items } = useCart();
  const toast = useToast();
  const activeVariants = variants.filter((v) => v.active);
  const [variantId, setVariantId] = useState<number | null>(
    activeVariants[0]?.id ?? null,
  );
  const [quantity, setQuantity] = useState(1);

  const selectedVariant = activeVariants.find((v) => v.id === variantId) ?? null;
  const effectivePrice = unitPrice + (selectedVariant?.priceDelta ?? 0);
  const availableStock = selectedVariant ? selectedVariant.stock : stock;
  const inCart = items
    .filter((i) => i.productId === productId && (i.variantId ?? null) === variantId)
    .reduce((sum, i) => sum + i.quantity, 0);
  const upper = useMemo(
    () => Math.max(1, Math.min(trackStock ? availableStock : maxQuantity, maxQuantity)),
    [availableStock, trackStock, maxQuantity],
  );
  const outOfStock = trackStock && availableStock <= 0;
  const canAddMore = inCart + quantity <= upper;

  const addToCart = () => {
    add(productId, quantity, variantId);
    toast("কার্টে যোগ হয়েছে", "success");
  };

  const buyNow = () => {
    add(productId, quantity, variantId);
    router.push("/checkout");
  };

  return (
    <div className="stack stack-sm">
      {activeVariants.length > 0 ? (
        <div className="field mb-0">
          <span className="label">ভ্যারিয়েন্ট</span>
          <div className="variant-list" role="group" aria-label="ভ্যারিয়েন্ট বেছে নিন">
            {activeVariants.map((variant) => (
              <button
                key={variant.id}
                type="button"
                className="variant-option"
                aria-pressed={variantId === variant.id}
                disabled={trackStock && variant.stock <= 0}
                onClick={() => setVariantId(variant.id)}
              >
                {variant.name}
                {variant.priceDelta !== 0 ? (
                  <span className="text-small text-muted">
                    {" "}
                    ({variant.priceDelta > 0 ? "+" : "−"}
                    {formatTaka(Math.abs(variant.priceDelta))})
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="row row-wrap">
        <div className="field mb-0">
          <span className="label">পরিমাণ</span>
          <div className="qty">
            <button
              type="button"
              className="qty-btn"
              aria-label="কমান"
              disabled={quantity <= 1}
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            >
              <Minus aria-hidden="true" />
            </button>
            <span className="qty-value" aria-live="polite">
              {toBanglaDigits(quantity)}
            </span>
            <button
              type="button"
              className="qty-btn"
              aria-label="বাড়ান"
              disabled={quantity >= upper || outOfStock}
              onClick={() => setQuantity((q) => Math.min(upper, q + 1))}
            >
              <Plus aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="field mb-0">
          <span className="label">স্টক</span>
          {trackStock ? (
            availableStock <= 0 ? (
              <span className="stock-note stock-out">স্টক শেষ</span>
            ) : availableStock <= 5 ? (
              <span className="stock-note stock-low">
                মাত্র {toBanglaDigits(availableStock)}টি বাকি
              </span>
            ) : (
              <span className="stock-note stock-in">স্টকে আছে</span>
            )
          ) : (
            <span className="stock-note stock-in">অর্ডার করা যাবে</span>
          )}
        </div>
      </div>

      <div className="row-between" aria-live="polite">
        <span className="text-muted">সর্বমোট</span>
        <span className="price price-lg">{formatTaka(effectivePrice * quantity)}</span>
      </div>

      <div className="btn-group">
        <button
          type="button"
          className="btn btn-lg"
          disabled={outOfStock || !canAddMore}
          onClick={buyNow}
        >
          অর্ডার করুন
        </button>
        <button
          type="button"
          className="btn btn-emerald btn-lg"
          disabled={outOfStock || !canAddMore}
          onClick={addToCart}
        >
          <ShoppingCart aria-hidden="true" />
          কার্টে যোগ
        </button>
      </div>

      {!canAddMore && !outOfStock ? (
        <p className="help-text">
          কার্টে ইতিমধ্যে {toBanglaDigits(inCart)}টি আছে — সর্বোচ্চ {toBanglaDigits(upper)}টি নেওয়া যাবে।
        </p>
      ) : null}

      <a
        className="btn btn-whatsapp btn-block"
        href={whatsappLink(brand, whatsappProductMessage(productName, formatTaka(effectivePrice)))}
        target="_blank"
        rel="noopener noreferrer"
      >
        <MessageCircle aria-hidden="true" />
        WhatsApp-এ অর্ডার করুন
      </a>

      <p className="help-text mb-0">
        পণ্যের বিস্তারিত: <span className="mono">/products/{slug}</span>
      </p>
    </div>
  );
}
