import type { Metadata } from "next";
import { Suspense } from "react";
import { CheckoutView } from "@/components/checkout/checkout-view";
import { getCommerce } from "@/lib/store/repository";

export const metadata: Metadata = {
  title: "চেকআউট",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const commerce = await getCommerce();
  return (
    <Suspense fallback={null}>
      <CheckoutView
        commerce={{
          deliveryInsideDhaka: commerce.deliveryInsideDhaka,
          deliveryOutsideDhaka: commerce.deliveryOutsideDhaka,
          freeDeliveryThreshold: commerce.freeDeliveryThreshold,
          codEnabled: commerce.codEnabled,
          maxQuantity: commerce.maxQuantity,
        }}
      />
    </Suspense>
  );
}
