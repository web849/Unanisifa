import { eq } from "drizzle-orm";
import { guardMutation, jsonError, jsonOk, readJson, requestContext } from "@/lib/api/helpers";
import { getAdminSession } from "@/lib/auth/session";
import { requireAdminWrite } from "@/lib/admin/guard";
import { requireDb } from "@/lib/db";
import { popupCampaigns } from "@/lib/db/schema";
import { audit } from "@/lib/auth/audit";

export const dynamic = "force-dynamic";

const allowed = [
  "name",
  "scope",
  "landingPageId",
  "title",
  "body",
  "imageUrl",
  "ctaLabel",
  "ctaUrl",
  "leadFormEnabled",
  "leadFormLabel",
  "delaySeconds",
  "frequency",
  "priority",
  "startsAt",
  "endsAt",
  "active",
] as const;

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const guard = guardMutation(request);
  if (guard) return guard;
  const reqContext = requestContext(request.headers);
  const session = await getAdminSession();
  const denied = await requireAdminWrite(session, reqContext.clientIpHash, "popups");
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

  const db = requireDb("পপআপ");
  const result = await db
    .update(popupCampaigns)
    .set(values)
    .where(eq(popupCampaigns.id, Number(id)))
    .returning({ id: popupCampaigns.id });
  if (result.length === 0) return jsonError(404, "Popup not found");

  await audit({
    actorType: "admin",
    actorId: session?.userId ?? null,
    actorName: session?.name ?? null,
    action: "popup.update",
    entityType: "popup_campaigns",
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
  const denied = await requireAdminWrite(session, reqContext.clientIpHash, "popups");
  if (denied) return denied;

  const { id } = await context.params;
  const db = requireDb("পপআপ");
  const result = await db.delete(popupCampaigns).where(eq(popupCampaigns.id, Number(id))).returning({ id: popupCampaigns.id });
  if (result.length === 0) return jsonError(404, "Popup not found");

  await audit({
    actorType: "admin",
    actorId: session?.userId ?? null,
    actorName: session?.name ?? null,
    action: "popup.delete",
    entityType: "popup_campaigns",
    entityId: id,
    ipHash: reqContext.clientIpHash,
  }).catch(() => undefined);

  return jsonOk({ deleted: true });
}
