import { AdminShell } from "@/components/admin/admin-shell";
import { CouriersManager, type CourierRow, type ShipmentRow } from "@/components/admin/couriers-manager";
import { getAdminSession } from "@/lib/auth/session";
import { isDatabaseConfigured, requireDb } from "@/lib/db";
import { courierProviders, courierShipments, orders } from "@/lib/db/schema";
import {
  ensureCourierProviders,
  getCourierSettings,
  DEFAULT_COURIER_SETTINGS,
  type CourierSettings,
} from "@/lib/couriers/service";
import { trackingUrlFor } from "@/lib/couriers/types";
import { eq, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default async function AdminCouriersPage() {
  const session = await getAdminSession();
  if (!session) return null;

  let providers: CourierRow[] = [];
  let shipments: ShipmentRow[] = [];
  let settings: CourierSettings = DEFAULT_COURIER_SETTINGS;

  if (isDatabaseConfigured) {
    const db = requireDb("কুরিয়ার");
    /* seed না থাকলেও manual/steadfast/pathao কানেক্ট ফর্ম সবসময় দেখা যাবে */
    await ensureCourierProviders(db);
    settings = await getCourierSettings();
    providers = await db
      .select({
        id: courierProviders.id,
        adapter: courierProviders.adapter,
        name: courierProviders.name,
        enabled: courierProviders.enabled,
        isDefault: courierProviders.isDefault,
        lastConnectionStatus: courierProviders.lastConnectionStatus,
        lastConnectionAt: courierProviders.lastConnectionAt,
        lastError: courierProviders.lastError,
        /* ক্রেডেনশিয়াল ব্রাউজারে যায় না — শুধু "সেভ আছে কি না" */
        hasCredentials: sql<boolean>`${courierProviders.credentialsEncrypted} IS NOT NULL`,
      })
      .from(courierProviders)
      .orderBy(courierProviders.id);
    const shipmentRows = await db
      .select({
        id: courierShipments.id,
        orderId: courierShipments.orderId,
        orderNumber: orders.orderNumber,
        providerName: courierProviders.name,
        providerAdapter: courierProviders.adapter,
        status: courierShipments.status,
        trackingNumber: courierShipments.trackingNumber,
        consignmentId: courierShipments.consignmentId,
        lastError: courierShipments.lastError,
        handedOverAt: courierShipments.handedOverAt,
        lastSyncedAt: courierShipments.lastSyncedAt,
        createdAt: courierShipments.createdAt,
      })
      .from(courierShipments)
      .leftJoin(orders, eq(courierShipments.orderId, orders.id))
      .leftJoin(courierProviders, eq(courierShipments.providerId, courierProviders.id))
      .orderBy(sql`${courierShipments.createdAt} DESC`)
      .limit(30);
    shipments = shipmentRows.map((row) => ({
      ...row,
      trackingUrl: trackingUrlFor(row.providerAdapter ?? "", row.trackingNumber, row.consignmentId),
    }));
  }

  return (
    <AdminShell
      session={session}
      counts={{}}
      title="Couriers"
      subtitle="কুরিয়ার API এখান থেকেই কানেক্ট করুন — shipped হলেই অটো-বুকিং, ডেলিভারড হলে অটো-আপডেট"
    >
      {!isDatabaseConfigured ? (
        <div className="pending-note">Pending — database not configured.</div>
      ) : (
        <CouriersManager providers={providers} shipments={shipments} settings={settings} />
      )}
    </AdminShell>
  );
}
