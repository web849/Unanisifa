import { eq, sql } from "drizzle-orm";
import { AdminShell } from "@/components/admin/admin-shell";
import { SettingsManager } from "@/components/admin/settings-manager";
import type { BrandMediaItem } from "@/components/admin/logo-branding-panel";
import { getAdminSession } from "@/lib/auth/session";
import { isDatabaseConfigured, requireDb } from "@/lib/db";
import { media, siteSettings } from "@/lib/db/schema";
import { DEFAULT_SETTINGS } from "@/lib/config";
import type { BrandSettings, CommerceSettings } from "@/lib/config";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const session = await getAdminSession();
  if (!session) return null;

  let brand: BrandSettings = DEFAULT_SETTINGS.brand;
  let commerce: CommerceSettings = DEFAULT_SETTINGS.commerce;
  // পপআপ মাস্টার সুইচ ডিফল্ট বন্ধ — Settings থেকে চালু না করলে কাস্টমার সাইটে পপআপ আসে না
  let popupsEnabled = false;
  let mysteryEnabled = true;
  let recentMedia: BrandMediaItem[] = [];

  if (isDatabaseConfigured) {
    const db = requireDb("সেটিংস");
    const [rows, mediaRows] = await Promise.all([
      db.select().from(siteSettings),
      db
        .select({
          id: media.id,
          url: media.url,
          mimeType: media.mimeType,
          alt: media.alt,
        })
        .from(media)
        .where(eq(media.folder, "brand"))
        .orderBy(sql`${media.createdAt} DESC`)
        .limit(12),
    ]);
    recentMedia = mediaRows;
    for (const row of rows) {
      const value = row.value as Record<string, unknown>;
      if (row.key === "brand") brand = { ...brand, ...(value as Partial<BrandSettings>) };
      if (row.key === "commerce") commerce = { ...commerce, ...(value as Partial<CommerceSettings>) };
      if (row.key === "popup" && typeof value.popupsEnabled === "boolean") popupsEnabled = value.popupsEnabled;
      if (row.key === "popup" && typeof value.mysteryEnabled === "boolean") mysteryEnabled = value.mysteryEnabled;
    }
  }

  return (
    <AdminShell session={session} counts={{}} title="Settings" subtitle="Logo, brand identity, commerce and popup behaviour">
      {!isDatabaseConfigured ? (
        <div className="pending-note mb-4">Pending — database not configured; settings cannot be saved.</div>
      ) : null}
      <SettingsManager
        brand={brand}
        commerce={commerce}
        popupsEnabled={popupsEnabled}
        mysteryEnabled={mysteryEnabled}
        recentMedia={recentMedia}
      />
    </AdminShell>
  );
}
