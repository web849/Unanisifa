import Link from "next/link";
import { Home, PackageSearch, ShoppingBag, ShoppingCart, User } from "lucide-react";
import { CartCountBadge } from "@/components/cart/cart-count-badge";

/** মোবাইল ৫-আইটেম বটম ন্যাভ: হোম / পণ্য / ট্র্যাক / কার্ট / অ্যাকাউন্ট */
export function BottomNav() {
  return (
    <nav className="bottom-nav" aria-label="মোবাইল নেভিগেশন">
      <Link href="/">
        <Home aria-hidden="true" />
        হোম
      </Link>
      <Link href="/products">
        <ShoppingBag aria-hidden="true" />
        পণ্য
      </Link>
      <Link href="/track-order">
        <PackageSearch aria-hidden="true" />
        ট্র্যাক
      </Link>
      <Link href="/cart">
        <ShoppingCart aria-hidden="true" />
        কার্ট
        <CartCountBadge />
      </Link>
      <Link href="/account">
        <User aria-hidden="true" />
        অ্যাকাউন্ট
      </Link>
    </nav>
  );
}
