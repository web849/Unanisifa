import { and, eq, ilike, sql } from "drizzle-orm";
import { z } from "zod";
import { guardMutation, jsonError, jsonOk, readJson, requestContext } from "@/lib/api/helpers";
import { getAdminSession } from "@/lib/auth/session";
import { requireAdmin, requireAdminWrite } from "@/lib/admin/guard";
import { requireDb } from "@/lib/db";
import { categories, productImages, products } from "@/lib/db/schema";
import { audit } from "@/lib/auth/audit";

export const dynamic = "force-dynamic";

export const productSchema = z.object({
  name: z.string().trim().min(2).max(255),
  slug: z.string().trim().min(2).max(255).optional(),
  categoryId: z.number().int().positive().nullable().optional(),
  sku: z.string().trim().max(80).optional(),
  shortDescription: z.string().trim().max(500).optional(),
  description: z.string().trim().max(20000).optional(),
  price: z.number().int().min(1).max(10000000),
  compareAtPrice: z.number().int().min(0).max(10000000).nullable().optional(),
  costPrice: z.number().int().min(0).max(10000000).nullable().optional(),
  stock: z.number().int().min(0).max(1000000).default(0),
  lowStockThreshold: z.number().int().min(0).max(100000).default(5),
  trackStock: z.boolean().default(true),
  status: z.enum(["draft", "active", "archived"]).default("draft"),
  featured: z.boolean().default(false),
  sortOrder: z.number().int().min(0).max(99999).default(0),
  ingredients: z.string().trim().max(4000).optional(),
  dosage: z.string().trim().max(4000).optional(),
  warnings: z.string().trim().max(4000).optional(),
  storage: z.string().trim().max(1000).optional(),
  packageSize: z.string().trim().max(200).optional(),
  manufacturer: z.string().trim().max(255).optional(),
  requiresPrescription: z.boolean().default(false),
  expiryNote: z.string().trim().max(300).optional(),
  metaTitle: z.string().trim().max(255).optional(),
  metaDescription: z.string().trim().max(500).optional(),
  images: z.array(z.object({ url: z.string().trim().min(1).max(600), alt: z.string().trim().max(300).optional() })).max(8).default([]),
});

export type ProductInput = z.infer<typeof productSchema>;

async function replaceImages(productId: number, images: ProductInput["images"]): Promise<void> {
  const db = requireDb("প্রোডাক্ট ইমেজ");
  await db.delete(productImages).where(eq(productImages.productId, productId));
  if (images.length > 0) {
    await db.insert(productImages).values(
      images.map((image, index) => ({
        productId,
        url: image.url,
        alt: image.alt || null,
        sortOrder: index,
        isPrimary: index === 0,
      })),
    );
  }
}

/** POST /api/admin/products — নতুন প্রোডাক্ট (+ ইমেজ) */
export async function POST(request: Request) {
  const guard = guardMutation(request);
  if (guard) return guard;
  const context = requestContext(request.headers);
  const session = await getAdminSession();
  const denied = await requireAdminWrite(session, context.clientIpHash, "products");
  if (denied) return denied;

  const parsed = productSchema.safeParse(await readJson<unknown>(request));
  if (!parsed.success) return jsonError(400, "Invalid product data", parsed.error.flatten());

  const db = requireDb("প্রোডাক্ট তৈরি");
  const data = parsed.data;
  const slug = (data.slug || slugifyProduct(data.name)).toLowerCase();

  const existing = await db.select({ id: products.id }).from(products).where(eq(products.slug, slug)).limit(1);
  if (existing.length > 0) return jsonError(409, `Slug already used: ${slug}`);

  const result = await db
    .insert(products)
    .values({
      name: data.name,
      slug,
      categoryId: data.categoryId ?? null,
      sku: data.sku || null,
      shortDescription: data.shortDescription || null,
      description: data.description || null,
      price: data.price,
      compareAtPrice: data.compareAtPrice ?? null,
      costPrice: data.costPrice ?? null,
      stock: data.stock,
      lowStockThreshold: data.lowStockThreshold,
      trackStock: data.trackStock,
      status: data.status,
      featured: data.featured,
      sortOrder: data.sortOrder,
      ingredients: data.ingredients || null,
      dosage: data.dosage || null,
      warnings: data.warnings || null,
      storage: data.storage || null,
      packageSize: data.packageSize || null,
      manufacturer: data.manufacturer || null,
      requiresPrescription: data.requiresPrescription,
      expiryNote: data.expiryNote || null,
      metaTitle: data.metaTitle || null,
      metaDescription: data.metaDescription || null,
    })
    .returning({ id: products.id, slug: products.slug });

  const row = result[0];
  if (!row) return jsonError(500, "Could not create product");

  await replaceImages(row.id, data.images);

  await audit({
    actorType: "admin",
    actorId: session?.userId ?? null,
    actorName: session?.name ?? null,
    action: "product.create",
    entityType: "products",
    entityId: String(row.id),
    ipHash: context.clientIpHash,
    meta: { slug: row.slug },
  }).catch(() => undefined);

  return jsonOk({ id: row.id, slug: row.slug }, 201);
}

/** GET /api/admin/products — সার্চ/ফিল্টার (প্রাইমারি ইমেজ সহ) */
export async function GET(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const db = requireDb("প্রোডাক্ট তালিকা");
  const url = new URL(request.url);
  const search = url.searchParams.get("search")?.trim();
  const status = url.searchParams.get("status");
  const categoryId = url.searchParams.get("categoryId");
  const filter = url.searchParams.get("filter");

  const conditions = [];
  if (search) conditions.push(ilike(products.name, `%${search}%`));
  if (status && ["draft", "active", "archived"].includes(status)) {
    conditions.push(eq(products.status, status as "draft"));
  }
  if (categoryId) conditions.push(eq(products.categoryId, Number(categoryId)));
  if (filter === "low") {
    conditions.push(and(eq(products.trackStock, true), sql`${products.stock} <= ${products.lowStockThreshold}`)!);
  }

  const rows = await db
    .select({
      id: products.id,
      name: products.name,
      slug: products.slug,
      price: products.price,
      compareAtPrice: products.compareAtPrice,
      stock: products.stock,
      lowStockThreshold: products.lowStockThreshold,
      status: sql<string>`${products.status}`,
      featured: products.featured,
      image: sql<string | null>`(SELECT ${productImages.url} FROM ${productImages} WHERE ${productImages.productId} = ${products.id} ORDER BY ${productImages.sortOrder} LIMIT 1)`,
      category: categories.name,
    })
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .where(conditions.length > 0 ? and(...conditions) : sql`TRUE`)
    .orderBy(sql`${products.sortOrder} DESC, ${products.id} DESC`)
    .limit(200);

  return jsonOk({ products: rows });
}

export function slugifyProduct(value: string): string {
  return (
    value
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60) || `product-${Date.now()}`
  );
}
