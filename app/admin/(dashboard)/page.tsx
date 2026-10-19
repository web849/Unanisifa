import Link from "next/link";
import {
  AlertTriangle,
  Bell,
  PackageSearch,
  ShieldAlert,
  ShoppingCart,
  Star,
  TrendingUp,
  Truck,
} from "lucide-react";
import { AdminShell } from "@/components/admin/admin-shell";
import { getAdminSession } from "@/lib/auth/session";
import { getDashboardMetrics } from "@/lib/admin/dashboard";
import { isDatabaseConfigured } from "@/lib/db";
import { formatDateEn, formatTakaEn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const session = await getAdminSession();
  if (!session) return null;

  if (!isDatabaseConfigured) {
    return (
      <AdminShell session={session} counts={{}} title="Dashboard">
        <div className="pending-note">
          <AlertTriangle aria-hidden="true" />
          <span>
            Pending — database not configured. Set <span className="mono">DATABASE_URL</span> and run
            migrations + seed to see live metrics.
          </span>
        </div>
      </AdminShell>
    );
  }

  const metrics = await getDashboardMetrics();

  const stats = [
    { label: "Total orders", value: String(metrics.totalOrders), icon: ShoppingCart, note: `${metrics.todayOrders} today` },
    { label: "Delivered revenue", value: formatTakaEn(metrics.deliveredRevenue), icon: TrendingUp, note: "all time" },
    { label: "In pipeline", value: String((metrics.pipeline.pending ?? 0) + (metrics.pipeline.confirmed ?? 0) + (metrics.pipeline.processing ?? 0) + (metrics.pipeline.shipped ?? 0)), icon: Truck, note: "pending to shipped" },
    { label: "Fraud review", value: String(metrics.fraudReview), icon: ShieldAlert, note: "orders on hold" },
  ];

  const failures = [
    metrics.failedNotifications > 0
      ? { icon: Bell, label: `${metrics.failedNotifications} notification(s) queued/failed`, href: "/admin/notifications" }
      : null,
    metrics.failedShipments > 0
      ? { icon: Truck, label: `${metrics.failedShipments} courier shipment error(s)`, href: "/admin/couriers" }
      : null,
    metrics.lowStock.length > 0
      ? { icon: PackageSearch, label: `${metrics.lowStock.length} product(s) low on stock`, href: "/admin/products?filter=low" }
      : null,
    metrics.pendingReviews > 0
      ? { icon: Star, label: `${metrics.pendingReviews} review(s) awaiting moderation`, href: "/admin/reviews" }
      : null,
  ].filter(Boolean) as Array<{ icon: typeof Bell; label: string; href: string }>;

  return (
    <AdminShell
      session={session}
      counts={{ orders: metrics.pipeline.pending, reviews: metrics.pendingReviews, fraud: metrics.fraudReview }}
      title="Dashboard"
      subtitle="Store health at a glance"
    >
      <div className="stat-grid">
        {stats.map((stat) => (
          <div className="stat-card" key={stat.label}>
            <span className="stat-label">
              <stat.icon aria-hidden="true" />
              {stat.label}
            </span>
            <p className="stat-value">{stat.value}</p>
            <p className="stat-note">{stat.note}</p>
          </div>
        ))}
      </div>

      {failures.length > 0 ? (
        <div className="panel">
          <div className="panel-head">
            <h2 className="panel-title">Operational failures</h2>
          </div>
          <div className="panel-body stack stack-sm">
            {failures.map((failure) => (
              <Link className="alert alert-warning" key={failure.label} href={failure.href} style={{ textDecoration: "none" }}>
                <failure.icon aria-hidden="true" />
                <span>{failure.label}</span>
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      <div className="panel">
        <div className="panel-head">
          <h2 className="panel-title">Recent orders</h2>
          <Link className="btn btn-outline btn-sm" href="/admin/orders">
            All orders
          </Link>
        </div>
        <div className="table-wrap" style={{ border: 0, borderRadius: 0 }}>
          <table className="table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Customer</th>
                <th>Status</th>
                <th>Risk</th>
                <th style={{ textAlign: "right" }}>Total</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {metrics.recentOrders.map((order) => (
                <tr key={order.id}>
                  <td>
                    <Link className="mono" href={`/admin/orders/${order.id}`}>
                      {order.orderNumber}
                    </Link>
                  </td>
                  <td>
                    {order.name}
                    <br />
                    <span className="text-small text-muted mono">{order.phone}</span>
                  </td>
                  <td>
                    <span className={`status-dot status-${order.status}`}>{order.status}</span>
                  </td>
                  <td>
                    <span className={`fraud-${order.fraudStatus}`}>{order.fraudStatus}</span>
                  </td>
                  <td className="table-num">{formatTakaEn(order.total)}</td>
                  <td className="text-small text-muted">{formatDateEn(order.createdAt)}</td>
                </tr>
              ))}
              {metrics.recentOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-muted">
                    No orders yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <h2 className="panel-title">Low stock</h2>
          <Link className="btn btn-outline btn-sm" href="/admin/products?filter=low">
            Manage
          </Link>
        </div>
        <div className="panel-body">
          {metrics.lowStock.length === 0 ? (
            <p className="text-muted mb-0">All products are sufficiently stocked.</p>
          ) : (
            <ul className="mb-0">
              {metrics.lowStock.map((product) => (
                <li key={product.id}>
                  {product.name} — <strong>{product.stock}</strong> left
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </AdminShell>
  );
}
