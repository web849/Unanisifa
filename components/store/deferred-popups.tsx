"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

const PopupLayer = dynamic(() => import("./popup-layer").then((m) => m.PopupLayer), {
  ssr: false,
  loading: () => null,
});

/**
 * পপআপ লেয়ার code-split — first paint-এর পরে লোড হয়,
 * যাতে হোম পেজের LCP বাধাগ্রস্ত না হয়।
 */
export function DeferredPopups() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // first paint-এর পরে: idle থাকলে idle-তে, নাহলে ৬০০ms পরে
    const w = window as unknown as {
      requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
      cancelIdleCallback?: (handle: number) => void;
    };
    let handle = 0;
    let usedIdle = false;
    if (typeof w.requestIdleCallback === "function") {
      handle = w.requestIdleCallback(() => setMounted(true), { timeout: 1500 });
      usedIdle = true;
    } else {
      handle = window.setTimeout(() => setMounted(true), 600);
    }
    return () => {
      if (usedIdle && typeof w.cancelIdleCallback === "function") {
        w.cancelIdleCallback(handle);
      } else {
        window.clearTimeout(handle);
      }
    };
  }, []);

  if (!mounted) return null;
  return <PopupLayer />;
}
