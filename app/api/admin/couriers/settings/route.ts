import { z } from "zod";
import { guardMutation, jsonError, jsonOk, readJson, requestContext } from "@/lib/api/helpers";
import { getAdminSession } from "@/lib/auth/session";
import { requireAdminWrite } from "@/lib/admin/guard";
import { saveCourierSettings } from "@/lib/couriers/service";
import { audit } from "@/lib/auth/audit";

export const dynamic = "force-dynamic";

const schema = z.object({
  autoBookOnShipped: z.boolean().optional(),
  defaultWeightKg: z.number().min(0.1).max(30).optional(),
});

/** PATCH — কুরিয়ার অটোমেশন সেটিংস (site_settings → "courier") */
export async function PATCH(request: Request) {
  const guard = guardMutation(request);
  if (guard) return guard;
  const reqContext = requestContext(request.headers);
  const session = await getAdminSession();
  const denied = await requireAdminWrite(session, reqContext.clientIpHash, "couriers");
  if (denied) return denied;

  const parsed = schema.safeParse(await readJson<unknown>(request));
  if (!parsed.success) return jsonError(400, "Invalid courier settings");

  const settings = await saveCourierSettings(parsed.data, session?.userId ?? null);

  await audit({
    actorType: "admin",
    actorId: session?.userId ?? null,
    actorName: session?.name ?? null,
    action: "courier.settings",
    entityType: "site_settings",
    entityId: "courier",
    ipHash: reqContext.clientIpHash,
    meta: { fields: Object.keys(parsed.data) },
  }).catch(() => undefined);

  return jsonOk({ settings });
}
