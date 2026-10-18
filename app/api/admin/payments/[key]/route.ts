import { eq } from "drizzle-orm";
import { z } from "zod";
import { guardMutation, jsonError, jsonOk, readJson, requestContext } from "@/lib/api/helpers";
import { getAdminSession } from "@/lib/auth/session";
import { requireAdminWrite } from "@/lib/admin/guard";
import { requireDb } from "@/lib/db";
import { paymentMethods } from "@/lib/db/schema";
import { audit } from "@/lib/auth/audit";

export const dynamic = "force-dynamic";

const schema = z.object({
  enabled: z.boolean(),
  isDefault: z.boolean().optional(),
  pendingReason: z.string().trim().max(300).nullable().optional(),
});

/** PATCH /api/admin/payments/[key] — enable/disable; COD সবসময় চালু থাকে */
export async function PATCH(request: Request, context: { params: Promise<{ key: string }> }) {
  const guard = guardMutation(request);
  if (guard) return guard;
  const reqContext = requestContext(request.headers);
  const session = await getAdminSession();
  const denied = await requireAdminWrite(session, reqContext.clientIpHash, "payments");
  if (denied) return denied;

  const { key } = await context.params;
  const parsed = schema.safeParse(await readJson<unknown>(request));
  if (!parsed.success) return jsonError(400, "Invalid payload");

  if (key === "cod" && !parsed.data.enabled) {
    return jsonError(409, "Cash on delivery cannot be disabled — it is the only live payment method.");
  }

  const db = requireDb("পেমেন্ট");
  const values: Record<string, unknown> = { enabled: parsed.data.enabled, updatedAt: new Date() };
  if (parsed.data.isDefault !== undefined) values.isDefault = parsed.data.isDefault;
  if (parsed.data.pendingReason !== undefined) values.pendingReason = parsed.data.pendingReason;

  const result = await db.update(paymentMethods).set(values).where(eq(paymentMethods.key, key)).returning({ key: paymentMethods.key });
  if (result.length === 0) return jsonError(404, "Payment method not found");

  await audit({
    actorType: "admin",
    actorId: session?.userId ?? null,
    actorName: session?.name ?? null,
    action: `payment.${parsed.data.enabled ? "enable" : "disable"}`,
    entityType: "payment_methods",
    entityId: key,
    ipHash: reqContext.clientIpHash,
  }).catch(() => undefined);

  return jsonOk({ key, enabled: parsed.data.enabled });
}
