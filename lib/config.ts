/**
 * ব্র্যান্ড ও কমার্স কনফিগ — এক জায়গায় (স্পেক সেকশন ৪)
 *
 * গুরুত্বপূর্ণ: এখানকার মানগুলো হার্ডকোড নয় — এগুলো শুধু **প্রথম সিডের ডিফল্ট**।
 * রানটাইমে `site_settings` টেবিল (key/value) থেকে পড়া হয়, অ্যাডমিন → Settings
 * থেকে এডিট করা যায়। ডেটাবেজ কনফিগার না করা থাকলে এই ডিফল্টই ব্যবহৃত হয়
 * (ডিজাইন রিভিউয়ের জন্য)।
 */

export type BrandSettings = {
  /** ব্র্যান্ডের নাম */
  name: string;
  /** ট্যাগলাইন (অ্যাডমিন থেকে এডিটেবল) */
  tagline: string;
  /** সংক্ষিপ্ত বিবরণ — ফুটার, SEO description, ইমেইল সিগনেচার */
  description: string;
  /** লোকাল ফরম্যাট ফোন, যেমন 01310678729 */
  phone: string;
  /** আন্তর্জাতিক ফরম্যাট, যেমন +8801310678729 */
  phoneInternational: string;
  /** WhatsApp-এর জন্য দেশ কোডসহ নম্বর (প্লাস ছাড়া), যেমন 8801310678729 */
  whatsapp: string;
  /** সাপোর্ট ইমেইল */
  email: string;
  /** ঠিকানা (ফুটার ও ইনভয়েসে) */
  address: string;
  /** রিটার্ন ঠিকানা */
  returnAddress: string;
  /** সার্ভিস এরিয়া */
  serviceArea: string;
  /** সাপোর্ট সময় */
  supportHours: string;
  /** ফেসবুক পেজ URL (খালি থাকলে লিংক দেখানো হবে না) */
  facebook: string;
  /** পাবলিক সাইট URL */
  siteUrl: string;
  /** প্রাইমারি কালার (থিম টোকেনের ভেতরেই) */
  primaryColor: string;
  /** লোগো URL (খালি = বিল্ট-ইন টেম্পোরারি লোগো) */
  logoUrl: string;
  /** ডার্ক হেডারের জন্য লোগো ভ্যারিয়েন্ট (খালি = বিল্ট-ইন) */
  logoLightUrl: string;
  /** ড্রাগ লাইসেন্স নম্বর — না থাকলে "Pending" দেখাবে, ভুয়া নম্বর কখনো নয় */
  drugLicense: string;
};

export type CommerceSettings = {
  /** ঢাকার ভিতরে ডেলিভারি চার্জ (পূর্ণসংখ্যা টাকা) */
  deliveryInsideDhaka: number;
  /** ঢাকার বাইরে ডেলিভারি চার্জ */
  deliveryOutsideDhaka: number;
  /** ফ্রি-ডেলিভারি থ্রেশহোল্ড; 0 = বন্ধ */
  freeDeliveryThreshold: number;
  /** ক্যাশ অন ডেলিভারি চালু কি না */
  codEnabled: boolean;
  /** কারেন্সি কোড */
  currency: string;
  /** কারেন্সি সিম্বল */
  currencySymbol: string;
  /** সর্বোচ্চ কোয়ান্টিটি (এক লাইনে) */
  maxQuantity: number;
  /** ডিফল্ট লো-স্টক থ্রেশহোল্ড */
  lowStockThreshold: number;
  /** অ্যাডভান্স পেমেন্ট (০ = সম্পূর্ণ COD) */
  defaultAdvance: number;
  /** প্রফিট ক্যালকুলেশন: কুরিয়ার বিল (ভিতরে / বাইরে) */
  courierCostInside: number;
  courierCostOutside: number;
  /** প্রতি অর্ডারে প্যাকেজিং খরচ */
  packagingCost: number;
  /** প্রতি অর্ডারে অন্যান্য খরচ */
  perOrderExtras: number;
  /** মাসিক ফিক্সড খরচ */
  monthlyFixedCost: number;
  /** ন্যূনতম অর্ডার সাবটোটাল (০ = প্রযোজ্য নয়) */
  minSubtotal: number;
};

export type SiteSettingsShape = {
  brand: BrandSettings;
  commerce: CommerceSettings;
};

/** কোডে থাকা ডিফল্ট — শুধু প্রথম সিডের জন্য */
export const DEFAULT_BRAND: BrandSettings = {
  name: "ইউনানী সিফা",
  tagline: "প্রাকৃতিক ও ইউনানী চিকিৎসার বিশ্বস্ত ঠিকানা",
  description:
    "ইউনানী সিফা — ইউনানী ও ভেষজ ওষুধ, টনিক, চূর্ণ, ক্যাপসুল ও হেলথ প্রোডাক্টের বিশ্বস্ত অনলাইন ঠিকানা। সারা বাংলাদেশে ক্যাশ অন ডেলিভারি।",
  phone: "01310678729",
  phoneInternational: "+8801310678729",
  whatsapp: "8801310678729",
  email: "support@unanisifa.com",
  address: "ঢাকা, বাংলাদেশ",
  returnAddress: "ঢাকা, বাংলাদেশ",
  serviceArea: "সারা বাংলাদেশ",
  supportHours: "প্রতিদিন সকাল ১০:০০ – রাত ৮:০০",
  facebook: "",
  siteUrl: "https://unanisifa.com",
  primaryColor: "#0B5D4A",
  logoUrl: "",
  logoLightUrl: "",
  drugLicense: "",
};

export const DEFAULT_COMMERCE: CommerceSettings = {
  deliveryInsideDhaka: 70,
  deliveryOutsideDhaka: 130,
  freeDeliveryThreshold: 0,
  codEnabled: true,
  currency: "BDT",
  currencySymbol: "৳",
  maxQuantity: 20,
  lowStockThreshold: 5,
  defaultAdvance: 0,
  courierCostInside: 70,
  courierCostOutside: 130,
  packagingCost: 0,
  perOrderExtras: 0,
  monthlyFixedCost: 0,
  minSubtotal: 0,
};

export const DEFAULT_SETTINGS: SiteSettingsShape = {
  brand: DEFAULT_BRAND,
  commerce: DEFAULT_COMMERCE,
};

/** ডেলিভারি এরিয়া */
export const DELIVERY_AREAS = ["inside_dhaka", "outside_dhaka"] as const;
export type DeliveryArea = (typeof DELIVERY_AREAS)[number];

export const DELIVERY_AREA_LABEL: Record<DeliveryArea, string> = {
  inside_dhaka: "ঢাকার ভিতরে",
  outside_dhaka: "ঢাকার বাইরে",
};

/** সাইটের ভাষা ও টাইমজোন */
export const SITE_LOCALE = "bn-BD";
export const SITE_TIMEZONE = "Asia/Dhaka";

/** অ্যাডমিন প্যানেলের ভাষা (ইংরেজি) */
export const ADMIN_LOCALE = "en-US";

/** সেশন কুকির নাম */
export const ADMIN_SESSION_COOKIE = "np_admin_session";
export const CUSTOMER_SESSION_COOKIE = "np_customer_session";

/** অ্যাডমিন সেশন ১২ ঘণ্টা, কাস্টমার সেশন ৭ দিন */
export const ADMIN_SESSION_TTL_SECONDS = 12 * 60 * 60;
export const CUSTOMER_SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;

/** বিল্ট-ইন (টেম্পোরারি) লোগো — অ্যাডমিন থেকে বদলানো যাবে */
export const BUILT_IN_LOGO = "/brand/logo.svg";
export const BUILT_IN_LOGO_LIGHT = "/brand/logo-light.svg";
export const BUILT_IN_MARK = "/brand/mark.svg";

/**
 * কাস্টমার-ফেসিং কপিতে ব্যবহৃত বাধ্যতামূলক ডিসক্লেইমার।
 * ওষুধ ব্যবসার কারণে প্রতিটি PDP ও চেকআউটে দেখাতে হবে।
 */
export const MEDICAL_DISCLAIMER =
  "এটি কোনো চিকিৎসকের পরামর্শের বিকল্প নয়। যেকোনো ওষুধ সেবনের আগে চিকিৎসকের পরামর্শ নিন।";

export const MEDICAL_DISCLAIMER_SHORT =
  "চিকিৎসকের পরামর্শ ছাড়া সেবন করবেন না।";

/** নিষিদ্ধ দাবি — মার্কেটিং কপি ও রিভিউ মডারেশনে ব্যবহৃত হয় */
export const PROHIBITED_CLAIMS = [
  "রোগমুক্তির নিশ্চয়তা",
  "শতভাগ নিরাময়",
  "১০০% নিরাময়",
  "গ্যারান্টিড নিরাময়",
  "ডাক্তারি প্রমাণিত",
  "চিকিৎসক প্রমাণিত",
  "নিশ্চিত আরোগ্য",
];
