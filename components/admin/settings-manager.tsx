"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import type { BrandSettings, CommerceSettings } from "@/lib/config";
import { ImageField } from "@/components/admin/image-field";

export function SettingsManager({
  brand,
  commerce,
  mysteryEnabled,
}: {
  brand: BrandSettings;
  commerce: CommerceSettings;
  mysteryEnabled: boolean;
}) {
  const router = useRouter();
  const [brandDraft, setBrandDraft] = useState<BrandSettings>(brand);
  const [commerceDraft, setCommerceDraft] = useState<CommerceSettings>(commerce);
  const [mystery, setMystery] = useState(mysteryEnabled);
  const [message, setMessage] = useState<{ tone: "ok" | "err"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const saveBrand = async () => {
    setBusy(true);
    setMessage(null);
    const response = await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ brand: brandDraft }),
    });
    const json = (await response.json()) as { ok?: boolean; error?: string };
    if (response.ok && json.ok) {
      setMessage({ tone: "ok", text: "Brand settings saved" });
      router.refresh();
    } else {
      setMessage({ tone: "err", text: json.error ?? "Save failed" });
    }
    setBusy(false);
  };

  const saveCommerce = async () => {
    setBusy(true);
    setMessage(null);
    const response = await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ commerce: commerceDraft }),
    });
    const json = (await response.json()) as { ok?: boolean; error?: string };
    if (response.ok && json.ok) {
      setMessage({ tone: "ok", text: "Commerce settings saved" });
      router.refresh();
    } else {
      setMessage({ tone: "err", text: json.error ?? "Save failed" });
    }
    setBusy(false);
  };

  const saveMystery = async () => {
    setBusy(true);
    setMessage(null);
    const response = await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ popup: { mysteryEnabled: mystery } }),
    });
    const json = (await response.json()) as { ok?: boolean; error?: string };
    if (response.ok && json.ok) {
      setMessage({ tone: "ok", text: "Popup settings saved" });
      router.refresh();
    } else {
      setMessage({ tone: "err", text: json.error ?? "Save failed" });
    }
    setBusy(false);
  };

  const b = <K extends keyof BrandSettings>(key: K, value: BrandSettings[K]) =>
    setBrandDraft((prev) => ({ ...prev, [key]: value }));
  const c = <K extends keyof CommerceSettings>(key: K, value: CommerceSettings[K]) =>
    setCommerceDraft((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="stack stack-md">
      {message ? <p className={message.tone === "ok" ? "ok-text" : "error-text"}>{message.text}</p> : null}

      <div className="panel">
        <div className="panel-head">
          <h2 className="panel-title">Brand</h2>
          <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={() => void saveBrand()}>
            <Save aria-hidden="true" />
            Save brand
          </button>
        </div>
        <div className="panel-body grid-2">
          <label className="field">
            <span className="label">Name</span>
            <input className="input" value={brandDraft.name} onChange={(e) => b("name", e.target.value)} />
          </label>
          <label className="field">
            <span className="label">Tagline</span>
            <input className="input" value={brandDraft.tagline} onChange={(e) => b("tagline", e.target.value)} />
          </label>
          <label className="field field-full">
            <span className="label">Description</span>
            <textarea className="input" rows={2} value={brandDraft.description} onChange={(e) => b("description", e.target.value)} />
          </label>
          <label className="field">
            <span className="label">Phone</span>
            <input className="input mono" value={brandDraft.phone} onChange={(e) => b("phone", e.target.value)} />
          </label>
          <label className="field">
            <span className="label">Phone (international)</span>
            <input className="input mono" value={brandDraft.phoneInternational} onChange={(e) => b("phoneInternational", e.target.value)} />
          </label>
          <label className="field">
            <span className="label">WhatsApp (country code, no +)</span>
            <input className="input mono" value={brandDraft.whatsapp} onChange={(e) => b("whatsapp", e.target.value)} />
          </label>
          <label className="field">
            <span className="label">Support email</span>
            <input className="input" type="email" value={brandDraft.email} onChange={(e) => b("email", e.target.value)} />
          </label>
          <label className="field">
            <span className="label">Address</span>
            <input className="input" value={brandDraft.address} onChange={(e) => b("address", e.target.value)} />
          </label>
          <label className="field">
            <span className="label">Return address</span>
            <input className="input" value={brandDraft.returnAddress} onChange={(e) => b("returnAddress", e.target.value)} />
          </label>
          <label className="field">
            <span className="label">Service area</span>
            <input className="input" value={brandDraft.serviceArea} onChange={(e) => b("serviceArea", e.target.value)} />
          </label>
          <label className="field">
            <span className="label">Support hours</span>
            <input className="input" value={brandDraft.supportHours} onChange={(e) => b("supportHours", e.target.value)} />
          </label>
          <label className="field">
            <span className="label">Facebook page URL</span>
            <input className="input" value={brandDraft.facebook} onChange={(e) => b("facebook", e.target.value)} placeholder="https://facebook.com/…" />
          </label>
          <label className="field">
            <span className="label">Site URL</span>
            <input className="input mono" value={brandDraft.siteUrl} onChange={(e) => b("siteUrl", e.target.value)} />
          </label>
          <ImageField
            label="Logo (empty = built-in)"
            value={brandDraft.logoUrl}
            onChange={(url) => b("logoUrl", url)}
            folder="brand"
            hint="ছবি তুলুন অথবা URL পেস্ট করুন"
            alt="logo"
          />
          <ImageField
            label="Logo light (empty = built-in)"
            value={brandDraft.logoLightUrl}
            onChange={(url) => b("logoLightUrl", url)}
            folder="brand"
            hint="ছবি তুলুন অথবা URL পেস্ট করুন"
            alt="logo light"
          />
          <label className="field">
            <span className="label">Drug license number (empty shows “Pending”)</span>
            <input className="input mono" value={brandDraft.drugLicense} onChange={(e) => b("drugLicense", e.target.value)} />
          </label>
          <label className="field">
            <span className="label">Primary color</span>
            <input className="input mono" value={brandDraft.primaryColor} onChange={(e) => b("primaryColor", e.target.value)} />
          </label>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <h2 className="panel-title">Commerce</h2>
          <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={() => void saveCommerce()}>
            <Save aria-hidden="true" />
            Save commerce
          </button>
        </div>
        <div className="panel-body grid-4">
          <label className="field">
            <span className="label">Delivery inside Dhaka (৳)</span>
            <input className="input" type="number" min={0} value={commerceDraft.deliveryInsideDhaka} onChange={(e) => c("deliveryInsideDhaka", Number(e.target.value))} />
          </label>
          <label className="field">
            <span className="label">Delivery outside Dhaka (৳)</span>
            <input className="input" type="number" min={0} value={commerceDraft.deliveryOutsideDhaka} onChange={(e) => c("deliveryOutsideDhaka", Number(e.target.value))} />
          </label>
          <label className="field">
            <span className="label">Free delivery threshold (0 = off)</span>
            <input className="input" type="number" min={0} value={commerceDraft.freeDeliveryThreshold} onChange={(e) => c("freeDeliveryThreshold", Number(e.target.value))} />
          </label>
          <label className="field">
            <span className="label">Max quantity per line</span>
            <input className="input" type="number" min={1} max={100} value={commerceDraft.maxQuantity} onChange={(e) => c("maxQuantity", Number(e.target.value))} />
          </label>
          <label className="field">
            <span className="label">Default low stock threshold</span>
            <input className="input" type="number" min={0} value={commerceDraft.lowStockThreshold} onChange={(e) => c("lowStockThreshold", Number(e.target.value))} />
          </label>
          <label className="field">
            <span className="label">Default advance (৳, 0 = full COD)</span>
            <input className="input" type="number" min={0} value={commerceDraft.defaultAdvance} onChange={(e) => c("defaultAdvance", Number(e.target.value))} />
          </label>
          <label className="field">
            <span className="label">Min subtotal (0 = n/a)</span>
            <input className="input" type="number" min={0} value={commerceDraft.minSubtotal} onChange={(e) => c("minSubtotal", Number(e.target.value))} />
          </label>
          <label className="field field-check">
            <input type="checkbox" checked={commerceDraft.codEnabled} onChange={(e) => c("codEnabled", e.target.checked)} />
            <span>Cash on delivery enabled</span>
          </label>
          <label className="field">
            <span className="label">Courier cost inside (৳)</span>
            <input className="input" type="number" min={0} value={commerceDraft.courierCostInside} onChange={(e) => c("courierCostInside", Number(e.target.value))} />
          </label>
          <label className="field">
            <span className="label">Courier cost outside (৳)</span>
            <input className="input" type="number" min={0} value={commerceDraft.courierCostOutside} onChange={(e) => c("courierCostOutside", Number(e.target.value))} />
          </label>
          <label className="field">
            <span className="label">Packaging cost / order (৳)</span>
            <input className="input" type="number" min={0} value={commerceDraft.packagingCost} onChange={(e) => c("packagingCost", Number(e.target.value))} />
          </label>
          <label className="field">
            <span className="label">Extras / order (৳)</span>
            <input className="input" type="number" min={0} value={commerceDraft.perOrderExtras} onChange={(e) => c("perOrderExtras", Number(e.target.value))} />
          </label>
          <label className="field">
            <span className="label">Monthly fixed cost (৳)</span>
            <input className="input" type="number" min={0} value={commerceDraft.monthlyFixedCost} onChange={(e) => c("monthlyFixedCost", Number(e.target.value))} />
          </label>
          <label className="field">
            <span className="label">Currency</span>
            <input className="input mono" value={commerceDraft.currency} onChange={(e) => c("currency", e.target.value)} />
          </label>
          <label className="field">
            <span className="label">Currency symbol</span>
            <input className="input" value={commerceDraft.currencySymbol} onChange={(e) => c("currencySymbol", e.target.value)} />
          </label>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <h2 className="panel-title">Popup behaviour</h2>
          <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={() => void saveMystery()}>
            <Save aria-hidden="true" />
            Save popups
          </button>
        </div>
        <div className="panel-body">
          <label className="field-check">
            <input type="checkbox" checked={mystery} onChange={(e) => setMystery(e.target.checked)} />
            <span>Mystery offer popup enabled (takes priority over campaign popups)</span>
          </label>
        </div>
      </div>
    </div>
  );
}
