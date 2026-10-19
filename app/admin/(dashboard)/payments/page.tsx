import { AdminShell } from "@/components/admin/admin-shell";
import { PaymentsManager, type PaymentRow } from "@/components/admin/payments-manager";
import { getAdminSession } from "@/lib/auth/session";
import { isDatabaseConfigured, requireDb } from "@/lib/db";
import { paymentMethods, payments } from "@/lib/db/schema";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default async function AdminPaymentsPage() {
  const session = await getAdminSession();
  if (!session) return null;

  let rows: PaymentRow[] = [];
  let recent: Array<{ id: number; orderId: number; methodKey: string; amount: number; status: string; createdAt: Date }> = [];

  if (isDatabaseConfigured) {
    const db = requireDb("পেমেন্ট");
    rows = await db.select().from(paymentMethods).orderBy(paymentMethods.sortOrder, paymentMethods.id);
    recent = await db
      .select({
        id: payments.id,
        orderId: payments.orderId,
        methodKey: payments.methodKey,
        amount: payments.amount,
        status: payments.status,
        createdAt: payments.createdAt,
      })
      .from(payments)
      .orderBy(sql`${payments.createdAt} DESC`)
      .limit(20);
  }

  return (
    <AdminShell session={session} counts={{}} title="Payments" subtitle="Cash on delivery is live; gateways stay Pending until credentials exist">
      {!isDatabaseConfigured ? (
        <div className="pending-note">Pending — database not configured.</div>
      ) : (
        <PaymentsManager initial={rows} recent={recent} />
      )}
    </AdminShell>
  );
}
