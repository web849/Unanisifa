import { eq, ne } from "drizzle-orm";
import { z } from "zod";
import { guardMutation, jsonError, jsonOk, readJson, requestContext } from "@/lib/api/helpers";
import { getAdminSession } from "@/lib/auth/session";
import { requireAdminWrite } from "@/lib/admin/guard";
import { requireDb } from "@/lib/db";
import { courierProviders } from "@/lib/db/schema";
import { encryptSecret } from "@/lib/security";
import { audit } from "@/lib/auth/audit";
import { isApiAdapter, normalizeCredentials, validateCredentials } from "@/lib/couriers/types";

export const dynamic = "force-dynamic";

const schema = z.object({
  enabled: z.boolean().optional(),
  isDefault: z.boolean().optional(),
  /** ফিল্ড-ভিত্তিক ক্রেডেনশিয়াল (যেমন {apiKey, secretKey}) — এনক্রিপ্ট হয়ে সেভ হয় */
  credentials: z.record(z.string().max(80), z.string().max(500)).optional(),
});

/**
 * PATCH — কুরিয়ার প্রোভাইডার enable/disable, default করা (একটাই default থাকে),
 * ও API ক্রেডেনশিয়াল সেভ (AES-256-GCM এনক্রিপ্টেড, অ্যাডমিন প্যানেল থেকেই কানেক্ট)।
 */
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const guard = guardMutation(request);
  if (guard) return guard;
  const reqContext = requestContext(request.headers);
  const session = await getAdminSession();
  const denied = await requireAdminWrite(session, reqContext.clientIpHash, "couriers");
  if (denied) return denied;

  const { id } = await context.params;
  const providerId = Number(id);
  if (!Number.isInteger(providerId) || providerId <= 0) return jsonError(400, "Invalid provider id");

  const parsed = schema.safeParse(await readJson<unknown>(request));
  if (!parsed.success) return jsonError(400, "Invalid payload");

  const db = requireDb("কুরিয়ার");
  const existing = await db
    .select()
    .from(courierProviders)
    .where(eq(courierProviders.id, providerId))
    .limit(1);
  const provider = existing[0];
  if (!provider) return jsonError(404, "Courier provider not found");

  const values: Record<string, unknown> = { updatedAt: new Date() };
  if (parsed.data.enabled !== undefined) values.enabled = parsed.data.enabled;
  if (parsed.data.isDefault !== undefined) values.isDefault = parsed.data.isDefault;
  /* default করা হলে স্বয়ংক্রিয়ভাবে enabled-ও হয় (বন্ধ প্রোভাইডার default হলে অটোমেশন থেমে থাকত) */
  if (parsed.data.isDefault) values.enabled = true;

  let credentialsSet = false;
  if (parsed.data.credentials) {
    if (!isApiAdapter(provider.adapter)) {
      return jsonError(400, "Manual handover does not need API credentials");
    }
    const normalized = normalizeCredentials(provider.adapter, parsed.data.credentials);
    const valid = validateCredentials(provider.adapter, normalized);
    if (!valid.ok) return jsonError(400, valid.error);
    try {
      values.credentialsEncrypted = JSON.stringify(encryptSecret(JSON.stringify(normalized)));
      credentialsSet = true;
    } catch {
      return jsonError(500, "AUTH_SECRET missing or invalid — cannot store credentials");
    }
    /* নতুন ক্রেডেনশিয়ালে আগের টেস্টের ফল আর প্রযোজ্য নয় */
    values.lastConnectionStatus = null;
    values.lastError = null;
  }

  if (parsed.data.isDefault) {
    await db
      .update(courierProviders)
      .set({ isDefault: false, updatedAt: new Date() })
      .where(ne(courierProviders.id, providerId));
  }

  const result = await db
    .update(courierProviders)
    .set(values)
    .where(eq(courierProviders.id, providerId))
    .returning({ id: courierProviders.id, adapter: courierProviders.adapter });
  if (result.length === 0) return jsonError(404, "Courier provider not found");

  await audit({
    actorType: "admin",
    actorId: session?.userId ?? null,
    actorName: session?.name ?? null,
    action: "courier.update",
    entityType: "courier_providers",
    entityId: id,
    ipHash: reqContext.clientIpHash,
    meta: {
      fields: Object.keys(values).filter((key) => key !== "credentialsEncrypted"),
      credentialsSet,
    },
  }).catch(() => undefined);

  return jsonOk({ id: providerId, credentialsSet });
}
