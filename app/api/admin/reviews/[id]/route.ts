import { eq } from "drizzle-orm";
import { z } from "zod";
import { guardMutation, jsonError, jsonOk, readJson, requestContext } from "@/lib/api/helpers";
import { getAdminSession } from "@/lib/auth/session";
import { requireAdminWrite } from "@/lib/admin/guard";
import { requireDb } from "@/lib/db";
import { productReviews } from "@/lib/db/schema";
import { audit } from "@/lib/auth/audit";

export const dynamic = "force-dynamic";

const schema = z.object({
  status: z.enum(["pending", "approved", "rejected"]),
  moderationNote: z.string().trim().max(300).optional(),
});

/** PATCH /api/admin/reviews/[id] — approve/reject (ফেইক রিভিউ ব্লক) */
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const guard = guardMutation(request);
  if (guard) return guard;
  const reqContext = requestContext(request.headers);
  const session = await getAdminSession();
  const denied = await requireAdminWrite(session, reqContext.clientIpHash, "reviews");
  if (denied) return denied;

  const parsed = schema.safeParse(await readJson<unknown>(request));
  if (!parsed.success) return jsonError(400, "Invalid moderation payload");

  const { id } = await context.params;
  const db = requireDb("রিভিউ");
  const result = await db
    .update(productReviews)
    .set({
      status: parsed.data.status,
      moderationNote: parsed.data.moderationNote ?? null,
      updatedAt: new Date(),
    })
    .where(eq(productReviews.id, Number(id)))
    .returning({ id: productReviews.id, status: productReviews.status });
  if (result.length === 0) return jsonError(404, "Review not found");

  await audit({
    actorType: "admin",
    actorId: session?.userId ?? null,
    actorName: session?.name ?? null,
    action: `review.${parsed.data.status}`,
    entityType: "product_reviews",
    entityId: id,
    ipHash: reqContext.clientIpHash,
  }).catch(() => undefined);

  return jsonOk({ id: Number(id), status: parsed.data.status });
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const guard = guardMutation(request);
  if (guard) return guard;
  const reqContext = requestContext(request.headers);
  const session = await getAdminSession();
  const denied = await requireAdminWrite(session, reqContext.clientIpHash, "reviews");
  if (denied) return denied;

  const { id } = await context.params;
  const db = requireDb("রিভিউ");
  const result = await db.delete(productReviews).where(eq(productReviews.id, Number(id))).returning({ id: productReviews.id });
  if (result.length === 0) return jsonError(404, "Review not found");

  await audit({
    actorType: "admin",
    actorId: session?.userId ?? null,
    actorName: session?.name ?? null,
    action: "review.delete",
    entityType: "product_reviews",
    entityId: id,
    ipHash: reqContext.clientIpHash,
  }).catch(() => undefined);

  return jsonOk({ deleted: true });
}
