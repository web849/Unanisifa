import { jsonError } from "../api/helpers";
import type { AdminSession } from "../auth/session";
import { checkRateLimit } from "../auth/rate-limit";
import { isOwner } from "../auth/session";

/**
 * অ্যাডমিন গার্ড — রিড ও রাইট।
 * রাইট: role owner|admin|operator + adminWrite রেট লিমিট।
 */

export async function requireAdmin(): Promise<Response | null> {
  const { getAdminSession } = await import("../auth/session");
  const session = await getAdminSession();
  if (!session) return jsonError(401, "Sign in required");
  return null;
}

export async function requireAdminWrite(
  session: AdminSession | null,
  ipHash: string,
  _entity: string,
): Promise<Response | null> {
  if (!session) return jsonError(401, "Sign in required");
  if (!["owner", "admin", "operator"].includes(session.role)) {
    return jsonError(403, "Read-only role cannot perform writes");
  }
  const rate = await checkRateLimit("adminWrite", ipHash);
  if (!rate.allowed) return jsonError(429, `Too many admin writes. Retry in ${rate.retryAfterSeconds}s.`);
  return null;
}

export async function requireOwner(): Promise<Response | null> {
  const { getAdminSession } = await import("../auth/session");
  const session = await getAdminSession();
  if (!session) return jsonError(401, "Sign in required");
  if (!isOwner(session.role)) return jsonError(403, "Owner role required");
  return null;
}
