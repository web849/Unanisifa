/**
 * নোটিফিকেশন কিউ — notification_logs টেবিল।
 * channel: telegram | email · status: queued/processing/sent/failed/skipped
 * কনফিগার না থাকলে "skipped" (ভুয়া সাকসেস নয়); ফেইল হলে retry কিউ,
 * /api/cron/retry-notifications দৈনিক রিট্রাই করে।
 */

import { and, eq, inArray, lte, sql } from "drizzle-orm";
import type { NeonDatabase } from "drizzle-orm/neon-serverless";
import type * as schema from "../db/schema";
import { notificationLogs, notificationSettings, type Order } from "../db/schema";
import { requireDb } from "../db";
import { resolveSecret } from "./secrets";
import { formatTakaEn } from "../utils";

/* ইভেন্ট তালিকা ক্লায়েন্ট-সেফ মডিউলে — অ্যাডমিন UI সেখান থেকে ইমপোর্ট করে */
export {
  NOTIFICATION_EVENTS,
  type NotificationEvent,
} from "./notification-events";
import type { NotificationEvent } from "./notification-events";

type Tx = NeonDatabase<typeof schema> | Parameters<Parameters<NeonDatabase<typeof schema>["transaction"]>[0]>[0];

const EVENT_LABEL: Record<NotificationEvent, string> = {
  order_created: "নতুন অর্ডার",
  order_confirmed: "অর্ডার নিশ্চিত",
  order_shipped: "অর্ডার ডেলিভারিতে",
  order_delivered: "অর্ডার ডেলিভার্ড",
  order_cancelled: "অর্ডার বাতিল",
  fraud_review: "ফ্রড রিভিউ",
  test: "টেস্ট মেসেজ",
};

function eventForStatus(status: string): NotificationEvent | null {
  switch (status) {
    case "confirmed":
      return "order_confirmed";
    case "shipped":
      return "order_shipped";
    case "delivered":
      return "order_delivered";
    case "cancelled":
      return "order_cancelled";
    default:
      return null;
  }
}

/** অর্ডার তৈরি/স্ট্যাটাস পরিবর্তনের পর কিউতে নোটিফিকেশন বসায় */
export async function enqueueOrderNotifications(
  tx: Tx,
  order: Pick<Order, "id" | "orderNumber" | "status" | "total" | "name" | "phone" | "address" | "fraudStatus">,
  lines: Array<{ productName: string; quantity: number }>,
): Promise<void> {
  const events: NotificationEvent[] = [];
  if (order.fraudStatus === "review") events.push("fraud_review");
  const statusEvent = eventForStatus(order.status);
  if (statusEvent) events.push(statusEvent);
  else if (lines.length > 0) events.push("order_created");

  const settings = await tx
    .select()
    .from(notificationSettings)
    .where(inArray(notificationSettings.channel, ["telegram", "email"]));

  for (const channel of ["telegram", "email"] as const) {
    const setting = settings.find((s) => s.channel === channel);
    for (const event of events) {
      const enabled = Boolean(setting?.enabled) && (setting?.events as string[] | null)?.includes(event) !== false;
      const idempotencyKey = `${channel}:${event}:order:${order.id}`;
      const existing = await tx
        .select({ id: notificationLogs.id })
        .from(notificationLogs)
        .where(eq(notificationLogs.idempotencyKey, idempotencyKey))
        .limit(1);
      if (existing[0]) continue;

      await tx.insert(notificationLogs).values({
        channel,
        event,
        entityType: "order",
        entityId: String(order.id),
        idempotencyKey,
        status: enabled ? "queued" : "skipped",
        nextAttemptAt: enabled ? new Date() : null,
        lastError: enabled ? null : `${channel} কনফিগার করা নেই বা ইভেন্টটি চালু নেই`,
        payload: {
          orderNumber: order.orderNumber,
          total: order.total,
          customer: order.name,
          phone: order.phone,
          address: order.address,
          items: lines.map((line) => `${line.productName} x${line.quantity}`),
        },
      });
    }
  }
}

/** Telegram API-তে আসল কল */
async function sendTelegram(token: string, chatId: string, text: string): Promise<void> {
  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
  });
  const payload = (await response.json()) as { ok?: boolean; description?: string };
  if (!response.ok || !payload.ok) {
    throw new Error(payload.description ?? `Telegram এরর ${response.status}`);
  }
}

/** Resend API-তে আসল কল */
async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  const apiKey = await resolveSecret("resend_api_key", process.env.RESEND_API_KEY);
  if (!apiKey) throw new Error("Resend API key সেট করা নেই");
  const fromName = process.env.RESEND_FROM_NAME || "ইউনানী সিফা";
  const fromEmail = process.env.RESEND_FROM_EMAIL || "support@unanisifa.com";
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: `${fromName} <${fromEmail}>`, to: [to], subject, html }),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Resend এরর ${response.status}: ${text.slice(0, 200)}`);
  }
}

function messageText(event: NotificationEvent, payload: Record<string, unknown>): string {
  const items = Array.isArray(payload.items) ? (payload.items as string[]).join(", ") : "";
  return [
    `${EVENT_LABEL[event]} — ${String(payload.orderNumber ?? "")}`,
    `গ্রাহক: ${String(payload.customer ?? "")} (${String(payload.phone ?? "")})`,
    `মোট: ${formatTakaEn(Number(payload.total ?? 0))}`,
    items ? `পণ্য: ${items}` : "",
    `ঠিকানা: ${String(payload.address ?? "")}`,
  ]
    .filter(Boolean)
    .join("\n");
}

/** কিউ থেকে due নোটিফিকেশন পাঠায় (ক্রন + বেস্ট-এফোর্ট ইনলাইন) */
export async function processNotificationQueue(limit = 20): Promise<{ processed: number; failed: number }> {
  const db = requireDb("নোটিফিকেশন প্রসেস");
  let processed = 0;
  let failed = 0;

  const due = await db
    .select()
    .from(notificationLogs)
    .where(
      and(
        inArray(notificationLogs.status, ["queued", "failed"]),
        lte(notificationLogs.nextAttemptAt, new Date()),
      ),
    )
    .orderBy(notificationLogs.createdAt)
    .limit(limit);

  for (const log of due) {
    const payload = log.payload as Record<string, unknown>;
    try {
      await db
        .update(notificationLogs)
        .set({ status: "processing", attempts: sql`${notificationLogs.attempts} + 1`, updatedAt: new Date() })
        .where(eq(notificationLogs.id, log.id));

      if (log.channel === "telegram") {
        const token = await resolveSecret("telegram_bot_token", process.env.TELEGRAM_BOT_TOKEN);
        const chatId = await resolveSecret("telegram_chat_id", process.env.TELEGRAM_CHAT_ID);
        if (!token || !chatId) throw new Error("Telegram bot token/chat id সেট করা নেই");
        await sendTelegram(token, chatId, messageText(log.event as NotificationEvent, payload));
      } else {
        const to = process.env.ALERT_EMAIL || process.env.ADMIN_EMAIL;
        if (!to) throw new Error("ALERT_EMAIL/ADMIN_EMAIL সেট করা নেই");
        await sendEmail(
          to,
          `${EVENT_LABEL[log.event as NotificationEvent] ?? log.event} — ${String(payload.orderNumber ?? "")}`,
          `<pre style="font-family:monospace">${messageText(log.event as NotificationEvent, payload).replace(/</g, "&lt;")}</pre>`,
        );
      }

      await db
        .update(notificationLogs)
        .set({ status: "sent", sentAt: new Date(), lastError: null, updatedAt: new Date() })
        .where(eq(notificationLogs.id, log.id));
      processed += 1;
    } catch (error) {
      failed += 1;
      const attempts = log.attempts + 1;
      const backoffMinutes = Math.min(60, 2 ** attempts);
      await db
        .update(notificationLogs)
        .set({
          status: attempts >= log.maxAttempts ? "failed" : "queued",
          nextAttemptAt: new Date(Date.now() + backoffMinutes * 60 * 1000),
          lastError: error instanceof Error ? error.message.slice(0, 400) : "অজানা এরর",
          updatedAt: new Date(),
        })
        .where(eq(notificationLogs.id, log.id));
    }
  }

  return { processed, failed };
}

/** অ্যাডমিনের Test Send — স্পষ্টভাবে লেবেল করা */
export async function testSendNotification(channel: "telegram" | "email"): Promise<{ ok: boolean; message: string }> {
  const db = requireDb("টেস্ট নোটিফিকেশন");
  const idempotencyKey = `${channel}:test:${Date.now()}`;
  const payload = {
    orderNumber: "TEST-000000",
    total: 0,
    customer: "টেস্ট",
    phone: "-",
    address: "এটি একটি টেস্ট মেসেজ",
    items: [],
  };
  const [log] = await db
    .insert(notificationLogs)
    .values({
      channel,
      event: "test",
      entityType: "system",
      entityId: "test",
      idempotencyKey,
      status: "queued",
      nextAttemptAt: new Date(),
      payload,
    })
    .returning();

  const result = await processNotificationQueue(1);
  const updated = await db
    .select()
    .from(notificationLogs)
    .where(eq(notificationLogs.id, log.id))
    .limit(1);
  const status = updated[0]?.status ?? "failed";

  await db
    .update(notificationSettings)
    .set({
      lastTestAt: new Date(),
      lastTestStatus: status,
      lastTestError: updated[0]?.lastError ?? null,
      updatedAt: new Date(),
    })
    .where(eq(notificationSettings.channel, channel));

  void result;
  return status === "sent"
    ? { ok: true, message: "টেস্ট মেসেজ পাঠানো হয়েছে।" }
    : { ok: false, message: `টেস্ট ব্যর্থ: ${updated[0]?.lastError ?? "অজানা কারণ"}` };
}
