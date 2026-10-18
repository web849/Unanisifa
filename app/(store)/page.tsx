import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Gift } from "lucide-react";
import { HomeHero } from "@/components/store/home-hero";
import { BannerCarousel } from "@/components/store/banner-carousel";
import { CategoryRail } from "@/components/store/category-rail";
import { ProductCardView } from "@/components/store/product-card";
import { TrustStrip } from "@/components/store/trust-strip";
import { getBrand, getFeaturedProducts, listActiveBanners } from "@/lib/store/repository";

export const metadata: Metadata = {
  title: "ইউনানী সিফা — প্রাকৃতিক ও ইউনানী চিকিৎসার বিশ্বস্ত ঠিকানা",
  alternates: { canonical: "/" },
};

export const revalidate = 60;

export default async function HomePage() {
  const [brand, banners, featured] = await Promise.all([
    getBrand(),
    listActiveBanners(),
    getFeaturedProducts(8),
  ]);

  return (
    <>
      <HomeHero />

      {banners.length > 0 ? (
        <section className="section" aria-label="চলমান অফার">
          <div className="container">
            <BannerCarousel banners={banners} />
          </div>
        </section>
      ) : null}

      <CategoryRail />

      <section className="section" aria-labelledby="popular-title">
        <div className="container">
          <div className="row-between row-wrap mb-4">
            <div>
              <p className="eyebrow">জনপ্রিয়</p>
              <h2 className="section-title" id="popular-title">
                সবার পছন্দের পণ্য
              </h2>
            </div>
            <Link className="btn btn-outline btn-sm" href="/products">
              সব পণ্য দেখুন
              <ArrowRight aria-hidden="true" />
            </Link>
          </div>

          {featured.length > 0 ? (
            <div className="grid grid-2 grid-4">
              {featured.map((product) => (
                <ProductCardView key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <Gift aria-hidden="true" />
              <p className="empty-state-title">এখনো কোনো পণ্য যোগ করা হয়নি</p>
              <p>
                ডেটাবেজ কনফিগার করে <span className="mono">npm run db:seed</span> চালালে পণ্য দেখা যাবে।
              </p>
            </div>
          )}
        </div>
      </section>

      <TrustStrip />

      <section className="section">
        <div className="container">
          <div className="card card-dark card-pad-lg row-between row-wrap">
            <div>
              <h2 className="mb-2">{brand.name}-এ অর্ডার করা সহজ</h2>
              <p className="text-muted mb-0" style={{ maxWidth: "52ch" }}>
                পণ্য বেছে নিন, নাম-মোবাইল-ঠিকানা দিন, পণ্য হাতে পেয়ে টাকা দিন। সাপোর্ট:{" "}
                {brand.supportHours}
              </p>
            </div>
            <Link className="btn btn-lg" href="/products">
              কেনাকাটা শুরু করুন
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
