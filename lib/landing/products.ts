/**
 * ল্যান্ডিং পেজ / বিল্ডার যে পণ্য-ডেটা ব্যবহার করে।
 *
 * কেন আলাদা মডিউল: পাবলিক পেজ, বিল্ডার প্রিভিউ, অর্ডার ফর্ম ও চেকআউট —
 * সবাই একই হালকা ও সিরিয়ালাইজেবল `LandingProduct` চায়। ডেটাবেজ খালি হলে
 * বিল্ডার ডেমো ক্যাটালগ দেখায়, যাতে অ্যাডমিন কিছুই না দেখে বিভ্রান্ত না হন।
 */

import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { db } from "../db";
import { products } from "../db/schema";
import { DEMO_PRODUCTS, demoProductImages } from "../demo/catalog";
import type { LandingProduct } from "./product-types";

export type { LandingProduct } from "./product-types";
export { toLandingOrderProduct } from "./product-types";

export type LandingCatalog = {
  items: LandingProduct[];
  /** true হলে দেখানো পণ্যগুলো ডেটাবেজে নেই — শুধু প্রিভিউর জন্য */
  demoFallback: boolean;
  /** ডেটাবেজে থাকা পণ্যের সংখ্যা (ডেমো বাদে) */
  databaseCount: number;
};

function demoLandingProducts(): LandingProduct[] {
  return DEMO_PRODUCTS.map((product) => ({
    id: product.id,
    name: product.name,
    slug: product.slug,
    price: product.price,
    compareAtPrice: product.compareAtPrice,
    packageSize: product.packageSize || null,
    shortDescription: product.shortDescription ?? "",
    ingredients: product.ingredients ?? "",
    dosage: product.dosage ?? "",
    image: demoProductImages(product.id, product.name)[0]?.url ?? null,
    inStock: !product.trackStock || product.stock > 0,
    requiresPrescription: product.requiresPrescription,
    status: product.status,
    isDemo: true,
  }));
}

/**
 * সক্রিয় (এবং দরকারে draft) পণ্যের তালিকা।
 *
 * `demoFallback: true` শুধু বিল্ডার/ক্রিয়েট ফর্মে — ডেটাবেজে একটি পণ্যও না
 * থাকলে ১৫টি ডেমো পণ্য দেখানো হয় এবং "ডেমো ক্যাটালগ ইমপোর্ট" বোতাম দেখানো হয়।
 */
export async function getLandingCatalog(options: {
  includeDrafts?: boolean;
  demoFallback?: boolean;
  limit?: number;
} = {}): Promise<LandingCatalog> {
  const limit = Math.min(Math.max(options.limit ?? 200, 1), 500);

  if (!db) {
    return options.demoFallback
      ? { items: demoLandingProducts(), demoFallback: true, databaseCount: 0 }
      : { items: [], demoFallback: false, databaseCount: 0 };
  }

  const statuses: Array<"active" | "draft"> = options.includeDrafts ? ["active", "draft"] : ["active"];
  const rows = await db
    .select({
      id: products.id,
      name: products.name,
      slug: products.slug,
      price: products.price,
      compareAtPrice: products.compareAtPrice,
      packageSize: products.packageSize,
      shortDescription: products.shortDescription,
      ingredients: products.ingredients,
      dosage: products.dosage,
      stock: products.stock,
      trackStock: products.trackStock,
      requiresPrescription: products.requiresPrescription,
      status: sql<"active" | "draft" | "archived">`${products.status}`,
      image: sql<string | null>`(
        SELECT pi.url FROM product_images pi
        WHERE pi.product_id = ${products.id}
        ORDER BY pi.sort_order ASC, pi.id ASC
        LIMIT 1
      )`,
    })
    .from(products)
    .where(inArray(products.status, statuses))
    .orderBy(asc(products.sortOrder), asc(products.id))
    .limit(limit);

  const items: LandingProduct[] = rows.map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    price: row.price,
    compareAtPrice: row.compareAtPrice,
    packageSize: row.packageSize,
    shortDescription: row.shortDescription ?? "",
    ingredients: row.ingredients ?? "",
    dosage: row.dosage ?? "",
    image: row.image,
    inStock: !row.trackStock || row.stock > 0,
    requiresPrescription: row.requiresPrescription,
    status: row.status,
    isDemo: false,
  }));

  const countRows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(products);
  const databaseCount = countRows[0]?.count ?? 0;

  if (items.length === 0 && databaseCount === 0 && options.demoFallback) {
    return { items: demoLandingProducts(), demoFallback: true, databaseCount };
  }

  return { items, demoFallback: false, databaseCount };
}

/** নির্দিষ্ট আইডির পণ্য — পেজের মূল পণ্য নিখুঁতভাবে মেলাতে */
export async function getLandingProductById(id: number): Promise<LandingProduct | null> {
  if (!db) {
    return demoLandingProducts().find((product) => product.id === id) ?? null;
  }
  const rows = await db
    .select({
      id: products.id,
      name: products.name,
      slug: products.slug,
      price: products.price,
      compareAtPrice: products.compareAtPrice,
      packageSize: products.packageSize,
      shortDescription: products.shortDescription,
      ingredients: products.ingredients,
      dosage: products.dosage,
      stock: products.stock,
      trackStock: products.trackStock,
      requiresPrescription: products.requiresPrescription,
      status: sql<"active" | "draft" | "archived">`${products.status}`,
      image: sql<string | null>`(
        SELECT pi.url FROM product_images pi
        WHERE pi.product_id = ${products.id}
        ORDER BY pi.sort_order ASC, pi.id ASC
        LIMIT 1
      )`,
    })
    .from(products)
    .where(and(eq(products.id, id), inArray(products.status, ["active", "draft"])))
    .limit(1);

  const row = rows[0];
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    price: row.price,
    compareAtPrice: row.compareAtPrice,
    packageSize: row.packageSize,
    shortDescription: row.shortDescription ?? "",
    ingredients: row.ingredients ?? "",
    dosage: row.dosage ?? "",
    image: row.image,
    inStock: !row.trackStock || row.stock > 0,
    requiresPrescription: row.requiresPrescription,
    status: row.status,
    isDemo: false,
  };
}

