"use client";

import { useState } from "react";
import { Zap } from "lucide-react";

/**
 * R2 কানেকশন টেস্ট বোতাম — Integrations ও Storage পেজে বসে।
 * R2-তে temp অবজেক্ট লিখে মুছে যাচাই করে; ফলাফল ইনলাইনে দেখায়।
 */
export function R2TestButton() {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<
    | { tone: "ok"; bucket: string; mode: "direct" | "proxy" }
    | { tone: "err"; text: string }
    | null
  >(null);

  const run = async () => {
    setBusy(true);
    setResult(null);
    try {
      const response = await fetch("/api/admin/integrations/r2-test", { method: "POST" });
      const json = (await response.json()) as {
        ok?: boolean;
        error?: string;
        bucket?: string;
        mode?: "direct" | "proxy";
      };
      if (response.ok && json.ok && json.bucket) {
        setResult({ tone: "ok", bucket: json.bucket, mode: json.mode === "direct" ? "direct" : "proxy" });
      } else {
        setResult({ tone: "err", text: json.error ?? "Connection test failed" });
      }
    } catch {
      setResult({ tone: "err", text: "Network error — try again." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <span className="upload-btn-wrap">
      <button type="button" className="btn btn-outline btn-sm" disabled={busy} onClick={() => void run()}>
        <Zap aria-hidden="true" />
        {busy ? "Testing…" : "Test R2 connection"}
      </button>
      {result?.tone === "ok" ? (
        <span className="ok-text" role="status">
          R2 connected — bucket &ldquo;{result.bucket}&rdquo;. New uploads go to R2
          {result.mode === "direct"
            ? " (direct public URL)."
            : " (served via this site — set R2 Public Base URL for faster direct serving)."}
        </span>
      ) : null}
      {result?.tone === "err" ? (
        <span className="error-text" role="alert">
          {result.text}
        </span>
      ) : null}
    </span>
  );
}
