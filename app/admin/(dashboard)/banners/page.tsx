import { AdminShell } from "@/components/admin/admin-shell";
import { BannersManager, type BannerRow } from "@/components/admin/banners-manager";
import { getAdminSession } from "@/lib/auth/session";
import { isDatabaseConfigured, requireDb } from "@/lib/db";
import { banners } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

export default async function AdminBannersPage() {
  const session = await getAdminSession();
  if (!session) return null;

  let rows: BannerRow[] = [];
  if (isDatabaseConfigured) {
    const db = requireDb("ব্যানার");
    rows = await db.select().from(banners).orderBy(banners.sortOrder, banners.id);
  }

  return (
    <AdminShell session={session} counts={{}} title="Banners" subtitle="Home carousel — max 5 active, 1200×480">
      {!isDatabaseConfigured ? (
        <div className="pending-note">Pending — database not configured.</div>
      ) : (
        <BannersManager initial={rows} />
      )}
    </AdminShell>
  );
}
