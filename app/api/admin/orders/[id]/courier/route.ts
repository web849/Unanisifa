import { z } from "zod";
import { guardMutation, jsonError, jsonOk, readJson, requestContext } from "@/lib/api/helpers";
import { getAdminSession } from "@/lib/auth/session";
import { requireAdminWrite } from "@/lib/admin/guard";
import { bookOrder, syncOrderShipment } from "@/lib/couriers/service";
import { audit } from "@/lib/auth/audit";

export const dynamic = "force-dynamic";

const schema = z.object({
  action: z.enum(["book", "sync"]),
  providerId: z.number().int().positive().optional(),
});

/**
 * POST /api/admin/orders/[id]/courier
 * - action "book": কুরিয়ারে কনসাইনমেন্ট বুকিং (বা ম্যানুয়াল হস্তান্তর রেকর্ড)
 * - action "sync": এই অর্ডারের শিপমেন্ট স্ট্যাটাস API থেকে সিঙ্ক
 */
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const guard = guardMutation(request);
  if (guard) return guard;
  const reqContext = requestContext(request.headers);
  const session = await getAdminSession();
  const denied = await requireAdminWrite(session, reqContext.clientIpHash, "couriers");
  if (denied) return denied;

  const parsed = schema.safeParse(await readJson<unknown>(request));
  if (!parsed.success) return jsonError(400, "Invalid courier action");

  const { id } = await context.params;
  const orderId = Number(id);
  if (!Number.isInteger(orderId) || orderId <= 0) return jsonError(400, "Invalid order id");

  if (parsed.data.action === "sync") {
    const result = await syncOrderShipment(orderId);
    if (result.error) return jsonError(422, result.error);
    return jsonOk({ synced: result.updated, status: result.status ?? null, message: result.message ?? null });
  }

  const result = await bookOrder(orderId, parsed.data.providerId);
  if (!result.ok) return jsonError(422, result.error);

  await audit({
    actorType: "admin",
    actorId: session?.userId ?? null,
    actorName: session?.name ?? null,
    action: "courier.book",
    entityType: "orders",
    entityId: id,
    ipHash: reqContext.clientIpHash,
    meta: { provider: result.providerName, consignmentId: result.consignmentId },
  }).catch(() => undefined);

  return jsonOk({
    booked: true,
    provider: result.providerName,
    consignmentId: result.consignmentId,
    trackingNumber: result.trackingNumber,
  });
}
