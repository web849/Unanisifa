"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save, Trash2 } from "lucide-react";
import { toEnglishDigits } from "@/lib/utils";

export type ProductFormInitial = {
  name: string;
  slug: string;
  categoryId: number | null;
  sku: string;
  shortDescription: string;
  description: string;
  price: number;
  compareAtPrice: number;
  costPrice: number;
  stock: number;
  lowStockThreshold: number;
  trackStock: boolean;
  status: "draft" | "active" | "archived";
  featured: boolean;
  sortOrder: number;
  ingredients: string;
  dosage: string;
  warnings: string;
  storage: string;
  packageSize: string;
  manufacturer: string;
  requiresPrescription: boolean;
  expiryNote: string;
  metaTitle: string;
  metaDescription: string;
  images: Array<{ url: string; alt: string }>;
};

const emptyInitial: ProductFormInitial = {
  name: "",
  slug: "",
  categoryId: null,
  sku: "",
  shortDescription: "",
  description: "",
  price: 100,
  compareAtPrice: 0,
  costPrice: 0,
  stock: 50,
  lowStockThreshold: 5,
  trackStock: true,
  status: "draft",
  featured: false,
  sortOrder: 0,
  ingredients: "",
  dosage: "",
  warnings: "",
  storage: "",
  packageSize: "",
  manufacturer: "",
  requiresPrescription: false,
  expiryNote: "",
  metaTitle: "",
  metaDescription: "",
  images: [],
};

export function ProductForm({
  categories,
  productId,
  initial,
}: {
  categories: Array<{ id: number; name: string }>;
  productId: number | null;
  initial?: ProductFormInitial;
}) {
  const router = useRouter();
  const [form, setForm] = useState<ProductFormInitial>(() => ({ ...emptyInitial, ...initial }));
  const [imageUrl, setImageUrl] = useState("");
  const [imageAlt, setImageAlt] = useState("");
  const [message, setMessage] = useState<{ tone: "ok" | "err"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const set = <K extends keyof ProductFormInitial>(key: K, value: ProductFormInitial[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));
  const setNum = (key: keyof ProductFormInitial, raw: string) =>
    set(key, Number(toEnglishDigits(raw).replace(/[^\d.-]/g, "")) as never);

  const addImage = () => {
    const url = imageUrl.trim();
    if (!url || form.images.some((image) => image.url === url) || form.images.length >= 8) return;
    set("images", [...form.images, { url, alt: imageAlt.trim() }]);
    setImageUrl("");
    setImageAlt("");
  };

  const payload = () => ({
    ...form,
    compareAtPrice: form.compareAtPrice > 0 ? form.compareAtPrice : null,
    costPrice: form.costPrice > 0 ? form.costPrice : null,
  });

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch(productId ? `/api/admin/products/${productId}` : "/api/admin/products", {
        method: productId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload()),
      });
      const json = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !json.ok) {
        setMessage({ tone: "err", text: json.error ?? "Save failed" });
        return;
      }
      setMessage({ tone: "ok", text: "Saved" });
      router.refresh();
    } catch {
      setMessage({ tone: "err", text: "Network error" });
    } finally {
      setBusy(false);
    }
  };

  const archive = async () => {
    if (!productId) return;
    if (!confirm("Archive this product? It disappears from the store; order history is kept.")) return;
    const response = await fetch(`/api/admin/products/${productId}`, { method: "DELETE" });
    if (response.ok) router.push("/admin/products");
  };

  return (
    <form onSubmit={save} className="stack stack-md">
      {message ? <p className={message.tone === "ok" ? "ok-text" : "error-text"}>{message.text}</p> : null}

      <div className="panel">
        <div className="panel-head">
          <h2 className="panel-title">Basics</h2>
        </div>
        <div className="panel-body grid-2">
          <label className="field">
            <span className="label">Name (Bangla)</span>
            <input className="input" value={form.name} onChange={(e) => set("name", e.target.value)} required minLength={2} />
          </label>
          <label className="field">
            <span className="label">Slug</span>
            <input className="input mono" value={form.slug} onChange={(e) => set("slug", e.target.value)} placeholder="auto from name" />
          </label>
          <label className="field field-full">
            <span className="label">Short description (cards & search)</span>
            <input className="input" value={form.shortDescription} onChange={(e) => set("shortDescription", e.target.value)} maxLength={500} />
          </label>
          <label className="field field-full">
            <span className="label">Full description</span>
            <textarea className="input" rows={5} value={form.description} onChange={(e) => set("description", e.target.value)} />
          </label>
          <label className="field">
            <span className="label">Category</span>
            <select
              className="input"
              value={form.categoryId ?? ""}
              onChange={(e) => set("categoryId", e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">— none —</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span className="label">SKU</span>
            <input className="input mono" value={form.sku} onChange={(e) => set("sku", e.target.value)} maxLength={80} />
          </label>
          <label className="field">
            <span className="label">Status</span>
            <select className="input" value={form.status} onChange={(e) => set("status", e.target.value as never)}>
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="archived">Archived</option>
            </select>
          </label>
          <label className="field">
            <span className="label">Manufacturer</span>
            <input className="input" value={form.manufacturer} onChange={(e) => set("manufacturer", e.target.value)} maxLength={255} />
          </label>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <h2 className="panel-title">Price & stock (৳ integers)</h2>
        </div>
        <div className="panel-body grid-4">
          <label className="field">
            <span className="label">Price</span>
            <input className="input" type="number" min={1} value={form.price} onChange={(e) => setNum("price", e.target.value)} required />
          </label>
          <label className="field">
            <span className="label">Compare at (0 = none)</span>
            <input className="input" type="number" min={0} value={form.compareAtPrice} onChange={(e) => setNum("compareAtPrice", e.target.value)} />
          </label>
          <label className="field">
            <span className="label">Cost price (for profit reports)</span>
            <input className="input" type="number" min={0} value={form.costPrice} onChange={(e) => setNum("costPrice", e.target.value)} />
          </label>
          <label className="field">
            <span className="label">Stock</span>
            <input className="input" type="number" min={0} value={form.stock} onChange={(e) => setNum("stock", e.target.value)} />
          </label>
          <label className="field">
            <span className="label">Low stock threshold</span>
            <input className="input" type="number" min={0} value={form.lowStockThreshold} onChange={(e) => setNum("lowStockThreshold", e.target.value)} />
          </label>
          <label className="field">
            <span className="label">Package size (e.g. 200ml)</span>
            <input className="input" value={form.packageSize} onChange={(e) => set("packageSize", e.target.value)} maxLength={200} />
          </label>
          <label className="field field-check">
            <input type="checkbox" checked={form.trackStock} onChange={(e) => set("trackStock", e.target.checked)} />
            <span>Track stock</span>
          </label>
          <label className="field field-check">
            <input type="checkbox" checked={form.requiresPrescription} onChange={(e) => set("requiresPrescription", e.target.checked)} />
            <span>Requires prescription advice</span>
          </label>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <h2 className="panel-title">Medicine information (Bangla)</h2>
        </div>
        <div className="panel-body stack stack-sm">
          <label className="field">
            <span className="label">Ingredients (উপাদান)</span>
            <textarea className="input" rows={3} value={form.ingredients} onChange={(e) => set("ingredients", e.target.value)} />
          </label>
          <label className="field">
            <span className="label">Dosage (সেবনবিধি)</span>
            <textarea className="input" rows={3} value={form.dosage} onChange={(e) => set("dosage", e.target.value)} />
          </label>
          <label className="field">
            <span className="label">Warnings / precautions (সতর্কতা)</span>
            <textarea className="input" rows={3} value={form.warnings} onChange={(e) => set("warnings", e.target.value)} />
          </label>
          <div className="grid-2">
            <label className="field">
              <span className="label">Storage (সংরক্ষণ)</span>
              <input className="input" value={form.storage} onChange={(e) => set("storage", e.target.value)} maxLength={1000} />
            </label>
            <label className="field">
              <span className="label">Expiry note</span>
              <input className="input" value={form.expiryNote} onChange={(e) => set("expiryNote", e.target.value)} maxLength={300} />
            </label>
          </div>
          <p className="text-small text-muted mb-0">
            Never write cure guarantees or unproven medical claims — that violates platform policy. The doctor-advice disclaimer is
            added automatically on the product page and checkout.
          </p>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <h2 className="panel-title">Images</h2>
        </div>
        <div className="panel-body stack stack-sm">
          <div className="field-row">
            <input className="input" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="/products/p-01.svg or R2 URL" />
            <input className="input" value={imageAlt} onChange={(e) => setImageAlt(e.target.value)} placeholder="Alt text" />
            <button type="button" className="btn btn-outline btn-sm" onClick={addImage}>
              Add
            </button>
          </div>
          {form.images.length > 0 ? (
            <ul className="image-list">
              {form.images.map((image, index) => (
                <li key={image.url}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={image.url} alt={image.alt || ""} width={56} height={56} className="table-thumb" />
                  <span className="mono text-small">
                    {index === 0 ? "primary · " : ""}
                    {image.url}
                  </span>
                  <button
                    type="button"
                    className="icon-btn"
                    aria-label={`Remove ${image.url}`}
                    onClick={() => set("images", form.images.filter((item) => item.url !== image.url))}
                  >
                    <Trash2 aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-small text-muted mb-0">No images yet. Generated demo art lives under /products/.</p>
          )}
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <h2 className="panel-title">Visibility & SEO</h2>
        </div>
        <div className="panel-body grid-4">
          <label className="field field-check">
            <input type="checkbox" checked={form.featured} onChange={(e) => set("featured", e.target.checked)} />
            <span>Featured on home</span>
          </label>
          <label className="field">
            <span className="label">Sort order (higher first)</span>
            <input className="input" type="number" min={0} value={form.sortOrder} onChange={(e) => setNum("sortOrder", e.target.value)} />
          </label>
          <label className="field">
            <span className="label">Meta title</span>
            <input className="input" value={form.metaTitle} onChange={(e) => set("metaTitle", e.target.value)} maxLength={255} />
          </label>
          <label className="field">
            <span className="label">Meta description</span>
            <input className="input" value={form.metaDescription} onChange={(e) => set("metaDescription", e.target.value)} maxLength={500} />
          </label>
        </div>
      </div>

      <div className="field-row">
        <button type="submit" className="btn btn-primary" disabled={busy}>
          <Save aria-hidden="true" />
          {busy ? "Saving…" : productId ? "Save changes" : "Create product"}
        </button>
        {productId ? (
          <button type="button" className="btn btn-danger-outline" onClick={archive}>
            <Trash2 aria-hidden="true" />
            Archive product
          </button>
        ) : null}
      </div>
    </form>
  );
}
