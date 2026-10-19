import { z } from "zod";
import { guardMutation, jsonError, jsonOk, readJson, requestContext } from "@/lib/api/helpers";
import { getAdminSession, isOwner } from "@/lib/auth/session";
import { requireAdmin } from "@/lib/admin/guard";
import { hasSecret, setSecret, deleteSecret } from "@/lib/integrations/secrets";
import { isDatabaseConfigured } from "@/lib/db";
import { audit } from "@/lib/auth/audit";

export const dynamic = "force-dynamic";

export const VAULT_KEYS = [
  "telegram_bot_token",
  "telegram_chat_id",
  "resend_api_key",
  "meta_capi_token",
  "r2_account_id",
  "r2_access_key_id",
  "r2_secret_access_key",
  "r2_bucket",
  "r2_public_base_url",
] as const;

const schema = z.object({
  key: z.enum(VAULT_KEYS),
  value: z.string().trim().min(1).max(4000),
});

/**
 * GET — প্রতিটি key-এর জন্য শুধু "set / not set" (সিক্রেট কখনো ফেরত যায় না)।
 * PUT — AES-256-GCM এনক্রিপ্ট করে ভল্টে লেখে (owner/admin)।
 * DELETE — key মুছে ফেলে।
 */
export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;
  if (!isDatabaseConfigured) return jsonError(503, "Database not configured");

  const status: Record<string, boolean> = {};
  for (const key of VAULT_KEYS) {
    status[key] = await hasSecret(key);
  }
  return jsonOk({ keys: VAULT_KEYS, status });
}

export async function PUT(request: Request) {
  const guard = guardMutation(request);
  if (guard) return guard;
  const context = requestContext(request.headers);
  const session = await getAdminSession();
  if (!session) return jsonError(401, "Sign in required");
  if (!isOwner(session.role) && session.role !== "admin") return jsonError(403, "Owner or admin role required for secrets");

  const parsed = schema.safeParse(await readJson<unknown>(request));
  if (!parsed.success) return jsonError(400, "Invalid payload");

  try {
    await setSecret(parsed.data.key, parsed.data.value);
  } catch {
    return jsonError(500, "AUTH_SECRET missing or invalid — cannot encrypt secrets");
  }

  await audit({
    actorType: "admin",
    actorId: session.userId,
    actorName: session.name,
    action: "secret.set",
    entityType: "credential_secrets",
    entityId: parsed.data.key,
    ipHash: context.clientIpHash,
  }).catch(() => undefined);

  return jsonOk({ key: parsed.data.key, set: true });
}

export async function DELETE(request: Request) {
  const guard = guardMutation(request);
  if (guard) return guard;
  const context = requestContext(request.headers);
  const session = await getAdminSession();
  if (!session) return jsonError(401, "Sign in required");
  if (!isOwner(session.role) && session.role !== "admin") return jsonError(403, "Owner or admin role required for secrets");

  const parsed = z.object({ key: z.enum(VAULT_KEYS) }).safeParse(await readJson<unknown>(request));
  if (!parsed.success) return jsonError(400, "Invalid payload");

  await deleteSecret(parsed.data.key);

  await audit({
    actorType: "admin",
    actorId: session.userId,
    actorName: session.name,
    action: "secret.delete",
    entityType: "credential_secrets",
    entityId: parsed.data.key,
    ipHash: context.clientIpHash,
  }).catch(() => undefined);

  return jsonOk({ key: parsed.data.key, set: false });
}
