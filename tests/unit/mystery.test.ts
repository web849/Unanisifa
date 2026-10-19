import test from "node:test";
import assert from "node:assert/strict";
import {
  isClaimValid,
  mysteryExpiry,
  MYSTERY_COUPONS,
  MYSTERY_MIN_SUBTOTAL,
  MYSTERY_VALIDITY_DAYS,
  pickMysteryCouponCode,
} from "../../lib/offers/mystery-rules";

const CODES = MYSTERY_COUPONS.map((coupon) => coupon.code);

test("pickMysteryCouponCode is deterministic per phone hash", () => {
  const hash = "abc123def456";
  const first = pickMysteryCouponCode(hash);
  const second = pickMysteryCouponCode(hash);
  assert.equal(first, second);
  assert.ok(CODES.includes(first as (typeof CODES)[number]));
});

test("pickMysteryCouponCode always returns a known code", () => {
  for (let i = 0; i < 50; i += 1) {
    const hash = i.toString(16).padStart(8, "0") + "ffffff";
    assert.ok(CODES.includes(pickMysteryCouponCode(hash) as (typeof CODES)[number]));
  }
});

test("mystery constants match the spec", () => {
  assert.equal(MYSTERY_MIN_SUBTOTAL, 699);
  assert.equal(MYSTERY_VALIDITY_DAYS, 7);
  assert.ok(CODES.includes("WELCOME10"));
  assert.ok(CODES.includes("FREEDC"));
});

test("mysteryExpiry is 7 days ahead and isClaimValid honours it", () => {
  const now = new Date("2026-10-18T00:00:00Z");
  const expiry = mysteryExpiry(now);
  assert.equal(expiry.getTime() - now.getTime(), 7 * 24 * 60 * 60 * 1000);
  assert.equal(isClaimValid(expiry, new Date(now.getTime() + 1000)), true);
  assert.equal(isClaimValid(expiry, new Date(expiry.getTime() + 1000)), false);
  assert.equal(isClaimValid("not-a-date"), false);
});
