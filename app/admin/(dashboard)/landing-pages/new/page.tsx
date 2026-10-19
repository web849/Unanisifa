import { AdminShell } from "@/components/admin/admin-shell";
import { LandingCreateForm } from "@/components/admin/landing-create-form";
import { getAdminSession } from "@/lib/auth/session";
import { isDatabaseConfigured, requireDb } from "@/lib/db";
import { coupons } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { getLandingCatalog } from "@/lib/landing/products";

export const dynamic = "force-dynamic";

export default async function NewLandingPage() {
  const session = await getAdminSession();
  if (!session) return null;

  let couponList: Array<{ code: string }> = [];
  const catalog = await getLandingCatalog({ demoFallback: true });

  if (isDatabaseConfigured) {
    const db = requireDb("ল্যান্ডিং");
    couponList = await db
      .select({ code: coupons.code })
      .from(coupons)
      .where(eq(coupons.active, true))
      .orderBy(sql`${coupons.createdAt} DESC`)
      .limit(50);
  }

  return (
    <AdminShell session={session} counts={{}} title="New landing page" subtitle="Starts from a 10-block medicine template">
      {!isDatabaseConfigured ? (
        <div className="pending-note">Pending — database not configured.</div>
      ) : (
        <LandingCreateForm
          products={catalog.items}
          demoFallback={catalog.demoFallback}
          coupons={couponList}
          canWrite={session.role !== "viewer"}
        />
      )}
    </AdminShell>
  );
}
