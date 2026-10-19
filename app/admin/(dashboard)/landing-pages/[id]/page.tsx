import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { AdminShell } from "@/components/admin/admin-shell";
import { LandingBuilder } from "@/components/admin/landing-builder";
import { getAdminSession, canMutate } from "@/lib/auth/session";
import { isDatabaseConfigured, requireDb } from "@/lib/db";
import { coupons, landingPages } from "@/lib/db/schema";
import { getLandingCatalog } from "@/lib/landing/products";
import type { LandingSection } from "@/lib/landing/sections";
import { getBrand, getCommerce, listApprovedReviews } from "@/lib/store/repository";

export const dynamic = "force-dynamic";

export default async function LandingBuilderPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getAdminSession();
  if (!session) return null;
  const { id } = await params;
  if (!isDatabaseConfigured) notFound();

  const pageId = Number(id);
  if (!Number.isInteger(pageId) || pageId <= 0) notFound();

  const db = requireDb("ল্যান্ডিং");
  const rows = await db.select().from(landingPages).where(eq(landingPages.id, pageId)).limit(1);
  const page = rows[0];
  if (!page) notFound();

  const [catalog, couponList, brand, commerce] = await Promise.all([
    getLandingCatalog({ includeDrafts: true, demoFallback: true }),
    db.select({ code: coupons.code }).from(coupons).where(eq(coupons.active, true)).limit(50),
    getBrand(),
    getCommerce(),
  ]);

  const mainProduct = page.productId
    ? (catalog.items.find((product) => product.id === page.productId) ?? null)
    : null;
  const reviews = mainProduct && !mainProduct.isDemo ? await listApprovedReviews(mainProduct.id) : [];

  return (
    <AdminShell
      session={session}
      counts={{}}
      title={`Builder · ${page.title}`}
      subtitle={`/offer/${page.slug}`}
    >
      <LandingBuilder
        page={{
          id: page.id,
          title: page.title,
          slug: page.slug,
          productId: page.productId,
          status: page.status,
          themeSlug: page.themeSlug,
          sections: (page.sections as LandingSection[]) ?? [],
          metaTitle: page.metaTitle,
          metaDescription: page.metaDescription,
          couponCode: page.couponCode,
          checkoutOffers: (page.checkoutOffers as number[]) ?? [],
          thankYouOffers: (page.thankYouOffers as number[]) ?? [],
          updatedAt: page.updatedAt.toISOString(),
        }}
        products={catalog.items}
        demoFallback={catalog.demoFallback}
        coupons={couponList}
        brand={brand}
        commerce={commerce}
        reviews={reviews}
        canWrite={canMutate(session)}
      />
    </AdminShell>
  );
}
