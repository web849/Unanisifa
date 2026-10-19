import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { ArrowLeft, ExternalLink, Pencil } from "lucide-react";
import { LandingPageView } from "@/components/landing/landing-page-view";
import { getAdminSession } from "@/lib/auth/session";
import { isDatabaseConfigured, requireDb } from "@/lib/db";
import { landingPages } from "@/lib/db/schema";
import { getLandingCatalog } from "@/lib/landing/products";
import type { LandingSection } from "@/lib/landing/sections";
import { getBrand, getCommerce, listApprovedReviews } from "@/lib/store/repository";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Landing preview",
  robots: { index: false, follow: false },
};

/**
 * ড্রাফটসহ যেকোনো স্ট্যাটাসের পেজের ফুল-পেজ প্রিভিউ।
 * `/offer/[slug]` শুধু published দেখায় — তাই বিল্ডারের Preview লিংক আগে 404 দিত।
 * এই রুটে admin session লাগে (layout গার্ড করে)।
 */
export default async function LandingPreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getAdminSession();
  if (!session) return null;
  const { id } = await params;
  if (!isDatabaseConfigured) notFound();

  const pageId = Number(id);
  if (!Number.isInteger(pageId) || pageId <= 0) notFound();

  const db = requireDb("ল্যান্ডিং প্রিভিউ");
  const rows = await db.select().from(landingPages).where(eq(landingPages.id, pageId)).limit(1);
  const page = rows[0];
  if (!page) notFound();

  const [brand, commerce, catalog] = await Promise.all([
    getBrand(),
    getCommerce(),
    getLandingCatalog({ includeDrafts: true, demoFallback: true }),
  ]);
  const mainProduct = page.productId
    ? (catalog.items.find((product) => product.id === page.productId) ?? null)
    : null;
  const reviews = mainProduct && !mainProduct.isDemo ? await listApprovedReviews(mainProduct.id) : [];

  return (
    <div className="lp-preview-route">
      <div className="lp-preview-bar">
        <Link className="btn btn-outline btn-sm" href={`/admin/landing-pages/${page.id}`}>
          <ArrowLeft aria-hidden="true" />
          Back to builder
        </Link>
        <div className="lp-preview-bar-title">
          <strong>{page.title}</strong>
          <span className={`badge badge-${page.status === "published" ? "active" : "draft"}`}>{page.status}</span>
          <span className="text-small text-muted">Draft preview — hidden sections are not shown</span>
        </div>
        <div className="field-row">
          <Link className="btn btn-outline btn-sm" href={`/admin/landing-pages/${page.id}`}>
            <Pencil aria-hidden="true" />
            Edit
          </Link>
          {page.status === "published" ? (
            <Link className="btn btn-primary btn-sm" href={`/offer/${page.slug}`} target="_blank">
              <ExternalLink aria-hidden="true" />
              Live page
            </Link>
          ) : null}
        </div>
      </div>

      <div className="lp-preview-route-canvas">
        <LandingPageView
          page={{
            id: page.id,
            title: page.title,
            slug: page.slug,
            themeSlug: page.themeSlug,
            productId: page.productId,
            couponCode: page.couponCode,
            sections: (page.sections as LandingSection[]) ?? [],
          }}
          products={catalog.items}
          reviews={reviews}
          brand={brand}
          commerce={commerce}
          preview
        />
      </div>
    </div>
  );
}
