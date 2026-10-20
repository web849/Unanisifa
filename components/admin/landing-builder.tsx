"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowUp,
  BadgeCheck,
  Check,
  Clock,
  Code2,
  Columns2,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  FlaskConical,
  GripVertical,
  HelpCircle,
  Image as ImageIcon,
  Layers,
  ListOrdered,
  Megaphone,
  MessageSquare,
  Minus,
  Monitor,
  MousePointerClick,
  MoveVertical,
  Package,
  Phone,
  Play,
  Quote,
  RefreshCw,
  Rocket,
  Save,
  Search,
  ShieldCheck,
  ShoppingCart,
  Smartphone,
  Sparkles,
  Star,
  Stethoscope,
  Trash2,
  Type,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { DemoCatalogNotice } from "@/components/admin/demo-catalog-notice";
import { LandingSectionEditor } from "@/components/admin/landing-section-editor";
import { LandingPageView } from "@/components/landing/landing-page-view";
import {
  LANDING_THEMES,
  LANDING_THEME_LABEL,
  SECTION_CATALOG,
  SECTION_GROUPS,
  SECTION_TYPE_LABEL,
  createLandingSection,
  defaultSectionsFor,
  isSectionContentEmpty,
  type LandingSection,
  type LandingSectionType,
  type LandingThemeSlug,
} from "@/lib/landing/sections";
import type { LandingProduct } from "@/lib/landing/product-types";
import type { BrandSettings, CommerceSettings } from "@/lib/config";
import type { ProductReview } from "@/lib/db/schema";
import { apiErrorMessage } from "@/lib/admin/api-error-message";
import { formatDateEn, slugify } from "@/lib/utils";

type PageStatus = "draft" | "published" | "archived";

export type LandingBuilderPage = {
  id: number;
  title: string;
  slug: string;
  productId: number | null;
  status: PageStatus;
  themeSlug: string;
  sections: LandingSection[];
  metaTitle: string | null;
  metaDescription: string | null;
  couponCode: string | null;
  checkoutOffers: number[];
  thankYouOffers: number[];
  updatedAt: string;
};

const TYPE_ICON: Record<LandingSectionType, LucideIcon> = {
  hero: Sparkles,
  text: Type,
  split: Columns2,
  images: ImageIcon,
  video: Play,
  html: Code2,
  products: Package,
  order_form: ShoppingCart,
  cta: MousePointerClick,
  features: BadgeCheck,
  steps: ListOrdered,
  faq: HelpCircle,
  testimonials: Quote,
  reviews: Star,
  countdown: Clock,
  popup: MessageSquare,
  announcement: Megaphone,
  guarantee: ShieldCheck,
  contact: Phone,
  divider: Minus,
  spacer: MoveVertical,
  ingredients: FlaskConical,
  dosage: Stethoscope,
  doctor_advice: ShieldCheck,
};

function comparable(value: LandingBuilderPage): string {
  return JSON.stringify({ ...value, updatedAt: "" });
}

function sectionSummary(section: LandingSection): string {
  const settings = section.settings as Record<string, unknown>;
  const title = typeof settings.title === "string" ? settings.title.trim() : "";
  if (title) return title;
  const body = typeof settings.body === "string" ? settings.body.trim() : "";
  if (body) return body.slice(0, 48);
  if (typeof settings.html === "string" && settings.html.trim()) return "Custom HTML";
  return SECTION_TYPE_LABEL[section.type];
}

export function LandingBuilder({
  page,
  products,
  demoFallback,
  coupons,
  brand,
  commerce,
  reviews,
  canWrite,
}: {
  page: LandingBuilderPage;
  products: LandingProduct[];
  demoFallback: boolean;
  coupons: Array<{ code: string }>;
  brand: BrandSettings;
  commerce: CommerceSettings;
  reviews: ProductReview[];
  canWrite: boolean;
}) {
  const router = useRouter();
  const previewRef = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState<LandingBuilderPage>(page);
  const [baseline, setBaseline] = useState(() => comparable(page));
  const [selectedId, setSelectedId] = useState<number | null>(page.sections[0]?.id ?? null);
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [message, setMessage] = useState<{ tone: "ok" | "err"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [importState, setImportState] = useState<"idle" | "running" | "done">("idle");
  const [paletteQuery, setPaletteQuery] = useState("");
  const [dragId, setDragId] = useState<number | null>(null);
  const [pageSettingsOpen, setPageSettingsOpen] = useState(true);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const readOnly = !canWrite;
  const selected = useMemo(
    () => draft.sections.find((section) => section.id === selectedId) ?? null,
    [draft.sections, selectedId],
  );
  const dirty = useMemo(() => comparable(draft) !== baseline, [draft, baseline]);
  const mainProduct = useMemo(
    () => (draft.productId ? products.find((product) => product.id === draft.productId) ?? null : null),
    [draft.productId, products],
  );
  const visiblePopupCount = draft.sections.filter((section) => section.type === "popup" && !section.hidden).length;

  /* ডেটাবেজ খালি থাকলে ডেমো ক্যাটালগ আগে ইমপোর্ট করতে হবে, নাহলে পেজের
     productId/offer আইডি ডেটাবেজে থাকবে না। শুধু ডেমো পণ্য ব্যবহার করলে ইমপোর্ট। */
  const needsDemoImport = useMemo(() => {
    if (!demoFallback) return false;
    if (mainProduct?.isDemo) return true;
    const demoIds = new Set(products.filter((product) => product.isDemo).map((product) => product.id));
    if (draft.checkoutOffers.some((id) => demoIds.has(id))) return true;
    if (draft.thankYouOffers.some((id) => demoIds.has(id))) return true;
    return draft.sections.some((section) =>
      demoIds.has(Number((section.settings as Record<string, unknown>).productId)),
    );
  }, [demoFallback, mainProduct, products, draft.checkoutOffers, draft.thankYouOffers, draft.sections]);

  const setDraftField = <K extends keyof LandingBuilderPage>(key: K, value: LandingBuilderPage[K]) =>
    setDraft((previous) => ({ ...previous, [key]: value }));

  const nextId = () =>
    draft.sections.length > 0 ? Math.max(...draft.sections.map((section) => section.id)) + 1 : 1;

  const scrollToPreviewSection = useCallback((id: number) => {
    window.requestAnimationFrame(() => {
      const node = previewRef.current?.querySelector(`[data-preview-section="${id}"]`);
      node?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }, []);

  const selectSection = (id: number, scroll = true) => {
    setSelectedId(id);
    if (scroll) scrollToPreviewSection(id);
  };

  const addSection = (type: LandingSectionType) => {
    if (readOnly) return;
    if (type === "popup" && visiblePopupCount >= 3) {
      setMessage({ tone: "err", text: "Maximum 3 visible popup blocks per page." });
      return;
    }
    const section = createLandingSection(type, nextId(), {
      pageTitle: draft.title,
      productName: mainProduct?.name ?? null,
      productImage: mainProduct?.image ?? null,
    });
    setDraft((previous) => ({ ...previous, sections: [...previous.sections, section] }));
    setSelectedId(section.id);
    setMessage(null);
    scrollToPreviewSection(section.id);
  };

  const updateSection = (id: number, patch: Partial<LandingSection>) =>
    setDraft((previous) => ({
      ...previous,
      sections: previous.sections.map((section) => (section.id === id ? { ...section, ...patch } : section)),
    }));

  const updateSettings = (id: number, patch: Record<string, unknown>) =>
    setDraft((previous) => ({
      ...previous,
      sections: previous.sections.map((section) =>
        section.id === id ? { ...section, settings: { ...section.settings, ...patch } } : section,
      ),
    }));

  const replaceSettings = (id: number, settings: Record<string, unknown>) =>
    updateSection(id, { settings });

  const moveSection = (id: number, direction: -1 | 1) =>
    setDraft((previous) => {
      const index = previous.sections.findIndex((section) => section.id === id);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= previous.sections.length) return previous;
      const sections = [...previous.sections];
      const [item] = sections.splice(index, 1);
      sections.splice(target, 0, item);
      return { ...previous, sections };
    });

  const reorder = (fromId: number, toId: number) =>
    setDraft((previous) => {
      const from = previous.sections.findIndex((section) => section.id === fromId);
      const to = previous.sections.findIndex((section) => section.id === toId);
      if (from < 0 || to < 0 || from === to) return previous;
      const sections = [...previous.sections];
      const [item] = sections.splice(from, 1);
      sections.splice(to, 0, item);
      return { ...previous, sections };
    });

  const duplicateSection = (id: number) => {
    if (readOnly) return;
    const newId = nextId();
    setDraft((previous) => {
      const index = previous.sections.findIndex((section) => section.id === id);
      if (index < 0) return previous;
      const source = previous.sections[index];
      const copy: LandingSection = {
        ...source,
        id: newId,
        settings: JSON.parse(JSON.stringify(source.settings)) as Record<string, unknown>,
        design: source.design ? { ...source.design } : undefined,
      };
      const sections = [...previous.sections];
      sections.splice(index + 1, 0, copy);
      return { ...previous, sections };
    });
    setSelectedId(newId);
    scrollToPreviewSection(newId);
  };

  const removeSection = (id: number) => {
    if (readOnly) return;
    setDraft((previous) => ({ ...previous, sections: previous.sections.filter((section) => section.id !== id) }));
    setSelectedId((current) => {
      if (current !== id) return current;
      const remaining = draft.sections.filter((section) => section.id !== id);
      return remaining[0]?.id ?? null;
    });
  };

  const resetTemplate = () => {
    if (readOnly) return;
    if (!window.confirm("Replace all sections with the 10-block starter template?")) return;
    const sections = defaultSectionsFor(draft.title);
    setDraft((previous) => ({ ...previous, sections }));
    setSelectedId(sections[0]?.id ?? null);
    setMessage({ tone: "ok", text: "Starter template applied — save to keep it." });
  };

  const ensureDemoCatalog = async (): Promise<boolean> => {
    if (!demoFallback) return true;
    setImportState("running");
    try {
      const response = await fetch("/api/admin/demo-catalog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      const payload = (await response.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
      if (!response.ok || !payload?.ok) {
        setMessage({ tone: "err", text: apiErrorMessage(payload, "Could not import the demo catalog.", response.status) });
        setImportState("idle");
        return false;
      }
      setImportState("done");
      return true;
    } catch {
      setMessage({ tone: "err", text: "Network error while importing the demo catalog." });
      setImportState("idle");
      return false;
    }
  };

  const persist = async (overrides: Partial<LandingBuilderPage> = {}) => {
    if (readOnly) {
      setMessage({ tone: "err", text: "Your role is read-only." });
      return;
    }
    const payload: LandingBuilderPage = { ...draft, ...overrides };
    const title = payload.title.trim();
    const slug = slugify(payload.slug || title);
    if (title.length < 2) {
      setMessage({ tone: "err", text: "Title must be at least 2 characters." });
      return;
    }
    if (!slug) {
      setMessage({ tone: "err", text: "Slug could not be generated — use English letters or Bangla text." });
      return;
    }
    if (payload.sections.filter((section) => section.type === "popup" && !section.hidden).length > 3) {
      setMessage({ tone: "err", text: "Maximum 3 visible popup blocks per page." });
      return;
    }

    setBusy(true);
    setMessage(null);

    if (needsDemoImport && !(await ensureDemoCatalog())) {
      setBusy(false);
      return;
    }

    const nextDraft: LandingBuilderPage = { ...payload, title, slug };
    try {
      const response = await fetch(`/api/admin/landing-pages/${draft.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: nextDraft.title,
          slug: nextDraft.slug,
          productId: nextDraft.productId,
          status: nextDraft.status,
          themeSlug: nextDraft.themeSlug,
          sections: nextDraft.sections,
          metaTitle: nextDraft.metaTitle ?? "",
          metaDescription: nextDraft.metaDescription ?? "",
          couponCode: nextDraft.couponCode ?? "",
          checkoutOffers: nextDraft.checkoutOffers,
          thankYouOffers: nextDraft.thankYouOffers,
        }),
      });
      const json = (await response.json().catch(() => null)) as {
        ok?: boolean;
        error?: string;
        fieldErrors?: Record<string, unknown>;
        formErrors?: unknown;
      } | null;
      if (!response.ok || !json?.ok) {
        setMessage({ tone: "err", text: apiErrorMessage(json, "Save failed.", response.status) });
        return;
      }
      const savedDraft = { ...nextDraft, updatedAt: new Date().toISOString() };
      setDraft(savedDraft);
      setBaseline(comparable(savedDraft));
      setMessage({
        tone: "ok",
        text: nextDraft.status === "published" ? "Saved and published." : "Draft saved.",
      });
      router.refresh();
    } catch {
      setMessage({ tone: "err", text: "Network error. Your changes are still here — try again." });
    } finally {
      setBusy(false);
      setImportState("idle");
    }
  };

  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        if (!busy) void persist();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  const palette = useMemo(() => {
    const query = paletteQuery.trim().toLowerCase();
    return SECTION_GROUPS.map((group) => ({
      ...group,
      items: SECTION_CATALOG.filter((item) => {
        if (item.group !== group.id) return false;
        if (!query) return true;
        return `${item.label} ${item.type} ${item.description}`.toLowerCase().includes(query);
      }),
    })).filter((group) => group.items.length > 0);
  }, [paletteQuery]);

  const toggleOffer = (key: "checkoutOffers" | "thankYouOffers", productId: number) => {
    setDraft((previous) => {
      const list = previous[key];
      const next = list.includes(productId)
        ? list.filter((id) => id !== productId)
        : [...list, productId].slice(0, 6);
      return { ...previous, [key]: next };
    });
  };

  const previewPage = {
    id: draft.id,
    title: draft.title,
    slug: draft.slug,
    themeSlug: draft.themeSlug,
    productId: draft.productId,
    couponCode: draft.couponCode,
    sections: draft.sections,
  };

  return (
    <div className="lp-builder">
      <div className="lp-builder-toolbar">
        <div className="lp-builder-toolbar-title">
          <span className="lp-builder-mark" aria-hidden="true">
            <Rocket />
          </span>
          <div>
            <p className="lp-builder-kicker">Landing page builder</p>
            <h2 className="lp-builder-page-title">{draft.title || "Untitled page"}</h2>
            <p className="text-small text-muted mb-0">
              <span className="mono">/offer/{draft.slug || "…"}</span>
              <span className={`badge badge-${draft.status === "published" ? "active" : "draft"}`}>{draft.status}</span>
              <span className={dirty ? "lp-dirty-dot lp-dirty-on" : "lp-dirty-dot"}>
                {dirty ? "Unsaved changes" : "All changes saved"}
              </span>
            </p>
          </div>
        </div>

        <div className="lp-builder-toolbar-actions">
          <Link className="btn btn-outline btn-sm" href={`/admin/landing-pages/${draft.id}/preview`} target="_blank">
            <ExternalLink aria-hidden="true" />
            Full preview
          </Link>
          {draft.status === "published" ? (
            <Link className="btn btn-ghost btn-sm" href={`/offer/${draft.slug}`} target="_blank">
              <Eye aria-hidden="true" />
              Live page
            </Link>
          ) : null}
          <button
            type="button"
            className="btn btn-outline btn-sm"
            disabled={busy || readOnly}
            onClick={() => void persist({ status: draft.status === "published" ? "draft" : "published" })}
          >
            <Rocket aria-hidden="true" />
            {draft.status === "published" ? "Unpublish" : "Publish"}
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            disabled={busy || readOnly || !dirty}
            onClick={() => void persist()}
          >
            {busy ? <RefreshCw aria-hidden="true" className="spin" /> : <Save aria-hidden="true" />}
            {busy ? "Saving…" : importState === "running" ? "Importing demo…" : "Save"}
          </button>
        </div>
      </div>

      {readOnly ? (
        <div className="pending-note">
          Your role is read-only. You can inspect and preview this page, but changes cannot be saved.
        </div>
      ) : null}

      {message ? (
        <p className={message.tone === "ok" ? "ok-text" : "error-text"} role="status">
          {message.tone === "ok" ? <Check aria-hidden="true" /> : <X aria-hidden="true" />}
          {message.text}
        </p>
      ) : null}

      {demoFallback ? <DemoCatalogNotice demoCount={products.length} compact /> : null}

      <div className="lp-builder-layout">
        {/* ---------------- Left: page settings + sections + palette ---------------- */}
        <aside className="lp-builder-side">
          <section className="panel">
            <div className="panel-head">
              <h3 className="panel-title">Page</h3>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setPageSettingsOpen((value) => !value)}
              >
                {pageSettingsOpen ? "Collapse" : "Expand"}
              </button>
            </div>
            {pageSettingsOpen ? (
              <div className="panel-body stack stack-sm">
                <label className="field">
                  <span className="label">Title</span>
                  <input
                    className="input"
                    value={draft.title}
                    disabled={readOnly}
                    onChange={(event) => setDraftField("title", event.target.value)}
                  />
                </label>
                <label className="field">
                  <span className="label">Slug</span>
                  <div className="lp-slug-input">
                    <span>/offer/</span>
                    <input
                      className="input mono"
                      value={draft.slug}
                      disabled={readOnly}
                      onChange={(event) => setDraftField("slug", event.target.value)}
                      onBlur={(event) => setDraftField("slug", slugify(event.target.value || draft.title))}
                    />
                  </div>
                </label>
                <div className="grid-2">
                  <label className="field">
                    <span className="label">Status</span>
                    <select
                      className="input"
                      value={draft.status}
                      disabled={readOnly}
                      onChange={(event) => setDraftField("status", event.target.value as PageStatus)}
                    >
                      <option value="draft">Draft</option>
                      <option value="published">Published</option>
                      <option value="archived">Archived</option>
                    </select>
                  </label>
                  <label className="field">
                    <span className="label">Theme</span>
                    <select
                      className="input"
                      value={draft.themeSlug}
                      disabled={readOnly}
                      onChange={(event) => setDraftField("themeSlug", event.target.value)}
                    >
                      {LANDING_THEMES.map((theme) => (
                        <option key={theme} value={theme}>
                          {LANDING_THEME_LABEL[theme]}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="lp-theme-swatches" aria-hidden="true">
                  {LANDING_THEMES.map((theme) => (
                    <button
                      key={theme}
                      type="button"
                      className={`lp-theme-swatch lp-theme-${theme}${draft.themeSlug === theme ? " lp-theme-swatch-on" : ""}`}
                      title={LANDING_THEME_LABEL[theme]}
                      disabled={readOnly}
                      onClick={() => setDraftField("themeSlug", theme satisfies LandingThemeSlug)}
                    >
                      <span />
                      <span />
                      <span />
                    </button>
                  ))}
                </div>
                <label className="field">
                  <span className="label">Main product</span>
                  <select
                    className="input"
                    value={draft.productId ?? ""}
                    disabled={readOnly}
                    onChange={(event) =>
                      setDraftField("productId", event.target.value ? Number(event.target.value) : null)
                    }
                  >
                    <option value="">— none —</option>
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name}
                        {product.isDemo ? " (demo)" : ""}
                        {product.status !== "active" ? ` · ${product.status}` : ""}
                      </option>
                    ))}
                  </select>
                  <span className="help-text">
                    Order form, ingredients, dosage ও products block এই পণ্যটি ব্যবহার করে।
                    {products.length === 0 ? (
                      <>
                        {" "}
                        No products yet — add one in{" "}
                        <Link href="/admin/products">Products</Link>.
                      </>
                    ) : null}
                  </span>
                </label>
                <label className="field">
                  <span className="label">Auto-applied coupon</span>
                  <select
                    className="input"
                    value={draft.couponCode ?? ""}
                    disabled={readOnly}
                    onChange={(event) => setDraftField("couponCode", event.target.value || null)}
                  >
                    <option value="">— none —</option>
                    {coupons.map((coupon) => (
                      <option key={coupon.code} value={coupon.code}>
                        {coupon.code}
                      </option>
                    ))}
                  </select>
                </label>

                <details className="lp-advanced" open={advancedOpen} onToggle={(event) => setAdvancedOpen((event.currentTarget as HTMLDetailsElement).open)}>
                  <summary>SEO & funnels</summary>
                  <div className="stack stack-sm">
                    <label className="field">
                      <span className="label">Meta title</span>
                      <input
                        className="input"
                        maxLength={255}
                        value={draft.metaTitle ?? ""}
                        disabled={readOnly}
                        onChange={(event) => setDraftField("metaTitle", event.target.value || null)}
                      />
                    </label>
                    <label className="field">
                      <span className="label">Meta description</span>
                      <textarea
                        className="input"
                        rows={2}
                        maxLength={500}
                        value={draft.metaDescription ?? ""}
                        disabled={readOnly}
                        onChange={(event) => setDraftField("metaDescription", event.target.value || null)}
                      />
                    </label>
                    <div className="field">
                      <span className="label">Checkout offers</span>
                      <div className="chip-row">
                        {products.map((product) => (
                          <button
                            key={product.id}
                            type="button"
                            className={`chip ${draft.checkoutOffers.includes(product.id) ? "chip-on" : ""}`}
                            aria-pressed={draft.checkoutOffers.includes(product.id)}
                            disabled={readOnly}
                            onClick={() => toggleOffer("checkoutOffers", product.id)}
                          >
                            {product.name}
                          </button>
                        ))}
                      </div>
                      <span className="help-text">On /checkout when this page sends a customer there.</span>
                    </div>
                    <div className="field">
                      <span className="label">Thank-you offers</span>
                      <div className="chip-row">
                        {products.map((product) => (
                          <button
                            key={product.id}
                            type="button"
                            className={`chip ${draft.thankYouOffers.includes(product.id) ? "chip-on" : ""}`}
                            aria-pressed={draft.thankYouOffers.includes(product.id)}
                            disabled={readOnly}
                            onClick={() => toggleOffer("thankYouOffers", product.id)}
                          >
                            {product.name}
                          </button>
                        ))}
                      </div>
                      <span className="help-text">Downsell shown after an order is placed.</span>
                    </div>
                  </div>
                </details>
              </div>
            ) : null}
          </section>

          <section className="panel">
            <div className="panel-head">
              <h3 className="panel-title">
                Blocks <span className="text-muted">({draft.sections.length})</span>
              </h3>
              <button type="button" className="btn btn-outline btn-sm" disabled={readOnly} onClick={resetTemplate}>
                <Layers aria-hidden="true" />
                Starter template
              </button>
            </div>
            <div className="panel-body lp-section-list">
              {draft.sections.map((section, index) => {
                const Icon = TYPE_ICON[section.type] ?? Layers;
                const hidden = Boolean(section.hidden);
                const empty = isSectionContentEmpty(section, { hasProduct: Boolean(mainProduct) });
                return (
                  <div
                    key={section.id}
                    className={`lp-section-row${selectedId === section.id ? " lp-section-row-on" : ""}`}
                    data-hidden={hidden ? "true" : "false"}
                    data-drag-over={dragId !== null && dragId !== section.id ? "true" : "false"}
                    role="button"
                    tabIndex={0}
                    draggable={!readOnly}
                    onDragStart={(event) => {
                      setDragId(section.id);
                      event.dataTransfer.effectAllowed = "move";
                      event.dataTransfer.setData("text/plain", String(section.id));
                    }}
                    onDragOver={(event) => {
                      if (dragId === null || dragId === section.id) return;
                      event.preventDefault();
                      event.dataTransfer.dropEffect = "move";
                    }}
                    onDrop={(event) => {
                      event.preventDefault();
                      if (dragId !== null && dragId !== section.id) reorder(dragId, section.id);
                      setDragId(null);
                    }}
                    onDragEnd={() => setDragId(null)}
                    onClick={() => selectSection(section.id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        selectSection(section.id);
                      }
                    }}
                  >
                    <span className="lp-drag-handle" aria-hidden="true">
                      <GripVertical />
                    </span>
                    <span className="lp-section-row-icon" aria-hidden="true">
                      <Icon />
                    </span>
                    <span className="lp-section-row-main">
                      <strong>
                        {SECTION_TYPE_LABEL[section.type]}
                        <span className="lp-section-index">{index + 1}</span>
                      </strong>
                      <span className="lp-section-row-summary">
                        {sectionSummary(section)}
                        {empty ? <span className="lp-section-empty">empty</span> : null}
                        {hidden ? <span className="lp-section-hidden">hidden</span> : null}
                      </span>
                    </span>
                    <span className="lp-section-row-actions">
                      <button
                        type="button"
                        className="builder-icon-btn"
                        aria-label="Move block up"
                        disabled={readOnly || index === 0}
                        onClick={(event) => {
                          event.stopPropagation();
                          moveSection(section.id, -1);
                        }}
                      >
                        <ArrowUp aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        className="builder-icon-btn"
                        aria-label="Move block down"
                        disabled={readOnly || index === draft.sections.length - 1}
                        onClick={(event) => {
                          event.stopPropagation();
                          moveSection(section.id, 1);
                        }}
                      >
                        <ArrowDown aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        className="builder-icon-btn"
                        aria-label={hidden ? "Show block" : "Hide block"}
                        disabled={readOnly}
                        onClick={(event) => {
                          event.stopPropagation();
                          updateSection(section.id, { hidden: !hidden });
                        }}
                      >
                        {hidden ? <Eye aria-hidden="true" /> : <EyeOff aria-hidden="true" />}
                      </button>
                      <button
                        type="button"
                        className="builder-icon-btn"
                        aria-label="Duplicate block"
                        disabled={readOnly}
                        onClick={(event) => {
                          event.stopPropagation();
                          duplicateSection(section.id);
                        }}
                      >
                        <Copy aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        className="builder-icon-btn builder-icon-danger"
                        aria-label="Delete block"
                        disabled={readOnly}
                        onClick={(event) => {
                          event.stopPropagation();
                          if (window.confirm(`Delete "${SECTION_TYPE_LABEL[section.type]}" block?`)) {
                            removeSection(section.id);
                          }
                        }}
                      >
                        <Trash2 aria-hidden="true" />
                      </button>
                    </span>
                  </div>
                );
              })}
              {draft.sections.length === 0 ? (
                <div className="lp-builder-empty">
                  <Layers aria-hidden="true" />
                  <p className="mb-0">No blocks yet. Add one from the palette or apply the starter template.</p>
                </div>
              ) : null}
            </div>
          </section>

          <section className="panel">
            <div className="panel-head">
              <h3 className="panel-title">Add block</h3>
            </div>
            <div className="panel-body stack stack-sm">
              <label className="lp-palette-search">
                <Search aria-hidden="true" />
                <span className="sr-only">Search blocks</span>
                <input
                  className="input"
                  placeholder="Search blocks…"
                  value={paletteQuery}
                  onChange={(event) => setPaletteQuery(event.target.value)}
                />
              </label>
              {palette.map((group) => (
                <div key={group.id} className="lp-palette-group">
                  <p className="admin-nav-title">{group.label}</p>
                  <div className="lp-palette-grid">
                    {group.items.map((item) => {
                      const Icon = TYPE_ICON[item.type] ?? Layers;
                      const popupFull = item.type === "popup" && visiblePopupCount >= 3;
                      return (
                        <button
                          key={item.type}
                          type="button"
                          className="lp-palette-btn"
                          title={popupFull ? "Maximum 3 visible popups" : item.description}
                          disabled={readOnly || popupFull}
                          onClick={() => addSection(item.type)}
                        >
                          <Icon aria-hidden="true" />
                          <span>{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
              {palette.length === 0 ? <p className="text-small text-muted mb-0">No block matches this search.</p> : null}
            </div>
          </section>
        </aside>

        {/* ---------------- Center: live preview ---------------- */}
        <section className="lp-builder-stage">
          <div className="lp-stage-head">
            <div>
              <p className="eyebrow">Live preview</p>
              <p className="text-small text-muted mb-0">Click any block in the preview to edit it.</p>
            </div>
            <div className="lp-device-toggle" role="group" aria-label="Preview width">
              <button
                type="button"
                className={device === "desktop" ? "is-on" : undefined}
                aria-pressed={device === "desktop"}
                onClick={() => setDevice("desktop")}
              >
                <Monitor aria-hidden="true" />
                Desktop
              </button>
              <button
                type="button"
                className={device === "mobile" ? "is-on" : undefined}
                aria-pressed={device === "mobile"}
                onClick={() => setDevice("mobile")}
              >
                <Smartphone aria-hidden="true" />
                Mobile
              </button>
            </div>
          </div>

          <div className="lp-preview-shell">
            <div className="lp-preview-chrome" aria-hidden="true">
              <span />
              <span />
              <span />
              <span className="lp-preview-url">/offer/{draft.slug || "preview"}</span>
            </div>
            <div
              ref={previewRef}
              className={`lp-preview-viewport${device === "mobile" ? " lp-preview-viewport-mobile" : ""}`}
              onClickCapture={(event) => {
                event.preventDefault();
                event.stopPropagation();
                const node = (event.target as HTMLElement).closest("[data-preview-section]");
                if (!node) return;
                const id = Number(node.getAttribute("data-preview-section"));
                if (Number.isInteger(id) && id > 0) setSelectedId(id);
              }}
              onSubmitCapture={(event) => {
                event.preventDefault();
                event.stopPropagation();
              }}
            >
              {draft.sections.length === 0 ? (
                <div className="lp-preview-empty">
                  <Layers aria-hidden="true" />
                  <strong>Your page is empty</strong>
                  <p>Add a block from the palette or apply the starter template.</p>
                </div>
              ) : (
                <LandingPageView
                  page={previewPage}
                  products={products}
                  reviews={reviews}
                  brand={brand}
                  commerce={commerce}
                  preview
                  activeSectionId={selectedId}
                />
              )}
            </div>
          </div>

          <p className="text-small text-muted lp-stage-footnote mb-0">
            This canvas renders your draft live — unsaved edits appear immediately. Popup blocks open as
            overlays on the public page.
            <span> Last saved: {formatDateEn(draft.updatedAt)}</span>
          </p>
        </section>

        {/* ---------------- Right: inspector ---------------- */}
        <aside className="lp-builder-side-right">
          {selected ? (
            <section className="panel">
              <div className="panel-head">
                <h3 className="panel-title">Block settings</h3>
                <div className="field-row">
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    disabled={readOnly}
                    onClick={() => duplicateSection(selected.id)}
                  >
                    <Copy aria-hidden="true" />
                    Duplicate
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger btn-sm"
                    disabled={readOnly}
                    onClick={() => removeSection(selected.id)}
                  >
                    <Trash2 aria-hidden="true" />
                    Delete
                  </button>
                </div>
              </div>
              <div className="panel-body">
                <LandingSectionEditor
                  section={selected}
                  products={products}
                  mainProduct={mainProduct}
                  readOnly={readOnly}
                  onChangeSettings={updateSettings}
                  onReplaceSettings={replaceSettings}
                  onPatch={updateSection}
                />
              </div>
            </section>
          ) : (
            <div className="panel">
              <div className="panel-body lp-inspector-empty">
                <MousePointerClick aria-hidden="true" />
                <strong>Select a block</strong>
                <p className="text-small text-muted mb-0">Choose a block on the left or click it in the preview.</p>
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
