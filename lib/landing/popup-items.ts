/**
 * ল্যান্ডিং পেজের নিজস্ব পপআপ সেকশন থেকে ক্যাম্পেইন-সদৃশ আইটেম বানায়।
 * সর্বোচ্চ ৩টি/পেজ; পেজ-পপআপ থাকলে জেনেরিক (স্টোর-ওয়াইড) পপআপ বন্ধ।
 */

import type { LandingSection } from "./sections";

export type PagePopupItem = {
  id: number;
  title: string;
  body: string | null;
  imageUrl: string | null;
  ctaLabel: string | null;
  ctaUrl: string | null;
  leadFormEnabled: boolean;
  leadFormLabel: string | null;
  delaySeconds: number;
  frequency: string;
  name: string;
};

export function extractPagePopups(sections: LandingSection[]): PagePopupItem[] {
  return sections
    .filter((section) => section.type === "popup" && !section.hidden)
    .slice(0, 3)
    .map((section, index) => {
      const settings = section.settings as Record<string, unknown>;
      return {
        id: section.id,
        title: String(settings.title ?? "বিশেষ অফার"),
        body: settings.body ? String(settings.body) : null,
        imageUrl: settings.imageUrl ? String(settings.imageUrl) : null,
        ctaLabel: settings.ctaLabel ? String(settings.ctaLabel) : null,
        ctaUrl: settings.ctaUrl ? String(settings.ctaUrl) : null,
        leadFormEnabled: Boolean(settings.leadFormEnabled),
        leadFormLabel: settings.leadFormLabel ? String(settings.leadFormLabel) : null,
        delaySeconds: Number(settings.delaySeconds ?? 3),
        frequency: String(settings.frequency ?? "once_session"),
        name: `page-popup-${index + 1}`,
      };
    });
}
