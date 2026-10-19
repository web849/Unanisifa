import Link from "next/link";
import { AdminShell } from "@/components/admin/admin-shell";
import { FraudManager, type ReviewOrder, type BlockedRow } from "@/components/admin/fraud-manager";
import { getAdminSession } from "@/lib/auth/session";
import { isDatabaseConfigured, requireDb } from "@/lib/db";
import { blockedNetworks, orders } from "@/lib/db/schema";
import { and, desc, eq, inArray, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default async function AdminFraudPage() {
  const session = await getAdminSession();
  if (!session) return null;

  let reviewOrders: ReviewOrder[] = [];
  let watchOrders: ReviewOrder[] = [];
  let blocked: BlockedRow[] = [];

  if (isDatabaseConfigured) {
    const db = requireDb("ফ্রড");
    const [reviewRows, watchRows, blockedRows] = await Promise.all([
      db
        .select({
          id: orders.id,
          orderNumber: orders.orderNumber,
          name: orders.name,
          phone: orders.phone,
          fraudScore: orders.fraudScore,
          fraudReasons: orders.fraudReasons,
          status: sql<string>`${orders.status}`,
          createdAt: orders.createdAt,
        })
        .from(orders)
        .where(and(eq(orders.fraudStatus, "review"), inArray(orders.status, ["pending", "confirmed"])))
        .orderBy(desc(orders.fraudScore))
        .limit(50),
      db
        .select({
          id: orders.id,
          orderNumber: orders.orderNumber,
          name: orders.name,
          phone: orders.phone,
          fraudScore: orders.fraudScore,
          fraudReasons: orders.fraudReasons,
          status: sql<string>`${orders.status}`,
          createdAt: orders.createdAt,
        })
        .from(orders)
        .where(eq(orders.fraudStatus, "watch"))
        .orderBy(desc(orders.createdAt))
        .limit(50),
      db.select().from(blockedNetworks).orderBy(desc(blockedNetworks.createdAt)).limit(100),
    ]);
    reviewOrders = reviewRows;
    watchOrders = watchRows;
    blocked = blockedRows;
  }

  return (
    <AdminShell
      session={session}
      counts={{ fraud: reviewOrders.length }}
      title="Fraud & IPs"
      subtitle="Review-hold orders, watch list and blocked networks"
    >
      {!isDatabaseConfigured ? (
        <div className="pending-note">Pending — database not configured.</div>
      ) : (
        <FraudManager reviewOrders={reviewOrders} watchOrders={watchOrders} blocked={blocked} />
      )}
      <p className="text-small text-muted">
        Scoring rules live in <span className="mono">lib/orders/fraud-signals.ts</span> — review at 60+, watch at 30+.
        Order list: <Link href="/admin/orders?fraud=review">all review orders</Link>.
      </p>
    </AdminShell>
  );
}
