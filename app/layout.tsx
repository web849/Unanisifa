import type { Metadata, Viewport } from "next";
import "@fontsource/hind-siliguri/400.css";
import "@fontsource/hind-siliguri/500.css";
import "@fontsource/hind-siliguri/600.css";
import "@fontsource/hind-siliguri/700.css";
import "@fontsource/playfair-display/600.css";
import "@fontsource/playfair-display/700.css";
import "@fontsource/jetbrains-mono/400.css";
import "@fontsource/jetbrains-mono/500.css";
import "./globals.css";
import { DEFAULT_BRAND, SITE_LOCALE } from "@/lib/config";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || DEFAULT_BRAND.siteUrl;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${DEFAULT_BRAND.name} — ${DEFAULT_BRAND.tagline}`,
    template: `%s | ${DEFAULT_BRAND.name}`,
  },
  description: DEFAULT_BRAND.description,
  applicationName: DEFAULT_BRAND.name,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: SITE_LOCALE.replace("-", "_"),
    siteName: DEFAULT_BRAND.name,
    title: `${DEFAULT_BRAND.name} — ${DEFAULT_BRAND.tagline}`,
    description: DEFAULT_BRAND.description,
    url: siteUrl,
    images: [{ url: "/brand/og.svg", width: 1200, height: 630, alt: DEFAULT_BRAND.name }],
  },
  twitter: {
    card: "summary_large_image",
    title: `${DEFAULT_BRAND.name} — ${DEFAULT_BRAND.tagline}`,
    description: DEFAULT_BRAND.description,
  },
  robots: { index: true, follow: true },
  icons: {
    icon: [
      { url: "/brand/favicon.ico", sizes: "48x48" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: [{ url: "/brand/apple-touch-icon.png", sizes: "180x180" }],
  },
};

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
