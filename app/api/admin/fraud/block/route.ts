import { eq } from "drizzle-orm";
import { z } from "zod";
import { guardMutation, jsonError, jsonOk, readJson, requestContext } from "@/lib/api/helpers";
import { getAdminSession } from "@/lib/auth/session";
import { requireAdminWrite } from "@/lib/admin/guard";
import { requireDb } from "@/lib/db";
import { blockedNetworks, orders } from "@/lib/db/schema";
import { audit } from "@/lib/auth/audit";

export const dynamic = "force-dynamic";

const schema = z.object({
  orderId: z.number().int().positive(),
  reason: z.string().trim().max(300).optional(),
});

/** POST — অর্ডারের IP নেটওয়ার্ক ব্লক (hash) */
export async function POST(request: Request) {
  const guard = guardMutation(request);
  if (guard) return guard;
  const reqContext = requestContext(request.headers);
  const session = await getAdminSession();
  const denied = await requireAdminWrite(session, reqContext.clientIpHash, "fraud");
  if (denied) return denied;

  const parsed = schema.safeParse(await readJson<unknown>(request));
  if (!parsed.success) return jsonError(400, "Invalid payload");

  const db = requireDb("ফ্রড ব্লক");
  const rows = await db.select().from(orders).where(eq(orders.id, parsed.data.orderId)).limit(1);
  const order = rows[0];
  if (!order) return jsonError(404, "Order not found");
  if (!order.clientIpHash) return jsonError(409, "This order has no recorded IP hash");

  const existing = await db.select({ id: blockedNetworks.id }).from(blockedNetworks).where(eq(blockedNetworks.ipHash, order.clientIpHash)).limit(1);
  if (existing.length > 0) {
    await db
      .update(blockedNetworks)
      .set({ active: true, releasedAt: null, reason: parsed.data.reason ?? null })
      .where(eq(blockedNetworks.id, existing[0].id));
  } else {
    await db.insert(blockedNetworks).values({
      ipHash: order.clientIpHash,
      ipLabel: order.clientIp ? "from order " + order.orderNumber : null,
      reason: parsed.data.reason ?? null,
      active: true,
      orderCountAtBlock: 0,
      blockedBy: session?.userId ?? null,
    });
  }

  await audit({
    actorType: "admin",
    actorId: session?.userId ?? null,
    actorName: session?.name ?? null,
    action: "fraud.block",
    entityType: "blocked_networks",
    entityId: order.clientIpHash,
    ipHash: reqContext.clientIpHash,
    meta: { orderId: order.id },
  }).catch(() => undefined);

  return jsonOk({ blocked: true });
}
