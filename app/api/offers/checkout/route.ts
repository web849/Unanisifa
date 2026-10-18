import { jsonOk } from "@/lib/api/helpers";
import { isDatabaseConfigured } from "@/lib/db";
import { getFeaturedProducts } from "@/lib/store/repository";

export const dynamic = "force-dynamic";

/**
 * চেকআউট-এক্সক্লুসিভ অফার কার্ড (২–৩টি) — ফিচার্ড পণ্য থেকে।
 * (ল্যান্ডিং-নির্দিষ্ট checkoutOffers ল্যান্ডিং পেজেই রেন্ডার হয়, এখানে নয়।)
 */
export async function GET() {
  if (!isDatabaseConfigured) {
    return jsonOk({ offers: [] });
  }

  const featured = await getFeaturedProducts(3);
  return jsonOk({
    offers: featured.map((product) => ({
      id: product.id,
      name: product.name,
      slug: product.slug,
      price: product.price,
      compareAtPrice: product.compareAtPrice,
      image: product.image,
      badge: "চেকআউট অফার",
    })),
  });
}
