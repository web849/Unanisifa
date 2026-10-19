import { AdminShell } from "@/components/admin/admin-shell";
import { PopupsManager, type PopupRow } from "@/components/admin/popups-manager";
import { getAdminSession } from "@/lib/auth/session";
import { isDatabaseConfigured, requireDb } from "@/lib/db";
import { landingPages, popupCampaigns } from "@/lib/db/schema";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default async function AdminPopupsPage() {
  const session = await getAdminSession();
  if (!session) return null;

  let rows: PopupRow[] = [];
  let pages: Array<{ id: number; title: string; slug: string }> = [];

  if (isDatabaseConfigured) {
    const db = requireDb("পপআপ");
    rows = await db
      .select()
      .from(popupCampaigns)
      .orderBy(sql`${popupCampaigns.priority} DESC, ${popupCampaigns.id} DESC`)
      .limit(100);
    pages = await db.select({ id: landingPages.id, title: landingPages.title, slug: landingPages.slug }).from(landingPages);
  }

  return (
    <AdminShell session={session} counts={{}} title="Popups" subtitle="Store and landing popup campaigns — mystery offer is controlled in Settings">
      {!isDatabaseConfigured ? (
        <div className="pending-note">Pending — database not configured.</div>
      ) : (
        <PopupsManager initial={rows} landingPages={pages} />
      )}
    </AdminShell>
  );
}
