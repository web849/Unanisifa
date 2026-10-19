import { eq } from "drizzle-orm";
import { z } from "zod";
import { guardMutation, jsonError, jsonOk, readJson, requestContext } from "@/lib/api/helpers";
import { getAdminSession } from "@/lib/auth/session";
import { requireAdmin, requireAdminWrite } from "@/lib/admin/guard";
import { requireDb } from "@/lib/db";
import { cmsPages } from "@/lib/db/schema";
import { slugify } from "@/lib/utils";
import { audit } from "@/lib/auth/audit";

export const dynamic = "force-dynamic";

const RESERVED_SLUGS = new Set([
  "admin", "api", "cart", "checkout", "products", "categories", "offers", "offer", "orders",
  "thank-you", "track-order", "account", "search", "brand", "_next", "favicon.ico",
]);

export const pageSchema = z.object({
  slug: z.string().trim().min(2).max(120).optional(),
  title: z.string().trim().min(2).max(200),
  body: z.string().max(50000).default(""),
  metaTitle: z.string().trim().max(255).optional(),
  metaDescription: z.string().trim().max(500).optional(),
  showInFooter: z.boolean().default(true),
  sortOrder: z.number().int().min(0).max(999).default(0),
});

/** POST — নতুন পেজ বা বিদ্যমান স্লাগে আপডেট (upsert) */
export async function POST(request: Request) {
  const guard = guardMutation(request);
  if (guard) return guard;
  const context = requestContext(request.headers);
  const session = await getAdminSession();
  const denied = await requireAdminWrite(session, context.clientIpHash, "pages");
  if (denied) return denied;

  const parsed = pageSchema.safeParse(await readJson<unknown>(request));
  if (!parsed.success) return jsonError(400, "Invalid page data");
  const data = parsed.data;
  const slug = slugify(data.slug || data.title);
  if (RESERVED_SLUGS.has(slug)) return jsonError(409, `Slug reserved by the app: ${slug}`);

  const db = requireDb("CMS");
  const existing = await db.select({ slug: cmsPages.slug }).from(cmsPages).where(eq(cmsPages.slug, slug)).limit(1);

  const values = {
    title: data.title,
    body: data.body,
    metaTitle: data.metaTitle || null,
    metaDescription: data.metaDescription || null,
    showInFooter: data.showInFooter,
    sortOrder: data.sortOrder,
    isDemo: false,
    updatedAt: new Date(),
  };

  if (existing.length > 0) {
    await db.update(cmsPages).set(values).where(eq(cmsPages.slug, slug));
  } else {
    await db.insert(cmsPages).values({ slug, ...values });
  }

  await audit({
    actorType: "admin",
    actorId: session?.userId ?? null,
    actorName: session?.name ?? null,
    action: existing.length > 0 ? "page.update" : "page.create",
    entityType: "cms_pages",
    entityId: slug,
    ipHash: context.clientIpHash,
  }).catch(() => undefined);

  return jsonOk({ slug, created: existing.length === 0 }, existing.length > 0 ? 200 : 201);
}

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;
  const db = requireDb("CMS");
  const rows = await db.select().from(cmsPages).orderBy(cmsPages.sortOrder, cmsPages.slug);
  return jsonOk({ pages: rows });
}
