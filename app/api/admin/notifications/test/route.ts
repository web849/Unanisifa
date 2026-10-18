import { z } from "zod";
import { guardMutation, jsonOk, readJson, requestContext } from "@/lib/api/helpers";
import { getAdminSession } from "@/lib/auth/session";
import { requireAdminWrite } from "@/lib/admin/guard";
import { testSendNotification } from "@/lib/integrations/notifications";
import { requireDb } from "@/lib/db";
import { notificationSettings } from "@/lib/db/schema";
import { audit } from "@/lib/auth/audit";

export const dynamic = "force-dynamic";

const schema = z.object({ channel: z.enum(["telegram", "email"]) });

/** POST — সত্যিকারের টেস্ট পাঠানো হয়; ফলাফল notification_settings-এ লেখা হয় */
export async function POST(request: Request) {
  const guard = guardMutation(request);
  if (guard) return guard;
  const reqContext = requestContext(request.headers);
  const session = await getAdminSession();
  const denied = await requireAdminWrite(session, reqContext.clientIpHash, "notifications");
  if (denied) return denied;

  const parsed = schema.safeParse(await readJson<unknown>(request));
  if (!parsed.success) return jsonOk({ ok: false, message: "Invalid payload" });
  const { channel } = parsed.data;

  const result = await testSendNotification(channel);

  const db = requireDb("নোটিফিকেশন");
  await db
    .insert(notificationSettings)
    .values({
      channel,
      enabled: false,
      events: [],
      lastTestAt: new Date(),
      lastTestStatus: result.ok ? "ok" : "failed",
      lastTestError: result.ok ? null : result.message,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: notificationSettings.channel,
      set: {
        lastTestAt: new Date(),
        lastTestStatus: result.ok ? "ok" : "failed",
        lastTestError: result.ok ? null : result.message,
        updatedAt: new Date(),
      },
    });

  await audit({
    actorType: "admin",
    actorId: session?.userId ?? null,
    actorName: session?.name ?? null,
    action: `notifications.test.${channel}`,
    entityType: "notification_settings",
    entityId: channel,
    ipHash: reqContext.clientIpHash,
    meta: { ok: result.ok },
  }).catch(() => undefined);

  return jsonOk(result);
}
