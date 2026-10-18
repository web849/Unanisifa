"use client";

import { useEffect, useRef } from "react";

/**
 * থ্যাংক-ইউ পেজে ব্রাউজার Pixel Purchase ইভেন্ট —
 * সার্ভার CAPI-এর একই event_id দিয়ে ডিডুপ হয়।
 * pixelId না থাকলে কিছুই পাঠায় না (ভুয়া সাকসেস নয়)।
 */
export function PurchasePixel({
  pixelId,
  eventId,
  value,
  currency,
}: {
  pixelId: string | null;
  eventId: string;
  value: number;
  currency: string;
}) {
  const fired = useRef(false);

  useEffect(() => {
    if (!pixelId || fired.current) return;
    fired.current = true;
    type Fbq = (...args: unknown[]) => void;
    const fbq = (window as unknown as { fbq?: Fbq }).fbq;
    if (typeof fbq === "function") {
      fbq("track", "Purchase", {
        value,
        currency,
        eventID: eventId,
      });
    }
  }, [pixelId, eventId, value, currency]);

  return null;
}
