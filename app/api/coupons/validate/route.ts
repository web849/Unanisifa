import { eq } from "drizzle-orm";
import { db, isDatabaseConfigured } from "@/lib/db";
import { coupons, landingPages } from "@/lib/db/schema";
import { couponValidateSchema } from "@/lib/orders/validation";
import { evaluateCoupon, normalizeCouponCode, couponSummary } from "@/lib/coupons/rules";
import { checkRateLimit } from "@/lib/auth/rate-limit";
import { jsonError, jsonOk, requestContext } from "@/lib/api/helpers";
import { formatTaka } from "@/lib/utils";

export const dynamic = "force-dynamic";

/**
 * চেকআউট প্রিভিউ API — কুপন ভ্যালিডেশন (প্রিভিউ)।
 * অর্ডার ট্রানজেকশনের ভেতরে আবার ভ্যালিডেশন হয় (রেস কন্ডিশনে লিমিট ভাঙবে না)।
 * সব এরর বাংলায় ও স্পষ্ট।
 */
export async function POST(request: Request) {
  const context = requestContext(request.headers);
  const rate = await checkRateLimit("coupon", context.clientIpHash);
  if (!rate.allowed) {
    return jsonError(429, `অনেকবার চেষ্টা করা হয়েছে। ${rate.retryAfterSeconds} সেকেন্ড পর চেষ্টা করুন।`);
  }

  const body = couponValidateSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return jsonError(400, "কুপন কোড ও কার্টের মূল্য পাঠান।");
  }

  if (!isDatabaseConfigured || !db) {
    return jsonError(503, "ডেটাবেজ কনফিগার করা নেই — কুপন যাচাই করা যাচ্ছে না।");
  }

  const code = normalizeCouponCode(body.data.code);
  const couponRows = await db.select().from(coupons).where(eq(coupons.code, code)).limit(1);
  const coupon = couponRows[0] ?? null;

  let landingPageId: number | null = null;
  if (body.data.landingSlug) {
    const landing = await db
      .select({ id: landingPages.id })
      .from(landingPages)
      .where(eq(landingPages.slug, body.data.landingSlug))
      .limit(1);
    landingPageId = landing[0]?.id ?? null;
  }

  // প্রিভিউতে phone না থাকায় per-phone লিমিট ০ ধরা হয়; অর্ডারে আসল চেক হয়
  const evaluation = evaluateCoupon(coupon, {
    subtotal: body.data.subtotal,
    now: new Date(),
    phoneUsedCount: 0,
    landingPageId,
  });

  if (!evaluation.ok) {
    return jsonError(422, evaluation.error, { code: evaluation.code });
  }

  const waiver =
    coupon?.type === "free_delivery"
      ? Math.min(coupon.maxDiscount ?? coupon.value, coupon.value)
      : 0;

  return jsonOk({
    code: coupon?.code ?? code,
    title: coupon?.title ?? "",
    summary: coupon ? couponSummary(coupon) : "",
    discount: evaluation.discount,
    deliveryWaiver: waiver,
    discountText: evaluation.discount > 0 ? `-${formatTaka(evaluation.discount)}` : "",
  });
}
