import { eq } from "drizzle-orm";
import { guardMutation, jsonError, jsonOk, readJson, requestContext } from "@/lib/api/helpers";
import { getAdminSession } from "@/lib/auth/session";
import { requireAdminWrite } from "@/lib/admin/guard";
import { requireDb } from "@/lib/db";
import { coupons } from "@/lib/db/schema";
import { audit } from "@/lib/auth/audit";

export const dynamic = "force-dynamic";

const allowed = [
  "code",
  "title",
  "type",
  "value",
  "minSubtotal",
  "maxDiscount",
  "usageLimit",
  "perPhoneLimit",
  "startsAt",
  "endsAt",
  "landingScopeId",
  "showOnCheckout",
  "active",
  "description",
] as const;

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const guard = guardMutation(request);
  if (guard) return guard;
  const reqContext = requestContext(request.headers);
  const session = await getAdminSession();
  const denied = await requireAdminWrite(session, reqContext.clientIpHash, "coupons");
  if (denied) return denied;

  const { id } = await context.params;
  const parsed = (await readJson<Record<string, unknown>>(request)) ?? {};
  const values: Record<string, unknown> = { updatedAt: new Date() };
  for (const key of allowed) {
    if (parsed[key] === undefined) continue;
    if (key === "startsAt" || key === "endsAt") {
      values[key] = parsed[key] ? new Date(String(parsed[key])) : null;
    } else if (key === "code") {
      values[key] = String(parsed[key]).trim().toUpperCase();
    } else {
      values[key] = parsed[key] === "" ? null : parsed[key];
    }
  }
  if (Object.keys(values).length <= 1) return jsonError(400, "Nothing to update");

  const db = requireDb("কুপন");
  const result = await db.update(coupons).set(values).where(eq(coupons.id, Number(id))).returning({ id: coupons.id });
  if (result.length === 0) return jsonError(404, "Coupon not found");

  await audit({
    actorType: "admin",
    actorId: session?.userId ?? null,
    actorName: session?.name ?? null,
    action: "coupon.update",
    entityType: "coupons",
    entityId: id,
    ipHash: reqContext.clientIpHash,
    meta: { fields: Object.keys(values) },
  }).catch(() => undefined);

  return jsonOk({ id: Number(id) });
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const guard = guardMutation(request);
  if (guard) return guard;
  const reqContext = requestContext(request.headers);
  const session = await getAdminSession();
  const denied = await requireAdminWrite(session, reqContext.clientIpHash, "coupons");
  if (denied) return denied;

  const { id } = await context.params;
  const db = requireDb("কুপন");
  const result = await db.delete(coupons).where(eq(coupons.id, Number(id))).returning({ id: coupons.id, code: coupons.code });
  if (result.length === 0) return jsonError(404, "Coupon not found");

  await audit({
    actorType: "admin",
    actorId: session?.userId ?? null,
    actorName: session?.name ?? null,
    action: "coupon.delete",
    entityType: "coupons",
    entityId: id,
    ipHash: reqContext.clientIpHash,
  }).catch(() => undefined);

  return jsonOk({ deleted: true });
}
