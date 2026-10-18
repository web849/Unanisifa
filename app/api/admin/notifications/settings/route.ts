import { z } from "zod";
import { guardMutation, jsonError, jsonOk, readJson, requestContext } from "@/lib/api/helpers";
import { getAdminSession } from "@/lib/auth/session";
import { requireAdminWrite } from "@/lib/admin/guard";
import { requireDb } from "@/lib/db";
import { notificationSettings } from "@/lib/db/schema";
import { NOTIFICATION_EVENTS } from "@/lib/integrations/notifications";
import { audit } from "@/lib/auth/audit";

export const dynamic = "force-dynamic";

const schema = z.object({
  channel: z.enum(["telegram", "email"]),
  enabled: z.boolean(),
  events: z.array(z.enum([...NOTIFICATION_EVENTS])).default([]),
});

/** PATCH — চ্যানেল enable + ইভেন্ট তালিকা */
export async function PATCH(request: Request) {
  const guard = guardMutation(request);
  if (guard) return guard;
  const reqContext = requestContext(request.headers);
  const session = await getAdminSession();
  const denied = await requireAdminWrite(session, reqContext.clientIpHash, "notifications");
  if (denied) return denied;

  const parsed = schema.safeParse(await readJson<unknown>(request));
  if (!parsed.success) return jsonError(400, "Invalid payload");
  const { channel, enabled, events } = parsed.data;

  const db = requireDb("নোটিফিকেশন");
  await db
    .insert(notificationSettings)
    .values({ channel, enabled, events, updatedAt: new Date() })
    .onConflictDoUpdate({ target: notificationSettings.channel, set: { enabled, events, updatedAt: new Date() } });

  await audit({
    actorType: "admin",
    actorId: session?.userId ?? null,
    actorName: session?.name ?? null,
    action: `notifications.settings.${channel}`,
    entityType: "notification_settings",
    entityId: channel,
    ipHash: reqContext.clientIpHash,
    meta: { enabled, events },
  }).catch(() => undefined);

  return jsonOk({ channel, enabled, events });
}
