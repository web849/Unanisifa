import { AdminShell } from "@/components/admin/admin-shell";
import { CouriersManager, type CourierRow, type ShipmentRow } from "@/components/admin/couriers-manager";
import { getAdminSession } from "@/lib/auth/session";
import { isDatabaseConfigured, requireDb } from "@/lib/db";
import { courierProviders, courierShipments, orders } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default async function AdminCouriersPage() {
  const session = await getAdminSession();
  if (!session) return null;

  let providers: CourierRow[] = [];
  let shipments: ShipmentRow[] = [];

  if (isDatabaseConfigured) {
    const db = requireDb("কুরিয়ার");
    providers = await db.select().from(courierProviders).orderBy(courierProviders.id);
    shipments = await db
      .select({
        id: courierShipments.id,
        orderId: courierShipments.orderId,
        orderNumber: orders.orderNumber,
        status: courierShipments.status,
        trackingNumber: courierShipments.trackingNumber,
        consignmentId: courierShipments.consignmentId,
        lastError: courierShipments.lastError,
        handedOverAt: courierShipments.handedOverAt,
        createdAt: courierShipments.createdAt,
      })
      .from(courierShipments)
      .leftJoin(orders, eq(courierShipments.orderId, orders.id))
      .orderBy(sql`${courierShipments.createdAt} DESC`)
      .limit(30);
  }

  return (
    <AdminShell session={session} counts={{}} title="Couriers" subtitle="Manual handover is the default mode; API adapters stay Pending without credentials">
      {!isDatabaseConfigured ? (
        <div className="pending-note">Pending — database not configured.</div>
      ) : (
        <CouriersManager providers={providers} shipments={shipments} />
      )}
    </AdminShell>
  );
}
