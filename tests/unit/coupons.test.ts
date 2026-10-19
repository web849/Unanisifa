import test from "node:test";
import assert from "node:assert/strict";
import type { Coupon } from "../../lib/db/schema";
import {
  couponDiscountAmount,
  couponSummary,
  evaluateCoupon,
  normalizeCouponCode,
  type CouponContext,
} from "../../lib/coupons/rules";

function makeCoupon(partial: Partial<Coupon>): Coupon {
  return {
    id: 1,
    code: "TEST",
    title: "Test coupon",
    type: "percent",
    value: 10,
    minSubtotal: 0,
    maxDiscount: null,
    usageLimit: null,
    perPhoneLimit: null,
    usedCount: 0,
    startsAt: null,
    endsAt: null,
    landingScopeId: null,
    showOnCheckout: false,
    active: true,
    description: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...partial,
  } as Coupon;
}

const now = new Date("2026-10-18T10:00:00+06:00");

function context(partial: Partial<CouponContext> = {}): CouponContext {
  return { subtotal: 1200, now, phoneUsedCount: 0, landingPageId: null, ...partial };
}

test("normalizeCouponCode trims, strips spaces and uppercases", () => {
  assert.equal(normalizeCouponCode(" welcome10 "), "WELCOME10");
  assert.equal(normalizeCouponCode("we l c ome"), "WELCOME");
});

test("percent discount floors and applies maxDiscount cap", () => {
  const coupon = makeCoupon({ type: "percent", value: 10, maxDiscount: 100 });
  assert.equal(couponDiscountAmount(coupon, 1200), 100); // 120 → cap 100
  assert.equal(couponDiscountAmount(coupon, 850), 85); // floor(85)
  assert.equal(couponDiscountAmount(coupon, 859), 85); // floor(85.9)
});

test("fixed discount is capped at subtotal − 1 (never free)", () => {
  const coupon = makeCoupon({ type: "fixed", value: 500 });
  assert.equal(couponDiscountAmount(coupon, 1200), 500);
  assert.equal(couponDiscountAmount(coupon, 500), 499);
  assert.equal(couponDiscountAmount(coupon, 0), 0);
});

test("free_delivery gives no subtotal discount (waiver handled in pricing)", () => {
  const coupon = makeCoupon({ type: "free_delivery", value: 100 });
  assert.equal(couponDiscountAmount(coupon, 1200), 0);
});

test("evaluateCoupon rejects missing coupon with not_found", () => {
  const result = evaluateCoupon(null, context());
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.code, "not_found");
});

test("evaluateCoupon rejects inactive coupon", () => {
  const result = evaluateCoupon(makeCoupon({ active: false }), context());
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.code, "inactive");
});

test("evaluateCoupon rejects coupon before startsAt", () => {
  const coupon = makeCoupon({ startsAt: new Date(now.getTime() + 60_000) });
  const result = evaluateCoupon(coupon, context());
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.code, "not_started");
});

test("evaluateCoupon rejects expired coupon", () => {
  const coupon = makeCoupon({ endsAt: new Date(now.getTime() - 60_000) });
  const result = evaluateCoupon(coupon, context());
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.code, "expired");
});

test("evaluateCoupon enforces minSubtotal", () => {
  const coupon = makeCoupon({ minSubtotal: 699 });
  const result = evaluateCoupon(coupon, context({ subtotal: 698 }));
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.code, "min_subtotal");
});

test("evaluateCoupon enforces total usage limit", () => {
  const coupon = makeCoupon({ usageLimit: 100, usedCount: 100 });
  const result = evaluateCoupon(coupon, context());
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.code, "usage_limit");
});

test("evaluateCoupon enforces per-phone limit", () => {
  const coupon = makeCoupon({ perPhoneLimit: 1 });
  const result = evaluateCoupon(coupon, context({ phoneUsedCount: 1 }));
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.code, "per_phone_limit");
});

test("landing-scoped coupon rejected on other pages", () => {
  const coupon = makeCoupon({ landingScopeId: 7 });
  const wrong = evaluateCoupon(coupon, context({ landingPageId: null }));
  assert.equal(wrong.ok, false);
  if (!wrong.ok) assert.equal(wrong.code, "wrong_page");

  const right = evaluateCoupon(coupon, context({ landingPageId: 7 }));
  assert.equal(right.ok, true);
});

test("valid coupon returns Bangla-safe discount and summary", () => {
  const coupon = makeCoupon({ code: "WELCOME10", type: "percent", value: 10, maxDiscount: 100, minSubtotal: 699 });
  const result = evaluateCoupon(coupon, context({ subtotal: 1200 }));
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.discount, 100);
    assert.equal(result.waiver, 0);
  }
  assert.equal(couponSummary(coupon), "১০% ছাড় (সর্বোচ্চ ৳১০০)");
});
