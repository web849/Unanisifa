"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { BannerRow } from "@/lib/store/repository";

const AUTOPLAY_MS = 4500;

/**
 * ইমেজ-ওনলি ব্যানার ক্যারোসেল — সর্বোচ্চ ৫টি active ব্যানার,
 * ৪.৫ সেকেন্ড অটোপ্লে, সোয়াইপ, ডটস, ইন্টারঅ্যাকশনে পজ।
 */
export function BannerCarousel({ banners }: { banners: BannerRow[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchX = useRef<number | null>(null);
  const count = banners.length;

  const go = useCallback(
    (next: number) => {
      if (count === 0) return;
      setIndex(((next % count) + count) % count);
    },
    [count],
  );

  useEffect(() => {
    if (paused || count <= 1) return;
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % count);
    }, AUTOPLAY_MS);
    return () => window.clearInterval(timer);
  }, [paused, count]);

  if (count === 0) return null;

  return (
    <div
      className="banner-carousel"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      onTouchStart={(event) => {
        touchX.current = event.touches[0]?.clientX ?? null;
        setPaused(true);
      }}
      onTouchEnd={(event) => {
        const start = touchX.current;
        const end = event.changedTouches[0]?.clientX ?? null;
        if (start != null && end != null) {
          const delta = end - start;
          if (Math.abs(delta) > 40) go(index + (delta < 0 ? 1 : -1));
        }
        touchX.current = null;
      }}
      aria-roledescription="ক্যারোসেল"
      aria-label="চলমান অফার"
    >
      <div className="banner-viewport">
        <div
          className="banner-track"
          style={{ transform: `translateX(-${index * 100}%)` }}
        >
          {banners.map((banner, i) => (
            <div className="banner-slide" key={banner.id} aria-hidden={i !== index}>
              {banner.linkUrl ? (
                <a href={banner.linkUrl} tabIndex={i === index ? 0 : -1}>
                  <Image
                    src={banner.imageUrl}
                    alt={banner.altText || banner.title}
                    fill
                    sizes="(max-width: 900px) 100vw, 1160px"
                    priority={i === 0}
                  />
                </a>
              ) : (
                <Image
                  src={banner.imageUrl}
                  alt={banner.altText || banner.title}
                  fill
                  sizes="(max-width: 900px) 100vw, 1160px"
                  priority={i === 0}
                />
              )}
            </div>
          ))}
        </div>

        <button
          type="button"
          className="banner-arrow banner-arrow-prev"
          aria-label="আগের ব্যানার"
          onClick={() => go(index - 1)}
        >
          <ChevronLeft aria-hidden="true" />
        </button>
        <button
          type="button"
          className="banner-arrow banner-arrow-next"
          aria-label="পরের ব্যানার"
          onClick={() => go(index + 1)}
        >
          <ChevronRight aria-hidden="true" />
        </button>

        <div className="banner-dots">
          {banners.map((banner, i) => (
            <button
              key={banner.id}
              type="button"
              className="banner-dot"
              aria-current={i === index}
              aria-label={`ব্যানার ${i + 1}`}
              onClick={() => go(i)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
