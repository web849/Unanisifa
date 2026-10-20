/**
 * অর্ডার ইঞ্জিন — সার্ভার-অথরিটেটিভ, ট্রানজেকশনাল।
 *
 * ফ্লো (স্পেক ৭ঙ):
 * অ্যাডভাইজরি লক → idempotency চেক → ফিঙ্গারপ্রিন্ট ডুপ্লিকেট ব্লক →
 * স্টক চেক (FOR UPDATE) → কুপন পুনরায় ভ্যালিডেশন → প্রাইসিং →
 * অর্ডার + আইটেম + স্ট্যাটাস হিস্টরি → কুপন রিডেম্পশন → কাস্টমার upsert →
 * নোটিফিকেশন কিউ → ট্র্যাকিং কিউ → অ্যাবান্ডনড recovered
 */

import { and, eq, gte, sql } from "drizzle-orm";
import { randomBytes, createHash } from "node:crypto";
import { requireDb } from "../db";
import {
  abandonedCheckouts,
  couponRedemptions,
  coupons,
  customers,
  orders,
  orderItems,
  orderStatusHistory,
  landingPages,
  type Order,
} from "../db/schema";
import type { CommerceSettings } from "../config";
import { computePricing } from "./pricing";
import { evaluateCoupon, normalizeCouponCode } from "../coupons/rules";
import {
  DUPLICATE_WINDOW_MS,
  fingerprintParts,
  generateOrderNumber,
  randomOrderSuffix,
  type OrderStatusValue,
} from "./status";
import type { FraudResult } from "./fraud-signals";
import { hashPhone } from "../security";
import { compactDateInDhaka } from "../utils";
import { enqueueOrderNotifications } from "../integrations/notifications";
import { enqueueTrackingEvent } from "../integrations/meta";

export type CreateOrderInput = {
  items: Array<{ productId: number; variantId: number | null; quantity: number }>;
  name: string;
  phone: string;
  email?: string | null;
  address: string;
  area: "inside_dhaka" | "outside_dhaka";
  note?: string | null;
  couponCode?: string | null;
  idempotencyKey: string;
  landingSlug?: string | null;
  campaign?: string | null;
  commerce: CommerceSettings;
  clientIp: string;
  clientIpHash: string;
  userAgent: string | null;
  fraud: FraudResult;
};

export type CreateOrderResult =
  | { ok: true; order: Order }
  | { ok: false; error: string; code: OrderErrorCode };

export type OrderErrorCode =
  | "empty_cart"
  | "product_unavailable"
  | "stock_insufficient"
  | "coupon_invalid"
  | "duplicate_submission"
  | "database";

export class OrderServiceError extends Error {
  code: OrderErrorCode;
  constructor(code: OrderErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = "OrderServiceError";
  }
}

/**
 * অর্ডার তৈরি — একটি ট্রানজেকশনে সবকিছু।
 * ব্যর্থ হলে পুরো ট্রানজেকশন রোলব্যাক হয়; আংশিক অর্ডার কখনো থাকে না।
 */
export async function createOrder(input: CreateOrderInput): Promise<CreateOrderResult> {
  const db = requireDb("অর্ডার তৈরি");

  try {
    return await db.transaction(async (tx) => {
      /* ---- ১) অ্যাডভাইজরি লক: একই ফিঙ্গারপ্রিন্টের সমান্তরাল সাবমিট সিরিয়ালাইজ ---- */
      const fingerprint = createHash("sha256")
        .update(
          fingerprintParts({
            phone: input.phone,
            address: input.address,
            items: input.items,
            landingSlug: input.landingSlug ?? "",
          }),
        )
        .digest("hex");

      const lockKey = Number(BigInt(`0x${fingerprint.slice(0, 15)}`) % BigInt(2 ** 31));
      await tx.execute(sql`SELECT pg_advisory_xact_lock(${lockKey})`);

      /* ---- ২) Idempotency: একই কী-তে দ্বিতীয় কল নতুন অর্ডার বানাবে না ---- */
      const existingByIdempotency = await tx
        .select()
        .from(orders)
        .where(eq(orders.idempotencyKey, input.idempotencyKey))
        .limit(1);
      if (existingByIdempotency[0]) {
        return { ok: true as const, order: existingByIdempotency[0] };
      }

      /* ---- ৩) ৫ মিনিটে একই ফিঙ্গারপ্রিন্ট → ডুপ্লিকেট ব্লক ---- */
      const windowStart = new Date(Date.now() - DUPLICATE_WINDOW_MS);
      const duplicate = await tx
        .select({ id: orders.id })
        .from(orders)
        .where(
          and(
            eq(orders.orderFingerprint, fingerprint),
            gte(orders.createdAt, windowStart),
          ),
        )
        .limit(1);
      if (duplicate[0]) {
        return {
          ok: false as const,
          error: "একই তথ্য দিয়ে অল্প সময়ের মধ্যে আরেকটি অর্ডার জমা হয়েছে। একটু পরে চেষ্টা করুন বা আগের অর্ডারটি দেখুন।",
          code: "duplicate_submission" as const,
        };
      }

      /* ---- ৪) পণ্য ও স্টক (FOR UPDATE) ---- */
      if (input.items.length === 0) {
        return { ok: false as const, error: "কার্ট খালি।", code: "empty_cart" as const };
      }

      const productIds = [...new Set(input.items.map((item) => item.productId))];
      const lockedProducts = await tx.execute(sql`
        SELECT id, name, slug, price, compare_at_price, cost_price, stock, track_stock, status
        FROM products
        WHERE id = ANY(${productIds})
        FOR UPDATE
      `);
      const productRows = (lockedProducts as unknown as { rows: ProductLockRow[] }).rows ?? [];
      const productMap = new Map(productRows.map((row) => [row.id, row]));

      const variantIds = input.items
        .map((item) => item.variantId)
        .filter((value): value is number => value != null);
      const lockedVariants =
        variantIds.length > 0
          ? await tx.execute(sql`
              SELECT id, product_id, name, price_delta, stock, active
              FROM product_variants
              WHERE id = ANY(${variantIds})
              FOR UPDATE
            `)
          : { rows: [] as VariantLockRow[] };
      const variantRows = (lockedVariants as unknown as { rows: VariantLockRow[] }).rows ?? [];
      const variantMap = new Map(variantRows.map((row) => [row.id, row]));

      const lines: Array<{
        productId: number;
        variantId: number | null;
        quantity: number;
        unitPrice: number;
        compareAtPrice: number | null;
        costPrice: number | null;
        productName: string;
        variantName: string | null;
        sku: string | null;
      }> = [];

      for (const item of input.items) {
        const product = productMap.get(item.productId);
        if (!product || product.status !== "active") {
          return {
            ok: false as const,
            error: "একটি পণ্য এখন আর কেনা যাচ্ছে না। কার্ট আপডেট করে আবার চেষ্টা করুন।",
            code: "product_unavailable" as const,
          };
        }
        let unitPrice = product.price;
        let variantName: string | null = null;
        if (item.variantId != null) {
          const variant = variantMap.get(item.variantId);
          if (!variant || variant.product_id !== product.id || !variant.active) {
            return {
              ok: false as const,
              error: "নির্বাচিত ভ্যারিয়েন্টটি আর নেই।",
              code: "product_unavailable" as const,
            };
          }
          unitPrice = product.price + variant.price_delta;
          variantName = variant.name;
          if (product.track_stock && variant.stock < item.quantity) {
            return {
              ok: false as const,
              error: `"${product.name}" (${variant.name})-এর পর্যাপ্ত স্টক নেই।`,
              code: "stock_insufficient" as const,
            };
          }
        } else if (product.track_stock && product.stock < item.quantity) {
          return {
            ok: false as const,
            error: `"${product.name}"-এর পর্যাপ্ত স্টক নেই (বাকি ${Math.max(product.stock, 0)}টি)।`,
            code: "stock_insufficient" as const,
          };
        }
        lines.push({
          productId: product.id,
          variantId: item.variantId,
          quantity: item.quantity,
          unitPrice,
          compareAtPrice: product.compare_at_price,
          costPrice: product.cost_price,
          productName: product.name,
          variantName,
          sku: null,
        });
      }

      /* ---- ৫) ল্যান্ডিং পেজ ও কুপন পুনরায় ভ্যালিডেশন ---- */
      let landingPageId: number | null = null;
      if (input.landingSlug) {
        const landing = await tx
          .select({ id: landingPages.id })
          .from(landingPages)
          .where(eq(landingPages.slug, input.landingSlug))
          .limit(1);
        landingPageId = landing[0]?.id ?? null;
      }

      let couponRow: (typeof coupons.$inferSelect) | null = null;
      let couponDiscount = 0;
      if (input.couponCode?.trim()) {
        const code = normalizeCouponCode(input.couponCode);
        const couponRows = await tx.execute(sql`
          SELECT * FROM coupons WHERE code = ${code} FOR UPDATE
        `);
        couponRow = ((couponRows as unknown as { rows: (typeof coupons.$inferSelect)[] }).rows ?? [])[0] ?? null;

        const phoneHash = hashPhone(input.phone);
        const redemptionCount = await tx
          .select({ count: sql<number>`count(*)::int` })
          .from(couponRedemptions)
          .where(
            and(
              eq(couponRedemptions.couponId, couponRow?.id ?? 0),
              eq(couponRedemptions.phoneHash, phoneHash),
            ),
          );

        const evaluation = evaluateCoupon(couponRow, {
          subtotal: lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0),
          now: new Date(),
          phoneUsedCount: redemptionCount[0]?.count ?? 0,
          landingPageId,
        });
        if (!evaluation.ok) {
          return {
            ok: false as const,
            error: evaluation.error,
            code: "coupon_invalid" as const,
          };
        }
        couponDiscount = evaluation.discount;
      }

      /* ---- ৬) প্রাইসিং (সার্ভারে) ---- */
      const isSafajinOffer =
        input.landingSlug === "safajin" &&
        lines.length === 1 &&
        productMap.get(lines[0]!.productId)?.slug === "safajin-safa-ambari";
      const pricing = computePricing({
        lines: lines.map((line) => ({ unitPrice: line.unitPrice, quantity: line.quantity })),
        coupon: couponRow,
        couponDiscount,
        area: input.area,
        commerce: isSafajinOffer
          ? { ...input.commerce, freeDeliveryThreshold: 1 }
          : input.commerce,
        advance: input.commerce.defaultAdvance,
      });

      /* ---- ৭) অর্ডার + আইটেম + হিস্টরি ---- */
      const orderNumber = generateOrderNumber(
        compactDateInDhaka(),
        randomOrderSuffix(randomBytes(16)),
      );
      const publicToken = randomBytes(20).toString("hex");

      const courierCost =
        input.area === "inside_dhaka" ? input.commerce.courierCostInside : input.commerce.courierCostOutside;

      const [order] = await tx
        .insert(orders)
        .values({
          orderNumber,
          publicToken,
          landingPageId,
          status: input.fraud.status === "review" ? "pending" : "pending",
          paymentStatus: "unpaid",
          paymentMethod: "cod",
          subtotal: pricing.subtotal,
          discount: pricing.discount,
          deliveryCharge: pricing.deliveryCharge,
          total: pricing.total,
          advance: pricing.advance,
          dueAmount: pricing.dueAmount,
          couponId: couponRow?.id ?? null,
          couponCode: couponRow?.code ?? null,
          name: input.name,
          phone: input.phone,
          phoneNormalized: input.phone,
          email: input.email || null,
          address: input.address,
          area: input.area,
          note: input.note || null,
          idempotencyKey: input.idempotencyKey,
          orderFingerprint: fingerprint,
          clientIp: null, // প্লেইন IP রাখি না — শুধু হ্যাশ
          clientIpHash: input.clientIpHash,
          userAgent: input.userAgent,
          fraudScore: input.fraud.score,
          fraudReasons: input.fraud.reasons,
          fraudStatus: input.fraud.status,
          courierCost,
          packagingCost: input.commerce.packagingCost,
          extrasCost: input.commerce.perOrderExtras,
          source: input.landingSlug ? "landing" : "store",
          campaign: input.campaign || null,
        })
        .returning();

      await tx.insert(orderItems).values(
        lines.map((line) => ({
          orderId: order.id,
          productId: line.productId,
          variantId: line.variantId,
          productName: line.productName,
          variantName: line.variantName,
          sku: line.sku,
          imageUrl: null,
          unitPrice: line.unitPrice,
          compareAtPrice: line.compareAtPrice,
          costPrice: line.costPrice,
          quantity: line.quantity,
          lineTotal: line.unitPrice * line.quantity,
        })),
      );

      await tx.insert(orderStatusHistory).values({
        orderId: order.id,
        fromStatus: null,
        toStatus: "pending" as OrderStatusValue,
        note:
          input.fraud.status === "review"
            ? "ফ্রড রিভিউতে hold করা হয়েছে"
            : "অর্ডার জমা হয়েছে",
        actor: "system",
      });

      /* ---- ৮) স্টক ডিডাকশন ---- */
      for (const line of lines) {
        if (line.variantId != null) {
          await tx.execute(sql`
            UPDATE product_variants SET stock = stock - ${line.quantity} WHERE id = ${line.variantId}
          `);
        }
        await tx.execute(sql`
          UPDATE products
          SET stock = CASE WHEN track_stock THEN stock - ${line.quantity} ELSE stock END,
              order_count = order_count + 1
          WHERE id = ${line.productId}
        `);
      }

      /* ---- ৯) কুপন রিডেম্পশন ---- */
      if (couponRow) {
        await tx
          .update(coupons)
          .set({ usedCount: sql`${coupons.usedCount} + 1`, updatedAt: new Date() })
          .where(eq(coupons.id, couponRow.id));
        await tx.insert(couponRedemptions).values({
          couponId: couponRow.id,
          orderId: order.id,
          phone: input.phone,
          phoneHash: hashPhone(input.phone),
          ipHash: input.clientIpHash,
          amount: pricing.discount + pricing.deliveryWaiver,
        });
      }

      /* ---- ১০) কাস্টমার upsert + হিস্টরি ---- */
      const phoneHash = hashPhone(input.phone);
      const existingCustomer = await tx
        .select()
        .from(customers)
        .where(eq(customers.phone, input.phone))
        .limit(1);
      if (existingCustomer[0]) {
        await tx
          .update(customers)
          .set({
            name: input.name,
            email: input.email || existingCustomer[0].email,
            address: input.address,
            area: input.area,
            orderCount: sql`${customers.orderCount} + 1`,
            totalSpent: sql`${customers.totalSpent} + ${pricing.total}`,
            lastOrderAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(customers.id, existingCustomer[0].id));
        await tx
          .update(orders)
          .set({ customerId: existingCustomer[0].id })
          .where(eq(orders.id, order.id));
      } else {
        const [customer] = await tx
          .insert(customers)
          .values({
            phone: input.phone,
            phoneHash,
            name: input.name,
            email: input.email || null,
            address: input.address,
            area: input.area,
            orderCount: 1,
            totalSpent: pricing.total,
            lastOrderAt: new Date(),
          })
          .returning();
        await tx.update(orders).set({ customerId: customer.id }).where(eq(orders.id, order.id));
      }

      /* ---- ১১) অ্যাবান্ডনড চেকআউট recovered ---- */
      await tx
        .update(abandonedCheckouts)
        .set({ status: "recovered", recoveredOrderId: order.id, updatedAt: new Date() })
        .where(
          and(
            eq(abandonedCheckouts.phoneNormalized, input.phone),
            eq(abandonedCheckouts.status, "open"),
          ),
        );

      /* ---- ১২) নোটিফিকেশন ও ট্র্যাকিং কিউ ---- */
      await enqueueOrderNotifications(tx, order, lines);
      await enqueueTrackingEvent(tx, {
        eventName: "Purchase",
        orderId: order.id,
        payload: {
          value: pricing.total,
          currency: input.commerce.currency,
          content_ids: lines.map((line) => line.productId),
        },
        // Purchase ইভেন্ট পরে status trigger অনুযায়ী পাঠানো হয়; এখানে কিউতে রাখি
        deferUntilTrigger: true,
      });
      await enqueueTrackingEvent(tx, {
        eventName: "InitiateCheckout",
        orderId: order.id,
        payload: { value: pricing.subtotal, currency: input.commerce.currency },
      });

      return { ok: true as const, order };
    });
  } catch (error) {
    if (error instanceof OrderServiceError) {
      return { ok: false, error: error.message, code: error.code };
    }
    return {
      ok: false,
      error: `অর্ডার সংরক্ষণ করা যায়নি: ${error instanceof Error ? error.message : "অজানা এরর"}`,
      code: "database",
    };
  }
}

type ProductLockRow = {
  id: number;
  name: string;
  slug: string;
  price: number;
  compare_at_price: number | null;
  cost_price: number | null;
  stock: number;
  track_stock: boolean;
  status: string;
};

type VariantLockRow = {
  id: number;
  product_id: number;
  name: string;
  price_delta: number;
  stock: number;
  active: boolean;
};

/**
 * স্ট্যাটাস পরিবর্তন — অবৈধ ট্রানজিশন রিজেক্ট, হিস্টরি + অডিট,
 * cancel হলে স্টক একবারই ফেরত (stockRestored ফ্ল্যাগ)।
 */
export async function changeOrderStatus(
  orderId: number,
  to: OrderStatusValue,
  actor: { actorId: string | null; actorName: string; ipHash: string | null },
  note?: string,
): Promise<{ ok: boolean; error?: string }> {
  const db = requireDb("স্ট্যাটাস পরিবর্তন");
  const { canTransition } = await import("./status");

  return db.transaction(async (tx) => {
    const locked = await tx.execute(sql`SELECT * FROM orders WHERE id = ${orderId} FOR UPDATE`);
    const order = (locked as unknown as { rows: Order[] }).rows?.[0];
    if (!order) return { ok: false, error: "অর্ডার পাওয়া যায়নি" };

    if (!canTransition(order.status as OrderStatusValue, to)) {
      return { ok: false, error: `অবৈধ স্ট্যাটাস পরিবর্তন: ${order.status} থেকে ${to}` };
    }

    const updates: Partial<typeof orders.$inferInsert> = { status: to, updatedAt: new Date() };
    if (to === "confirmed") updates.confirmedAt = new Date();
    if (to === "shipped") updates.shippedAt = new Date();
    if (to === "delivered") {
      updates.deliveredAt = new Date();
      updates.paymentStatus = "paid";
    }
    if (to === "cancelled") updates.cancelledAt = new Date();

    await tx.update(orders).set(updates).where(eq(orders.id, orderId));
    await tx.insert(orderStatusHistory).values({
      orderId,
      fromStatus: order.status as OrderStatusValue,
      toStatus: to,
      note: note ?? null,
      actor: "admin",
      actorUserId: actor.actorId ? actor.actorId : null,
    });

    /* ক্যানসেলে স্টক একবারই ফেরত */
    if (to === "cancelled" && !order.stockRestored) {
      const items = await tx.select().from(orderItems).where(eq(orderItems.orderId, orderId));
      for (const item of items) {
        if (item.productId == null) continue;
        if (item.variantId != null) {
          await tx.execute(sql`
            UPDATE product_variants SET stock = stock + ${item.quantity} WHERE id = ${item.variantId}
          `);
        }
        await tx.execute(sql`
          UPDATE products SET stock = CASE WHEN track_stock THEN stock + ${item.quantity} ELSE stock END
          WHERE id = ${item.productId}
        `);
      }
      await tx.update(orders).set({ stockRestored: true }).where(eq(orders.id, orderId));
    }

    /* delivered হলে কাস্টমার stats আপডেট */
    if (to === "delivered" || to === "cancelled") {
      const column = to === "delivered" ? customers.deliveredCount : customers.cancelledCount;
      await tx.execute(sql`
        UPDATE customers
        SET ${column} = ${column} + 1,
            success_rate = CASE WHEN order_count > 0
              THEN LEAST(100, (delivered_count::float / GREATEST(order_count, 1)) * 100)::int
              ELSE 0 END,
            updated_at = now()
        WHERE phone = ${order.phoneNormalized}
      `);
    }

    await enqueueOrderNotifications(tx, { ...order, status: to }, []);

    return { ok: true };
  });
}

/** একই IP থেকে গত ২৪ ঘণ্টার পরিসংখ্যান (ফ্রড সিগন্যালে ব্যবহৃত) */
export async function ipNetworkStats(clientIpHash: string) {
  const db = requireDb("ফ্রড পরিসংখ্যান");
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const rows = await db
    .select({
      distinctPhones: sql<number>`count(DISTINCT ${orders.phoneNormalized})::int`,
      orderCount: sql<number>`count(*)::int`,
    })
    .from(orders)
    .where(and(eq(orders.clientIpHash, clientIpHash), gte(orders.createdAt, since)));
  return {
    distinctPhones: rows[0]?.distinctPhones ?? 0,
    orderCount: rows[0]?.orderCount ?? 0,
  };
}

/** ব্লক করা নেটওয়ার্ক থেকে অর্ডার কি না */
export async function isBlockedNetwork(clientIpHash: string): Promise<boolean> {
  const db = requireDb("ব্লকড নেটওয়ার্ক চেক");
  const { blockedNetworks } = await import("../db/schema");
  const rows = await db
    .select({ id: blockedNetworks.id })
    .from(blockedNetworks)
    .where(and(eq(blockedNetworks.ipHash, clientIpHash), eq(blockedNetworks.active, true)))
    .limit(1);
  return rows.length > 0;
}
