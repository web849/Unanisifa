import Link from "next/link";
import { Plus, Rocket } from "lucide-react";
import { AdminShell } from "@/components/admin/admin-shell";
import { getAdminSession } from "@/lib/auth/session";
import { isDatabaseConfigured, requireDb } from "@/lib/db";
import { landingPages, products } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { formatDateEn } from "@/lib/utils";

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

  if (isDatabaseConfigured) {
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
            A new page starts with a 7-section template — publish it, then copy the /offer/… URL into your ad.
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
                    <Link className="btn btn-outline btn-sm" href={`/admin/landing-pages/${row.id}`}>
                      <Rocket aria-hidden="true" />
                      Builder
                    </Link>
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
