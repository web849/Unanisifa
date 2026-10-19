import { notFound } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-shell";
import { LandingBuilder } from "@/components/admin/landing-builder";
import { getAdminSession } from "@/lib/auth/session";
import { isDatabaseConfigured, requireDb } from "@/lib/db";
import { coupons, landingPages, products } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import type { LandingSection } from "@/lib/landing/sections";

export const dynamic = "force-dynamic";

export default async function LandingBuilderPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getAdminSession();
  if (!session) return null;
  const { id } = await params;
  if (!isDatabaseConfigured) notFound();

  const db = requireDb("ল্যান্ডিং");
  const rows = await db.select().from(landingPages).where(eq(landingPages.id, Number(id))).limit(1);
  const page = rows[0];
  if (!page) notFound();

  const [productList, couponList] = await Promise.all([
    db
      .select({ id: products.id, name: products.name, price: products.price })
      .from(products)
      .where(eq(products.status, "active"))
      .orderBy(products.id)
      .limit(100),
    db.select({ code: coupons.code }).from(coupons).where(eq(coupons.active, true)).limit(50),
  ]);

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
          sections: page.sections as LandingSection[],
          metaTitle: page.metaTitle,
          metaDescription: page.metaDescription,
          couponCode: page.couponCode,
          checkoutOffers: page.checkoutOffers as number[],
          thankYouOffers: page.thankYouOffers as number[],
        }}
        products={productList}
        coupons={couponList}
      />
    </AdminShell>
  );
}
