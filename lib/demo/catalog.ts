/**
 * লোকাল ডেমো ক্যাটালগ — DATABASE_URL না থাকলে পাবলিক ক্যাটালগ এই ডেটা দিয়ে
 * রেন্ডার হয় (ডিজাইন রিভিউয়ের জন্য)। এগুলোই `npm run db:seed` চালানো হলে
 * ডেটাবেজে `isDemo = true` ফ্ল্যাগসহ সিড হয়, যাতে এক কমান্ডে মুছে ফেলা যায়।
 *
 * কপি-রাইটিং নিয়ম (স্পেক ২.৬): কোনো মিথ্যা/অতিরঞ্জিত দাবি নেই —
 * "রোগমুক্তির নিশ্চয়তা", "শতভাগ নিরাময়", "ডাক্তারি প্রমাণিত" জাতীয় শব্দ নেই।
 */

import type { Banner, Category, CmsPage, Product } from "../db/schema";
import { DEFAULT_BRAND, MEDICAL_DISCLAIMER } from "../config";

const IMG = (name: string) => `/images/demo/${name}.svg`;

/* -------------------------------------------------------------------------- */
/* ক্যাটাগরি                                                                     */
/* -------------------------------------------------------------------------- */

type CategorySeed = Omit<Category, "createdAt" | "updatedAt">;

const now = new Date("2026-10-18T00:00:00.000Z");

export const DEMO_CATEGORIES: CategorySeed[] = [
  {
    id: 1,
    name: "হামদর্দ ও গ্যাস্ট্রিক",
    slug: "hamdard-gastric",
    description: "গ্যাস্ট্রিক, হজম ও পেটের আরামের জন্য ঐতিহ্যবাহী ইউনানী প্রস্তুতি।",
    coverImage: IMG("c-01"),
    icon: "Pill",
    active: true,
    sortOrder: 1,
    isDemo: true,
  },
  {
    id: 2,
    name: "হারবাল টনিক ও সিরাপ",
    slug: "herbal-tonic-syrup",
    description: "ভেষজ উপাদানে তৈরি টনিক ও সিরাপ — দৈনন্দিন স্বাস্থ্য সহায়ক।",
    coverImage: IMG("c-02"),
    icon: "Leaf",
    active: true,
    sortOrder: 2,
    isDemo: true,
  },
  {
    id: 3,
    name: "চুল ও ত্বক",
    slug: "hair-skin",
    description: "চুল ও ত্বকের যত্নে ভেষজ অয়েল, ফেস প্যাক ও হেয়ার মাস্ক।",
    coverImage: IMG("c-03"),
    icon: "Sparkles",
    active: true,
    sortOrder: 3,
    isDemo: true,
  },
  {
    id: 4,
    name: "শিশু স্বাস্থ্য",
    slug: "baby-health",
    description: "শিশুদের হজম ও রোগপ্রতিরোধের জন্য মৃদু ভেষজ প্রস্তুতি।",
    coverImage: IMG("c-04"),
    icon: "Baby",
    active: true,
    sortOrder: 4,
    isDemo: true,
  },
  {
    id: 5,
    name: "ইমিউনিটি ও ভিটামিন",
    slug: "immunity-vitamin",
    description: "রোগপ্রতিরোধ ক্ষমতা ও পুষ্টির জন্য ভিটামিন ও মিনারেল সাপ্লিমেন্ট।",
    coverImage: IMG("c-05"),
    icon: "ShieldCheck",
    active: true,
    sortOrder: 5,
    isDemo: true,
  },
];

/* -------------------------------------------------------------------------- */
/* পণ্য                                                                         */
/* -------------------------------------------------------------------------- */

type ProductSeed = Omit<Product, "createdAt" | "updatedAt">;

type ProductInput = Partial<ProductSeed> &
  Pick<ProductSeed, "id" | "name" | "slug" | "categoryId" | "price">;

function mkProduct(input: ProductInput): ProductSeed {
  return {
    sku: `US-${String(input.id).padStart(3, "0")}`,
    shortDescription: "",
    description: "",
    compareAtPrice: null,
    costPrice: Math.round(input.price * 0.62),
    stock: 40,
    lowStockThreshold: 5,
    trackStock: true,
    status: "active",
    featured: false,
    isDemo: true,
    sortOrder: input.id ?? 0,
    viewCount: 0,
    orderCount: 0,
    ingredients: "",
    dosage: "",
    warnings: "",
    storage: "",
    packageSize: "",
    manufacturer: "সিফা হারবাল ল্যাব, ঢাকা",
    requiresPrescription: false,
    expiryNote: "প্রস্তুতির তারিখ থেকে ২৪ মাস",
    metaTitle: "",
    metaDescription: "",
    ...input,
  };
}

export const DEMO_PRODUCTS: ProductSeed[] = [
  mkProduct({
    id: 1,
    name: "গ্যাস্ট্রিক সিরাপ ২০০ মিলি",
    slug: "gastric-syrup-200ml",
    categoryId: 1,
    price: 185,
    compareAtPrice: 220,
    stock: 60,
    featured: true,
    shortDescription: "পেটের গ্যাস, বুকজ্বালা ও হজমের অস্বস্তিতে ঐতিহ্যবাহী ভেষজ সিরাপ।",
    description:
      "গ্যাস্ট্রিক সিরাপ ইউনানী ঐতিহ্যের নির্বাচিত ভেষজ উপাদানে প্রস্তুত। পেটের গ্যাস, বুকজ্বালা ও ভারী ভাবের অস্বস্তিতে দৈনন্দিন সহায়ক হিসেবে ব্যবহৃত হয়। নিয়মিত সেবনের আগে চিকিৎসকের পরামর্শ নিন।",
    ingredients: "সৌফ, আতরাইল, পুদিনা সত্ত্ব, মৌলার ছাল, মধু ভিত্তি",
    dosage: "প্রাপ্তবয়স্ক: খাবারের পর ১০ মিলি, দিনে ২ বার। শিশু: চিকিৎসকের পরামর্শ অনুযায়ী।",
    warnings: "ডায়াবেটিস থাকলে মধুর পরিমাণ সম্পর্কে চিকিৎসকের পরামর্শ নিন। গর্ভাবস্থায় সেবনের আগে পরামর্শ আবশ্যক।",
    storage: "সূর্যালোক থেকে দূরে, শুকনো ও ঠান্ডা জায়গায় রাখুন। খোলার পর ৩০ দিনের মধ্যে ব্যবহার করুন।",
    packageSize: "২০০ মিলি",
  }),
  mkProduct({
    id: 2,
    name: "হজম চূর্ণ ১০০ গ্রাম",
    slug: "digestive-churn-100g",
    categoryId: 1,
    price: 160,
    compareAtPrice: null,
    stock: 45,
    shortDescription: "ভারী খাবারের পর পেটের ভারী ভাব ও গ্যাসে ভেষজ চূর্ণ।",
    description:
      "নির্বাচিত মসলা ও ভেষজের সূক্ষ্ম চূর্ণ। ভারী খাবারের পর পেটের ভারী ভাব ও গ্যাসের অস্বস্তিতে ঐতিহ্যবাহীভাবে ব্যবহৃত হয়।",
    ingredients: "জিরা, কালো জিরা, সৈন্ধব লবণ, হরীতকী, আমলকী",
    dosage: "খাবারের পর আধা চা-চামচ, হালকা গরম পানির সাথে।",
    warnings: "উচ্চ রক্তচাপ থাকলে সৈন্ধব লবণের পরিমাণ সম্পর্কে চিকিৎসকের পরামর্শ নিন।",
    storage: "বাতাসরোধক পাত্রে, শুকনো জায়গায় রাখুন।",
    packageSize: "১০০ গ্রাম",
  }),
  mkProduct({
    id: 3,
    name: "কুলস সিরাপ ৪৫০ মিলি",
    slug: "cooling-syrup-450ml",
    categoryId: 1,
    price: 240,
    compareAtPrice: 280,
    stock: 38,
    shortDescription: "গরমে শরীর ঠান্ডা রাখতে ও পিপাসায় ভেষজ কুলস সিরাপ।",
    description:
      "গরমের দিনে শরীর ঠান্ডা রাখতে ও পানিশূন্যতার অস্বস্তিতে ঐতিহ্যবাহী কুলস সিরাপ। পানির সাথে মিশিয়ে পান করুন।",
    ingredients: "বেল, আমড়া, গোলাপ জল, খসখস, চিনি ভিত্তি",
    dosage: "১ গ্লাস পানিতে ২০ মিলি মিশিয়ে, দিনে ২-৩ বার।",
    warnings: "ডায়াবেটিস রোগী সেবনের আগে চিকিৎসকের পরামর্শ নিন।",
    storage: "ঠান্ডা ও শুকনো জায়গায় রাখুন। খোলার পর ফ্রিজে রাখা ভালো।",
    packageSize: "৪৫০ মিলি",
  }),
  mkProduct({
    id: 4,
    name: "লিভার টনিক ২০০ মিলি",
    slug: "liver-tonic-200ml",
    categoryId: 2,
    price: 320,
    compareAtPrice: 380,
    stock: 30,
    featured: true,
    shortDescription: "যকৃতের স্বাস্থ্য ও ক্ষুধা বাড়ানোর সহায়ক ভেষজ টনিক।",
    description:
      "লিভার টনিক ভেষজ নির্যাসে প্রস্তুত, যকৃতের স্বাভাবিক কার্যক্রম ও ক্ষুধা ফেরানোর সহায়ক হিসেবে ঐতিহ্যবাহীভাবে ব্যবহৃত। দীর্ঘমেয়াদি সেবনে চিকিৎসকের পরামর্শ নিন।",
    ingredients: "ভূমি আমলকী, বাসক পাতা, চিরতা, কালমেঘ, মধু ভিত্তি",
    dosage: "প্রাপ্তবয়স্ক: খাবারের আগে ১০ মিলি, দিনে ২ বার।",
    warnings: "যকৃতের গুরুতর সমস্যা থাকলে অবশ্যই চিকিৎসকের তত্ত্বাবধানে নিন।",
    storage: "সূর্যালোক থেকে দূরে রাখুন।",
    packageSize: "২০০ মিলি",
  }),
  mkProduct({
    id: 5,
    name: "রক্তশূন্যতা টনিক ২০০ মিলি",
    slug: "blood-tonic-200ml",
    categoryId: 2,
    price: 290,
    compareAtPrice: null,
    stock: 26,
    shortDescription: "আয়রন ও ভেষজ নির্যাসসহ দুর্বলতা ও রক্তশূন্যতায় সহায়ক টনিক।",
    description:
      "আয়রনসমৃদ্ধ ভেষজ নির্যাস ও ভিটামিন সি সম্বলিত টনিক। দুর্বলতা ও রক্তশূন্যতার পুষ্টি সহায়ক হিসেবে ব্যবহৃত। রক্তশূন্যতা নিশ্চিত হতে রক্ত পরীক্ষা ও চিকিৎসকের পরামর্শ নিন।",
    ingredients: "আয়রন গ্লুকোনেট, আমলকী নির্যাস, বিট নির্যাস, ভিটামিন সি",
    dosage: "প্রাপ্তবয়স্ক: খাবারের পর ১০ মিলি, দিনে ১ বার।",
    warnings: "শিশুদের নাগালের বাইরে রাখুন। অতিরিক্ত সেবন করবেন না।",
    storage: "শুকনো ও ঠান্ডা জায়গায় রাখুন।",
    packageSize: "২০০ মিলি",
  }),
  mkProduct({
    id: 6,
    name: "জয়েন্ট কেয়ার মালিশ অয়েল ১০০ মিলি",
    slug: "joint-care-massage-oil-100ml",
    categoryId: 2,
    price: 270,
    compareAtPrice: 310,
    stock: 34,
    shortDescription: "ব্যস্ত পেশী ও জয়েন্টের আরামের জন্য উষ্ণ ভেষজ মালিশ অয়েল।",
    description:
      "পরিশ্রমের পর পেশী ও জয়েন্টের আরামের জন্য ঐতিহ্যবাহী উষ্ণ মালিশ অয়েল। ত্বকে মৃদু মালিশ করে ব্যবহার করুন; সেবনের জন্য নয়।",
    ingredients: "গন্ধপ্রসারিণী অয়েল, সর্ষে অয়েল, নিয়াওলি, ইউক্যালিপটাস",
    dosage: "প্রয়োজনমতো দিনে ১-২ বার মালিশ করুন।",
    warnings: "খোলা ক্ষতে ব্যবহার করবেন না। চোখে লাগলে পানি দিয়ে ধুয়ে ফেলুন।",
    storage: "বাতাসরোধক বোতলে, ঠান্ডা জায়গায় রাখুন।",
    packageSize: "১০০ মিলি",
  }),
  mkProduct({
    id: 7,
    name: "চুল পড়া কন্ট্রোল হারবাল অয়েল ১০ মিলি",
    slug: "hair-fall-control-oil-100ml",
    categoryId: 3,
    price: 250,
    compareAtPrice: 300,
    stock: 52,
    featured: true,
    shortDescription: "গোড়া মজবুত করতে ও চুলের যত্নে ভেষজ হেয়ার অয়েল।",
    description:
      "নারকেল ও তিল তেলের ভিত্তিতে আমলকী, ভৃঙ্গরাজ ও মেথির নির্যাস। সপ্তাহে ২-৩ বার গোড়ায় মালিশ করে ১-২ ঘণ্টা রেখে ধুয়ে ফেলুন।",
    ingredients: "নারকেল তেল, তিল তেল, আমলকী, ভৃঙ্গরাজ, মেথি নির্যাস",
    dosage: "সপ্তাহে ২-৩ বার মালিশ; ১-২ ঘণ্টা রেখে শ্যাম্পু দিয়ে ধুয়ে ফেলুন।",
    warnings: "ত্বকে অ্যালার্জি থাকলে আগে কবজিতে পরীক্ষা করে নিন।",
    storage: "সূর্যালোক থেকে দূরে রাখুন।",
    packageSize: "১০ মিলি",
  }),
  mkProduct({
    id: 8,
    name: "ত্বক উজ্জ্বলতা ফেস প্যাক ৫০ গ্রাম",
    slug: "skin-glow-face-pack-50g",
    categoryId: 3,
    price: 220,
    compareAtPrice: null,
    stock: 41,
    shortDescription: "মুলতানি মাটি ও ভেষজ গুঁড়ায় ত্বকের যত্নে ফেস প্যাক।",
    description:
      "মুলতানি মাটি, চন্দন ও হলুদের সূক্ষ্ম গুঁড়ার মিশ্রণ। ত্বক পরিষ্কার ও সতেজ রাখতে সপ্তাহে ১-২ বার ব্যবহার করুন।",
    ingredients: "মুলতানি মাটি, চন্দন গুঁড়া, হলুদ, কমলার খোসা গুঁড়া",
    dosage: "গোলাপ জল বা দইয়ের সাথে মিশিয়ে ১০-১৫ মিনিট রেখে ধুয়ে ফেলুন।",
    warnings: "সংবেদনশীল ত্বকে আগে পরীক্ষা করে নিন। চোখের চারপাশে এড়িয়ে চলুন।",
    storage: "শুকনো পাত্রে রাখুন।",
    packageSize: "৫০ গ্রাম",
  }),
  mkProduct({
    id: 9,
    name: "হারবাল হেয়ার মাস্ক ১০০ গ্রাম",
    slug: "herbal-hair-mask-100g",
    categoryId: 3,
    price: 310,
    compareAtPrice: 350,
    stock: 22,
    shortDescription: "রুক্ষ চুলে আর্দ্রতা ও কোমলতার জন্য ভেষজ হেয়ার মাস্ক।",
    description:
      "শিকাকাই, রিঠা ও আমলকীর গুঁড়াসহ ময়েশ্চারাইজিং হেয়ার মাস্ক। শ্যাম্পুর পর ৫-১০ মিনিট রেখে ধুয়ে ফেলুন।",
    ingredients: "শিকাকাই, রিঠা, আমলকী, অ্যালোভেরা গুঁড়া",
    dosage: "সপ্তাহে ১ বার, ৫-১০ মিনিট রেখে ধুয়ে ফেলুন।",
    warnings: "চোখে লাগলে পানি দিয়ে ধুয়ে ফেলুন।",
    storage: "শুকনো ও ঠান্ডা জায়গায় রাখুন।",
    packageSize: "১০ গ্রাম",
  }),
  mkProduct({
    id: 10,
    name: "শিশু ইমিউনিটি ড্রপ ৩০ মিলি",
    slug: "baby-immunity-drops-30ml",
    categoryId: 4,
    price: 310,
    compareAtPrice: null,
    stock: 18,
    shortDescription: "শিশুদের রোগপ্রতিরোধের সহায়ক মৃদু ভেষজ ড্রপ।",
    description:
      "শিশুদের জন্য মৃদু মাত্রায় প্রস্তুত ভেষজ ড্রপ। ব্যবহারের আগে শিশুর বয়স ও ওজন অনুযায়ী চিকিৎসকের পরামর্শ নেওয়া আবশ্যক।",
    ingredients: "তুলসী নির্যাস, মধু (অল্প), ভিটামিন সি",
    dosage: "শিশুর বয়স অনুযায়ী চিকিৎসকের নির্দেশিত মাত্রা।",
    warnings: "১ বছরের কম বয়সী শিশুকে মধুযুক্ত পণ্য দেবেন না। চিকিৎসকের পরামর্শ ছাড়া ব্যবহার করবেন না।",
    storage: "ফ্রিজে নয়; ঠান্ডা ও শুকনো জায়গায় রাখুন।",
    packageSize: "৩০ মিলি",
    requiresPrescription: true,
  }),
  mkProduct({
    id: 11,
    name: "শিশু হজম সিরাপ ১০০ মিলি",
    slug: "baby-digestive-syrup-100ml",
    categoryId: 4,
    price: 190,
    compareAtPrice: 220,
    stock: 27,
    shortDescription: "শিশুদের পেটের অস্বস্তি ও হজমে সহায়ক মৃদু সিরাপ।",
    description:
      "শিশুদের পেটের গ্যাস ও হজমের অস্বস্তিতে মৃদু ভেষজ সিরাপ। মাত্রা নির্ধারণে শিশু বিশেষজ্ঞের পরামর্শ নিন।",
    ingredients: "সৌফ নির্যাস, পুদিনা, মধু ভিত্তি",
    dosage: "শিশু বিশেষজ্ঞের নির্দেশিত মাত্রা অনুসরণ করুন।",
    warnings: "১ বছরের কম বয়সী শিশুকে দেবেন না।",
    storage: "ঠান্ডা ও শুকনো জায়গায় রাখুন।",
    packageSize: "১০০ মিলি",
  }),
  mkProduct({
    id: 12,
    name: "শিশু মালিশ অয়েল ৫০ মিলি",
    slug: "baby-massage-oil-50ml",
    categoryId: 4,
    price: 180,
    compareAtPrice: null,
    stock: 33,
    shortDescription: "শিশুর কোমল ত্বকের জন্য মৃদু ভেষজ মালিশ অয়েল।",
    description:
      "শিশুর কোমল ত্বকের উপযোগী মৃদু তিল ও বাদাম তেলের মিশ্রণ। গোসলের আগে মৃদু মালিশ করুন।",
    ingredients: "তিল তেল, বাদাম তেল, ল্যাভেন্ডার নির্যাস (অল্প)",
    dosage: "প্রয়োজনমতো মৃদু মালিশ।",
    warnings: "চোখ ও ক্ষতস্থানে এড়িয়ে চলুন। অ্যালার্জি দেখা দিলে ব্যবহার বন্ধ করুন।",
    storage: "ঠান্ডা ও শুকনো জায়গায় রাখুন।",
    packageSize: "৫০ মিলি",
  }),
  mkProduct({
    id: 13,
    name: "ভিটামিন সি চুয়িং ট্যাবলেট ৩০টি",
    slug: "vitamin-c-chewable-30",
    categoryId: 5,
    price: 150,
    compareAtPrice: 180,
    stock: 70,
    featured: true,
    shortDescription: "দৈনন্দিন পুষ্টির সহায়ক ভিটামিন সি চুয়িং ট্যাবলেট।",
    description:
      "প্রতি ট্যাবলেটে ৫০০ মিগ্রা ভিটামিন সি। দৈনন্দিন পুষ্টির ঘাটতি পূরণে সহায়ক সাপ্লিমেন্ট; ওষুধের বিকল্প নয়।",
    ingredients: "অ্যাসকরবিক অ্যাসিড, কমলা নির্যাস, সোর্বিটল",
    dosage: "প্রাপ্তবয়স্ক: দিনে ১ ট্যাবলেট, খাবারের পর চিবিয়ে।",
    warnings: "কিডনিতে পাথর থাকলে চিকিৎসকের পরামর্শ নিন।",
    storage: "শুকনো জায়গায়, ঢাকনা বন্ধ রেখে রাখুন।",
    packageSize: "৩০ ট্যাবলেট",
  }),
  mkProduct({
    id: 14,
    name: "মাল্টি ভিটামিন ক্যাপসুল ৬০টি",
    slug: "multivitamin-capsule-60",
    categoryId: 5,
    price: 420,
    compareAtPrice: 480,
    stock: 48,
    shortDescription: "১২টি ভিটামিন ও ৮টি মিনারেলসহ দৈনন্দিন মাল্টিভিটামিন।",
    description:
      "ব্যস্ত জীবনে পুষ্টির ঘাটতি পূরণে দৈনন্দিন মাল্টিভিটামিন ও মিনারেল সাপ্লিমেন্ট। সুষম খাদ্যের বিকল্প নয়।",
    ingredients: "ভিটামিন এ, বি-কমপ্লেক্স, সি, ডি, ই, জিংক, আয়রন, ম্যাগনেসিয়াম",
    dosage: "প্রাপ্তবয়স্ক: দিনে ১ ক্যাপসুল, খাবারের পর।",
    warnings: "অন্য সাপ্লিমেন্ট নেওয়া থাকলে মোট মাত্রা হিসাব করে নিন।",
    storage: "ঠান্ডা ও শুকনো জায়গায় রাখুন।",
    packageSize: "৬০ ক্যাপসুল",
  }),
  mkProduct({
    id: 15,
    name: "ইমিউনিটি বুস্টার সিরাপ ২০০ মিলি",
    slug: "immunity-booster-syrup-200ml",
    categoryId: 5,
    price: 350,
    compareAtPrice: 400,
    stock: 4,
    featured: true,
    shortDescription: "তুলসী, আদা ও মধু ভিত্তিক রোগপ্রতিরোধ সহায়ক সিরাপ।",
    description:
      "তুলসী, আদা, গোলমরিচ ও মধুর ঐতিহ্যবাহী মিশ্রণ। মৌসুমি পরিবর্তনের সময় দৈনন্দিন সহায়ক হিসেবে ব্যবহৃত।",
    ingredients: "তুলসী নির্যাস, আদা নির্যাস, গোলমরিচ, মধু ভিত্তি",
    dosage: "প্রাপ্তবয়স্ক: দিনে ১ বার ১০ মিলি।",
    warnings: "ডায়াবেটিস থাকলে চিকিৎসকের পরামর্শ নিন।",
    storage: "ঠান্ডা ও শুকনো জায়গায় রাখুন।",
    packageSize: "২০০ মিলি",
  }),
];

/* -------------------------------------------------------------------------- */
/* পণ্যের ছবি                                                                     */
/* -------------------------------------------------------------------------- */

export function demoProductImages(productId: number, productName: string) {
  const primary = IMG(`p-${String(productId).padStart(2, "0")}`);
  return [
    { productId, url: primary, alt: productName, sortOrder: 0, isPrimary: true },
  ];
}

/* -------------------------------------------------------------------------- */
/* ব্যানার                                                                       */
/* -------------------------------------------------------------------------- */

type BannerSeed = Omit<Banner, "createdAt" | "updatedAt">;

export const DEMO_BANNERS: BannerSeed[] = [
  {
    id: 1,
    title: "সারা দেশে ক্যাশ অন ডেলিভারি",
    imageUrl: IMG("banner-01"),
    linkUrl: "/products",
    altText: "ভেষজ পণ্যের সমাহার — সারা দেশে ক্যাশ অন ডেলিভারি",
    active: true,
    sortOrder: 1,
    isDemo: true,
    startsAt: null,
    endsAt: null,
  },
  {
    id: 2,
    title: "ঐতিহ্যবাহী ইউনানী প্রস্তুতি",
    imageUrl: IMG("banner-02"),
    linkUrl: "/products?category=herbal-tonic-syrup",
    altText: "হারবাল টনিক ও সিরাপ সংগ্রহ",
    active: true,
    sortOrder: 2,
    isDemo: true,
    startsAt: null,
    endsAt: null,
  },
  {
    id: 3,
    title: "মৌসুমি ইমিউনিটি সংগ্রহ",
    imageUrl: IMG("banner-03"),
    linkUrl: "/products?category=immunity-vitamin",
    altText: "ইমিউনিটি ও ভিটামিন সংগ্রহ",
    active: true,
    sortOrder: 3,
    isDemo: true,
    startsAt: null,
    endsAt: null,
  },
];

/* -------------------------------------------------------------------------- */
/* CMS পেজের ডিফল্ট বাংলা কনটেন্ট                                                  */
/* -------------------------------------------------------------------------- */

type CmsSeed = Omit<CmsPage, "updatedAt">;

export const DEMO_CMS_PAGES: CmsSeed[] = [
  {
    slug: "about",
    title: "আমাদের সম্পর্কে",
    body: `## ইউনানী সিফা

${DEFAULT_BRAND.tagline}।

ইউনানী সিফা একটি অনলাইন হারবাল ও ইউনানী পণ্যের দোকান। আমরা নির্বাচিত ভেষজ উপাদানে প্রস্তুত টনিক, সিরাপ, চূর্ণ, ক্যাপসুল ও মালিশ পণ্য সরাসরি আপনার দরজায় পৌঁছে দিই।

### আমাদের নীতি
- প্রতিটি পণ্যের উপাদান, মাত্রা ও সতর্কতা স্পষ্টভাবে লেখা থাকবে।
- কোনো মিথ্যা বা অতিরঞ্জিত দাবি করা হবে না।
- চিকিৎসকের পরামর্শের বিকল্প হিসেবে কোনো পণ্য বিক্রি করা হবে না।

### যোগাযোগ
ফোন ও WhatsApp: ${DEFAULT_BRAND.phone} (সকাল ১০টা – রাত ৮টা)
ইমেইল: ${DEFAULT_BRAND.email}`,
    metaTitle: "আমাদের সম্পর্কে — ইউনানী সিফা",
    metaDescription: DEFAULT_BRAND.tagline,
    showInFooter: true,
    sortOrder: 1,
    isDemo: true,
  },
  {
    slug: "contact",
    title: "যোগাযোগ",
    body: `## যোগাযোগ করুন

আমরা প্রতিদিন সকাল ১০টা থেকে রাত ৮টা পর্যন্ত আপনার সেবায় আছি।

- **ফোন ও কল:** ${DEFAULT_BRAND.phoneInternational}
- **WhatsApp:** ${DEFAULT_BRAND.phone}
- **ইমেইল:** ${DEFAULT_BRAND.email}
- **সার্ভিস এরিয়া:** ${DEFAULT_BRAND.serviceArea}
- **ঠিকানা:** ${DEFAULT_BRAND.address}

অর্ডার সংক্রান্ত যেকোনো প্রশ্নে অর্ডার নম্বরটি সঙ্গে রাখবেন।`,
    metaTitle: "যোগাযোগ — ইউনানী সিফা",
    metaDescription: "ফোন, WhatsApp ও ইমেইলে ইউনানী সিফার সাথে যোগাযোগ করুন।",
    showInFooter: true,
    sortOrder: 2,
    isDemo: true,
  },
  {
    slug: "shipping",
    title: "ডেলিভারি ও রিটার্ন নীতি",
    body: `## ডেলিভারি চার্জ
- ঢাকার ভিতরে: ৳৭০
- ঢাকার বাইরে: ৳১৩০
- ক্যাশ অন ডেলিভারি (COD) সুবিধা আছে।

## ডেলিভারি সময়
- ঢাকার ভিতরে: সাধারণত ১-২ কার্যদিবস
- ঢাকার বাইরে: সাধারণত ২- কার্যদিবস

## রিটার্ন নীতি
পণ্য হাতে পাওয়ার পর প্যাকেট খোলার আগে পণ্য যাচাই করে নিন। ভুল পণ্য বা ক্ষতিগ্রস্ত পণ্য পেলে ২৪ ঘণ্টার মধ্যে জানান — আমরা বদলে দেব বা ফেরত দেব। খোলা বা ব্যবহৃত ওষুধ ফেরতযোগ্য নয়।

**রিটার্ন ঠিকানা:** ${DEFAULT_BRAND.returnAddress}`,
    metaTitle: "ডেলিভারি ও রিটার্ন নীতি — ইউনানী সিফা",
    metaDescription: "ডেলিভারি চার্জ, সময় ও রিটার্ন নীতি।",
    showInFooter: true,
    sortOrder: 3,
    isDemo: true,
  },
  {
    slug: "terms",
    title: "শর্তাবলি",
    body: `## শর্তাবলি

১. এই সাইট থেকে অর্ডার করার অর্থ আপনি এই শর্তাবলিতে সম্মত।
২. সব দাম বাংলাদেশি টাকায় (৳) এবং সার্ভারে হিসাব করা হয়।
৩. পণ্যের স্টক সীমিত; স্টক শেষ হলে অর্ডার বাতিল হতে পারে এবংadvance ফেরতযোগ্য।
৪. ওষুধ সেবনের আগে চিকিৎসকের পরামর্শ নিন — ${MEDICAL_DISCLAIMER}
৫. ভুয়া বা বিভ্রান্তিকর তথ্য দিয়ে অর্ডার করলে অর্ডার বাতিল করা হবে।
৬. সাইটের কনটেন্ট ও ডিজাইনের স্বত্ব ইউনানী সিফার।`,
    metaTitle: "শর্তাবলি — ইউনানী সিফা",
    metaDescription: "ইউনানী সিফার শর্তাবলি।",
    showInFooter: true,
    sortOrder: 4,
    isDemo: true,
  },
  {
    slug: "privacy",
    title: "প্রাইভেসি নীতি",
    body: `## প্রাইভেসি নীতি

আমরা আপনার নাম, মোবাইল নম্বর, ঠিকানা ও অর্ডারের তথ্য শুধু অর্ডার প্রসেসিং ও ডেলিভারির জন্য সংরক্ষণ করি।

- আপনার তথ্য তৃতীয় পক্ষের কাছে বিক্রি করা হয় না।
- IP ঠিকানা হ্যাশ আকারে সংরক্ষিত হয় — ফ্রড প্রতিরোধের জন্য।
- আপনি চাইলে আপনার তথ্য মুছে ফেলার অনুরোধ করতে পারেন: ${DEFAULT_BRAND.email}

কুকি ব্যবহার হয় সেশন ও কার্টের জন্য।`,
    metaTitle: "প্রাইভেসি নীতি — ইউনানী সিফা",
    metaDescription: "আপনার তথ্য কীভাবে ব্যবহার হয়।",
    showInFooter: true,
    sortOrder: 5,
    isDemo: true,
  },
  {
    slug: "faq",
    title: "সাধারণ জিজ্ঞাসা",
    body: `## সাধারণ জিজ্ঞাসা

**অর্ডার কীভাবে করব?**
পছন্দের পণ্য কার্টে যোগ করে চেকআউটে নাম, মোবাইল ও ঠিকানা দিন। ক্যাশ অন ডেলিভারি সুবিধা আছে।

**ডেলিভারি চার্জ কত?**
ঢাকার ভিতরে ৳৭০, ঢাকার বাইরে ৳১৩০।

**পণ্য আসল কিনা?**
আমরা নির্বাচিত ও লেবেলযুক্ত পণ্য সরবরাহ করি। প্রতিটি পণ্যের পাত্রে উপাদান ও মেয়াদ উল্লেখ থাকে।

**ওষুধ কি চিকিৎসকের পরামর্শ ছাড়া নেওয়া যাবে?**
না। ${MEDICAL_DISCLAIMER}

**অর্ডার বাতিল করা যাবে?**
ডেলিভারির আগে ফোন করে বাতিল করা যায়: ${DEFAULT_BRAND.phone}।`,
    metaTitle: "সাধারণ জিজ্ঞাসা — ইউনানী সিফা",
    metaDescription: "অর্ডার, ডেলিভারি ও পণ্য সম্পর্কে সাধারণ প্রশ্নের উত্তর।",
    showInFooter: true,
    sortOrder: 6,
    isDemo: true,
  },
];

export const DEMO_SEED_DATE = now;
