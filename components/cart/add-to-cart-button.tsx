"use client";

import { ShoppingCart } from "lucide-react";
import { useCart } from "./cart-provider";
import { useToast } from "@/components/store/toast";

/**
 * "কার্টে যোগ" বাটন — localStorage কার্টে যোগ করে এবং টোস্ট দেখায়।
 * দাম এখানে কখনো হিসাব হয় না; চেকআউটে সার্ভার আবার যাচাই করে।
 */
export function AddToCartButton({
  productId,
  variantId = null,
  quantity = 1,
  disabled = false,
  max = 20,
  label = "কার্টে যোগ",
}: {
  productId: number;
  variantId?: number | null;
  quantity?: number;
  disabled?: boolean;
  max?: number;
  label?: string;
}) {
  const { add, items } = useCart();
  const toast = useToast();
  const inCart = items
    .filter((i) => i.productId === productId && (i.variantId ?? null) === (variantId ?? null))
    .reduce((sum, i) => sum + i.quantity, 0);
  const atMax = inCart >= max;

  return (
    <button
      type="button"
      className="btn btn-sm btn-emerald"
      disabled={disabled || atMax}
      onClick={() => {
        add(productId, quantity, variantId);
        toast(atMax ? "সর্বোচ্চ পরিমাণ যোগ করা হয়েছে" : "কার্টে যোগ হয়েছে", "success");
      }}
    >
      <ShoppingCart aria-hidden="true" />
      {label}
    </button>
  );
}
