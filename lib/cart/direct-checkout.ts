/**
 * ডাইরেক্ট চেকআউট লিংক — কাস্টম HTML ব্লক/ব্যানার থেকে সরাসরি
 * `/checkout?buy=<productId>&qty=1` লিংকে ক্লিক করলেই পণ্যটি কার্টে
 * যোগ হয়ে চেকআউট খোলে।
 *
 * নিরাপত্তা: লিংকে শুধু productId/variantId/quantity থাকে — দাম কখনো নয়।
 * চেকআউট যথারীতি সার্ভার থেকে দাম পুনরায় যাচাই করে (/api/cart/validate)।
 */

import type { CartItem } from "./types";

/** কার্টের সর্বোচ্চ পরিমাণ (CartProvider-এর সাথে মিল) */
const MAX_QUANTITY = 20;

function positiveInt(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const value = Number(raw);
  return Number.isInteger(value) && value > 0 ? value : null;
}

/** ডাইরেক্ট চেকআউট URL — ল্যান্ডিং HTML-এর {{checkout_url}} টোকেন এটি বানায় */
export function directCheckoutUrl(
  productId: number,
  quantity = 1,
  variantId?: number | null,
  couponCode?: string | null,
): string {
  const params = new URLSearchParams();
  params.set("buy", String(productId));
  const safeQuantity = Math.min(Math.max(Math.trunc(quantity) || 1, 1), MAX_QUANTITY);
  if (safeQuantity !== 1) params.set("qty", String(safeQuantity));
  if (variantId && Number.isInteger(variantId) && variantId > 0) {
    params.set("variant", String(variantId));
  }
  const coupon = couponCode?.trim();
  if (coupon) params.set("coupon", coupon);
  return `/checkout?${params.toString()}`;
}

/**
 * URL query থেকে ডাইরেক্ট-বাই আইটেম পড়ে; না থাকলে/ভুল হলে null।
 * `buy` বাধ্যতামূলক; `qty` ১–২০ এর মধ্যে ক্ল্যাম্প হয়; `variant` ঐচ্ছিক।
 */
export function parseDirectCheckoutParams(params: {
  get(name: string): string | null;
}): CartItem | null {
  const productId = positiveInt(params.get("buy"));
  if (!productId) return null;
  const qtyRaw = positiveInt(params.get("qty"));
  const quantity = Math.min(qtyRaw ?? 1, MAX_QUANTITY);
  const variantId = positiveInt(params.get("variant"));
  return { productId, variantId, quantity };
}
