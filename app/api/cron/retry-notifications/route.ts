import { jsonError, jsonOk } from "@/lib/api/helpers";
import { processNotificationQueue } from "@/lib/integrations/notifications";
import { flushTrackingEvents } from "@/lib/integrations/meta";
import { syncOpenShipments } from "@/lib/couriers/service";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * দৈনিক ক্রন — ফেইল হওয়া নোটিফিকেশন রিট্রাই + ট্র্যাকিং কিউ ফ্লাশ।
 * CRON_SECRET দিয়ে প্রটেক্টেড (Authorization: Bearer <secret>)।
 * vercel.json-এ schedule: 0 3 * * * (UTC) = সকাল ৯টা Asia/Dhaka।
 */
export async function GET(request: Request) {
  return run(request);
}

export async function POST(request: Request) {
  return run(request);
}

async function run(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization") ?? "";
  if (!secret || auth !== `Bearer ${secret}`) {
    return jsonError(401, "ক্রন সিক্রেট মেলেনি।");
  }

  const notifications = await processNotificationQueue(50).catch((error) => ({
    processed: 0,
    failed: 1,
    error: error instanceof Error ? error.message : "unknown",
  }));
  const tracking = await flushTrackingEvents().catch(() => ({ sent: 0, skipped: 0 }));
  /* দৈনিক ফলব্যাক সিঙ্ক — ঘন ঘন সিঙ্কের জন্য /api/cron/courier-sync আলাদা আছে */
  const courierSync = await syncOpenShipments(100).catch(() => ({
    checked: 0,
    updated: 0,
    delivered: 0,
    failed: 1,
  }));

  return jsonOk({ notifications, tracking, courierSync, at: new Date().toISOString() });
}
