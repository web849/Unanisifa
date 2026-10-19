import { eq } from "drizzle-orm";
import { leadSchema } from "@/lib/orders/validation";
import { checkRateLimit } from "@/lib/auth/rate-limit";
import { guardMutation, jsonError, jsonOk, readJson, requestContext } from "@/lib/api/helpers";
import { isDatabaseConfigured, requireDb } from "@/lib/db";
import { landingPages, leads } from "@/lib/db/schema";
import { enqueueTrackingEvent } from "@/lib/integrations/meta";
import { hashPhone } from "@/lib/security";

export const dynamic = "force-dynamic";

/**
 * লিড সংরক্ষণ — পপআপ, মিস্ট্রি অফার ও ইনলাইন ফর্ম থেকে।
 * শুধু লিড তালিকা ও CSV; কোনো রিটার্গেটিং/অডিয়েন্স সিস্টেম নেই।
 * Meta Lead ইভেন্টে নাম বা ফোন পাঠানো হয় না।
 */
export async function POST(request: Request) {
  const guard = guardMutation(request);
  if (guard) return guard;

  const context = requestContext(request.headers);
  const rate = await checkRateLimit("lead", context.clientIpHash);
  if (!rate.allowed) {
    return jsonError(429, `অনেকবার পাঠানো হয়েছে। ${rate.retryAfterSeconds} সেকেন্ড পরে চেষ্টা করুন।`);
  }

  const parsed = leadSchema.safeParse(await readJson<unknown>(request));
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return jsonError(400, first?.message ?? "তথ্য সঠিক নয়।");
  }

  if (!isDatabaseConfigured) {
    return jsonError(503, "ডেটাবেজ কনফিগার করা নেই — লিড সংরক্ষণ করা যাচ্ছে না।");
  }

  const db = requireDb("লিড");
  const input = parsed.data;

  let landingPageId: number | null = null;
  if (input.landingSlug) {
    const rows = await db
      .select({ id: landingPages.id })
      .from(landingPages)
      .where(eq(landingPages.slug, input.landingSlug))
      .limit(1);
    landingPageId = rows[0]?.id ?? null;
  }

  const [lead] = await db
    .insert(leads)
    .values({
      name: input.name || null,
      phone: input.phone,
      phoneNormalized: input.phone,
      phoneHash: hashPhone(input.phone),
      email: input.email || null,
      source: input.source,
      popupLabel: input.popupLabel || null,
      landingPageId,
      campaign: input.campaign || null,
      smsConsent: input.smsConsent,
      ipHash: context.clientIpHash,
    })
    .returning();

  await db.transaction(async (tx) => {
    await enqueueTrackingEvent(tx, {
      eventName: "Lead",
      entityType: "lead",
      entityId: String(lead.id),
      // পপআপ Lead ইভেন্টে নাম/ফোন পাঠানো হয় না
      payload: { source: input.source, content_type: "popup_lead" },
    });
  });

  return jsonOk({ id: lead.id }, 201);
}
