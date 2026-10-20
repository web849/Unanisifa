import { guardMutation, jsonOk, requestContext } from "@/lib/api/helpers";
import { getAdminSession } from "@/lib/auth/session";
import { requireAdminWrite } from "@/lib/admin/guard";
import { syncOpenShipments } from "@/lib/couriers/service";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * POST — খোলা সব শিপমেন্টের স্ট্যাটাস কুরিয়ার API থেকে সিঙ্ক।
 * delivered হলে অর্ডারও delivered হয়।
 */
export async function POST(request: Request) {
  const guard = guardMutation(request);
  if (guard) return guard;
  const reqContext = requestContext(request.headers);
  const session = await getAdminSession();
  const denied = await requireAdminWrite(session, reqContext.clientIpHash, "couriers");
  if (denied) return denied;

  const summary = await syncOpenShipments(100);
  return jsonOk({ ...summary });
}
