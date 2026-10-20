import { eq, sql } from "drizzle-orm";
import { AdminShell } from "@/components/admin/admin-shell";
import { LogoBrandingPanel, type BrandMediaItem } from "@/components/admin/logo-branding-panel";
import { getAdminSession } from "@/lib/auth/session";
import { isDatabaseConfigured, requireDb } from "@/lib/db";
import { media, siteSettings } from "@/lib/db/schema";
import { DEFAULT_SETTINGS, type BrandSettings } from "@/lib/config";

export const dynamic = "force-dynamic";

export default async function AdminBrandingPage() {
  const session = await getAdminSession();
  if (!session) return null;

  let brand: BrandSettings = DEFAULT_SETTINGS.brand;
  let recentMedia: BrandMediaItem[] = [];

  if (isDatabaseConfigured) {
    const db = requireDb("ব্র্যান্ডিং");
    const [settingRows, mediaRows] = await Promise.all([
      db.select().from(siteSettings).where(eq(siteSettings.key, "brand")).limit(1),
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
    const saved = settingRows[0]?.value as Partial<BrandSettings> | undefined;
    if (saved) brand = { ...brand, ...saved };
    recentMedia = mediaRows;
  }

  return (
    <AdminShell
      session={session}
      counts={{}}
      title="Logo & Branding"
      subtitle="Upload your store logo, footer light logo, and browser favicon with live preview"
    >
      {!isDatabaseConfigured ? (
        <div className="pending-note mb-4">
          Pending — database not configured; live preview works below, connect DATABASE_URL to persist uploads.
        </div>
      ) : null}
      <LogoBrandingPanel brand={brand} recentMedia={recentMedia} />
    </AdminShell>
  );
}
