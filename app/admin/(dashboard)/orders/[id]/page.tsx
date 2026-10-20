import Link from "next/link";
import { notFound } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { AdminShell } from "@/components/admin/admin-shell";
import { OrderActions } from "@/components/admin/order-actions";
import { OrderCourierPanel } from "@/components/admin/order-courier-panel";
import { getAdminSession } from "@/lib/auth/session";
import { isDatabaseConfigured, requireDb } from "@/lib/db";
import { courierProviders, courierShipments, orderItems, orderStatusHistory, orders } from "@/lib/db/schema";
import { trackingUrlFor } from "@/lib/couriers/types";
import { ensureCourierProviders } from "@/lib/couriers/service";
import { eq } from "drizzle-orm";
import { nextStatuses, ORDER_STATUS_LABEL } from "@/lib/orders/status";
import { formatDateEn, formatTakaEn } from "@/lib/utils";
import type { OrderStatusValue } from "@/lib/orders/status";
import { getBrand } from "@/lib/store/repository";

export const dynamic = "force-dynamic";

export default async function AdminOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getAdminSession();
  if (!session) return null;
  const { id } = await params;
  if (!isDatabaseConfigured) notFound();

  const db = requireDb("অর্ডার");
  await ensureCourierProviders(db);
  const rows = await db.select().from(orders).where(eq(orders.id, Number(id))).limit(1);
  const order = rows[0];
  if (!order) notFound();

  const [brand, items, history, shipmentRows, courierProviderRows] = await Promise.all([
    getBrand(),
    db.select().from(orderItems).where(eq(orderItems.orderId, order.id)),
    db.select().from(orderStatusHistory).where(eq(orderStatusHistory.orderId, order.id)).orderBy(orderStatusHistory.id),
    db
      .select({
        status: courierShipments.status,
        consignmentId: courierShipments.consignmentId,
        trackingNumber: courierShipments.trackingNumber,
        providerName: courierProviders.name,
        providerAdapter: courierProviders.adapter,
        lastError: courierShipments.lastError,
        handedOverAt: courierShipments.handedOverAt,
        lastSyncedAt: courierShipments.lastSyncedAt,
      })
      .from(courierShipments)
      .leftJoin(courierProviders, eq(courierShipments.providerId, courierProviders.id))
      .where(eq(courierShipments.orderId, order.id))
      .limit(1),
    db
      .select({
        id: courierProviders.id,
        name: courierProviders.name,
        adapter: courierProviders.adapter,
        isDefault: courierProviders.isDefault,
      })
      .from(courierProviders)
      .where(eq(courierProviders.enabled, true))
      .orderBy(courierProviders.id),
  ]);
  const courierShipment = shipmentRows[0]
    ? {
        ...shipmentRows[0],
        trackingUrl: trackingUrlFor(
          shipmentRows[0].providerAdapter ?? "",
          shipmentRows[0].trackingNumber,
          shipmentRows[0].consignmentId,
        ),
      }
    : null;

  const fraudReasons = Array.isArray(order.fraudReasons) ? (order.fraudReasons as string[]) : [];
  const next = nextStatuses(order.status as OrderStatusValue);

  return (
    <AdminShell session={session} counts={{}} title={`Order ${order.orderNumber}`} subtitle={formatDateEn(order.createdAt)}>
      <div className="admin-detail-grid">
        <div className="stack stack-md">
          <OrderActions
            orderId={order.id}
            orderNumber={order.orderNumber}
            status={order.status}
            nextOptions={next}
            statusLabels={ORDER_STATUS_LABEL}
          />

          <div className="panel">
            <div className="panel-head">
              <h2 className="panel-title">Items</h2>
            </div>
            <div className="table-wrap" style={{ border: 0, borderRadius: 0 }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th style={{ textAlign: "right" }}>Price</th>
                    <th style={{ textAlign: "right" }}>Qty</th>
                    <th style={{ textAlign: "right" }}>Line total</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td>
                        {item.productName}
                        {item.variantName ? <span className="text-muted"> · {item.variantName}</span> : null}
                      </td>
                      <td className="table-num">{formatTakaEn(item.unitPrice)}</td>
                      <td className="table-num">{item.quantity}</td>
                      <td className="table-num">{formatTakaEn(item.lineTotal)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={3}>Subtotal</td>
                    <td className="table-num">{formatTakaEn(order.subtotal)}</td>
                  </tr>
                  {order.discount > 0 ? (
                    <tr>
                      <td colSpan={3}>Discount {order.couponCode ? `(${order.couponCode})` : ""}</td>
                      <td className="table-num">−{formatTakaEn(order.discount)}</td>
                    </tr>
                  ) : null}
                  <tr>
                    <td colSpan={3}>Delivery ({order.area === "inside_dhaka" ? "inside Dhaka" : "outside Dhaka"})</td>
                    <td className="table-num">{formatTakaEn(order.deliveryCharge)}</td>
                  </tr>
                  <tr>
                    <td colSpan={3}>
                      <strong>Total</strong>
                    </td>
                    <td className="table-num">
                      <strong>{formatTakaEn(order.total)}</strong>
                    </td>
                  </tr>
                  {order.advance > 0 ? (
                    <tr>
                      <td colSpan={3}>Advance paid · due on delivery</td>
                      <td className="table-num">
                        {formatTakaEn(order.advance)} · {formatTakaEn(order.dueAmount)}
                      </td>
                    </tr>
                  ) : null}
                </tfoot>
              </table>
            </div>
          </div>

          <div className="panel">
            <div className="panel-head">
              <h2 className="panel-title">Timeline</h2>
            </div>
            <div className="panel-body">
              <ul className="timeline">
                {history.map((entry) => (
                  <li key={entry.id}>
                    <span className={`status-dot status-${entry.toStatus}`}>{ORDER_STATUS_LABEL[entry.toStatus as OrderStatusValue] ?? entry.toStatus}</span>
                    <span className="text-small text-muted">{formatDateEn(entry.createdAt)}</span>
                    {entry.note ? <span className="text-small"> — {entry.note}</span> : null}
                  </li>
                ))}
                {history.length === 0 ? <li className="text-muted">No transitions recorded yet.</li> : null}
              </ul>
            </div>
          </div>

          <OrderCourierPanel
            orderId={order.id}
            orderStatus={order.status}
            providers={courierProviderRows}
            shipment={courierShipment}
          />
        </div>

        <div className="stack stack-md">
          <div className="panel">
            <div className="panel-head">
              <h2 className="panel-title">Customer</h2>
            </div>
            <div className="panel-body stack stack-sm">
              <p className="mb-0">{order.name}</p>
              <p className="mb-0 mono">{order.phone}</p>
              {order.email ? <p className="mb-0 text-small">{order.email}</p> : null}
              <p className="mb-0 text-small">{order.address}</p>
              <p className="mb-0 text-small text-muted">
                {order.area === "inside_dhaka" ? "Inside Dhaka" : "Outside Dhaka"} · {order.paymentMethod.toUpperCase()} ·{" "}
                {order.paymentStatus}
              </p>
              {order.note ? <p className="mb-0 text-small">Note: {order.note}</p> : null}
              <p className="mb-0 text-small text-muted">
                Source: {order.source}
                {order.campaign ? ` · ${order.campaign}` : ""}
                {order.landingPageId ? (
                  <>
                    {" · "}
                    <Link href={`/admin/landing-pages/${order.landingPageId}`}>landing #{order.landingPageId}</Link>
                  </>
                ) : null}
              </p>
            </div>
          </div>

          <div className="panel">
            <div className="panel-head">
              <h2 className="panel-title">Fraud assessment</h2>
            </div>
            <div className="panel-body stack stack-sm">
              <p className="mb-0">
                Score <strong>{order.fraudScore}</strong> ·{" "}
                <span className={`fraud-${order.fraudStatus}`}>{order.fraudStatus}</span>
              </p>
              {fraudReasons.length > 0 ? (
                <ul className="mb-0 text-small">
                  {fraudReasons.map((reason) => (
                    <li key={reason}>{reason}</li>
                  ))}
                </ul>
              ) : null}
              {order.fraudStatus === "review" || order.fraudStatus === "blocked" ? (
                <p className="alert alert-danger mb-0">
                  <ShieldAlert aria-hidden="true" />
                  <span>Call the customer before confirming this order.</span>
                </p>
              ) : null}
              <p className="mb-0 text-small text-muted">
                IP hash: <span className="mono">{order.clientIpHash ?? "—"}</span>
              </p>
            </div>
          </div>

          <div className="panel">
            <div className="panel-head">
              <h2 className="panel-title">Cost snapshot</h2>
            </div>
            <div className="panel-body text-small">
              <p className="mb-0">Courier cost: {formatTakaEn(order.courierCost)}</p>
              <p className="mb-0">Packaging: {formatTakaEn(order.packagingCost)}</p>
              <p className="mb-0">Extras: {formatTakaEn(order.extrasCost)}</p>
              <p className="mb-0">
                Gross profit (excl. product cost):{" "}
                {formatTakaEn(order.total - order.courierCost - order.packagingCost - order.extrasCost)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* প্রিন্ট-যোগ্য ইনভয়েস (window.print) */}
      <div className="invoice-print">
        <header>
          {brand.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={brand.logoUrl}
              alt={brand.name}
              style={{
                height: 40,
                width: "auto",
                maxWidth: 180,
                objectFit: "contain",
                verticalAlign: "middle",
                marginRight: 10,
              }}
            />
          ) : null}
          <strong>{brand.name}</strong> — ইনভয়েস {order.orderNumber} · {formatDateEn(order.createdAt)}
        </header>
        <table>
          <thead>
            <tr>
              <th>পণ্য</th>
              <th>দাম</th>
              <th>পরিমাণ</th>
              <th>মোট</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>{item.productName}</td>
                <td>{formatTakaEn(item.unitPrice)}</td>
                <td>{item.quantity}</td>
                <td>{formatTakaEn(item.lineTotal)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={3}>সাবটোটাল</td>
              <td>{formatTakaEn(order.subtotal)}</td>
            </tr>
            {order.discount > 0 ? (
              <tr>
                <td colSpan={3}>ছাড় {order.couponCode ? `(${order.couponCode})` : ""}</td>
                <td>−{formatTakaEn(order.discount)}</td>
              </tr>
            ) : null}
            <tr>
              <td colSpan={3}>ডেলিভারি</td>
              <td>{formatTakaEn(order.deliveryCharge)}</td>
            </tr>
            <tr>
              <td colSpan={3}>সর্বমোট</td>
              <td>{formatTakaEn(order.total)}</td>
            </tr>
          </tfoot>
        </table>
        <footer>
          গ্রাহক: {order.name} · {order.phone} · {order.address} · পেমেন্ট: {order.paymentMethod.toUpperCase()} (
          {order.paymentStatus})
        </footer>
      </div>
    </AdminShell>
  );
}
