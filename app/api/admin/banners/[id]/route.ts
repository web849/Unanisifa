import { eq, sql } from "drizzle-orm";
import { guardMutation, jsonError, jsonOk, readJson, requestContext } from "@/lib/api/helpers";
import { getAdminSession } from "@/lib/auth/session";
import { requireAdminWrite } from "@/lib/admin/guard";
import { requireDb } from "@/lib/db";
import { banners } from "@/lib/db/schema";
import { audit } from "@/lib/auth/audit";

export const dynamic = "force-dynamic";

const allowed = ["title", "imageUrl", "linkUrl", "altText", "sortOrder", "active", "startsAt", "endsAt"] as const;

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const guard = guardMutation(request);
  if (guard) return guard;
  const reqContext = requestContext(request.headers);
  const session = await getAdminSession();
  const denied = await requireAdminWrite(session, reqContext.clientIpHash, "banners");
  if (denied) return denied;

  const { id } = await context.params;
  const parsed = (await readJson<Record<string, unknown>>(request)) ?? {};
  const values: Record<string, unknown> = {};
  for (const key of allowed) {
    if (parsed[key] === undefined) continue;
    if (key === "startsAt" || key === "endsAt") {
      values[key] = parsed[key] ? new Date(String(parsed[key])) : null;
    } else {
      values[key] = parsed[key] === "" ? null : parsed[key];
    }
  }
  if (Object.keys(values).length === 0) return jsonError(400, "Nothing to update");

  const db = requireDb("ব্যানার");
  /* সক্রিয় করার সময় ৫-সীমা */
  if (values.active === true) {
    const active = await db.select({ count: sql<number>`count(*)::int` }).from(banners).where(eq(banners.active, true));
    if ((active[0]?.count ?? 0) >= 5) {
      return jsonError(409, "Maximum 5 active banners. Deactivate one first.");
    }
  }

  const result = await db.update(banners).set(values).where(eq(banners.id, Number(id))).returning({ id: banners.id });
  if (result.length === 0) return jsonError(404, "Banner not found");

  await audit({
    actorType: "admin",
    actorId: session?.userId ?? null,
    actorName: session?.name ?? null,
    action: "banner.update",
    entityType: "banners",
    entityId: id,
    ipHash: reqContext.clientIpHash,
  }).catch(() => undefined);

  return jsonOk({ id: Number(id) });
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const guard = guardMutation(request);
  if (guard) return guard;
  const reqContext = requestContext(request.headers);
  const session = await getAdminSession();
  const denied = await requireAdminWrite(session, reqContext.clientIpHash, "banners");
  if (denied) return denied;

  const { id } = await context.params;
  const db = requireDb("ব্যানার");
  const result = await db.delete(banners).where(eq(banners.id, Number(id))).returning({ id: banners.id });
  if (result.length === 0) return jsonError(404, "Banner not found");

  await audit({
    actorType: "admin",
    actorId: session?.userId ?? null,
    actorName: session?.name ?? null,
    action: "banner.delete",
    entityType: "banners",
    entityId: id,
    ipHash: reqContext.clientIpHash,
  }).catch(() => undefined);

  return jsonOk({ deleted: true });
}
