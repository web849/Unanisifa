import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { guardMutation, jsonError, jsonOk, readJson, requestContext } from "@/lib/api/helpers";
import { getAdminSession } from "@/lib/auth/session";
import { requireAdmin, requireAdminWrite } from "@/lib/admin/guard";
import { requireDb } from "@/lib/db";
import { banners } from "@/lib/db/schema";
import { audit } from "@/lib/auth/audit";

export const dynamic = "force-dynamic";

export const bannerSchema = z.object({
  title: z.string().trim().min(2).max(160),
  imageUrl: z.string().trim().min(1).max(600),
  linkUrl: z.string().trim().max(600).optional(),
  altText: z.string().trim().max(300).optional(),
  sortOrder: z.number().int().min(0).max(99).default(0),
  active: z.boolean().default(true),
  startsAt: z.string().datetime().nullable().optional(),
  endsAt: z.string().datetime().nullable().optional(),
});

/** POST — ব্যানার; সক্রিয় ব্যানার ৫টির বেশি হলে 409 */
export async function POST(request: Request) {
  const guard = guardMutation(request);
  if (guard) return guard;
  const context = requestContext(request.headers);
  const session = await getAdminSession();
  const denied = await requireAdminWrite(session, context.clientIpHash, "banners");
  if (denied) return denied;

  const parsed = bannerSchema.safeParse(await readJson<unknown>(request));
  if (!parsed.success) return jsonError(400, "Invalid banner data");
  const data = parsed.data;

  const db = requireDb("ব্যানার");
  if (data.active) {
    const active = await db.select({ count: sql<number>`count(*)::int` }).from(banners).where(eq(banners.active, true));
    if ((active[0]?.count ?? 0) >= 5) {
      return jsonError(409, "Maximum 5 active banners. Deactivate one first.");
    }
  }

  const result = await db
    .insert(banners)
    .values({
      title: data.title,
      imageUrl: data.imageUrl,
      linkUrl: data.linkUrl || null,
      altText: data.altText || null,
      sortOrder: data.sortOrder,
      active: data.active,
      startsAt: data.startsAt ? new Date(data.startsAt) : null,
      endsAt: data.endsAt ? new Date(data.endsAt) : null,
    })
    .returning({ id: banners.id });

  await audit({
    actorType: "admin",
    actorId: session?.userId ?? null,
    actorName: session?.name ?? null,
    action: "banner.create",
    entityType: "banners",
    entityId: result[0] ? String(result[0].id) : null,
    ipHash: context.clientIpHash,
  }).catch(() => undefined);

  return jsonOk({ id: result[0]?.id }, 201);
}

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;
  const db = requireDb("ব্যানার");
  const rows = await db.select().from(banners).orderBy(banners.sortOrder, banners.id);
  return jsonOk({ banners: rows });
}
