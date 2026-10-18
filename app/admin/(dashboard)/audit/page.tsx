import { AdminShell } from "@/components/admin/admin-shell";
import { getAdminSession } from "@/lib/auth/session";
import { isDatabaseConfigured, requireDb } from "@/lib/db";
import { auditLogs } from "@/lib/db/schema";
import { sql } from "drizzle-orm";
import { formatDateEn } from "@/lib/utils";

export const dynamic = "force-dynamic";

/** অডিট লগ — read-only; গুরুত্বপূর্ণ সব অ্যাকশনের ট্রেইল */
export default async function AdminAuditPage() {
  const session = await getAdminSession();
  if (!session) return null;

  let rows: Array<{
    id: number;
    actorType: string;
    actorName: string | null;
    action: string;
    entityType: string | null;
    entityId: string | null;
    createdAt: Date;
  }> = [];

  if (isDatabaseConfigured) {
    const db = requireDb("অডিট");
    rows = await db
      .select({
        id: auditLogs.id,
        actorType: auditLogs.actorType,
        actorName: auditLogs.actorName,
        action: auditLogs.action,
        entityType: auditLogs.entityType,
        entityId: auditLogs.entityId,
        createdAt: auditLogs.createdAt,
      })
      .from(auditLogs)
      .orderBy(sql`${auditLogs.createdAt} DESC`)
      .limit(200);
  }

  return (
    <AdminShell session={session} counts={{}} title="Audit log" subtitle="Latest 200 admin/system actions">
      {!isDatabaseConfigured ? (
        <div className="pending-note">Pending — database not configured.</div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Actor</th>
                <th>Action</th>
                <th>Entity</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="text-small text-muted">{formatDateEn(row.createdAt)}</td>
                  <td className="text-small">
                    {row.actorName ?? row.actorType}
                    <span className="text-muted"> ({row.actorType})</span>
                  </td>
                  <td className="mono text-small">{row.action}</td>
                  <td className="text-small">
                    {row.entityType ?? "—"}
                    {row.entityId ? ` #${row.entityId}` : ""}
                  </td>
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-muted">
                    No audit entries yet.
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
