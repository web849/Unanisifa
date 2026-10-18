import Link from "next/link";
import Image from "next/image";
import { listCategories } from "@/lib/store/repository";

/**
 * কম্প্যাক্ট ক্যাটাগরি রেইল — কভার ছবিসহ, ডান-থেকে-বাম অটো-স্ক্রল (CSS অ্যানিমেশন),
 * হোভার/ফোকাসে পজ। সিমলেস লুপের জন্য তালিকা দুইবার রেন্ডার হয়।
 */
export async function CategoryRail() {
  const categories = await listCategories();
  if (categories.length === 0) return null;

  const doubled = [...categories, ...categories];

  return (
    <section className="section" aria-labelledby="category-rail-title">
      <div className="container">
        <p className="eyebrow">ক্যাটাগরি</p>
        <h2 className="section-title" id="category-rail-title">
          যা যা খুঁজছেন
        </h2>
        <p className="section-subtitle">প্রয়োজন অনুযায়ী ক্যাটাগরি বেছে নিন</p>

        <div className="category-rail category-rail-auto" aria-label="ক্যাটাগরি তালিকা">
          {doubled.map((category, index) => (
            <Link
              key={`${category.id}-${index}`}
              className="category-card"
              href={`/products?category=${category.slug}`}
              aria-hidden={index >= categories.length}
              tabIndex={index >= categories.length ? -1 : 0}
            >
              <span className="category-thumb">
                {category.coverImage ? (
                  <Image
                    src={category.coverImage}
                    alt=""
                    fill
                    sizes="168px"
                    loading={index < 6 ? "eager" : "lazy"}
                  />
                ) : null}
              </span>
              <span className="category-name">{category.name}</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
