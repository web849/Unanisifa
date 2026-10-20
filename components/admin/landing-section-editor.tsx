"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Code2, Image as ImageIcon, Plus, Trash2 } from "lucide-react";
import type { LandingProduct } from "@/lib/landing/product-types";
import {
  SECTION_CATALOG,
  type LandingSection,
  type LandingSectionType,
} from "@/lib/landing/sections";
import { sanitizeLandingHtml } from "@/lib/landing/html";
import {
  CONNECTED_PRODUCT_HTML_TEMPLATE,
  LANDING_HTML_TOKEN_GUIDE,
  applyLandingHtmlTokens,
} from "@/lib/landing/html-tokens";
import type { BrandSettings } from "@/lib/config";
import { formatTakaEn } from "@/lib/utils";
import { UploadButton } from "@/components/admin/image-field";
import { MediaPicker } from "@/components/admin/media-library";
import { MediaCopyActions } from "@/components/admin/media-copy-actions";

type Settings = Record<string, unknown>;

type Props = {
  section: LandingSection;
  products: LandingProduct[];
  mainProduct: LandingProduct | null;
  brand?: BrandSettings;
  couponCode?: string | null;
  readOnly?: boolean;
  onChangeSettings: (id: number, patch: Settings) => void;
  onReplaceSettings: (id: number, settings: Settings) => void;
  onPatch: (id: number, patch: Partial<LandingSection>) => void;
};

const ITEM_FIELDS: Partial<
  Record<LandingSectionType, Array<{ key: string; label: string; type?: "text" | "textarea" | "select"; options?: string[] }>>
> = {
  features: [
    { key: "icon", label: "Icon", type: "select", options: ["Leaf", "Banknote", "Truck", "ShieldCheck", "Star", "Clock", "Heart", "Sparkles", "BadgeCheck", "Package", "Award"] },
    { key: "title", label: "Title" },
    { key: "text", label: "Text", type: "textarea" },
  ],
  steps: [
    { key: "title", label: "Step title" },
    { key: "text", label: "Description", type: "textarea" },
  ],
  faq: [
    { key: "q", label: "Question" },
    { key: "a", label: "Answer", type: "textarea" },
  ],
  testimonials: [
    { key: "name", label: "Customer name" },
    { key: "text", label: "Testimonial", type: "textarea" },
  ],
};

const HTML_SNIPPETS: Array<{ label: string; html: string }> = [
  {
    label: "Note box",
    html: '<div style="padding:16px 18px;border:1px solid #e4e0d3;border-radius:12px;background:#ffffff">\n  <strong style="color:#073a2e">গুরুত্বপূর্ণ নোট</strong>\n  <p style="margin:6px 0 0;color:#5b6b64">এখানে আপনার বার্তা লিখুন।</p>\n</div>',
  },
  {
    label: "Two columns",
    html: '<div style="display:grid;gap:16px;grid-template-columns:repeat(auto-fit,minmax(220px,1fr))">\n  <div style="padding:16px;border:1px solid #e4e0d3;border-radius:12px;background:#ffffff">\n    <h3 style="margin:0 0 6px;color:#073a2e">প্রথম কলাম</h3>\n    <p style="margin:0;color:#5b6b64">বর্ণনা লিখুন।</p>\n  </div>\n  <div style="padding:16px;border:1px solid #e4e0d3;border-radius:12px;background:#ffffff">\n    <h3 style="margin:0 0 6px;color:#073a2e">দ্বিতীয় কলাম</h3>\n    <p style="margin:0;color:#5b6b64">বর্ণনা লিখুন।</p>\n  </div>\n</div>',
  },
  {
    label: "Image + text",
    html: '<div style="display:grid;gap:18px;grid-template-columns:100px 1fr;align-items:center">\n  <img src="/images/demo/p-01.svg" alt="পণ্যের ছবি" width="100" height="100" style="border-radius:12px;border:1px solid #e4e0d3" />\n  <div>\n    <h3 style="margin:0 0 6px;color:#073a2e">পণ্যের নাম</h3>\n    <p style="margin:0;color:#5b6b64">সংক্ষিপ্ত বিবরণ।</p>\n  </div>\n</div>',
  },
];

function isHexColor(value: string): boolean {
  return /^#[0-9a-f]{3,8}$/i.test(value.trim());
}

function StringField({
  label,
  value,
  onChange,
  placeholder,
  hint,
  multiline = false,
  rows = 3,
  mono = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  hint?: string;
  multiline?: boolean;
  rows?: number;
  mono?: boolean;
}) {
  return (
    <label className="field">
      <span className="label">{label}</span>
      {multiline ? (
        <textarea
          className={`input${mono ? " mono" : ""}`}
          rows={rows}
          value={value}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : (
        <input
          className={`input${mono ? " mono" : ""}`}
          value={value}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
      {hint ? <span className="help-text">{hint}</span> : null}
    </label>
  );
}

/** ছবির URL ফিল্ড + সরাসরি আপলোড বোতাম (ল্যান্ডিং বিল্ডারের জন্য) */
function ImageUrlField({
  label,
  value,
  onChange,
  placeholder,
  hint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  hint?: string;
}) {
  return (
    <div className="field">
      <span className="label">{label}</span>
      <div className="image-field-row">
        <input
          className="input mono"
          value={value}
          placeholder={placeholder ?? "https://… or /images/…"}
          onChange={(event) => onChange(event.target.value)}
        />
        <UploadButton folder="media" onUploaded={onChange} alt={label} />
      </div>
      {value ? <MediaCopyActions url={value} alt={label} compact showOpen={false} /> : null}
      {hint ? <span className="help-text">{hint}</span> : null}
    </div>
  );
}

function NumberField({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  hint,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  hint?: string;
}) {
  return (
    <label className="field">
      <span className="label">{label}</span>
      <input
        className="input"
        type="number"
        min={min}
        max={max}
        step={step}
        value={Number.isFinite(value) ? value : min}
        onChange={(event) => {
          const next = Number(event.target.value);
          onChange(Math.min(Math.max(Number.isFinite(next) ? next : min, min), max));
        }}
      />
      {hint ? <span className="help-text">{hint}</span> : null}
    </label>
  );
}

function ItemListEditor({
  sectionType,
  items,
  onChange,
  readOnly,
}: {
  sectionType: LandingSectionType;
  items: Settings[];
  onChange: (items: Settings[]) => void;
  readOnly?: boolean;
}) {
  const fields = ITEM_FIELDS[sectionType] ?? [];
  const singular = sectionType === "faq" ? "question" : sectionType === "testimonials" ? "testimonial" : "item";

  const updateItem = (index: number, key: string, value: string) => {
    const next = items.map((item, itemIndex) => (itemIndex === index ? { ...item, [key]: value } : item));
    onChange(next);
  };

  const moveItem = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    const [row] = next.splice(index, 1);
    next.splice(target, 0, row);
    onChange(next);
  };

  return (
    <div className="field field-full">
      <div className="row-between row-wrap mb-2">
        <span className="label mb-0">Items ({items.length})</span>
        <button
          type="button"
          className="btn btn-outline btn-sm"
          disabled={readOnly || items.length >= 20}
          onClick={() => onChange([...items, {}])}
        >
          <Plus aria-hidden="true" />
          Add {singular}
        </button>
      </div>
      <div className="lp-item-list">
        {items.map((item, index) => (
          <div className="lp-item-card" key={index}>
            <div className="lp-item-card-head">
              <strong>
                {singular} {index + 1}
              </strong>
              <div className="field-row">
                <button
                  type="button"
                  className="icon-btn"
                  aria-label="Move item up"
                  disabled={readOnly || index === 0}
                  onClick={() => moveItem(index, -1)}
                >
                  <ArrowUp aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className="icon-btn"
                  aria-label="Move item down"
                  disabled={readOnly || index === items.length - 1}
                  onClick={() => moveItem(index, 1)}
                >
                  <ArrowDown aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className="icon-btn"
                  aria-label="Remove item"
                  disabled={readOnly}
                  onClick={() => onChange(items.filter((_, itemIndex) => itemIndex !== index))}
                >
                  <Trash2 aria-hidden="true" />
                </button>
              </div>
            </div>
            <div className="lp-item-card-body">
              {fields.map((field) =>
                field.type === "select" ? (
                  <label className="field" key={field.key}>
                    <span className="label">{field.label}</span>
                    <select
                      className="input"
                      value={String(item[field.key] ?? field.options?.[0] ?? "")}
                      disabled={readOnly}
                      onChange={(event) => updateItem(index, field.key, event.target.value)}
                    >
                      {(field.options ?? []).map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : (
                  <label className="field" key={field.key}>
                    <span className="label">{field.label}</span>
                    {field.type === "textarea" ? (
                      <textarea
                        className="input"
                        rows={2}
                        value={String(item[field.key] ?? "")}
                        disabled={readOnly}
                        onChange={(event) => updateItem(index, field.key, event.target.value)}
                      />
                    ) : (
                      <input
                        className="input"
                        value={String(item[field.key] ?? "")}
                        disabled={readOnly}
                        onChange={(event) => updateItem(index, field.key, event.target.value)}
                      />
                    )}
                  </label>
                ),
              )}
            </div>
          </div>
        ))}
        {items.length === 0 ? (
          <p className="text-small text-muted mb-0">
            এখনো কোনো {singular} নেই। উপরের বোতাম দিয়ে যোগ করুন।
          </p>
        ) : null}
      </div>
    </div>
  );
}

function ImagesEditor({
  images,
  onChange,
  readOnly,
}: {
  images: Array<{ url: string; alt: string }>;
  onChange: (images: Array<{ url: string; alt: string }>) => void;
  readOnly?: boolean;
}) {
  return (
    <div className="field field-full">
      <div className="row-between row-wrap mb-2">
        <span className="label mb-0">Images ({images.length})</span>
        <button
          type="button"
          className="btn btn-outline btn-sm"
          disabled={readOnly || images.length >= 12}
          onClick={() => onChange([...images, { url: "", alt: "" }])}
        >
          <Plus aria-hidden="true" />
          Add image
        </button>
      </div>
      <div className="lp-image-rows">
        {images.map((image, index) => (
          <div className="lp-image-row" key={index}>
            <div className="lp-image-thumb" aria-hidden="true">
              {image.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={image.url} alt="" />
              ) : (
                <ImageIcon />
              )}
            </div>
            <div className="lp-image-fields">
              <div className="image-field-row">
                <input
                  className="input mono"
                  placeholder="https://… or /images/…"
                  value={image.url}
                  disabled={readOnly}
                  onChange={(event) =>
                    onChange(images.map((item, itemIndex) => (itemIndex === index ? { ...item, url: event.target.value } : item)))
                  }
                />
                <UploadButton
                  folder="media"
                  label="ছবি"
                  alt={image.alt || "landing image"}
                  disabled={readOnly}
                  onUploaded={(url) =>
                    onChange(images.map((item, itemIndex) => (itemIndex === index ? { ...item, url } : item)))
                  }
                />
              </div>
              <input
                className="input"
                placeholder="Alt text"
                value={image.alt}
                disabled={readOnly}
                onChange={(event) =>
                  onChange(images.map((item, itemIndex) => (itemIndex === index ? { ...item, alt: event.target.value } : item)))
                }
              />
            </div>
            <button
              type="button"
              className="icon-btn"
              aria-label="Remove image"
              disabled={readOnly}
              onClick={() => onChange(images.filter((_, itemIndex) => itemIndex !== index))}
            >
              <Trash2 aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export function LandingSectionEditor({
  section,
  products,
  mainProduct,
  brand,
  couponCode,
  readOnly = false,
  onChangeSettings,
  onReplaceSettings,
  onPatch,
}: Props) {
  const settings = section.settings as Settings;
  const str = (key: string): string => (typeof settings[key] === "string" ? (settings[key] as string) : "");
  const num = (key: string, fallback: number): number => {
    const value = Number(settings[key]);
    return Number.isFinite(value) ? value : fallback;
  };
  const set = (key: string, value: unknown) => onChangeSettings(section.id, { [key]: value });

  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [rawJson, setRawJson] = useState(() => JSON.stringify(section.settings, null, 2));
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [tokenGuideOpen, setTokenGuideOpen] = useState(false);

  /* HTML এডিটরে কার্সরের শেষ অবস্থান — মিডিয়া-পিকার/স্নিপেট ওই জায়গায় বসে */
  const htmlTextareaRef = useRef<HTMLTextAreaElement>(null);
  const htmlCursorRef = useRef<number | null>(null);

  useEffect(() => {
    htmlCursorRef.current = null;
  }, [section.id]);

  const insertHtml = (snippet: string) => {
    if (readOnly) return;
    const current = str("html");
    const position = htmlCursorRef.current;
    let next: string;
    let caret: number;
    if (position !== null && position >= 0 && position <= current.length) {
      const before = current.slice(0, position);
      const after = current.slice(position);
      const prefix = before && !before.endsWith("\n") ? "\n" : "";
      const suffix = after && !after.startsWith("\n") ? "\n" : "";
      next = `${before}${prefix}${snippet}${suffix}${after}`;
      caret = position + prefix.length + snippet.length;
    } else {
      next = current ? `${current}\n\n${snippet}` : snippet;
      caret = next.length;
    }
    set("html", next);
    window.requestAnimationFrame(() => {
      const element = htmlTextareaRef.current;
      if (element) {
        element.focus();
        element.setSelectionRange(caret, caret);
        htmlCursorRef.current = caret;
      }
    });
  };

  /* পুরো কানেক্টেড ফরম্যাট বসানো — বর্তমান HTML থাকলে নিশ্চিত করে বদলায় */
  const applyConnectedFormat = () => {
    if (readOnly) return;
    const current = str("html").trim();
    if (
      current &&
      current !== CONNECTED_PRODUCT_HTML_TEMPLATE.trim() &&
      !window.confirm("বর্তমান HTML মুছে পণ্য ও চেকআউট কানেক্টেড পুরো ফরম্যাট বসানো হবে। এগিয়ে যাবেন?")
    ) {
      return;
    }
    set("html", CONNECTED_PRODUCT_HTML_TEMPLATE);
    htmlCursorRef.current = CONNECTED_PRODUCT_HTML_TEMPLATE.length;
    window.requestAnimationFrame(() => {
      htmlTextareaRef.current?.focus();
    });
  };

  useEffect(() => {
    if (!advancedOpen) {
      setRawJson(JSON.stringify(section.settings, null, 2));
      setJsonError(null);
    }
  }, [advancedOpen, section.id, section.settings]);

  const meta = SECTION_CATALOG.find((item) => item.type === section.type);
  const design = section.design ?? {};

  const items = useMemo(
    () => (Array.isArray(settings.items) ? (settings.items as Settings[]) : []),
    [settings.items],
  );

  const imageList = useMemo(() => {
    const list: Array<{ url: string; alt: string }> = [];
    if (Array.isArray(settings.images)) {
      for (const item of settings.images as Settings[]) {
        const url = typeof item.url === "string" ? item.url : "";
        const alt = typeof item.alt === "string" ? item.alt : "";
        if (url) list.push({ url, alt });
      }
    }
    if (typeof settings.imageUrls === "string" && settings.imageUrls.trim()) {
      for (const url of settings.imageUrls.split(",").map((item) => item.trim())) {
        if (url) list.push({ url, alt: "" });
      }
    }
    return list;
  }, [settings.images, settings.imageUrls]);

  const selectedProductIds = Array.isArray(settings.productIds)
    ? (settings.productIds as unknown[]).map((value) => Number(value)).filter((value) => Number.isInteger(value))
    : [];

  /* HTML টোকেনের জন্য পণ্য: ব্লক-নির্দিষ্ট পণ্য থাকলে তাই, নইলে পেজের main product */
  const htmlProduct = useMemo(() => {
    const requestedId = Number(settings.productId);
    if (Number.isInteger(requestedId) && requestedId > 0) {
      return products.find((product) => product.id === requestedId) ?? mainProduct;
    }
    return mainProduct;
  }, [settings.productId, products, mainProduct]);

  const productOptions = products.map((product) => (
    <option key={product.id} value={product.id}>
      {product.name}
      {product.isDemo ? " (demo)" : ""}
      {` — ${formatTakaEn(product.price)}`}
    </option>
  ));

  const designPanel = (
    <details className="lp-design-panel">
      <summary>Section design</summary>
      <div className="lp-design-grid">
        <label className="field field-check">
          <input
            type="checkbox"
            checked={Boolean(design.alt)}
            disabled={readOnly}
            onChange={(event) => onPatch(section.id, { design: { ...design, alt: event.target.checked } })}
          />
          <span>Alt background</span>
        </label>
        <label className="field">
          <span className="label">Alignment</span>
          <select
            className="input"
            value={design.align ?? "left"}
            disabled={readOnly}
            onChange={(event) =>
              onPatch(section.id, {
                design: { ...design, align: event.target.value as "left" | "center" | "right" },
              })
            }
          >
            <option value="left">Left</option>
            <option value="center">Center</option>
            <option value="right">Right</option>
          </select>
        </label>
        <NumberField
          label="Padding Y (px)"
          value={design.paddingY ?? 48}
          min={0}
          max={200}
          onChange={(value) => onPatch(section.id, { design: { ...design, paddingY: value } })}
        />
        <NumberField
          label="Content width (px)"
          value={design.maxWidth ?? 1100}
          min={320}
          max={1600}
          step={20}
          onChange={(value) => onPatch(section.id, { design: { ...design, maxWidth: value } })}
        />
        <label className="field">
          <span className="label">Background</span>
          <div className="lp-color-row">
            <input
              type="color"
              aria-label="Background color"
              value={isHexColor(design.background ?? "") ? (design.background as string) : "#ffffff"}
              disabled={readOnly}
              onChange={(event) => onPatch(section.id, { design: { ...design, background: event.target.value } })}
            />
            <input
              className="input mono"
              placeholder="transparent or #faf8f2"
              value={design.background ?? ""}
              disabled={readOnly}
              onChange={(event) => onPatch(section.id, { design: { ...design, background: event.target.value || undefined } })}
            />
          </div>
        </label>
        <label className="field">
          <span className="label">Text color</span>
          <div className="lp-color-row">
            <input
              type="color"
              aria-label="Text color"
              value={isHexColor(design.textColor ?? "") ? (design.textColor as string) : "#14231e"}
              disabled={readOnly}
              onChange={(event) => onPatch(section.id, { design: { ...design, textColor: event.target.value } })}
            />
            <input
              className="input mono"
              placeholder="default"
              value={design.textColor ?? ""}
              disabled={readOnly}
              onChange={(event) => onPatch(section.id, { design: { ...design, textColor: event.target.value || undefined } })}
            />
          </div>
        </label>
      </div>
    </details>
  );

  const fields = (
    <>
      {section.type === "hero" ? (
        <>
          <StringField label="Eyebrow" value={str("eyebrow")} onChange={(value) => set("eyebrow", value)} />
          <StringField label="Title" value={str("title")} onChange={(value) => set("title", value)} />
          <StringField label="Subtitle" value={str("subtitle")} multiline onChange={(value) => set("subtitle", value)} />
          <StringField label="CTA label" value={str("ctaLabel")} onChange={(value) => set("ctaLabel", value)} />
          <StringField
            label="CTA target"
            value={str("ctaTarget")}
            onChange={(value) => set("ctaTarget", value)}
            hint="order_form, /products, or a full URL"
          />
          <ImageUrlField
            label="Image"
            value={str("imageUrl")}
            onChange={(value) => set("imageUrl", value)}
            hint="ছবি তুলুন অথবা URL পেস্ট করুন"
          />
        </>
      ) : null}

      {section.type === "text" ? (
        <>
          <StringField label="Title" value={str("title")} onChange={(value) => set("title", value)} />
          <StringField label="Body" value={str("body")} multiline rows={5} onChange={(value) => set("body", value)} />
        </>
      ) : null}

      {section.type === "split" ? (
        <>
          <StringField label="Title" value={str("title")} onChange={(value) => set("title", value)} />
          <StringField label="Body" value={str("body")} multiline rows={5} onChange={(value) => set("body", value)} />
          <ImageUrlField
            label="Image"
            value={str("imageUrl")}
            onChange={(value) => set("imageUrl", value)}
            hint="ছবি তুলুন অথবা URL পেস্ট করুন"
          />
        </>
      ) : null}

      {section.type === "images" ? (
        <>
          <StringField label="Title" value={str("title")} onChange={(value) => set("title", value)} />
          <ImagesEditor
            images={imageList}
            readOnly={readOnly}
            onChange={(next) => onReplaceSettings(section.id, { ...settings, images: next, imageUrls: "" })}
          />
        </>
      ) : null}

      {section.type === "video" ? (
        <>
          <StringField label="Title" value={str("title")} onChange={(value) => set("title", value)} />
          <StringField
            label="YouTube video ID or URL"
            value={str("youtubeId")}
            onChange={(value) => set("youtubeId", value)}
            placeholder="dQw4w9WgXcQ or https://youtu.be/…"
          />
        </>
      ) : null}

      {section.type === "html" ? (
        <div className="field field-full">
          <div className="row-between row-wrap">
            <span className="label mb-0">
              <Code2 aria-hidden="true" /> HTML
            </span>
            <div className="chip-row">
              {HTML_SNIPPETS.map((snippet) => (
                <button
                  key={snippet.label}
                  type="button"
                  className="chip"
                  disabled={readOnly}
                  onClick={() => insertHtml(snippet.html)}
                >
                  <Plus aria-hidden="true" />
                  {snippet.label}
                </button>
              ))}
            </div>
          </div>
          <div className="lp-html-format-panel">
            <div className="row-between row-wrap">
              <strong>পণ্য ও চেকআউট কানেক্টেড HTML ফরম্যাট</strong>
              <div className="field-row">
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  disabled={readOnly}
                  onClick={applyConnectedFormat}
                >
                  পুরো ফরম্যাট বসান
                </button>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  aria-expanded={tokenGuideOpen}
                  onClick={() => setTokenGuideOpen((value) => !value)}
                >
                  টোকেন তালিকা
                </button>
              </div>
            </div>
            <label className="field mb-0">
              <span className="label">Connected product (HTML টোকেনের জন্য)</span>
              <select
                className="input"
                value={settings.productId ? String(settings.productId) : ""}
                disabled={readOnly}
                onChange={(event) => set("productId", event.target.value ? Number(event.target.value) : null)}
              >
                <option value="">Page main product</option>
                {productOptions}
              </select>
              <span className="help-text">
                {htmlProduct
                  ? `এখন কানেক্ট আছে: ${htmlProduct.name} (${formatTakaEn(htmlProduct.price)})। নাম, দাম, ছবি ও লিংক নিজে থেকে বসবে।`
                  : "কোনো পণ্য কানেক্ট নেই। Page settings এ Main product দিন অথবা এখান থেকে পণ্য বেছে নিন।"}
              </span>
            </label>
            <ol className="lp-html-checklist">
              <li>পেজে একটি Order Form ব্লক রাখুন — {`{{order_url}}`} ওই ফর্মে নিয়ে যাবে।</li>
              <li>{`{{checkout_url}}`} পণ্যটি কার্টে যোগ করে Checkout পেজ খুলবে।</li>
              <li>নাম/দাম/ছবি হাতে না লিখে টোকেন ব্যবহার করুন — পণ্য বদলালে অটো আপডেট।</li>
              <li>নিজের R2 ছবি: মিডিয়া প্যানেল থেকে বসান অথবা img এর src তে লিংক দিন।</li>
              <li>শুধু ইনলাইন style চলবে; script, form, iframe ও style ট্যাগ বাদ যাবে।</li>
            </ol>
            {tokenGuideOpen ? (
              <div className="lp-token-grid" aria-label="HTML টোকেন তালিকা">
                {LANDING_HTML_TOKEN_GUIDE.map((item) => (
                  <button
                    key={item.token}
                    type="button"
                    className="lp-token-btn"
                    disabled={readOnly}
                    title={`${item.label} — ক্লিক করলে কার্সরের জায়গায় বসবে`}
                    onClick={() => insertHtml(item.token)}
                  >
                    <code>{item.token}</code>
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <MediaPicker
            disabled={readOnly}
            autoInsertOnUpload
            onInsertHtml={insertHtml}
          />
          <textarea
            ref={htmlTextareaRef}
            className="input mono lp-code-editor"
            rows={12}
            value={str("html")}
            disabled={readOnly}
            spellCheck={false}
            onChange={(event) => {
              htmlCursorRef.current = event.target.selectionStart;
              set("html", event.target.value);
            }}
            onSelect={(event) => {
              htmlCursorRef.current = event.currentTarget.selectionStart;
            }}
          />
          <span className="help-text">
            Script, iframe, form ও event handler স্বয়ংক্রিয়ভাবে বাদ যায়। Inline CSS অনুমোদিত।
            ছবি বসাতে উপরের &quot;ছবি যোগ করুন (R2/Media)&quot; প্যানেল থেকে আপলোড করুন বা আগের
            আপলোড করা ছবির লিংক/HTML কপি করুন — Storage (R2) পেজ থেকেও একইভাবে লিংক কপি করা যায়।
          </span>
          {str("html").trim() ? (
            <div className="lp-html-preview">
              <span className="label">Rendered preview</span>
              <div
                className="lp-html"
                dangerouslySetInnerHTML={{
                  __html: sanitizeLandingHtml(
                    applyLandingHtmlTokens(str("html"), {
                      product: htmlProduct,
                      brand,
                      couponCode,
                    }),
                  ),
                }}
              />
            </div>
          ) : null}
        </div>
      ) : null}

      {section.type === "products" ? (
        <>
          <StringField label="Title" value={str("title")} onChange={(value) => set("title", value)} />
          <div className="field field-full">
            <span className="label">Products ({selectedProductIds.length})</span>
            <p className="help-text mt-0">
              কিছু নির্বাচন না করলে পেজের main product দেখানো হবে। সর্বোচ্চ ৮টি।
            </p>
            <div className="lp-product-picker">
              {products.map((product) => {
                const selected = selectedProductIds.includes(product.id);
                return (
                  <label className={`lp-product-option${selected ? " lp-product-option-on" : ""}`} key={product.id}>
                    <input
                      type="checkbox"
                      checked={selected}
                      disabled={readOnly || (!selected && selectedProductIds.length >= 8)}
                      onChange={(event) =>
                        set(
                          "productIds",
                          event.target.checked
                            ? [...selectedProductIds, product.id].slice(0, 8)
                            : selectedProductIds.filter((id) => id !== product.id),
                        )
                      }
                    />
                    <span>
                      <strong>{product.name}</strong>
                      <span className="text-small text-muted">
                        {formatTakaEn(product.price)}
                        {product.isDemo ? " · demo" : ""}
                        {product.status !== "active" ? ` · ${product.status}` : ""}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
            {products.length === 0 ? <p className="text-small text-muted mb-0">No products found.</p> : null}
          </div>
        </>
      ) : null}

      {section.type === "order_form" ? (
        <>
          <StringField label="Title" value={str("title")} onChange={(value) => set("title", value)} />
          <StringField label="Subtitle" value={str("subtitle")} onChange={(value) => set("subtitle", value)} />
          <label className="field">
            <span className="label">Product</span>
            <select
              className="input"
              value={settings.productId ? String(settings.productId) : ""}
              disabled={readOnly}
              onChange={(event) => set("productId", event.target.value ? Number(event.target.value) : null)}
            >
              <option value="">Page main product</option>
              {productOptions}
            </select>
          </label>
        </>
      ) : null}

      {section.type === "cta" ? (
        <>
          <StringField label="Title" value={str("title")} onChange={(value) => set("title", value)} />
          <StringField label="Body" value={str("body")} multiline onChange={(value) => set("body", value)} />
          <StringField label="CTA label" value={str("ctaLabel")} onChange={(value) => set("ctaLabel", value)} />
          <StringField
            label="CTA URL"
            value={str("ctaUrl")}
            onChange={(value) => set("ctaUrl", value)}
            hint="#order_form, /products, or a full URL"
          />
        </>
      ) : null}

      {section.type === "features" || section.type === "steps" || section.type === "faq" || section.type === "testimonials" ? (
        <>
          <StringField label="Title" value={str("title")} onChange={(value) => set("title", value)} />
          <ItemListEditor
            sectionType={section.type}
            items={items}
            readOnly={readOnly}
            onChange={(next) => set("items", next)}
          />
        </>
      ) : null}

      {section.type === "reviews" ? (
        <>
          <StringField label="Title" value={str("title")} onChange={(value) => set("title", value)} />
          <p className="text-small text-muted field-full mb-0">
            শুধু অনুমোদিত (approved) রিভিউ দেখানো হয়। পেজের main product থেকে রিভিউ পড়া হয়।
          </p>
        </>
      ) : null}

      {section.type === "countdown" ? (
        <>
          <StringField label="Title" value={str("title")} onChange={(value) => set("title", value)} />
          <label className="field">
            <span className="label">Ends at</span>
            <input
              className="input"
              type="datetime-local"
              value={str("endsAt")}
              disabled={readOnly}
              onChange={(event) => set("endsAt", event.target.value)}
            />
            <span className="help-text">সময় শেষ হলে “অফার শেষ” দেখাবে — ভুয়া রিসেট নয়।</span>
          </label>
        </>
      ) : null}

      {section.type === "popup" ? (
        <>
          <StringField label="Popup title" value={str("title")} onChange={(value) => set("title", value)} />
          <StringField label="Body" value={str("body")} multiline onChange={(value) => set("body", value)} />
          <ImageUrlField
            label="Image"
            value={str("imageUrl")}
            onChange={(value) => set("imageUrl", value)}
            hint="ছবি তুলুন অথবা URL পেস্ট করুন"
          />
          <StringField label="CTA label" value={str("ctaLabel")} onChange={(value) => set("ctaLabel", value)} />
          <StringField label="CTA URL" value={str("ctaUrl")} onChange={(value) => set("ctaUrl", value)} />
          <label className="field field-check">
            <input
              type="checkbox"
              checked={Boolean(settings.leadFormEnabled)}
              disabled={readOnly}
              onChange={(event) => set("leadFormEnabled", event.target.checked)}
            />
            <span>Collect phone (lead form)</span>
          </label>
          <StringField label="Lead form label" value={str("leadFormLabel")} onChange={(value) => set("leadFormLabel", value)} />
          <NumberField
            label="Delay (1-120s)"
            value={num("delaySeconds", 4)}
            min={1}
            max={120}
            onChange={(value) => set("delaySeconds", value)}
          />
          <label className="field">
            <span className="label">Frequency</span>
            <select
              className="input"
              value={str("frequency") || "once_session"}
              disabled={readOnly}
              onChange={(event) => set("frequency", event.target.value)}
            >
              <option value="every_visit">Every visit</option>
              <option value="once_session">Once per session</option>
              <option value="once_day">Once per day</option>
            </select>
          </label>
          <p className="text-small text-muted field-full mb-0">
            পেজে সর্বোচ্চ ৩টি দৃশ্যমান popup ব্লক থাকতে পারে। Popup পেজের ক্যানভাসে দেখা যায় না —
            লাইভ পেজে নির্দিষ্ট সময় পর খোলে।
          </p>
        </>
      ) : null}

      {section.type === "announcement" ? (
        <StringField
          label="Announcement text"
          value={str("body")}
          multiline
          onChange={(value) => set("body", value)}
          hint="উপরে সরু বার হিসেবে দেখানো হবে।"
        />
      ) : null}

      {section.type === "guarantee" ? (
        <>
          <StringField label="Title" value={str("title")} onChange={(value) => set("title", value)} />
          <StringField label="Body" value={str("body")} multiline rows={4} onChange={(value) => set("body", value)} />
        </>
      ) : null}

      {section.type === "contact" ? (
        <>
          <StringField label="Title" value={str("title")} onChange={(value) => set("title", value)} />
          <StringField label="Body" value={str("body")} multiline rows={3} onChange={(value) => set("body", value)} />
          <p className="text-small text-muted field-full mb-0">
            ফোন ও WhatsApp নম্বর Settings / Branding থেকে আসে।
          </p>
        </>
      ) : null}

      {section.type === "ingredients" || section.type === "dosage" ? (
        <>
          <StringField label="Title" value={str("title")} onChange={(value) => set("title", value)} />
          <label className="field">
            <span className="label">Source</span>
            <select
              className="input"
              value={str("source") || "product"}
              disabled={readOnly}
              onChange={(event) => set("source", event.target.value)}
            >
              <option value="product">From product record</option>
              <option value="custom">Custom text</option>
            </select>
          </label>
          <label className="field">
            <span className="label">Product</span>
            <select
              className="input"
              value={settings.productId ? String(settings.productId) : ""}
              disabled={readOnly || str("source") === "custom"}
              onChange={(event) => set("productId", event.target.value ? Number(event.target.value) : null)}
            >
              <option value="">Page main product</option>
              {productOptions}
            </select>
          </label>
          {str("source") === "custom" ? (
            <StringField
              label="Custom text"
              value={str("custom")}
              multiline
              rows={5}
              onChange={(value) => set("custom", value)}
            />
          ) : null}
        </>
      ) : null}

      {section.type === "doctor_advice" ? (
        <StringField
          label="Disclaimer text"
          value={str("body")}
          multiline
          rows={4}
          onChange={(value) => set("body", value)}
          hint="খালি রাখলে ডিফল্ট চিকিৎসা-ডিসক্লেইমার দেখানো হবে।"
        />
      ) : null}

      {section.type === "spacer" ? (
        <NumberField
          label="Height (px)"
          value={num("height", 48)}
          min={8}
          max={400}
          onChange={(value) => set("height", value)}
        />
      ) : null}

      {section.type === "divider" ? (
        <p className="text-small text-muted field-full mb-0">ডিভাইডার লাইনের কোনো সেটিংস নেই।</p>
      ) : null}
    </>
  );

  return (
    <div className="lp-inspector">
      <div className="lp-inspector-head">
        <div>
          <p className="eyebrow">Selected block</p>
          <h2>{meta?.label ?? section.type}</h2>
          <p className="text-small text-muted mb-0">{meta?.description}</p>
        </div>
        <span className="badge badge-outline">#{section.id}</span>
      </div>

      <fieldset className="lp-inspector-fields" disabled={readOnly}>
        <div className="grid-2">{fields}</div>
      </fieldset>

      {designPanel}

      <details
        className="lp-advanced"
        open={advancedOpen}
        onToggle={(event) => setAdvancedOpen((event.currentTarget as HTMLDetailsElement).open)}
      >
        <summary>Advanced JSON</summary>
        <div className="stack stack-sm">
          <textarea
            className="input mono"
            rows={8}
            value={rawJson}
            disabled={readOnly}
            spellCheck={false}
            onChange={(event) => setRawJson(event.target.value)}
          />
          {jsonError ? <span className="error-text">{jsonError}</span> : null}
          <div className="field-row">
            <button
              type="button"
              className="btn btn-outline btn-sm"
              disabled={readOnly}
              onClick={() => {
                try {
                  const parsed = JSON.parse(rawJson) as Settings;
                  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
                    throw new Error("Settings must be a JSON object");
                  }
                  onReplaceSettings(section.id, parsed);
                  setJsonError(null);
                } catch (error) {
                  setJsonError(error instanceof Error ? error.message : "Invalid JSON");
                }
              }}
            >
              Apply JSON
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => {
                setRawJson(JSON.stringify(section.settings, null, 2));
                setJsonError(null);
              }}
            >
              Reset
            </button>
          </div>
        </div>
      </details>

      {mainProduct && !selectedProductIds.includes(mainProduct.id) && section.type === "products" ? (
        <p className="text-small text-muted mb-0">
          Main product: <strong>{mainProduct.name}</strong>
        </p>
      ) : null}
    </div>
  );
}
