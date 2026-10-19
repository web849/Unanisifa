import Link from "next/link";
import {
  Baby,
  Leaf,
  Menu,
  PackageSearch,
  Pill,
  ShieldCheck,
  Sparkles,
  X,
  type LucideIcon,
} from "lucide-react";
import { CategoryDrawerClient } from "./category-drawer-client";
import { listCategories } from "@/lib/store/repository";
import type { Category } from "@/lib/db/schema";

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

/** সার্ভার সাইডে ক্যাটাগরি এনে ক্লায়েন্ট ড্রয়ারে পাঠায় */
export async function CategoryDrawerButton() {
  const categories = await listCategories();
  return <CategoryDrawerClient categories={categories.map(pickCategory)} />;
}

function pickCategory(category: Category) {
  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
    icon: category.icon,
    coverImage: category.coverImage,
  };
}

export { Menu as MenuIcon, X as CloseIcon };
export type DrawerCategory = ReturnType<typeof pickCategory>;
export { Link as DrawerLink };
