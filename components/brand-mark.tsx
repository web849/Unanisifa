import { useId } from "react";
import type { BrandSettings } from "@/lib/config";
import { resolveBrandLogo } from "@/lib/brand-logo";
import { cx } from "@/lib/utils";

type BrandMarkProps = {
  brand: Pick<
    BrandSettings,
    | "name"
    | "tagline"
    | "logoUrl"
    | "logoLightUrl"
    | "logoHeight"
    | "logoShowText"
    | "darkLogoMode"
  >;
  /** `dark` = হালকা ব্যাকগ্রাউন্ডে গাঢ় লোগো (হেডার), `light` = ডার্ক ব্যাকগ্রাউন্ডে হালকা লোগো (ফুটার/অ্যাডমিন) */
  variant?: "dark" | "light";
  /** ইনলাইন SVG শিল্ড + টেক্সট ব্যবহার করবে কি না (ডিফল্ট লোগোর ক্ষেত্রে) */
  inline?: boolean;
  /** জোরপূর্বক উচ্চতা (যেমন ছোট অ্যাডমিন সাইডবার বা ল্যান্ডিং বার) */
  heightOverride?: number;
  /** ট্যাগলাইন দেখানো হবে কি না */
  hideTagline?: boolean;
};

/**
 * সার্ভার ও ক্লায়েন্ট — উভয় কম্পোনেন্ট থেকে নিরাপদে ব্যবহারযোগ্য ব্র্যান্ড লোগো রেন্ডারার।
 * কোনো DB ইমপোর্ট নেই, তাই স্টোর হেডার, ফুটার, ল্যান্ডিং পেজ এবং অ্যাডমিনের লাইভ প্রিভিউ
 * হুবহু একই আউটপুট দেখায়।
 */
export function BrandMark({
  brand,
  variant = "dark",
  inline = true,
  heightOverride,
  hideTagline = false,
}: BrandMarkProps) {
  const uid = useId().replace(/:/g, "");
  const resolved = resolveBrandLogo(brand, variant);
  const height = heightOverride ?? resolved.heightPx;

  if (resolved.isCustom || !inline) {
    const imgStyle: React.CSSProperties = {
      height: `${height}px`,
      width: "auto",
    };
    const imgClass = cx(
      "brand-logo-img",
      resolved.darkTreatment === "white" && "brand-logo-img-white",
    );

    const imageNode = (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={resolved.src}
        alt={resolved.showText ? "" : brand.name}
        aria-hidden={resolved.showText ? true : undefined}
        className={imgClass}
        style={imgStyle}
      />
    );

    return (
      <>
        {resolved.darkTreatment === "pill" ? (
          <span className="brand-logo-pill">{imageNode}</span>
        ) : (
          imageNode
        )}
        {resolved.isCustom && resolved.showText ? (
          <span className="header-brand-text">
            <span
              className="header-brand-name"
              style={variant === "light" ? { color: "#fff" } : undefined}
            >
              {brand.name}
            </span>
            {!hideTagline && brand.tagline ? (
              <span
                className="header-brand-tag"
                style={variant === "light" ? { color: "rgba(255, 255, 255, 0.72)" } : undefined}
              >
                {brand.tagline}
              </span>
            ) : null}
          </span>
        ) : null}
      </>
    );
  }

  return (
    <>
      <svg
        viewBox="0 0 64 64"
        width={height}
        height={height}
        aria-hidden="true"
        focusable="false"
        style={{ height, width: height }}
      >
        <defs>
          <linearGradient id={`bs-${uid}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={variant === "light" ? "#0E7A61" : "#073A2E"} />
            <stop offset="100%" stopColor="#0B5D4A" />
          </linearGradient>
          <linearGradient id={`bl-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#C9A227" />
            <stop offset="100%" stopColor="#B38F1F" />
          </linearGradient>
        </defs>
        <path
          d="M32 2.5 59.5 12.8V33.4C59.5 48.2 47.7 57.6 32 62 16.3 57.6 4.5 48.2 4.5 33.4V12.8Z"
          fill={`url(#bs-${uid})`}
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
          fill={`url(#bl-${uid})`}
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
        {!hideTagline && brand.tagline ? (
          <span
            className="header-brand-tag"
            style={variant === "light" ? { color: "rgba(255, 255, 255, 0.72)" } : undefined}
          >
            {brand.tagline}
          </span>
        ) : null}
      </span>
    </>
  );
}
