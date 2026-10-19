/**
 * ডেমো ক্যাটালগ ইমপোর্ট — এক ক্লিকেই ৫ ক্যাটাগরি, ১৫ পণ্য (+ছবি),
 * ৩ ব্যানার ও ৬ CMS পেজ ডেটাবেজে বসায়।
 *
 * সব রো `isDemo = true`; `npm run cleanup:demo` দিয়ে এক কমান্ডে মোছা যায়।
 * আইডেমপোটেন্ট: আগে থেকে থাকা রো বদলায় না, শুধু অনুপস্থিতগুলো যোগ করে।
 */

import { inArray, sql } from "drizzle-orm";
import type { Db } from "../db";
import {
  banners,
  categories,
  cmsPages,
  productImages,
  products,
} from "../db/schema";
import {
  DEMO_BANNERS,
  DEMO_CATEGORIES,
  DEMO_CMS_PAGES,
  DEMO_PRODUCTS,
  demoProductImages,
} from "./catalog";

export type DemoImportResult = {
  categories: number;
  products: number;
  images: number;
  banners: number;
  pages: number;
};

export async function importDemoCatalog(database: Db): Promise<DemoImportResult> {
  /* ---- ক্যাটাগরি ---- */
  const insertedCategories = await database
    .insert(categories)
    .values(DEMO_CATEGORIES.map((category) => ({ ...category })))
    .onConflictDoNothing()
    .returning({ id: categories.id });

  /* ---- পণ্য ---- */
  const insertedProducts = await database
    .insert(products)
    .values(DEMO_PRODUCTS.map((product) => ({ ...product })))
    .onConflictDoNothing()
    .returning({ id: products.id });

  /* ---- ছবি (আগে থেকে থাকলে ডুপ্লিকেট নয়) ---- */
  const demoIds = DEMO_PRODUCTS.map((product) => product.id);
  const existingImages = await database
    .select({ productId: productImages.productId, url: productImages.url })
    .from(productImages)
    .where(inArray(productImages.productId, demoIds));
  const existingKeys = new Set(existingImages.map((row) => `${row.productId}|${row.url}`));

  const imageRows = DEMO_PRODUCTS.flatMap((product) =>
    demoProductImages(product.id, product.name)
      .filter((image) => !existingKeys.has(`${image.productId}|${image.url}`))
      .map((image) => ({
        productId: image.productId,
        url: image.url,
        alt: image.alt,
        sortOrder: image.sortOrder,
        isPrimary: image.isPrimary,
      })),
  );
  const insertedImages =
    imageRows.length > 0
      ? await database.insert(productImages).values(imageRows).returning({ id: productImages.id })
      : [];

  /* ---- ব্যানার ---- */
  const insertedBanners = await database
    .insert(banners)
    .values(DEMO_BANNERS.map((banner) => ({ ...banner })))
    .onConflictDoNothing()
    .returning({ id: banners.id });

  /* ---- CMS পেজ ---- */
  const insertedPages = await database
    .insert(cmsPages)
    .values(DEMO_CMS_PAGES.map((page) => ({ ...page })))
    .onConflictDoNothing()
    .returning({ slug: cmsPages.slug });

  /* ডেমো রো-তে স্পষ্ট id বসানো হয়, তাই সিকোয়েন্স এগিয়ে দিতে হবে —
     পরে অ্যাডমিন থেকে নতুন পণ্য যোগ করলে duplicate key যেন না হয়। */
  await database.execute(
    sql`SELECT setval(pg_get_serial_sequence('categories', 'id'), (SELECT COALESCE(MAX(id), 1) FROM categories))`,
  );
  await database.execute(
    sql`SELECT setval(pg_get_serial_sequence('products', 'id'), (SELECT COALESCE(MAX(id), 1) FROM products))`,
  );
  await database.execute(
    sql`SELECT setval(pg_get_serial_sequence('banners', 'id'), (SELECT COALESCE(MAX(id), 1) FROM banners))`,
  );

  return {
    categories: insertedCategories.length,
    products: insertedProducts.length,
    images: insertedImages.length,
    banners: insertedBanners.length,
    pages: insertedPages.length,
  };
}
