import { eq } from "drizzle-orm";
import { checkRateLimit } from "@/lib/auth/rate-limit";
import { jsonError, jsonOk, readJson, requestContext } from "@/lib/api/helpers";
import { isDatabaseConfigured, requireDb } from "@/lib/db";
import { coupons, mysteryOfferClaims } from "@/lib/db/schema";
import { bdPhoneSchema } from "@/lib/orders/validation";
import { hashPhone } from "@/lib/security";
import {
  isClaimValid,
  MYSTERY_MIN_SUBTOTAL,
  mysteryExpiry,
  pickMysteryCouponCode,
} from "@/lib/offers/mystery-rules";
import { z } from "zod";

export const dynamic = "force-dynamic";

/**
 * মিস্ট্রি অফার — নাম+মোবাইল দিলে একটি কুপন রিভিল হয়।
 * এক নম্বরে একবার; আগে ক্লেইম থাকলে সেই কোডই ফেরত যায়।
 */
export async function POST(request: Request) {
  const context = requestContext(request.headers);
  const rate = await checkRateLimit("mystery", context.clientIpHash);
  if (!rate.allowed) {
    return jsonError(429, `অনেকবার চেষ্টা হয়েছে। ${rate.retryAfterSeconds} সেকেন্ড পরে চেষ্টা করুন।`);
  }

  if (!isDatabaseConfigured) {
    return jsonError(503, "ডেটাবেজ কনফিগার করা নেই — অফার নেওয়া যাচ্ছে না।");
  }

  const body = z
    .object({ name: z.string().trim().max(80).optional(), phone: bdPhoneSchema })
    .safeParse(await readJson<unknown>(request));
  if (!body.success) {
    return jsonError(400, body.error.issues[0]?.message ?? "মোবাইল নম্বর সঠিক নয়।");
  }

  const db = requireDb("মিস্ট্রি অফার");
  const phone = body.data.phone;
  const phoneHash = hashPhone(phone);

  const existing = await db
    .select()
    .from(mysteryOfferClaims)
    .where(eq(mysteryOfferClaims.phoneNormalized, phone))
    .limit(1);

  if (existing[0]) {
    if (isClaimValid(existing[0].expiresAt)) {
      return jsonOk({
        claim: {
          code: existing[0].couponCode,
          expiresAt: existing[0].expiresAt.toISOString(),
          minSubtotal: MYSTERY_MIN_SUBTOTAL,
        },
      });
    }
    // মেয়াদ শেষ → নতুন ক্লেই নয় (এক নম্বরে একবার): স্পষ্ট বার্তা
    return jsonError(409, "এই নম্বরে আগেই মিস্ট্রি অফার নেওয়া হয়েছে।");
  }

  const code = pickMysteryCouponCode(phoneHash);
  const couponExists = await db.select({ id: coupons.id }).from(coupons).where(eq(coupons.code, code)).limit(1);
  if (couponExists.length === 0) {
    return jsonError(503, "মিস্ট্রি অফারের কুপন সেটআপ করা নেই — অ্যাডমিন থেকে সিড চালান।");
  }

  const [claim] = await db
    .insert(mysteryOfferClaims)
    .values({
      phone,
      phoneNormalized: phone,
      phoneHash,
      name: body.data.name || null,
      couponCode: code,
      claimedAt: new Date(),
      expiresAt: mysteryExpiry(),
      ipHash: context.clientIpHash,
    })
    .returning();

  return jsonOk(
    {
      claim: {
        code: claim.couponCode,
        expiresAt: claim.expiresAt.toISOString(),
        minSubtotal: MYSTERY_MIN_SUBTOTAL,
      },
    },
    201,
  );
}

/** আগে ক্লেইম করা কোড যাচাই (রিলোডে দেখানোর জন্য) */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = (url.searchParams.get("code") ?? "").trim().toUpperCase();
  if (!code) return jsonOk({ claim: null });
  if (!isDatabaseConfigured) return jsonOk({ claim: null });

  const db = requireDb("মিস্ট্রি অফার");
  const rows = await db
    .select()
    .from(mysteryOfferClaims)
    .where(eq(mysteryOfferClaims.couponCode, code))
    .limit(1);
  const claim = rows[0];
  if (!claim || !isClaimValid(claim.expiresAt)) return jsonOk({ claim: null });

  return jsonOk({
    claim: {
      code: claim.couponCode,
      expiresAt: claim.expiresAt.toISOString(),
      minSubtotal: MYSTERY_MIN_SUBTOTAL,
    },
  });
}
