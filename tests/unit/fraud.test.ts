import test from "node:test";
import assert from "node:assert/strict";
import {
  isSuspiciousName,
  isSuspiciousPhone,
  isWeakAddress,
  scoreFraud,
  type FraudInput,
} from "../../lib/orders/fraud-signals";

function cleanInput(partial: Partial<FraudInput> = {}): FraudInput {
  return {
    submitDurationMs: 45_000,
    phone: "01712345678",
    name: "রহিম উদ্দিন",
    address: "বাসা ১২, রোড ৫, ধানমন্ডি, ঢাকা",
    distinctPhonesFromIp24h: 1,
    ordersFromIp24h: 1,
    previousCancellations: 0,
    customerCancelRate: 0,
    ...partial,
  };
}

test("clean submission scores 0 and stays clear", () => {
  const result = scoreFraud(cleanInput());
  assert.equal(result.score, 0);
  assert.equal(result.status, "clear");
  assert.equal(result.reasons.length, 0);
});

test("fast submit under 2s scores 25 (watch threshold is 30)", () => {
  const result = scoreFraud(cleanInput({ submitDurationMs: 1200 }));
  assert.ok(result.reasons.some((reason) => reason.code === "fast_submit"));
  assert.equal(result.score, 25);
  assert.equal(result.status, "clear");
});

test("suspicious phone patterns are detected", () => {
  assert.equal(isSuspiciousPhone("01777777777"), true); // repeated digit tail
  assert.equal(isSuspiciousPhone("01712345678"), false);
});

test("weak addresses are detected", () => {
  assert.equal(isWeakAddress("test"), true);
  assert.equal(isWeakAddress("ঢাকা"), true); // too short
  assert.equal(isWeakAddress("বাসা ১২, রোড ৫, ধানমন্ডি, ঢাকা"), false);
});

test("suspicious names are detected", () => {
  assert.equal(isSuspiciousName("test user"), true);
  assert.equal(isSuspiciousName("রহিম উদ্দিন"), false);
});

test("30+ scores watch, 60+ scores review", () => {
  const watch = scoreFraud(cleanInput({ distinctPhonesFromIp24h: 3 })); // +30
  assert.equal(watch.status, "watch");

  const review = scoreFraud(
    cleanInput({ submitDurationMs: 1000, phone: "01777777777", address: "test" }),
  ); // 25 + 25 + 20 = 70
  assert.equal(review.status, "review");
  assert.ok(review.score >= 60);
});

test("score is capped at 100", () => {
  const result = scoreFraud(
    cleanInput({
      submitDurationMs: 500,
      phone: "01777777777",
      name: "test",
      address: "test",
      distinctPhonesFromIp24h: 5,
      ordersFromIp24h: 5,
      previousCancellations: 2,
      customerCancelRate: 80,
    }),
  );
  assert.equal(result.score, 100);
  assert.equal(result.status, "review");
});

test("prior cancellation adds 25 and cancel history adds 10", () => {
  const result = scoreFraud(cleanInput({ previousCancellations: 1, customerCancelRate: 50 }));
  assert.equal(result.score, 35);
  assert.equal(result.status, "watch");
});
