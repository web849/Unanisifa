"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Check,
  ExternalLink,
  Globe,
  ImagePlus,
  RotateCcw,
  Save,
  Search,
  ShoppingCart,
  Trash2,
} from "lucide-react";
import type { BrandSettings } from "@/lib/config";
import {
  clampLogoHeight,
  LOGO_HEIGHT_DEFAULT,
  LOGO_HEIGHT_MAX,
  LOGO_HEIGHT_MIN,
  type DarkLogoMode,
} from "@/lib/brand-logo";
import { BrandMark } from "@/components/brand-mark";
import { IMAGE_ACCEPT, uploadImageFile } from "@/components/admin/image-field";

export type BrandMediaItem = {
  id: string;
  url: string;
  mimeType: string;
  alt: string | null;
};

type BrandingPatch = Pick<
  BrandSettings,
  "logoUrl" | "logoLightUrl" | "faviconUrl" | "logoHeight" | "logoShowText" | "darkLogoMode"
>;

function pickBranding(brand: BrandSettings): BrandingPatch {
  return {
    logoUrl: brand.logoUrl ?? "",
    logoLightUrl: brand.logoLightUrl ?? "",
    faviconUrl: brand.faviconUrl ?? "",
    logoHeight: clampLogoHeight(brand.logoHeight),
    logoShowText: Boolean(brand.logoShowText),
    darkLogoMode: brand.darkLogoMode ?? "auto",
  };
}

function LogoSlotCard({
  title,
  subtitle,
  value,
  busy,
  onSelectFile,
  onUrlChange,
  onClear,
  surface = "light",
  previewSquare = false,
}: {
  title: string;
  subtitle: string;
  value: string;
  busy: boolean;
  onSelectFile: (file: File) => void;
  onUrlChange: (url: string) => void;
  onClear: () => void;
  surface?: "light" | "dark";
  previewSquare?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    if (busy) return;
    const file = event.dataTransfer.files?.[0];
    if (file) onSelectFile(file);
  };

  return (
    <div
      className={`logo-slot${dragging ? " logo-slot-dragging" : ""}`}
      onDragOver={(event) => {
        event.preventDefault();
        if (!busy) setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
    >
      <div className="logo-slot-head">
        <div>
          <h3 className="logo-slot-title">{title}</h3>
          <p className="logo-slot-sub">{subtitle}</p>
        </div>
        {value ? (
          <span className="logo-status-pill logo-status-custom">Custom</span>
        ) : (
          <span className="logo-status-pill">Default</span>
        )}
      </div>

      <div
        className={`logo-slot-stage${surface === "dark" ? " logo-slot-stage-dark" : ""}`}
        onClick={() => {
          if (!busy) inputRef.current?.click();
        }}
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if ((event.key === "Enter" || event.key === " ") && !busy) {
            event.preventDefault();
            inputRef.current?.click();
          }
        }}
        aria-label={`${title} upload`}
      >
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={value}
            alt={title}
            className={previewSquare ? "logo-slot-img logo-slot-img-icon" : "logo-slot-img"}
          />
        ) : (
          <span className="logo-slot-empty">
            <ImagePlus aria-hidden="true" />
            <span>Click or drag image here to upload</span>
            <span className="logo-slot-empty-hint">PNG, SVG, WebP, JPG, ICO (max 5 MB)</span>
          </span>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={IMAGE_ACCEPT}
        className="sr-only"
        aria-hidden="true"
        tabIndex={-1}
        disabled={busy}
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) onSelectFile(file);
        }}
      />

      <div className="logo-slot-actions">
        <button
          type="button"
          className="btn btn-outline btn-sm"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
        >
          <ImagePlus aria-hidden="true" />
          {busy ? "Uploading…" : value ? "Change image" : "Upload image"}
        </button>
        {value ? (
          <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={onClear}>
            <Trash2 aria-hidden="true" />
            Remove
          </button>
        ) : null}
      </div>

      <label className="field mb-0">
        <span className="help-text">Or paste direct image URL:</span>
        <input
          className="input mono"
          value={value}
          disabled={busy}
          placeholder="https://… or /api/media/brand/…"
          onChange={(event) => onUrlChange(event.target.value)}
        />
      </label>
    </div>
  );
}

export function LogoBrandingPanel({
  brand,
  recentMedia = [],
  onBrandUpdated,
}: {
  brand: BrandSettings;
  recentMedia?: BrandMediaItem[];
  onBrandUpdated?: (patch: BrandingPatch) => void;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<BrandingPatch>(() => pickBranding(brand));
  const [savedSnapshot, setSavedSnapshot] = useState<BrandingPatch>(() => pickBranding(brand));
  const [busySlot, setBusySlot] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ tone: "ok" | "err"; text: string } | null>(null);

  const incomingLogoUrl = brand.logoUrl ?? "";
  const incomingLogoLightUrl = brand.logoLightUrl ?? "";
  const incomingFaviconUrl = brand.faviconUrl ?? "";
  const incomingLogoHeight = clampLogoHeight(brand.logoHeight);
  const incomingLogoShowText = Boolean(brand.logoShowText);
  const incomingDarkLogoMode = brand.darkLogoMode ?? "auto";

  useEffect(() => {
    const incoming: BrandingPatch = {
      logoUrl: incomingLogoUrl,
      logoLightUrl: incomingLogoLightUrl,
      faviconUrl: incomingFaviconUrl,
      logoHeight: incomingLogoHeight,
      logoShowText: incomingLogoShowText,
      darkLogoMode: incomingDarkLogoMode,
    };
    setDraft(incoming);
    setSavedSnapshot(incoming);
  }, [
    incomingLogoUrl,
    incomingLogoLightUrl,
    incomingFaviconUrl,
    incomingLogoHeight,
    incomingLogoShowText,
    incomingDarkLogoMode,
  ]);

  const previewBrand: BrandSettings = {
    ...brand,
    ...draft,
  };

  const hasUnsavedChanges =
    draft.logoUrl !== savedSnapshot.logoUrl ||
    draft.logoLightUrl !== savedSnapshot.logoLightUrl ||
    draft.faviconUrl !== savedSnapshot.faviconUrl ||
    draft.logoHeight !== savedSnapshot.logoHeight ||
    draft.logoShowText !== savedSnapshot.logoShowText ||
    draft.darkLogoMode !== savedSnapshot.darkLogoMode;

  const hasAnyCustom = Boolean(
    draft.logoUrl.trim() || draft.logoLightUrl.trim() || draft.faviconUrl.trim(),
  );

  const persistPatch = async (next: BrandingPatch, successMessage: string) => {
    setSaving(true);
    setStatus(null);
    try {
      const response = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brand: next }),
      });
      const json = (await response.json().catch(() => null)) as {
        ok?: boolean;
        error?: string;
      } | null;
      if (!response.ok || !json?.ok) {
        setStatus({ tone: "err", text: json?.error ?? "Save failed. Please try again." });
        return false;
      }
      setSavedSnapshot(next);
      onBrandUpdated?.(next);
      setStatus({ tone: "ok", text: successMessage });
      router.refresh();
      return true;
    } catch {
      setStatus({ tone: "err", text: "Network error while saving settings." });
      return false;
    } finally {
      setSaving(false);
    }
  };

  const uploadAndSaveSlot = async (
    key: "logoUrl" | "logoLightUrl" | "faviconUrl",
    file: File,
    label: string,
  ) => {
    setBusySlot(key);
    setStatus(null);
    try {
      const url = await uploadImageFile(file, "brand", label);
      const next: BrandingPatch = { ...draft, [key]: url };
      setDraft(next);
      await persistPatch(next, `${label} uploaded and saved — live on your store now.`);
    } catch (err) {
      setStatus({
        tone: "err",
        text: err instanceof Error ? err.message : "Upload failed.",
      });
    } finally {
      setBusySlot(null);
    }
  };

  const clearSlotAndSave = async (
    key: "logoUrl" | "logoLightUrl" | "faviconUrl",
    label: string,
  ) => {
    const next: BrandingPatch = { ...draft, [key]: "" };
    setDraft(next);
    await persistPatch(next, `${label} removed — reverted cleanly.`);
  };

  const resetAllLogos = async () => {
    const next: BrandingPatch = {
      logoUrl: "",
      logoLightUrl: "",
      faviconUrl: "",
      logoHeight: LOGO_HEIGHT_DEFAULT,
      logoShowText: false,
      darkLogoMode: "auto",
    };
    setDraft(next);
    await persistPatch(next, "Restored built-in Unani Sifa logo everywhere.");
  };

  const applyRecentMedia = async (
    key: "logoUrl" | "logoLightUrl" | "faviconUrl",
    url: string,
    label: string,
  ) => {
    const next: BrandingPatch = { ...draft, [key]: url };
    setDraft(next);
    await persistPatch(next, `${label} updated and live on your store.`);
  };

  const anyBusy = saving || busySlot !== null;

  return (
    <div className="panel">
      <div className="panel-head logo-panel-head">
        <div>
          <h2 className="panel-title">Logo &amp; Brand Identity</h2>
          <p className="text-small text-muted mb-0">
            লোগো আপলোড করলেই অটো-সেভ হয়ে স্টোরের হেডার, ফুটার, ইনভয়েস ও অ্যাডমিন প্যানেলে সাথে সাথে আপডেট হবে।
          </p>
        </div>
        <div className="logo-head-actions">
          {hasAnyCustom ? (
            <button
              type="button"
              className="btn btn-outline btn-sm"
              disabled={anyBusy}
              onClick={() => void resetAllLogos()}
            >
              <RotateCcw aria-hidden="true" />
              Reset default
            </button>
          ) : null}
          <button
            type="button"
            className="btn btn-primary btn-sm"
            disabled={anyBusy}
            onClick={() =>
              void persistPatch(draft, "Logo settings saved — live across your storefront.")
            }
          >
            {saving ? (
              "Saving…"
            ) : !hasUnsavedChanges ? (
              <>
                <Check aria-hidden="true" />
                Saved
              </>
            ) : (
              <>
                <Save aria-hidden="true" />
                Save logo settings
              </>
            )}
          </button>
        </div>
      </div>

      <div className="panel-body stack stack-md">
        {status ? (
          <div
            className={`logo-banner ${status.tone === "ok" ? "logo-banner-ok" : "logo-banner-err"}`}
            role="status"
          >
            <span>{status.text}</span>
            {status.tone === "ok" ? (
              <Link href="/" target="_blank" className="logo-banner-link">
                Open live store <ExternalLink aria-hidden="true" />
              </Link>
            ) : null}
          </div>
        ) : null}

        {/* লাইভ প্রিভিউ: স্টোর হেডার + ডার্ক ফুটার + ব্রাউজার ট্যাব */}
        <div className="logo-preview-grid">
          <div className="logo-preview-card">
            <span className="logo-preview-caption">Live Preview — Storefront Header (Light)</span>
            <div className="logo-mock-header">
              <span className="header-brand">
                <BrandMark brand={previewBrand} variant="dark" />
              </span>
              <span className="logo-mock-search" aria-hidden="true">
                <Search />
                <span>পণ্য খুঁজুন…</span>
              </span>
              <span className="logo-mock-cart" aria-hidden="true">
                <ShoppingCart />
              </span>
            </div>
          </div>

          <div className="logo-preview-card">
            <span className="logo-preview-caption">
              Live Preview — Footer &amp; Admin Sidebar (Dark)
            </span>
            <div className="logo-mock-footer">
              <span className="header-brand">
                <BrandMark brand={previewBrand} variant="light" />
              </span>
              <span className="logo-mock-tab">
                {draft.faviconUrl.trim() ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={draft.faviconUrl} alt="" width={16} height={16} />
                ) : (
                  <Globe aria-hidden="true" />
                )}
                <span>{brand.name}</span>
              </span>
            </div>
          </div>
        </div>

        {/* ৩টি আপলোড স্লট */}
        <div className="logo-slots-grid">
          <LogoSlotCard
            title="Main Store Logo"
            subtitle="হালকা হেডার ও ইনভয়েসের মূল লোগো (PNG / SVG স্বচ্ছ ব্যাকগ্রাউন্ড সবচেয়ে ভালো)"
            value={draft.logoUrl}
            busy={busySlot === "logoUrl"}
            onSelectFile={(file) => void uploadAndSaveSlot("logoUrl", file, "Main logo")}
            onUrlChange={(url) => setDraft((prev) => ({ ...prev, logoUrl: url }))}
            onClear={() => void clearSlotAndSave("logoUrl", "Main logo")}
            surface="light"
          />

          <LogoSlotCard
            title="Light Logo (Optional)"
            subtitle="ডার্ক ফুটার ও অ্যাডমিন সাইডবারের জন্য সাদা/হালকা লোগো (না দিলেও মূল লোগো চলবে)"
            value={draft.logoLightUrl}
            busy={busySlot === "logoLightUrl"}
            onSelectFile={(file) => void uploadAndSaveSlot("logoLightUrl", file, "Light logo")}
            onUrlChange={(url) => setDraft((prev) => ({ ...prev, logoLightUrl: url }))}
            onClear={() => void clearSlotAndSave("logoLightUrl", "Light logo")}
            surface="dark"
          />

          <LogoSlotCard
            title="Favicon / Tab Icon (Optional)"
            subtitle="ব্রাউজার ট্যাব ও বুকমার্কের চৌকো আইকন (PNG, SVG বা ICO)"
            value={draft.faviconUrl}
            busy={busySlot === "faviconUrl"}
            onSelectFile={(file) => void uploadAndSaveSlot("faviconUrl", file, "Favicon")}
            onUrlChange={(url) => setDraft((prev) => ({ ...prev, faviconUrl: url }))}
            onClear={() => void clearSlotAndSave("faviconUrl", "Favicon")}
            surface="light"
            previewSquare
          />
        </div>

        {/* আকার ও প্রদর্শন নিয়ন্ত্রণ */}
        <div className="logo-controls-bar">
          <label className="field mb-0">
            <span className="label">
              Header logo height: <strong>{draft.logoHeight}px</strong>
            </span>
            <div className="logo-range-row">
              <input
                type="range"
                min={LOGO_HEIGHT_MIN}
                max={LOGO_HEIGHT_MAX}
                step={2}
                value={draft.logoHeight}
                onChange={(event) =>
                  setDraft((prev) => ({
                    ...prev,
                    logoHeight: clampLogoHeight(Number(event.target.value)),
                  }))
                }
              />
              {draft.logoHeight !== LOGO_HEIGHT_DEFAULT ? (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() =>
                    setDraft((prev) => ({ ...prev, logoHeight: LOGO_HEIGHT_DEFAULT }))
                  }
                >
                  36px
                </button>
              ) : null}
            </div>
            <span className="help-text">লোগো ছোট বা বড় দেখাতে স্লাইডার টানুন ({LOGO_HEIGHT_MIN}–{LOGO_HEIGHT_MAX}px)</span>
          </label>

          <label className="field mb-0">
            <span className="label">Dark footer / admin display</span>
            <select
              className="input"
              value={draft.darkLogoMode}
              onChange={(event) =>
                setDraft((prev) => ({
                  ...prev,
                  darkLogoMode: event.target.value as DarkLogoMode,
                }))
              }
            >
              <option value="auto">As uploaded (স্বাভাবিক)</option>
              <option value="pill">Light badge background (গাঢ় লোগোর জন্য)</option>
              <option value="white">Make pure white (কালো স্বচ্ছ PNG/SVG-এর জন্য)</option>
            </select>
            <span className="help-text">আলাদা সাদা লোগো না থাকলে ডার্ক ফুটারে স্পষ্ট দেখাতে এটি বেছে নিন</span>
          </label>

          <div className="field mb-0">
            <span className="label">Brand name next to custom logo</span>
            <label className="field-check mt-2">
              <input
                type="checkbox"
                checked={draft.logoShowText}
                onChange={(event) =>
                  setDraft((prev) => ({ ...prev, logoShowText: event.target.checked }))
                }
              />
              <span>লোগো ছবির পাশে ব্র্যান্ডের নাম ও ট্যাগলাইনও দেখাও (চৌকো আইকন লোগোর জন্য উপযোগী)</span>
            </label>
          </div>
        </div>

        {/* আগে আপলোড করা ব্র্যান্ড ছবি থেকে ১-ক্লিকে বেছে নেওয়ার গ্যালারি */}
        {recentMedia.length > 0 ? (
          <div className="logo-history">
            <p className="label mb-2">Previously uploaded brand images ({recentMedia.length})</p>
            <div className="logo-history-grid">
              {recentMedia.map((item) => {
                const isMain = draft.logoUrl === item.url;
                const isLight = draft.logoLightUrl === item.url;
                return (
                  <div className="logo-history-item" key={item.id}>
                    <div className="logo-history-thumb">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={item.url} alt={item.alt ?? ""} />
                    </div>
                    <div className="logo-history-btns">
                      <button
                        type="button"
                        className={`btn btn-sm ${isMain ? "btn-primary" : "btn-outline"}`}
                        disabled={anyBusy}
                        onClick={() => void applyRecentMedia("logoUrl", item.url, "Main logo")}
                      >
                        {isMain ? "Main active" : "Use as Main"}
                      </button>
                      <button
                        type="button"
                        className={`btn btn-sm ${isLight ? "btn-primary" : "btn-ghost"}`}
                        disabled={anyBusy}
                        onClick={() => void applyRecentMedia("logoLightUrl", item.url, "Light logo")}
                      >
                        {isLight ? "Light active" : "Use as Light"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
