import { eq } from "drizzle-orm";
import { z } from "zod";
import { guardMutation, jsonError, jsonOk, readJson, requestContext } from "@/lib/api/helpers";
import { getAdminSession } from "@/lib/auth/session";
import { requireAdminWrite } from "@/lib/admin/guard";
import { requireDb } from "@/lib/db";
import { courierProviders } from "@/lib/db/schema";
import { encryptSecret } from "@/lib/security";
import { audit } from "@/lib/auth/audit";

export const dynamic = "force-dynamic";

const schema = z.object({
  enabled: z.boolean().optional(),
  isDefault: z.boolean().optional(),
  credentials: z.string().trim().max(2000).optional(),
});

/** PATCH — কুরিয়ার প্রোভাইডার enable/disable + ক্রেডেনশিয়াল (AES-GCM এনক্রিপ্টেড) */
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const guard = guardMutation(request);
  if (guard) return guard;
  const reqContext = requestContext(request.headers);
  const session = await getAdminSession();
  const denied = await requireAdminWrite(session, reqContext.clientIpHash, "couriers");
  if (denied) return denied;

  const { id } = await context.params;
  const parsed = schema.safeParse(await readJson<unknown>(request));
  if (!parsed.success) return jsonError(400, "Invalid payload");

  const db = requireDb("কুরিয়ার");
  const values: Record<string, unknown> = { updatedAt: new Date() };
  if (parsed.data.enabled !== undefined) values.enabled = parsed.data.enabled;
  if (parsed.data.isDefault !== undefined) values.isDefault = parsed.data.isDefault;

  if (parsed.data.credentials) {
    try {
      values.credentialsEncrypted = JSON.stringify(encryptSecret(parsed.data.credentials));
    } catch {
      return jsonError(500, "SECRETS_ENCRYPTION_KEY missing or invalid — cannot store credentials");
    }
  }

  const result = await db
    .update(courierProviders)
    .set(values)
    .where(eq(courierProviders.id, Number(id)))
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
    meta: { fields: Object.keys(values).filter((key) => key !== "credentialsEncrypted") },
  }).catch(() => undefined);

  return jsonOk({ id: Number(id), credentialsSet: Boolean(parsed.data.credentials) });
}
