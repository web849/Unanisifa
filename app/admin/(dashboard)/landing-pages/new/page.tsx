import { AdminShell } from "@/components/admin/admin-shell";
import { LandingCreateForm } from "@/components/admin/landing-create-form";
import { getAdminSession } from "@/lib/auth/session";
import { isDatabaseConfigured, requireDb } from "@/lib/db";
import { coupons, products } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default async function NewLandingPage() {
  const session = await getAdminSession();
  if (!session) return null;

  let productList: Array<{ id: number; name: string }> = [];
  let couponList: Array<{ code: string }> = [];
  if (isDatabaseConfigured) {
    const db = requireDb("ল্যান্ডিং");
    productList = await db
      .select({ id: products.id, name: products.name })
      .from(products)
      .where(eq(products.status, "active"))
      .orderBy(products.id)
      .limit(100);
    couponList = await db
      .select({ code: coupons.code })
      .from(coupons)
      .where(eq(coupons.active, true))
      .orderBy(sql`${coupons.createdAt} DESC`)
      .limit(50);
  }

  return (
    <AdminShell session={session} counts={{}} title="New landing page" subtitle="Starts from a 7-section medicine template">
      {!isDatabaseConfigured ? (
        <div className="pending-note">Pending — database not configured.</div>
      ) : (
        <LandingCreateForm products={productList} coupons={couponList} />
      )}
    </AdminShell>
  );
}
