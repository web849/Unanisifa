import { NextResponse } from "next/server";
import { inArray, sql } from "drizzle-orm";
import { db, isDatabaseConfigured } from "@/lib/db";
import { productImages, products } from "@/lib/db/schema";
import { DEMO_PRODUCTS } from "@/lib/demo/catalog";
import { getCommerce } from "@/lib/store/repository";
import type { PricedCart, PricedCartLine } from "@/lib/cart/types";

export const dynamic = "force-dynamic";

type ValidateBody = {
  items?: Array<{ productId?: unknown; variantId?: unknown; quantity?: unknown }>;
};

/**
 * কার্ট রেন্ডারের সময় দাম সার্ভারে রি-ভ্যালিডেট।
 * ব্রাউজার থেকে শুধু productId/variantId/quantity আসে — দাম কখনো নয়।
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as ValidateBody | null;
  const commerce = await getCommerce();
  const items = Array.isArray(body?.items) ? body.items : [];

  const cleaned = items
    .map((item) => ({
      productId: Number(item.productId),
      variantId: item.variantId == null ? null : Number(item.variantId),
      quantity: Math.min(Math.max(Number(item.quantity) || 1, 1), commerce.maxQuantity),
    }))
    .filter((item) => Number.isInteger(item.productId) && item.productId > 0);

  if (cleaned.length === 0) {
    return NextResponse.json<PricedCart>({ lines: [], subtotal: 0, unavailableCount: 0 });
  }

  const productIds = [...new Set(cleaned.map((item) => item.productId))];

  type Row = {
    id: number;
    name: string;
    slug: string;
    price: number;
    compareAtPrice: number | null;
    stock: number;
    trackStock: boolean;
    status: string;
    requiresPrescription: boolean;
    image: string | null;
  };

  let rows: Row[] = [];

  if (isDatabaseConfigured && db) {
    const dbRows = await db
      .select({
        id: products.id,
        name: products.name,
        slug: products.slug,
        price: products.price,
        compareAtPrice: products.compareAtPrice,
        stock: products.stock,
        trackStock: products.trackStock,
        status: products.status,
        requiresPrescription: products.requiresPrescription,
        image: productImages.url,
      })
      .from(products)
      .leftJoin(
        productImages,
        sql`${productImages.productId} = ${products.id} AND ${productImages.isPrimary} = true`,
      )
      .where(inArray(products.id, productIds));
    rows = dbRows;
  } else {
    rows = DEMO_PRODUCTS.filter((p) => productIds.includes(p.id)).map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      price: p.price,
      compareAtPrice: p.compareAtPrice,
      stock: p.stock,
      trackStock: p.trackStock,
      status: p.status,
      requiresPrescription: p.requiresPrescription,
      image: `/images/demo/p-${String(p.id).padStart(2, "0")}.svg`,
    }));
  }

  const productMap = new Map(rows.map((row) => [row.id, row]));

  const lines: PricedCartLine[] = [];
  let unavailableCount = 0;

  for (const item of cleaned) {
    const product = productMap.get(item.productId);
    if (!product || product.status !== "active") {
      unavailableCount += 1;
      continue;
    }
    const available = !product.trackStock || product.stock > 0;
    if (!available) unavailableCount += 1;
    const unitPrice = product.price;
    lines.push({
      productId: product.id,
      variantId: item.variantId,
      name: product.name,
      variantName: null,
      slug: product.slug,
      image: product.image,
      unitPrice,
      compareAtPrice: product.compareAtPrice,
      quantity: item.quantity,
      lineTotal: unitPrice * item.quantity,
      stock: product.stock,
      trackStock: product.trackStock,
      maxQuantity: Math.min(product.trackStock ? product.stock : commerce.maxQuantity, commerce.maxQuantity),
      available,
      requiresPrescription: product.requiresPrescription,
    });
  }

  const subtotal = lines.reduce((sum, line) => sum + line.lineTotal, 0);

  return NextResponse.json<PricedCart>({ lines, subtotal, unavailableCount });
}
