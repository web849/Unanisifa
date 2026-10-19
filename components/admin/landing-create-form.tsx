"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Rocket } from "lucide-react";
import { DemoCatalogNotice } from "@/components/admin/demo-catalog-notice";
import {
  LANDING_THEMES,
  LANDING_THEME_LABEL,
  defaultSectionsFor,
  type LandingThemeSlug,
} from "@/lib/landing/sections";
import type { LandingProduct } from "@/lib/landing/product-types";
import { formatTakaEn, slugify } from "@/lib/utils";

export function LandingCreateForm({
  products,
  demoFallback,
  coupons,
  canWrite,
}: {
  products: LandingProduct[];
  demoFallback: boolean;
  coupons: Array<{ code: string }>;
  canWrite: boolean;
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [productId, setProductId] = useState("");
  const [themeSlug, setThemeSlug] = useState<LandingThemeSlug>(LANDING_THEMES[0]);
  const [couponCode, setCouponCode] = useState("");
  const [status, setStatus] = useState<"draft" | "published">("draft");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const chosenProduct = productId ? products.find((product) => product.id === Number(productId)) ?? null : null;
  const sections = defaultSectionsFor(title || "ল্যান্ডিং পেজ");

  const importDemoIfNeeded = async (): Promise<boolean> => {
    if (!demoFallback || !chosenProduct?.isDemo) return true;
    const response = await fetch("/api/admin/demo-catalog", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    const payload = (await response.json()) as { ok?: boolean; error?: string };
    if (!response.ok || !payload.ok) {
      setError(payload.error ?? "Demo catalog import failed.");
      return false;
    }
    return true;
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canWrite) {
      setError("Your role is read-only.");
      return;
    }
    if (title.trim().length < 2) {
      setError("Title must be at least 2 characters.");
      return;
    }
    setBusy(true);
    setError(null);

    if (!(await importDemoIfNeeded())) {
      setBusy(false);
      return;
    }

    try {
      const response = await fetch("/api/admin/landing-pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          slug: slug.trim() || undefined,
          productId: productId ? Number(productId) : null,
          themeSlug,
          couponCode: couponCode || undefined,
          status,
          sections: [],
        }),
      });
      const json = (await response.json()) as { ok?: boolean; error?: string; id?: number };
      if (response.ok && json.ok && json.id) {
        router.push(`/admin/landing-pages/${json.id}`);
        return;
      }
      setError(json.error ?? "Create failed.");
    } catch {
      setError("Network error. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const previewSlug = slugify(slug || title) || "your-page";

  return (
    <form onSubmit={submit} className="lp-create">
      <div className="lp-create-main">
        <div className="panel">
          <div className="panel-head">
            <h2 className="panel-title">Page basics</h2>
            <span className="badge badge-outline">10-block starter</span>
          </div>
          <div className="panel-body stack stack-sm">
            {demoFallback ? <DemoCatalogNotice demoCount={products.length} compact /> : null}

            <label className="field">
              <span className="label">Title</span>
              <input
                className="input"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                required
                minLength={2}
                placeholder="যেমন: গ্যাস্ট্রিক সিরাপ — বিশেষ অফার"
              />
              <span className="help-text">এই শিরোনাম Hero ব্লকে ডিফল্ট হিসেবে বসবে।</span>
            </label>

            <label className="field">
              <span className="label">Slug</span>
              <div className="lp-slug-input">
                <span>/offer/</span>
                <input
                  className="input mono"
                  value={slug}
                  onChange={(event) => setSlug(event.target.value)}
                  placeholder={previewSlug}
                />
              </div>
              <span className="help-text">
                শেষ URL: <span className="mono">/offer/{previewSlug}</span>
              </span>
            </label>

            <div className="grid-2">
              <label className="field">
                <span className="label">Theme</span>
                <select
                  className="input"
                  value={themeSlug}
                  onChange={(event) => setThemeSlug(event.target.value as LandingThemeSlug)}
                >
                  {LANDING_THEMES.map((theme) => (
                    <option key={theme} value={theme}>
                      {LANDING_THEME_LABEL[theme]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span className="label">Status</span>
                <select
                  className="input"
                  value={status}
                  onChange={(event) => setStatus(event.target.value as "draft" | "published")}
                >
                  <option value="draft">Draft</option>
                  <option value="published">Publish immediately</option>
                </select>
              </label>
            </div>

            <div className="lp-theme-swatches" aria-hidden="true">
              {LANDING_THEMES.map((theme) => (
                <button
                  key={theme}
                  type="button"
                  className={`lp-theme-swatch lp-theme-${theme}${themeSlug === theme ? " lp-theme-swatch-on" : ""}`}
                  title={LANDING_THEME_LABEL[theme]}
                  onClick={() => setThemeSlug(theme)}
                >
                  <span />
                  <span />
                  <span />
                </button>
              ))}
            </div>

            <label className="field">
              <span className="label">Main product</span>
              <select className="input" value={productId} onChange={(event) => setProductId(event.target.value)}>
                <option value="">— select later —</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                    {product.isDemo ? " (demo)" : ""} — {formatTakaEn(product.price)}
                  </option>
                ))}
              </select>
              <span className="help-text">
                Order form, ingredients ও dosage ব্লক এই পণ্য থেকে তথ্য নেবে। পরে বিল্ডারে বদলানো যাবে।
              </span>
            </label>

            <label className="field">
              <span className="label">Auto-applied coupon</span>
              <select className="input" value={couponCode} onChange={(event) => setCouponCode(event.target.value)}>
                <option value="">— none —</option>
                {coupons.map((coupon) => (
                  <option key={coupon.code} value={coupon.code}>
                    {coupon.code}
                  </option>
                ))}
              </select>
            </label>

            {chosenProduct ? (
              <div className="lp-create-product">
                {chosenProduct.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={chosenProduct.image} alt="" />
                ) : null}
                <div>
                  <strong>{chosenProduct.name}</strong>
                  <p className="text-small text-muted mb-0">
                    {formatTakaEn(chosenProduct.price)}
                    {chosenProduct.packageSize ? ` · ${chosenProduct.packageSize}` : ""}
                    {chosenProduct.isDemo ? " · demo product" : ""}
                  </p>
                </div>
              </div>
            ) : null}

            {error ? <p className="error-text">{error}</p> : null}

            <div className="row-between row-wrap">
              <button type="submit" className="btn btn-primary" disabled={busy || !canWrite}>
                <Rocket aria-hidden="true" />
                {busy ? "Creating…" : "Create & open builder"}
              </button>
              <span className="text-small text-muted">
                {sections.length} blocks · theme {themeSlug} · {status}
              </span>
            </div>
          </div>
        </div>
      </div>

      <aside className="lp-create-side">
        <div className="panel">
          <div className="panel-head">
            <h2 className="panel-title">Starter template</h2>
          </div>
          <div className="panel-body">
            <ol className="lp-create-steps">
              {sections.map((section) => (
                <li key={section.id}>{section.type.replace(/_/g, " ")}</li>
              ))}
            </ol>
            <p className="text-small text-muted mb-0">
              সব ব্লক পরে বদলানো, লুকানো, সাজানো বা মুছে ফেলা যাবে। Custom HTML ব্লকও যোগ করা যাবে।
            </p>
          </div>
        </div>

        <div className="panel">
          <div className="panel-head">
            <h2 className="panel-title">What happens next</h2>
          </div>
          <div className="panel-body stack stack-sm text-small">
            <p className="mb-0">
              <strong>1.</strong> বিল্ডারে লাইভ প্রিভিউ দেখে ব্লক সাজান।
            </p>
            <p className="mb-0">
              <strong>2.</strong> ডেস্কটপ ও মোবাইল প্রিভিউ চেক করুন।
            </p>
            <p className="mb-0">
              <strong>3.</strong> Publish করলে <span className="mono">/offer/&lt;slug&gt;</span> লাইভ হবে।
            </p>
            <Link className="btn btn-outline btn-sm" href="/admin/landing-pages">
              Back to landing pages
              <ArrowRight aria-hidden="true" />
            </Link>
          </div>
        </div>
      </aside>
    </form>
  );
}
