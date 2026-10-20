/**
 * ল্যান্ডিং পেজের পণ্য-আইডি যাচাই ও ডেমো-আইডি ম্যাপিং (সার্ভার-সাইড)।
 *
 * সমস্যা যা এখানে ঠিক করা হলো:
 * ডেটাবেজ খালি থাকলে বিল্ডার/ক্রিয়েট ফর্ম ডেমো ক্যাটালগের পণ্য দেখায়
 * (আইডি ১–১৫, ডেটাবেজে তখনো নেই)। ডেমো ইমপোর্টের পর ডেটাবেজের আসল আইডি
 * ভিন্ন হলে আগের কোড সরাসরি ওই আইডি দিয়ে INSERT করত — foreign key
 * violation-এ 500 এরর, আর ফ্রন্টএন্ডে শুধু "Network error" দেখাত।
 * মনে হতো ল্যান্ডিং পেজই তৈরি হচ্ছে না।
 *
 * সমাধান: সেভের আগে প্রতিটি আইডি ডেটাবেজে খোঁজা হয়। না পেলে আইডিটি
 * ডেমো পণ্যের হলে slug দিয়ে আসল পণ্যের আইডিতে ম্যাপ করা হয়।
 * কোনোভাবেই না মিললে কলার স্পষ্ট 400 বার্তা দিতে পারে (FK 500 নয়)।
 */

import { eq } from "drizzle-orm";
import type { Db } from "../db";
import { products } from "../db/schema";
import { DEMO_PRODUCTS } from "../demo/catalog";
import type { LandingSection } from "./sections";

/** একটি পণ্য-আইডি ডেটাবেজের আসল আইডিতে মেলায়; না মিললে null */
export async function resolveProductId(db: Db, productId: number): Promise<number | null> {
  const byId = await db
    .select({ id: products.id })
    .from(products)
    .where(eq(products.id, productId))
    .limit(1);
  if (byId[0]) return byId[0].id;

  const demo = DEMO_PRODUCTS.find((product) => product.id === productId);
  if (demo) {
    const bySlug = await db
      .select({ id: products.id })
      .from(products)
      .where(eq(products.slug, demo.slug))
      .limit(1);
    if (bySlug[0]) return bySlug[0].id;
  }
  return null;
}

/** একাধিক আইডির জন্য old → new ম্যাপ (যেগুলো মেলেনি সেগুলো ম্যাপে নেই) */
export async function buildProductIdMap(db: Db, ids: number[]): Promise<Map<number, number>> {
  const map = new Map<number, number>();
  for (const id of [...new Set(ids.filter((value) => Number.isInteger(value) && value > 0))]) {
    const resolved = await resolveProductId(db, id);
    if (resolved !== null) map.set(id, resolved);
  }
  return map;
}

/** অফার-তালিকার আইডি ম্যাপ করে — না-মেলা আইডি বাদ পড়ে, ডুপ্লিকেট থাকে না */
export function remapProductIds(ids: number[], map: Map<number, number>): number[] {
  const out: number[] = [];
  for (const id of ids) {
    const resolved = map.get(id);
    if (resolved !== undefined && !out.includes(resolved)) out.push(resolved);
  }
  return out;
}

/** সেকশন-সেটিংসের productId / productIds ডেমো-ম্যাপ অনুযায়ী বদলায় */
export function remapSectionProductIds(
  sections: LandingSection[],
  map: Map<number, number>,
): LandingSection[] {
  if (map.size === 0) return sections;
  let changed = false;
  const next = sections.map((section) => {
    const settings = { ...(section.settings as Record<string, unknown>) };
    let sectionChanged = false;

    const single = Number(settings.productId);
    if (Number.isInteger(single) && single > 0 && map.has(single) && map.get(single) !== single) {
      settings.productId = map.get(single);
      sectionChanged = true;
    }
    if (Array.isArray(settings.productIds)) {
      const ids = (settings.productIds as unknown[])
        .map((value) => Number(value))
        .filter((value) => Number.isInteger(value) && value > 0);
      const remapped = remapProductIds(ids, map);
      if (JSON.stringify(remapped) !== JSON.stringify(ids)) {
        settings.productIds = remapped;
        sectionChanged = true;
      }
    }

    if (!sectionChanged) return section;
    changed = true;
    return { ...section, settings };
  });
  return changed ? next : sections;
}

/** পেজ + অফার + সেকশনে ব্যবহৃত সব পণ্য-আইডি সংগ্রহ করে */
export function collectProductIds(input: {
  productId?: number | null;
  checkoutOffers?: number[];
  thankYouOffers?: number[];
  sections?: LandingSection[];
}): number[] {
  const ids: number[] = [];
  if (input.productId) ids.push(input.productId);
  ids.push(...(input.checkoutOffers ?? []), ...(input.thankYouOffers ?? []));
  for (const section of input.sections ?? []) {
    const settings = section.settings as Record<string, unknown>;
    const single = Number(settings.productId);
    if (Number.isInteger(single) && single > 0) ids.push(single);
    if (Array.isArray(settings.productIds)) {
      for (const value of settings.productIds as unknown[]) {
        const id = Number(value);
        if (Number.isInteger(id) && id > 0) ids.push(id);
      }
    }
  }
  return ids;
}
