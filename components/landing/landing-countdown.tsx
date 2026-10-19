"use client";

import { useEffect, useState } from "react";
import { toBanglaDigits } from "@/lib/utils";

/** কাউন্টডাউন — শেষ হলে সত্যিকারের "সময় শেষ" অবস্থা দেখায় (ভুয়া রিসেট নয়) */
export function LandingCountdown({ endsAt, title }: { endsAt: string | null; title: string }) {
  const target = endsAt ? new Date(endsAt).getTime() : null;
  const [remaining, setRemaining] = useState<number | null>(target ? target - Date.now() : null);

  useEffect(() => {
    if (!target) return;
    const tick = () => setRemaining(target - Date.now());
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [target]);

  if (!target) return null;

  const expired = remaining !== null && remaining <= 0;
  const totalSeconds = Math.max(0, Math.floor((remaining ?? 0) / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return (
    <div className="countdown" role="timer" aria-live="polite">
      <p className="lp-heading" style={{ marginBottom: "0.5rem" }}>
        {title || "অফার শেষ হতে বাকি"}
      </p>
      {expired ? (
        <p className="mb-0">এই অফারের সময় শেষ হয়েছে।</p>
      ) : (
        <p className="countdown-digits mb-0">
          <span>{toBanglaDigits(String(hours).padStart(2, "0"))}</span> ঘণ্টা{" "}
          <span>{toBanglaDigits(String(minutes).padStart(2, "0"))}</span> মিনিট{" "}
          <span>{toBanglaDigits(String(seconds).padStart(2, "0"))}</span> সেকেন্ড
        </p>
      )}
    </div>
  );
}
