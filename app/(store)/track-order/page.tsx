import type { Metadata } from "next";
import Link from "next/link";
import { and, eq, desc } from "drizzle-orm";
import { PackageSearch } from "lucide-react";
import { db, isDatabaseConfigured } from "@/lib/db";
import { orders, orderStatusHistory } from "@/lib/db/schema";
import { OrderTracker } from "@/components/store/order-tracker";
import { formatTaka, toBanglaDigits } from "@/lib/utils";
import { ORDER_STATUS_LABEL, type OrderStatusValue } from "@/lib/orders/status";
import { normalizeBdPhone } from "@/lib/orders/validation-client";

export const metadata: Metadata = {
  title: "অর্ডার ট্র্যাক করুন",
  alternates: { canonical: "/track-order" },
};

export const dynamic = "force-dynamic";

type Params = { searchParams: Promise<{ order?: string; phone?: string }> };

/**
 * অর্ডার ট্র্যাক — অর্ডার নম্বর + মোবাইল মিললে তবেই দেখায় (পাবলিক টোকেন ছাড়া)।
 */
export default async function TrackOrderPage({ searchParams }: Params) {
  const params = await searchParams;
  const orderNumber = (params.order ?? "").trim().toUpperCase();
  const phone = normalizeBdPhone(params.phone ?? "");

  let order = null;
  let history: Array<{ toStatus: string; note: string | null; createdAt: string }> = [];
  let searched = false;
  let notFound = false;

  if (orderNumber && phone) {
    searched = true;
    if (isDatabaseConfigured && db) {
      const rows = await db
        .select()
        .from(orders)
        .where(and(eq(orders.orderNumber, orderNumber), eq(orders.phoneNormalized, phone)))
        .limit(1);
      order = rows[0] ?? null;
      if (order) {
        const historyRows = await db
          .select()
          .from(orderStatusHistory)
          .where(eq(orderStatusHistory.orderId, order.id))
          .orderBy(desc(orderStatusHistory.createdAt));
        history = historyRows.map((row) => ({
          toStatus: row.toStatus,
          note: row.note,
          createdAt: row.createdAt.toISOString(),
        }));
      } else {
        notFound = true;
      }
    } else {
      notFound = true;
    }
  }

  return (
    <section className="section">
      <div className="container container-narrow">
        <p className="eyebrow">ট্র্যাকিং</p>
        <h1 className="section-title">অর্ডার ট্র্যাক করুন</h1>
        <p className="section-subtitle">
          অর্ডার নম্বর (যেমন US261018-A1B2C3D) ও অর্ডারে দেওয়া মোবাইল নম্বর দিন।
        </p>

        <form method="get" action="/track-order" className="card card-plain card-pad-lg">
          <div className="field-row">
            <label className="field mb-0">
              <span className="label">অর্ডার নম্বর</span>
              <input
                className="input input-mono"
                name="order"
                defaultValue={orderNumber}
                placeholder="US261018-A1B2C3D"
                required
              />
            </label>
            <label className="field mb-0">
              <span className="label">মোবাইল নম্বর</span>
              <input
                className="input"
                name="phone"
                defaultValue={params.phone ?? ""}
                placeholder="01XXXXXXXXX"
                inputMode="numeric"
                required
              />
            </label>
          </div>
          <button type="submit" className="btn btn-block mt-3">
            <PackageSearch aria-hidden="true" />
            স্ট্যাটাস দেখুন
          </button>
        </form>

        {searched && notFound ? (
          <div className="alert alert-warning mt-4">
            <PackageSearch aria-hidden="true" />
            <span>
              {isDatabaseConfigured
                ? "এই অর্ডার নম্বর ও মোবাইল নম্বরের মিল খুঁজে পাওয়া যায়নি। বানান দেখে আবার চেষ্টা করুন।"
                : "ডেটাবেজ কনফিগার করা নেই — অর্ডার তথ্য দেখানো যাচ্ছে না।"}
            </span>
          </div>
        ) : null}

        {order ? (
          <div className="card card-plain card-pad-lg mt-4">
            <div className="row-between row-wrap mb-3">
              <div>
                <span className="mono text-strong">{order.orderNumber}</span>
                <p className="text-small text-muted mb-0">
                  {toBanglaDigits(order.createdAt.toLocaleDateString("en-CA"))} ·{" "}
                  {formatTaka(order.total)}
                </p>
              </div>
              <span className={`badge badge-${order.status === "cancelled" ? "danger" : order.status === "delivered" ? "success" : "info"}`}>
                {ORDER_STATUS_LABEL[order.status as OrderStatusValue]}
              </span>
            </div>
            <OrderTracker status={order.status as OrderStatusValue} history={history} />
            <p className="help-text mb-0 mt-3">
              কোনো প্রশ্ন থাকলে কল বা WhatsApp করুন — অর্ডার নম্বরটি সঙ্গে রাখবেন।{" "}
              <Link href="/contact">যোগাযোগ</Link>
            </p>
          </div>
        ) : null}
      </div>
    </section>
  );
}
