/**
 * মিস্ট্রি অফার rules (pure) — এক নম্বরে একবার, মেয়াদ ৭ দিন, মিনিমাম অর্ডার ৳৬৯৯।
 * কুপন: WELCOME10 (১০%, সর্বোচ্চ ৳১০০) ও FREEDC (ডেলিভারি ছাড়, সর্বোচ্চ ৳১০০)।
 * কোন নম্বরে কোন কুপন — ডিটারমিনিস্টিক (ফোন হ্যাশ), যাতে রিলোডে একই কোড থাকে।
 */

export const MYSTERY_COUPONS = [
  { code: "WELCOME10", type: "percent", value: 10, maxDiscount: 100 },
  { code: "FREEDC", type: "free_delivery", value: 100, maxDiscount: 100 },
] as const;

export const MYSTERY_MIN_SUBTOTAL = 699;
export const MYSTERY_VALIDITY_DAYS = 7;

export function pickMysteryCouponCode(phoneHash: string): string {
  const bucket = parseInt(phoneHash.slice(0, 8), 16) % MYSTERY_COUPONS.length;
  return MYSTERY_COUPONS[bucket]?.code ?? "WELCOME10";
}

export function mysteryExpiry(from: Date = new Date()): Date {
  return new Date(from.getTime() + MYSTERY_VALIDITY_DAYS * 24 * 60 * 60 * 1000);
}

export function isClaimValid(expiresAt: Date | string, now: Date = new Date()): boolean {
  const date = typeof expiresAt === "string" ? new Date(expiresAt) : expiresAt;
  return !Number.isNaN(date.getTime()) && date > now;
}
