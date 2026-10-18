import Link from "next/link";
import { Download } from "lucide-react";
import { AdminShell } from "@/components/admin/admin-shell";
import { getAdminSession } from "@/lib/auth/session";
import { isDatabaseConfigured, requireDb } from "@/lib/db";
import { leads } from "@/lib/db/schema";
import { sql } from "drizzle-orm";
import { formatDateEn } from "@/lib/utils";

export const dynamic = "force-dynamic";

/**
 * লিডস — তালিকা (সর্বশেষ ২০০) + UTF-8 BOM CSV এক্সপোর্ট (সর্বোচ্চ ১০,০০০)।
 * রিটার্গেটিং/সেগমেন্ট/মার্জ নেই — শুধু লিস্ট ও এক্সপোর্ট।
 */
export default async function AdminLeadsPage() {
  const session = await getAdminSession();
  if (!session) return null;

  let rows: Array<{
    id: number;
    name: string | null;
    phone: string | null;
    email: string | null;
    source: string;
    popupLabel: string | null;
    campaign: string | null;
    smsConsent: boolean;
    createdAt: Date;
  }> = [];
  let total = 0;

  if (isDatabaseConfigured) {
    const db = requireDb("লিডস");
    rows = await db
      .select({
        id: leads.id,
        name: leads.name,
        phone: leads.phone,
        email: leads.email,
        source: leads.source,
        popupLabel: leads.popupLabel,
        campaign: leads.campaign,
        smsConsent: leads.smsConsent,
        createdAt: leads.createdAt,
      })
      .from(leads)
      .orderBy(sql`${leads.createdAt} DESC`)
      .limit(200);
    const counts = await db.select({ count: sql<number>`count(*)::int` }).from(leads);
    total = counts[0]?.count ?? 0;
  }

  return (
    <AdminShell session={session} counts={{}} title="Leads" subtitle={`${total} total — showing latest 200`}>
      <div className="panel mb-4">
        <div className="panel-head">
          <h2 className="panel-title">Collected leads</h2>
          <Link className="btn btn-outline btn-sm" href="/api/admin/leads/export">
            <Download aria-hidden="true" />
            Export CSV (max 10,000)
          </Link>
        </div>
        <div className="panel-body">
          <p className="text-small text-muted mb-0">
            Leads come from popup forms and landing pages. This view is list + export only — no segmentation or retargeting lists.
          </p>
        </div>
      </div>

      {!isDatabaseConfigured ? (
        <div className="pending-note">Pending — database not configured.</div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Phone</th>
                <th>Email</th>
                <th>Source</th>
                <th>Consent</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>{row.name ?? "—"}</td>
                  <td className="mono">{row.phone ?? "—"}</td>
                  <td className="text-small">{row.email ?? "—"}</td>
                  <td className="text-small">
                    {row.source}
                    {row.popupLabel ? ` · ${row.popupLabel}` : ""}
                    {row.campaign ? ` · ${row.campaign}` : ""}
                  </td>
                  <td>{row.smsConsent ? "SMS yes" : "—"}</td>
                  <td className="text-small text-muted">{formatDateEn(row.createdAt)}</td>
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-muted">
                    No leads yet.
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
