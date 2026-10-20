/**
 * ল্যান্ডিং সেকশন রেন্ডারার — সার্ভার ও বিল্ডার প্রিভিউ দুই জায়গাতেই ব্যবহৃত।
 * popup সেকশন এখানে রেন্ডার হয় না (পপআপ লেয়ার /api/popups/active থেকে নেয়)।
 * order_form app/offer/[slug]/page.tsx ও বিল্ডার প্রিভিউতে আলাদা রেন্ডার হয়।
 */

import Link from "next/link";
import {
  Award,
  BadgeCheck,
  Banknote,
  Clock,
  Heart,
  Leaf,
  Package,
  Phone,
  ShieldCheck,
  Sparkles,
  Star,
  Truck,
  type LucideIcon,
} from "lucide-react";
import type { LandingSection } from "@/lib/landing/sections";
import type { LandingProduct } from "@/lib/landing/product-types";
import { sanitizeLandingHtml } from "@/lib/landing/html";
import { applyLandingHtmlTokens } from "@/lib/landing/html-tokens";
import type { ProductReview } from "@/lib/db/schema";
import { formatTaka, toBanglaDigits } from "@/lib/utils";
import { telLink, whatsappLink, phoneDisplay } from "@/lib/contact-links";
import { MEDICAL_DISCLAIMER, type BrandSettings } from "@/lib/config";
import { LandingCountdown } from "./landing-countdown";

const ICON_MAP: Record<string, LucideIcon> = {
  Leaf,
  Banknote,
  Truck,
  ShieldCheck,
  Star,
  Clock,
  Phone,
  Heart,
  Sparkles,
  BadgeCheck,
  Package,
  Award,
};

export type LandingRenderContext = {
  product: LandingProduct | null;
  products: LandingProduct[];
  reviews: ProductReview[];
  brand: BrandSettings;
  couponCode?: string | null;
};

function stringOr(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function listOf(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value) ? (value as Array<Record<string, unknown>>) : [];
}

function idList(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => Number(item))
    .filter((item) => Number.isInteger(item) && item > 0);
}

function sectionStyle(design: LandingSection["design"]): React.CSSProperties {
  const style: React.CSSProperties & Record<string, string | number> = {};
  if (design?.paddingY) {
    style.paddingTop = design.paddingY;
    style.paddingBottom = design.paddingY;
  }
  if (design?.background) style.background = design.background;
  if (design?.textColor) style.color = design.textColor;
  if (design?.minHeight) style.minHeight = design.minHeight;
  if (design?.align) style.textAlign = design.align;
  if (design?.maxWidth) style["--lp-max"] = `${design.maxWidth}px`;
  return style;
}

function sectionClass(section: LandingSection): string {
  const classes = ["lp-section", `lp-section-type-${section.type}`];
  if (section.design?.alt) classes.push("lp-section-alt");
  if (section.design?.shape === "wave") classes.push("lp-shape-wave");
  if (section.design?.shape === "arch") classes.push("lp-shape-arch");
  return classes.join(" ");
}

function ctaHref(value: unknown, fallback = "#order_form"): string {
  const target = stringOr(value, fallback);
  if (/^https?:\/\//i.test(target) || target.startsWith("/") || target.startsWith("#")) return target;
  return `#${target}`;
}

function youtubeIdFrom(value: string): string {
  const raw = value.trim();
  if (!raw) return "";
  if (/^[a-zA-Z0-9_-]{6,20}$/.test(raw)) return raw;
  try {
    const url = new URL(raw);
    if (url.hostname === "youtu.be") return url.pathname.replace("/", "").slice(0, 20);
    const fromQuery = url.searchParams.get("v");
    if (fromQuery) return fromQuery;
    const match = url.pathname.match(/\/(?:embed|shorts|live)\/([^/?#]+)/);
    if (match?.[1]) return match[1];
  } catch {
    return "";
  }
  return "";
}

function sectionProduct(settings: Record<string, unknown>, context: LandingRenderContext): LandingProduct | null {
  const requestedId = Number(settings.productId);
  if (Number.isInteger(requestedId) && requestedId > 0) {
    const match = context.products.find((product) => product.id === requestedId);
    if (match) return match;
  }
  return context.product;
}

function productCards(settings: Record<string, unknown>, context: LandingRenderContext): LandingProduct[] {
  const ids = idList(settings.productIds);
  if (ids.length > 0) {
    return ids
      .map((id) => context.products.find((product) => product.id === id))
      .filter((product): product is LandingProduct => Boolean(product));
  }
  return context.product ? [context.product] : [];
}

function imageUrlsFrom(settings: Record<string, unknown>): Array<{ url: string; alt: string }> {
  const result: Array<{ url: string; alt: string }> = [];
  for (const item of listOf(settings.images)) {
    const url = stringOr(item.url);
    if (url) result.push({ url, alt: stringOr(item.alt) });
  }
  const csv = stringOr(settings.imageUrls);
  if (csv) {
    for (const url of csv.split(",").map((item) => item.trim())) {
      if (url) result.push({ url, alt: "" });
    }
  }
  return result;
}

export function renderLandingSection(
  section: LandingSection,
  context: LandingRenderContext,
): React.ReactNode {
  const settings = section.settings as Record<string, unknown>;
  const key = `s-${section.id}`;
  const anchor = `lp-section-${section.id}`;

  switch (section.type) {
    case "hero": {
      const title = stringOr(settings.title, context.product?.name ?? "");
      return (
        <section className="lp-section lp-hero" id={anchor} key={key} style={sectionStyle(section.design)}>
          <div className="lp-inner">
            {stringOr(settings.eyebrow) ? <p className="eyebrow">{stringOr(settings.eyebrow)}</p> : null}
            {title ? <h1 className="lp-heading display">{title}</h1> : null}
            {stringOr(settings.subtitle) ? <p className="lp-text">{stringOr(settings.subtitle)}</p> : null}
            {stringOr(settings.imageUrl) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={stringOr(settings.imageUrl)} alt={title || "offer"} className="lp-hero-image" />
            ) : null}
            {stringOr(settings.ctaLabel) ? (
              <a className="btn btn-primary btn-lg" href={ctaHref(settings.ctaTarget)}>
                {stringOr(settings.ctaLabel)}
              </a>
            ) : null}
          </div>
        </section>
      );
    }

    case "announcement":
      return (
        <div className="announcement-bar" key={key}>
          <div className="lp-inner">
            <p className="mb-0">{stringOr(settings.body, stringOr(settings.title))}</p>
          </div>
        </div>
      );

    case "text":
      return (
        <section className={sectionClass(section)} id={anchor} key={key} style={sectionStyle(section.design)}>
          <div className="lp-inner">
            {stringOr(settings.title) ? <h2 className="lp-heading">{stringOr(settings.title)}</h2> : null}
            {stringOr(settings.body) ? (
              <p className="lp-text" style={{ whiteSpace: "pre-line" }}>
                {stringOr(settings.body)}
              </p>
            ) : null}
          </div>
        </section>
      );

    case "split":
      return (
        <section className={sectionClass(section)} id={anchor} key={key} style={sectionStyle(section.design)}>
          <div className="lp-inner split-grid">
            {stringOr(settings.imageUrl) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={stringOr(settings.imageUrl)} alt={stringOr(settings.title)} className="split-image" />
            ) : null}
            <div>
              {stringOr(settings.title) ? <h2 className="lp-heading">{stringOr(settings.title)}</h2> : null}
              {stringOr(settings.body) ? (
                <p className="lp-text" style={{ whiteSpace: "pre-line" }}>
                  {stringOr(settings.body)}
                </p>
              ) : null}
            </div>
          </div>
        </section>
      );

    case "images": {
      const images = imageUrlsFrom(settings);
      if (images.length === 0) return null;
      return (
        <section className={sectionClass(section)} id={anchor} key={key} style={sectionStyle(section.design)}>
          <div className="lp-inner">
            {stringOr(settings.title) ? <h2 className="lp-heading">{stringOr(settings.title)}</h2> : null}
            <div className="image-grid">
              {images.map((image, index) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={`${image.url}-${index}`}
                  src={image.url}
                  alt={image.alt || `${stringOr(settings.title, "ছবি")} ${index + 1}`}
                />
              ))}
            </div>
          </div>
        </section>
      );
    }

    case "video": {
      const youtubeId = youtubeIdFrom(stringOr(settings.youtubeId));
      if (!youtubeId) return null;
      return (
        <section className={sectionClass(section)} id={anchor} key={key} style={sectionStyle(section.design)}>
          <div className="lp-inner">
            {stringOr(settings.title) ? <h2 className="lp-heading">{stringOr(settings.title)}</h2> : null}
            <div className="video-frame">
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(youtubeId)}`}
                title={stringOr(settings.title, "ভিডিও")}
                allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                loading="lazy"
              />
            </div>
          </div>
        </section>
      );
    }

    case "html": {
      /* {{product_name}} জাতীয় টোকেন নির্বাচিত/প্রধান পণ্য দিয়ে পূরণ হয়,
         তারপর আগের মতোই স্যানিটাইজ — script/form কখনো যাবে না। */
      const html = sanitizeLandingHtml(
        applyLandingHtmlTokens(stringOr(settings.html), {
          product: sectionProduct(settings, context),
          brand: context.brand,
          couponCode: context.couponCode,
        }),
      );
      if (!html) return null;
      return (
        <section className={sectionClass(section)} id={anchor} key={key} style={sectionStyle(section.design)}>
          <div className="lp-inner">
            <div className="lp-html" dangerouslySetInnerHTML={{ __html: html }} />
          </div>
        </section>
      );
    }

    case "products": {
      const chosen = productCards(settings, context);
      if (chosen.length === 0) return null;
      return (
        <section className={sectionClass(section)} id={anchor} key={key} style={sectionStyle(section.design)}>
          <div className="lp-inner">
            {stringOr(settings.title) ? <h2 className="lp-heading">{stringOr(settings.title)}</h2> : null}
            <div className="lp-product-grid">
              {chosen.map((item) => {
                const isMain = context.product?.id === item.id;
                return (
                  <article className="lp-product-card" key={item.id}>
                    {item.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.image} alt={item.name} className="lp-product-image" />
                    ) : null}
                    <div className="lp-product-body">
                      <h3 className="lp-product-name">{item.name}</h3>
                      {item.packageSize ? <span className="lp-product-size">{item.packageSize}</span> : null}
                      <p className="lp-product-price">
                        <strong>{formatTaka(item.price)}</strong>
                        {item.compareAtPrice && item.compareAtPrice > item.price ? (
                          <s className="text-muted"> {formatTaka(item.compareAtPrice)}</s>
                        ) : null}
                      </p>
                      {item.shortDescription ? <p className="lp-text text-small">{item.shortDescription}</p> : null}
                      {isMain ? (
                        <a className="btn btn-primary btn-block" href="#order_form">
                          অর্ডার করুন
                        </a>
                      ) : (
                        <Link className="btn btn-outline btn-block" href={`/products/${item.slug}`}>
                          বিস্তারিত দেখুন
                        </Link>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>
      );
    }

    case "cta":
      return (
        <section className={sectionClass(section)} id={anchor} key={key} style={sectionStyle(section.design)}>
          <div className="lp-inner">
            <div className="lp-cta">
              <div>
                {stringOr(settings.title) ? <h2 className="lp-heading">{stringOr(settings.title)}</h2> : null}
                {stringOr(settings.body) ? <p className="lp-text">{stringOr(settings.body)}</p> : null}
              </div>
              {stringOr(settings.ctaLabel) ? (
                <a className="btn btn-gold btn-lg" href={ctaHref(settings.ctaUrl)}>
                  {stringOr(settings.ctaLabel)}
                </a>
              ) : null}
            </div>
          </div>
        </section>
      );

    case "features": {
      const items = listOf(settings.items);
      if (items.length === 0) return null;
      return (
        <section className={sectionClass(section)} id={anchor} key={key} style={sectionStyle(section.design)}>
          <div className="lp-inner">
            {stringOr(settings.title) ? <h2 className="lp-heading">{stringOr(settings.title)}</h2> : null}
            <div className="feature-grid">
              {items.map((item, index) => {
                const Icon = ICON_MAP[stringOr(item.icon)] ?? Leaf;
                return (
                  <div className="card feature-card" key={`${stringOr(item.title)}-${index}`}>
                    <Icon aria-hidden="true" />
                    <h3>{stringOr(item.title)}</h3>
                    <p className="mb-0 text-small">{stringOr(item.text)}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      );
    }

    case "steps": {
      const items = listOf(settings.items);
      if (items.length === 0) return null;
      return (
        <section className={sectionClass(section)} id={anchor} key={key} style={sectionStyle(section.design)}>
          <div className="lp-inner">
            <h2 className="lp-heading">{stringOr(settings.title, "কীভাবে অর্ডার করবেন")}</h2>
            <ol className="steps-list">
              {items.map((item, index) => (
                <li key={index}>
                  <strong>{stringOr(item.title)}</strong>
                  {stringOr(item.text) ? <span> — {stringOr(item.text)}</span> : null}
                </li>
              ))}
            </ol>
          </div>
        </section>
      );
    }

    case "faq": {
      const items = listOf(settings.items);
      if (items.length === 0) return null;
      return (
        <section className={sectionClass(section)} id={anchor} key={key} style={sectionStyle(section.design)}>
          <div className="lp-inner">
            <h2 className="lp-heading">{stringOr(settings.title, "সাধারণ জিজ্ঞাসা")}</h2>
            <div className="faq-list">
              {items.map((item, index) => (
                <details className="card" key={index}>
                  <summary>{stringOr(item.q, stringOr(item.title))}</summary>
                  <p className="mb-0 text-small">{stringOr(item.a, stringOr(item.text))}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      );
    }

    case "testimonials": {
      const items = listOf(settings.items);
      if (items.length === 0) return null;
      return (
        <section className={sectionClass(section)} id={anchor} key={key} style={sectionStyle(section.design)}>
          <div className="lp-inner">
            <h2 className="lp-heading">{stringOr(settings.title, "গ্রাহকের মতামত")}</h2>
            <div className="testimonial-grid">
              {items.map((item, index) => (
                <figure className="card" key={index}>
                  <blockquote className="mb-0">{stringOr(item.text, stringOr(item.quote))}</blockquote>
                  <figcaption className="text-small text-muted">— {stringOr(item.name, "গ্রাহক")}</figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>
      );
    }

    case "reviews": {
      const reviews = context.reviews;
      if (reviews.length === 0) return null;
      return (
        <section className={sectionClass(section)} id={anchor} key={key} style={sectionStyle(section.design)}>
          <div className="lp-inner">
            <h2 className="lp-heading">{stringOr(settings.title, "যাচাইকৃত রিভিউ")}</h2>
            <div className="testimonial-grid">
              {reviews.slice(0, 6).map((review) => (
                <figure className="card" key={review.id}>
                  <p className="review-stars" aria-label={`${toBanglaDigits(review.rating)} তারকা`}>
                    {Array.from({ length: review.rating }, (_, starIndex) => (
                      <Star key={starIndex} aria-hidden="true" fill="currentColor" />
                    ))}
                  </p>
                  {review.comment ? <blockquote className="mb-0">{review.comment}</blockquote> : null}
                  <figcaption className="text-small text-muted">— {review.customerName}</figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>
      );
    }

    case "countdown":
      return (
        <section className={sectionClass(section)} id={anchor} key={key} style={sectionStyle(section.design)}>
          <div className="lp-inner" style={{ textAlign: "center" }}>
            <LandingCountdown
              endsAt={typeof settings.endsAt === "string" ? settings.endsAt : null}
              title={stringOr(settings.title)}
            />
          </div>
        </section>
      );

    case "guarantee":
      return (
        <section className={sectionClass(section)} id={anchor} key={key} style={sectionStyle(section.design)}>
          <div className="lp-inner">
            <div className="card" style={{ textAlign: "center", maxWidth: 640, margin: "0 auto" }}>
              <ShieldCheck aria-hidden="true" style={{ width: 36, height: 36, color: "var(--lp-accent)" }} />
              <h2 className="lp-heading">{stringOr(settings.title, "আমাদের প্রতিশ্রুতি")}</h2>
              <p className="lp-text mb-0">
                {stringOr(
                  settings.body,
                  "পণ্য হাতে পেয়ে দেখে নিতে পারবেন। লেবেল ও মেয়াদ না মিললে ডেলিভারি ম্যানকে ফেরত দিন — টাকা নেবেন না।",
                )}
              </p>
            </div>
          </div>
        </section>
      );

    case "contact":
      return (
        <section className={sectionClass(section)} id={anchor} key={key} style={sectionStyle(section.design)}>
          <div className="lp-inner" style={{ textAlign: "center" }}>
            <h2 className="lp-heading">{stringOr(settings.title, "যোগাযোগ")}</h2>
            <p className="lp-text">
              {stringOr(settings.body, "যেকোনো প্রশ্নে কল বা WhatsApp করুন — প্রতিদিন সকাল ১০টা থেকে রাত ৮টা।")}
            </p>
            <div className="field-row" style={{ justifyContent: "center" }}>
              <a className="btn btn-emerald" href={telLink(context.brand)}>
                <Phone aria-hidden="true" />
                কল করুন · {phoneDisplay(context.brand)}
              </a>
              <a className="btn btn-whatsapp" href={whatsappLink(context.brand)}>
                WhatsApp
              </a>
            </div>
          </div>
        </section>
      );

    case "divider":
      return <div className="lp-divider" key={key} role="presentation" />;

    case "spacer":
      return <div key={key} style={{ height: Math.min(Math.max(Number(settings.height ?? 48) || 48, 8), 400) }} aria-hidden="true" />;

    case "ingredients": {
      const source = stringOr(settings.source, "product");
      const product = sectionProduct(settings, context);
      const body = source === "custom" ? stringOr(settings.custom) : (product?.ingredients ?? "");
      if (!body) return null;
      return (
        <section className={sectionClass(section)} id={anchor} key={key} style={sectionStyle(section.design)}>
          <div className="lp-inner">
            <h2 className="lp-heading">{stringOr(settings.title, "উপাদান")}</h2>
            <p className="lp-text" style={{ whiteSpace: "pre-line" }}>
              {body}
            </p>
          </div>
        </section>
      );
    }

    case "dosage": {
      const source = stringOr(settings.source, "product");
      const product = sectionProduct(settings, context);
      const body = source === "custom" ? stringOr(settings.custom) : (product?.dosage ?? "");
      if (!body) return null;
      return (
        <section className={sectionClass(section)} id={anchor} key={key} style={sectionStyle(section.design)}>
          <div className="lp-inner">
            <h2 className="lp-heading">{stringOr(settings.title, "ডোজ ও সেবনবিধি")}</h2>
            <p className="lp-text" style={{ whiteSpace: "pre-line" }}>
              {body}
            </p>
          </div>
        </section>
      );
    }

    case "doctor_advice":
      return (
        <section className={sectionClass(section)} id={anchor} key={key} style={sectionStyle(section.design)}>
          <div className="lp-inner">
            <div className="disclaimer-box" role="note">
              <p className="mb-0">{stringOr(settings.body, MEDICAL_DISCLAIMER)}</p>
            </div>
          </div>
        </section>
      );

    case "popup":
      /* পপআপ লেয়ারের কাজ — ইনলাইন রেন্ডার হয় না */
      return null;

    case "order_form":
      /* ল্যান্ডিং পেজ ও বিল্ডার প্রিভিউতে LandingOrderForm আলাদা বসে */
      return null;

    default:
      return null;
  }
}
