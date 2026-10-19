import { CartProvider } from "@/components/cart/cart-provider";
import { BottomNav } from "@/components/store/bottom-nav";
import { StoreFooter } from "@/components/store/footer";
import { StoreHeader } from "@/components/store/header";
import { WhatsAppFab } from "@/components/store/whatsapp-fab";
import { DeferredPopups } from "@/components/store/deferred-popups";

/**
 * স্টোরফ্রন্ট লেআউট — হেডার, ফুটার, বটম ন্যাভ, কার্ট প্রভাইডার,
 * এবং first paint-এর পরে লোড হওয়া (code-split) পপআপ লেয়ার।
 */
export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <CartProvider>
      <a className="skip-link" href="#main">
        মূল কনটেন্টে যান
      </a>
      <StoreHeader />
      <main id="main">{children}</main>
      <StoreFooter />
      <BottomNav />
      <WhatsAppFab />
      <DeferredPopups />
    </CartProvider>
  );
}
