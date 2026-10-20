import { jsonError, jsonOk } from "@/lib/api/helpers";
import { syncOpenShipments } from "@/lib/couriers/service";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * কুরিয়ার স্ট্যাটাস সিঙ্ক ক্রন — CRON_SECRET দিয়ে প্রটেক্টেড
 * (Authorization: Bearer <secret>)।
 *
 * vercel.json-এ আলাদা schedule দেওয়া হয়নি (Hobby প্ল্যানে দিনে একবারের বেশি
 * ক্রন চলে না — দৈনিক retry-notifications ক্রনও এই সিঙ্ক চালায়)।
 * ঘন ঘন সিঙ্ক চাইলে: Vercel Pro হলে vercel.json-এ প্রতি ৩০ মিনিটের schedule
 * যোগ করুন, অথবা বাইরের ফ্রি ক্রন সার্ভিস থেকে এই URL কল করুন।
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

  const summary = await syncOpenShipments(100).catch((error) => ({
    checked: 0,
    updated: 0,
    delivered: 0,
    failed: 1,
    error: error instanceof Error ? error.message : "unknown",
  }));

  return jsonOk({ courierSync: summary, at: new Date().toISOString() });
}
