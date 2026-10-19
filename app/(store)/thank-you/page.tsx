import type { Metadata } from "next";
import Link from "next/link";
import { and, eq } from "drizzle-orm";
import { CheckCircle2, MessageCircle, PackageSearch, PhoneCall } from "lucide-react";
import { db, isDatabaseConfigured } from "@/lib/db";
import { orderItems, orders, trackingEvents } from "@/lib/db/schema";
import { getBrand, getFeaturedProducts } from "@/lib/store/repository";
import { formatDateTimeBangla, formatTaka, toBanglaDigits } from "@/lib/utils";
import { telLink, whatsappLink, whatsappOrderMessage } from "@/lib/contact-links";
import { PurchasePixel } from "@/components/store/purchase-pixel";
import { getPublicPixelId } from "@/lib/integrations/meta";
import { ProductCardView } from "@/components/store/product-card";
import { ORDER_STATUS_LABEL, type OrderStatusValue } from "@/lib/orders/status";

export const metadata: Metadata = {
  title: "অর্ডার সফল হয়েছে",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type Params = { searchParams: Promise<{ token?: string }> };

export default async function ThankYouPage({ searchParams }: Params) {
  const { token } = await searchParams;
  const brand = await getBrand();

  if (!token || !isDatabaseConfigured || !db) {
    return (
      <section className="section">
        <div className="container container-narrow">
          <div className="alert alert-warning">
            <PackageSearch aria-hidden="true" />
            <span>
              {isDatabaseConfigured
                ? "অর্ডারের লিংক সঠিক নয়। অর্ডার ট্র্যাক পেজে অর্ডার নম্বর ও মোবাইল দিয়ে দেখুন।"
                : "ডেটাবেজ কনফিগার করা নেই — অর্ডার তথ্য দেখানো যাচ্ছে না।"}
            </span>
          </div>
          <Link className="btn btn-outline mt-3" href="/track-order">
            অর্ডার ট্র্যাক করুন
          </Link>
        </div>
      </section>
    );
  }

  const orderRows = await db.select().from(orders).where(eq(orders.publicToken, token)).limit(1);
  const order = orderRows[0];
  if (!order) {
    return (
      <section className="section">
        <div className="container container-narrow">
          <div className="alert alert-danger">
            <PackageSearch aria-hidden="true" />
            <span>অর্ডারটি খুঁজে পাওয়া যায়নি। লিংকটি সঠিক কিনা দেখুন।</span>
          </div>
        </div>
      </section>
    );
  }

  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
  const pixelId = await getPublicPixelId();
  const purchaseEvent = await db
    .select()
    .from(trackingEvents)
    .where(and(eq(trackingEvents.orderId, order.id), eq(trackingEvents.eventName, "Purchase")))
    .limit(1);
  const offers = await getFeaturedProducts(3);

  return (
    <>
      {pixelId && purchaseEvent[0] ? (
        <PurchasePixel
          pixelId={pixelId}
          eventId={purchaseEvent[0].eventId}
          value={order.total}
          currency="BDT"
        />
      ) : null}

      <section className="section">
        <div className="container container-narrow">
          <div className="card card-plain card-pad-lg text-center">
            <span
              className="mystery-gift"
              style={{ animation: "none", margin: "0 auto 16px", background: "var(--success-soft)", borderColor: "var(--success)", color: "var(--success)" }}
            >
              <CheckCircle2 aria-hidden="true" />
            </span>
            <p className="eyebrow" style={{ justifyContent: "center" }}>
              ধন্যবাদ
            </p>
            <h1 className="section-title">আপনার অর্ডারটি জমা হয়েছে</h1>
            <p className="text-muted">
              অর্ডার নম্বর: <span className="mono text-strong">{order.orderNumber}</span>
              <br />
              তারিখ: {formatDateTimeBangla(order.createdAt)}
            </p>

            <div className="summary mt-4" style={{ textAlign: "right" }}>
              {items.map((item) => (
                <div className="summary-row" key={item.id}>
                  <span className="summary-label">
                    {item.productName}
                    {item.variantName ? ` (${item.variantName})` : ""} × {toBanglaDigits(item.quantity)}
                  </span>
                  <span className="summary-value">{formatTaka(item.lineTotal)}</span>
                </div>
              ))}
              <div className="summary-row">
                <span className="summary-label">ডেলিভারি চার্জ</span>
                <span className="summary-value">
                  {order.deliveryCharge === 0 ? "ফ্রি" : formatTaka(order.deliveryCharge)}
                </span>
              </div>
              {order.discount > 0 ? (
                <div className="summary-row">
                  <span className="summary-label">কুপন ছাড়</span>
                  <span className="summary-value summary-discount">-{formatTaka(order.discount)}</span>
                </div>
              ) : null}
              <div className="summary-total">
                <span className="summary-total-label">সর্বমোট (পরিশোধযোগ্য)</span>
                <span className="summary-total-value">{formatTaka(order.total)}</span>
              </div>
            </div>

            <p className="alert alert-neutral mt-4 mb-0" style={{ textAlign: "right" }}>
              <PackageSearch aria-hidden="true" />
              <span>
                বর্তমান স্ট্যাটাস: <strong>{ORDER_STATUS_LABEL[order.status as OrderStatusValue]}</strong>
                {order.fraudStatus === "review"
                  ? " — অর্ডারটি যাচাইয়ের পর কনফার্ম করা হবে; প্রয়োজনে আমরা কল করব।"
                  : " — কনফার্ম করার জন্য আমরা শীঘ্রই কল করব।"}
              </span>
            </p>

            <div className="btn-group mt-4" style={{ justifyContent: "center" }}>
              <Link className="btn" href={`/track-order?order=${order.orderNumber}&phone=${order.phoneNormalized}`}>
                <PackageSearch aria-hidden="true" />
                অর্ডার ট্র্যাক করুন
              </Link>
              <a
                className="btn btn-whatsapp"
                href={whatsappLink(brand, whatsappOrderMessage(order.orderNumber))}
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageCircle aria-hidden="true" />
                WhatsApp
              </a>
              <a className="btn btn-outline" href={telLink(brand)}>
                <PhoneCall aria-hidden="true" />
                কল করুন
              </a>
            </div>
          </div>
        </div>
      </section>

      {offers.length > 0 ? (
        <section className="section">
          <div className="container">
            <p className="eyebrow">একসাথে নিলে ভালো</p>
            <h2 className="section-title">পরবর্তী অর্ডারের জন্য প্রস্তাব</h2>
            <div className="grid grid-2 grid-3 mt-4">
              {offers.map((offer) => (
                <ProductCardView key={offer.id} product={offer} />
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </>
  );
}
