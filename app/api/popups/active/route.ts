import { and, eq, isNull, or, sql } from "drizzle-orm";
import { isDatabaseConfigured, requireDb } from "@/lib/db";
import { landingPages, popupCampaigns, siteSettings } from "@/lib/db/schema";
import { extractPagePopups } from "@/lib/landing/popup-items";
import type { LandingSection } from "@/lib/landing/sections";
import { jsonOk } from "@/lib/api/helpers";

export const dynamic = "force-dynamic";

/**
 * কোন পপআপ দেখানো হবে — অগ্রাধিকার (স্পেক ৭ঘ):
 * ১) মিস্ট্রি অফার চালু থাকলে ল্যান্ডিংয়ে শুধু মিস্ট্রি
 * ২) পেজ-নিজস্ব পপআপ থাকলে জেনেরিক বন্ধ
 * ৩) checkout / thank-you / account-এ কখনো নয় (ক্লায়েন্টও গার্ড করে)
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const path = url.searchParams.get("path") ?? "/";

  if (!isDatabaseConfigured) {
    return jsonOk({ kind: "none" });
  }

  const db = requireDb("পপআপ");

  // মাস্টার সুইচ (site_settings → popup.popupsEnabled):
  // ডিফল্ট বন্ধ — অ্যাডমিন Settings থেকে স্পষ্টভাবে চালু না করলে
  // কাস্টমার সাইটে ঢুকলেই কোনো পপআপ (মিস্ট্রি/ক্যাম্পেইন/পেজ) আসবে না।
  const settingRows = await db.select().from(siteSettings).where(eq(siteSettings.key, "popup")).limit(1);
  const popupSettings = (settingRows[0]?.value ?? {}) as {
    popupsEnabled?: boolean;
    mysteryEnabled?: boolean;
  };
  if (popupSettings.popupsEnabled !== true) {
    return jsonOk({ kind: "none" });
  }

  // মিস্ট্রি অফার চালু কি না (site_settings → popup.mysteryEnabled)
  const mysteryEnabled = popupSettings.mysteryEnabled !== false;

  const isLanding = path.startsWith("/offer/");
  const landingSlug = isLanding ? path.replace("/offer/", "").split("?")[0] : null;

  if (isLanding && landingSlug) {
    const page = await db
      .select()
      .from(landingPages)
      .where(and(eq(landingPages.slug, landingSlug), eq(landingPages.status, "published")))
      .limit(1);
    if (page[0]) {
      if (mysteryEnabled) return jsonOk({ kind: "mystery" });
      const pagePopups = extractPagePopups((page[0].sections as LandingSection[]) ?? []);
      if (pagePopups.length > 0) {
        return jsonOk({ kind: "campaign", campaign: pagePopups[0] });
      }
    }
  }

  if (mysteryEnabled && !isLanding) {
    // স্টোর পেজেও মিস্ট্রি অফার প্রাধান্য পায়
    return jsonOk({ kind: "mystery" });
  }

  const now = new Date();
  const campaigns = await db
    .select()
    .from(popupCampaigns)
    .where(
      and(
        eq(popupCampaigns.active, true),
        or(isNull(popupCampaigns.startsAt), sql`${popupCampaigns.startsAt} <= ${now}`),
        or(isNull(popupCampaigns.endsAt), sql`${popupCampaigns.endsAt} >= ${now}`),
      ),
    )
    .orderBy(popupCampaigns.priority)
    .limit(10);

  const targeted = campaigns.find((campaign) => {
    if (campaign.scope === "store") return !isLanding;
    if (isLanding && landingSlug) {
      return campaign.landingPageId != null && campaign.scope === `landing:${landingSlug}`;
    }
    return false;
  });
  const storeWide = campaigns.find((campaign) => campaign.scope === "store");
  const chosen = targeted ?? storeWide ?? null;

  if (!chosen) return jsonOk({ kind: "none" });

  return jsonOk({
    kind: "campaign",
    campaign: {
      id: chosen.id,
      title: chosen.title,
      body: chosen.body,
      imageUrl: chosen.imageUrl,
      ctaLabel: chosen.ctaLabel,
      ctaUrl: chosen.ctaUrl,
      leadFormEnabled: chosen.leadFormEnabled,
      leadFormLabel: chosen.leadFormLabel,
      delaySeconds: chosen.delaySeconds,
      frequency: chosen.frequency,
      name: chosen.name,
    },
  });
}


