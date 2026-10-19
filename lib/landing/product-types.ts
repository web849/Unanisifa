/**
 * ক্লায়েন্ট-সেফ পণ্য টাইপ ও ছোট হেল্পার।
 * এই ফাইলে কোনো ডেটাবেজ/সার্ভার ইমপোর্ট নেই — বিল্ডার প্রিভিউতেও ইমপোর্ট করা যায়।
 */

export type LandingOrderProduct = {
  id: number;
  name: string;
  price: number;
  compareAtPrice: number | null;
  unitSize: string | null;
  image: string | null;
  inStock: boolean;
  requiresPrescription: boolean;
};

export type LandingProduct = {
  id: number;
  name: string;
  slug: string;
  price: number;
  compareAtPrice: number | null;
  packageSize: string | null;
  shortDescription: string;
  ingredients: string;
  dosage: string;
  image: string | null;
  inStock: boolean;
  requiresPrescription: boolean;
  status: "active" | "draft" | "archived";
  isDemo: boolean;
};

export function toLandingOrderProduct(product: LandingProduct): LandingOrderProduct {
  return {
    id: product.id,
    name: product.name,
    price: product.price,
    compareAtPrice: product.compareAtPrice,
    unitSize: product.packageSize,
    image: product.image,
    inStock: product.inStock,
    requiresPrescription: product.requiresPrescription,
  };
}
