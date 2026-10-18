/**
 * ল্যান্ডিং সেকশন রেন্ডারার (সার্ভার) — ২২টি সেকশন টাইপ।
 * popup সেকশন এখানে রেন্ডার হয় না (পপআপ লেয়ার /api/popups/active থেকে নেয়)।
 * সব কপি বাংলা; ডাক্তারের পরামর্শ ব্লক বাধ্যতামূলকভাবে রেন্ডার হয়।
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
import type { ProductWithRelations } from "@/lib/store/repository";
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

function stringOr(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function listOf(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value) ? (value as Array<Record<string, unknown>>) : [];
}

function sectionStyle(design: LandingSection["design"]): React.CSSProperties {
  const style: React.CSSProperties = {};
  if (design?.paddingY) style.paddingTop = design.paddingY;
  if (design?.paddingY) style.paddingBottom = design.paddingY;
  if (design?.background) style.background = design.background;
  if (design?.textColor) style.color = design.textColor;
  if (design?.minHeight) style.minHeight = design.minHeight;
  if (design?.align) style.textAlign = design.align;
  return style;
}

function sectionClass(section: LandingSection): string {
  const classes = ["lp-section"];
  if (section.design?.alt) classes.push("lp-section-alt");
  if (section.design?.shape === "wave") classes.push("lp-shape-wave");
  if (section.design?.shape === "arch") classes.push("lp-shape-arch");
  return classes.join(" ");
}

export function renderLandingSection(
  section: LandingSection,
  context: {
    product: ProductWithRelations | null;
    reviews: ProductReview[];
    brand: BrandSettings;
  },
): React.ReactNode {
  const settings = section.settings as Record<string, unknown>;
  const key = `s-${section.id}`;

  switch (section.type) {
    case "hero":
      return (
        <section className="lp-section lp-hero" key={key} style={sectionStyle(section.design)}>
          <div className="lp-inner">
            {stringOr(settings.eyebrow) ? <p className="eyebrow">{stringOr(settings.eyebrow)}</p> : null}
            <h1 className="lp-heading display">{stringOr(settings.title, context.product?.name ?? "")}</h1>
            {stringOr(settings.subtitle) ? <p className="lp-text">{stringOr(settings.subtitle)}</p> : null}
            {stringOr(settings.imageUrl) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={stringOr(settings.imageUrl)} alt={stringOr(settings.title, "offer")} className="lp-hero-image" />
            ) : null}
            {stringOr(settings.ctaLabel) ? (
              <a className="btn btn-primary btn-lg" href={`#${stringOr(settings.ctaTarget, "order_form")}`}>
                {stringOr(settings.ctaLabel)}
              </a>
            ) : null}
          </div>
        </section>
      );

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
        <section className={sectionClass(section)} key={key} style={sectionStyle(section.design)}>
          <div className="lp-inner">
            {stringOr(settings.title) ? <h2 className="lp-heading">{stringOr(settings.title)}</h2> : null}
            {stringOr(settings.body) ? <p className="lp-text">{stringOr(settings.body)}</p> : null}
          </div>
        </section>
      );

    case "split":
      return (
        <section className={sectionClass(section)} key={key} style={sectionStyle(section.design)}>
          <div className="lp-inner split-grid">
            {stringOr(settings.imageUrl) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={stringOr(settings.imageUrl)} alt={stringOr(settings.title, "")} className="split-image" />
            ) : null}
            <div>
              {stringOr(settings.title) ? <h2 className="lp-heading">{stringOr(settings.title)}</h2> : null}
              {stringOr(settings.body) ? <p className="lp-text">{stringOr(settings.body)}</p> : null}
            </div>
          </div>
        </section>
      );

    case "images": {
      const urls = listOf(settings.images)
        .map((item) => stringOr(item.url))
        .filter(Boolean);
      const csv = stringOr(settings.imageUrls)
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
      const all = [...urls, ...csv];
      if (all.length === 0) return null;
      return (
        <section className={sectionClass(section)} key={key} style={sectionStyle(section.design)}>
          <div className="lp-inner">
            {stringOr(settings.title) ? <h2 className="lp-heading">{stringOr(settings.title)}</h2> : null}
            <div className="image-grid">
              {all.map((url, index) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={`${url}-${index}`} src={url} alt={stringOr(settings.title, `ছবি ${index + 1}`)} />
              ))}
            </div>
          </div>
        </section>
      );
    }

    case "video": {
      const youtubeId = stringOr(settings.youtubeId);
      if (!youtubeId) return null;
      return (
        <section className={sectionClass(section)} key={key} style={sectionStyle(section.design)}>
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

    case "products": {
      const product = context.product;
      if (!product) return null;
      return (
        <section className={sectionClass(section)} key={key} style={sectionStyle(section.design)}>
          <div className="lp-inner">
            {stringOr(settings.title) ? <h2 className="lp-heading">{stringOr(settings.title)}</h2> : null}
            <div className="card" style={{ maxWidth: 480, margin: "0 auto" }}>
              {product.images[0]?.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={product.images[0].url} alt={product.images[0].alt ?? product.name} style={{ width: "100%", borderRadius: "var(--radius-md)" }} />
              ) : null}
              <h3 className="lp-heading">{product.name}</h3>
              <p className="mb-0">
                <strong>{formatTaka(product.price)}</strong>
                {product.compareAtPrice && product.compareAtPrice > product.price ? (
                  <s className="text-muted"> {formatTaka(product.compareAtPrice)}</s>
                ) : null}
                {product.packageSize ? <span className="text-muted"> · {product.packageSize}</span> : null}
              </p>
              {product.shortDescription ? <p className="lp-text">{product.shortDescription}</p> : null}
              <a className="btn btn-primary btn-block" href="#order_form">
                অর্ডার করুন
              </a>
            </div>
          </div>
        </section>
      );
    }

    case "cta":
      return (
        <section className={sectionClass(section)} key={key} style={sectionStyle(section.design)}>
          <div className="lp-inner">
            <div className="lp-cta">
              <div>
                {stringOr(settings.title) ? <h2 className="lp-heading">{stringOr(settings.title)}</h2> : null}
                {stringOr(settings.body) ? <p className="lp-text">{stringOr(settings.body)}</p> : null}
              </div>
              {stringOr(settings.ctaLabel) ? (
                stringOr(settings.ctaUrl, "#order_form").startsWith("http") || stringOr(settings.ctaUrl, "#order_form").startsWith("/") ? (
                  <Link className="btn btn-gold btn-lg" href={stringOr(settings.ctaUrl, "#order_form")}>
                    {stringOr(settings.ctaLabel)}
                  </Link>
                ) : (
                  <a className="btn btn-gold btn-lg" href={`#${stringOr(settings.ctaUrl, "order_form")}`}>
                    {stringOr(settings.ctaLabel)}
                  </a>
                )
              ) : null}
            </div>
          </div>
        </section>
      );

    case "features": {
      const items = listOf(settings.items);
      if (items.length === 0) return null;
      return (
        <section className={sectionClass(section)} key={key} style={sectionStyle(section.design)}>
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
        <section className={sectionClass(section)} key={key} style={sectionStyle(section.design)}>
          <div className="lp-inner">
            {stringOr(settings.title, "কীভাবে অর্ডার করবেন") ? <h2 className="lp-heading">{stringOr(settings.title, "কীভাবে অর্ডার করবেন")}</h2> : null}
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
        <section className={sectionClass(section)} key={key} style={sectionStyle(section.design)}>
          <div className="lp-inner">
            {stringOr(settings.title, "সাধারণ জিজ্ঞাসা") ? <h2 className="lp-heading">{stringOr(settings.title, "সাধারণ জিজ্ঞাসা")}</h2> : null}
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
        <section className={sectionClass(section)} key={key} style={sectionStyle(section.design)}>
          <div className="lp-inner">
            {stringOr(settings.title, "গ্রাহকের মতামত") ? <h2 className="lp-heading">{stringOr(settings.title, "গ্রাহকের মতামত")}</h2> : null}
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
        <section className={sectionClass(section)} key={key} style={sectionStyle(section.design)}>
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
        <section className={sectionClass(section)} key={key} style={sectionStyle(section.design)}>
          <div className="lp-inner" style={{ textAlign: "center" }}>
            <LandingCountdown endsAt={typeof settings.endsAt === "string" ? settings.endsAt : null} title={stringOr(settings.title)} />
          </div>
        </section>
      );

    case "guarantee":
      return (
        <section className={sectionClass(section)} key={key} style={sectionStyle(section.design)}>
          <div className="lp-inner">
            <div className="card" style={{ textAlign: "center", maxWidth: 640, margin: "0 auto" }}>
              <ShieldCheck aria-hidden="true" style={{ width: 36, height: 36, color: "var(--color-primary)" }} />
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
        <section className={sectionClass(section)} key={key} style={sectionStyle(section.design)}>
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
      return (
        <div className="lp-divider" key={key} role="presentation" />
      );

    case "spacer":
      return <div key={key} style={{ height: Number(settings.height ?? 48) }} aria-hidden="true" />;

    case "ingredients": {
      const source = stringOr(settings.source, "product");
      const body = source === "custom" ? stringOr(settings.custom) : (context.product?.ingredients ?? "");
      if (!body) return null;
      return (
        <section className={sectionClass(section)} key={key} style={sectionStyle(section.design)}>
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
      const body = source === "custom" ? stringOr(settings.custom) : (context.product?.dosage ?? "");
      if (!body) return null;
      return (
        <section className={sectionClass(section)} key={key} style={sectionStyle(section.design)}>
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
        <section className={sectionClass(section)} key={key} style={sectionStyle(section.design)}>
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
      /* app/offer/[slug]/page.tsx-এ ক্লায়েন্ট ফর্ম বসে */
      return null;

    default:
      return null;
  }
}
