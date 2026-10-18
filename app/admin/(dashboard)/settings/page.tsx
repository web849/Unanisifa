import { AdminShell } from "@/components/admin/admin-shell";
import { SettingsManager } from "@/components/admin/settings-manager";
import { getAdminSession } from "@/lib/auth/session";
import { isDatabaseConfigured, requireDb } from "@/lib/db";
import { siteSettings } from "@/lib/db/schema";
import { DEFAULT_SETTINGS } from "@/lib/config";
import type { BrandSettings, CommerceSettings } from "@/lib/config";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const session = await getAdminSession();
  if (!session) return null;

  let brand: BrandSettings = DEFAULT_SETTINGS.brand;
  let commerce: CommerceSettings = DEFAULT_SETTINGS.commerce;
  let mysteryEnabled = true;

  if (isDatabaseConfigured) {
    const db = requireDb("সেটিংস");
    const rows = await db.select().from(siteSettings);
    for (const row of rows) {
      const value = row.value as Record<string, unknown>;
      if (row.key === "brand") brand = { ...brand, ...(value as Partial<BrandSettings>) };
      if (row.key === "commerce") commerce = { ...commerce, ...(value as Partial<CommerceSettings>) };
      if (row.key === "popup" && typeof value.mysteryEnabled === "boolean") mysteryEnabled = value.mysteryEnabled;
    }
  }

  return (
    <AdminShell session={session} counts={{}} title="Settings" subtitle="Brand, commerce and popup behaviour">
      {!isDatabaseConfigured ? (
        <div className="pending-note">Pending — database not configured; settings cannot be saved.</div>
      ) : (
        <SettingsManager brand={brand} commerce={commerce} mysteryEnabled={mysteryEnabled} />
      )}
    </AdminShell>
  );
}
