import test from "node:test";
import assert from "node:assert/strict";
import {
  canTransition,
  fingerprintParts,
  generateOrderNumber,
  isValidOrderNumber,
  nextStatuses,
  randomOrderSuffix,
} from "../../lib/orders/status";

test("order number format is US + YYMMDD + '-' + 7 chars", () => {
  const orderNumber = generateOrderNumber("261018", "A1B2C3D");
  assert.equal(orderNumber, "US261018-A1B2C3D");
  assert.equal(isValidOrderNumber(orderNumber), true);
  assert.equal(isValidOrderNumber("US26101-A1B2C3D"), false);
  assert.equal(isValidOrderNumber("XX261018-A1B2C3D"), false);
  assert.equal(isValidOrderNumber("us261018-a1b2c3d"), true); // case-insensitive
});

test("randomOrderSuffix produces 7 unambiguous characters", () => {
  const bytes = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
  const suffix = randomOrderSuffix(bytes);
  assert.equal(suffix.length, 7);
  assert.match(suffix, /^[A-Z0-9]+$/);
  // দ্ব্যর্থতাপূর্ণ অক্ষর বাদ: I, O, 0
  assert.ok(!suffix.includes("I") && !suffix.includes("O") && !suffix.includes("0"));
});

test("forward transitions follow the status machine", () => {
  assert.equal(canTransition("pending", "confirmed"), true);
  assert.equal(canTransition("confirmed", "processing"), true);
  assert.equal(canTransition("processing", "shipped"), true);
  assert.equal(canTransition("shipped", "delivered"), true);
});

test("cancellation allowed until delivered", () => {
  assert.equal(canTransition("pending", "cancelled"), true);
  assert.equal(canTransition("confirmed", "cancelled"), true);
  assert.equal(canTransition("processing", "cancelled"), true);
  assert.equal(canTransition("shipped", "cancelled"), true);
  assert.equal(canTransition("delivered", "cancelled"), false);
});

test("invalid transitions rejected", () => {
  assert.equal(canTransition("pending", "delivered"), false);
  assert.equal(canTransition("delivered", "pending"), false);
  assert.equal(canTransition("cancelled", "confirmed"), false);
  assert.equal(canTransition("pending", "pending"), false); // same status
});

test("nextStatuses exposes valid options for UI", () => {
  assert.deepEqual(nextStatuses("pending"), ["confirmed", "cancelled"]);
  assert.deepEqual(nextStatuses("delivered"), []);
});

test("fingerprintParts normalizes address and sorts items", () => {
  const a = fingerprintParts({
    phone: "01712345678",
    address: "  বাসা   ১২, ঢাকা ",
    items: [
      { productId: 2, variantId: null, quantity: 1 },
      { productId: 1, variantId: null, quantity: 2 },
    ],
    landingSlug: "offer-x",
  });
  const b = fingerprintParts({
    phone: "01712345678",
    address: "বাসা ১২, ঢাকা",
    items: [
      { productId: 1, variantId: null, quantity: 2 },
      { productId: 2, variantId: null, quantity: 1 },
    ],
    landingSlug: "offer-x",
  });
  assert.equal(a, b); // order of items must not matter
});
