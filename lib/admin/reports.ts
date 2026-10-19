/**
 * রিপোর্ট — সেলস, প্রোডাক্ট-ভিত্তিক লাভ, ফানেল (ল্যান্ডিং পেজ), কুপন খরচ।
 * টাকা সর্বদা অর্ডারের স্ন্যাপশট থেকে (সার্ভারে হিসাব করা)।
 */

import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { requireDb } from "../db";
import { coupons, landingPages, orderItems, orders, products } from "../db/schema";

export type DateRange = { from: Date; to: Date };

export type SalesSummary = {
  orders: number;
  revenue: number;
  deliveredRevenue: number;
  cancelled: number;
  discountGiven: number;
  deliveryCollected: number;
  courierCost: number;
  packagingCost: number;
  extrasCost: number;
  productCost: number;
  grossProfit: number;
  byStatus: Record<string, number>;
  byDay: Array<{ day: string; orders: number; revenue: number }>;
};

export async function getSalesSummary(range: DateRange): Promise<SalesSummary> {
  const db = requireDb("রিপোর্ট");
  const window = and(gte(orders.createdAt, range.from), lte(orders.createdAt, range.to));

  const [totals, byStatus, byDay] = await Promise.all([
    db
      .select({
        orders: sql<number>`count(*)::int`,
        revenue: sql<number>`coalesce(sum(${orders.total}),0)::int`,
        deliveredRevenue: sql<number>`coalesce(sum(case when ${orders.status} = 'delivered' then ${orders.total} else 0 end),0)::int`,
        cancelled: sql<number>`coalesce(sum(case when ${orders.status} = 'cancelled' then 1 else 0 end),0)::int`,
        discountGiven: sql<number>`coalesce(sum(${orders.discount}),0)::int`,
        deliveryCollected: sql<number>`coalesce(sum(${orders.deliveryCharge}),0)::int`,
        courierCost: sql<number>`coalesce(sum(${orders.courierCost}),0)::int`,
        packagingCost: sql<number>`coalesce(sum(${orders.packagingCost}),0)::int`,
        extrasCost: sql<number>`coalesce(sum(${orders.extrasCost}),0)::int`,
      })
      .from(orders)
      .where(window),
    db
      .select({ status: sql<string>`${orders.status}`, count: sql<number>`count(*)::int`, revenue: sql<number>`coalesce(sum(${orders.total}),0)::int` })
      .from(orders)
      .where(window)
      .groupBy(orders.status),
    db
      .select({
        day: sql<string>`to_char(${orders.createdAt} AT TIME ZONE 'Asia/Dhaka', 'YYYY-MM-DD')`,
        orders: sql<number>`count(*)::int`,
        revenue: sql<number>`coalesce(sum(${orders.total}),0)::int`,
      })
      .from(orders)
      .where(window)
      .groupBy(sql`to_char(${orders.createdAt} AT TIME ZONE 'Asia/Dhaka', 'YYYY-MM-DD')`)
      .orderBy(sql`to_char(${orders.createdAt} AT TIME ZONE 'Asia/Dhaka', 'YYYY-MM-DD')`),
  ]);

  const productCostRows = await db
    .select({ cost: sql<number>`coalesce(sum(${orderItems.costPrice} * ${orderItems.quantity}),0)::int` })
    .from(orderItems)
    .innerJoin(orders, eq(orderItems.orderId, orders.id))
    .where(and(window, sql`${orders.status} <> 'cancelled'`));

  const t = totals[0];
  const productCost = productCostRows[0]?.cost ?? 0;
  const revenueExCancelled = byStatus
    .filter((row) => row.status !== "cancelled")
    .reduce((sum, row) => sum + row.revenue, 0);

  return {
    orders: t?.orders ?? 0,
    revenue: t?.revenue ?? 0,
    deliveredRevenue: t?.deliveredRevenue ?? 0,
    cancelled: t?.cancelled ?? 0,
    discountGiven: t?.discountGiven ?? 0,
    deliveryCollected: t?.deliveryCollected ?? 0,
    courierCost: t?.courierCost ?? 0,
    packagingCost: t?.packagingCost ?? 0,
    extrasCost: t?.extrasCost ?? 0,
    productCost,
    grossProfit: revenueExCancelled - productCost - (t?.courierCost ?? 0) - (t?.packagingCost ?? 0) - (t?.extrasCost ?? 0),
    byStatus: Object.fromEntries(byStatus.map((row) => [row.status, row.count])),
    byDay: byDay.map((row) => ({ day: row.day, orders: row.orders, revenue: row.revenue })),
  };
}

export type ProductPerformanceRow = {
  productId: number | null;
  name: string;
  units: number;
  revenue: number;
  cost: number;
  profit: number;
};

export async function getProductPerformance(range: DateRange, limit = 20): Promise<ProductPerformanceRow[]> {
  const db = requireDb("রিপোর্ট");
  const rows = await db
    .select({
      productId: orderItems.productId,
      name: orderItems.productName,
      units: sql<number>`sum(${orderItems.quantity})::int`,
      revenue: sql<number>`coalesce(sum(${orderItems.lineTotal}),0)::int`,
      cost: sql<number>`coalesce(sum(coalesce(${orderItems.costPrice},0) * ${orderItems.quantity}),0)::int`,
    })
    .from(orderItems)
    .innerJoin(orders, eq(orderItems.orderId, orders.id))
    .where(and(gte(orders.createdAt, range.from), lte(orders.createdAt, range.to), sql`${orders.status} <> 'cancelled'`))
    .groupBy(orderItems.productId, orderItems.productName)
    .orderBy(desc(sql`sum(${orderItems.lineTotal})`))
    .limit(limit);

  return rows.map((row) => ({ ...row, profit: row.revenue - row.cost }));
}

export type FunnelRow = {
  landingPageId: number | null;
  title: string;
  slug: string | null;
  views: number;
  orders: number;
  revenue: number;
};

/** ফানেল — ল্যান্ডিং পেজ ভিউ বনাম অর্ডার (কনভার্শন) */
export async function getLandingFunnels(): Promise<FunnelRow[]> {
  const db = requireDb("রিপোর্ট");
  const pages = await db
    .select({ id: landingPages.id, title: landingPages.title, slug: landingPages.slug, viewCount: landingPages.viewCount, orderCount: landingPages.orderCount })
    .from(landingPages)
    .orderBy(desc(landingPages.viewCount))
    .limit(30);

  const revenueRows = await db
    .select({ landingPageId: orders.landingPageId, revenue: sql<number>`coalesce(sum(${orders.total}),0)::int` })
    .from(orders)
    .where(sql`${orders.landingPageId} IS NOT NULL`)
    .groupBy(orders.landingPageId);
  const revenueByPage = new Map(revenueRows.map((row) => [row.landingPageId, row.revenue]));

  return pages.map((page) => ({
    landingPageId: page.id,
    title: page.title,
    slug: page.slug,
    views: page.viewCount,
    orders: page.orderCount,
    revenue: revenueByPage.get(page.id) ?? 0,
  }));
}

export type CouponReportRow = {
  couponId: number;
  code: string;
  usedCount: number;
  discountTotal: number;
  orders: number;
  revenue: number;
};

export async function getCouponReport(range: DateRange): Promise<CouponReportRow[]> {
  const db = requireDb("রিপোর্ট");
  const rows = await db
    .select({
      couponId: coupons.id,
      code: coupons.code,
      usedCount: coupons.usedCount,
      discountTotal: sql<number>`coalesce(sum(${orders.discount}),0)::int`,
      orders: sql<number>`count(${orders.id})::int`,
      revenue: sql<number>`coalesce(sum(${orders.total}),0)::int`,
    })
    .from(coupons)
    .leftJoin(orders, and(eq(orders.couponId, coupons.id), gte(orders.createdAt, range.from), lte(orders.createdAt, range.to)))
    .groupBy(coupons.id, coupons.code, coupons.usedCount)
    .orderBy(desc(sql`count(${orders.id})`))
    .limit(50);
  return rows;
}

export type LowStockRow = { id: number; name: string; stock: number; lowStockThreshold: number };

export async function getLowStockReport(): Promise<LowStockRow[]> {
  const db = requireDb("রিপোর্ট");
  return db
    .select({ id: products.id, name: products.name, stock: products.stock, lowStockThreshold: products.lowStockThreshold })
    .from(products)
    .where(and(eq(products.status, "active"), eq(products.trackStock, true), sql`${products.stock} <= ${products.lowStockThreshold}`))
    .orderBy(products.stock)
    .limit(50);
}
