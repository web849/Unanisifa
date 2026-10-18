/**
 * ক্যাটালগ সিড — ডেমো ক্যাটাগরি, প্রোডাক্ট (+ইমেজ), ব্যানার, CMS পেজ।
 * সব রো-তে is_demo = true, তাই `npm run cleanup:demo` দিয়ে মুছে ফেলা যায়।
 * আইডেমপোটেন্ট: দ্বিতীয়বার চালালে কিছু বদলায় না (ON CONFLICT DO NOTHING)।
 *
 *   npm run db:seed-catalog
 */

import { register } from "node:module";

register("../tests/resolver-hooks.mjs", import.meta.url);

const { neon } = await import("@neondatabase/serverless");
const { DEMO_CATEGORIES, DEMO_PRODUCTS, DEMO_BANNERS, DEMO_CMS_PAGES, demoProductImages } = await import(
  "../lib/demo/catalog.ts"
);

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("[seed-catalog] DATABASE_URL সেট করা নেই — Neon কানেকশন স্ট্রিং দিন।");
  process.exit(1);
}
const sql = neon(url);

export async function seedCatalog(sqlClient) {
  /* ---- ক্যাটাগরি ---- */
  for (const category of DEMO_CATEGORIES) {
    await sqlClient`
      INSERT INTO categories (id, name, slug, description, cover_image, icon, active, sort_order, is_demo)
      VALUES (${category.id}, ${category.name}, ${category.slug}, ${category.description}, ${category.coverImage},
              ${category.icon}, ${category.active}, ${category.sortOrder}, TRUE)
      ON CONFLICT (id) DO NOTHING
    `;
  }
  await sqlClient`SELECT setval(pg_get_serial_sequence('categories','id'), (SELECT COALESCE(MAX(id),1) FROM categories))`;
  console.log(`[seed-catalog] categories: ${DEMO_CATEGORIES.length}`);

  /* ---- প্রোডাক্ট ---- */
  for (const product of DEMO_PRODUCTS) {
    await sqlClient`
      INSERT INTO products (
        id, name, slug, category_id, sku, short_description, description,
        price, compare_at_price, cost_price, stock, low_stock_threshold, track_stock,
        status, featured, is_demo, sort_order,
        ingredients, dosage, warnings, storage, package_size, manufacturer,
        requires_prescription, expiry_note, meta_title, meta_description
      ) VALUES (
        ${product.id}, ${product.name}, ${product.slug}, ${product.categoryId}, ${product.sku},
        ${product.shortDescription}, ${product.description},
        ${product.price}, ${product.compareAtPrice}, ${product.costPrice}, ${product.stock},
        ${product.lowStockThreshold}, ${product.trackStock},
        ${product.status}, ${product.featured}, TRUE, ${product.sortOrder},
        ${product.ingredients}, ${product.dosage}, ${product.warnings}, ${product.storage},
        ${product.packageSize}, ${product.manufacturer},
        ${product.requiresPrescription}, ${product.expiryNote}, ${product.metaTitle}, ${product.metaDescription}
      )
      ON CONFLICT (id) DO NOTHING
    `;
    for (const image of demoProductImages(product.id, product.name)) {
      await sqlClient`
        INSERT INTO product_images (product_id, url, alt, sort_order, is_primary)
        VALUES (${image.productId}, ${image.url}, ${image.alt}, ${image.sortOrder}, ${image.isPrimary})
        ON CONFLICT DO NOTHING
      `;
    }
  }
  await sqlClient`SELECT setval(pg_get_serial_sequence('products','id'), (SELECT COALESCE(MAX(id),1) FROM products))`;
  console.log(`[seed-catalog] products: ${DEMO_PRODUCTS.length} (+images)`);

  /* ---- ব্যানার ---- */
  for (const banner of DEMO_BANNERS) {
    await sqlClient`
      INSERT INTO banners (id, title, image_url, link_url, alt_text, active, sort_order, is_demo, starts_at, ends_at)
      VALUES (${banner.id}, ${banner.title}, ${banner.imageUrl}, ${banner.linkUrl}, ${banner.altText},
              ${banner.active}, ${banner.sortOrder}, TRUE, ${banner.startsAt}, ${banner.endsAt})
      ON CONFLICT (id) DO NOTHING
    `;
  }
  await sqlClient`SELECT setval(pg_get_serial_sequence('banners','id'), (SELECT COALESCE(MAX(id),1) FROM banners))`;
  console.log(`[seed-catalog] banners: ${DEMO_BANNERS.length}`);

  /* ---- CMS পেজ ---- */
  for (const page of DEMO_CMS_PAGES) {
    await sqlClient`
      INSERT INTO cms_pages (slug, title, body, meta_title, meta_description, show_in_footer, sort_order, is_demo)
      VALUES (${page.slug}, ${page.title}, ${page.body}, ${page.metaTitle}, ${page.metaDescription},
              ${page.showInFooter}, ${page.sortOrder}, TRUE)
      ON CONFLICT (slug) DO NOTHING
    `;
  }
  console.log(`[seed-catalog] cms pages: ${DEMO_CMS_PAGES.length}`);
}

/* সরাসরি চালালে (npm run db:seed-catalog) */
const isDirectRun = process.argv[1] && process.argv[1].endsWith("seed-catalog.mjs");
if (isDirectRun) {
  await seedCatalog(sql);
  console.log("[seed-catalog] done.");
}
