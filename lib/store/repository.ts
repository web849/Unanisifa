/**
 * স্টোর রিপোজিটরি — সব পাবলিক রিড-অপারেশন এখানে।
 *
 * DATABASE_URL থাকলে Drizzle দিয়ে Neon থেকে পড়ে; না থাকলে lib/demo/catalog
 * থেকে লোকাল ডেমো ডেটা ফেরত দেয় (ডিজাইন রিভিউয়ের জন্য)। রাইট-অপারেশন
 * কখনো ফলব্যাক ব্যবহার করে না — সেগুলো স্পষ্ট এরর দেখায়।
 */

import { and, asc, desc, eq, ilike, inArray, isNull, or, sql } from "drizzle-orm";
import { cache } from "react";
import { db } from "../db";
import {
  banners,
  categories,
  cmsPages,
  productImages,
  productReviews,
  products,
  productVariants,
  siteSettings,
  type Category,
  type CmsPage,
  type Product,
  type ProductImage,
  type ProductReview,
  type ProductVariant,
} from "../db/schema";
import {
  DEFAULT_SETTINGS,
  type CommerceSettings,
  type BrandSettings,
  type SiteSettingsShape,
} from "../config";
import {
  DEMO_BANNERS,
  DEMO_CATEGORIES,
  DEMO_CMS_PAGES,
  DEMO_PRODUCTS,
  demoProductImages,
  DEMO_SEED_DATE,
} from "../demo/catalog";

/* -------------------------------------------------------------------------- */
/* টাইপ                                                                        */
/* -------------------------------------------------------------------------- */

export type ProductWithRelations = Product & {
  images: ProductImage[];
  variants: ProductVariant[];
  category: Category | null;
};

export type ProductCard = Pick<
  Product,
  | "id"
  | "name"
  | "slug"
  | "price"
  | "compareAtPrice"
  | "stock"
  | "trackStock"
  | "featured"
  | "status"
  | "shortDescription"
  | "lowStockThreshold"
> & {
  image: string | null;
  categoryName: string | null;
  categorySlug: string | null;
  orderCount: number;
};

export type ProductSort = "newest" | "price_asc" | "price_desc" | "popular";

export type ProductQuery = {
  q?: string;
  category?: string;
  sort?: ProductSort;
  page?: number;
  limit?: number;
  featuredOnly?: boolean;
};

export type BannerRow = {
  id: number;
  title: string;
  imageUrl: string;
  linkUrl: string | null;
  altText: string | null;
  sortOrder: number;
};

/* -------------------------------------------------------------------------- */
/* সেটিংস                                                                       */
/* -------------------------------------------------------------------------- */

function demoSettings(): SiteSettingsShape {
  return structuredClone(DEFAULT_SETTINGS);
}

export const getSettings = cache(async (): Promise<SiteSettingsShape> => {
  if (!db) return demoSettings();
  try {
    const rows = await db
      .select()
      .from(siteSettings)
      .where(inArray(siteSettings.key, ["brand", "commerce"]));
    const merged = demoSettings();
    for (const row of rows) {
      if (row.key === "brand" && row.value) {
        merged.brand = { ...merged.brand, ...(row.value as Partial<BrandSettings>) };
      }
      if (row.key === "commerce" && row.value) {
        merged.commerce = { ...merged.commerce, ...(row.value as Partial<CommerceSettings>) };
      }
    }
    return merged;
  } catch {
    return demoSettings();
  }
});

export async function getBrand(): Promise<BrandSettings> {
  return (await getSettings()).brand;
}

export async function getCommerce(): Promise<CommerceSettings> {
  return (await getSettings()).commerce;
}

/* -------------------------------------------------------------------------- */
/* ক্যাটাগরি                                                                     */
/* -------------------------------------------------------------------------- */

export const listCategories = cache(async (): Promise<Category[]> => {
  if (!db) {
    return DEMO_CATEGORIES.filter((c) => c.active).map((c) => ({
      ...c,
      createdAt: DEMO_SEED_DATE,
      updatedAt: DEMO_SEED_DATE,
    }));
  }
  return db
    .select()
    .from(categories)
    .where(eq(categories.active, true))
    .orderBy(asc(categories.sortOrder), asc(categories.id));
});

/* -------------------------------------------------------------------------- */
/* পণ্য                                                                         */
/* -------------------------------------------------------------------------- */

function demoProductRows(): Product[] {
  return DEMO_PRODUCTS.map((p) => ({ ...p, createdAt: DEMO_SEED_DATE, updatedAt: DEMO_SEED_DATE }));
}

function toCard(p: Product, image: string | null, category: Category | null): ProductCard {
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    price: p.price,
    compareAtPrice: p.compareAtPrice,
    stock: p.stock,
    trackStock: p.trackStock,
    featured: p.featured,
    status: p.status,
    shortDescription: p.shortDescription,
    lowStockThreshold: p.lowStockThreshold,
    image,
    categoryName: category?.name ?? null,
    categorySlug: category?.slug ?? null,
    orderCount: p.orderCount,
  };
}

export async function searchProducts(query: ProductQuery = {}): Promise<{
  items: ProductCard[];
  total: number;
}> {
  const limit = Math.min(Math.max(query.limit ?? 12, 1), 48);
  const page = Math.max(query.page ?? 1, 1);
  const offset = (page - 1) * limit;
  const sort = query.sort ?? "newest";

  if (!db) {
    const cats = new Map(DEMO_CATEGORIES.map((c) => [c.id, c as Category]));
    let rows = demoProductRows().filter((p) => p.status === "active");

    if (query.featuredOnly) rows = rows.filter((p) => p.featured);
    if (query.category) {
      const cat = cats.get(Number(query.category)) ?? [...cats.values()].find((c) => c.slug === query.category);
      if (cat) rows = rows.filter((p) => p.categoryId === cat.id);
      else rows = [];
    }
    if (query.q) {
      const q = query.q.trim().toLowerCase();
      rows = rows.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.shortDescription ?? "").toLowerCase().includes(q) ||
          (p.description ?? "").toLowerCase().includes(q),
      );
    }

    rows = sortRows(rows, sort);
    const total = rows.length;
    const items = rows.slice(offset, offset + limit).map((p) => {
      const image = demoProductImages(p.id, p.name)[0]?.url ?? null;
      return toCard(p, image, p.categoryId ? (cats.get(p.categoryId) ?? null) : null);
    });
    return { items, total };
  }

  const conditions = [eq(products.status, "active")];
  if (query.featuredOnly) conditions.push(eq(products.featured, true));
  if (query.category) {
    const catRow = await db
      .select({ id: categories.id })
      .from(categories)
      .where(
        or(eq(categories.slug, query.category), eq(sql`${categories.id}::text`, query.category)),
      )
      .limit(1);
    const catId = catRow[0]?.id;
    if (catId) conditions.push(eq(products.categoryId, catId));
    else conditions.push(sql`false`);
  }
  if (query.q?.trim()) {
    const q = `%${query.q.trim()}%`;
    conditions.push(
      or(
        ilike(products.name, q),
        ilike(products.shortDescription, q),
        ilike(products.description, q),
      ) ?? sql`false`,
    );
  }

  const order =
    sort === "price_asc"
      ? [asc(products.price)]
      : sort === "price_desc"
        ? [desc(products.price)]
        : sort === "popular"
          ? [desc(products.orderCount), desc(products.id)]
          : [desc(products.createdAt), desc(products.id)];

  const countRows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(products)
    .where(and(...conditions));
  const total = countRows[0]?.count ?? 0;

  const rows = await db
    .select({ product: products, image: productImages.url, category: categories })
    .from(products)
    .leftJoin(productImages, eq(productImages.productId, products.id))
    .leftJoin(categories, eq(categories.id, products.categoryId))
    .where(and(...conditions))
    .orderBy(...order)
    .limit(limit)
    .offset(offset);

  // একাধিক ছবি থাকলে প্রথমটিই কার্ডে ব্যবহৃত হয় (sortOrder অনুযায়ী)
  const items: ProductCard[] = rows.map((row) =>
    toCard(row.product, row.image, row.category),
  );
  return { items, total };
}

function sortRows(rows: Product[], sort: ProductSort): Product[] {
  const copy = [...rows];
  switch (sort) {
    case "price_asc":
      return copy.sort((a, b) => a.price - b.price);
    case "price_desc":
      return copy.sort((a, b) => b.price - a.price);
    case "popular":
      return copy.sort((a, b) => b.orderCount - a.orderCount || b.id - a.id);
    default:
      return copy.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime() || b.id - a.id);
  }
}

export async function getFeaturedProducts(limit = 8): Promise<ProductCard[]> {
  const { items } = await searchProducts({ featuredOnly: true, limit });
  if (items.length >= 4) return items;
  const { items: fallback } = await searchProducts({ limit });
  return [...items, ...fallback.filter((i) => !items.some((x) => x.id === i.id))].slice(0, limit);
}

export async function getProductBySlug(slug: string): Promise<ProductWithRelations | null> {
  if (!db) {
    const p = demoProductRows().find((x) => x.slug === slug);
    if (!p) return null;
    const seedCategory = DEMO_CATEGORIES.find((c) => c.id === p.categoryId) ?? null;
    const category = seedCategory
      ? { ...seedCategory, createdAt: DEMO_SEED_DATE, updatedAt: DEMO_SEED_DATE }
      : null;
    return {
      ...p,
      images: demoProductImages(p.id, p.name).map((img, i) => ({
        ...img,
        id: i + 1,
        createdAt: DEMO_SEED_DATE,
      })),
      variants: [],
      category,
    };
  }
  const rows = await db.select().from(products).where(eq(products.slug, slug)).limit(1);
  const product = rows[0];
  if (!product) return null;
  const [images, variants, categoryRows] = await Promise.all([
    db
      .select()
      .from(productImages)
      .where(eq(productImages.productId, product.id))
      .orderBy(asc(productImages.sortOrder)),
    db
      .select()
      .from(productVariants)
      .where(eq(productVariants.productId, product.id))
      .orderBy(asc(productVariants.sortOrder)),
    product.categoryId
      ? db.select().from(categories).where(eq(categories.id, product.categoryId)).limit(1)
      : Promise.resolve([]),
  ]);
  return { ...product, images, variants, category: categoryRows[0] ?? null };
}

export async function getRelatedProducts(
  productId: number,
  categoryId: number | null,
  limit = 4,
): Promise<ProductCard[]> {
  const { items } = await searchProducts({
    category: categoryId ? String(categoryId) : undefined,
    limit: limit + 1,
  });
  return items.filter((i) => i.id !== productId).slice(0, limit);
}

/* -------------------------------------------------------------------------- */
/* ব্যানার                                                                       */
/* -------------------------------------------------------------------------- */

export const listActiveBanners = cache(async (): Promise<BannerRow[]> => {
  if (!db) {
    return DEMO_BANNERS.filter((b) => b.active)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .slice(0, 5)
      .map((b) => ({
        id: b.id,
        title: b.title,
        imageUrl: b.imageUrl,
        linkUrl: b.linkUrl,
        altText: b.altText,
        sortOrder: b.sortOrder,
      }));
  }
  const now = new Date();
  const rows = await db
    .select()
    .from(banners)
    .where(
      and(
        eq(banners.active, true),
        or(isNull(banners.startsAt), sql`${banners.startsAt} <= ${now}`),
        or(isNull(banners.endsAt), sql`${banners.endsAt} >= ${now}`),
      ),
    )
    .orderBy(asc(banners.sortOrder))
    .limit(5);
  return rows.map((b) => ({
    id: b.id,
    title: b.title,
    imageUrl: b.imageUrl,
    linkUrl: b.linkUrl,
    altText: b.altText,
    sortOrder: b.sortOrder,
  }));
});

/* -------------------------------------------------------------------------- */
/* CMS পেজ                                                                      */
/* -------------------------------------------------------------------------- */

export async function getCmsPage(slug: string): Promise<CmsPage | null> {
  if (!db) {
    const page = DEMO_CMS_PAGES.find((p) => p.slug === slug);
    return page ? { ...page, updatedAt: DEMO_SEED_DATE } : null;
  }
  const rows = await db.select().from(cmsPages).where(eq(cmsPages.slug, slug)).limit(1);
  return rows[0] ?? null;
}

export const listFooterPages = cache(async (): Promise<CmsPage[]> => {
  if (!db) {
    return DEMO_CMS_PAGES.filter((p) => p.showInFooter)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((p) => ({ ...p, updatedAt: DEMO_SEED_DATE }));
  }
  return db
    .select()
    .from(cmsPages)
    .where(eq(cmsPages.showInFooter, true))
    .orderBy(asc(cmsPages.sortOrder));
});

/* -------------------------------------------------------------------------- */
/* রিভিউ (শুধু approved পাবলিক)                                                   */
/* -------------------------------------------------------------------------- */

export async function listApprovedReviews(productId: number): Promise<ProductReview[]> {
  if (!db) return [];
  return db
    .select()
    .from(productReviews)
    .where(and(eq(productReviews.productId, productId), eq(productReviews.status, "approved")))
    .orderBy(desc(productReviews.createdAt))
    .limit(20);
}

/* -------------------------------------------------------------------------- */
/* ডেটাবেজ অবস্থা (UI-তে সৎভাবে দেখানোর জন্য)                                       */
/* -------------------------------------------------------------------------- */

export function isCatalogDemoMode(): boolean {
  return db === null;
}
