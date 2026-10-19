import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { eq, sql } from "drizzle-orm";
import { DeferredPopups } from "@/components/store/deferred-popups";
import { LandingPageView } from "@/components/landing/landing-page-view";
import { isDatabaseConfigured, requireDb } from "@/lib/db";
import { landingPages, type LandingPage } from "@/lib/db/schema";
import { getBrand, getCommerce, listApprovedReviews } from "@/lib/store/repository";
import { getLandingCatalog } from "@/lib/landing/products";
import type { LandingSection } from "@/lib/landing/sections";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string }> };

/**
 * পেজ লোড — `generateMetadata` ও পেজ দুই জায়গা থেকেই ডাকা হয়, তাই cache()।
 * ভিউ কাউন্ট এখানে বাড়ে না; পেজ রেন্ডারে একবার বাড়ে (আগে মেটাডেটা কলেও কাউন্ট বাড়ছিল)।
 */
const loadPublishedPage = cache(async (slug: string): Promise<LandingPage | null> => {
  if (!isDatabaseConfigured) return null;
  const db = requireDb("ল্যান্ডিং পেজ");
  const rows = await db.select().from(landingPages).where(eq(landingPages.slug, slug)).limit(1);
  const page = rows[0];
  if (!page || page.status !== "published") return null;
  return page;
});

async function recordView(pageId: number): Promise<void> {
  if (!isDatabaseConfigured) return;
  const db = requireDb("ল্যান্ডিং পেজ");
  db.update(landingPages)
    .set({ viewCount: sql`${landingPages.viewCount} + 1` })
    .where(eq(landingPages.id, pageId))
    .catch(() => undefined);
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const page = await loadPublishedPage(slug);
  if (!page) return { title: "অফার", robots: { index: false, follow: false } };
  return {
    title: page.metaTitle || page.title,
    description: page.metaDescription || undefined,
    robots: { index: true, follow: true },
    alternates: { canonical: `/offer/${page.slug}` },
  };
}

export default async function OfferPage({ params }: Params) {
  const { slug } = await params;
  const page = await loadPublishedPage(slug);
  if (!page) notFound();

  const [brand, commerce, catalog] = await Promise.all([
    getBrand(),
    getCommerce(),
    getLandingCatalog({ includeDrafts: true }),
  ]);

  const mainProduct = page.productId
    ? (catalog.items.find((product) => product.id === page.productId) ?? null)
    : null;
  const reviews = mainProduct && isDatabaseConfigured ? await listApprovedReviews(mainProduct.id) : [];

  void recordView(page.id);

  return (
    <>
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
      />
      <DeferredPopups />
    </>
  );
}
