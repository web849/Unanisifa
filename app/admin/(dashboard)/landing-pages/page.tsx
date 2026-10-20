import Link from "next/link";
import { Plus, Rocket } from "lucide-react";
import { AdminShell } from "@/components/admin/admin-shell";
import { DemoCatalogNotice } from "@/components/admin/demo-catalog-notice";
import { getAdminSession } from "@/lib/auth/session";
import { isDatabaseConfigured, requireDb } from "@/lib/db";
import { landingPages, products } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { formatDateEn } from "@/lib/utils";
import { getLandingCatalog } from "@/lib/landing/products";

export const dynamic = "force-dynamic";

export default async function AdminLandingPagesPage() {
  const session = await getAdminSession();
  if (!session) return null;

  let rows: Array<{
    id: number;
    title: string;
    slug: string;
    status: string;
    themeSlug: string;
    viewCount: number;
    orderCount: number;
    couponCode: string | null;
    productName: string | null;
    updatedAt: Date;
  }> = [];

  let catalogEmpty = false;

  if (isDatabaseConfigured) {
    const catalog = await getLandingCatalog();
    catalogEmpty = catalog.databaseCount === 0;
    const db = requireDb("ল্যান্ডিং");
    rows = await db
      .select({
        id: landingPages.id,
        title: landingPages.title,
        slug: landingPages.slug,
        status: sql<string>`${landingPages.status}`,
        themeSlug: landingPages.themeSlug,
        viewCount: landingPages.viewCount,
        orderCount: landingPages.orderCount,
        couponCode: landingPages.couponCode,
        productName: products.name,
        updatedAt: landingPages.updatedAt,
      })
      .from(landingPages)
      .leftJoin(products, eq(landingPages.productId, products.id))
      .orderBy(sql`${landingPages.updatedAt} DESC`)
      .limit(100);
  }

  return (
    <AdminShell session={session} counts={{}} title="Landing Pages" subtitle="Facebook campaign funnels at /offer/{slug}">
      {catalogEmpty ? <DemoCatalogNotice demoCount={15} compact /> : null}

      <div className="panel mb-4">
        <div className="panel-head">
          <h2 className="panel-title">Pages ({rows.length})</h2>
          <Link className="btn btn-primary btn-sm" href="/admin/landing-pages/new">
            <Plus aria-hidden="true" />
            New landing page
          </Link>
        </div>
        <div className="panel-body">
          <p className="text-small text-muted mb-0">
            A new page starts with a 10-block medicine template. Open the builder for a live desktop and
            mobile preview, then copy the /offer/… URL into your ad.
          </p>
        </div>
      </div>

      <div className="panel mb-4">
        <div className="panel-head">
          <h2 className="panel-title">ল্যান্ডিং পেজ তৈরি হচ্ছে না? — আগে এই ৪টি দেখুন</h2>
        </div>
        <div className="panel-body">
          <ol className="storage-steps">
            <li>
              <strong>পণ্য Active আছে তো?</strong> নতুন পণ্য ডিফল্টে Draft থাকে। অর্ডার ফর্ম কাজ করতে{" "}
              <Link href="/admin/products">Products</Link> থেকে পণ্যটি Active করুন। (তৈরির ফর্মে এখন Draft
              পণ্যও দেখা যায়।)
            </li>
            <li>
              <strong>একই নামের slug?</strong> এখন আর আটকাবে না — slug মিলে গেলে স্বয়ংক্রিয়ভাবে -2, -3
              যোগ হয়ে নতুন পেজ তৈরি হয়।
            </li>
            <li>
              <strong>ডেমো পণ্য বেছে নিলে</strong> আগে ডেমো ক্যাটালগ ইমপোর্ট হতে হয় — ফর্ম নিজেই করে দেয়।
              ব্যর্থ হলে এখন আসল কারণটাই এরর মেসেজে দেখাবে (&quot;Network error&quot; নয়)।
            </li>
            <li>
              <strong>ছবি দিয়ে HTML সাজাতে</strong> <Link href="/admin/storage">Storage (R2)</Link> পেজে ছবি
              আপলোড করে &quot;লিংক কপি&quot; / &quot;HTML কপি&quot; করুন, তারপর বিল্ডারের HTML Code ব্লকে
              পেস্ট করুন। বিল্ডারের HTML ব্লকের ভেতর থেকেও সরাসরি আপলোড করে ছবি বসানো যায়।
            </li>
          </ol>
          {session.role === "viewer" ? (
            <p className="error-text text-small mb-0" role="alert">
              আপনার বর্তমান অ্যাকাউন্টের রোল viewer (শুধু দেখা যায়) — এই অ্যাকাউন্টে পেজ তৈরি/সেভ করা
              যাবে না। owner/admin/operator অ্যাকাউন্ট দিয়ে লগইন করুন।
            </p>
          ) : null}
        </div>
      </div>

      {!isDatabaseConfigured ? (
        <div className="pending-note">
          Pending — database not configured. DATABASE_URL সেট না থাকলে ল্যান্ডিং পেজ তৈরি করা যাবে না
          (Vercel-এর Settings-এ গিয়ে Environment Variables-এ DATABASE_URL দিন, তারপর Redeploy করুন)।
        </div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Title</th>
                <th>URL</th>
                <th>Product</th>
                <th>Theme</th>
                <th style={{ textAlign: "right" }}>Views</th>
                <th style={{ textAlign: "right" }}>Orders</th>
                <th style={{ textAlign: "right" }}>CVR</th>
                <th>Status</th>
                <th>Updated</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>{row.title}</td>
                  <td>
                    <Link className="mono text-small" href={`/offer/${row.slug}`} target="_blank">
                      /offer/{row.slug}
                    </Link>
                  </td>
                  <td className="text-small">{row.productName ?? "—"}</td>
                  <td className="text-small">{row.themeSlug}</td>
                  <td className="table-num">{row.viewCount}</td>
                  <td className="table-num">{row.orderCount}</td>
                  <td className="table-num">{row.viewCount > 0 ? `${Math.round((row.orderCount / row.viewCount) * 100)}%` : "—"}</td>
                  <td>
                    <span className={`badge badge-${row.status === "published" ? "active" : "draft"}`}>{row.status}</span>
                  </td>
                  <td className="text-small text-muted">{formatDateEn(row.updatedAt)}</td>
                  <td className="table-actions">
                    <div className="field-row">
                      <Link className="btn btn-ghost btn-sm" href={`/admin/landing-pages/${row.id}/preview`} target="_blank">
                        Preview
                      </Link>
                      <Link className="btn btn-outline btn-sm" href={`/admin/landing-pages/${row.id}`}>
                        <Rocket aria-hidden="true" />
                        Builder
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-muted">
                    No landing pages yet — create one for your first campaign.
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
