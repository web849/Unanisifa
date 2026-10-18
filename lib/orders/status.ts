/**
 * অর্ডার স্ট্যাটাস মেশিন — pure (unit test আছে)।
 *
 * pending → confirmed → processing → shipped → delivered
 * delivered ছাড়া যেকোনো অবস্থা থেকে cancelled।
 * অবৈধ ট্রানজিশন রিজেক্ট হয়।
 */

export const ORDER_STATUSES = [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
] as const;

export type OrderStatusValue = (typeof ORDER_STATUSES)[number];

const FORWARD: Record<OrderStatusValue, OrderStatusValue[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["processing", "cancelled"],
  processing: ["shipped", "cancelled"],
  shipped: ["delivered", "cancelled"],
  delivered: [],
  cancelled: [],
};

export const ORDER_STATUS_LABEL: Record<OrderStatusValue, string> = {
  pending: "অর্ডার জমা হয়েছে",
  confirmed: "অর্ডার নিশ্চিত",
  processing: "প্যাকিং চলছে",
  shipped: "ডেলিভারিতে পাঠানো হয়েছে",
  delivered: "ডেলিভারি সম্পন্ন",
  cancelled: "বাতিল",
};

export function canTransition(from: OrderStatusValue, to: OrderStatusValue): boolean {
  if (from === to) return false;
  return FORWARD[from].includes(to);
}

export function nextStatuses(from: OrderStatusValue): OrderStatusValue[] {
  return FORWARD[from];
}

/**
 * অর্ডার নম্বর: US + YYMMDD + "-" + ৭ অক্ষরের র‍্যান্ডম (A-Z0-9, দ্ব্যর্থতা বাদ)
 * উদাহরণ: US261018-A1B2C3D
 */
const UNAMBIGUOUS = "ABCDEFGHJKLMNPQRSTUVWXYZ123456789";

export function generateOrderNumber(compactDate: string, random: string): string {
  return `US${compactDate}-${random}`;
}

export function randomOrderSuffix(randomBytes: Uint8Array): string {
  let out = "";
  for (const byte of randomBytes) {
    out += UNAMBIGUOUS[byte % UNAMBIGUOUS.length];
    if (out.length === 7) break;
  }
  while (out.length < 7) out += UNAMBIGUOUS[out.length % UNAMBIGUOUS.length];
  return out;
}

export function isValidOrderNumber(value: string): boolean {
  return /^US\d{6}-[A-Z0-9]{7}$/.test(value.trim().toUpperCase());
}

/**
 * অর্ডার ফিঙ্গারপ্রিন্ট উপাদান — হ্যাশ(ফোন + ঠিকানা + আইটেম + ল্যান্ডিং)।
 * ৫ মিনিটে একই ফিঙ্গারপ্রিন্টের ডুপ্লিকেট সাবমিট ব্লক।
 */
export function fingerprintParts(input: {
  phone: string;
  address: string;
  items: Array<{ productId: number; variantId: number | null; quantity: number }>;
  landingSlug: string;
}): string {
  const items = input.items
    .map((item) => `${item.productId}:${item.variantId ?? 0}x${item.quantity}`)
    .sort()
    .join(",");
  return [
    input.phone,
    input.address.trim().toLowerCase().replace(/\s+/g, " "),
    items,
    input.landingSlug,
  ].join("|");
}

export const DUPLICATE_WINDOW_MS = 5 * 60 * 1000;
