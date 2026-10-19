import { AdminShell } from "@/components/admin/admin-shell";
import { CouponsManager, type CouponRow } from "@/components/admin/coupons-manager";
import { getAdminSession } from "@/lib/auth/session";
import { isDatabaseConfigured, requireDb } from "@/lib/db";
import { coupons, landingPages } from "@/lib/db/schema";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default async function AdminCouponsPage() {
  const session = await getAdminSession();
  if (!session) return null;

  let rows: CouponRow[] = [];
  let pages: Array<{ id: number; title: string; slug: string }> = [];

  if (isDatabaseConfigured) {
    const db = requireDb("কুপন");
    rows = await db
      .select({
        id: coupons.id,
        code: coupons.code,
        title: coupons.title,
        type: sql<string>`${coupons.type}`,
        value: coupons.value,
        minSubtotal: coupons.minSubtotal,
        maxDiscount: coupons.maxDiscount,
        usageLimit: coupons.usageLimit,
        perPhoneLimit: coupons.perPhoneLimit,
        usedCount: coupons.usedCount,
        startsAt: coupons.startsAt,
        endsAt: coupons.endsAt,
        landingScopeId: coupons.landingScopeId,
        showOnCheckout: coupons.showOnCheckout,
        active: coupons.active,
        description: coupons.description,
      })
      .from(coupons)
      .orderBy(sql`${coupons.createdAt} DESC`)
      .limit(200);
    pages = await db.select({ id: landingPages.id, title: landingPages.title, slug: landingPages.slug }).from(landingPages);
  }

  return (
    <AdminShell session={session} counts={{}} title="Coupons" subtitle="Store-wide, checkout and landing-scoped discount codes">
      {!isDatabaseConfigured ? (
        <div className="pending-note">Pending — database not configured.</div>
      ) : (
        <CouponsManager initial={rows} landingPages={pages} />
      )}
    </AdminShell>
  );
}
