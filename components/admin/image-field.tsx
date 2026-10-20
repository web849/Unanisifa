"use client";

import { useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";

export const IMAGE_ACCEPT =
  "image/jpeg,image/png,image/webp,image/avif,image/svg+xml,image/x-icon,.svg,.ico";

/**
 * একটিমাত্র ছবি আপলোড করে URL ফেরত দেয়।
 * ব্যর্থ হলে বাংলা/ইংরেজি বার্তাসহ Error থ্রো করে।
 */
export async function uploadImageFile(file: File, folder: string, alt = ""): Promise<string> {
  if (file.size < 64 || file.size > 5 * 1024 * 1024) {
    throw new Error("ছবি 64 B – 5 MB এর মধ্যে হতে হবে।");
  }
  const form = new FormData();
  form.set("file", file);
  form.set("folder", folder);
  form.set("alt", alt);
  let response: Response;
  try {
    response = await fetch("/api/admin/storage/upload", { method: "POST", body: form });
  } catch {
    throw new Error("নেটওয়ার্ক সমস্যা — আবার চেষ্টা করুন।");
  }
  const json = (await response.json().catch(() => null)) as {
    ok?: boolean;
    error?: string;
    url?: string;
  } | null;
  if (!response.ok || !json?.ok || !json.url) {
    throw new Error(json?.error ?? "আপলোড ব্যর্থ হয়েছে।");
  }
  return json.url;
}

/**
 * ছোট আপলোড বোতাম — যেকোনো URL ইনপুটের পাশে বসানো যায়।
 * সফল হলে onUploaded(url) কল করে।
 */
export function UploadButton({
  folder,
  onUploaded,
  disabled = false,
  label = "আপলোড",
  alt = "",
}: {
  folder: string;
  onUploaded: (url: string) => void;
  disabled?: boolean;
  label?: string;
  alt?: string;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pick = () => {
    setError(null);
    fileRef.current?.click();
  };

  const onFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const url = await uploadImageFile(file, folder, alt);
      onUploaded(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "আপলোড ব্যর্থ হয়েছে।");
    } finally {
      setBusy(false);
    }
  };

  return (
    <span className="upload-btn-wrap">
      <input
        ref={fileRef}
        type="file"
        accept={IMAGE_ACCEPT}
        className="sr-only"
        aria-hidden="true"
        tabIndex={-1}
        disabled={disabled || busy}
        onChange={(event) => void onFile(event)}
      />
      <button type="button" className="btn btn-outline btn-sm upload-btn" disabled={disabled || busy} onClick={pick}>
        <ImagePlus aria-hidden="true" />
        {busy ? "আপলোড হচ্ছে…" : label}
      </button>
      {error ? (
        <span className="error-text upload-btn-error" role="alert">
          {error}
        </span>
      ) : null}
    </span>
  );
}

/**
 * ImageField — URL পেস্ট + সরাসরি ফাইল আপলোড + প্রিভিউ, একসাথে।
 * পণ্য, ব্যানার, ক্যাটাগরি, পপআপ, লোগো — সব ফর্মে একই কম্পোনেন্ট।
 */
export function ImageField({
  label,
  value,
  onChange,
  folder,
  placeholder = "ছবি আপলোড করুন অথবা URL পেস্ট করুন",
  hint,
  required = false,
  disabled = false,
  alt = "",
  fit = "cover",
}: {
  label: string;
  value: string;
  onChange: (url: string) => void;
  folder: string;
  placeholder?: string;
  hint?: string;
  required?: boolean;
  disabled?: boolean;
  alt?: string;
  fit?: "cover" | "contain";
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const onFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const url = await uploadImageFile(file, folder, alt || label);
      onChange(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "আপলোড ব্যর্থ হয়েছে।");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="field image-field">
      <span className="label">{label}</span>
      <div className="image-field-row">
        <input
          className="input mono"
          value={value}
          required={required}
          disabled={disabled || busy}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
        />
        <input
          ref={fileRef}
          type="file"
          accept={IMAGE_ACCEPT}
          className="sr-only"
          aria-hidden="true"
          tabIndex={-1}
          disabled={disabled || busy}
          onChange={(event) => void onFile(event)}
        />
        <button
          type="button"
          className="btn btn-outline btn-sm image-field-upload"
          disabled={disabled || busy}
          onClick={() => {
            setError(null);
            fileRef.current?.click();
          }}
        >
          <ImagePlus aria-hidden="true" />
          {busy ? "আপলোড হচ্ছে…" : "ছবি তুলুন"}
        </button>
      </div>
      {value ? (
        <div className="image-field-preview">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt=""
            style={
              fit === "contain" || folder === "brand"
                ? { objectFit: "contain", width: "auto", maxWidth: "180px", padding: "4px 8px" }
                : undefined
            }
          />
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            disabled={disabled || busy}
            onClick={() => onChange("")}
            aria-label="ছবি সরান"
          >
            <X aria-hidden="true" />
            সরান
          </button>
        </div>
      ) : null}
      {error ? (
        <span className="error-text" role="alert">
          {error}
        </span>
      ) : null}
      {hint ? <span className="help-text">{hint}</span> : null}
    </div>
  );
}
