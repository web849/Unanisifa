# ইউনানী সিফা (Unani Sifa)

বাংলাদেশের কাস্টমারদের জন্য ইউনানী ও ভেষজ পণ্যের (টনিক, সিরাপ, চূর্ণ, ক্যাপসুল, মালিশ তেল) মোবাইল-ফার্স্ট ই-কমার্স প্ল্যাটফর্ম। তিনটি অংশ:

1. **স্টোরফ্রন্ট** (বাংলা) — হোম, `/products`, `/products/[slug]`, কার্ট, চেকআউট, থ্যাংক-ইউ, অর্ডার ট্র্যাকিং, অ্যাকাউন্ট, CMS পেজ (about/contact/shipping/terms/privacy/faq)।
2. **ল্যান্ডিং পেজ বিল্ডার + ফানেল** — `/offer/[slug]`, ইনলাইন অর্ডার ফর্ম, ২২ ধরনের সেকশন, ৪টি থিম (emerald/sage/gold/midnight), মিস্ট্রি অফার পপআপ। ফেসবুক ক্যাম্পেইনের জন্য অ্যাডমিন থেকে ১৫ মিনিটে ল্যান্ডিং পেজ + কুপন + পণ্য লঞ্চ করা যায়।
3. **অ্যাডমিন ড্যাশবোর্ড** (ইংরেজি) — `/admin`: অর্ডার (স্ট্যাটাস মেশিন + প্রিন্ট ইনভয়েস), ফ্রড রিভিউ, পণ্য/ক্যাটাগরি/ব্যানার/কুপন, পপআপ, রিভিউ মডারেশন, লিডস (+UTF-8 CSV এক্সপোর্ট), রিপোর্ট (বিক্রয়/প্রফিট/ফানেল/কুপন/লো-স্টক), কুরিয়ার, পেমেন্ট, ইন্টিগ্রেশন (Telegram/Resend/Meta), সেটিংস, অডিট লগ।

ব্র্যান্ড তথ্য, ক্লায়েন্ট Q&A ও ধরে নেওয়া মানগুলো আছে [`BRAND_INPUT.md`](./BRAND_INPUT.md)-এ।

## টেক স্ট্যাক

- Next.js 15 (App Router) + React 19 + TypeScript (strict)
- প্লেইন CSS কাস্টম প্রপার্টি (`app/globals.css` — "Emerald Apothecary" ডিজাইন সিস্টেম; কোনো UI কিট/Tailwind নেই)
- Neon Postgres (serverless) + Drizzle ORM — SQL মাইগ্রেশন কমিট করা আছে `drizzle/`-তে
- bcryptjs (পাসওয়ার্ড) + jose (JWT কুকি: `np_admin_session` ১২ ঘণ্টা, `np_customer_session` ৭ দিন)
- zod (ভ্যালিডেশন), node:crypto (AES-256-GCM সিক্রেট ভল্ট, IP/ফোন হ্যাশ), lucide-react (আইকন)
- `node --test` (ইউনিট টেস্ট), ESLint 9
- ফন্ট: Hind Siliguri (বাংলা), Playfair Display (ডিসপ্লে), JetBrains Mono (সংখ্যা)

## দ্রুত শুরু (লোকাল)

```bash
npm install
cp .env.example .env.local   # মান বসান (নিচে দেখুন)
npm run dev                  # http://localhost:3000
```

ডেটাবেজ ছাড়াও পাবলিক ক্যাটালগ ডেমো ডেটা দিয়ে রেন্ডার হয়, কিন্তু অর্ডার/অ্যাডমিন লগিন/রাইট কাজ করে না — অ্যাডমিনে সৎভাবে "Pending — database not configured" দেখায়।

### ডেটাবেজসহ সেটআপ (Neon)

```bash
npm run db:migrate           # drizzle/*.sql প্রয়োগ (__migrations টেবিলে রেকর্ড হয়)
npm run db:seed              # সেটিংস, পেমেন্ট/কুরিয়ার, কুপন (WELCOME10, FREEDC) + ডেমো ক্যাটালগ
npm run db:bootstrap-admin   # owner অ্যাকাউন্ট (ADMIN_EMAIL/ADMIN_PASSWORD env বা আর্গুমেন্ট)
```

- অ্যাডমিন লগিন: `/admin` → bootstrap করা ইমেইল/পাসওয়ার্ড। পাসওয়ার্ড ভুলে গেলে `ADMIN_EMAIL` ও নতুন `ADMIN_PASSWORD` Actions secrets-এ দিয়ে `db-migrate` workflow-তে **Reset existing admin password** চালান; এতে ওই অ্যাকাউন্টের সেশনগুলো বাতিল হবে।
- ডেটাবেজ কনফিগার করা কিন্তু ক্যাটালগ খালি হলে Admin → Products / Landing Pages-এ **Import demo products** বোতাম দিয়ে এক ক্লিকে ১৫টি ডেমো পণ্য (+ক্যাটাগরি, ছবি, ব্যানার, CMS পেজ) বসানো যায় — একই কাজ `npm run db:seed-catalog`, API `POST /api/admin/demo-catalog`।
- ডেমো ডেটা মুছতে: `npm run cleanup:demo` (আগে dry-run দেখায়; `--yes` দিলে মুছে ফেলে। আসল অর্ডার/কাস্টমার অছোঁয়া থাকে)।

### প্রয়োজনীয় env (বিস্তারিত `.env.example`-এ)

| ভেরিয়েবল | কাজ | না দিলে কী হয় |
| --- | --- | --- |
| `DATABASE_URL` / `DIRECT_URL` | Neon pooled / direct সংযোগ | রাইট বন্ধ, অ্যাডমিনে Pending নোট |
| `AUTH_SECRET` | JWT সাইনিং (৩২+ অক্ষর) | লগিন কাজ করে না |
| `IP_HASH_SECRET` | ফ্রড সিগন্যালে IP হ্যাশ | ফ্রড স্কোরের IP অংশ বন্ধ |
| `CRON_SECRET` | `/api/cron/*` প্রটেকশন | ক্রন ৪০১ ফেরত দেয় |
| `NEXT_PUBLIC_SITE_URL` | canonical/OG/ওয়েবহুক লিংক | লোকাল URL ধরা হয় |
| `ALLOW_PREVIEW_DB_MIGRATIONS` | Vercel **Preview** বিল্ডে মাইগ্রেশন চালু | Preview-তে মাইগ্রেশন হয় না (প্রোডাকশন সুরক্ষিত) |
| `R2_*` (৫টি) | মিডিয়া আপলোড (Cloudflare R2, ঐচ্ছিক) | আপলোড ডেটাবেজে সেভ হয়; সরাসরি আপলোড সব ফর্মেই চলে |
| `TELEGRAM_*`, `RESEND_*`, `META_*` | নোটিফিকেশন/ট্র্যাকিং ডিফল্ট | অ্যাডমিন ভল্টে সেভ করলেও চলে; না থাকলে Pending |

**সিক্রেট কখনো ব্রাউজারে যায় না**: ইন্টিগ্রেশন ক্রেডেনশিয়াল AES-256-GCM-এ এনক্রিপ্ট হয়ে ডেটাবেজে থাকে (`credential_secrets`); API শুধু "set / not set" ফেরত দেয়।

## স্ক্রিপ্ট

| কমান্ড | কাজ |
| --- | --- |
| `npm run dev` / `build` / `start` | ডেভ সার্ভার / প্রোডাকশন বিল্ড / সার্ভ |
| `npm run qa` | typecheck + lint + test + build (একসাথে) |
| `npm test` | ১৩০টি ইউনিট টেস্ট (pricing, coupons, fraud, status, validation, mystery, utils, media-snippet, landing-html-tokens, emoji-scan) |
| `npm run db:generate` | স্কিমা বদলালে drizzle-kit দিয়ে নতুন মাইগ্রেশন |
| `npm run db:migrate` | কমিট করা SQL মাইগ্রেশন প্রয়োগ |
| `npm run db:seed` / `db:seed-catalog` | সেটিংস+কুপন / ডেমো পণ্য-ক্যাটাগরি-ব্যানার-CMS |
| `npm run db:bootstrap-admin` | প্রথম owner অ্যাকাউন্ট (আগে থাকলে বদলায় না) |
| `npm run db:reset-admin-password` | বিদ্যমান অ্যাডমিনের পাসওয়ার্ড রিসেট; `ADMIN_EMAIL` + `ADMIN_PASSWORD` লাগে, সেশন বাতিল হয় |
| `npm run cleanup:demo` | ডেমো ডেটা রিমুভ (dry-run ডিফল্ট) |
| `npm run assets:demo` | ডেমো পণ্য/ব্যানার SVG অ্যাসেট রিজেনারেট |

## ডিপ্লয় (Vercel + Neon + GitHub)

1. রিপো GitHub-এ প্রাইভেট; `main` = প্রোডাকশন। ফিচার ব্রাঞ্চ → PR → merge হলে Vercel অটো-ডিপ্লয়।
2. Vercel প্রজেক্টে env বসান (Production + Preview): অন্তত `DATABASE_URL`, `DIRECT_URL`, `AUTH_SECRET`, `IP_HASH_SECRET`, `CRON_SECRET`, `NEXT_PUBLIC_SITE_URL`।
3. মাইগ্রেশন প্রোডাকশন বিল্ডের আগে অটো চলে — `vercel.json` → `node scripts/vercel-build.mjs`, যা `db:migrate` সফল হলেই `next build` করে। দুটি বিল্ড একসাথে চললেও `__migration_lock` টেবিলের লক একবারে একটিকেই ঢোকে, আর প্রতিটি SQL ফাইল ট্রানজেকশনে প্রয়োগ হয় (ব্যর্থ হলে সম্পূর্ণ রোলব্যাক, আধা-স্কিমা নয়)।
4. Preview ডিপ্লয় ডিফল্টে মাইগ্রেশন চালায় না — প্রিভিউ থেকে প্রোডাকশন স্কিমা বদলাবে না। Preview-তে আলাদা Neon ব্রাঞ্চ ব্যবহার করলে Vercel → Preview env-এ `ALLOW_PREVIEW_DB_MIGRATIONS=1` দিন।
5. `db-migrate` GitHub Actions এখন শুধু ম্যানুয়াল (`workflow_dispatch`) — seed, admin bootstrap, password reset-এর জন্য। আলাদা CI workflow (`.github/workflows/ci.yml`) প্রতিটি PR ও `main` push-এ typecheck + lint + test + build চালায়; Vercel বিল্ডও লিন্ট ও টাইপচেক করে, তাই ভাঙা কোড ডিপ্লয় হয় না।
6. দৈনিক ক্রন (`vercel.json`): `0 3 * * *` UTC = সকাল ৯টা ঢাকা — ফেইল হওয়া নোটিফিকেশন রিট্রাই + ট্র্যাকিং কিউ ফ্লাশ।
7. কাস্টম ডোমেইন যুক্ত করার পর Admin → Settings → Branding-এ `siteUrl` আপডেট করুন।
8. `.env` কখনো কমিট করবেন না — শুধু `.env.example` কমিট থাকে।

## লঞ্চ ফ্লো (অনারের জন্য ১৫ মিনিট)

1. `/admin`-এ লগিন → Dashboard-এ Pending কার্ডগুলো দেখুন (কোন ইন্টিগ্রেশন বাকি)।
2. Products → নতুন পণ্য (দাম/স্টক/ছবি; ড্রাফট → Active)।
3. Landing Pages → New → টেমপলেট থেকে সেকশন সাজান → অর্ডার ফর্ম যোগ → Published।
4. Coupons → প্রয়োজনে নতুন কুপন (landing-scoped করা যায়)।
5. Integrations → Meta Pixel ID + CAPI token দিলে ViewContent/Lead/AddToCart/InitiateCheckout/Purchase ইভেন্ট চলবে (purchase trigger: confirmed/delivered বেছে নেওয়া যায়)।
6. ফেসবুক অ্যাডে `/offer/[slug]` লিংক দিন। অর্ডার পড়লে Dashboard-এ ফ্রড-স্ট্যাটাসসহ দেখা যাবে।
7. Couriers → Steadfast বা Pathao-র API কী বসিয়ে কানেক্ট করুন (নিচের সেকশন দেখুন)।

## ল্যান্ডিং পেজ তৈরি ও R2 ছবি দিয়ে HTML সাজানো

**ল্যান্ডিং পেজ তৈরি না হলে (আগে যেসব কারণে আটকাত — সব ঠিক করা হয়েছে):**

- **নিজের পণ্য তালিকায় না পাওয়া**: নতুন পণ্য ডিফল্টে Draft থাকে; তৈরির ফর্ম আগে শুধু Active পণ্য দেখাত। এখন Draft পণ্যও দেখায়, তবে অর্ডার নেওয়ার আগে পণ্যটি Active করতে হবে।
- **একই নামের slug**: আগে `Slug already used` 409 এররে তৈরি আটকে যেত। এখন নতুন পেজে স্বয়ংক্রিয়ভাবে `-2`, `-3` যোগ হয়ে ইউনিক URL হয়।
- **ডেমো পণ্য বেছে নিলে সার্ভার 500**: ডেমো-আইডি সরাসরি ডেটাবেজে INSERT করতে গিয়ে foreign key এরর হতো, ফ্রন্টএন্ডে দেখাত শুধু "Network error"। এখন সার্ভার আইডি যাচাই করে (slug দিয়ে আসল আইডিতে ম্যাপ করে), না মিললে স্পষ্ট বাংলা কারণ দেখায়।
- **"Creating…" আটকে থাকা**: ডেমো ইমপোর্ট ব্যর্থ হলে বোতাম চিরকাল আটকে থাকত। এখন আসল এরর দেখায় এবং বোতাম আবার সক্রিয় হয়।
- তৈরি/সেভ ব্যর্থ হলে এখন কোন ফিল্ডে সমস্যা তা-সহ বার্তা আসে — শুধু "Invalid landing page data" নয়।

**R2-তে ছবি আপলোড করে লিংক/HTML কোড কপি করা:**

1. Admin → **Storage (R2)**-এ ছবি আপলোড করুন (টেনে এনে ছেড়েও হবে; folder: `media`)। R2 কানেক্ট থাকলে ছবি Cloudflare R2-তে ওঠে, না থাকলে ডেটাবেজে থাকে এবং `/api/media/…` থেকে সার্ভ হয় — লিংক দুই ক্ষেত্রেই কাজ করে।
2. আপলোডের পর প্রতিটি ছবির কার্ডে **"লিংক কপি"** (পূর্ণ URL) ও **"HTML কপি"** (পুরো `<img>` কোড) বোতাম আছে। `R2_PUBLIC_BASE_URL` (বা ভল্টে `r2_public_base_url`) সেট থাকলে লিংক সরাসরি R2/CDN ডোমেইনের হয়; না থাকলে এই সাইটের ঠিকানাসহ পূর্ণ লিংক কপি হয়।
3. Landing Pages → Builder → **HTML Code** ব্লকে HTML কোড পেস্ট করে inline style দিয়ে নিজের মতো সাজান। HTML ব্লকের ভেতরেই **"ছবি যোগ করুন (R2/Media)"** প্যানেল আছে — সেখান থেকে ছবি আপলোড করলে কার্সরের জায়গায় সরাসরি `<img>` বসে যায়, আগের আপলোড করা ছবি থেকেও বসানো/লিংক কপি করা যায়।
4. HTML স্যানিটাইজার script/iframe/form/event-handler বাদ দেয়, কিন্তু `<img>`, লেআউট ট্যাগ ও inline CSS পুরোপুরি অনুমোদিত — তাই কপি করা `<img>` কোড নিরাপদে কাজ করে।

মিডিয়া তালিকার API: `GET /api/admin/storage?folder=media&q=নাম&limit=60` (অ্যাডমিন লগইন প্রয়োজন)।

**পণ্য ও চেকআউট কানেক্টেড HTML ফরম্যাট:**

নতুন **HTML Code** ব্লক যোগ করলেই পণ্যের ছবি, নাম, বিবরণ, বর্তমান/আগের দাম, ছাড়, প্যাকেজ, উপাদান, সেবনবিধি, Order ও Checkout বোতামসহ পুরো ফরম্যাট ডিফল্ট হিসেবে আসে। পুরনো ব্লকেও HTML এডিটরের **"পুরো ফরম্যাট বসান"** বোতামে একই ফরম্যাট আনা যায়। ফরম্যাটটি ঠিকভাবে কাজ করতে যা রাখতেই হবে:

1. **Page settings**-এ একটি Main product নির্বাচন (অথবা HTML ব্লকে আলাদা Connected product)।
2. পেজে একটি **Order Form** ব্লক — `{{order_url}}` সেই ফর্মে নিয়ে যায়।
3. নাম/দাম/ছবি হাতে না লিখে টোকেন ব্যবহার: `{{product_name}}`, `{{product_price}}`, `{{product_old_price}}`, `{{product_image}}`, `{{product_description}}`, `{{product_ingredients}}`, `{{product_dosage}}`। পণ্যের তথ্য বদলালে HTML নিজে থেকে আপডেট হয়।
4. বোতামের লিংকে `{{order_url}}` (এই পেজের অর্ডার ফর্ম) ও `{{checkout_url}}` (পণ্য কার্টে যোগ হয়ে Checkout, পেজের কুপনসহ) ব্যবহার। এছাড়া `{{product_url}}`, `{{whatsapp_url}}`, `{{phone_url}}`, `{{coupon_code}}` ও `{{medical_disclaimer}}` টোকেন আছে; পুরো তালিকা এডিটরের **"টোকেন তালিকা"** বোতামে — ক্লিক করলেই টোকেন কার্সরের জায়গায় বসে।

ডাইরেক্ট চেকআউট লিংকের রূপ: `/checkout?buy=<productId>&qty=1&variant=<id>&coupon=<code>` (সবগুলোই ঐচ্ছিক `buy` ছাড়া)। চেকআউট পেজ পণ্যটি একবার কার্টে যোগ করে, তারপর URL থেকে `buy` মুছে দেয় যাতে রিফ্রেশে দ্বিগুণ না হয়; দাম আগের মতোই সার্ভারে যাচাই হয়।

## কুরিয়ার API ও অটোমেশন

অ্যাডমিন **Couriers** পেজ থেকেই সরাসরি কুরিয়ার API কানেক্ট করা যায় — কোনো env বা কোড বদল লাগে না:

| কুরিয়ার | যা লাগবে | কোথায় পাবেন |
|---|---|---|
| **Steadfast** | API Key + Secret Key | portal.packzy.com > Settings > API |
| **Pathao** | Client ID + Client Secret + মার্চেন্ট ইমেইল/পাসওয়ার্ড (+ঐচ্ছিক Store ID) | merchant.pathao.com > Developer API |

- কী বসিয়ে **Save credentials** (AES-256 এনক্রিপ্ট হয়ে ডেটাবেজে থাকে, আর কখনো দেখানো হয় না), তারপর **Test connection** — লাইভ API কল করে যাচাই হয় (Steadfast: ব্যালেন্স, Pathao: store তালিকা)। ঠিক থাকলে **Make default** করুন।
- **অটোমেশন** (ডিফল্ট চালু): অর্ডার **shipped** মার্ক করলেই default কুরিয়ারে অটোমেটিক কনসাইনমেন্ট বুক হয় (COD = অর্ডারের due amount)। অর্ডার পেজের Courier প্যানেল থেকে হাতে বুকিং/"Sync status"-ও করা যায়।
- **স্ট্যাটাস সিঙ্ক**: Sync করলে delivered পার্সেলের অর্ডার অটোমেটিক delivered হয় (পেমেন্ট paid + কাস্টমার নোটিফিকেশনসহ)। cancelled/returned/partial হলে শিপমেন্টে অ্যাটেনশন নোট পড়ে — অর্ডার অটো-ক্যানসেল হয় না (স্টক/COD যাচাই করে নিজে সিদ্ধান্ত নিন)।
- সিঙ্কের উপায়: Couriers পেজে "Sync all statuses" বোতাম, অর্ডার পেজে "Sync status", দৈনিক ক্রনে একবার, আর `GET/POST /api/cron/courier-sync` (`Authorization: Bearer <CRON_SECRET>`) — ঘন ঘন চাইলে Vercel Pro-তে `vercel.json`-এ ৩০ মিনিটের ক্রন যোগ করুন বা বাইরের ফ্রি ক্রন সার্ভিস থেকে এই URL কল করুন।
- API কানেক্ট না করলেও **Manual Handover** মোডে shipped মার্ক করলে হস্তান্তরের রেকর্ড থাকে।

## নীতি ও সীমাবদ্ধতা (সৎভাবে)

- **সার্ভার-অথরিটেটিভ মানি**: ব্রাউজার থেকে শুধু productId + quantity আসে; দাম, ছাড়, ডেলিভারি, মোট — সব সার্ভারে হিসাব হয় (পূর্ণসংখ্যা টাকা, ৳, Asia/Dhaka, বাংলা সংখ্যা)।
- **ভুয়া ফিচার নেই**: ক্রেডেনশিয়াল/লাইসেন্স না থাকলে UI-তে "Pending — কারণ: …" দেখায়; কোনো ভুয়া সাকসেস মেসেজ, "coming soon" বা TODO নেই।
- **চিকিৎসা-দাবি**: কোনো নিশ্চয়তা/শতভাগ নিরাময়ের দাবি নেই; প্রতিটি পণ্য-পেজ ও চেকআউটে বাধ্যতামূলক ডাক্তারের পরামর্শ ডিসক্লেইমার আছে।
- **bKash/Nagad**: অফিসিয়াল API ডকুমেন্ট ও সাইনড ওয়েবহুক কোড না পাওয়া পর্যন্ত Pending (COD চালু আছে)।
- **রিটার্গেটিং/অডিয়েন্স বিল্ডার নেই**: লিডস = তালিকা + UTF-8 CSV এক্সপোর্ট (সর্বোচ্চ ১০,০০০ রো; অ্যাডমিনে সর্বশেষ ২০০)। ফোন-লিস্ট মার্জ/সেগমেন্ট এক্সপোর্ট কোথাও নেই।
- **ইমোজি নেই**: সাইট, কপি, ইমেইল টেমপলেট, ইনভয়েস, অ্যাডমিন, OGP — কোথাও ইমোজি নয়; শুধু Lucide SVG লাইন আইকন (ইউনিট টেস্ট স্ক্যান করে)।
- **অ্যাক্সেসিবিলিটি**: WCAG AA কনট্রাস্ট, কীবোর্ড ন্যাভিগেশন, alt টেক্সট, `prefers-reduced-motion` সম্মান।
- ড্রাগ লাইসেন্স নম্বর এখনো দেওয়া হয়নি — পেলে Admin → Settings → Branding-এ বসালে ফুটারে দেখাবে।

## ফোল্ডার স্ট্রাকচার (সংক্ষেপ)

```
app/            রাউট: (store) storefront, admin/(dashboard)|(auth), api/*, offer/[slug]
components/     store, cart, checkout, landing, admin (ম্যানেজার কম্পোনেন্ট)
lib/            config, utils, db (schema ৩৫ টেবিল), orders (pricing/fraud/status/service),
                coupons, offers, landing, auth (session/rate-limit/audit), admin (guard/reports),
                integrations (secrets/notifications/meta/r2), security, cms, demo
drizzle/        কমিট করা SQL মাইগ্রেশন
scripts/        migrate, seed, seed-catalog, bootstrap-admin, cleanup-demo, brand/demo assets
tests/unit/     ১২৬টি ইউনিট টেস্ট (node --test)
public/brand/   লোগো/মার্ক/আইকন/OG (SVG+PNG)
```

## QA

```bash
npm run qa   # typecheck + lint + test + build — সব ক্লিন হতে হবে
```

মূল ইনভ্যারিয়েন্ট (টেস্টে যাচাই করা): অর্ডার নম্বর `US+YYMMDD+"-"+৭`; প্রিভিউ QA কেস ৳১,২০০ + WELCOME10 (১০%, ক্যাপ ৳১০০) + ঢাকার বাইরে ৳১৩০ = **৳১,২৩০**; ছাড়ে পণ্য কখনো ফ্রি হয় না (ফ্লোর ৳১); ফ্রড ≥৬০ review, ≥৩০ watch; ফোন নরমালাইজেশন `^01[3-9]\d{8}$`; স্ট্যাটাস মেশিনে delivered-এর পরে আর কোনো ট্রানজিশন নেই।
