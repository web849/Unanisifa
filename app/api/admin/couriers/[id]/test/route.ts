import { guardMutation, jsonError, jsonOk, requestContext } from "@/lib/api/helpers";
import { getAdminSession } from "@/lib/auth/session";
import { requireAdminWrite } from "@/lib/admin/guard";
import { testCourierConnection } from "@/lib/couriers/service";

export const dynamic = "force-dynamic";

/**
 * POST — লাইভ কানেকশন টেস্ট: Steadfast হলে GET /get_balance,
 * Pathao হলে issue-token + store তালিকা। ফলাফল provider রো-তে সেভ হয়।
 */
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const guard = guardMutation(request);
  if (guard) return guard;
  const reqContext = requestContext(request.headers);
  const session = await getAdminSession();
  const denied = await requireAdminWrite(session, reqContext.clientIpHash, "couriers");
  if (denied) return denied;

  const { id } = await context.params;
  const providerId = Number(id);
  if (!Number.isInteger(providerId) || providerId <= 0) return jsonError(400, "Invalid provider id");

  const result = await testCourierConnection(providerId);
  if (result.status === "not_found") return jsonError(404, result.message);
  return jsonOk({ status: result.status, connected: result.ok, message: result.message });
}
