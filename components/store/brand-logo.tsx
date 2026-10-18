import Link from "next/link";
import { getBrand, isCatalogDemoMode } from "@/lib/store/repository";
import { BUILT_IN_LOGO, BUILT_IN_LOGO_LIGHT } from "@/lib/config";
import { cx } from "@/lib/utils";

type Props = {
  /** ডার্ক ব্যাকগ্রাউন্ডে (হেডার-অন-ডার্ক / ফুটার) হালকা ভ্যারিয়েন্ট */
  variant?: "dark" | "light";
  /** ইনলাইন SVG মার্ক + HTML টেক্সট (ফন্ট গ্যারান্টি) নাকি ইমেজ ফাইল */
  inline?: boolean;
  className?: string;
  href?: string;
};

/**
 * ব্র্যান্ড লোগো। অ্যাডমিন → Settings → Branding থেকে আপলোড করা লোগো থাকলে
 * সেটিই দেখায়; নাহলে বিল্ট-ইন টেম্পোরারি লোগো (এমারেল্ড শিল্ড + গোল্ড লিফ)।
 */
export async function BrandLogo({ variant = "dark", inline = true, className, href = "/" }: Props) {
  const brand = await getBrand();
  const uploaded = variant === "light" ? brand.logoLightUrl || brand.logoUrl : brand.logoUrl;
  const src = uploaded || (variant === "light" ? BUILT_IN_LOGO_LIGHT : BUILT_IN_LOGO);

  const label = `${brand.name} — হোম`;

  if (!inline || uploaded) {
    return (
      <Link href={href} className={cx("header-brand", className)} aria-label={label}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={brand.name} width={134} height={32} />
      </Link>
    );
  }

  return (
    <Link href={href} className={cx("header-brand", className)} aria-label={label}>
      <svg
        viewBox="0 0 64 64"
        width="36"
        height="36"
        aria-hidden="true"
        focusable="false"
        style={{ height: 36, width: 36 }}
      >
        <defs>
          <linearGradient id={`bs-${variant}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={variant === "light" ? "#0E7A61" : "#073A2E"} />
            <stop offset="100%" stopColor="#0B5D4A" />
          </linearGradient>
          <linearGradient id={`bl-${variant}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#C9A227" />
            <stop offset="100%" stopColor="#B38F1F" />
          </linearGradient>
        </defs>
        <path
          d="M32 2.5 59.5 12.8V33.4C59.5 48.2 47.7 57.6 32 62 16.3 57.6 4.5 48.2 4.5 33.4V12.8Z"
          fill={`url(#bs-${variant})`}
        />
        <path
          d="M32 5.6 56.4 14.7V33.3C56.4 46.3 46 54.7 32 58.8 18 54.7 7.6 46.3 7.6 33.3V14.7Z"
          fill="none"
          stroke="#C9A227"
          strokeOpacity="0.45"
          strokeWidth="1.2"
        />
        <path
          d="M32 15.5C40.8 20.6 45.4 28.4 43.2 37.6 41.8 43.4 37.4 47.4 32 49.6 26.6 47.4 22.2 43.4 20.8 37.6 18.6 28.4 23.2 20.6 32 15.5Z"
          fill={`url(#bl-${variant})`}
        />
        <path
          d="M32 18.4V47.2"
          stroke="#073A2E"
          strokeOpacity="0.5"
          strokeWidth="1.5"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M32 25.6 38.6 22.2M32 31.4 39.8 27.6M32 37.2 39.4 33.6M32 25.6 25.4 22.2M32 31.4 24.2 27.6M32 37.2 24.6 33.6"
          stroke="#073A2E"
          strokeOpacity="0.36"
          strokeWidth="1.2"
          strokeLinecap="round"
          fill="none"
        />
      </svg>
      <span className="header-brand-text">
        <span className="header-brand-name" style={variant === "light" ? { color: "#fff" } : undefined}>
          {brand.name}
        </span>
        <span className="header-brand-tag">{brand.tagline}</span>
      </span>
    </Link>
  );
}

export function BrandLogoSyncFallback() {
  return isCatalogDemoMode();
}
