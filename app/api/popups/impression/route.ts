import { eq, sql } from "drizzle-orm";
import { guardMutation, jsonOk, readJson } from "@/lib/api/helpers";
import { isDatabaseConfigured, requireDb } from "@/lib/db";
import { popupCampaigns } from "@/lib/db/schema";
import { z } from "zod";

export const dynamic = "force-dynamic";

/** পপআপ ইমপ্রেশন কাউন্ট — অ্যানালিটিক্সের জন্য */
export async function POST(request: Request) {
  const guard = guardMutation(request);
  if (guard) return guard;

  const parsed = z
    .object({ campaignId: z.number().int().positive() })
    .safeParse(await readJson<unknown>(request));
  if (!parsed.success) return jsonOk({ counted: false });
  if (!isDatabaseConfigured) return jsonOk({ counted: false });

  const db = requireDb("পপআপ ইমপ্রেশন");
  await db
    .update(popupCampaigns)
    .set({ impressions: sql`${popupCampaigns.impressions} + 1`, updatedAt: new Date() })
    .where(eq(popupCampaigns.id, parsed.data.campaignId));

  return jsonOk({ counted: true });
}
