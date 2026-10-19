import { guardMutation, jsonError, jsonOk, requestContext } from "@/lib/api/helpers";
import { getAdminSession, isOwner } from "@/lib/auth/session";
import { requireAdminWrite } from "@/lib/admin/guard";
import { getR2Config, testR2Connection } from "@/lib/integrations/r2";
import { hasSecret } from "@/lib/integrations/secrets";
import { isDatabaseConfigured } from "@/lib/db";
import { audit } from "@/lib/auth/audit";

export const dynamic = "force-dynamic";

const REQUIRED = [
  { key: "r2_account_id", env: "R2_ACCOUNT_ID" },
  { key: "r2_access_key_id", env: "R2_ACCESS_KEY_ID" },
  { key: "r2_secret_access_key", env: "R2_SECRET_ACCESS_KEY" },
  { key: "r2_bucket", env: "R2_BUCKET" },
] as const;

/**
 * POST /api/admin/integrations/r2-test — R2 ক্রেডেনশিয়াল যাচাই (owner/admin)।
 * R2-তে ছোট একটি temp অবজেক্ট লিখে মুছে ফেলে; সফল হলে আপলোড R2-তে যাবে
 * নিশ্চিত। সিক্রেটের মান কখনো রেসপন্সে যায় না — শুধু কোন key বসেনি সেটা জানায়।
 */
export async function POST(request: Request) {
  const guard = guardMutation(request);
  if (guard) return guard;
  const context = requestContext(request.headers);
  const session = await getAdminSession();
  const denied = await requireAdminWrite(session, context.clientIpHash, "r2-test");
  if (denied) return denied;
  if (!session || (!isOwner(session.role) && session.role !== "admin")) {
    return jsonError(403, "Owner or admin role required");
  }

  const config = await getR2Config();
  if (!config) {
    const missing: string[] = [];
    for (const { key, env } of REQUIRED) {
      const inVault = isDatabaseConfigured ? await hasSecret(key).catch(() => false) : false;
      const inEnv = Boolean(process.env[env]?.trim());
      if (!inVault && !inEnv) missing.push(key);
    }
    return jsonError(
      503,
      missing.length > 0
        ? `R2 not configured — missing: ${missing.join(", ")}. Until then, uploads are stored in the database.`
        : "R2 credentials are saved but could not be read (AUTH_SECRET may have changed) — re-save them in Integrations.",
      { missing },
    );
  }

  try {
    await testR2Connection(config);
  } catch (error) {
    await audit({
      actorType: "admin",
      actorId: session.userId,
      actorName: session.name,
      action: "r2.test.failed",
      entityType: "integration",
      entityId: "r2",
      ipHash: context.clientIpHash,
    }).catch(() => undefined);
    return jsonError(502, error instanceof Error ? error.message : "R2 connection test failed");
  }

  await audit({
    actorType: "admin",
    actorId: session.userId,
    actorName: session.name,
    action: "r2.test.ok",
    entityType: "integration",
    entityId: "r2",
    ipHash: context.clientIpHash,
    meta: { bucket: config.bucket, mode: config.publicBaseUrl ? "direct" : "proxy" },
  }).catch(() => undefined);

  return jsonOk({
    bucket: config.bucket,
    mode: config.publicBaseUrl ? "direct" : "proxy",
    publicBaseUrlSet: Boolean(config.publicBaseUrl),
  });
}
