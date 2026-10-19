/**
 * ড্যাশবোর্ড মেট্রিক্স — মোট অর্ডার, পাইপলাইন, ডেলিভার্ড সেলস,
 * লো-স্টক, ফ্রড রিভিউ, অপারেশনাল ফেইলিওর।
 */

import { and, eq, gte, inArray, sql } from "drizzle-orm";
import { requireDb } from "../db";
import {
  notificationLogs,
  orders,
  products,
  productReviews,
  courierShipments,
} from "../db/schema";

export type DashboardMetrics = {
  totalOrders: number;
  pipeline: Record<string, number>;
  deliveredRevenue: number;
  todayOrders: number;
  lowStock: Array<{ id: number; name: string; stock: number }>;
  fraudReview: number;
  pendingReviews: number;
  failedNotifications: number;
  failedShipments: number;
  recentOrders: Array<{
    id: number;
    orderNumber: string;
    name: string;
    phone: string;
    total: number;
    status: string;
    createdAt: Date;
    fraudStatus: string;
  }>;
};

export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  const db = requireDb("ড্যাশবোর্ড");
  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);

  const [totals, pipelineRows, revenueRows, todayRows, lowStockRows, fraudRows, reviewRows, notifRows, shipRows, recentRows] =
    await Promise.all([
      db.select({ count: sql<number>`count(*)::int` }).from(orders),
      db.select({ status: orders.status, count: sql<number>`count(*)::int` }).from(orders).groupBy(orders.status),
      db
        .select({ total: sql<number>`coalesce(sum(${orders.total}),0)::int` })
        .from(orders)
        .where(eq(orders.status, "delivered")),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(orders)
        .where(gte(orders.createdAt, dayStart)),
      db
        .select({ id: products.id, name: products.name, stock: products.stock })
        .from(products)
        .where(
          and(
            eq(products.status, "active"),
            eq(products.trackStock, true),
            sql`${products.stock} <= ${products.lowStockThreshold}`,
          ),
        )
        .orderBy(products.stock)
        .limit(8),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(orders)
        .where(and(eq(orders.fraudStatus, "review"), inArray(orders.status, ["pending", "confirmed"]))),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(productReviews)
        .where(eq(productReviews.status, "pending")),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(notificationLogs)
        .where(inArray(notificationLogs.status, ["failed", "queued"])),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(courierShipments)
        .where(sql`${courierShipments.lastError} IS NOT NULL`),
      db.select().from(orders).orderBy(sql`${orders.createdAt} DESC`).limit(8),
    ]);

  const pipeline: Record<string, number> = {};
  for (const row of pipelineRows) pipeline[row.status] = row.count;

  return {
    totalOrders: totals[0]?.count ?? 0,
    pipeline,
    deliveredRevenue: revenueRows[0]?.total ?? 0,
    todayOrders: todayRows[0]?.count ?? 0,
    lowStock: lowStockRows,
    fraudReview: fraudRows[0]?.count ?? 0,
    pendingReviews: reviewRows[0]?.count ?? 0,
    failedNotifications: notifRows[0]?.count ?? 0,
    failedShipments: shipRows[0]?.count ?? 0,
    recentOrders: recentRows.map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      name: order.name,
      phone: order.phone,
      total: order.total,
      status: order.status,
      createdAt: order.createdAt,
      fraudStatus: order.fraudStatus,
    })),
  };
}
