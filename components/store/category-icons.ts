import {
  Baby,
  Leaf,
  PackageSearch,
  Pill,
  ShieldCheck,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

/**
 * ক্যাটাগরি আইকনের ম্যাপ — ক্লায়েন্ট-সেফ মডিউল।
 *
 * আগে এই ম্যাপটি `category-drawer.tsx`-এ ছিল, যেটি `lib/store/repository`
 * (ডেটাবেজ লেয়ার) ইমপোর্ট করে। ক্লায়েন্ট কম্পোনেন্ট ওখান থেকে
 * `categoryIcon` আনায় পুরো DB মডিউল ক্লায়েন্ট বান্ডলে ঢুকে যাচ্ছিল।
 * এখন আইকন-সংক্রান্ত কোড আলাদা, তাই ক্লায়েন্ট বান্ডলে সার্ভার কোড যায় না।
 */

export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  Leaf,
  Pill,
  Sparkles,
  Baby,
  ShieldCheck,
  PackageSearch,
};

export function categoryIcon(name: string | null): LucideIcon {
  if (name && name in CATEGORY_ICONS) return CATEGORY_ICONS[name];
  return Leaf;
}
