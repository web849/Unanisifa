import test from "node:test";
import assert from "node:assert/strict";
import {
  clamp,
  containsEmoji,
  discountPercent,
  formatTaka,
  formatTakaEn,
  slugify,
  stripEmoji,
  toBanglaDigits,
  toEnglishDigits,
  toMoney,
} from "../../lib/utils";

test("toBanglaDigits converts digits and keeps other characters", () => {
  assert.equal(toBanglaDigits("1234"), "১২৩৪");
  assert.equal(toBanglaDigits(1299), "১২৯৯");
  assert.equal(toBanglaDigits("1,299"), "১,২৯৯");
});

test("toEnglishDigits converts Bangla digits back", () => {
  assert.equal(toEnglishDigits("০১৭১২৩৪৫৬৭৮"), "01712345678");
  assert.equal(toEnglishDigits("01712345678"), "01712345678");
});

test("toMoney normalizes to integer taka", () => {
  assert.equal(toMoney("১২৯৯"), 1299);
  assert.equal(toMoney(" 850.6 "), 851);
  assert.equal(toMoney(null), 0);
  assert.equal(toMoney("abc"), 0);
});

test("formatTaka renders Bangla numerals with ৳ and grouping", () => {
  assert.equal(formatTaka(1299), "৳১,২৯৯");
  assert.equal(formatTaka(70), "৳৭০");
  assert.equal(formatTaka(0), "৳০");
});

test("formatTakaEn renders English numerals for admin", () => {
  assert.equal(formatTakaEn(1299), "৳1,299");
});

test("discountPercent rounds against compare-at price", () => {
  assert.equal(discountPercent(185, 220), 16);
  assert.equal(discountPercent(220, 220), 0);
  assert.equal(discountPercent(220, null), 0);
  assert.equal(discountPercent(0, 100), 0);
});

test("slugify produces url-safe lowercase slugs", () => {
  const slug = slugify("Hello World");
  assert.equal(slug, "hello-world");
  assert.equal(slugify("  Multiple   Spaces  ").includes("  "), false);
});

test("clamp keeps value within bounds", () => {
  assert.equal(clamp(5, 1, 3), 3);
  assert.equal(clamp(-5, 1, 3), 1);
  assert.equal(clamp(2, 1, 3), 2);
});

test("containsEmoji flags emoji-range characters, not ৳ or Bangla text", () => {
  assert.equal(containsEmoji("স্বাগতম ৳১২৯৯"), false);
  assert.equal(containsEmoji("hello world"), false);
  assert.equal(containsEmoji("order → shipped"), true); // arrows count as emoji-range
  assert.equal(containsEmoji("party 🎉"), true);
});

test("stripEmoji removes emoji-range characters", () => {
  assert.equal(stripEmoji("🎉 hello"), "hello");
  assert.equal(stripEmoji("no emoji ৳৫০"), "no emoji ৳৫০");
});
