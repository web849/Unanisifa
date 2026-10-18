import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { guardMutation, jsonError, jsonOk, readJson, requestContext } from "@/lib/api/helpers";
import { getAdminSession } from "@/lib/auth/session";
import { requireAdmin, requireAdminWrite } from "@/lib/admin/guard";
import { requireDb } from "@/lib/db";
import { landingPages } from "@/lib/db/schema";
import { LANDING_THEMES, defaultSectionsFor, type LandingSection, type LandingSectionType } from "@/lib/landing/sections";
import { slugify } from "@/lib/utils";
import { audit } from "@/lib/auth/audit";

export const dynamic = "force-dynamic";

const sectionSchema = z.object({
  id: z.number().int().positive(),
  type: z.enum([
    "hero", "text", "split", "images", "video", "products", "order_form", "cta",
    "features", "steps", "faq", "testimonials", "reviews", "countdown", "popup",
    "announcement", "guarantee", "contact", "divider", "spacer",
    "ingredients", "dosage", "doctor_advice",
  ] as [LandingSectionType, ...LandingSectionType[]]),
  hidden: z.boolean().optional(),
  settings: z.record(z.unknown()).default({}),
  design: z
    .object({
      background: z.string().max(60).optional(),
      textColor: z.string().max(60).optional(),
      ctaColor: z.string().max(60).optional(),
      minHeight: z.number().int().min(0).max(2000).optional(),
      paddingY: z.number().int().min(0).max(400).optional(),
      maxWidth: z.number().int().min(320).max(1600).optional(),
      align: z.enum(["left", "center", "right"]).optional(),
      shape: z.enum(["none", "wave", "arch"]).optional(),
      alt: z.boolean().optional(),
    })
    .optional(),
});

/** বেস অবজেক্ট স্কিমা — PATCH-এ .partial() লাগে বলে refine আলাদা রাখা */
export const landingPageBaseSchema = z.object({
  title: z.string().trim().min(2).max(200),
  slug: z.string().trim().min(2).max(180).optional(),
  productId: z.number().int().positive().nullable().optional(),
  status: z.enum(["draft", "published", "archived"]).default("draft"),
  themeSlug: z.enum(LANDING_THEMES).default("emerald"),
  sections: z.array(sectionSchema).max(40).default([]),
  metaTitle: z.string().trim().max(255).optional(),
  metaDescription: z.string().trim().max(500).optional(),
  couponCode: z.string().trim().max(40).optional(),
  checkoutOffers: z.array(z.number().int().positive()).max(6).default([]),
  thankYouOffers: z.array(z.number().int().positive()).max(6).default([]),
});

export const landingPageSchema = landingPageBaseSchema.refine(
  (data) => data.sections.filter((section: LandingSection) => section.type === "popup" && !section.hidden).length <= 3,
  { message: "Maximum 3 popup sections per page", path: ["sections"] },
);

/** POST — নতুন ল্যান্ডিং পেজ */
export async function POST(request: Request) {
  const guard = guardMutation(request);
  if (guard) return guard;
  const context = requestContext(request.headers);
  const session = await getAdminSession();
  const denied = await requireAdminWrite(session, context.clientIpHash, "landing");
  if (denied) return denied;

  const parsed = landingPageSchema.safeParse(await readJson<unknown>(request));
  if (!parsed.success) return jsonError(400, "Invalid landing page data", parsed.error.flatten());
  const data = parsed.data;

  const db = requireDb("ল্যান্ডিং");
  const slug = slugify(data.slug || data.title);
  const existing = await db.select({ id: landingPages.id }).from(landingPages).where(eq(landingPages.slug, slug)).limit(1);
  if (existing.length > 0) return jsonError(409, `Slug already used: ${slug}`);

  const sections = data.sections.length > 0 ? data.sections : defaultSectionsFor(data.title);

  const result = await db
    .insert(landingPages)
    .values({
      title: data.title,
      slug,
      productId: data.productId ?? null,
      status: data.status,
      themeSlug: data.themeSlug,
      sections: sections as never,
      metaTitle: data.metaTitle || null,
      metaDescription: data.metaDescription || null,
      couponCode: data.couponCode || null,
      checkoutOffers: data.checkoutOffers,
      thankYouOffers: data.thankYouOffers,
      publishedAt: data.status === "published" ? new Date() : null,
    })
    .returning({ id: landingPages.id, slug: landingPages.slug });

  const row = result[0];
  if (!row) return jsonError(500, "Could not create landing page");

  await audit({
    actorType: "admin",
    actorId: session?.userId ?? null,
    actorName: session?.name ?? null,
    action: "landing.create",
    entityType: "landing_pages",
    entityId: String(row.id),
    ipHash: context.clientIpHash,
    meta: { slug: row.slug },
  }).catch(() => undefined);

  return jsonOk({ id: row.id, slug: row.slug }, 201);
}

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;
  const db = requireDb("ল্যান্ডিং");
  const rows = await db
    .select({
      id: landingPages.id,
      title: landingPages.title,
      slug: landingPages.slug,
      productId: landingPages.productId,
      status: sql<string>`${landingPages.status}`,
      themeSlug: landingPages.themeSlug,
      viewCount: landingPages.viewCount,
      orderCount: landingPages.orderCount,
      couponCode: landingPages.couponCode,
      publishedAt: landingPages.publishedAt,
      updatedAt: landingPages.updatedAt,
    })
    .from(landingPages)
    .orderBy(sql`${landingPages.updatedAt} DESC`)
    .limit(100);
  return jsonOk({ landingPages: rows });
}
