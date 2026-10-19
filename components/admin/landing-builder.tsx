"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowUp,
  ExternalLink,
  Eye,
  EyeOff,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import {
  LANDING_THEMES,
  SECTION_CATALOG,
  SECTION_GROUPS,
  defaultSectionsFor,
  type LandingSection,
  type LandingSectionType,
} from "@/lib/landing/sections";

type PageDraft = {
  id: number;
  title: string;
  slug: string;
  productId: number | null;
  status: "draft" | "published" | "archived";
  themeSlug: string;
  sections: LandingSection[];
  metaTitle: string | null;
  metaDescription: string | null;
  couponCode: string | null;
  checkoutOffers: number[];
  thankYouOffers: number[];
};

export function LandingBuilder({
  page,
  products,
  coupons,
}: {
  page: PageDraft;
  products: Array<{ id: number; name: string; price: number }>;
  coupons: Array<{ code: string }>;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<PageDraft>(page);
  const [selectedId, setSelectedId] = useState<number | null>(page.sections[0]?.id ?? null);
  const [message, setMessage] = useState<{ tone: "ok" | "err"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const selected = useMemo(
    () => draft.sections.find((section) => section.id === selectedId) ?? null,
    [draft.sections, selectedId],
  );

  const nextId = () => (draft.sections.length > 0 ? Math.max(...draft.sections.map((s) => s.id)) + 1 : 1);

  const addSection = (type: LandingSectionType) => {
    const id = nextId();
    const section: LandingSection = { id, type, settings: {} };
    if (type === "hero") {
      section.settings = { eyebrow: "বিশেষ অফার", title: draft.title, subtitle: "", ctaLabel: "অর্ডার করুন", ctaTarget: "order_form", imageUrl: "" };
      section.design = { paddingY: 56, align: "center" };
    }
    if (type === "order_form") {
      section.settings = { mode: "inline", title: "অর্ডার ফর্ম", subtitle: "নাম, মোবাইল ও ঠিকানা দিন" };
    }
    if (type === "doctor_advice") section.settings = {};
    setDraft((prev) => ({ ...prev, sections: [...prev.sections, section] }));
    setSelectedId(id);
  };

  const updateSection = (id: number, patch: Partial<LandingSection>) =>
    setDraft((prev) => ({
      ...prev,
      sections: prev.sections.map((section) => (section.id === id ? { ...section, ...patch } : section)),
    }));

  const updateSettings = (id: number, key: string, value: unknown) =>
    setDraft((prev) => ({
      ...prev,
      sections: prev.sections.map((section) =>
        section.id === id ? { ...section, settings: { ...section.settings, [key]: value } } : section,
      ),
    }));

  const move = (id: number, direction: -1 | 1) => {
    setDraft((prev) => {
      const index = prev.sections.findIndex((section) => section.id === id);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= prev.sections.length) return prev;
      const sections = [...prev.sections];
      const [item] = sections.splice(index, 1);
      sections.splice(target, 0, item);
      return { ...prev, sections };
    });
  };

  const removeSection = (id: number) => {
    setDraft((prev) => ({ ...prev, sections: prev.sections.filter((section) => section.id !== id) }));
    if (selectedId === id) setSelectedId(null);
  };

  const resetTemplate = () => {
    if (!confirm("Replace all sections with the default 7-section template?")) return;
    const sections = defaultSectionsFor(draft.title);
    setDraft((prev) => ({ ...prev, sections }));
    setSelectedId(sections[0]?.id ?? null);
  };

  const save = async () => {
    setBusy(true);
    setMessage(null);
    const popupCount = draft.sections.filter((s) => s.type === "popup" && !s.hidden).length;
    if (popupCount > 3) {
      setMessage({ tone: "err", text: "Maximum 3 popup sections per page" });
      setBusy(false);
      return;
    }
    const response = await fetch(`/api/admin/landing-pages/${draft.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: draft.title,
        slug: draft.slug,
        productId: draft.productId,
        status: draft.status,
        themeSlug: draft.themeSlug,
        sections: draft.sections,
        metaTitle: draft.metaTitle ?? "",
        metaDescription: draft.metaDescription ?? "",
        couponCode: draft.couponCode ?? "",
        checkoutOffers: draft.checkoutOffers,
        thankYouOffers: draft.thankYouOffers,
      }),
    });
    const json = (await response.json()) as { ok?: boolean; error?: string };
    if (response.ok && json.ok) {
      setMessage({ tone: "ok", text: "Saved" });
      router.refresh();
    } else {
      setMessage({ tone: "err", text: json.error ?? "Save failed" });
    }
    setBusy(false);
  };

  const set = <K extends keyof PageDraft>(key: K, value: PageDraft[K]) =>
    setDraft((prev) => ({ ...prev, [key]: value }));

  const toggleOffer = (key: "checkoutOffers" | "thankYouOffers", productId: number) => {
    setDraft((prev) => {
      const list = prev[key];
      const next = list.includes(productId) ? list.filter((id) => id !== productId) : [...list, productId].slice(0, 6);
      return { ...prev, [key]: next };
    });
  };

  return (
    <div className="stack stack-md">
      {message ? <p className={message.tone === "ok" ? "ok-text" : "error-text"}>{message.text}</p> : null}

      <div className="panel">
        <div className="panel-head">
          <h2 className="panel-title">Page</h2>
          <div className="field-row">
            <Link className="btn btn-outline btn-sm" href={`/offer/${draft.slug}`} target="_blank">
              <ExternalLink aria-hidden="true" />
              Preview
            </Link>
            <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={() => void save()}>
              <Save aria-hidden="true" />
              {busy ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
        <div className="panel-body grid-4">
          <label className="field">
            <span className="label">Title</span>
            <input className="input" value={draft.title} onChange={(e) => set("title", e.target.value)} />
          </label>
          <label className="field">
            <span className="label">Slug</span>
            <input className="input mono" value={draft.slug} onChange={(e) => set("slug", e.target.value)} />
          </label>
          <label className="field">
            <span className="label">Status</span>
            <select className="input" value={draft.status} onChange={(e) => set("status", e.target.value as "draft" | "published")}>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
          </label>
          <label className="field">
            <span className="label">Theme</span>
            <select className="input" value={draft.themeSlug} onChange={(e) => set("themeSlug", e.target.value)}>
              {LANDING_THEMES.map((theme) => (
                <option key={theme} value={theme}>
                  {theme}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span className="label">Main product (order form target)</span>
            <select
              className="input"
              value={draft.productId ?? ""}
              onChange={(e) => set("productId", e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">— none —</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span className="label">Auto-applied coupon</span>
            <select className="input" value={draft.couponCode ?? ""} onChange={(e) => set("couponCode", e.target.value || null)}>
              <option value="">— none —</option>
              {coupons.map((coupon) => (
                <option key={coupon.code} value={coupon.code}>
                  {coupon.code}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span className="label">Meta title</span>
            <input className="input" value={draft.metaTitle ?? ""} onChange={(e) => set("metaTitle", e.target.value || null)} maxLength={255} />
          </label>
          <label className="field">
            <span className="label">Meta description</span>
            <input className="input" value={draft.metaDescription ?? ""} onChange={(e) => set("metaDescription", e.target.value || null)} maxLength={500} />
          </label>
          <div className="field field-full">
            <span className="label">Checkout-page offers (shown when this page sends a customer to /checkout)</span>
            <div className="chip-row">
              {products.map((product) => (
                <button
                  key={product.id}
                  type="button"
                  className={`chip ${draft.checkoutOffers.includes(product.id) ? "chip-on" : ""}`}
                  aria-pressed={draft.checkoutOffers.includes(product.id)}
                  onClick={() => toggleOffer("checkoutOffers", product.id)}
                >
                  {product.name}
                </button>
              ))}
            </div>
          </div>
          <div className="field field-full">
            <span className="label">Thank-you-page offers (downsell after order)</span>
            <div className="chip-row">
              {products.map((product) => (
                <button
                  key={product.id}
                  type="button"
                  className={`chip ${draft.thankYouOffers.includes(product.id) ? "chip-on" : ""}`}
                  aria-pressed={draft.thankYouOffers.includes(product.id)}
                  onClick={() => toggleOffer("thankYouOffers", product.id)}
                >
                  {product.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="builder-grid">
        <div className="panel">
          <div className="panel-head">
            <h2 className="panel-title">Sections ({draft.sections.length})</h2>
            <button type="button" className="btn btn-outline btn-sm" onClick={resetTemplate}>
              Reset template
            </button>
          </div>
          <div className="panel-body stack stack-sm">
            {draft.sections.map((section, index) => {
              const meta = SECTION_CATALOG.find((item) => item.type === section.type);
              return (
                <div
                  key={section.id}
                  className={`builder-item ${selectedId === section.id ? "builder-item-on" : ""}`}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedId(section.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelectedId(section.id);
                    }
                  }}
                >
                  <span className="builder-item-index">{index + 1}</span>
                  <span className="builder-item-name">
                    {meta?.label ?? section.type}
                    {section.hidden ? <span className="badge badge-hidden"> hidden</span> : null}
                  </span>
                  <span className="builder-item-actions">
                    <button type="button" className="icon-btn" aria-label="Move up" disabled={index === 0} onClick={(e) => { e.stopPropagation(); move(section.id, -1); }}>
                      <ArrowUp aria-hidden="true" />
                    </button>
                    <button type="button" className="icon-btn" aria-label="Move down" disabled={index === draft.sections.length - 1} onClick={(e) => { e.stopPropagation(); move(section.id, 1); }}>
                      <ArrowDown aria-hidden="true" />
                    </button>
                    <button type="button" className="icon-btn" aria-label={section.hidden ? "Show" : "Hide"} onClick={(e) => { e.stopPropagation(); updateSection(section.id, { hidden: !section.hidden }); }}>
                      {section.hidden ? <Eye aria-hidden="true" /> : <EyeOff aria-hidden="true" />}
                    </button>
                    <button type="button" className="icon-btn" aria-label="Delete section" onClick={(e) => { e.stopPropagation(); removeSection(section.id); }}>
                      <Trash2 aria-hidden="true" />
                    </button>
                  </span>
                </div>
              );
            })}
            {draft.sections.length === 0 ? (
              <p className="text-muted mb-0">No sections — add one below or reset the template.</p>
            ) : null}
          </div>
        </div>

        <div className="panel">
          <div className="panel-head">
            <h2 className="panel-title">Add section</h2>
          </div>
          <div className="panel-body stack stack-sm">
            {SECTION_GROUPS.map((group) => (
              <div key={group.id}>
                <p className="admin-nav-title">{group.label}</p>
                <div className="chip-row">
                  {SECTION_CATALOG.filter((item) => item.group === group.id).map((item) => (
                    <button
                      key={item.type}
                      type="button"
                      className="chip"
                      title={item.description}
                      onClick={() => addSection(item.type)}
                    >
                      <Plus aria-hidden="true" />
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {selected ? <SectionEditor section={selected} onSettings={updateSettings} onPatch={updateSection} products={products} /> : null}
    </div>
  );
}

function SectionEditor({
  section,
  onSettings,
  onPatch,
  products,
}: {
  section: LandingSection;
  onSettings: (id: number, key: string, value: unknown) => void;
  onPatch: (id: number, patch: Partial<LandingSection>) => void;
  products: Array<{ id: number; name: string; price: number }>;
}) {
  const [rawJson, setRawJson] = useState(() => JSON.stringify(section.settings, null, 2));
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(section.id);

  if (editingId !== section.id) {
    setEditingId(section.id);
    setRawJson(JSON.stringify(section.settings, null, 2));
    setJsonError(null);
  }

  const settings = section.settings as Record<string, unknown>;
  const str = (key: string): string => (typeof settings[key] === "string" ? (settings[key] as string) : "");

  const applyJson = () => {
    try {
      const parsed = JSON.parse(rawJson) as Record<string, unknown>;
      onPatch(section.id, { settings: parsed });
      setJsonError(null);
    } catch (error) {
      setJsonError(error instanceof Error ? error.message : "Invalid JSON");
    }
  };

  const text = (key: string, label: string, multiline = false) => (
    <label className="field field-full" key={key}>
      <span className="label">{label}</span>
      {multiline ? (
        <textarea className="input" rows={3} value={str(key)} onChange={(e) => onSettings(section.id, key, e.target.value)} />
      ) : (
        <input className="input" value={str(key)} onChange={(e) => onSettings(section.id, key, e.target.value)} />
      )}
    </label>
  );

  return (
    <div className="panel">
      <div className="panel-head">
        <h2 className="panel-title">Edit · {section.type}</h2>
      </div>
      <div className="panel-body stack stack-sm">
        <div className="grid-2">
          {section.type === "hero" && (
            <>
              {text("eyebrow", "Eyebrow")}
              {text("title", "Title")}
              {text("subtitle", "Subtitle", true)}
              {text("ctaLabel", "CTA label")}
              {text("imageUrl", "Image URL")}
            </>
          )}
          {(section.type === "text" || section.type === "cta" || section.type === "announcement" || section.type === "guarantee") && (
            <>
              {text("title", "Title")}
              {text("body", "Body", true)}
              {section.type === "cta" && text("ctaLabel", "CTA label")}
              {section.type === "cta" && text("ctaUrl", "CTA URL")}
            </>
          )}
          {section.type === "order_form" && (
            <>
              {text("title", "Title")}
              {text("subtitle", "Subtitle")}
              <label className="field">
                <span className="label">Mode</span>
                <select
                  className="input"
                  value={str("mode") || "inline"}
                  onChange={(e) => onSettings(section.id, "mode", e.target.value)}
                >
                  <option value="inline">Inline form</option>
                  <option value="link">Link to /checkout</option>
                </select>
              </label>
              <label className="field">
                <span className="label">Product (empty = page main product)</span>
                <select
                  className="input"
                  value={settings.productId ? String(settings.productId) : ""}
                  onChange={(e) => onSettings(section.id, "productId", e.target.value ? Number(e.target.value) : null)}
                >
                  <option value="">Page main product</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name}
                    </option>
                  ))}
                </select>
              </label>
            </>
          )}
          {(section.type === "images" || section.type === "split") && (
            <>
              {text("title", "Title")}
              {text("body", "Body", true)}
              {text("imageUrl", "Image URL (split)")}
              {section.type === "images" && text("imageUrls", "Image URLs (comma separated)")}
            </>
          )}
          {section.type === "video" && (
            <>
              {text("title", "Title")}
              {text("youtubeId", "YouTube video ID")}
            </>
          )}
          {(section.type === "faq" || section.type === "features" || section.type === "steps" || section.type === "testimonials") && (
            <>
              {text("title", "Title")}
              <p className="text-small text-muted field-full mb-0">
                Items (list) are edited in the JSON below — each item is an object, e.g.{" "}
                <span className="mono">{`{"title":"…","text":"…"}`}</span>.
              </p>
            </>
          )}
          {section.type === "popup" && (
            <>
              {text("title", "Popup title")}
              {text("body", "Body", true)}
              {text("imageUrl", "Image URL")}
              {text("ctaLabel", "CTA label")}
              {text("ctaUrl", "CTA URL")}
              <label className="field field-check">
                <input
                  type="checkbox"
                  checked={Boolean(settings.leadFormEnabled)}
                  onChange={(e) => onSettings(section.id, "leadFormEnabled", e.target.checked)}
                />
                <span>Collect phone (lead form)</span>
              </label>
              {text("leadFormLabel", "Lead form label")}
              <label className="field">
                <span className="label">Delay (1–120s)</span>
                <input
                  className="input"
                  type="number"
                  min={1}
                  max={120}
                  value={Number(settings.delaySeconds ?? 3)}
                  onChange={(e) => onSettings(section.id, "delaySeconds", Number(e.target.value))}
                />
              </label>
              <label className="field">
                <span className="label">Frequency</span>
                <select
                  className="input"
                  value={str("frequency") || "once_session"}
                  onChange={(e) => onSettings(section.id, "frequency", e.target.value)}
                >
                  <option value="every_visit">Every visit</option>
                  <option value="once_session">Once per session</option>
                  <option value="once_day">Once per day</option>
                </select>
              </label>
            </>
          )}
          {(section.type === "ingredients" || section.type === "dosage") && (
            <>
              {text("title", "Title")}
              <label className="field">
                <span className="label">Source</span>
                <select
                  className="input"
                  value={str("source") || "product"}
                  onChange={(e) => onSettings(section.id, "source", e.target.value)}
                >
                  <option value="product">From product record</option>
                  <option value="custom">Custom text below</option>
                </select>
              </label>
              {text("custom", "Custom text", true)}
            </>
          )}
          {section.type === "countdown" && (
            <>
              {text("title", "Title")}
              <label className="field">
                <span className="label">Ends at</span>
                <input
                  className="input"
                  type="datetime-local"
                  value={str("endsAt")}
                  onChange={(e) => onSettings(section.id, "endsAt", e.target.value)}
                />
              </label>
            </>
          )}
          {section.type === "spacer" && (
            <label className="field">
              <span className="label">Height (px)</span>
              <input
                className="input"
                type="number"
                min={8}
                max={400}
                value={Number(settings.height ?? 48)}
                onChange={(e) => onSettings(section.id, "height", Number(e.target.value))}
              />
            </label>
          )}
        </div>

        <div className="field">
          <span className="label">Settings JSON (advanced)</span>
          <textarea className="input mono" rows={8} value={rawJson} onChange={(e) => setRawJson(e.target.value)} />
          {jsonError ? <span className="error-text">{jsonError}</span> : null}
          <button type="button" className="btn btn-outline btn-sm" style={{ marginTop: 8 }} onClick={applyJson}>
            Apply JSON
          </button>
        </div>
      </div>
    </div>
  );
}
