import Link from "next/link";
import { AdminShell } from "@/components/admin/admin-shell";
import { getAdminSession } from "@/lib/auth/session";
import { isDatabaseConfigured, requireDb } from "@/lib/db";
import { abandonedCheckouts } from "@/lib/db/schema";
import { sql, eq } from "drizzle-orm";
import { formatDateEn, formatTakaEn } from "@/lib/utils";

export const dynamic = "force-dynamic";

type Params = Promise<{ status?: string }>;

export default async function AdminAbandonedPage({ searchParams }: { searchParams: Params }) {
  const session = await getAdminSession();
  if (!session) return null;
  const params = await searchParams;

  let rows: Array<{
    id: number;
    name: string;
    phone: string;
    address: string | null;
    area: string | null;
    subtotal: number;
    couponCode: string | null;
    status: string;
    recoveredOrderId: number | null;
    lastTouchAt: Date;
  }> = [];

  if (isDatabaseConfigured) {
    const db = requireDb("অ্যাবান্ডনড");
    const status = params.status && ["open", "recovered", "expired"].includes(params.status) ? params.status : null;
    rows = await db
      .select({
        id: abandonedCheckouts.id,
        name: abandonedCheckouts.name,
        phone: abandonedCheckouts.phone,
        address: abandonedCheckouts.address,
        area: abandonedCheckouts.area,
        subtotal: abandonedCheckouts.subtotal,
        couponCode: abandonedCheckouts.couponCode,
        status: abandonedCheckouts.status,
        recoveredOrderId: abandonedCheckouts.recoveredOrderId,
        lastTouchAt: abandonedCheckouts.lastTouchAt,
      })
      .from(abandonedCheckouts)
      .where(status ? eq(abandonedCheckouts.status, status) : sql`TRUE`)
      .orderBy(sql`${abandonedCheckouts.lastTouchAt} DESC`)
      .limit(200);
  }

  const openCount = rows.filter((row) => row.status === "open").length;

  return (
    <AdminShell session={session} counts={{}} title="Abandoned checkouts" subtitle={`${openCount} open of ${rows.length} shown`}>
      <div className="panel mb-4">
        <div className="panel-body">
          <form className="filters mb-0" method="get">
            <select className="input" name="status" defaultValue={params.status ?? ""}>
              <option value="">All</option>
              <option value="open">Open</option>
              <option value="recovered">Recovered</option>
              <option value="expired">Expired</option>
            </select>
            <button type="submit" className="btn btn-outline btn-sm">
              Apply
            </button>
          </form>
        </div>
      </div>

      {!isDatabaseConfigured ? (
        <div className="pending-note">Pending — database not configured.</div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Address</th>
                <th style={{ textAlign: "right" }}>Cart value</th>
                <th>Coupon</th>
                <th>Status</th>
                <th>Last touch</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>
                    {row.name}
                    <br />
                    <span className="text-small text-muted mono">{row.phone}</span>
                  </td>
                  <td className="text-small">
                    {row.address ?? "—"}
                    {row.area ? <span className="text-muted"> ({row.area === "inside_dhaka" ? "Dhaka" : "Outside"})</span> : null}
                  </td>
                  <td className="table-num">{formatTakaEn(row.subtotal)}</td>
                  <td className="mono text-small">{row.couponCode ?? "—"}</td>
                  <td>
                    <span className={`badge badge-${row.status === "recovered" ? "active" : row.status === "open" ? "draft" : "hidden"}`}>
                      {row.status}
                    </span>
                    {row.recoveredOrderId ? (
                      <>
                        {" "}
                        <Link className="text-small" href={`/admin/orders/${row.recoveredOrderId}`}>
                          order
                        </Link>
                      </>
                    ) : null}
                  </td>
                  <td className="text-small text-muted">{formatDateEn(row.lastTouchAt)}</td>
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-muted">
                    No abandoned checkouts recorded.
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
