import { AdminShell } from "@/components/admin/admin-shell";
import { getAdminSession } from "@/lib/auth/session";
import { isDatabaseConfigured } from "@/lib/db";
import {
  getCouponReport,
  getLandingFunnels,
  getLowStockReport,
  getProductPerformance,
  getSalesSummary,
} from "@/lib/admin/reports";
import { formatTakaEn } from "@/lib/utils";

export const dynamic = "force-dynamic";

type Params = Promise<{ from?: string; to?: string }>;

function rangeFrom(params: { from?: string; to?: string }): { from: Date; to: Date } {
  const now = new Date();
  const to = params.to ? new Date(`${params.to}T23:59:59+06:00`) : now;
  const from = params.from ? new Date(`${params.from}T00:00:00+06:00`) : new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000);
  return { from, to };
}

export default async function AdminReportsPage({ searchParams }: { searchParams: Params }) {
  const session = await getAdminSession();
  if (!session) return null;
  const params = await searchParams;

  if (!isDatabaseConfigured) {
    return (
      <AdminShell session={session} counts={{}} title="Reports">
        <div className="pending-note">Pending — database not configured; reports unavailable.</div>
      </AdminShell>
    );
  }

  const range = rangeFrom(params);
  const [summary, performance, funnels, couponReport, lowStock] = await Promise.all([
    getSalesSummary(range),
    getProductPerformance(range),
    getLandingFunnels(),
    getCouponReport(range),
    getLowStockReport(),
  ]);

  return (
    <AdminShell session={session} counts={{}} title="Reports" subtitle={`${range.from.toISOString().slice(0, 10)} to ${range.to.toISOString().slice(0, 10)} (Asia/Dhaka)`}>
      <div className="panel mb-4">
        <div className="panel-body">
          <form className="filters mb-0" method="get">
            <input className="input" type="date" name="from" defaultValue={params.from ?? ""} aria-label="From" />
            <input className="input" type="date" name="to" defaultValue={params.to ?? ""} aria-label="To" />
            <button type="submit" className="btn btn-outline btn-sm">
              Apply
            </button>
          </form>
        </div>
      </div>

      <div className="stat-grid mb-4">
        <div className="stat-card">
          <span className="stat-label">Orders</span>
          <p className="stat-value">{summary.orders}</p>
          <p className="stat-note">{summary.cancelled} cancelled</p>
        </div>
        <div className="stat-card">
          <span className="stat-label">Revenue (all)</span>
          <p className="stat-value">{formatTakaEn(summary.revenue)}</p>
          <p className="stat-note">delivered {formatTakaEn(summary.deliveredRevenue)}</p>
        </div>
        <div className="stat-card">
          <span className="stat-label">Gross profit</span>
          <p className="stat-value">{formatTakaEn(summary.grossProfit)}</p>
          <p className="stat-note">excl. cancelled</p>
        </div>
        <div className="stat-card">
          <span className="stat-label">Discount given</span>
          <p className="stat-value">{formatTakaEn(summary.discountGiven)}</p>
          <p className="stat-note">coupons + offers</p>
        </div>
      </div>

      <div className="panel mb-4">
        <div className="panel-head">
          <h2 className="panel-title">Cost breakdown</h2>
        </div>
        <div className="panel-body grid-4 text-small">
          <p className="mb-0">Product cost: <strong>{formatTakaEn(summary.productCost)}</strong></p>
          <p className="mb-0">Courier cost: <strong>{formatTakaEn(summary.courierCost)}</strong></p>
          <p className="mb-0">Packaging: <strong>{formatTakaEn(summary.packagingCost)}</strong></p>
          <p className="mb-0">Extras: <strong>{formatTakaEn(summary.extrasCost)}</strong></p>
          <p className="mb-0">Delivery collected: <strong>{formatTakaEn(summary.deliveryCollected)}</strong></p>
        </div>
      </div>

      <div className="panel mb-4">
        <div className="panel-head">
          <h2 className="panel-title">Sales by day</h2>
        </div>
        <div className="table-wrap" style={{ border: 0, borderRadius: 0 }}>
          <table className="table">
            <thead>
              <tr>
                <th>Day</th>
                <th style={{ textAlign: "right" }}>Orders</th>
                <th style={{ textAlign: "right" }}>Revenue</th>
              </tr>
            </thead>
            <tbody>
              {summary.byDay.map((row) => (
                <tr key={row.day}>
                  <td className="mono">{row.day}</td>
                  <td className="table-num">{row.orders}</td>
                  <td className="table-num">{formatTakaEn(row.revenue)}</td>
                </tr>
              ))}
              {summary.byDay.length === 0 ? (
                <tr>
                  <td colSpan={3} className="text-muted">
                    No orders in range.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <div className="panel mb-4">
        <div className="panel-head">
          <h2 className="panel-title">Top products</h2>
        </div>
        <div className="table-wrap" style={{ border: 0, borderRadius: 0 }}>
          <table className="table">
            <thead>
              <tr>
                <th>Product</th>
                <th style={{ textAlign: "right" }}>Units</th>
                <th style={{ textAlign: "right" }}>Revenue</th>
                <th style={{ textAlign: "right" }}>Cost</th>
                <th style={{ textAlign: "right" }}>Profit</th>
              </tr>
            </thead>
            <tbody>
              {performance.map((row) => (
                <tr key={`${row.productId ?? "x"}-${row.name}`}>
                  <td>{row.name}</td>
                  <td className="table-num">{row.units}</td>
                  <td className="table-num">{formatTakaEn(row.revenue)}</td>
                  <td className="table-num">{formatTakaEn(row.cost)}</td>
                  <td className="table-num">
                    <span className={row.profit >= 0 ? "stock-ok" : "error-text"}>{formatTakaEn(row.profit)}</span>
                  </td>
                </tr>
              ))}
              {performance.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-muted">
                    No sales in range.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <div className="panel mb-4">
        <div className="panel-head">
          <h2 className="panel-title">Landing funnels</h2>
        </div>
        <div className="table-wrap" style={{ border: 0, borderRadius: 0 }}>
          <table className="table">
            <thead>
              <tr>
                <th>Page</th>
                <th style={{ textAlign: "right" }}>Views</th>
                <th style={{ textAlign: "right" }}>Orders</th>
                <th style={{ textAlign: "right" }}>CVR</th>
                <th style={{ textAlign: "right" }}>Revenue</th>
              </tr>
            </thead>
            <tbody>
              {funnels.map((row) => (
                <tr key={row.landingPageId ?? row.title}>
                  <td>{row.title}</td>
                  <td className="table-num">{row.views}</td>
                  <td className="table-num">{row.orders}</td>
                  <td className="table-num">{row.views > 0 ? `${Math.round((row.orders / row.views) * 100)}%` : "—"}</td>
                  <td className="table-num">{formatTakaEn(row.revenue)}</td>
                </tr>
              ))}
              {funnels.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-muted">
                    No landing pages yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <div className="panel mb-4">
        <div className="panel-head">
          <h2 className="panel-title">Coupon usage</h2>
        </div>
        <div className="table-wrap" style={{ border: 0, borderRadius: 0 }}>
          <table className="table">
            <thead>
              <tr>
                <th>Code</th>
                <th style={{ textAlign: "right" }}>Used (all time)</th>
                <th style={{ textAlign: "right" }}>Orders in range</th>
                <th style={{ textAlign: "right" }}>Discount in range</th>
                <th style={{ textAlign: "right" }}>Revenue in range</th>
              </tr>
            </thead>
            <tbody>
              {couponReport.map((row) => (
                <tr key={row.couponId}>
                  <td className="mono">{row.code}</td>
                  <td className="table-num">{row.usedCount}</td>
                  <td className="table-num">{row.orders}</td>
                  <td className="table-num">{formatTakaEn(row.discountTotal)}</td>
                  <td className="table-num">{formatTakaEn(row.revenue)}</td>
                </tr>
              ))}
              {couponReport.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-muted">
                    No coupons yet.
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
        </div>
        <div className="panel-body">
          {lowStock.length === 0 ? (
            <p className="text-muted mb-0">Nothing below threshold.</p>
          ) : (
            <ul className="mb-0 text-small">
              {lowStock.map((row) => (
                <li key={row.id}>
                  {row.name} — {row.stock} left (threshold {row.lowStockThreshold})
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </AdminShell>
  );
}
