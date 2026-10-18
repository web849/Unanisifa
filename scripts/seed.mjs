/**
 * পূর্ণ সিড — সেটিংস, পেমেন্ট মেথড, কুরিয়ার, নোটিফিকেশন, ট্র্যাকিং,
 * কুপন (WELCOME10/FREEDC) + ক্যাটালগ (seed-catalog)।
 * আইডেমপোটেন্ট: ON CONFLICT DO NOTHING — অ্যাডমিনের পরবর্তী এডিট মুছে যায় না।
 *
 *   npm run db:migrate && npm run db:seed
 */

import { register } from "node:module";

register("../tests/resolver-hooks.mjs", import.meta.url);

const { neon } = await import("@neondatabase/serverless");
const { DEFAULT_BRAND, DEFAULT_COMMERCE } = await import("../lib/config.ts");
const { seedCatalog } = await import("./seed-catalog.mjs");

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("[seed] DATABASE_URL সেট করা নেই — Neon কানেকশন স্ট্রিং দিন।");
  process.exit(1);
}
const sql = neon(url);

/* ---- সাইট সেটিংস ---- */
await sql`
  INSERT INTO site_settings (key, value) VALUES ('brand', ${JSON.stringify(DEFAULT_BRAND)}::jsonb)
  ON CONFLICT (key) DO NOTHING
`;
await sql`
  INSERT INTO site_settings (key, value) VALUES ('commerce', ${JSON.stringify(DEFAULT_COMMERCE)}::jsonb)
  ON CONFLICT (key) DO NOTHING
`;
await sql`
  INSERT INTO site_settings (key, value) VALUES ('popup', ${JSON.stringify({ mysteryEnabled: true })}::jsonb)
  ON CONFLICT (key) DO NOTHING
`;
console.log("[seed] site settings: brand, commerce, popup");

/* ---- পেমেন্ট মেথড (bkash/nagad সৎভাবে Pending) ---- */
await sql`
  INSERT INTO payment_methods (key, name, name_bn, adapter, enabled, is_default, pending_reason, sort_order) VALUES
    ('cod', 'Cash on Delivery', 'ক্যাশ অন ডেলিভারি', 'manual', TRUE, TRUE, NULL, 1),
    ('bkash', 'bKash', 'বিকাশ', 'manual', FALSE, FALSE,
     'Official bKash tokenized checkout API docs/credentials not provided — stays Pending until available', 2),
    ('nagad', 'Nagad', 'নগদ', 'manual', FALSE, FALSE,
     'Official Nagad merchant API docs/credentials not provided — stays Pending until available', 3)
  ON CONFLICT (key) DO NOTHING
`;
console.log("[seed] payment methods: cod (live), bkash/nagad (pending)");

/* ---- কুরিয়ার (ম্যানুয়াল হ্যান্ডওভার ডিফল্ট) ---- */
await sql`
  INSERT INTO courier_providers (adapter, name, enabled, is_default) VALUES
    ('manual', 'Manual handover', TRUE, TRUE),
    ('pathao', 'Pathao Courier', FALSE, FALSE),
    ('steadfast', 'Steadfast Courier', FALSE, FALSE)
  ON CONFLICT (adapter) DO NOTHING
`;
console.log("[seed] courier providers: manual (default), pathao/steadfast (pending credentials)");

/* ---- নোটিফিকেশন ও ট্র্যাকিং সেটিংস ---- */
const allEvents = ["order_created", "order_confirmed", "order_shipped", "order_delivered", "order_cancelled", "fraud_review"];
await sql`
  INSERT INTO notification_settings (channel, enabled, events) VALUES
    ('telegram', FALSE, ${JSON.stringify(allEvents)}::jsonb),
    ('email', FALSE, ${JSON.stringify(allEvents)}::jsonb)
  ON CONFLICT (channel) DO NOTHING
`;
await sql`
  INSERT INTO tracking_settings (platform, enabled, purchase_trigger) VALUES
    ('meta', FALSE, 'confirmed')
  ON CONFLICT (platform) DO NOTHING
`;
console.log("[seed] notification + tracking settings (disabled until credentials set)");

/* ---- কুপন: মিস্ট্রি অফার টেমপ্লেট ---- */
await sql`
  INSERT INTO coupons (code, title, type, value, max_discount, min_subtotal, per_phone_limit, active, show_on_checkout, description) VALUES
    ('WELCOME10', 'Welcome 10% (mystery offer)', 'percent', 10, 100, 699, 1, TRUE, TRUE,
     'Mystery offer coupon — 10% off, max 100 taka, min order 699 taka, once per phone'),
    ('FREEDC', 'Free delivery (mystery offer)', 'free_delivery', 100, 100, 699, 1, TRUE, TRUE,
     'Mystery offer coupon — delivery fee waived up to 100 taka, min order 699 taka, once per phone')
  ON CONFLICT (code) DO NOTHING
`;
console.log("[seed] coupons: WELCOME10, FREEDC");

/* ---- ক্যাটালগ ---- */
await seedCatalog(sql);

console.log("[seed] done. Next: npm run db:bootstrap-admin (owner account).");
