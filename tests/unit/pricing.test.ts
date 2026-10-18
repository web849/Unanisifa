import test from "node:test";
import assert from "node:assert/strict";
import type { Coupon } from "../../lib/db/schema";
import { DEFAULT_COMMERCE, type CommerceSettings } from "../../lib/config";
import { computePricing } from "../../lib/orders/pricing";

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

const commerce: CommerceSettings = { ...DEFAULT_COMMERCE };

test("QA case: ৳1200 + 10% (cap ৳100) + outside Dhaka ৳130 = ৳1230", () => {
  const coupon = makeCoupon({ code: "WELCOME10", type: "percent", value: 10, maxDiscount: 100, minSubtotal: 699 });
  const result = computePricing({
    lines: [{ unitPrice: 1200, quantity: 1 }],
    coupon,
    couponDiscount: 100, // floor(1200×10%)=120 → cap 100 (lib/coupons/rules)
    area: "outside_dhaka",
    commerce,
  });
  assert.equal(result.subtotal, 1200);
  assert.equal(result.discount, 100);
  assert.equal(result.deliveryCharge, 130);
  assert.equal(result.total, 1230);
  assert.equal(result.dueAmount, 1230);
});

test("delivery inside Dhaka uses commerce.deliveryInsideDhaka (৳70)", () => {
  const result = computePricing({
    lines: [{ unitPrice: 300, quantity: 2 }],
    coupon: null,
    couponDiscount: 0,
    area: "inside_dhaka",
    commerce,
  });
  assert.equal(result.subtotal, 600);
  assert.equal(result.deliveryCharge, 70);
  assert.equal(result.total, 670);
});

test("discount never makes the product free — capped at subtotal − 1", () => {
  const result = computePricing({
    lines: [{ unitPrice: 50, quantity: 1 }],
    coupon: makeCoupon({ type: "fixed", value: 500 }),
    couponDiscount: 500,
    area: "inside_dhaka",
    commerce,
  });
  assert.equal(result.discount, 49);
  assert.ok(result.total >= 1 + 70); // subtotal floor ৳1 + delivery
});

test("total floor is ৳1 even with zero delivery and full discount", () => {
  const freeCommerce = { ...commerce, deliveryInsideDhaka: 0 };
  const result = computePricing({
    lines: [{ unitPrice: 1, quantity: 1 }],
    coupon: makeCoupon({ type: "fixed", value: 10 }),
    couponDiscount: 10,
    area: "inside_dhaka",
    commerce: freeCommerce,
  });
  assert.equal(result.total, 1);
});

test("free delivery threshold zeroes the delivery charge", () => {
  const thresholdCommerce = { ...commerce, freeDeliveryThreshold: 1000 };
  const result = computePricing({
    lines: [{ unitPrice: 1000, quantity: 1 }],
    coupon: null,
    couponDiscount: 0,
    area: "outside_dhaka",
    commerce: thresholdCommerce,
  });
  assert.equal(result.freeDeliveryByThreshold, true);
  assert.equal(result.deliveryCharge, 0);
  assert.equal(result.total, 1000);
});

test("free_delivery coupon waives min(charge, maxDiscount)", () => {
  const coupon = makeCoupon({ code: "FREEDC", type: "free_delivery", value: 100, maxDiscount: 100 });
  const result = computePricing({
    lines: [{ unitPrice: 700, quantity: 1 }],
    coupon,
    couponDiscount: 0,
    area: "outside_dhaka", // charge ৳130, waiver capped at ৳100
    commerce,
  });
  assert.equal(result.deliveryWaiver, 100);
  assert.equal(result.deliveryCharge, 30);
  assert.equal(result.total, 730);
});

test("advance reduces dueAmount and never exceeds total", () => {
  const result = computePricing({
    lines: [{ unitPrice: 500, quantity: 1 }],
    coupon: null,
    couponDiscount: 0,
    area: "inside_dhaka",
    commerce,
    advance: 100,
  });
  assert.equal(result.total, 570);
  assert.equal(result.advance, 100);
  assert.equal(result.dueAmount, 470);

  const over = computePricing({
    lines: [{ unitPrice: 500, quantity: 1 }],
    coupon: null,
    couponDiscount: 0,
    area: "inside_dhaka",
    commerce,
    advance: 999999,
  });
  assert.equal(over.advance, over.total);
  assert.equal(over.dueAmount, 0);
});

test("quantity and unit price are integer-safe", () => {
  const result = computePricing({
    lines: [
      { unitPrice: 185.4, quantity: 3 },
      { unitPrice: 420, quantity: 1 },
    ],
    coupon: null,
    couponDiscount: 0,
    area: "inside_dhaka",
    commerce,
  });
  assert.equal(result.subtotal, 185 * 3 + 420);
});
