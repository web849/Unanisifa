/**
 * মিডিয়া লিংক ও HTML স্নিপেট হেল্পার — ক্লায়েন্ট ও সার্ভার দুই দিকেই নিরাপদ
 * (এই ফাইলে কোনো Node/DB ইমপোর্ট নেই)।
 *
 * ব্যবহার:
 *  - Storage (R2) পেজে "Copy link" / "Copy HTML" বোতাম
 *  - ল্যান্ডিং বিল্ডারের HTML ব্লকে ছবি বসানো (Insert HTML)
 *
 * নিয়ম:
 *  - R2 public URL (https://…) থাকলে সেটাই ব্যবহৃত হয়।
 *  - আপেক্ষিক URL (/api/media/…) হলে কপির সময় বর্তমান সাইটের origin যোগ করে
 *    পূর্ণ লিংক বানানো হয়, যাতে লিংকটি যেকোনো জায়গায় (Facebook, অন্য HTML
 *    পেজ) পেস্ট করলেও কাজ করে। একই সাইটের HTML ব্লকে সরাসরি বসানোর সময়
 *    আপেক্ষিক URL-ই রাখা যায় (ডোমেইন বদলালেও লিংক ভাঙে না)।
 */

/** HTML attribute-এর ভেতরে বসানোর জন্য নিরাপদ escape */
export function escapeHtmlAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * যেকোনো মিডিয়া URL-কে পূর্ণ (absolute) URL-এ রূপান্তর করে।
 * origin না দিলে ব্রাউজারে window.location.origin ধরা হয়;
 * সার্ভারে origin ছাড়া আপেক্ষিক URL অপরিবর্তিত থাকে।
 */
export function absoluteMediaUrl(url: string, origin?: string): string {
  const raw = (url ?? "").trim();
  if (!raw) return "";
  if (/^(https?:)?\/\//i.test(raw) || raw.startsWith("data:") || raw.startsWith("blob:")) {
    return raw;
  }
  const base =
    origin?.trim().replace(/\/$/, "") ||
    (typeof window !== "undefined" ? window.location.origin : "");
  if (!base) return raw;
  return raw.startsWith("/") ? `${base}${raw}` : `${base}/${raw}`;
}

/**
 * HTML-এ সরাসরি পেস্ট করার মতো রেসপন্সিভ <img> স্নিপেট।
 * `absolute: true` (ডিফল্ট) হলে src পূর্ণ URL হয় — বাইরে শেয়ার/পেস্টের জন্য।
 * ল্যান্ডিং বিল্ডারের ভেতরে বসাতে `absolute: false` দিলে সংরক্ষিত URL-ই থাকে।
 */
export function imageHtmlSnippet(
  url: string,
  alt = "",
  options: { absolute?: boolean; origin?: string } = {},
): string {
  const absolute = options.absolute ?? true;
  const src = absolute ? absoluteMediaUrl(url, options.origin) : (url ?? "").trim();
  const safeAlt = escapeHtmlAttr(alt.trim() || "ছবি");
  return `<img src="${escapeHtmlAttr(src)}" alt="${safeAlt}" loading="lazy" style="max-width:100%;height:auto;border-radius:12px;display:block;margin:12px auto" />`;
}
