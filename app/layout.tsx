import type { Metadata, Viewport } from "next";
import "@fontsource/hind-siliguri/400.css";
import "@fontsource/hind-siliguri/500.css";
import "@fontsource/hind-siliguri/700.css";
import "@fontsource/hind-siliguri/600.css";
import "@fontsource/playfair-display/600.css";
import "@fontsource/playfair-display/700.css";
import "@fontsource/jetbrains-mono/400.css";
import "@fontsource/jetbrains-mono/500.css";
import "./globals.css";
import { DEFAULT_BRAND, SITE_LOCALE } from "@/lib/config";
import { getBrand } from "@/lib/store/repository";

function resolveSiteUrl(candidate: string): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL || candidate || DEFAULT_BRAND.siteUrl;
  try {
    return new URL(raw).toString().replace(/\/$/, "");
  } catch {
    return DEFAULT_BRAND.siteUrl;
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const brand = await getBrand();
  const siteUrl = resolveSiteUrl(brand.siteUrl);
  const customFavicon = (brand.faviconUrl ?? "").trim();

  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: `${brand.name} — ${brand.tagline}`,
      template: `%s | ${brand.name}`,
    },
    description: brand.description,
    applicationName: brand.name,
    alternates: { canonical: "/" },
    openGraph: {
      type: "website",
      locale: SITE_LOCALE.replace("-", "_"),
      siteName: brand.name,
      title: `${brand.name} — ${brand.tagline}`,
      description: brand.description,
      url: siteUrl,
      images: [
        brand.logoUrl
          ? { url: brand.logoUrl, alt: brand.name }
          : { url: "/brand/og.svg", width: 1200, height: 630, alt: brand.name },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${brand.name} — ${brand.tagline}`,
      description: brand.description,
    },
    robots: { index: true, follow: true },
    icons: customFavicon
      ? {
          icon: [{ url: customFavicon }],
          shortcut: [{ url: customFavicon }],
          apple: [{ url: customFavicon }],
        }
      : {
          icon: [
            { url: "/brand/favicon.ico", sizes: "48x48" },
            { url: "/brand/icon.svg", type: "image/svg+xml" },
          ],
          apple: [{ url: "/brand/apple-touch-icon.png", sizes: "180x180" }],
        },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#073A2E",
  colorScheme: "light",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="bn">
      <body>{children}</body>
    </html>
  );
}
