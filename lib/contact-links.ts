/**
 * কনটাক্ট লিংক হেল্পার (স্পেক সেকশন ৪)
 *
 * phone → tel: লিংক, whatsapp → wa.me লিংক — সব জায়গায় এই একটি হেল্পার ব্যবহার হয়,
 * যাতে নম্বর বদলালে (অ্যাডমিন → Settings → Branding) পুরো সাইটে একসাথে বদলে যায়।
 */

import type { BrandSettings } from "./config";
import { DEFAULT_BRAND } from "./config";

/** WhatsApp বার্তার ডিফল্ট বাংলা প্রি-ফিল */
export const WHATSAPP_DEFAULT_MESSAGE =
  "আসসালামু আলাইকুম, আমি একটি পণ্যের অর্ডার করতে চাই।";

/** tel: লিংক — আন্তর্জাতিক ফরম্যাটে */
export function telLink(brand: BrandSettings = DEFAULT_BRAND): string {
  const digits = normalizePhoneDigits(brand.phoneInternational || brand.phone);
  return `tel:+${digits}`;
}

/** মানুষের পড়ার উপযোগী ফোন নম্বর (লোকাল ফরম্যাট) */
export function phoneDisplay(brand: BrandSettings = DEFAULT_BRAND): string {
  return brand.phone || brand.phoneInternational;
}

/** আন্তর্জাতিক ফরম্যাটে প্রদর্শন */
export function phoneInternationalDisplay(brand: BrandSettings = DEFAULT_BRAND): string {
  return brand.phoneInternational || `+${normalizePhoneDigits(brand.phone)}`;
}

/**
 * wa.me লিংক। বার্তা বাংলায় প্রি-ফিল থাকে।
 * পণ্য-নির্দিষ্ট বার্তা পাঠাতে চাইলে message প্যারামিটার দিন।
 */
export function whatsappLink(
  brand: BrandSettings = DEFAULT_BRAND,
  message: string = WHATSAPP_DEFAULT_MESSAGE,
): string {
  const digits = normalizePhoneDigits(brand.whatsapp || brand.phoneInternational || brand.phone);
  const text = message.trim();
  return text
    ? `https://wa.me/${digits}?text=${encodeURIComponent(text)}`
    : `https://wa.me/${digits}`;
}

/** পণ্য-নির্দিষ্ট WhatsApp বার্তা */
export function whatsappProductMessage(productName: string, priceText?: string): string {
  const base = `আসসালামু আলাইকুম, আমি "${productName}" পণ্যটি অর্ডার করতে চাই।`;
  return priceText ? `${base} দাম: ${priceText}।` : base;
}

/** অর্ডার-নির্দিষ্ট WhatsApp বার্তা (থ্যাংক-ইউ / ট্র্যাকিং) */
export function whatsappOrderMessage(orderNumber: string): string {
  return `আসসালামু আলাইকুম, আমার অর্ডার ${orderNumber} সম্পর্কে জানতে চাই।`;
}

/** mailto: লিংক */
export function mailLink(
  brand: BrandSettings = DEFAULT_BRAND,
  subject?: string,
  body?: string,
): string {
  const params = new URLSearchParams();
  if (subject) params.set("subject", subject);
  if (body) params.set("body", body);
  const query = params.toString();
  return `mailto:${brand.email}${query ? `?${query}` : ""}`;
}

/** ফেসবুক লিংক থাকলে ফেরত দেয়, নাহলে null (ভুয়া লিংক কখনো নয়) */
export function facebookLink(brand: BrandSettings = DEFAULT_BRAND): string | null {
  const url = brand.facebook.trim();
  if (!url) return null;
  return url.startsWith("http") ? url : `https://${url}`;
}

/** +, স্পেস, ড্যাশ বাদ দিয়ে শুধু অঙ্ক রাখা */
export function normalizePhoneDigits(input: string): string {
  return input.replace(/[^0-9]/g, "");
}
