import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { eq, sql } from "drizzle-orm";
import { DeferredPopups } from "@/components/store/deferred-popups";
import { LandingOrderForm } from "@/components/landing/landing-order-form";
import { renderLandingSection } from "@/components/landing/landing-sections";
import { isDatabaseConfigured, requireDb } from "@/lib/db";
import { landingPages, productImages, products } from "@/lib/db/schema";
import { getBrand, getCommerce, listApprovedReviews, type ProductWithRelations } from "@/lib/store/repository";
import type { LandingSection } from "@/lib/landing/sections";
import { MEDICAL_DISCLAIMER } from "@/lib/config";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string }> };

async function loadPage(slug: string) {
  if (!isDatabaseConfigured) return null;
  const db = requireDb("ল্যান্ডিং পেজ");
  const rows = await db.select().from(landingPages).where(eq(landingPages.slug, slug)).limit(1);
  const page = rows[0];
  if (!page || page.status !== "published") return null;

  /* ভিউ কাউন্ট — বেস্ট এফোর্ট (রেন্ডার ব্লক হবে না) */
  db.update(landingPages)
    .set({ viewCount: sql`${landingPages.viewCount} + 1` })
    .where(eq(landingPages.id, page.id))
    .catch(() => undefined);

  return page;
}

async function loadProduct(productId: number | null): Promise<ProductWithRelations | null> {
  if (!productId || !isDatabaseConfigured) return null;
  const db = requireDb("পণ্য");
  const rows = await db
    .select()
    .from(products)
    .where(sql`${products.id} = ${productId} AND ${products.status} = 'active'`)
    .limit(1);
  const product = rows[0];
  if (!product) return null;
  const images = await db
    .select()
    .from(productImages)
    .where(eq(productImages.productId, product.id))
    .orderBy(productImages.sortOrder);
  return { ...product, images, variants: [], category: null };
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const page = await loadPage(slug);
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
  const page = await loadPage(slug);
  if (!page) notFound();

  const [product, brand, commerce] = await Promise.all([
    loadProduct(page.productId),
    getBrand(),
    getCommerce(),
  ]);
  const reviews = product && isDatabaseConfigured ? await listApprovedReviews(product.id) : [];
  const sections = page.sections as LandingSection[];

  const hasOrderForm = sections.some((section) => section.type === "order_form" && !section.hidden);
  const hasDoctorAdvice = sections.some((section) => section.type === "doctor_advice" && !section.hidden);

  const orderFormProduct = product
    ? {
        id: product.id,
        name: product.name,
        price: product.price,
        compareAtPrice: product.compareAtPrice,
        unitSize: product.packageSize,
        image: product.images[0]?.url ?? null,
        inStock: !product.trackStock || product.stock > 0,
        requiresPrescription: product.requiresPrescription,
      }
    : null;

  return (
    <div className={`lp-root lp-theme-${page.themeSlug}`}>
      <main id="main">
        {sections.map((section) => {
          if (section.hidden) return null;
          if (section.type === "order_form") {
            if (!orderFormProduct) return null;
            return (
              <LandingOrderForm
                key={`s-${section.id}`}
                product={orderFormProduct}
                landingSlug={page.slug}
                couponCode={page.couponCode}
                deliveryInside={commerce.deliveryInsideDhaka}
                deliveryOutside={commerce.deliveryOutsideDhaka}
                brand={brand}
                maxQuantity={commerce.maxQuantity}
              />
            );
          }
          return renderLandingSection(section, {
            product,
            reviews,
            brand,
          });
        })}

        {/* বাধ্যতামূলক: ডাক্তারের পরামর্শ ডিসক্লেইমার (বিল্ডার থেকে বাদ দিলেও রেন্ডার হবে) */}
        {!hasDoctorAdvice ? (
          <section className="lp-section">
            <div className="lp-inner">
              <div className="disclaimer-box" role="note">
                <p className="mb-0">{MEDICAL_DISCLAIMER}</p>
              </div>
            </div>
          </section>
        ) : null}

        {!hasOrderForm ? (
          <section className="lp-section lp-section-alt">
            <div className="lp-inner" style={{ textAlign: "center" }}>
              <p className="lp-text mb-0">
                এই অফার পেজে অর্ডার ফর্ম যোগ করা হয়নি —{" "}
                <Link className="btn btn-primary" href="/products">
                  দোকান থেকে অর্ডার করুন
                </Link>
              </p>
            </div>
          </section>
        ) : null}
      </main>

      <footer className="lp-footer">
        <p className="text-small mb-0">
          {brand.name} · {brand.phone} · ক্যাশ অন ডেলিভারি সারাদেশে
        </p>
      </footer>

      <DeferredPopups />
    </div>
  );
}
