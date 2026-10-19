/**
 * সাধারণ ইউটিলিটি — টাকা ফরম্যাট (বাংলা সংখ্যা), তারিখ (Asia/Dhaka), স্লাগ ইত্যাদি।
 *
 * নিয়ম (স্পেক সেকশন ২.৭): টাকা = পূর্ণসংখ্যা (integer), চিহ্ন ৳,
 * টাইমজোন Asia/Dhaka, ফরম্যাট বাংলা সংখ্যায় (উদাহরণ: ৳১,২৯৯)।
 */

import { SITE_TIMEZONE } from "./config";

const BANGLA_DIGITS = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"] as const;

/** ইংরেজি সংখ্যাকে বাংলা সংখ্যায় বদলায় */
export function toBanglaDigits(input: string | number): string {
  return String(input).replace(/[0-9]/g, (d) => BANGLA_DIGITS[Number(d)] ?? d);
}

/** বাংলা সংখ্যাকে ইংরেজি সংখ্যায় বদলায় (ইনপুট নরমালাইজেশনে ব্যবহৃত) */
export function toEnglishDigits(input: string): string {
  return input.replace(/[০-৯]/g, (d) =>
    String(BANGLA_DIGITS.indexOf(d as (typeof BANGLA_DIGITS)[number])),
  );
}

/**
 * টাকার অঙ্ককে পূর্ণসংখ্যায় রূপান্তর (রাউন্ডিং ঝুঁকি এড়াতে Math.round)।
 * ব্রাউজার থেকে আসা যেকোনো দাম এই ফাংশন দিয়ে নরমালাইজ করা হয়।
 */
export function toMoney(value: number | string | null | undefined): number {
  if (value === null || value === undefined || value === "") return 0;
  const n = typeof value === "string" ? Number(toEnglishDigits(value.trim())) : value;
  if (!Number.isFinite(n)) return 0;
  return Math.round(n);
}

/** ১২৯৯ → "১,২৯৯" (বাংলা সংখ্যা + হাজার সেপারেটর) */
export function formatNumberBangla(value: number): string {
  const rounded = Math.round(value);
  const grouped = Math.abs(rounded).toLocaleString("en-US");
  const sign = rounded < 0 ? "-" : "";
  return toBanglaDigits(`${sign}${grouped}`);
}

/** ১২৯৯ → "৳১,২৯৯" */
export function formatTaka(value: number, symbol = "৳"): string {
  return `${symbol}${formatNumberBangla(value)}`;
}

/** ইংরেজি সংখ্যায় গ্রুপিং — শুধু অ্যাডমিন প্যানেলে (ইংরেজি UI) */
export function formatNumberEn(value: number): string {
  return Math.round(value).toLocaleString("en-US");
}

export function formatTakaEn(value: number, symbol = "৳"): string {
  return `${symbol}${formatNumberEn(value)}`;
}

/** শতাংশ ছাড় হিসাব (স্ট্রাইক-থ্রু দাম থেকে) — পূর্ণসংখ্যা */
export function discountPercent(price: number, compareAt: number | null): number {
  if (!compareAt || compareAt <= price || price <= 0) return 0;
  return Math.round(((compareAt - price) / compareAt) * 100);
}

/** Asia/Dhaka টাইমজোনে তারিখ ফরম্যাট (বাংলা মাস ও সংখ্যা) */
const BANGLA_MONTHS = [
  "জানুয়ারি",
  "ফেব্রুয়ারি",
  "মার্চ",
  "এপ্রিল",
  "মে",
  "জুন",
  "জুলাই",
  "আগস্ট",
  "সেপ্টেম্বর",
  "অক্টোবর",
  "নভেম্বর",
  "ডিসেম্বর",
] as const;

export function formatDateBangla(input: Date | string | number): string {
  const date = toDate(input);
  if (!date) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: SITE_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const year = parts.find((p) => p.type === "year")?.value ?? "";
  const month = Number(parts.find((p) => p.type === "month")?.value ?? "1");
  const day = parts.find((p) => p.type === "day")?.value ?? "";
  return `${toBanglaDigits(day)} ${BANGLA_MONTHS[month - 1] ?? ""} ${toBanglaDigits(year)}`;
}

export function formatDateTimeBangla(input: Date | string | number): string {
  const date = toDate(input);
  if (!date) return "";
  const time = new Intl.DateTimeFormat("en-GB", {
    timeZone: SITE_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(date);
  return `${formatDateBangla(date)}, ${time}`;
}

/** অ্যাডমিন প্যানেলের জন্য ইংরেজি তারিখ (Asia/Dhaka টাইমজোন) */
export function formatDateEn(input: Date | string | number): string {
  const date = toDate(input);
  if (!date) return "";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: SITE_TIMEZONE,
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

export function toDate(input: Date | string | number | null | undefined): Date | null {
  if (input === null || input === undefined) return null;
  const date = input instanceof Date ? input : new Date(input);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Asia/Dhaka অনুযায়ী YYYY-MM-DD */
export function dateKeyInDhaka(input: Date | string | number = new Date()): string {
  const date = toDate(input);
  if (!date) return "";
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: SITE_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** Asia/Dhaka অনুযায়ী YYMMDD (অর্ডার নম্বরে ব্যবহৃত) */
export function compactDateInDhaka(input: Date = new Date()): string {
  return dateKeyInDhaka(input).slice(2).replace(/-/g, "");
}

/** "হমদর্দ কলমeg..." → URL-নিরাপদ বাংলা-বান্ধব স্লাগ */
export function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/['"`]/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9\u0980-\u09ff-]/g, "")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

/** ক্লাস-নেম যোগ করা (falsy মান বাদ পড়ে) */
export function cx(
  ...parts: Array<string | false | null | undefined | Record<string, boolean | undefined>>
): string {
  const out: string[] = [];
  for (const part of parts) {
    if (!part) continue;
    if (typeof part === "string") {
      out.push(part);
    } else {
      for (const [key, value] of Object.entries(part)) {
        if (value) out.push(key);
      }
    }
  }
  return out.join(" ");
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** ডিটারমিনিস্টিক নন-ক্রিপ্টোগ্রাফিক হ্যাশ (ফিঙ্গারপ্রিন্ট/ডেমো আইডিতে ব্যবহৃত) */
export function simpleHash(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

/** স্ট্রিং ছেঁটে দেওয়া (মেটা ডেসক্রিপশন ইত্যাদিতে) */
export function truncate(input: string, max: number): string {
  const clean = input.trim().replace(/\s+/g, " ");
  if (clean.length <= max) return clean;
  return `${clean.slice(0, Math.max(0, max - 1)).trimEnd()}…`;
}

/** টেক্সট থেকে সব ইমোজি/ইমোটিকন স্ক্যান করে (QA ও কপি ভ্যালিডেশনে ব্যবহৃত) */
const EMOJI_PATTERN =
  /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}\u{FE00}-\u{FE0F}\u{1F1E6}-\u{1F1FF}\u{2700}-\u{27BF}\u{24C2}\u{203C}\u{2049}\u{20E3}]/u;

export function containsEmoji(input: string): boolean {
  return EMOJI_PATTERN.test(input);
}

/** ইনপুট থেকে ইমোজি মুছে ফেলা */
export function stripEmoji(input: string): string {
  return input.replace(new RegExp(EMOJI_PATTERN.source, "gu"), "").trim();
}

/** ছোট delay (সার্ভার সাইড রিট্রাই ব্যাকঅফে ব্যবহৃত) */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
