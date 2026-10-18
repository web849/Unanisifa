import { AdminShell } from "@/components/admin/admin-shell";
import { ProductForm } from "@/components/admin/product-form";
import { getAdminSession } from "@/lib/auth/session";
import { isDatabaseConfigured, requireDb } from "@/lib/db";
import { categories } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

export default async function NewProductPage() {
  const session = await getAdminSession();
  if (!session) return null;

  let cats: Array<{ id: number; name: string }> = [];
  if (isDatabaseConfigured) {
    const db = requireDb("ক্যাটাগরি");
    cats = await db.select({ id: categories.id, name: categories.name }).from(categories).orderBy(categories.sortOrder);
  }

  return (
    <AdminShell session={session} counts={{}} title="New product" subtitle="Draft by default — publish when ready">
      <ProductForm categories={cats} productId={null} />
    </AdminShell>
  );
}
