-- Safajin + Safa Ambari পণ্য নিশ্চিতকরণ — /safajin পেজের জন্য।
-- live DB-তে পণ্যটি না থাকলে বা draft/archived হলে পেজে “পেজটি খুঁজে পাওয়া যায়নি” দেখায়।
-- এই মাইগ্রেশনটি নিরাপদ ও পুনরায় চালানো যায় (idempotent): একাধিকবার চালালেও ডুপ্লিকেট তৈরি হয় না।

-- ক্যাটাগরি নিশ্চিত (herbal-tonic-syrup) — প্রোডাক্টের FK নির্ভরতা
INSERT INTO categories (name, slug, description, cover_image, icon, active, sort_order, is_demo)
VALUES (
  'হারবাল টনিক ও সিরাপ',
  'herbal-tonic-syrup',
  'ভেষজ উপাদানে তৈরি টনিক ও সিরাপ — দৈনন্দিন স্বাস্থ্য সহায়ক।',
  '/images/demo/c-02.svg',
  'Leaf',
  true,
  2,
  true
)
ON CONFLICT (slug) DO NOTHING;
--> statement-breakpoint
-- পণ্য নিশ্চিত — slug দিয়ে ইউনিক, নতুন হলে auto-increment id
INSERT INTO products (
  name, slug, category_id, sku,
  short_description, description,
  price, compare_at_price, cost_price,
  stock, low_stock_threshold, track_stock,
  status, featured, is_demo, sort_order,
  ingredients, dosage, warnings, storage, package_size, manufacturer,
  requires_prescription, expiry_note, meta_title, meta_description
)
SELECT
  'Safajin + Safa Ambari',
  'safajin-safa-ambari',
  (SELECT id FROM categories WHERE slug = 'herbal-tonic-syrup' LIMIT 1),
  'US-016',
  'সাফাজিন সিরাপ ও সাফা আম্বারি ক্যাপসুলের একটি সেট।',
  'সাফাজিন সিরাপ ও সাফা আম্বারি ক্যাপসুলের সমন্বিত প্যাক। উপাদান, ব্যবহারবিধি ও সতর্কতা প্যাকেটের লেবেল দেখে নিশ্চিত করুন।',
  1000, NULL, 620,
  100, 5, false,
  'active',
  true, false, 16,
  'প্যাকেটের লেবেল দেখুন।',
  'প্যাকেটের লেবেল এবং যোগ্য চিকিৎসকের পরামর্শ অনুসরণ করুন।',
  'যৌন সক্ষমতা বা দৈহিক পরিবর্তনের ফল নিশ্চিত নয়। ব্যবহারের আগে উপাদান যাচাই করুন এবং চিকিৎসকের পরামর্শ নিন, বিশেষত চলমান রোগ বা ওষুধ থাকলে।',
  'প্যাকেটের নির্দেশনা অনুযায়ী সংরক্ষণ করুন।',
  '১ সেট',
  'প্যাকেটের লেবেল দেখুন',
  false,
  'প্রস্তুতির তারিখ থেকে ২৪ মাস',
  'Safajin + Safa Ambari — ইউনানী সিফা',
  'সাফাজিন সিরাপ ও সাফা আম্বারি ক্যাপসুল — ৳১,০০০। ক্যাশ অন ডেলিভারি।'
WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug = 'safajin-safa-ambari');
--> statement-breakpoint
-- বিদ্যমান পণ্য থাকলেও (demo/active/draft/archived যাই হোক) সঠিক মান বসাও — পুনরায় চালানো যায়
UPDATE products
SET
  name = 'Safajin + Safa Ambari',
  price = 1000,
  compare_at_price = NULL,
  cost_price = COALESCE(cost_price, 620),
  stock = 100,
  low_stock_threshold = 5,
  track_stock = false,
  status = 'active',
  featured = true,
  is_demo = false,
  sort_order = 16,
  short_description = 'সাফাজিন সিরাপ ও সাফা আম্বারি ক্যাপসুলের একটি সেট।',
  description = 'সাফাজিন সিরাপ ও সাফা আম্বারি ক্যাপসুলের সমন্বিত প্যাক। উপাদান, ব্যবহারবিধি ও সতর্কতা প্যাকেটের লেবেল দেখে নিশ্চিত করুন।',
  ingredients = 'প্যাকেটের লেবেল দেখুন।',
  dosage = 'প্যাকেটের লেবেল এবং যোগ্য চিকিৎসকের পরামর্শ অনুসরণ করুন।',
  warnings = 'যৌন সক্ষমতা বা দৈহিক পরিবর্তনের ফল নিশ্চিত নয়। ব্যবহারের আগে উপাদান যাচাই করুন এবং চিকিৎসকের পরামর্শ নিন, বিশেষত চলমান রোগ বা ওষুধ থাকলে।',
  storage = 'প্যাকেটের নির্দেশনা অনুযায়ী সংরক্ষণ করুন।',
  package_size = '১ সেট',
  manufacturer = 'প্যাকেটের লেবেল দেখুন',
  requires_prescription = false,
  expiry_note = 'প্রস্তুতির তারিখ থেকে ২৪ মাস',
  meta_title = 'Safajin + Safa Ambari — ইউনানী সিফা',
  meta_description = 'সাফাজিন সিরাপ ও সাফা আম্বারি ক্যাপসুল — ৳১,০০০। ক্যাশ অন ডেলিভারি।',
  category_id = COALESCE((SELECT id FROM categories WHERE slug = 'herbal-tonic-syrup' LIMIT 1), category_id),
  updated_at = now()
WHERE slug = 'safajin-safa-ambari';
--> statement-breakpoint
-- পণ্যের ছবি নিশ্চিত — /safajin পেজে ও ল্যান্ডিং প্রিভিউতে ব্যবহৃত URL
INSERT INTO product_images (product_id, url, alt, sort_order, is_primary)
SELECT
  p.id,
  'https://prakritirshifa.com/wp-content/uploads/2026/04/ChatGPT-Image-Apr-20-2026-01_35_29-AM-683x1024.png',
  'Safajin + Safa Ambari',
  0,
  true
FROM products p
WHERE p.slug = 'safajin-safa-ambari'
  AND NOT EXISTS (
    SELECT 1 FROM product_images pi
    WHERE pi.product_id = p.id
      AND pi.url = 'https://prakritirshifa.com/wp-content/uploads/2026/04/ChatGPT-Image-Apr-20-2026-01_35_29-AM-683x1024.png'
  );
--> statement-breakpoint
-- সিকোয়েন্স ফিক্স — ভবিষ্যতে id সংঘর্ষ এড়াতে
SELECT setval(pg_get_serial_sequence('products', 'id'), (SELECT COALESCE(MAX(id), 1) FROM products));
--> statement-breakpoint
SELECT setval(pg_get_serial_sequence('categories', 'id'), (SELECT COALESCE(MAX(id), 1) FROM categories));
--> statement-breakpoint
SELECT setval(pg_get_serial_sequence('product_images', 'id'), (SELECT COALESCE(MAX(id), 1) FROM product_images));
