import { z } from "zod";
import { guardMutation, jsonError, jsonOk, readJson, requestContext } from "@/lib/api/helpers";
import { getAdminSession } from "@/lib/auth/session";
import { requireAdminWrite } from "@/lib/admin/guard";
import { changeOrderStatus } from "@/lib/orders/service";
import { maybeAutoBook } from "@/lib/couriers/service";
import { ORDER_STATUSES } from "@/lib/orders/status";
import { audit } from "@/lib/auth/audit";

export const dynamic = "force-dynamic";

const schema = z.object({
  status: z.enum([...ORDER_STATUSES]),
  note: z.string().trim().max(500).optional(),
});

/** POST /api/admin/orders/[id]/status — স্ট্যাটাস ট্রানজিশন (নিয়ম lib/orders/status) */
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const guard = guardMutation(request);
  if (guard) return guard;
  const reqContext = requestContext(request.headers);
  const session = await getAdminSession();
  const denied = await requireAdminWrite(session, reqContext.clientIpHash, "orders");
  if (denied) return denied;

  const parsed = schema.safeParse(await readJson<unknown>(request));
  if (!parsed.success) return jsonError(400, "Invalid status payload");

  const { id } = await context.params;
  const orderId = Number(id);
  if (!Number.isInteger(orderId) || orderId <= 0) return jsonError(400, "Invalid order id");

  const result = await changeOrderStatus(
    orderId,
    parsed.data.status as never,
    {
      actorId: session?.userId ?? null,
      actorName: session?.name ?? "admin",
      ipHash: reqContext.clientIpHash,
    },
    parsed.data.note,
  );

  if (!result.ok) return jsonError(409, result.error ?? "Status change failed");

  await audit({
    actorType: "admin",
    actorId: session?.userId ?? null,
    actorName: session?.name ?? null,
    action: `order.status.${parsed.data.status}`,
    entityType: "orders",
    entityId: id,
    ipHash: reqContext.clientIpHash,
    meta: { note: parsed.data.note ?? null },
  }).catch(() => undefined);

  /* কুরিয়ার অটোমেশন: shipped হলেই default কুরিয়ারে অটো-বুকিং
     (ব্যর্থ হলে শিপমেন্টে lastError থাকে — স্ট্যাটাস পরিবর্তন আটকায় না) */
  const courier =
    parsed.data.status === "shipped"
      ? await maybeAutoBook(orderId).catch(() => null)
      : null;

  return jsonOk({ orderId, status: parsed.data.status, courier });
}
