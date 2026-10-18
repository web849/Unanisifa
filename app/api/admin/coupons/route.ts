import { eq, ilike, sql } from "drizzle-orm";
import { z } from "zod";
import { guardMutation, jsonError, jsonOk, readJson, requestContext } from "@/lib/api/helpers";
import { getAdminSession } from "@/lib/auth/session";
import { requireAdmin, requireAdminWrite } from "@/lib/admin/guard";
import { requireDb } from "@/lib/db";
import { coupons } from "@/lib/db/schema";
import { audit } from "@/lib/auth/audit";

export const dynamic = "force-dynamic";

export const couponSchema = z.object({
  code: z.string().trim().min(3).max(40).transform((value) => value.toUpperCase()),
  title: z.string().trim().min(2).max(160),
  type: z.enum(["percent", "fixed", "free_delivery"]),
  value: z.number().int().min(0).max(1000000),
  minSubtotal: z.number().int().min(0).max(10000000).default(0),
  maxDiscount: z.number().int().min(0).max(1000000).nullable().optional(),
  usageLimit: z.number().int().min(0).max(1000000).nullable().optional(),
  perPhoneLimit: z.number().int().min(0).max(1000).nullable().optional(),
  startsAt: z.string().datetime().nullable().optional(),
  endsAt: z.string().datetime().nullable().optional(),
  landingScopeId: z.number().int().positive().nullable().optional(),
  showOnCheckout: z.boolean().default(false),
  active: z.boolean().default(true),
  description: z.string().trim().max(300).optional(),
});

/** POST /api/admin/coupons — নতুন কুপন */
export async function POST(request: Request) {
  const guard = guardMutation(request);
  if (guard) return guard;
  const context = requestContext(request.headers);
  const session = await getAdminSession();
  const denied = await requireAdminWrite(session, context.clientIpHash, "coupons");
  if (denied) return denied;

  const parsed = couponSchema.safeParse(await readJson<unknown>(request));
  if (!parsed.success) return jsonError(400, "Invalid coupon data", parsed.error.flatten());
  const data = parsed.data;

  if (data.type === "percent" && (data.value < 1 || data.value > 100)) {
    return jsonError(400, "Percent discount must be 1–100");
  }
  if (data.type === "fixed" && data.value < 1) {
    return jsonError(400, "Fixed discount must be at least ৳1");
  }

  const db = requireDb("কুপন");
  const existing = await db.select({ id: coupons.id }).from(coupons).where(eq(coupons.code, data.code)).limit(1);
  if (existing.length > 0) return jsonError(409, `Code already exists: ${data.code}`);

  const result = await db
    .insert(coupons)
    .values({
      code: data.code,
      title: data.title,
      type: data.type,
      value: data.value,
      minSubtotal: data.minSubtotal,
      maxDiscount: data.maxDiscount ?? null,
      usageLimit: data.usageLimit ?? null,
      perPhoneLimit: data.perPhoneLimit ?? null,
      startsAt: data.startsAt ? new Date(data.startsAt) : null,
      endsAt: data.endsAt ? new Date(data.endsAt) : null,
      landingScopeId: data.landingScopeId ?? null,
      showOnCheckout: data.showOnCheckout,
      active: data.active,
      description: data.description || null,
    })
    .returning({ id: coupons.id, code: coupons.code });

  await audit({
    actorType: "admin",
    actorId: session?.userId ?? null,
    actorName: session?.name ?? null,
    action: "coupon.create",
    entityType: "coupons",
    entityId: result[0] ? String(result[0].id) : null,
    ipHash: context.clientIpHash,
    meta: { code: data.code },
  }).catch(() => undefined);

  return jsonOk({ id: result[0]?.id, code: result[0]?.code }, 201);
}

/** GET — তালিকা */
export async function GET(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const db = requireDb("কুপন");
  const url = new URL(request.url);
  const search = url.searchParams.get("search")?.trim();

  const rows = await db
    .select()
    .from(coupons)
    .where(search ? ilike(coupons.code, `%${search}%`) : sql`TRUE`)
    .orderBy(sql`${coupons.createdAt} DESC`)
    .limit(200);

  return jsonOk({ coupons: rows });
}
