"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { X } from "lucide-react";
import type { ActivePopupResponse } from "./popup-layer";
import { useToast } from "./toast";
import { normalizeBdPhone } from "@/lib/orders/validation-client";

type Campaign = Extract<ActivePopupResponse, { kind: "campaign" }>["campaign"];

/** স্টোর-ওয়াইড / পেজ-স্কোপ ক্যাম্পেইন পপআপ — ঐচ্ছিক নাম+মোবাইল লিড ফর্মসহ */
export function PromoPopup({
  campaign,
  onClose,
  onImpression,
}: {
  campaign: Campaign;
  onClose: () => void;
  onImpression: () => void;
}) {
  const toast = useToast();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const impressed = useRef(false);

  useEffect(() => {
    if (!impressed.current) {
      impressed.current = true;
      onImpression();
    }
    dialogRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, onImpression]);

  const submitLead = async (event: React.FormEvent) => {
    event.preventDefault();
    const normalized = normalizeBdPhone(phone);
    if (!normalized) {
      setError("সঠিক বাংলাদেশি মোবাইল নম্বর দিন (যেমন 01712345678)");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          phone: normalized,
          source: "popup",
          popupLabel: campaign.name,
          smsConsent: consent,
        }),
      });
      const payload = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !payload.ok) {
        setError(payload.error ?? "লিড সংরক্ষণ করা যায়নি। আবার চেষ্টা করুন।");
        return;
      }
      setDone(true);
      toast("ধন্যবাদ! আমরা শীঘ্রই যোগাযোগ করব।", "success");
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
        aria-label={campaign.title}
        ref={dialogRef}
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
      >
        <button type="button" className="modal-close" aria-label="বন্ধ করুন" onClick={onClose}>
          <X aria-hidden="true" />
        </button>

        {campaign.imageUrl ? (
          <div className="modal-media">
            <Image src={campaign.imageUrl} alt="" width={460} height={220} />
          </div>
        ) : null}

        <div className="modal-body">
          {done ? (
            <div className="stack stack-sm text-center">
              <p className="popup-title">ধন্যবাদ</p>
              <p className="text-muted mb-0">আপনার তথ্য সংরক্ষিত হয়েছে।</p>
              <button type="button" className="btn btn-emerald mt-3" onClick={onClose}>
                ঠিক আছে
              </button>
            </div>
          ) : (
            <>
              <h2 className="popup-title">{campaign.title}</h2>
              {campaign.body ? <p className="text-muted">{campaign.body}</p> : null}

              {campaign.leadFormEnabled ? (
                <form onSubmit={submitLead} className="stack stack-sm mt-3">
                  <label className="field mb-0">
                    <span className="label">{campaign.leadFormLabel ?? "আপনার নাম"}</span>
                    <input
                      className="input"
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      placeholder="নাম লিখুন"
                      autoComplete="name"
                    />
                  </label>
                  <label className="field mb-0">
                    <span className="label">
                      মোবাইল নম্বর <span className="required-mark">*</span>
                    </span>
                    <input
                      className="input"
                      value={phone}
                      onChange={(event) => setPhone(event.target.value)}
                      placeholder="01XXXXXXXXX"
                      inputMode="numeric"
                      autoComplete="tel"
                      required
                    />
                  </label>
                  <label className="checkbox">
                    <input
                      type="checkbox"
                      checked={consent}
                      onChange={(event) => setConsent(event.target.checked)}
                    />
                    <span className="text-small text-muted">
                      আমাকে SMS/কলে অফার জানানো যাবে (ঐচ্ছিক)
                    </span>
                  </label>
                  {error ? <p className="error-text">{error}</p> : null}
                  <button type="submit" className="btn btn-block" disabled={submitting}>
                    {submitting ? "পাঠানো হচ্ছে…" : "অফারটি নিশ্চিত করুন"}
                  </button>
                </form>
              ) : null}

              {campaign.ctaUrl ? (
                <a
                  className={`btn btn-block ${campaign.leadFormEnabled ? "btn-outline mt-2" : "mt-2"}`}
                  href={campaign.ctaUrl}
                  onClick={onClose}
                >
                  {campaign.ctaLabel ?? "দেখুন"}
                </a>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
