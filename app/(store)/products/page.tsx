import type { Metadata } from "next";
import Link from "next/link";
import { PackageSearch, SearchX } from "lucide-react";
import { ProductCardView } from "@/components/store/product-card";
import { listCategories, searchProducts, type ProductSort } from "@/lib/store/repository";
import { getBrand } from "@/lib/store/repository";
import { toBanglaDigits } from "@/lib/utils";

export const metadata: Metadata = {
  title: "সব পণ্য",
  description: "ইউনানী ও ভেষজ পণ্যের সম্পূর্ণ তালিকা — সার্চ, ক্যাটাগরি ফিল্টার ও সর্টসহ।",
  alternates: { canonical: "/products" },
};

export const revalidate = 60;

const SORT_LABEL: Record<ProductSort, string> = {
  newest: "নতুন আগে",
  price_asc: "দাম: কম থেকে বেশি",
  price_desc: "দাম: বেশি থেকে কম",
  popular: "জনপ্রিয়",
};

type SearchParams = { q?: string; category?: string; sort?: string; page?: string };

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const sort: ProductSort =
    params.sort === "price_asc" || params.sort === "price_desc" || params.sort === "popular"
      ? params.sort
      : "newest";
  const page = Math.max(Number(params.page ?? "1") || 1, 1);
  const limit = 12;

  const [brand, categories, result] = await Promise.all([
    getBrand(),
    listCategories(),
    searchProducts({
      q: params.q,
      category: params.category,
      sort,
      page,
      limit,
    }),
  ]);

  const activeCategory = categories.find((c) => c.slug === params.category) ?? null;
  const totalPages = Math.max(Math.ceil(result.total / limit), 1);

  const buildUrl = (overrides: Partial<SearchParams>) => {
    const next = new URLSearchParams();
    const merged = { ...params, ...overrides };
    if (merged.q) next.set("q", merged.q);
    if (merged.category) next.set("category", merged.category);
    if (merged.sort && merged.sort !== "newest") next.set("sort", merged.sort);
    if (merged.page && merged.page !== "1") next.set("page", merged.page);
    const query = next.toString();
    return query ? `/products?${query}` : "/products";
  };

  return (
    <>
      <section className="section" style={{ paddingBottom: 0 }}>
        <div className="container">
          <p className="eyebrow">ক্যাটালগ</p>
          <h1 className="section-title">
            {activeCategory ? activeCategory.name : "সব পণ্য"}
          </h1>
          <p className="section-subtitle">
            {result.total > 0
              ? `${toBanglaDigits(result.total)}টি পণ্য পাওয়া গেছে`
              : `${brand.name}-এর সম্পূর্ণ ক্যাটালগ`}
          </p>

          <form action="/products" method="get" className="stack stack-sm mb-4" role="search">
            <div className="toolbar">
              <label className="sr-only" htmlFor="products-q">
                পণ্য খুঁজুন
              </label>
              <input
                id="products-q"
                className="input"
                type="search"
                name="q"
                defaultValue={params.q ?? ""}
                placeholder="নাম বা বর্ণনা দিয়ে খুঁজুন…"
              />
              {params.category ? (
                <input type="hidden" name="category" value={params.category} />
              ) : null}
              <label className="sr-only" htmlFor="products-sort">
                সাজান
              </label>
              <select
                id="products-sort"
                className="select"
                name="sort"
                defaultValue={sort}
                style={{ width: "auto", minWidth: 180 }}
              >
                {(Object.keys(SORT_LABEL) as ProductSort[]).map((key) => (
                  <option key={key} value={key}>
                    {SORT_LABEL[key]}
                  </option>
                ))}
              </select>
              <button type="submit" className="btn btn-emerald">
                খুঁজুন
              </button>
              {params.q || params.category || sort !== "newest" ? (
                <Link className="btn btn-ghost" href="/products">
                  ফিল্টার মুছুন
                </Link>
              ) : null}
            </div>
          </form>

          <div className="pill-scroll" role="list" aria-label="ক্যাটাগরি ফিল্টার">
            <Link className="pill" href={buildUrl({ category: undefined, page: undefined })} aria-pressed={!activeCategory}>
              সব
            </Link>
            {categories.map((category) => (
              <Link
                key={category.id}
                className="pill"
                href={buildUrl({ category: category.slug, page: undefined })}
                aria-pressed={activeCategory?.id === category.id}
              >
                {category.name}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          {result.items.length > 0 ? (
            <>
              <div className="grid grid-2 grid-4">
                {result.items.map((product) => (
                  <ProductCardView key={product.id} product={product} />
                ))}
              </div>

              {totalPages > 1 ? (
                <nav className="row mt-5" aria-label="পেজিনেশন" style={{ justifyContent: "center" }}>
                  {page > 1 ? (
                    <Link className="btn btn-outline btn-sm" href={buildUrl({ page: String(page - 1) })}>
                      আগের পেজ
                    </Link>
                  ) : null}
                  <span className="text-muted text-small">
                    পেজ {toBanglaDigits(page)} / {toBanglaDigits(totalPages)}
                  </span>
                  {page < totalPages ? (
                    <Link className="btn btn-outline btn-sm" href={buildUrl({ page: String(page + 1) })}>
                      আরও দেখুন
                    </Link>
                  ) : null}
                </nav>
              ) : null}
            </>
          ) : (
            <div className="empty-state">
              {params.q || params.category ? <SearchX aria-hidden="true" /> : <PackageSearch aria-hidden="true" />}
              <p className="empty-state-title">
                {params.q || params.category ? "কিছু পাওয়া যায়নি" : "এখনো পণ্য যোগ করা হয়নি"}
              </p>
              <p>
                {params.q || params.category
                  ? "অন্য শব্দ দিয়ে খুঁজুন বা ফিল্টার মুছে দিন।"
                  : "ডেটাবেজ কনফিগার করে সিড চালালে পণ্য দেখা যাবে।"}
              </p>
              {params.q || params.category ? (
                <Link className="btn btn-outline btn-sm" href="/products">
                  সব পণ্য দেখুন
                </Link>
              ) : null}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
