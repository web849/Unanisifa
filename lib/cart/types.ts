/**
 * কার্টের টাইপ — কার্ট localStorage-ভিত্তিক (ক্লায়েন্ট), কিন্তু দাম সবসময়
 * সার্ভারে রি-ভ্যালিডেট হয় (/api/cart/validate)। ব্রাউজার থেকে আসা কোনো দাম
 * বিশ্বাস করা হয় না — শুধু productId, variantId ও quantity পাঠানো হয়।
 */

export type CartItem = {
  productId: number;
  variantId: number | null;
  quantity: number;
};

export type CartState = {
  items: CartItem[];
};

/** সার্ভার থেকে ফেরত আসা প্রাইসড লাইন */
export type PricedCartLine = {
  productId: number;
  variantId: number | null;
  name: string;
  variantName: string | null;
  slug: string;
  image: string | null;
  unitPrice: number;
  compareAtPrice: number | null;
  quantity: number;
  lineTotal: number;
  stock: number;
  trackStock: boolean;
  maxQuantity: number;
  available: boolean;
  requiresPrescription: boolean;
};

export type PricedCart = {
  lines: PricedCartLine[];
  subtotal: number;
  unavailableCount: number;
};

export const CART_STORAGE_KEY = "us_cart_v1";

export function emptyCart(): CartState {
  return { items: [] };
}

export function cartCount(state: CartState): number {
  return state.items.reduce((sum, item) => sum + item.quantity, 0);
}
