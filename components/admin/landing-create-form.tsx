"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Rocket } from "lucide-react";
import { LANDING_THEMES } from "@/lib/landing/sections";

export function LandingCreateForm({
  products,
  coupons,
}: {
  products: Array<{ id: number; name: string }>;
  coupons: Array<{ code: string }>;
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [productId, setProductId] = useState("");
  const [themeSlug, setThemeSlug] = useState<string>(LANDING_THEMES[0]);
  const [couponCode, setCouponCode] = useState("");
  const [status, setStatus] = useState<"draft" | "published">("draft");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const response = await fetch("/api/admin/landing-pages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        slug: slug || undefined,
        productId: productId ? Number(productId) : null,
        themeSlug,
        couponCode: couponCode || undefined,
        status,
        sections: [],
      }),
    });
    const json = (await response.json()) as { ok?: boolean; error?: string; data?: { id?: number } };
    if (response.ok && json.ok) {
      router.push(`/admin/landing-pages/${json.data?.id}`);
      return;
    }
    setError(json.error ?? "Create failed");
    setBusy(false);
  };

  return (
    <form onSubmit={submit} className="panel" style={{ maxWidth: 720 }}>
      <div className="panel-head">
        <h2 className="panel-title">Create page</h2>
      </div>
      <div className="panel-body stack stack-sm">
        <label className="field">
          <span className="label">Title (Bangla — shown as hero heading)</span>
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} required minLength={2} />
        </label>
        <div className="grid-2">
          <label className="field">
            <span className="label">Slug (URL /offer/…)</span>
            <input className="input mono" value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="auto from title" />
          </label>
          <label className="field">
            <span className="label">Theme</span>
            <select className="input" value={themeSlug} onChange={(e) => setThemeSlug(e.target.value)}>
              {LANDING_THEMES.map((theme) => (
                <option key={theme} value={theme}>
                  {theme}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span className="label">Main product (order form)</span>
            <select className="input" value={productId} onChange={(e) => setProductId(e.target.value)}>
              <option value="">— select —</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span className="label">Auto-applied coupon</span>
            <select className="input" value={couponCode} onChange={(e) => setCouponCode(e.target.value)}>
              <option value="">— none —</option>
              {coupons.map((coupon) => (
                <option key={coupon.code} value={coupon.code}>
                  {coupon.code}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="field">
          <span className="label">Status</span>
          <select className="input" value={status} onChange={(e) => setStatus(e.target.value as "draft" | "published")}>
            <option value="draft">Draft</option>
            <option value="published">Publish immediately</option>
          </select>
        </label>
        {error ? <p className="error-text">{error}</p> : null}
        <div>
          <button type="submit" className="btn btn-primary" disabled={busy}>
            <Rocket aria-hidden="true" />
            {busy ? "Creating…" : "Create & open builder"}
          </button>
        </div>
      </div>
    </form>
  );
}
