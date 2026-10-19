import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  CalendarClock,
  Factory,
  FlaskConical,
  Package,
  Pill,
  ShieldAlert,
  Stethoscope,
  ThermometerSnowflake,
} from "lucide-react";
import { ProductGallery } from "@/components/store/product-gallery";
import { ProductPurchaseBox } from "@/components/store/product-purchase";
import { ProductReviews } from "@/components/store/product-reviews";
import { ProductCardView } from "@/components/store/product-card";
import {
  getBrand,
  getCommerce,
  getProductBySlug,
  getRelatedProducts,
  listApprovedReviews,
} from "@/lib/store/repository";
import { discountPercent, formatTaka, toBanglaDigits } from "@/lib/utils";
import { MEDICAL_DISCLAIMER } from "@/lib/config";

type Params = { slug: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: "পণ্য পাওয়া যায়নি" };
  const brand = await getBrand();
  const title = product.metaTitle || `${product.name} — ${brand.name}`;
  const description =
    product.metaDescription || product.shortDescription || brand.description;
  const image = product.images[0]?.url;
  return {
    title,
    description,
    alternates: { canonical: `/products/${product.slug}` },
    openGraph: {
      type: "website",
      title,
      description,
      images: image ? [{ url: image, width: 600, height: 600, alt: product.name }] : undefined,
    },
  };
}

export const revalidate = 120;

export default async function ProductPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const [product, brand, commerce, reviews] = await Promise.all([
    getProductBySlug(slug),
    getBrand(),
    getCommerce(),
    listApprovedReviewsSafe(slug),
  ]);

  if (!product || product.status !== "active") notFound();

  const discount = discountPercent(product.price, product.compareAtPrice);
  const related = await getRelatedProducts(product.id, product.categoryId, 4);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.shortDescription || product.description,
    image: product.images.map((i) => i.url),
    sku: product.sku ?? undefined,
    brand: { "@type": "Brand", name: brand.name },
    offers: {
      "@type": "Offer",
      priceCurrency: commerce.currency,
      price: String(product.price),
      availability:
        product.trackStock && product.stock <= 0
          ? "https://schema.org/OutOfStock"
          : "https://schema.org/InStock",
      url: `${brand.siteUrl}/products/${product.slug}`,
    },
    ...(reviews.length > 0
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue:
              Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10,
            reviewCount: reviews.length,
          },
        }
      : {}),
  };

  const specs: Array<{ icon: typeof Pill; label: string; value: string | null }> = [
    { icon: FlaskConical, label: "উপাদান", value: product.ingredients },
    { icon: Pill, label: "ডোজ ও সেবনবিধি", value: product.dosage },
    { icon: ShieldAlert, label: "সতর্কতা / পার্শ্বপ্রতিক্রিয়া", value: product.warnings },
    { icon: ThermometerSnowflake, label: "সংরক্ষণ পদ্ধতি", value: product.storage },
    { icon: Package, label: "প্যাক সাইজ", value: product.packageSize },
    { icon: Factory, label: "প্রস্তুতকারক", value: product.manufacturer },
    { icon: CalendarClock, label: "মেয়াদ", value: product.expiryNote },
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <section className="section">
        <div className="container">
          <nav className="text-small text-muted mb-3" aria-label="ব্রেডক্রাম্ব">
            <Link href="/">হোম</Link> / <Link href="/products">পণ্য</Link>
            {product.category ? (
              <>
                {" / "}
                <Link href={`/products?category=${product.category.slug}`}>
                  {product.category.name}
                </Link>
              </>
            ) : null}{" / "}
            <span>{product.name}</span>
          </nav>

          <div className="grid grid-pdp">
            <ProductGallery images={product.images.map((i) => ({ url: i.url, alt: i.alt }))} name={product.name} />

            <div className="stack stack-sm">
              <div>
                <p className="eyebrow">{product.category?.name ?? "ইউনানী সিফা"}</p>
                <h1 className="mb-2">{product.name}</h1>
                {product.shortDescription ? (
                  <p className="text-muted">{product.shortDescription}</p>
                ) : null}
              </div>

              <div className="price-row">
                <span className="price price-lg">{formatTaka(product.price)}</span>
                {product.compareAtPrice && product.compareAtPrice > product.price ? (
                  <>
                    <span className="price-old">{formatTaka(product.compareAtPrice)}</span>
                    <span className="price-save">
                      সাশ্রয় {formatTaka(product.compareAtPrice - product.price)}
                    </span>
                  </>
                ) : null}
              </div>
              {discount > 0 ? (
                <span className="badge badge-gold" style={{ alignSelf: "flex-start" }}>
                  {toBanglaDigits(discount)}% ছাড়
                </span>
              ) : null}

              {product.requiresPrescription ? (
                <div className="alert alert-warning">
                  <Stethoscope aria-hidden="true" />
                  <span>
                    <strong>প্রেসক্রিপশন আবশ্যক।</strong> এই পণ্যটি অর্ডারের আগে চিকিৎসকের ব্যবস্থাপত্র
                    থাকতে হবে; ডেলিভারির সময় যাচাই করা হবে।
                  </span>
                </div>
              ) : null}

              <div className="card card-plain card-pad-lg">
                <ProductPurchaseBox
                  productId={product.id}
                  productName={product.name}
                  slug={product.slug}
                  unitPrice={product.price}
                  variants={product.variants}
                  stock={product.stock}
                  trackStock={product.trackStock}
                  maxQuantity={commerce.maxQuantity}
                  brand={brand}
                />
              </div>

              <div className="card card-plain">
                <table className="spec-table">
                  <caption className="sr-only">পণ্যের বিস্তারিত তথ্য</caption>
                  <tbody>
                    {specs
                      .filter((spec) => Boolean(spec.value))
                      .map((spec) => (
                        <tr key={spec.label}>
                          <th scope="row">
                            <span className="row" style={{ gap: 6 }}>
                              <spec.icon aria-hidden="true" style={{ width: 16, height: 16, color: "var(--gold-hover)" }} />
                              {spec.label}
                            </span>
                          </th>
                          <td>{spec.value}</td>
                        </tr>
                      ))}
                    <tr>
                      <th scope="row">প্রেসক্রিপশন</th>
                      <td>{product.requiresPrescription ? "আবশ্যক" : "প্রয়োজন নেই"}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </section>

      {product.description ? (
        <section className="section" style={{ paddingTop: 0 }}>
          <div className="container container-narrow">
            <p className="eyebrow">বিস্তারিত</p>
            <h2 className="section-title">পণ্য পরিচিতি</h2>
            <div className="prose">
              {product.description.split(/\n+/).map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <ProductReviews
        productId={product.id}
        reviews={reviews.map((review) => ({
          id: review.id,
          customerName: review.customerName,
          rating: review.rating,
          comment: review.comment,
          isVerified: review.isVerified,
          createdAt: review.createdAt.toISOString(),
        }))}
      />

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container container-narrow">
          <div className="disclaimer-box" role="note">
            <Stethoscope aria-hidden="true" />
            <span>{MEDICAL_DISCLAIMER}</span>
          </div>
        </div>
      </section>

      {related.length > 0 ? (
        <section className="section" style={{ paddingTop: 0 }}>
          <div className="container">
            <p className="eyebrow">আরও দেখুন</p>
            <h2 className="section-title">একই ধরনের পণ্য</h2>
            <div className="grid grid-2 grid-4 mt-4">
              {related.map((item) => (
                <ProductCardView key={item.id} product={item} />
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </>
  );
}

async function listApprovedReviewsSafe(slug: string) {
  const product = await getProductBySlug(slug);
  if (!product) return [];
  return listApprovedReviews(product.id);
}
