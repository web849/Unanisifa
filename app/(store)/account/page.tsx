import type { Metadata } from "next";
import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { LogOut, PackageSearch, UserRound } from "lucide-react";
import { getCustomerSession } from "@/lib/auth/customer-session";
import { db, isDatabaseConfigured } from "@/lib/db";
import { orders } from "@/lib/db/schema";
import { AccountAuthForm, AccountLogoutButton } from "@/components/store/customer-account-form";
import { formatDateTimeBangla, formatTaka } from "@/lib/utils";
import { ORDER_STATUS_LABEL, type OrderStatusValue } from "@/lib/orders/status";

export const metadata: Metadata = {
  title: "আমার অ্যাকাউন্ট",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * অ্যাকাউন্ট — সম্পূর্ণ ঐচ্ছিক। "লগইন ছাড়াই কেনাকাটা" লিংক প্রমিনেন্ট।
 * স্টোরফ্রন্ট টোকেন দিয়ে স্টাফ/অ্যাডমিন রুটে ঢোকা যায় না।
 */
export default async function AccountPage() {
  const session = await getCustomerSession();

  if (!session) {
    return (
      <section className="section">
        <div className="container container-narrow">
          <div className="card card-plain card-pad-lg">
            <p className="eyebrow">অ্যাকাউন্ট</p>
            <h1 className="section-title">লগইন বা রেজিস্ট্রেশন</h1>
            <p className="alert alert-neutral">
              <UserRound aria-hidden="true" />
              <span>
                অ্যাকাউন্ট ছাড়াই অর্ডার করা যায় —{" "}
                <Link href="/products" className="text-strong">
                  লগইন ছাড়াই কেনাকাটা করুন
                </Link>
                । অ্যাকাউন্ট শুধু অর্ডার হিস্টরি দেখতে সুবিধা।
              </span>
            </p>
            <AccountAuthForm />
          </div>
        </div>
      </section>
    );
  }

  const orderList =
    isDatabaseConfigured && db
      ? await db
          .select()
          .from(orders)
          .where(eq(orders.phoneNormalized, session.phone))
          .orderBy(desc(orders.createdAt))
          .limit(20)
      : [];

  return (
    <section className="section">
      <div className="container container-narrow">
        <div className="row-between row-wrap">
          <div>
            <p className="eyebrow">অ্যাকাউন্ট</p>
            <h1 className="section-title">{session.name ?? session.phone}</h1>
            <p className="text-muted mono">{session.phone}</p>
          </div>
          <AccountLogoutButton />
        </div>

        <div className="card card-plain mt-4">
          <div className="panel-head">
            <h2 className="panel-title">
              <PackageSearch aria-hidden="true" style={{ display: "inline", verticalAlign: "-3px" }} /> আমার
              অর্ডারসমূহ
            </h2>
          </div>
          {orderList.length === 0 ? (
            <div className="empty-state">
              <PackageSearch aria-hidden="true" />
              <p className="empty-state-title">এখনো কোনো অর্ডার নেই</p>
              <Link className="btn btn-sm" href="/products">
                কেনাকাটা শুরু করুন
              </Link>
            </div>
          ) : (
            <div className="table-wrap" style={{ border: 0, borderRadius: 0 }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>অর্ডার</th>
                    <th>তারিখ</th>
                    <th>স্ট্যাটাস</th>
                    <th style={{ textAlign: "right" }}>মোট</th>
                  </tr>
                </thead>
                <tbody>
                  {orderList.map((order) => (
                    <tr key={order.id}>
                      <td className="mono">{order.orderNumber}</td>
                      <td>{formatDateTimeBangla(order.createdAt)}</td>
                      <td>
                        <span className={`status-dot status-${order.status}`}>
                          {ORDER_STATUS_LABEL[order.status as OrderStatusValue]}
                        </span>
                      </td>
                      <td className="table-num">{formatTaka(order.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <p className="help-text mt-3">
          <LogOut aria-hidden="true" style={{ display: "inline", verticalAlign: "-3px" }} /> লগআউট করলে এই
          ডিভাইস থেকে অর্ডার হিস্টরি দেখতে আবার লগইন লাগবে।
        </p>
      </div>
    </section>
  );
}
