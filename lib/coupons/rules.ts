/**
 * কুপন rules — pure ফাংশন (unit test আছে)।
 *
 * - কোড নরমালাইজেশন: trim + uppercase + স্পেস বাদ
 * - percent: floor(base × value ÷ 100), তারপর maxDiscount ক্যাপ
 * - fixed: value
 * - free_delivery: সাবটোটাল ছাড় দেয় না (ওয়েভার pricing-এ হিসাব হয়)
 * - কুপন কখনো পণ্যকে ফ্রি করে না (সর্বনিম্ন ৳১)
 * - সব এরর বাংলায় ও স্পষ্ট
 */

import type { Coupon } from "../db/schema";
import { formatTaka, toBanglaDigits } from "../utils";

export type CouponContext = {
  subtotal: number;
  now: Date;
  /** এই ফোন নম্বরে আগে কতবার রিডিম হয়েছে */
  phoneUsedCount: number;
  /** কুপনটি যে ল্যান্ডিং পেজে স্কোপড, সে পেজে আছি কি না (null = স্টোর চেকআউট) */
  landingPageId: number | null;
};

export type CouponEvaluation =
  | { ok: true; discount: number; waiver: number; coupon: Coupon }
  | { ok: false; error: string; code: CouponErrorCode };

export type CouponErrorCode =
  | "not_found"
  | "inactive"
  | "not_started"
  | "expired"
  | "min_subtotal"
  | "usage_limit"
  | "per_phone_limit"
  | "wrong_page";

/** কোড নরমালাইজেশন — trim + uppercase + সব স্পেস বাদ */
export function normalizeCouponCode(input: string): string {
  return input.trim().replace(/\s+/g, "").toUpperCase();
}

export function couponDiscountAmount(coupon: Coupon, subtotal: number): number {
  if (coupon.type === "percent") {
    const raw = Math.floor((subtotal * coupon.value) / 100);
    const capped = coupon.maxDiscount != null ? Math.min(raw, coupon.maxDiscount) : raw;
    // কুপন কখনো পণ্য ফ্রি করবে না
    return Math.max(0, Math.min(capped, Math.max(0, subtotal - 1)));
  }
  if (coupon.type === "fixed") {
    return Math.max(0, Math.min(coupon.value, Math.max(0, subtotal - 1)));
  }
  return 0;
}

export function evaluateCoupon(
  coupon: Coupon | null,
  context: CouponContext,
): CouponEvaluation {
  if (!coupon) {
    return { ok: false, error: "কুপন কোডটি খুঁজে পাওয়া যায়নি।", code: "not_found" };
  }
  if (!coupon.active) {
    return { ok: false, error: "কুপনটি এখন চালু নেই।", code: "inactive" };
  }
  if (coupon.startsAt && context.now < coupon.startsAt) {
    return { ok: false, error: "কুপনটি এখনো চালু হয়নি।", code: "not_started" };
  }
  if (coupon.endsAt && context.now > coupon.endsAt) {
    return { ok: false, error: "কুপনের মেয়াদ শেষ হয়ে গেছে।", code: "expired" };
  }
  if (coupon.landingScopeId != null && coupon.landingScopeId !== context.landingPageId) {
    return {
      ok: false,
      error: "এই কুপনটি শুধু নির্দিষ্ট অফার পেজে প্রযোজ্য।",
      code: "wrong_page",
    };
  }
  if (coupon.minSubtotal > 0 && context.subtotal < coupon.minSubtotal) {
    return {
      ok: false,
      error: `এই কুপনের জন্য ন্যূনতম অর্ডার মূল্য প্রযোজ্য — কার্টে আরও পণ্য যোগ করুন।`,
      code: "min_subtotal",
    };
  }
  if (coupon.usageLimit != null && coupon.usedCount >= coupon.usageLimit) {
    return { ok: false, error: "কুপনের ব্যবহার সীমা শেষ হয়ে গেছে।", code: "usage_limit" };
  }
  if (coupon.perPhoneLimit != null && context.phoneUsedCount >= coupon.perPhoneLimit) {
    return {
      ok: false,
      error: "এই নম্বরে কুপনটি ইতিমধ্যে ব্যবহার করা হয়েছে।",
      code: "per_phone_limit",
    };
  }

  const discount = couponDiscountAmount(coupon, context.subtotal);
  const waiver = coupon.type === "free_delivery" ? coupon.value : 0;

  return { ok: true, discount, waiver, coupon };
}

/** চেকআউটে দেখানোর জন্য সংক্ষিপ্ত বর্ণনা (বাংলা সংখ্যায় — কাস্টমার-কপি) */
export function couponSummary(coupon: Coupon): string {
  if (coupon.type === "percent") {
    const cap = coupon.maxDiscount != null ? ` (সর্বোচ্চ ${formatTaka(coupon.maxDiscount)})` : "";
    return `${toBanglaDigits(coupon.value)}% ছাড়${cap}`;
  }
  if (coupon.type === "fixed") return `${formatTaka(coupon.value)} ছাড়`;
  const cap = coupon.maxDiscount != null ? `সর্বোচ্চ ${formatTaka(coupon.maxDiscount)}` : "সম্পূর্ণ";
  return `ডেলিভারি চার্জে ছাড় (${cap})`;
}
