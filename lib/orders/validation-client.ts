/**
 * ক্লায়েন্ট-সাইড ভ্যালিডেশন হেল্পার (সার্ভারে একই নিয়ম lib/orders/validation.ts-এ)।
 * এগুলো শুধু UX-এর জন্য — আসল ভ্যালিডেশন সবসময় সার্ভারে হয়।
 */

import { toEnglishDigits } from "../utils";

/** বাংলাদেশি মোবাইল: 01[3-9]XXXXXXXX — বাংলা সংখ্যাও গ্রহণযোগ্য */
export function normalizeBdPhone(input: string): string | null {
  const digits = toEnglishDigits(input).replace(/[^0-9]/g, "");
  let local = digits;
  if (digits.length === 13 && digits.startsWith("880")) local = digits.slice(2);
  if (digits.length === 12 && digits.startsWith("880")) local = digits.slice(2);
  if (digits.length === 11 && digits.startsWith("01")) local = digits;
  if (!local || !/^01[3-9]\d{8}$/.test(local)) return null;
  return local;
}

export function isValidBdPhone(input: string): boolean {
  return normalizeBdPhone(input) !== null;
}

/** ঠিকানা কমপক্ষে ৮ অক্ষর */
export function isValidAddress(input: string): boolean {
  return input.trim().length >= 8;
}
