import { sql } from "drizzle-orm";
import { z } from "zod";
import { guardMutation, jsonError, jsonOk, readJson, requestContext } from "@/lib/api/helpers";
import { getAdminSession } from "@/lib/auth/session";
import { requireAdmin, requireAdminWrite } from "@/lib/admin/guard";
import { requireDb } from "@/lib/db";
import { popupCampaigns } from "@/lib/db/schema";
import { audit } from "@/lib/auth/audit";

export const dynamic = "force-dynamic";

export const popupSchema = z
  .object({
    name: z.string().trim().min(2).max(160),
    scope: z.enum(["store", "landing"]).default("store"),
    landingPageId: z.number().int().positive().nullable().optional(),
    title: z.string().trim().min(2).max(160),
    body: z.string().trim().max(600).optional(),
    imageUrl: z.string().trim().max(600).optional(),
    ctaLabel: z.string().trim().max(60).optional(),
    ctaUrl: z.string().trim().max(600).optional(),
    leadFormEnabled: z.boolean().default(false),
    leadFormLabel: z.string().trim().max(120).optional(),
    delaySeconds: z.number().int().min(1).max(120).default(3),
    frequency: z.enum(["every_visit", "once_session", "once_day"]).default("once_session"),
    priority: z.number().int().min(0).max(99).default(0),
    startsAt: z.string().datetime().nullable().optional(),
    endsAt: z.string().datetime().nullable().optional(),
    active: z.boolean().default(false),
  })
  .refine((data) => data.scope !== "landing" || data.landingPageId != null, {
    message: "Landing scope requires a landing page",
    path: ["landingPageId"],
  });

export async function POST(request: Request) {
  const guard = guardMutation(request);
  if (guard) return guard;
  const context = requestContext(request.headers);
  const session = await getAdminSession();
  const denied = await requireAdminWrite(session, context.clientIpHash, "popups");
  if (denied) return denied;

  const parsed = popupSchema.safeParse(await readJson<unknown>(request));
  if (!parsed.success) return jsonError(400, "Invalid popup data", parsed.error.flatten());
  const data = parsed.data;

  const db = requireDb("পপআপ");
  const result = await db
    .insert(popupCampaigns)
    .values({
      name: data.name,
      scope: data.scope,
      landingPageId: data.scope === "landing" ? data.landingPageId : null,
      title: data.title,
      body: data.body || null,
      imageUrl: data.imageUrl || null,
      ctaLabel: data.ctaLabel || null,
      ctaUrl: data.ctaUrl || null,
      leadFormEnabled: data.leadFormEnabled,
      leadFormLabel: data.leadFormLabel || null,
      delaySeconds: data.delaySeconds,
      frequency: data.frequency,
      priority: data.priority,
      startsAt: data.startsAt ? new Date(data.startsAt) : null,
      endsAt: data.endsAt ? new Date(data.endsAt) : null,
      active: data.active,
    })
    .returning({ id: popupCampaigns.id });

  await audit({
    actorType: "admin",
    actorId: session?.userId ?? null,
    actorName: session?.name ?? null,
    action: "popup.create",
    entityType: "popup_campaigns",
    entityId: result[0] ? String(result[0].id) : null,
    ipHash: context.clientIpHash,
  }).catch(() => undefined);

  return jsonOk({ id: result[0]?.id }, 201);
}

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;
  const db = requireDb("পপআপ");
  const rows = await db.select().from(popupCampaigns).orderBy(sql`${popupCampaigns.priority} DESC, ${popupCampaigns.id} DESC`).limit(100);
  return jsonOk({ popups: rows });
}
