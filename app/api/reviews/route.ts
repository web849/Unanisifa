import { and, eq } from "drizzle-orm";
import { reviewSchema } from "@/lib/orders/validation";
import { checkRateLimit } from "@/lib/auth/rate-limit";
import { guardMutation, jsonError, jsonOk, readJson, requestContext } from "@/lib/api/helpers";
import { isDatabaseConfigured, requireDb } from "@/lib/db";
import { orders, productReviews } from "@/lib/db/schema";
import { hashPhone } from "@/lib/security";
import { PROHIBITED_CLAIMS } from "@/lib/config";

export const dynamic = "force-dynamic";

/**
 * রিভিউ সাবমিট — সবসময় pending যায় (PDP-তে সাথে সাথে দেখায় না)।
 * delivered অর্ডার থাকলে isVerified = true (অ্যাডমিনে ব্যাজ)।
 */
export async function POST(request: Request) {
  const guard = guardMutation(request);
  if (guard) return guard;

  const context = requestContext(request.headers);
  const rate = await checkRateLimit("review", context.clientIpHash);
  if (!rate.allowed) {
    return jsonError(429, `অনেক রিভিউ পাঠানো হয়েছে। ${rate.retryAfterSeconds} সেকেন্ড পরে চেষ্টা করুন।`);
  }

  const parsed = reviewSchema.safeParse(await readJson<unknown>(request));
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return jsonError(400, first?.message ?? "রিভিউর তথ্য সঠিক নয়।");
  }

  if (!isDatabaseConfigured) {
    return jsonError(503, "ডেটাবেজ কনফিগার করা নেই — রিভিউ সংরক্ষণ করা যাচ্ছে না।");
  }

  const db = requireDb("রিভিউ");
  const input = parsed.data;

  const deliveredOrder = await db
    .select({ id: orders.id })
    .from(orders)
    .where(
      and(
        eq(orders.phoneNormalized, input.phone),
        eq(orders.status, "delivered"),
      ),
    )
    .limit(1);

  const [review] = await db
    .insert(productReviews)
    .values({
      productId: input.productId,
      customerName: input.name,
      phone: input.phone,
      phoneHash: hashPhone(input.phone),
      rating: input.rating,
      comment: input.comment,
      status: "pending",
      isVerified: deliveredOrder.length > 0,
      ipHash: context.clientIpHash,
    })
    .returning();

  return jsonOk({ id: review.id, status: "pending" }, 201);
}

export { PROHIBITED_CLAIMS };
