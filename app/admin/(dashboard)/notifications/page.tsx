import { AdminShell } from "@/components/admin/admin-shell";
import { NotificationsManager, type ChannelRow, type LogRow } from "@/components/admin/notifications-manager";
import { getAdminSession } from "@/lib/auth/session";
import { isDatabaseConfigured, requireDb } from "@/lib/db";
import { notificationLogs, notificationSettings } from "@/lib/db/schema";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default async function AdminNotificationsPage() {
  const session = await getAdminSession();
  if (!session) return null;

  let channels: ChannelRow[] = [];
  let logs: LogRow[] = [];
  let queued = 0;
  let failed = 0;

  if (isDatabaseConfigured) {
    const db = requireDb("নোটিফিকেশন");
    channels = await db.select().from(notificationSettings);
    logs = await db
      .select({
        id: notificationLogs.id,
        channel: notificationLogs.channel,
        event: notificationLogs.event,
        status: sql<string>`${notificationLogs.status}`,
        attempts: notificationLogs.attempts,
        lastError: notificationLogs.lastError,
        sentAt: notificationLogs.sentAt,
        createdAt: notificationLogs.createdAt,
      })
      .from(notificationLogs)
      .orderBy(sql`${notificationLogs.createdAt} DESC`)
      .limit(50);
    const counts = await db
      .select({
        status: sql<string>`${notificationLogs.status}`,
        count: sql<number>`count(*)::int`,
      })
      .from(notificationLogs)
      .groupBy(notificationLogs.status);
    for (const row of counts) {
      if (row.status === "queued" || row.status === "processing") queued += row.count;
      if (row.status === "failed") failed += row.count;
    }
  }

  return (
    <AdminShell
      session={session}
      counts={{}}
      title="Notifications"
      subtitle={`Queue: ${queued} pending · ${failed} failed — cron retries hourly`}
    >
      {!isDatabaseConfigured ? (
        <div className="pending-note">Pending — database not configured.</div>
      ) : (
        <NotificationsManager channels={channels} logs={logs} />
      )}
    </AdminShell>
  );
}
