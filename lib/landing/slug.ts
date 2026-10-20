/**
 * ল্যান্ডিং পেজের ইউনিক slug বানানোর হেল্পার।
 *
 * আগে একই শিরোনামে আবার পেজ বানাতে গেলে "Slug already used" 409 এররে
 * তৈরি আটকে যেত। এখন নতুন পেজের ক্ষেত্রে slug মিলে গেলে -2, -3 … যোগ
 * করে ইউনিক slug বানানো হয়, যাতে পেজ তৈরি কখনো আটকায় না।
 * (বিদ্যমান পেজের slug বদলানোর সময় এই স্বয়ংক্রিয় বদল করা হয় না —
 *  সেখানে আগের মতোই 409, কারণ অ্যাডের লিংক ভাঙা উচিত নয়।)
 */

import { slugify } from "../utils";

/** slugify করে খালি হলে (শুধু চিহ্ন/ইমোজি শিরোনাম) সময়-ভিত্তিক ফলব্যাক */
export function landingSlugBase(input: string, now: number = Date.now()): string {
  const slug = slugify(input);
  return slug || `offer-${now.toString(36)}`;
}

/**
 * base slug থেকে প্রথম খালি (unused) slug খোঁজে।
 * `exists` ডেটাবেজে ওই slug আগে থেকে আছে কি না জানায়।
 */
export async function buildUniqueSlug(
  base: string,
  exists: (slug: string) => Promise<boolean>,
  maxAttempts = 50,
): Promise<string> {
  if (!(await exists(base))) return base;
  for (let suffix = 2; suffix <= maxAttempts; suffix += 1) {
    const candidate = `${base}-${suffix}`;
    if (!(await exists(candidate))) return candidate;
  }
  return `${base}-${Date.now().toString(36)}`;
}
