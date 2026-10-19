/**
 * সার্ভার-অথরিটেটিভ প্রাইসিং — সব হিসাব এখানে, পূর্ণসংখ্যা টাকায়।
 * ব্রাউজার থেকে আসা কোনো দাম বিশ্বাস করা হয় না।
 *
 * নিয়ম (স্পেক ৭ঙ):
 * - subtotal = Σ (ডেটাবেজের বর্তমান unitPrice × quantity)
 * - discount = কুপন (০ … subtotal−১); কুপন কখনো পণ্য ফ্রি করে না (সর্বনিম্ন ৳১)
 * - ফ্রি-ডেলিভারি থ্রেশহোল্ড পূরণ হলে delivery = 0
 * - free_delivery কুপনে waiver = min(deliveryCharge, maxDiscount)
 * - total = subtotal − discount + delivery (সর্বনিম্ন ৳১)
 * - dueAmount = total − advance
 */

import type { Coupon } from "../db/schema";
import type { CommerceSettings } from "../config";

export type PricingLineInput = {
  unitPrice: number;
  quantity: number;
};

export type PricingInput = {
  lines: PricingLineInput[];
  coupon: Coupon | null;
  /** কুপন যাচাইয়ে হিসাব হওয়া ছাড় (lib/coupons/rules থেকে) */
  couponDiscount: number;
  area: "inside_dhaka" | "outside_dhaka";
  commerce: CommerceSettings;
  advance?: number;
};

export type PricingResult = {
  subtotal: number;
  discount: number;
  deliveryCharge: number;
  deliveryWaiver: number;
  total: number;
  advance: number;
  dueAmount: number;
  freeDeliveryByThreshold: boolean;
};

export function lineTotal(line: PricingLineInput): number {
  return Math.max(0, Math.round(line.unitPrice)) * Math.max(1, Math.round(line.quantity));
}

export function subtotalOf(lines: PricingLineInput[]): number {
  return lines.reduce((sum, line) => sum + lineTotal(line), 0);
}

export function baseDeliveryCharge(
  area: PricingInput["area"],
  commerce: CommerceSettings,
): number {
  return area === "inside_dhaka" ? commerce.deliveryInsideDhaka : commerce.deliveryOutsideDhaka;
}

export function computePricing(input: PricingInput): PricingResult {
  const subtotal = subtotalOf(input.lines);

  // কুপন কখনো পণ্যকে ফ্রি করবে না — সর্বনিম্ন ৳১ থাকবে
  const discount = Math.max(0, Math.min(input.couponDiscount, Math.max(0, subtotal - 1)));

  const threshold = input.commerce.freeDeliveryThreshold;
  const freeDeliveryByThreshold = threshold > 0 && subtotal >= threshold;

  let deliveryCharge = freeDeliveryByThreshold ? 0 : baseDeliveryCharge(input.area, input.commerce);
  let deliveryWaiver = 0;

  if (input.coupon?.type === "free_delivery" && !freeDeliveryByThreshold) {
    const charged = baseDeliveryCharge(input.area, input.commerce);
    deliveryWaiver = Math.min(charged, input.coupon.maxDiscount ?? charged);
    deliveryCharge = Math.max(0, charged - deliveryWaiver);
  }

  const rawTotal = subtotal - discount + deliveryCharge;
  const total = Math.max(1, rawTotal);

  const advance = Math.max(0, Math.min(input.advance ?? 0, total));
  const dueAmount = total - advance;

  return {
    subtotal,
    discount,
    deliveryCharge,
    deliveryWaiver,
    total,
    advance,
    dueAmount,
    freeDeliveryByThreshold,
  };
}
