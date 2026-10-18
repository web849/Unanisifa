import { AdminShell } from "@/components/admin/admin-shell";
import { PagesManager, type PageRow } from "@/components/admin/pages-manager";
import { getAdminSession } from "@/lib/auth/session";
import { isDatabaseConfigured, requireDb } from "@/lib/db";
import { cmsPages } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

export default async function AdminPagesPage() {
  const session = await getAdminSession();
  if (!session) return null;

  let rows: PageRow[] = [];
  if (isDatabaseConfigured) {
    const db = requireDb("CMS");
    rows = await db.select().from(cmsPages).orderBy(cmsPages.sortOrder, cmsPages.slug);
  }

  return (
    <AdminShell session={session} counts={{}} title="Pages" subtitle="About, contact, shipping, terms, privacy, FAQ — served at /{slug}">
      {!isDatabaseConfigured ? (
        <div className="pending-note">Pending — database not configured.</div>
      ) : (
        <PagesManager initial={rows} />
      )}
    </AdminShell>
  );
}
