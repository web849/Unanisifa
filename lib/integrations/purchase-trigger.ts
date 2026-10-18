/**
 * Purchase ইভেন্ট ট্রিগার — ডিফল্ট "confirmed", চাইলে "delivered"।
 * অ্যাডমিন → Integrations → Meta থেকে বদলানো যায় (tracking_settings.purchase_trigger)।
 */

import { eq } from "drizzle-orm";
import { isDatabaseConfigured, requireDb } from "../db";
import { trackingSettings } from "../db/schema";
import { flushTrackingEvents } from "./meta";

export type PurchaseTrigger = "confirmed" | "delivered";

export async function getPurchaseTrigger(): Promise<PurchaseTrigger> {
  if (!isDatabaseConfigured) return "confirmed";
  const db = requireDb("Purchase ট্রিগার");
  const rows = await db.select().from(trackingSettings).where(eq(trackingSettings.platform, "meta")).limit(1);
  const value = rows[0]?.purchaseTrigger;
  return value === "delivered" ? "delivered" : "confirmed";
}

/** অর্ডার স্ট্যাটাস বদলালে কল করতে হবে — মিললে Purchase ফ্লাশ হয় */
export async function onOrderStatusChanged(status: string): Promise<void> {
  const trigger = await getPurchaseTrigger();
  if (status === trigger) {
    await flushTrackingEvents(status).catch(() => undefined);
  }
}
