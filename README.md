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
- ডেমো ডেটা মুছতে: `npm run cleanup:demo` (আগে dry-run দেখায়; `--yes` দিলে মুছে ফেলে। আসল অর্ডার/কাস্টমার অছোঁয়া থাকে)।

### প্রয়োজনীয় env (বিস্তারিত `.env.example`-এ)

| ভেরিয়েবল | কাজ | না দিলে কী হয় |
| --- | --- | --- |
| `DATABASE_URL` / `DIRECT_URL` | Neon pooled / direct সংযোগ | রাইট বন্ধ, অ্যাডমিনে Pending নোট |
| `AUTH_SECRET` | JWT সাইনিং (৩২+ অক্ষর) | লগিন কাজ করে না |
| `IP_HASH_SECRET` | ফ্রড সিগন্যালে IP হ্যাশ | ফ্রড স্কোরের IP অংশ বন্ধ |
| `CRON_SECRET` | `/api/cron/*` প্রটেকশন | ক্রন ৪০১ ফেরত দেয় |
| `NEXT_PUBLIC_SITE_URL` | canonical/OG/ওয়েবহুক লিংক | লোকাল URL ধরা হয় |
| `R2_*` (৫টি) | মিডিয়া আপলোড (Cloudflare R2) | আপলোড বন্ধ; "URL পেস্ট করুন" চালু |
| `TELEGRAM_*`, `RESEND_*`, `META_*` | নোটিফিকেশন/ট্র্যাকিং ডিফল্ট | অ্যাডমিন ভল্টে সেভ করলেও চলে; না থাকলে Pending |

**সিক্রেট কখনো ব্রাউজারে যায় না**: ইন্টিগ্রেশন ক্রেডেনশিয়াল AES-256-GCM-এ এনক্রিপ্ট হয়ে ডেটাবেজে থাকে (`credential_secrets`); API শুধু "set / not set" ফেরত দেয়।

## স্ক্রিপ্ট

| কমান্ড | কাজ |
| --- | --- |
| `npm run dev` / `build` / `start` | ডেভ সার্ভার / প্রোডাকশন বিল্ড / সার্ভ |
| `npm run qa` | typecheck + lint + test + build (একসাথে) |
| `npm test` | ৫৮টি ইউনিট টেস্ট (pricing, coupons, fraud, status, validation, mystery, utils, emoji-scan) |
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
3. মাইগ্রেশন বিল্ডের আগে অটো চলে — `vercel.json`-এ `buildCommand: npm run db:migrate && next build`। এছাড়া `main`-এ push হলে GitHub Actions (`.github/workflows/db-migrate.yml`)ও মাইগ্রেশন চালায় — দুটো পথই idempotent (`__migrations` টেবিল), তাই ডুপ্লিকেট লাগে না। Actions থেকে ম্যানুয়ালি dispatch করে seed/admin-bootstrap-ও চালানো যায়। Preview ডিপ্লয়ে Neon preview branch-এর `DATABASE_URL` দিলে মাইগ্রেশন সেখানেও প্রয়োগ হয়।
4. দৈনিক ক্রন (`vercel.json`): `0 3 * * *` UTC = সকাল ৯টা ঢাকা — ফেইল হওয়া নোটিফিকেশন রিট্রাই + ট্র্যাকিং কিউ ফ্লাশ।
5. কাস্টম ডোমেইন যুক্ত করার পর Admin → Settings → Branding-এ `siteUrl` আপডেট করুন।
6. `.env` কখনো কমিট করবেন না — শুধু `.env.example` কমিট থাকে।

## লঞ্চ ফ্লো (অনারের জন্য ১৫ মিনিট)

1. `/admin`-এ লগিন → Dashboard-এ Pending কার্ডগুলো দেখুন (কোন ইন্টিগ্রেশন বাকি)।
2. Products → নতুন পণ্য (দাম/স্টক/ছবি; ড্রাফট → Active)।
3. Landing Pages → New → টেমপলেট থেকে সেকশন সাজান → অর্ডার ফর্ম যোগ → Published।
4. Coupons → প্রয়োজনে নতুন কুপন (landing-scoped করা যায়)।
5. Integrations → Meta Pixel ID + CAPI token দিলে ViewContent/Lead/AddToCart/InitiateCheckout/Purchase ইভেন্ট চলবে (purchase trigger: confirmed/delivered বেছে নেওয়া যায়)।
6. ফেসবুক অ্যাডে `/offer/[slug]` লিংক দিন। অর্ডার পড়লে Dashboard-এ ফ্রড-স্ট্যাটাসসহ দেখা যাবে; কুরিয়ার ডিসপ্যাচ ম্যানুয়ালি মার্ক করা হয় (Pending — কারণ দেখানো থাকে)।

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
tests/unit/     ৫৮টি ইউনিট টেস্ট (node --test)
public/brand/   লোগো/মার্ক/আইকন/OG (SVG+PNG)
```

## QA

```bash
npm run qa   # typecheck + lint + test + build — সব ক্লিন হতে হবে
```

মূল ইনভ্যারিয়েন্ট (টেস্টে যাচাই করা): অর্ডার নম্বর `US+YYMMDD+"-"+৭`; প্রিভিউ QA কেস ৳১,২০০ + WELCOME10 (১০%, ক্যাপ ৳১০০) + ঢাকার বাইরে ৳১৩০ = **৳১,২৩০**; ছাড়ে পণ্য কখনো ফ্রি হয় না (ফ্লোর ৳১); ফ্রড ≥৬০ review, ≥৩০ watch; ফোন নরমালাইজেশন `^01[3-9]\d{8}$`; স্ট্যাটাস মেশিনে delivered-এর পরে আর কোনো ট্রানজিশন নেই।
