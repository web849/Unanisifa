/**
 * Meta Pixel (ব্রাউজার) + Conversions API (সার্ভার)।
 * একই event_id দিয়ে দুই চ্যানেল ডিডুপ হয়।
 * ক্রেডেনশিয়াল না থাকলে ইভেন্ট কিউতে "skipped" — কখনো ভুয়া সাকসেস নয়।
 * পপআপ Lead ইভেন্টে নাম বা ফোন পাঠানো হয় না।
 */

import { and, eq, inArray } from "drizzle-orm";
import type { NeonDatabase } from "drizzle-orm/neon-serverless";
import type * as schema from "../db/schema";
import { trackingEvents, trackingSettings } from "../db/schema";
import { requireDb, isDatabaseConfigured } from "../db";
import { resolveSecret } from "./secrets";
import { randomUUID } from "node:crypto";

export type TrackingEventName = "Lead" | "AddToCart" | "InitiateCheckout" | "Purchase" | "ViewContent";

type Tx = Parameters<Parameters<NeonDatabase<typeof schema>["transaction"]>[0]>[0];

export async function getMetaSettings() {
  if (!isDatabaseConfigured) return null;
  const db = requireDb("ট্র্যাকিং সেটিংস");
  const rows = await db.select().from(trackingSettings).where(eq(trackingSettings.platform, "meta")).limit(1);
  return rows[0] ?? null;
}

/** পাবলিক পিক্সেল কনফিগ — শুধু pixelId, কখনো টোকেন নয় */
export async function getPublicPixelId(): Promise<string | null> {
  const settings = await getMetaSettings();
  if (!settings?.enabled) return null;
  return settings.pixelId || null;
}

/** ব্রাউজারে বসানোর পিক্সেল স্নিপেট (বেস ইনিট فقط) */
export function pixelSnippet(pixelId: string): string {
  return `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${pixelId}');fbq('track','PageView');`;
}

/** সার্ভার-সাইড ইভেন্ট কিউ */
export async function enqueueTrackingEvent(
  tx: Tx,
  input: {
    eventName: TrackingEventName;
    orderId?: number | null;
    entityType?: string | null;
    entityId?: string | null;
    payload: Record<string, unknown>;
    /** Purchase: স্ট্যাটাস ট্রিগার পর্যন্ত অপেক্ষা করবে */
    deferUntilTrigger?: boolean;
    eventId?: string;
  },
): Promise<void> {
  const eventId = input.eventId ?? randomUUID();
  await tx.insert(trackingEvents).values({
    platform: "meta",
    eventName: input.eventName,
    eventId,
    entityType: input.entityType ?? null,
    entityId: input.entityId ?? null,
    orderId: input.orderId ?? null,
    sentVia: input.deferUntilTrigger ? "queued" : "queued",
    status: input.deferUntilTrigger ? "queued" : "queued",
    payload: { ...input.payload, deferUntilTrigger: input.deferUntilTrigger ?? false },
  });
}

/** CAPI-তে আসল কল */
async function sendCapi(pixelId: string, token: string, event: {
  eventName: string;
  eventId: string;
  payload: Record<string, unknown>;
  createdAt: Date;
  clientIpHash?: string | null;
  userAgent?: string | null;
}): Promise<void> {
  const response = await fetch(`https://graph.facebook.com/v21.0/${pixelId}/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      data: [
        {
          event_name: event.eventName,
          event_time: Math.floor(event.createdAt.getTime() / 1000),
          event_id: event.eventId,
          action_source: "website",
          custom_data: event.payload,
          // PII হ্যাশ আকারেও পাঠানো হয় না — শুধু event_id ডিডুপের জন্য
          user_data: {},
        },
      ],
      access_token: token,
    }),
  });
  const result = (await response.json()) as { error?: { message?: string } };
  if (!response.ok) {
    throw new Error(result.error?.message ?? `Meta CAPI এরর ${response.status}`);
  }
}

/**
 * কিউ থেকে ইভেন্ট পাঠায়।
 * triggerStatus: অর্ডার স্ট্যাটাস যা Purchase ফ্লাশ করে (confirmed/delivered)।
 */
export async function flushTrackingEvents(triggerStatus?: string): Promise<{ sent: number; skipped: number }> {
  if (!isDatabaseConfigured) return { sent: 0, skipped: 0 };
  const db = requireDb("ট্র্যাকিং ফ্লাশ");
  const settings = await getMetaSettings();
  if (!settings?.enabled || !settings.pixelId) {
    return { sent: 0, skipped: 0 };
  }
  const token = await resolveSecret("meta_capi_token", process.env.META_CAPI_TOKEN);

  const pending = await db
    .select()
    .from(trackingEvents)
    .where(and(eq(trackingEvents.status, "queued"), inArray(trackingEvents.platform, ["meta"])))
    .orderBy(trackingEvents.createdAt)
    .limit(25);

  let sent = 0;
  let skipped = 0;

  for (const event of pending) {
    const payload = event.payload as Record<string, unknown> & { deferUntilTrigger?: boolean };
    const isDeferredPurchase = event.eventName === "Purchase" && payload.deferUntilTrigger === true;

    if (isDeferredPurchase && settings.purchaseTrigger !== triggerStatus) {
      continue; // ট্রিগার মেলেনি — পরে ফ্লাশ হবে
    }

    if (!token) {
      await db
        .update(trackingEvents)
        .set({ status: "skipped", lastError: "Meta CAPI টোকেন সেট করা নেই", sentVia: "skipped" })
        .where(eq(trackingEvents.id, event.id));
      skipped += 1;
      continue;
    }

    try {
      await sendCapi(settings.pixelId, token, {
        eventName: event.eventName,
        eventId: event.eventId,
        payload: Object.fromEntries(Object.entries(payload).filter(([k]) => k !== "deferUntilTrigger")),
        createdAt: event.createdAt,
      });
      await db
        .update(trackingEvents)
        .set({ status: "sent", sentVia: "capi", sentAt: new Date(), attempts: event.attempts + 1 })
        .where(eq(trackingEvents.id, event.id));
      sent += 1;
    } catch (error) {
      await db
        .update(trackingEvents)
        .set({
          status: "failed",
          lastError: error instanceof Error ? error.message.slice(0, 300) : "অজানা এরর",
          attempts: event.attempts + 1,
        })
        .where(eq(trackingEvents.id, event.id));
    }
  }

  if (sent > 0) {
    await db
      .update(trackingSettings)
      .set({ lastEventAt: new Date(), updatedAt: new Date() })
      .where(eq(trackingSettings.platform, "meta"));
  }

  return { sent, skipped };
}
