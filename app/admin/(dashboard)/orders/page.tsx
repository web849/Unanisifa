import Link from "next/link";
import { AdminShell } from "@/components/admin/admin-shell";
import { getAdminSession } from "@/lib/auth/session";
import { isDatabaseConfigured, requireDb } from "@/lib/db";
import { orders } from "@/lib/db/schema";
import { and, eq, ilike, sql, gte, lte } from "drizzle-orm";
import { ORDER_STATUSES, ORDER_STATUS_LABEL } from "@/lib/orders/status";
import { formatDateEn, formatTakaEn } from "@/lib/utils";

export const dynamic = "force-dynamic";

type Params = Promise<{
  status?: string;
  search?: string;
  from?: string;
  to?: string;
  fraud?: string;
}>;

export default async function AdminOrdersPage({ searchParams }: { searchParams: Params }) {
  const session = await getAdminSession();
  if (!session) return null;
  const params = await searchParams;

  let rows: Array<{
    id: number;
    orderNumber: string;
    name: string;
    phone: string;
    area: string;
    total: number;
    status: string;
    fraudStatus: string;
    fraudScore: number;
    source: string;
    createdAt: Date;
  }> = [];

  if (isDatabaseConfigured) {
    const db = requireDb("অর্ডার তালিকা");
    const conditions = [];
    if (params.status && ORDER_STATUSES.includes(params.status as never)) {
      conditions.push(eq(orders.status, params.status as "pending"));
    }
    if (params.fraud && ["clear", "watch", "review", "blocked"].includes(params.fraud)) {
      conditions.push(eq(orders.fraudStatus, params.fraud));
    }
    if (params.search?.trim()) {
      const search = params.search.trim();
      const numeric = /^\d+$/.test(search);
      conditions.push(
        numeric
          ? sql`(${ilike(orders.orderNumber, `%${search}%`)} OR ${orders.phone} LIKE ${`%${search}%`})`
          : sql`(${ilike(orders.orderNumber, `%${search}%`)} OR ${ilike(orders.name, `%${search}%`)})`,
      );
    }
    if (params.from) conditions.push(gte(orders.createdAt, new Date(`${params.from}T00:00:00+06:00`)));
    if (params.to) conditions.push(lte(orders.createdAt, new Date(`${params.to}T23:59:59+06:00`)));

    rows = await db
      .select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        name: orders.name,
        phone: orders.phone,
        area: orders.area,
        total: orders.total,
        status: sql<string>`${orders.status}`,
        fraudStatus: orders.fraudStatus,
        fraudScore: orders.fraudScore,
        source: orders.source,
        createdAt: orders.createdAt,
      })
      .from(orders)
      .where(conditions.length > 0 ? and(...conditions) : sql`TRUE`)
      .orderBy(sql`${orders.createdAt} DESC`)
      .limit(300);
  }

  return (
    <AdminShell session={session} counts={{}} title="Orders" subtitle={`${rows.length} order(s) shown`}>
      <div className="panel mb-4">
        <div className="panel-body">
          <form className="filters mb-0" method="get">
            <input className="input" name="search" placeholder="Order no / name / phone" defaultValue={params.search ?? ""} />
            <select className="input" name="status" defaultValue={params.status ?? ""}>
              <option value="">All statuses</option>
              {ORDER_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {ORDER_STATUS_LABEL[status]}
                </option>
              ))}
            </select>
            <select className="input" name="fraud" defaultValue={params.fraud ?? ""}>
              <option value="">All risk</option>
              <option value="clear">Clear</option>
              <option value="watch">Watch</option>
              <option value="review">Review</option>
              <option value="blocked">Blocked</option>
            </select>
            <input className="input" type="date" name="from" defaultValue={params.from ?? ""} aria-label="From date" />
            <input className="input" type="date" name="to" defaultValue={params.to ?? ""} aria-label="To date" />
            <button type="submit" className="btn btn-outline btn-sm">
              Apply
            </button>
          </form>
        </div>
      </div>

      {!isDatabaseConfigured ? (
        <div className="pending-note">Pending — database not configured; order list unavailable.</div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Customer</th>
                <th>Area</th>
                <th style={{ textAlign: "right" }}>Total</th>
                <th>Status</th>
                <th>Risk</th>
                <th>Source</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>
                    <Link className="mono" href={`/admin/orders/${row.id}`}>
                      {row.orderNumber}
                    </Link>
                  </td>
                  <td>
                    {row.name}
                    <br />
                    <span className="text-small text-muted mono">{row.phone}</span>
                  </td>
                  <td className="text-small">{row.area === "inside_dhaka" ? "Dhaka" : "Outside"}</td>
                  <td className="table-num">{formatTakaEn(row.total)}</td>
                  <td>
                    <span className={`status-dot status-${row.status}`}>{row.status}</span>
                  </td>
                  <td>
                    <span className={`fraud-${row.fraudStatus}`} title={`Score ${row.fraudScore}`}>
                      {row.fraudStatus} ({row.fraudScore})
                    </span>
                  </td>
                  <td className="text-small text-muted">{row.source}</td>
                  <td className="text-small text-muted">{formatDateEn(row.createdAt)}</td>
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-muted">
                    No orders match the filter.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      )}
    </AdminShell>
  );
}
