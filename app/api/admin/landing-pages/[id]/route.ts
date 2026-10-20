import { and, eq, ne } from "drizzle-orm";
import { guardMutation, jsonError, jsonOk, readJson, requestContext } from "@/lib/api/helpers";
import { getAdminSession } from "@/lib/auth/session";
import { requireAdminWrite } from "@/lib/admin/guard";
import { isDatabaseConfigured, requireDb } from "@/lib/db";
import { landingPages } from "@/lib/db/schema";
import type { LandingSection } from "@/lib/landing/sections";
import { buildProductIdMap, collectProductIds, remapProductIds, remapSectionProductIds } from "@/lib/landing/resolve-products";
import { audit } from "@/lib/auth/audit";
import { slugify } from "@/lib/utils";
import { describeZodIssues, landingPageBaseSchema } from "../route";

export const dynamic = "force-dynamic";

/** PATCH — ল্যান্ডিং পেজ আপডেট (sections সহ) */
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const guard = guardMutation(request);
  if (guard) return guard;
  const reqContext = requestContext(request.headers);
  const session = await getAdminSession();
  const denied = await requireAdminWrite(session, reqContext.clientIpHash, "landing");
  if (denied) return denied;

  if (!isDatabaseConfigured) {
    return jsonError(503, "ডেটাবেজ কনফিগার করা নেই — DATABASE_URL সেট না করলে ল্যান্ডিং পেজ সেভ করা যাবে না।");
  }

  const { id } = await context.params;
  const parsed = landingPageBaseSchema.partial().safeParse(await readJson<unknown>(request));
  if (!parsed.success) {
    const flat = parsed.error.flatten();
    const detail = describeZodIssues(flat);
    return jsonError(400, detail ? `Invalid landing page data — ${detail}` : "Invalid landing page data", flat);
  }
  const data = parsed.data;

  if (data.sections) {
    const popups = data.sections.filter((section) => section.type === "popup" && !section.hidden).length;
    if (popups > 3) return jsonError(400, "Maximum 3 popup sections per page");
  }

  const pageId = Number(id);
  if (!Number.isInteger(pageId) || pageId <= 0) return jsonError(400, "Invalid page id");

  try {
    const db = requireDb("ল্যান্ডিং");

    // ডেমো-আইডি → আসল আইডি ম্যাপিং; main product না মিললে স্পষ্ট 400 (FK 500 নয়)।
    const idMap = await buildProductIdMap(
      db,
      collectProductIds({
        productId: data.productId ?? null,
        checkoutOffers: data.checkoutOffers,
        thankYouOffers: data.thankYouOffers,
        sections: data.sections as LandingSection[] | undefined,
      }),
    );
    if (data.productId) {
      if (!idMap.has(data.productId)) {
        return jsonError(
          400,
          "নির্বাচিত পণ্যটি ডেটাবেজে পাওয়া যায়নি। ডেমো ক্যাটালগ ইমপোর্ট করুন অথবা Products থেকে আসল পণ্য বেছে নিন।",
        );
      }
    }

    const values: Record<string, unknown> = { updatedAt: new Date() };
    if (data.title !== undefined) values.title = data.title;
    if (data.slug !== undefined) {
      const slug = slugify(data.slug || data.title || "");
      if (!slug) return jsonError(400, "Could not generate a slug — use letters or Bangla text");
      const clash = await db
        .select({ id: landingPages.id })
        .from(landingPages)
        .where(and(eq(landingPages.slug, slug), ne(landingPages.id, pageId)))
        .limit(1);
      if (clash.length > 0) {
        return jsonError(
          409,
          `এই slug (${slug}) অন্য একটি ল্যান্ডিং পেজে ব্যবহৃত হচ্ছে। Page settings থেকে slug বদলে আবার সেভ করুন।`,
        );
      }
      values.slug = slug;
    }
    if (data.productId !== undefined) {
      values.productId = data.productId ? idMap.get(data.productId) ?? null : null;
    }
    if (data.status !== undefined) {
      values.status = data.status;
      values.publishedAt = data.status === "published" ? new Date() : null;
    }
    if (data.themeSlug !== undefined) values.themeSlug = data.themeSlug;
    if (data.sections !== undefined) {
      values.sections = remapSectionProductIds(data.sections as LandingSection[], idMap);
    }
    if (data.metaTitle !== undefined) values.metaTitle = data.metaTitle || null;
    if (data.metaDescription !== undefined) values.metaDescription = data.metaDescription || null;
    if (data.couponCode !== undefined) values.couponCode = data.couponCode || null;
    if (data.checkoutOffers !== undefined) values.checkoutOffers = remapProductIds(data.checkoutOffers, idMap);
    if (data.thankYouOffers !== undefined) values.thankYouOffers = remapProductIds(data.thankYouOffers, idMap);

    const result = await db
      .update(landingPages)
      .set(values)
      .where(eq(landingPages.id, pageId))
      .returning({ id: landingPages.id });
    if (result.length === 0) return jsonError(404, "Landing page not found");

    await audit({
      actorType: "admin",
      actorId: session?.userId ?? null,
      actorName: session?.name ?? null,
      action: "landing.update",
      entityType: "landing_pages",
      entityId: id,
      ipHash: reqContext.clientIpHash,
      meta: { fields: Object.keys(values) },
    }).catch(() => undefined);

    return jsonOk({ id: pageId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return jsonError(500, `ল্যান্ডিং পেজ সেভ করা যায়নি: ${message.slice(0, 240)}`);
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const guard = guardMutation(request);
  if (guard) return guard;
  const reqContext = requestContext(request.headers);
  const session = await getAdminSession();
  const denied = await requireAdminWrite(session, reqContext.clientIpHash, "landing");
  if (denied) return denied;

  const { id } = await context.params;
  const pageId = Number(id);
  if (!Number.isInteger(pageId) || pageId <= 0) return jsonError(400, "Invalid page id");
  const db = requireDb("ল্যান্ডিং");
  const result = await db.delete(landingPages).where(eq(landingPages.id, pageId)).returning({ id: landingPages.id });
  if (result.length === 0) return jsonError(404, "Landing page not found");

  await audit({
    actorType: "admin",
    actorId: session?.userId ?? null,
    actorName: session?.name ?? null,
    action: "landing.delete",
    entityType: "landing_pages",
    entityId: id,
    ipHash: reqContext.clientIpHash,
  }).catch(() => undefined);

  return jsonOk({ deleted: true });
}
