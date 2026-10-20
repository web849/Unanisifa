import { BUILT_IN_LOGO, BUILT_IN_LOGO_LIGHT, type BrandSettings } from "./config";

export const LOGO_HEIGHT_MIN = 24;
export const LOGO_HEIGHT_MAX = 72;
export const LOGO_HEIGHT_DEFAULT = 36;

export const DARK_LOGO_MODES = ["auto", "pill", "white"] as const;
export type DarkLogoMode = (typeof DARK_LOGO_MODES)[number];

export type ResolvedBrandLogo = {
  /** কাস্টম আপলোড করা ছবি ব্যবহার হচ্ছে কি না */
  isCustom: boolean;
  /** ইমেজ URL (কাস্টম না থাকলে বিল্ট-ইন ফলব্যাক) */
  src: string;
  /** এই ভ্যারিয়েন্টে আলাদা লাইট লোগো সরাসরি ব্যবহৃত হয়েছে কি না */
  usesDedicatedLightLogo: boolean;
  /** পিক্সেলে লোগোর উচ্চতা */
  heightPx: number;
  /** লোগোর পাশে ব্র্যান্ডের নাম ও ট্যাগলাইন দেখানো হবে কি না */
  showText: boolean;
  /** ডার্ক ব্যাকগ্রাউন্ডে ইমেজের স্টাইল মোড */
  darkTreatment: "none" | "pill" | "white";
};

export function clampLogoHeight(value: unknown): number {
  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(num)) return LOGO_HEIGHT_DEFAULT;
  return Math.min(LOGO_HEIGHT_MAX, Math.max(LOGO_HEIGHT_MIN, Math.round(num)));
}

/**
 * ব্র্যান্ড সেটিংস থেকে যেকোনো সারফেসের (`dark` = হালকা হেডার/ইনভয়েস, `light` = ডার্ক ফুটার/অ্যাডমিন)
 * জন্য চূড়ান্ত লোগো কনফিগ নির্ধারণ করে।
 */
export function resolveBrandLogo(
  brand: Pick<
    BrandSettings,
    "logoUrl" | "logoLightUrl" | "logoHeight" | "logoShowText" | "darkLogoMode"
  >,
  variant: "dark" | "light" = "dark",
): ResolvedBrandLogo {
  const primary = (brand.logoUrl ?? "").trim();
  const light = (brand.logoLightUrl ?? "").trim();
  const baseHeight = clampLogoHeight(brand.logoHeight);
  const heightPx = variant === "light" ? Math.min(80, Math.round(baseHeight * 1.15)) : baseHeight;

  const uploaded = variant === "light" ? light || primary : primary || light;
  if (!uploaded) {
    return {
      isCustom: false,
      src: variant === "light" ? BUILT_IN_LOGO_LIGHT : BUILT_IN_LOGO,
      usesDedicatedLightLogo: false,
      heightPx: baseHeight,
      showText: true,
      darkTreatment: "none",
    };
  }

  const usesDedicatedLightLogo = variant === "light" && Boolean(light);
  const mode: DarkLogoMode = DARK_LOGO_MODES.includes(brand.darkLogoMode)
    ? brand.darkLogoMode
    : "auto";

  let darkTreatment: "none" | "pill" | "white" = "none";
  if (variant === "light") {
    if (mode === "pill") {
      darkTreatment = "pill";
    } else if (mode === "white" && !usesDedicatedLightLogo) {
      darkTreatment = "white";
    }
  }

  return {
    isCustom: true,
    src: uploaded,
    usesDedicatedLightLogo,
    heightPx,
    showText: Boolean(brand.logoShowText),
    darkTreatment,
  };
}
