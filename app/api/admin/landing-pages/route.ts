import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { guardMutation, jsonError, jsonOk, readJson, requestContext } from "@/lib/api/helpers";
import { getAdminSession } from "@/lib/auth/session";
import { requireAdmin, requireAdminWrite } from "@/lib/admin/guard";
import { isDatabaseConfigured, requireDb } from "@/lib/db";
import { landingPages } from "@/lib/db/schema";
import { LANDING_THEMES, defaultSectionsFor, type LandingSection, type LandingSectionType } from "@/lib/landing/sections";
import { buildProductIdMap, collectProductIds, remapProductIds, remapSectionProductIds } from "@/lib/landing/resolve-products";
import { buildUniqueSlug, landingSlugBase } from "@/lib/landing/slug";
import { audit } from "@/lib/auth/audit";

export const dynamic = "force-dynamic";

const sectionSchema = z.object({
  id: z.number().int().positive(),
  type: z.enum([
    "hero", "text", "split", "images", "video", "html", "products", "order_form", "cta",
    "features", "steps", "faq", "testimonials", "reviews", "countdown", "popup",
    "announcement", "guarantee", "contact", "divider", "spacer",
    "ingredients", "dosage", "doctor_advice",
  ] as [LandingSectionType, ...LandingSectionType[]]),
  hidden: z.boolean().optional(),
  settings: z.record(z.unknown()).default({}),
  design: z
    .object({
      background: z.string().max(200).optional(),
      textColor: z.string().max(200).optional(),
      ctaColor: z.string().max(200).optional(),
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

/** zod flatten() থেকে প্রথম ফিল্ড-এররগুলো এক লাইনে সাজায় (UI-তে স্পষ্ট কারণ দেখাতে) */
export function describeZodIssues(flat: { fieldErrors: Record<string, string[] | undefined>; formErrors: string[] }): string {
  const parts: string[] = [];
  for (const [field, messages] of Object.entries(flat.fieldErrors)) {
    if (messages?.[0]) parts.push(`${field}: ${messages[0]}`);
  }
  parts.push(...flat.formErrors.slice(0, 2));
  return parts.join("; ");
}

/** POST — নতুন ল্যান্ডিং পেজ */
export async function POST(request: Request) {
  const guard = guardMutation(request);
  if (guard) return guard;
  const context = requestContext(request.headers);
  const session = await getAdminSession();
  const denied = await requireAdminWrite(session, context.clientIpHash, "landing");
  if (denied) return denied;

  if (!isDatabaseConfigured) {
    return jsonError(
      503,
      "ডেটাবেজ কনফিগার করা নেই — Vercel বা .env-এ DATABASE_URL সেট না করলে ল্যান্ডিং পেজ তৈরি করা যাবে না।",
    );
  }

  const parsed = landingPageSchema.safeParse(await readJson<unknown>(request));
  if (!parsed.success) {
    const flat = parsed.error.flatten();
    const detail = describeZodIssues(flat);
    return jsonError(400, detail ? `Invalid landing page data — ${detail}` : "Invalid landing page data", flat);
  }
  const data = parsed.data;

  try {
    const db = requireDb("ল্যান্ডিং");

    // পণ্য-আইডি যাচাই: ডেমো-আইডি হলে আসল আইডিতে ম্যাপ; না মিললে FK 500-এর
    // বদলে স্পষ্ট 400 (আগে এখানেই "Network error" দেখিয়ে তৈরি আটকে যেত)।
    const idMap = await buildProductIdMap(
      db,
      collectProductIds({
        productId: data.productId ?? null,
        checkoutOffers: data.checkoutOffers,
        thankYouOffers: data.thankYouOffers,
        sections: data.sections as LandingSection[],
      }),
    );
    let productId: number | null = null;
    if (data.productId) {
      const resolved = idMap.get(data.productId);
      if (resolved === undefined) {
        return jsonError(
          400,
          "নির্বাচিত পণ্যটি ডেটাবেজে পাওয়া যায়নি। Products থেকে পণ্য তৈরি করুন অথবা ডেমো ক্যাটালগ ইমপোর্ট করে আবার চেষ্টা করুন — পণ্য ছাড়াও পেজ তৈরি করে পরে বিল্ডারে পণ্য যোগ করা যায়।",
        );
      }
      productId = resolved;
    }

    // slug আগে থেকে থাকলে 409 দিয়ে আটকানো নয় — -2, -3 … যোগ করে ইউনিক বানানো হয়।
    const slug = await buildUniqueSlug(landingSlugBase(data.slug || data.title), async (candidate) => {
      const rows = await db
        .select({ id: landingPages.id })
        .from(landingPages)
        .where(eq(landingPages.slug, candidate))
        .limit(1);
      return rows.length > 0;
    });

    const rawSections = (data.sections.length > 0 ? data.sections : defaultSectionsFor(data.title)) as LandingSection[];
    const sections = remapSectionProductIds(rawSections, idMap);

    const result = await db
      .insert(landingPages)
      .values({
        title: data.title,
        slug,
        productId,
        status: data.status,
        themeSlug: data.themeSlug,
        sections: sections as never,
        metaTitle: data.metaTitle || null,
        metaDescription: data.metaDescription || null,
        couponCode: data.couponCode || null,
        checkoutOffers: remapProductIds(data.checkoutOffers, idMap),
        thankYouOffers: remapProductIds(data.thankYouOffers, idMap),
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
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return jsonError(500, `ল্যান্ডিং পেজ তৈরি করা যায়নি: ${message.slice(0, 240)}`);
  }
}

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;
  if (!isDatabaseConfigured) {
    return jsonError(503, "ডেটাবেজ কনফিগার করা নেই — DATABASE_URL সেট করুন।");
  }
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
