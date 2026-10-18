import { eq } from "drizzle-orm";
import { z } from "zod";
import { guardMutation, jsonError, jsonOk, readJson, requestContext } from "@/lib/api/helpers";
import { getAdminSession } from "@/lib/auth/session";
import { requireAdmin, requireAdminWrite } from "@/lib/admin/guard";
import { isDatabaseConfigured, requireDb } from "@/lib/db";
import { trackingSettings } from "@/lib/db/schema";
import { audit } from "@/lib/auth/audit";

export const dynamic = "force-dynamic";

const schema = z.object({
  enabled: z.boolean().optional(),
  pixelId: z.string().trim().max(40).nullable().optional(),
  capiToken: z.string().trim().max(4000).optional(),
  purchaseTrigger: z.enum(["confirmed", "delivered"]).optional(),
});

/** GET — pixelId + purchaseTrigger + token সেট আছে কিনা (token কখনো ফেরত যায় না) */
export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;
  if (!isDatabaseConfigured) return jsonError(503, "Database not configured");

  const { hasSecret } = await import("@/lib/integrations/secrets");
  const db = requireDb("ট্র্যাকিং");
  const rows = await db.select().from(trackingSettings).where(eq(trackingSettings.platform, "meta")).limit(1);
  const row = rows[0];
  return jsonOk({
    enabled: row?.enabled ?? false,
    pixelId: row?.pixelId ?? null,
    purchaseTrigger: row?.purchaseTrigger ?? "confirmed",
    capiTokenSet: await hasSecret("meta_capi_token").catch(() => false),
    lastEventAt: row?.lastEventAt ?? null,
  });
}

/** PATCH — Meta pixel/CAPI সেটিংস */
export async function PATCH(request: Request) {
  const guard = guardMutation(request);
  if (guard) return guard;
  const reqContext = requestContext(request.headers);
  const session = await getAdminSession();
  const deniedWrite = await requireAdminWrite(session, reqContext.clientIpHash, "integrations");
  if (deniedWrite) return deniedWrite;
  if (!isDatabaseConfigured) return jsonError(503, "Database not configured");

  const parsed = schema.safeParse(await readJson<unknown>(request));
  if (!parsed.success) return jsonError(400, "Invalid payload");
  const data = parsed.data;

  const db = requireDb("ট্র্যাকিং");
  const values: Record<string, unknown> = { updatedAt: new Date() };
  if (data.enabled !== undefined) values.enabled = data.enabled;
  if (data.pixelId !== undefined) values.pixelId = data.pixelId;
  if (data.purchaseTrigger !== undefined) values.purchaseTrigger = data.purchaseTrigger;
  if (data.capiToken) {
    /* CAPI token ভলটে (credential_secrets) থাকে — meta.ts সেখান থেকেই পড়ে */
    try {
      const { setSecret } = await import("@/lib/integrations/secrets");
      await setSecret("meta_capi_token", data.capiToken);
    } catch {
      return jsonError(500, "SECRETS_ENCRYPTION_KEY missing or invalid — cannot store token");
    }
  }

  await db
    .insert(trackingSettings)
    .values({
      platform: "meta",
      enabled: values.enabled === true,
      pixelId: (values.pixelId as string | null) ?? null,
      capiTokenEncrypted: null,
      purchaseTrigger: (values.purchaseTrigger as "confirmed" | "delivered") ?? "confirmed",
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({ target: trackingSettings.platform, set: values });

  await audit({
    actorType: "admin",
    actorId: session?.userId ?? null,
    actorName: session?.name ?? null,
    action: "integrations.tracking",
    entityType: "tracking_settings",
    entityId: "meta",
    ipHash: reqContext.clientIpHash,
    meta: { fields: Object.keys(values).filter((key) => key !== "capiTokenEncrypted") },
  }).catch(() => undefined);

  return jsonOk({ updated: true });
}
