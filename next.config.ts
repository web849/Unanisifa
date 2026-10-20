import type { NextConfig } from "next";

/**
 * ইমেজ অপ্টিমাইজেশন ও ক্যাশিং — স্পেক সেকশন ৭ণ অনুযায়ী।
 * remotePatterns-এ ওয়াইল্ডকার্ড https রাখা হয়েছে কারণ অ্যাডমিন "URL পেস্ট করুন"
 * অপশন দিয়ে যেকোনো পাবলিক ইমেজ লিংক বসাতে পারেন (R2 env না থাকলে)।
 */
const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  eslint: { ignoreDuringBuilds: false },
  typescript: { ignoreBuildErrors: false },
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60 * 60 * 24 * 30,
    deviceSizes: [360, 420, 640, 768, 1024, 1200],
    imageSizes: [64, 96, 128, 256, 384],
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    remotePatterns: [
      { protocol: "https", hostname: "**" },
      { protocol: "http", hostname: "localhost" },
    ],
  },
  async headers() {
    const isVercel = Boolean(process.env.VERCEL);
    const cspDirectives = [
      "default-src 'self'",
      "base-uri 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "media-src 'self' https: blob:",
      "connect-src 'self' https://www.facebook.com https://*.facebook.com https://*.fb.com https://*.google-analytics.com",
      "frame-src 'self' https://www.youtube-nocookie.com https://www.youtube.com",
      ...(isVercel ? ["frame-ancestors 'self'"] : []),
      "form-action 'self'",
      "object-src 'none'",
      ...(isVercel ? ["upgrade-insecure-requests"] : []),
    ];

    const securityHeaders = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      {
        key: "Permissions-Policy",
        value: "camera=(), microphone=(), geolocation=(self), browsing-topics=()",
      },
      { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
      ...(isVercel ? [{ key: "X-Frame-Options", value: "SAMEORIGIN" }] : []),
      {
        key: "Content-Security-Policy",
        value: cspDirectives.join("; "),
      },
    ];

    const noStore = [
      ...securityHeaders,
      { key: "Cache-Control", value: "no-store, max-age=0, must-revalidate" },
      { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
    ];

    return [
      {
        // স্টোরফ্রন্ট হোম ও তালিকা — s-maxage 60 + SWR 300
        source: "/",
        headers: [
          ...securityHeaders,
          {
            key: "Cache-Control",
            value: "public, s-maxage=60, stale-while-revalidate=300",
          },
        ],
      },
      {
        source: "/products",
        headers: [
          ...securityHeaders,
          {
            key: "Cache-Control",
            value: "public, s-maxage=60, stale-while-revalidate=300",
          },
        ],
      },
      {
        // পণ্য-বিবরণ ও ল্যান্ডিং পেজ — s-maxage 120 + SWR 600
        source: "/products/:slug",
        headers: [
          ...securityHeaders,
          {
            key: "Cache-Control",
            value: "public, s-maxage=120, stale-while-revalidate=600",
          },
        ],
      },
      {
        source: "/offer/:slug",
        headers: [
          ...securityHeaders,
          {
            key: "Cache-Control",
            value: "public, s-maxage=120, stale-while-revalidate=600",
          },
        ],
      },
      {
        // ইমেজ অপ্টিমাইজার এন্ডপয়েন্ট (কোয়েরি প্যারামিটার-ভিত্তিক, পাথ নয়)
        source: "/_next/image",
        headers: [
          ...securityHeaders,
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      { source: "/admin", headers: noStore },
      { source: "/admin/:path*", headers: noStore },
      { source: "/api/((?!media/).*)", headers: noStore },
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      {
        source: "/api/media/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
          {
            key: "Content-Security-Policy",
            value: "default-src 'none'; img-src data:; style-src 'unsafe-inline'; sandbox",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
