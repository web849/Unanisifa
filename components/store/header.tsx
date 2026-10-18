import Link from "next/link";
import { Banknote, Menu, Search, ShoppingCart, Truck, User } from "lucide-react";
import { BrandLogo } from "./brand-logo";
import { CartCountBadge } from "@/components/cart/cart-count-badge";
import { getBrand } from "@/lib/store/repository";
import { CategoryDrawerButton } from "./category-drawer";

/**
 * স্টিকি হেডার — লোগো, সার্চ, নেভ, কার্ট, অ্যাকাউন্ট।
 * মোবাইলে সার্চ লুকিয়ে থাকে (প্রোডাক্ট পেজে আলাদা সার্চ আছে), ক্যাটাগরি ড্রয়ার থাকে।
 */
export async function StoreHeader() {
  const brand = await getBrand();

  return (
    <>
      <div className="topbar">
        <div className="container topbar-inner">
          <span className="topbar-item">
            <Banknote aria-hidden="true" />
            ক্যাশ অন ডেলিভারি
          </span>
          <span className="topbar-divider" aria-hidden="true" />
          <span className="topbar-item">
            <Truck aria-hidden="true" />
            {brand.serviceArea} ডেলিভারি
          </span>
          <span className="topbar-divider topbar-hide-sm" aria-hidden="true" />
          <span className="topbar-item topbar-hide-sm">সাপোর্ট: {brand.supportHours}</span>
        </div>
      </div>

      <header className="header">
        <div className="container header-inner">
          <CategoryDrawerButton />
          <BrandLogo />

          <form action="/products" method="get" className="header-search" role="search">
            <label className="sr-only" htmlFor="header-search-input">
              পণ্য খুঁজুন
            </label>
            <Search aria-hidden="true" />
            <input
              id="header-search-input"
              className="input"
              type="search"
              name="q"
              placeholder="পণ্য খুঁজুন…"
              autoComplete="off"
            />
          </form>

          <nav className="header-nav" aria-label="প্রধান নেভিগেশন">
            <Link href="/products">সব পণ্য</Link>
            <Link href="/track-order">অর্ডার ট্র্যাক</Link>
            <Link href="/about">আমাদের সম্পর্কে</Link>
            <Link href="/contact">যোগাযোগ</Link>
          </nav>

          <div className="header-actions">
            <Link href="/cart" className="icon-btn" aria-label="কার্ট দেখুন">
              <ShoppingCart aria-hidden="true" />
              <CartCountBadge />
            </Link>
            <Link href="/account" className="icon-btn hidden-mobile" aria-label="অ্যাকাউন্ট">
              <User aria-hidden="true" />
            </Link>
            <span className="icon-btn only-mobile" aria-hidden="true" style={{ visibility: "hidden" }}>
              <Menu />
            </span>
          </div>
        </div>
      </header>
    </>
  );
}
