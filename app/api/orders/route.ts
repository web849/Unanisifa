import { NextResponse } from "next/server";
import { checkoutSchema } from "@/lib/orders/validation";
import { scoreFraud } from "@/lib/orders/fraud-signals";
import { createOrder, ipNetworkStats, isBlockedNetwork } from "@/lib/orders/service";
import { getCommerce } from "@/lib/store/repository";
import { checkRateLimit } from "@/lib/auth/rate-limit";
import { guardMutation, jsonError, jsonOk, readJson, requestContext } from "@/lib/api/helpers";
import { isDatabaseConfigured } from "@/lib/db";
import { flushTrackingEvents } from "@/lib/integrations/meta";
import { processNotificationQueue } from "@/lib/integrations/notifications";
import { saveAbandonedCheckout } from "@/lib/orders/abandoned";
import { hashPhone } from "@/lib/security";
import { requireDb } from "@/lib/db";
import { customers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

/**
 * অর্ডার তৈরি API — সার্ভার-অথরিটেটিভ প্রাইসিং, idempotency, ফ্রড চেক।
 * হানি-পট পূরণ থাকলে নীরবে 400 (বটকে ফিডব্যাক নয়)।
 */
export async function POST(request: Request) {
  const guard = guardMutation(request);
  if (guard) return guard;

  const context = requestContext(request.headers);
  const body = await readJson<unknown>(request);
  const parsed = checkoutSchema.safeParse(body);

  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return jsonError(400, first?.message ?? "ফর্মের তথ্য সঠিক নয়।");
  }

  const input = parsed.data;

  // হানি-পট: মানুষ কখনো পূরণ করে না
  if (input.website && input.website.length > 0) {
    return jsonError(400, "ফর্মের তথ্য সঠিক নয়।");
  }

  if (!isDatabaseConfigured) {
    return jsonError(503, "ডেটাবেজ কনফিগার করা নেই — অর্ডার নেওয়া যাচ্ছে না। Vercel/Neon-এ DATABASE_URL সেট করুন।");
  }

  const rate = await checkRateLimit("order", context.clientIpHash);
  if (!rate.allowed) {
    return jsonError(429, `অনেকবার অর্ডার চেষ্টা হয়েছে। ${rate.retryAfterSeconds} সেকেন্ড পরে চেষ্টা করুন।`);
  }

  // ব্লক করা নেটওয়ার্ক থেকে নতুন অর্ডার সাথে সাথে রিজেক্ট
  if (await isBlockedNetwork(context.clientIpHash)) {
    return jsonError(403, "দুঃখিত, এই নেটওয়ার্ক থেকে অর্ডার গ্রহণ করা যাচ্ছে না। প্রয়োজনে কল করুন।");
  }

  const commerce = await getCommerce();

  // ফ্রড সিগন্যাল
  const stats = await ipNetworkStats(context.clientIpHash);
  const db = requireDb("অর্ডার");
  const customerRows = await db
    .select()
    .from(customers)
    .where(eq(customers.phone, input.phone))
    .limit(1);
  const customer = customerRows[0];

  const fraud = scoreFraud({
    submitDurationMs: input.formOpenedAt ? Date.now() - input.formOpenedAt : null,
    phone: input.phone,
    name: input.name,
    address: input.address,
    distinctPhonesFromIp24h: stats.distinctPhones,
    ordersFromIp24h: stats.orderCount,
    previousCancellations: customer?.cancelledCount ?? 0,
    customerCancelRate: customer?.successRate != null ? 100 - customer.successRate : 0,
  });

  const result = await createOrder({
    items: input.items.map((item) => ({
      productId: item.productId,
      variantId: item.variantId,
      quantity: item.quantity,
    })),
    name: input.name,
    phone: input.phone,
    email: input.email || null,
    address: input.address,
    area: input.area,
    note: input.note || null,
    couponCode: input.couponCode || null,
    idempotencyKey: input.idempotencyKey,
    landingSlug: input.landingSlug || null,
    campaign: input.campaign || null,
    commerce,
    clientIp: context.clientIp,
    clientIpHash: context.clientIpHash,
    userAgent: context.userAgent,
    fraud,
  });

  if (!result.ok) {
    const status = result.code === "duplicate_submission" ? 409 : result.code === "coupon_invalid" ? 422 : 400;
    return jsonError(status, result.error, { code: result.code });
  }

  // বেস্ট-এফোর্ট: কিউ ফ্লাশ (ব্যর্থ হলে অর্ডার ঠিক থাকে; ক্রন রিট্রাই করবে)
  void flushTrackingEvents().catch(() => undefined);
  void processNotificationQueue(5).catch(() => undefined);

  return jsonOk(
    {
      orderNumber: result.order.orderNumber,
      publicToken: result.order.publicToken,
      total: result.order.total,
      fraudStatus: result.order.fraudStatus,
    },
    201,
  );
}

/**
 * অ্যাবান্ডনড চেকআউট অটো-সেভ — নাম+মোবাইল+ঠিকানা মিনিমাম পূরণ হলে।
 * চেকআউট পেজ থেকে debounce করে কল হয়।
 */
export async function PUT(request: Request) {
  const guard = guardMutation(request);
  if (guard) return guard;
  const context = requestContext(request.headers);
  const body = await readJson<{
    name?: string;
    phone?: string;
    address?: string;
    area?: string;
    email?: string;
    items?: Array<{ productId?: number; quantity?: number }>;
    subtotal?: number;
    landingSlug?: string;
  }>(request);

  if (!body || !body.name || !body.phone || !body.address) {
    return jsonOk({ saved: false });
  }

  const parsedPhone = checkoutSchema.shape.phone.safeParse(body.phone);
  if (!parsedPhone.success) return jsonOk({ saved: false });
  if (body.address.trim().length < 8) return jsonOk({ saved: false });

  if (!isDatabaseConfigured) return jsonOk({ saved: false });

  await saveAbandonedCheckout({
    name: body.name,
    phone: parsedPhone.data,
    address: body.address,
    area: body.area === "outside_dhaka" ? "outside_dhaka" : "inside_dhaka",
    email: body.email ?? null,
    cartSnapshot: (body.items ?? []).map((item) => ({
      productId: Number(item.productId),
      quantity: Number(item.quantity),
    })),
    subtotal: Number(body.subtotal) || 0,
    landingSlug: body.landingSlug ?? null,
    ipHash: context.clientIpHash,
    userAgent: context.userAgent,
  }).catch(() => undefined);

  void hashPhone;
  return jsonOk({ saved: true });
}

export async function OPTIONS() {
  return NextResponse.json({}, { status: 204 });
}
