import { eq } from "drizzle-orm";
import { guardMutation, jsonError, jsonOk, requestContext } from "@/lib/api/helpers";
import { getAdminSession } from "@/lib/auth/session";
import { requireAdminWrite } from "@/lib/admin/guard";
import { requireDb } from "@/lib/db";
import { blockedNetworks } from "@/lib/db/schema";
import { audit } from "@/lib/auth/audit";

export const dynamic = "force-dynamic";

/** DELETE — ব্লক রিলিজ */
export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const guard = guardMutation(request);
  if (guard) return guard;
  const reqContext = requestContext(request.headers);
  const session = await getAdminSession();
  const denied = await requireAdminWrite(session, reqContext.clientIpHash, "fraud");
  if (denied) return denied;

  const { id } = await context.params;
  const db = requireDb("ফ্রড ব্লক");
  const result = await db
    .update(blockedNetworks)
    .set({ active: false, releasedAt: new Date() })
    .where(eq(blockedNetworks.id, Number(id)))
    .returning({ id: blockedNetworks.id });
  if (result.length === 0) return jsonError(404, "Blocked network not found");

  await audit({
    actorType: "admin",
    actorId: session?.userId ?? null,
    actorName: session?.name ?? null,
    action: "fraud.release",
    entityType: "blocked_networks",
    entityId: id,
    ipHash: reqContext.clientIpHash,
  }).catch(() => undefined);

  return jsonOk({ released: true });
}
