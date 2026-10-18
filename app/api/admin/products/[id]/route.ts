import { eq } from "drizzle-orm";
import { guardMutation, jsonError, jsonOk, readJson, requestContext } from "@/lib/api/helpers";
import { getAdminSession } from "@/lib/auth/session";
import { requireAdminWrite } from "@/lib/admin/guard";
import { requireDb } from "@/lib/db";
import { productImages, products } from "@/lib/db/schema";
import { audit } from "@/lib/auth/audit";
import { productSchema } from "../route";

export const dynamic = "force-dynamic";

const nullableText = [
  "sku",
  "shortDescription",
  "description",
  "ingredients",
  "dosage",
  "warnings",
  "storage",
  "packageSize",
  "manufacturer",
  "expiryNote",
  "metaTitle",
  "metaDescription",
] as const;

/** PATCH /api/admin/products/[id] — প্রোডাক্ট আপডেট (+ images রিপ্লেস) */
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const guard = guardMutation(request);
  if (guard) return guard;
  const reqContext = requestContext(request.headers);
  const session = await getAdminSession();
  const denied = await requireAdminWrite(session, reqContext.clientIpHash, "products");
  if (denied) return denied;

  const { id } = await context.params;
  const productId = Number(id);
  const parsed = productSchema.partial().safeParse(await readJson<unknown>(request));
  if (!parsed.success) return jsonError(400, "Invalid product data", parsed.error.flatten());

  const db = requireDb("প্রোডাক্ট আপডেট");
  const data = parsed.data;

  const values: Record<string, unknown> = { updatedAt: new Date() };
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined || key === "images") continue;
    if (key === "slug") {
      values.slug = String(value).toLowerCase();
      continue;
    }
    if ((nullableText as readonly string[]).includes(key)) {
      values[key] = value === "" ? null : value;
      continue;
    }
    values[key] = value;
  }

  const result = await db.update(products).set(values).where(eq(products.id, productId)).returning({ id: products.id });
  if (result.length === 0) return jsonError(404, "Product not found");

  if (data.images) {
    await db.delete(productImages).where(eq(productImages.productId, productId));
    if (data.images.length > 0) {
      await db.insert(productImages).values(
        data.images.map((image, index) => ({
          productId,
          url: image.url,
          alt: image.alt || null,
          sortOrder: index,
          isPrimary: index === 0,
        })),
      );
    }
  }

  await audit({
    actorType: "admin",
    actorId: session?.userId ?? null,
    actorName: session?.name ?? null,
    action: "product.update",
    entityType: "products",
    entityId: id,
    ipHash: reqContext.clientIpHash,
    meta: { fields: Object.keys(values) },
  }).catch(() => undefined);

  return jsonOk({ id: productId });
}

/** DELETE — সফট ডিলিট (status=archived); হিস্ট্রি ও অর্ডার স্ন্যাপশট অক্ষুণ্ণ থাকে */
export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const guard = guardMutation(request);
  if (guard) return guard;
  const reqContext = requestContext(request.headers);
  const session = await getAdminSession();
  const denied = await requireAdminWrite(session, reqContext.clientIpHash, "products");
  if (denied) return denied;

  const { id } = await context.params;
  const db = requireDb("প্রোডাক্ট ডিলিট");
  const result = await db
    .update(products)
    .set({ status: "archived", featured: false, updatedAt: new Date() })
    .where(eq(products.id, Number(id)))
    .returning({ id: products.id });
  if (result.length === 0) return jsonError(404, "Product not found");

  await audit({
    actorType: "admin",
    actorId: session?.userId ?? null,
    actorName: session?.name ?? null,
    action: "product.archive",
    entityType: "products",
    entityId: id,
    ipHash: reqContext.clientIpHash,
  }).catch(() => undefined);

  return jsonOk({ archived: true });
}
