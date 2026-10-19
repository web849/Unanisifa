"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Package, RefreshCw } from "lucide-react";

/**
 * খালি ক্যাটালগে ডেমো পণ্য ইমপোর্টের এক-ক্লিক বোতাম।
 * ডেটাবেজ না থাকলে (pending) দেখানো হয় না — ভুয়া সাকসেস নয়।
 */
export function DemoCatalogNotice({
  demoCount,
  compact = false,
}: {
  demoCount: number;
  compact?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "err"; text: string } | null>(null);

  const runImport = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/demo-catalog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      const payload = (await response.json()) as {
        ok?: boolean;
        error?: string;
        products?: number;
        categories?: number;
        images?: number;
      };
      if (!response.ok || !payload.ok) {
        setMessage({ tone: "err", text: payload.error ?? "Import failed" });
        return;
      }
      setMessage({
        tone: "ok",
        text: `${payload.products ?? 0} products, ${payload.categories ?? 0} categories and ${
          payload.images ?? 0
        } images imported.`,
      });
      router.refresh();
    } catch {
      setMessage({ tone: "err", text: "Network error. Try again." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`demo-catalog-note${compact ? " demo-catalog-note-compact" : ""}`}>
      <span className="demo-catalog-icon" aria-hidden="true">
        <Package />
      </span>
      <div className="demo-catalog-copy">
        <strong>No active products in the catalog.</strong>
        <p>
          {demoCount} demo products are ready to import, so the storefront, landing-page builder and
          order forms have real catalog rows to work with.
        </p>
        {message ? (
          <p className={message.tone === "ok" ? "ok-text" : "error-text"} role="status">
            {message.text}
          </p>
        ) : null}
      </div>
      <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={() => void runImport()}>
        <RefreshCw aria-hidden="true" className={busy ? "spin" : undefined} />
        {busy ? "Importing…" : `Import ${demoCount} demo products`}
      </button>
    </div>
  );
}
