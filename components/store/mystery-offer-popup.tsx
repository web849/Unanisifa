"use client";

import { useEffect, useRef, useState } from "react";
import { Copy, Gift, X } from "lucide-react";
import { useToast } from "./toast";
import { normalizeBdPhone } from "@/lib/orders/validation-client";
import { formatTaka, toBanglaDigits } from "@/lib/utils";

type ClaimState =
  | { stage: "intro" }
  | { stage: "revealed"; code: string; expiresAt: string; minSubtotal: number };

/**
 * মিস্ট্রি অফার — নাম+মোবাইল → অ্যানিমেটেড গিফট রিভিল → একটি কুপন।
 * এক নম্বরে একবার, মেয়াদ ৭ দিন, মিনিমাম অর্ডার ৳৬৯৯।
 * রিলোড করলে আগের ক্লেইম করা কোডই দেখায় (সার্ভার থেকে)।
 */
export function MysteryOfferPopup({ onClose }: { onClose: () => void }) {
  const toast = useToast();
  const [state, setState] = useState<ClaimState>({ stage: "intro" });
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    dialogRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);

    // আগে ক্লেইম করা থাকলে সরাসরি রিভিলড কোড দেখানো হয়
    void fetch("/api/offers/mystery", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((payload: { claim?: { code: string; expiresAt: string; minSubtotal: number } } | null) => {
        if (payload?.claim) {
          setState({
            stage: "revealed",
            code: payload.claim.code,
            expiresAt: payload.claim.expiresAt,
            minSubtotal: payload.claim.minSubtotal,
          });
        }
      })
      .catch(() => undefined);

    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const claim = async (event: React.FormEvent) => {
    event.preventDefault();
    const normalized = normalizeBdPhone(phone);
    if (!normalized) {
      setError("সঠিক বাংলাদেশি মোবাইল নম্বর দিন (যেমন 01712345678)");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const response = await fetch("/api/offers/mystery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), phone: normalized }),
      });
      const payload = (await response.json()) as {
        ok?: boolean;
        error?: string;
        claim?: { code: string; expiresAt: string; minSubtotal: number };
      };
      if (!response.ok || !payload.ok || !payload.claim) {
        setError(payload.error ?? "অফারটি নেওয়া যায়নি। আবার চেষ্টা করুন।");
        return;
      }
      setState({
        stage: "revealed",
        code: payload.claim.code,
        expiresAt: payload.claim.expiresAt,
        minSubtotal: payload.claim.minSubtotal,
      });
    } catch {
      setError("নেটওয়ার্ক সমস্যা। আবার চেষ্টা করুন।");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label="মিস্ট্রি অফার"
        ref={dialogRef}
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
      >
        <button type="button" className="modal-close" aria-label="বন্ধ করুন" onClick={onClose}>
          <X aria-hidden="true" />
        </button>

        <div className="modal-body" style={{ padding: 0 }}>
          <div className="mystery-stage">
            {state.stage === "intro" ? (
              <>
                <span className="mystery-gift">
                  <Gift aria-hidden="true" />
                </span>
                <h2 className="popup-title" style={{ color: "#fff" }}>
                  আপনার জন্য একটি উপহার লুকানো আছে
                </h2>
                <p className="text-muted" style={{ maxWidth: "34ch" }}>
                  নাম ও মোবাইল নম্বর দিন — গিফট বক্স খুলে কুপন কোড দেখুন।
                </p>
                <form onSubmit={claim} className="stack stack-sm w-full" style={{ maxWidth: 320 }}>
                  <input
                    className="input"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="আপনার নাম"
                    autoComplete="name"
                    aria-label="আপনার নাম"
                  />
                  <input
                    className="input"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    placeholder="01XXXXXXXXX"
                    inputMode="numeric"
                    autoComplete="tel"
                    aria-label="মোবাইল নম্বর"
                    required
                  />
                  {error ? (
                    <p className="error-text" style={{ color: "#ffd7d2" }}>
                      {error}
                    </p>
                  ) : null}
                  <button type="submit" className="btn btn-block" disabled={submitting}>
                    {submitting ? "খোলা হচ্ছে…" : "গিফট বক্স খুলুন"}
                  </button>
                </form>
              </>
            ) : (
              <div className="mystery-revealed stack stack-sm" style={{ alignItems: "center" }}>
                <p className="eyebrow">অভিনন্দন</p>
                <h2 className="popup-title" style={{ color: "#fff" }}>
                  আপনার কুপন প্রস্তুত
                </h2>
                <div className="coupon-code-box">
                  <span>{state.code}</span>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline"
                    onClick={() => {
                      void navigator.clipboard
                        .writeText(state.code)
                        .then(() => toast("কোড কপি হয়েছে", "success"))
                        .catch(() => toast("কপি করা যায়নি — কোডটি লিখে রাখুন", "error"));
                    }}
                    aria-label="কুপন কোড কপি করুন"
                  >
                    <Copy aria-hidden="true" />
                    কপি
                  </button>
                </div>
                <p className="text-muted text-small" style={{ maxWidth: "32ch" }}>
                  মেয়াদ ৭ দিন · ন্যূনতম অর্ডার {formatTaka(state.minSubtotal)} · চেকআউটে কোডটি বসালে
                  ছাড় প্রযোজ্য হবে
                </p>
                <p className="text-muted text-xs mb-0">
                  এই নম্বরে ({toBanglaDigits("1")} বার) কুপন দেওয়া যায় — পরবর্তীবার একই কোড দেখাবে।
                </p>
                <button type="button" className="btn mt-2" onClick={onClose}>
                  কেনাকাটা শুরু করি
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
