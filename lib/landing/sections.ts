/**
 * ল্যান্ডিং সেকশন ক্যাটালগ — ২৩টি সেকশন, পাঁচ গ্রুপে (স্পেক ৭খ)।
 * "html" ব্লক দিয়ে অ্যাডমিন নিজের HTML বসাতে পারেন; বাকিগুলো রেডি ব্লক।
 *
 * এই ফাইলটি ক্লায়েন্ট ও সার্ভার দুই দিকেই ইমপোর্ট হয় — তাই এখানে কোনো
 * React/Node-নির্ভর কোড থাকবে না, শুধু ডেটা ও ডিফল্ট।
 */

import { CONNECTED_PRODUCT_HTML_TEMPLATE } from "./html-tokens";

export type LandingSectionType =
  // Layout & Content
  | "hero"
  | "text"
  | "split"
  | "images"
  | "video"
  | "html"
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

/** নতুন সেকশন বানানোর সময় যে কনটেক্সট লাগে */
export type LandingSectionContext = {
  pageTitle: string;
  productName?: string | null;
  productImage?: string | null;
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
  { type: "html", group: "layout", label: "HTML Code", description: "পণ্য/চেকআউট টোকেনসহ নিজের HTML ও ইনলাইন CSS" },
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

export const SECTION_TYPE_LABEL: Record<LandingSectionType, string> = SECTION_CATALOG.reduce(
  (accumulator, item) => {
    accumulator[item.type] = item.label;
    return accumulator;
  },
  {} as Record<LandingSectionType, string>,
);

/** থিম টোকেন — ৪টি বিল্ট-ইন থিম + কাস্টম (landing_themes টেবিলে) */
export const LANDING_THEMES = ["emerald", "sage", "gold", "midnight"] as const;
export type LandingThemeSlug = (typeof LANDING_THEMES)[number];

export const LANDING_THEME_LABEL: Record<LandingThemeSlug, string> = {
  emerald: "Emerald (ডিফল্ট)",
  sage: "Sage",
  gold: "Gold",
  midnight: "Midnight",
};

function isoLocalDateTime(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
}

/* নতুন HTML ব্লক পণ্য ও চেকআউট কানেক্টেড ফরম্যাট দিয়েই শুরু হয় */
const DEFAULT_HTML = CONNECTED_PRODUCT_HTML_TEMPLATE;

/**
 * টাইপ অনুযায়ী শুরুর সেটিংস। নতুন ব্লক যোগ করলে সঙ্গে সঙ্গে দৃশ্যমান হবে —
 * খালি ব্লক দেখিয়ে ব্যবহারকারীকে বিভ্রান্ত করা হয় না।
 */
export function defaultSettingsFor(
  type: LandingSectionType,
  context: LandingSectionContext,
): Record<string, unknown> {
  const productName = context.productName?.trim() || context.pageTitle;
  switch (type) {
    case "hero":
      return {
        eyebrow: "বিশেষ অফার",
        title: context.pageTitle,
        subtitle: "নির্বাচিত ভেষজ উপাদানে প্রস্তুত — লেবেল ও মেয়াদ উল্লেখসহ।",
        ctaLabel: "অর্ডার করুন",
        ctaTarget: "order_form",
        imageUrl: context.productImage ?? "",
      };
    case "text":
      return {
        title: "আরও জানুন",
        body: "এই ব্লকে আপনার পণ্য বা অফার সম্পর্কে বিস্তারিত লিখুন। সংক্ষিপ্ত, স্পষ্ট বাক্য ব্যবহার করুন।",
      };
    case "split":
      return {
        title: productName,
        body: "পণ্যের বৈশিষ্ট্য, উপাদান ও ব্যবহারের সংক্ষিপ্ত বিবরণ এখানে দিন।",
        imageUrl: context.productImage ?? "",
      };
    case "images":
      return { title: "ছবি গ্যালারি", images: [] };
    case "video":
      return { title: "ভিডিও", youtubeId: "" };
    case "html":
      return { html: DEFAULT_HTML };
    case "products":
      return { title: "পণ্যটি সম্পর্কে", productIds: [] };
    case "order_form":
      return {
        title: "অর্ডার করুন",
        subtitle: "নাম, মোবাইল ও ঠিকানা দিন — পণ্য হাতে পেয়ে টাকা দিন।",
        mode: "inline",
      };
    case "cta":
      return {
        title: "আজই অর্ডার করুন",
        body: "ক্যাশ অন ডেলিভারি — সারাদেশে পণ্য পৌঁছে যাবে।",
        ctaLabel: "অর্ডার করুন",
        ctaUrl: "#order_form",
      };
    case "features":
      return {
        title: "কেন বেছে নেবেন",
        items: [
          { icon: "Leaf", title: "ভেষজ উপাদান", text: "নির্বাচিত ও লেবেলযুক্ত উপাদান" },
          { icon: "Banknote", title: "ক্যাশ অন ডেলিভারি", text: "পণ্য হাতে পেয়ে পরিশোধ" },
          { icon: "Truck", title: "সারাদেশে ডেলিভারি", text: "ঢাকার ভিতরে ও বাইরে" },
        ],
      };
    case "steps":
      return {
        title: "কীভাবে অর্ডার করবেন",
        items: [
          { title: "পণ্য বেছে নিন", text: "পেজে দেওয়া অর্ডার ফর্মটি দেখুন" },
          { title: "তথ্য দিন", text: "নাম, মোবাইল নম্বর ও সম্পূর্ণ ঠিকানা লিখুন" },
          { title: "পণ্য হাতে নিন", text: "ডেলিভারি ম্যানের সামনে দেখে টাকা দিন" },
        ],
      };
    case "faq":
      return {
        title: "সাধারণ জিজ্ঞাসা",
        items: [
          {
            q: "অর্ডার কীভাবে করব?",
            a: "পেজের অর্ডার ফর্মে নাম, মোবাইল ও ঠিকানা দিয়ে অর্ডার নিশ্চিত করুন।",
          },
          {
            q: "ডেলিভারি চার্জ কত?",
            a: "অর্ডার ফর্মে ঢাকার ভিতরে ও বাইরের ডেলিভারি চার্জ আলাদাভাবে দেখানো হয়।",
          },
          {
            q: "ক্যাশ অন ডেলিভারি আছে?",
            a: "হ্যাঁ, পণ্য হাতে পেয়ে টাকা পরিশোধ করতে পারবেন।",
          },
        ],
      };
    case "testimonials":
      return { title: "গ্রাহকের মতামত", items: [] };
    case "reviews":
      return { title: "যাচাইকৃত রিভিউ" };
    case "countdown":
      return {
        title: "অফার শেষ হতে বাকি",
        endsAt: isoLocalDateTime(new Date(Date.now() + 24 * 60 * 60 * 1000)),
      };
    case "popup":
      return {
        title: "বিশেষ অফার",
        body: "আজকের অফারে অর্ডার করলে বিশেষ সুবিধা পাবেন।",
        ctaLabel: "অর্ডার করুন",
        ctaUrl: "#order_form",
        delaySeconds: 4,
        frequency: "once_session",
        leadFormEnabled: false,
      };
    case "announcement":
      return { body: "সারা বাংলাদেশে ক্যাশ অন ডেলিভারি — পণ্য হাতে পেয়ে টাকা দিন" };
    case "guarantee":
      return {
        title: "আমাদের প্রতিশ্রুতি",
        body: "পণ্য হাতে পেয়ে দেখে নিতে পারবেন। লেবেল ও মেয়াদ না মিললে ডেলিভারি ম্যানকে ফেরত দিন।",
      };
    case "contact":
      return {
        title: "যোগাযোগ",
        body: "যেকোনো প্রশ্নে কল বা WhatsApp করুন — প্রতিদিন সকাল ১০টা থেকে রাত ৮টা।",
      };
    case "divider":
      return {};
    case "spacer":
      return { height: 48 };
    case "ingredients":
      return { title: "উপাদান", source: "product" };
    case "dosage":
      return { title: "ডোজ ও সেবনবিধি", source: "product" };
    case "doctor_advice":
      return {};
    default:
      return {};
  }
}

function defaultDesignFor(type: LandingSectionType): LandingSectionDesign | undefined {
  if (type === "hero") return { paddingY: 56, align: "center" };
  if (type === "features" || type === "products" || type === "faq" || type === "testimonials") {
    return { alt: true };
  }
  return undefined;
}

/** একটি নতুন সেকশন — আইডি ও ডিফল্ট সেটিংসসহ */
export function createLandingSection(
  type: LandingSectionType,
  id: number,
  context: LandingSectionContext,
): LandingSection {
  const design = defaultDesignFor(type);
  return {
    id,
    type,
    settings: defaultSettingsFor(type, context),
    ...(design ? { design } : {}),
  };
}

/** নতুন পেজের ডিফল্ট টেমপ্লেট — ১০টি রেডি ব্লক */
export function defaultSectionsFor(productName: string): LandingSection[] {
  const context: LandingSectionContext = { pageTitle: productName, productName };
  return [
    createLandingSection("announcement", 1, context),
    createLandingSection("hero", 2, context),
    createLandingSection("features", 3, context),
    createLandingSection("products", 4, context),
    createLandingSection("ingredients", 5, context),
    createLandingSection("dosage", 6, context),
    createLandingSection("order_form", 7, context),
    createLandingSection("faq", 8, context),
    createLandingSection("doctor_advice", 9, context),
    createLandingSection("contact", 10, context),
  ];
}

/**
 * ব্লকে দৃশ্যমান কনটেন্ট আছে কি না — বিল্ডার প্রিভিউতে খালি ব্লকের জন্য
 * স্পষ্ট প্লেসহোল্ডার দেখাতে ব্যবহৃত হয়। পাবলিক পেজে খালি ব্লক রেন্ডার হয় না।
 */
export function isSectionContentEmpty(
  section: LandingSection,
  context: { hasProduct?: boolean } = {},
): boolean {
  const settings = section.settings as Record<string, unknown>;
  const text = (key: string) => typeof settings[key] === "string" && (settings[key] as string).trim().length > 0;
  const items = (key: string) => Array.isArray(settings[key]) && (settings[key] as unknown[]).length > 0;

  switch (section.type) {
    case "hero":
      return !text("title") && !text("subtitle");
    case "text":
      return !text("title") && !text("body");
    case "split":
      return !text("title") && !text("body") && !text("imageUrl");
    case "images": {
      const list = Array.isArray(settings.images) ? settings.images : [];
      const csv = text("imageUrls");
      return list.length === 0 && !csv;
    }
    case "video":
      return !text("youtubeId");
    case "html":
      return !text("html");
    case "products": {
      const ids = Array.isArray(settings.productIds) ? settings.productIds : [];
      return ids.length === 0 && !context.hasProduct;
    }
    case "cta":
      return !text("title") && !text("body") && !text("ctaLabel");
    case "features":
    case "steps":
    case "faq":
    case "testimonials":
      return !items("items");
    case "countdown":
      return !text("endsAt");
    case "announcement":
      return !text("body") && !text("title");
    case "guarantee":
    case "contact":
      return !text("title") && !text("body");
    case "ingredients":
    case "dosage":
      return settings.source === "custom" && !text("custom");
    case "order_form":
    case "reviews":
    case "popup":
    case "divider":
    case "spacer":
    case "doctor_advice":
      return false;
    default:
      return false;
  }
}
