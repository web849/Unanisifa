import { and, eq, ne } from "drizzle-orm";
import { guardMutation, jsonError, jsonOk, readJson, requestContext } from "@/lib/api/helpers";
import { getAdminSession } from "@/lib/auth/session";
import { requireAdminWrite } from "@/lib/admin/guard";
import { requireDb } from "@/lib/db";
import { landingPages } from "@/lib/db/schema";
import { audit } from "@/lib/auth/audit";
import { slugify } from "@/lib/utils";
import { landingPageBaseSchema } from "../route";

export const dynamic = "force-dynamic";

/** PATCH — ল্যান্ডিং পেজ আপডেট (sections সহ) */
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const guard = guardMutation(request);
  if (guard) return guard;
  const reqContext = requestContext(request.headers);
  const session = await getAdminSession();
  const denied = await requireAdminWrite(session, reqContext.clientIpHash, "landing");
  if (denied) return denied;

  const { id } = await context.params;
  const parsed = landingPageBaseSchema.partial().safeParse(await readJson<unknown>(request));
  if (!parsed.success) return jsonError(400, "Invalid landing page data", parsed.error.flatten());
  const data = parsed.data;

  if (data.sections) {
    const popups = data.sections.filter((section) => section.type === "popup" && !section.hidden).length;
    if (popups > 3) return jsonError(400, "Maximum 3 popup sections per page");
  }

  const db = requireDb("ল্যান্ডিং");
  const pageId = Number(id);
  if (!Number.isInteger(pageId) || pageId <= 0) return jsonError(400, "Invalid page id");

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
    if (clash.length > 0) return jsonError(409, `Slug already used: ${slug}`);
    values.slug = slug;
  }
  if (data.productId !== undefined) values.productId = data.productId;
  if (data.status !== undefined) {
    values.status = data.status;
    values.publishedAt = data.status === "published" ? new Date() : null;
  }
  if (data.themeSlug !== undefined) values.themeSlug = data.themeSlug;
  if (data.sections !== undefined) values.sections = data.sections;
  if (data.metaTitle !== undefined) values.metaTitle = data.metaTitle || null;
  if (data.metaDescription !== undefined) values.metaDescription = data.metaDescription || null;
  if (data.couponCode !== undefined) values.couponCode = data.couponCode || null;
  if (data.checkoutOffers !== undefined) values.checkoutOffers = data.checkoutOffers;
  if (data.thankYouOffers !== undefined) values.thankYouOffers = data.thankYouOffers;

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
