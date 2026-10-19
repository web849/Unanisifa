"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { PromoPopup } from "./promo-popup";
import { MysteryOfferPopup } from "./mystery-offer-popup";

export type ActivePopupResponse =
  | { kind: "none" }
  | { kind: "mystery" }
  | {
      kind: "campaign";
      campaign: {
        id: number;
        title: string;
        body: string | null;
        imageUrl: string | null;
        ctaLabel: string | null;
        ctaUrl: string | null;
        leadFormEnabled: boolean;
        leadFormLabel: string | null;
        delaySeconds: number;
        frequency: string;
        name: string;
      };
    };

const NO_POPUP_PATHS = ["/checkout", "/thank-you", "/account", "/admin", "/api"];

function frequencyKey(scope: string) {
  return `us_popup_${scope}`;
}

function shouldShow(frequency: string, scope: string): boolean {
  if (typeof window === "undefined") return false;
  const today = new Date().toISOString().slice(0, 10);
  if (frequency === "once_session") {
    return window.sessionStorage.getItem(frequencyKey(scope)) !== "1";
  }
  if (frequency === "once_day") {
    return window.localStorage.getItem(frequencyKey(scope)) !== today;
  }
  return true;
}

function markShown(frequency: string, scope: string) {
  if (typeof window === "undefined") return;
  const today = new Date().toISOString().slice(0, 10);
  if (frequency === "once_session") {
    window.sessionStorage.setItem(frequencyKey(scope), "1");
  } else if (frequency === "once_day") {
    window.localStorage.setItem(frequencyKey(scope), today);
  }
}

/**
 * পপআপ অর্কেস্ট্রেটর — স্পেক ৭ঘ:
 * ১) মিস্ট্রি অফার চালু থাকলে ল্যান্ডিং/স্টোরে শুধু মিস্ট্রি
 * ২) পেজ-নিজস্ব পপআপ থাকলে জেনেরিক বন্ধ
 * ৩) checkout / thank-you / account-এ কখনো খোলে না
 * ৪) কখনো দুটো পপআপ একসাথে খোলে না
 */
export function PopupLayer() {
  const pathname = usePathname();
  const [state, setState] = useState<ActivePopupResponse>({ kind: "none" });
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let timer = 0;

    if (NO_POPUP_PATHS.some((p) => pathname.startsWith(p))) {
      setState({ kind: "none" });
      setVisible(false);
      return;
    }

    setState({ kind: "none" });
    setVisible(false);

    const load = async () => {
      try {
        const response = await fetch(`/api/popups/active?path=${encodeURIComponent(pathname)}`, {
          cache: "no-store",
        });
        if (!response.ok) return;
        const payload = (await response.json()) as ActivePopupResponse;
        if (cancelled) return;
        setState(payload);

        if (payload.kind === "campaign") {
          const scope = `campaign_${payload.campaign.id}`;
          if (!shouldShow(payload.campaign.frequency, scope)) return;
          timer = window.setTimeout(() => {
            if (cancelled) return;
            markShown(payload.campaign.frequency, scope);
            setVisible(true);
          }, Math.min(Math.max(payload.campaign.delaySeconds, 1.5), 120) * 1000);
        } else if (payload.kind === "mystery") {
          timer = window.setTimeout(() => {
            if (cancelled) return;
            setVisible(true);
          }, 2200);
        }
      } catch {
        // নেটওয়ার্ক ব্যর্থ হলে পপআপ দেখাবো না — পেজ স্বাভাবিক থাকবে
      }
    };

    void load();
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [pathname]);

  if (state.kind === "none" || !visible) return null;

  if (state.kind === "mystery") {
    return <MysteryOfferPopup onClose={() => setVisible(false)} />;
  }

  return (
    <PromoPopup
      campaign={state.campaign}
      onClose={() => setVisible(false)}
      onImpression={() => {
        void fetch("/api/popups/impression", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ campaignId: state.campaign.id }),
        }).catch(() => undefined);
      }}
    />
  );
}
