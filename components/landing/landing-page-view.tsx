/**
 * পাবলিক অফার পেজ ও অ্যাডমিন ড্রাফট-প্রিভিউ — একই রেন্ডারার।
 *
 * ডুপ্লিকেশন এড়াতে `/offer/[slug]` এবং
 * `/admin/landing-pages/[id]/preview` দুটোই এই কম্পোনেন্ট ব্যবহার করে।
 * `preview` মোডে অর্ডার ফর্ম দেখতে একই রকম, কিন্তু কখনো সাবমিট হয় না।
 */

import Link from "next/link";
import { LandingOrderForm } from "@/components/landing/landing-order-form";
import { renderLandingSection } from "@/components/landing/landing-sections";
import { toLandingOrderProduct, type LandingProduct } from "@/lib/landing/product-types";
import type { LandingSection } from "@/lib/landing/sections";
import type { BrandSettings, CommerceSettings } from "@/lib/config";
import { MEDICAL_DISCLAIMER } from "@/lib/config";
import type { ProductReview } from "@/lib/db/schema";

export type LandingPageContent = {
  id: number;
  title: string;
  slug: string;
  themeSlug: string;
  productId: number | null;
  couponCode: string | null;
  sections: LandingSection[];
};

export function LandingPageView({
  page,
  products,
  reviews,
  brand,
  commerce,
  preview = false,
  activeSectionId = null,
}: {
  page: LandingPageContent;
  products: LandingProduct[];
  reviews: ProductReview[];
  brand: BrandSettings;
  commerce: CommerceSettings;
  preview?: boolean;
  activeSectionId?: number | null;
}) {
  const sections = page.sections;
  const mainProduct = page.productId
    ? (products.find((product) => product.id === page.productId) ?? null)
    : null;

  const visible = sections.filter((section) => !section.hidden);
  const hasOrderForm = visible.some((section) => section.type === "order_form");
  const hasDoctorAdvice = visible.some((section) => section.type === "doctor_advice");

  const orderProductFor = (section: LandingSection): LandingProduct | null => {
    const requestedId = Number((section.settings as Record<string, unknown>).productId);
    if (Number.isInteger(requestedId) && requestedId > 0) {
      const match = products.find((product) => product.id === requestedId);
      if (match) return match;
    }
    return mainProduct;
  };

  return (
    <div className={`lp-root lp-theme-${page.themeSlug}`} data-landing-page={page.id}>
      <main id="main">
        {visible.map((section) => {
          if (section.type === "order_form") {
            const product = orderProductFor(section);
            if (!product) {
              if (!preview) return null;
              return (
                <section className="lp-section lp-section-alt" key={`s-${section.id}`}>
                  <div className="lp-inner">
                    <div className="builder-inline-note">
                      অর্ডার ফর্ম চালু করতে Page settings থেকে একটি main product নির্বাচন করুন।
                    </div>
                  </div>
                </section>
              );
            }
            const settings = section.settings as Record<string, unknown>;
            const form = (
              <LandingOrderForm
                product={toLandingOrderProduct(product)}
                landingSlug={page.slug}
                couponCode={page.couponCode}
                deliveryInside={commerce.deliveryInsideDhaka}
                deliveryOutside={commerce.deliveryOutsideDhaka}
                brand={brand}
                maxQuantity={commerce.maxQuantity}
                title={typeof settings.title === "string" ? settings.title : undefined}
                subtitle={typeof settings.subtitle === "string" ? settings.subtitle : undefined}
                preview={preview}
              />
            );
            return preview ? (
              <div
                className="lp-preview-section"
                data-preview-section={section.id}
                data-active={activeSectionId === section.id ? "true" : undefined}
                key={`s-${section.id}`}
              >
                {form}
              </div>
            ) : (
              <div key={`s-${section.id}`}>{form}</div>
            );
          }

          const rendered = renderLandingSection(section, {
            product: mainProduct,
            products,
            reviews,
            brand,
          });
          if (!rendered) return null;

          return preview ? (
            <div
              className="lp-preview-section"
              data-preview-section={section.id}
              data-active={activeSectionId === section.id ? "true" : undefined}
              key={`s-${section.id}`}
            >
              {rendered}
            </div>
          ) : (
            <div key={`s-${section.id}`}>{rendered}</div>
          );
        })}

        {/* বাধ্যতামূলক: ডাক্তারের পরামর্শ ডিসক্লেইমার (ব্লক বাদ দিলেও রেন্ডার হবে) */}
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
              {preview ? (
                <p className="lp-text mb-0">
                  এই পেজে অর্ডার ফর্ম ব্লক নেই। বাম দিকের ব্লক প্যালেট থেকে Order Form যোগ করুন।
                </p>
              ) : (
                <p className="lp-text mb-0">
                  এই অফার পেজে অর্ডার ফর্ম যোগ করা হয়নি —{" "}
                  <Link className="btn btn-primary" href="/products">
                    দোকান থেকে অর্ডার করুন
                  </Link>
                </p>
              )}
            </div>
          </section>
        ) : null}
      </main>

      <footer className="lp-footer">
        <p className="text-small mb-0">
          {brand.name} · {brand.phone} · ক্যাশ অন ডেলিভারি সারাদেশে
        </p>
      </footer>
    </div>
  );
}
