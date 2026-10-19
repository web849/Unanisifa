import test from "node:test";
import assert from "node:assert/strict";
import { bdPhoneSchema, checkoutSchema } from "../../lib/orders/validation";

test("bdPhoneSchema accepts local, +880 and Bangla-digit numbers", () => {
  assert.equal(bdPhoneSchema.parse("01712345678"), "01712345678");
  assert.equal(bdPhoneSchema.parse("+8801712345678"), "01712345678");
  assert.equal(bdPhoneSchema.parse("০১৭১২৩৪৫৬৭৮"), "01712345678");
  assert.equal(bdPhoneSchema.parse("01312345678"), "01312345678");
});

test("bdPhoneSchema rejects invalid prefixes and lengths", () => {
  assert.throws(() => bdPhoneSchema.parse("01212345678")); // 012 not valid mobile
  assert.throws(() => bdPhoneSchema.parse("0171234567")); // too short
  assert.throws(() => bdPhoneSchema.parse("123456789012345678"));
  assert.throws(() => bdPhoneSchema.parse("hello world"));
});

const baseCheckout = {
  items: [{ productId: 1, quantity: 2, variantId: null }],
  name: "রহিম উদ্দিন",
  phone: "01712345678",
  address: "বাসা ১২, রোড ৫, ধানমন্ডি, ঢাকা",
  area: "inside_dhaka",
  idempotencyKey: "key-12345678",
};

test("checkoutSchema accepts a valid payload and normalizes phone", () => {
  const result = checkoutSchema.parse(baseCheckout);
  assert.equal(result.phone, "01712345678");
  assert.equal(result.items[0].quantity, 2);
});

test("checkoutSchema rejects a filled honeypot field", () => {
  assert.throws(() => checkoutSchema.parse({ ...baseCheckout, website: "spam" }));
});

test("checkoutSchema enforces quantity bounds", () => {
  assert.throws(() => checkoutSchema.parse({ ...baseCheckout, items: [{ productId: 1, quantity: 0, variantId: null }] }));
  assert.throws(() => checkoutSchema.parse({ ...baseCheckout, items: [{ productId: 1, quantity: 21, variantId: null }] }));
});

test("checkoutSchema requires items and a strong idempotency key", () => {
  assert.throws(() => checkoutSchema.parse({ ...baseCheckout, items: [] }));
  assert.throws(() => checkoutSchema.parse({ ...baseCheckout, idempotencyKey: "short" }));
});

test("checkoutSchema rejects unknown area values", () => {
  assert.throws(() => checkoutSchema.parse({ ...baseCheckout, area: "chittagong" }));
});
