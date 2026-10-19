"use client";

import { useCart } from "./cart-provider";
import { toBanglaDigits } from "@/lib/utils";

/** হেডার/বটম ন্যাভের কার্ট কাউন্ট ব্যাজ — localStorage থেকে লাইভ */
export function CartCountBadge({ variant = "header" }: { variant?: "header" | "nav" }) {
  const { count, ready } = useCart();
  if (!ready || count <= 0) return null;
  const label = `${toBanglaDigits(count)}টি পণ্য কার্টে`;
  return (
    <span className={variant === "header" ? "icon-btn-count" : "bottom-nav-count"} aria-label={label}>
      {toBanglaDigits(count)}
    </span>
  );
}
