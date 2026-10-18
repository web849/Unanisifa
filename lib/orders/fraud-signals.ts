/**
 * ফ্রড সিগন্যাল — pure স্কোরিং (unit test আছে)।
 *
 * সিগন্যাল (স্পেক ৭ছ):
 * - খুব দ্রুত সাবমিট (+২০–২৫)
 * - সন্দেহজনক ফোন প্যাটার্ন (+২৫)
 * - দুর্বল বা পুনরাবৃত্ত ঠিকানা (+২০)
 * - সন্দেহজনক নাম (+১৫)
 * - এক নেটওয়ার্ক থেকে ২৪ ঘণ্টায় ৩+ ভিন্ন নম্বর (+৩)
 * - এক নেটওয়ার্ক থেকে ৩+ অর্ডার (+২)
 * - আগের ক্যানসেল (+২৫)
 * - কাস্টমারের পুরোনো ক্যানসেল/রিটার্ন হিস্টরি (+১০)
 *
 * লেভেল: স্কোর ≥ ৬০ → review (হোল্ড); ≥ ৩০ → watch; < ৩০ → clear
 */

export type FraudSignal = { code: string; label: string; points: number };

export type FraudInput = {
  /** ফর্ম খোলার থেকে সাবমিট পর্যন্ত মিলিসেকেন্ড (না থাকলে null) */
  submitDurationMs: number | null;
  phone: string;
  name: string;
  address: string;
  /** একই IP হ্যাশ থেকে গত ২৪ ঘণ্টায় ভিন্ন নম্বরের সংখ্যা */
  distinctPhonesFromIp24h: number;
  /** একই IP হ্যাশ থেকে গত ২৪ ঘণ্টায় মোট অর্ডার */
  ordersFromIp24h: number;
  /** এই ফোনের আগের ক্যানসেল করা অর্ডার */
  previousCancellations: number;
  /** কাস্টমারের পুরোনো ক্যানসেল/রিটার্ন হার (০–১০০) */
  customerCancelRate: number;
};

export type FraudResult = {
  score: number;
  reasons: FraudSignal[];
  status: "clear" | "watch" | "review";
};

const REPEATED_DIGIT = /^(\d)\1+$/;
const SEQUENTIAL = /^(01[0-9])?(0123456789|123456789|987654321|00000000|11111111|22222222|33333333|44444444|55555555|66666666|77777777|88888888|99999999)$/;

export function isSuspiciousPhone(phone: string): boolean {
  const tail = phone.slice(2);
  return REPEATED_DIGIT.test(tail) || SEQUENTIAL.test(phone) || new Set(tail.split("")).size <= 2;
}

export function isWeakAddress(address: string): boolean {
  const clean = address.trim().toLowerCase();
  if (clean.length < 10) return true;
  if (/^(test|aaa|aaaa|asdf|qqq|xxx|demo|dummy)/.test(clean)) return true;
  if (new Set(clean.replace(/\s/g, "").split("")).size <= 3) return true;
  return false;
}

export function isSuspiciousName(name: string): boolean {
  const clean = name.trim().toLowerCase();
  if (clean.length < 2) return true;
  if (/^(test|demo|dummy|asdf|aaa|xxx)/.test(clean)) return true;
  if (new Set(clean.replace(/\s/g, "").split("")).size <= 2) return true;
  return false;
}

export function scoreFraud(input: FraudInput): FraudResult {
  const reasons: FraudSignal[] = [];

  if (input.submitDurationMs != null) {
    if (input.submitDurationMs < 2000) {
      reasons.push({ code: "fast_submit", label: "খুব দ্রুত সাবমিট (২ সেকেন্ডের কম)", points: 25 });
    } else if (input.submitDurationMs < 4000) {
      reasons.push({ code: "quick_submit", label: "অস্বাভাবিক দ্রুত সাবমিট", points: 20 });
    }
  }

  if (isSuspiciousPhone(input.phone)) {
    reasons.push({ code: "phone_pattern", label: "সন্দেহজনক মোবাইল প্যাটার্ন", points: 25 });
  }

  if (isWeakAddress(input.address)) {
    reasons.push({ code: "weak_address", label: "দুর্বল বা পুনরাবৃত্ত ঠিকানা", points: 20 });
  }

  if (isSuspiciousName(input.name)) {
    reasons.push({ code: "suspicious_name", label: "সন্দেহজনক নাম", points: 15 });
  }

  if (input.distinctPhonesFromIp24h >= 3) {
    reasons.push({
      code: "network_phones",
      label: "এক নেটওয়ার্ক থেকে ২৪ ঘণ্টায় ৩+ ভিন্ন নম্বর",
      points: 30,
    });
  }

  if (input.ordersFromIp24h >= 3) {
    reasons.push({ code: "network_orders", label: "এক নেটওয়ার্ক থেকে ৩+ অর্ডার", points: 20 });
  }

  if (input.previousCancellations >= 1) {
    reasons.push({ code: "prior_cancel", label: "আগের ক্যানসেল করা অর্ডার", points: 25 });
  }

  if (input.customerCancelRate >= 40) {
    reasons.push({ code: "cancel_history", label: "কাস্টমারের পুরোনো ক্যানসেল/রিটার্ন হিস্টরি", points: 10 });
  }

  const score = Math.min(100, reasons.reduce((sum, reason) => sum + reason.points, 0));
  const status: FraudResult["status"] = score >= 60 ? "review" : score >= 30 ? "watch" : "clear";

  return { score, reasons, status };
}
