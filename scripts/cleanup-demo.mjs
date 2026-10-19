/**
 * ডেমো ডেটা মুছে ফেলে — is_demo = true রোগুলো (ক্যাটাগরি, প্রোডাক্ট, ব্যানার,
 * CMS পেজ, ল্যান্ডিং পেজ)। অর্ডার/কাস্টমার ডেটা অক্ষুণ্ণ থাকে।
 *
 *   npm run cleanup:demo          → শুধু কী হবে দেখায়
 *   npm run cleanup:demo -- --yes → সত্যিই মুছে ফেলে
 */

import { neon } from "@neondatabase/serverless";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("[cleanup-demo] DATABASE_URL সেট করা নেই।");
  process.exit(1);
}

const sql = neon(url);
const confirmed = process.argv.includes("--yes");

const steps = [
  {
    label: "product_images (of demo products)",
    count: () => sql`SELECT COUNT(*)::int AS n FROM product_images WHERE product_id IN (SELECT id FROM products WHERE is_demo)`,
    remove: () => sql`DELETE FROM product_images WHERE product_id IN (SELECT id FROM products WHERE is_demo) RETURNING id`,
  },
  {
    label: "banners",
    count: () => sql`SELECT COUNT(*)::int AS n FROM banners WHERE is_demo`,
    remove: () => sql`DELETE FROM banners WHERE is_demo RETURNING id`,
  },
  {
    label: "products",
    count: () => sql`SELECT COUNT(*)::int AS n FROM products WHERE is_demo`,
    remove: () => sql`DELETE FROM products WHERE is_demo RETURNING id`,
  },
  {
    label: "categories",
    count: () => sql`SELECT COUNT(*)::int AS n FROM categories WHERE is_demo`,
    remove: () => sql`DELETE FROM categories WHERE is_demo RETURNING id`,
  },
  {
    label: "cms_pages",
    count: () => sql`SELECT COUNT(*)::int AS n FROM cms_pages WHERE is_demo`,
    remove: () => sql`DELETE FROM cms_pages WHERE is_demo RETURNING slug`,
  },
  {
    label: "landing_pages",
    count: () => sql`SELECT COUNT(*)::int AS n FROM landing_pages WHERE is_demo`,
    remove: () => sql`DELETE FROM landing_pages WHERE is_demo RETURNING id`,
  },
];

if (!confirmed) {
  console.log("[cleanup-demo] dry run — যা মুছবে:");
  for (const step of steps) {
    const rows = await step.count();
    console.log(`  ${step.label}: ${rows[0]?.n ?? 0} row(s)`);
  }
  console.log("[cleanup-demo] নিশ্চিত করতে চালান: npm run cleanup:demo -- --yes");
  process.exit(0);
}

for (const step of steps) {
  const deleted = await step.remove();
  console.log(`[cleanup-demo] ${step.label}: deleted ${deleted.length}`);
}

console.log("[cleanup-demo] done — অর্ডার ও কাস্টমার ডেটা অক্ষুণ্ণ।");
