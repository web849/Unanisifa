import { AdminShell } from "@/components/admin/admin-shell";
import { CategoriesManager, type CategoryRow } from "@/components/admin/categories-manager";
import { getAdminSession } from "@/lib/auth/session";
import { isDatabaseConfigured, requireDb } from "@/lib/db";
import { categories } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

export default async function AdminCategoriesPage() {
  const session = await getAdminSession();
  if (!session) return null;

  let rows: CategoryRow[] = [];
  if (isDatabaseConfigured) {
    const db = requireDb("ক্যাটাগরি");
    rows = await db.select().from(categories).orderBy(categories.sortOrder, categories.id);
  }

  return (
    <AdminShell session={session} counts={{}} title="Categories" subtitle="Group products for navigation and landing targeting">
      {!isDatabaseConfigured ? (
        <div className="pending-note">Pending — database not configured.</div>
      ) : (
        <CategoriesManager initial={rows} />
      )}
    </AdminShell>
  );
}
