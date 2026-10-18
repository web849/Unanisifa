/**
 * ল্যান্ডিং সেকশন ক্যাটালগ — ২২টি সেকশন, চার গ্রুপে (স্পেক ৭খ)।
 * ওষুধ-সাইটের জন্য অতিরিক্ত: ingredients (উপাদান), dosage (সেবনবিধি),
 * doctor_advice (ডাক্তারের পরামর্শ) ব্লক।
 */

export type LandingSectionType =
  // Layout & Content
  | "hero"
  | "text"
  | "split"
  | "images"
  | "video"
  // Commerce
  | "products"
  | "order_form"
  | "cta"
  // Engagement
  | "features"
  | "steps"
  | "faq"
  | "testimonials"
  | "reviews"
  | "countdown"
  | "popup"
  // Utility
  | "announcement"
  | "guarantee"
  | "contact"
  | "divider"
  | "spacer"
  // ওষুধ-নির্দিষ্ট
  | "ingredients"
  | "dosage"
  | "doctor_advice";

export type LandingSectionGroup = "layout" | "commerce" | "engagement" | "utility" | "medicine";

export type LandingSection = {
  id: number;
  type: LandingSectionType;
  hidden?: boolean;
  settings: Record<string, unknown>;
  design?: LandingSectionDesign;
};

export type LandingSectionDesign = {
  background?: string;
  textColor?: string;
  ctaColor?: string;
  minHeight?: number;
  paddingY?: number;
  maxWidth?: number;
  align?: "left" | "center" | "right";
  shape?: "none" | "wave" | "arch";
  alt?: boolean;
};

export const SECTION_CATALOG: Array<{
  type: LandingSectionType;
  group: LandingSectionGroup;
  label: string;
  description: string;
}> = [
  { type: "hero", group: "layout", label: "Hero", description: "বড় শিরোনাম + সাব-টেক্সট + CTA" },
  { type: "text", group: "layout", label: "Text", description: "সাধারণ টেক্সট ব্লক" },
  { type: "split", group: "layout", label: "Split", description: "ছবি + টেক্সট দুই কলাম" },
  { type: "images", group: "layout", label: "Images", description: "একাধিক ছবির গ্রিড" },
  { type: "video", group: "layout", label: "Video", description: "এমবেডেড ভিডিও (YouTube)" },
  { type: "products", group: "commerce", label: "Products", description: "পণ্য কার্ড গ্রিড" },
  { type: "order_form", group: "commerce", label: "Order Form", description: "ইনলাইন অর্ডার ফর্ম" },
  { type: "cta", group: "commerce", label: "CTA", description: "কল-টু-অ্যাকশন ব্যানার" },
  { type: "features", group: "engagement", label: "Features", description: "ফিচার/সুবিধা তালিকা" },
  { type: "steps", group: "engagement", label: "Steps", description: "ধাপে ধাপে নির্দেশনা" },
  { type: "faq", group: "engagement", label: "FAQ", description: "সাধারণ জিজ্ঞাসা" },
  { type: "testimonials", group: "engagement", label: "Testimonials", description: "গ্রাহকের মতামত" },
  { type: "reviews", group: "engagement", label: "Reviews", description: "অনুমোদিত রিভিউ ফিড" },
  { type: "countdown", group: "engagement", label: "Countdown", description: "অফার কাউন্টডাউন" },
  { type: "popup", group: "engagement", label: "Popup", description: "পেজ-নিজস্ব পপআপ (সর্বোচ্চ ৩টি)" },
  { type: "announcement", group: "utility", label: "Announcement", description: "টপ ঘোষণা বার" },
  { type: "guarantee", group: "utility", label: "Guarantee", description: "রিটার্ন/গ্যারান্টি নোট" },
  { type: "contact", group: "utility", label: "Contact", description: "ফোন/WhatsApp ব্লক" },
  { type: "divider", group: "utility", label: "Divider", description: "ডিভাইডার লাইন" },
  { type: "spacer", group: "utility", label: "Spacer", description: "ফাঁকা জায়গা" },
  { type: "ingredients", group: "medicine", label: "উপাদান", description: "পণ্যের উপাদান তালিকা" },
  { type: "dosage", group: "medicine", label: "সেবনবিধি", description: "ডোজ ও সেবনবিধি" },
  { type: "doctor_advice", group: "medicine", label: "ডাক্তারের পরামর্শ", description: "বাধ্যতামূলক ডিসক্লেইমার ব্লক" },
];

export const SECTION_GROUPS: Array<{ id: LandingSectionGroup; label: string }> = [
  { id: "layout", label: "Layout & Content" },
  { id: "commerce", label: "Commerce" },
  { id: "engagement", label: "Engagement" },
  { id: "utility", label: "Utility" },
  { id: "medicine", label: "Medicine (ওষুধ)" },
];

/** থিম টোকেন — ৪টি বিল্ট-ইন থিম + কাস্টম (landing_themes টেবিলে) */
export const LANDING_THEMES = ["emerald", "sage", "gold", "midnight"] as const;
export type LandingThemeSlug = (typeof LANDING_THEMES)[number];

export function defaultSectionsFor(productName: string): LandingSection[] {
  return [
    {
      id: 1,
      type: "hero",
      settings: {
        eyebrow: "বিশেষ অফার",
        title: productName,
        subtitle: "নির্বাচিত ভেষজ উপাদানে প্রস্তুত — লেবেলযুক্ত ও মেয়াদ উল্লেখসহ।",
        ctaLabel: "অর্ডার করুন",
        ctaTarget: "order_form",
        imageUrl: "",
      },
      design: { paddingY: 56, align: "center" },
    },
    {
      id: 2,
      type: "features",
      settings: {
        title: "কেন বেছে নেবেন",
        items: [
          { icon: "Leaf", title: "ভেষজ উপাদান", text: "নির্বাচিত ও লেবেলযুক্ত উপাদান" },
          { icon: "Banknote", title: "ক্যাশ অন ডেলিভারি", text: "পণ্য হাতে পেয়ে পরিশোধ" },
          { icon: "Truck", title: "সারাদেশে ডেলিভারি", text: "ঢাকার ভিতরে ও বাইরে" },
        ],
      },
      design: { alt: true },
    },
    {
      id: 3,
      type: "ingredients",
      settings: { title: "উপাদান", source: "product" },
    },
    {
      id: 4,
      type: "dosage",
      settings: { title: "ডোজ ও সেবনবিধি", source: "product" },
    },
    {
      id: 5,
      type: "order_form",
      settings: { mode: "inline", title: "অর্ডার ফর্ম", subtitle: "নাম, মোবাইল ও ঠিকানা দিন" },
      design: { alt: true },
    },
    {
      id: 6,
      type: "doctor_advice",
      settings: {},
    },
    {
      id: 7,
      type: "contact",
      settings: {},
    },
  ];
}
