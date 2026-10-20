import Link from "next/link";
import { getBrand, isCatalogDemoMode } from "@/lib/store/repository";
import { BrandMark } from "@/components/brand-mark";
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
 * ব্র্যান্ড লোগো। অ্যাডমিন → Logo & Branding / Settings থেকে আপলোড করা লোগো থাকলে
 * সেটিই দেখায়; নাহলে বিল্ট-ইন টেম্পোরারি লোগো (এমারেল্ড শিল্ড + গোল্ড লিফ)।
 */
export async function BrandLogo({ variant = "dark", inline = true, className, href = "/" }: Props) {
  const brand = await getBrand();
  const label = `${brand.name} — হোম`;

  return (
    <Link href={href} className={cx("header-brand", className)} aria-label={label}>
      <BrandMark brand={brand} variant={variant} inline={inline} />
    </Link>
  );
}

export function BrandLogoSyncFallback() {
  return isCatalogDemoMode();
}
