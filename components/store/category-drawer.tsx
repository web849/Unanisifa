import { CategoryDrawerClient } from "./category-drawer-client";
import { listCategories } from "@/lib/store/repository";
import type { Category } from "@/lib/db/schema";

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

export type DrawerCategory = ReturnType<typeof pickCategory>;
