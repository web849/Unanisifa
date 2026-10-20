"use client";

/**
 * মিডিয়া লাইব্রেরি — আপলোড করা ছবির গ্রিড + পিকার।
 *
 * দুই জায়গায় ব্যবহৃত হয়:
 *  ১. Storage (R2) পেজ — সব আপলোড করা ছবি, প্রতিটিতে লিংক/HTML কপি বোতাম।
 *  ২. ল্যান্ডিং বিল্ডারের HTML ব্লক — ছবি আপলোড করে এক ক্লিকে কার্সরের
 *     জায়গায় <img> বসানো, অথবা লিংক কপি করে নিজের HTML-এ ব্যবহার।
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Image as ImageIcon, RefreshCw, Search, UploadCloud } from "lucide-react";
import { IMAGE_ACCEPT, uploadImageFileDetailed } from "@/components/admin/image-field";
import { MediaCopyActions } from "@/components/admin/media-copy-actions";
import { apiErrorMessage } from "@/lib/admin/api-error-message";
import { imageHtmlSnippet } from "@/lib/media/snippet";

export type MediaLibraryItem = {
  id: string;
  url: string;
  objectKey: string;
  mimeType: string;
  sizeBytes: number;
  folder: string;
  alt: string | null;
  storage: string;
  createdAt: string;
};

function formatSize(sizeBytes: number): string {
  if (sizeBytes >= 1024 * 1024) return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(sizeBytes / 1024))} KB`;
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

/** ছবির কার্ড-গ্রিড — খোঁজা যায়, প্রতিটি কার্ডে কপি/বসানোর বোতাম */
export function MediaLibraryGrid({
  items,
  onInsertHtml,
  onPickUrl,
  emptyMessage = "এখনো কোনো ছবি আপলোড করা হয়নি।",
}: {
  items: MediaLibraryItem[];
  onInsertHtml?: (html: string) => void;
  onPickUrl?: (url: string) => void;
  emptyMessage?: string;
}) {
  const [query, setQuery] = useState("");
  const [insertedKey, setInsertedKey] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) =>
      `${item.objectKey} ${item.alt ?? ""} ${item.folder}`.toLowerCase().includes(q),
    );
  }, [items, query]);

  const insert = (item: MediaLibraryItem) => {
    if (!onInsertHtml) return;
    // একই সাইটের HTML ব্লকে বসাই — সংরক্ষিত URL (আপেক্ষিক হলে তাই) রাখি,
    // ডোমেইন বদলালেও লিংক ভাঙবে না। বাইরে শেয়ারের জন্য "HTML কপি" পূর্ণ URL দেয়।
    onInsertHtml(imageHtmlSnippet(item.url, item.alt ?? "", { absolute: false }));
    setInsertedKey(item.objectKey);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setInsertedKey(null), 2200);
  };

  return (
    <div className="media-library">
      <label className="media-library-search">
        <Search aria-hidden="true" />
        <span className="sr-only">ছবি খুঁজুন</span>
        <input
          className="input"
          placeholder="ছবি খুঁজুন (নাম / ফোল্ডার)…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <span className="text-small text-muted">{visible.length}টি ছবি</span>
      </label>

      {visible.length === 0 ? (
        <p className="text-small text-muted mb-0">{items.length === 0 ? emptyMessage : "খোঁজের সাথে কোনো ছবি মেলেনি।"}</p>
      ) : (
        <div className="media-grid">
          {visible.map((item) => (
            <article className="media-card" key={item.id || item.objectKey}>
              <div className="media-card-thumb">
                {item.mimeType.startsWith("image/") ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.url} alt={item.alt ?? ""} loading="lazy" />
                ) : (
                  <ImageIcon aria-hidden="true" />
                )}
                <span className={`badge ${item.storage === "r2" ? "badge-active" : "badge-outline"} media-card-badge`}>
                  {item.storage === "r2" ? "R2" : "Database"}
                </span>
              </div>
              <div className="media-card-body">
                <p className="media-card-name mono" title={item.objectKey}>
                  {item.objectKey}
                </p>
                <p className="text-small text-muted mb-0">
                  {item.folder} · {formatSize(item.sizeBytes)}
                  {item.createdAt ? ` · ${formatDate(item.createdAt)}` : ""}
                </p>
                <input
                  className="input mono media-card-url"
                  value={item.url}
                  readOnly
                  aria-label="ছবির লিংক"
                  onFocus={(event) => event.target.select()}
                />
                <div className="media-card-actions">
                  <MediaCopyActions url={item.url} alt={item.alt ?? ""} compact />
                  {onInsertHtml ? (
                    <button type="button" className="btn btn-primary btn-sm" onClick={() => insert(item)}>
                      {insertedKey === item.objectKey ? <Check aria-hidden="true" /> : null}
                      {insertedKey === item.objectKey ? "বসানো হয়েছে" : "HTML-এ বসান"}
                    </button>
                  ) : null}
                  {onPickUrl ? (
                    <button type="button" className="btn btn-outline btn-sm" onClick={() => onPickUrl(item.url)}>
                      ব্যবহার করুন
                    </button>
                  ) : null}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * ভাঁজ-করা মিডিয়া-পিকার — HTML এডিটরে বসে।
 * খোলার সময়ই কেবল /api/admin/storage থেকে তালিকা আনে।
 * আপলোড সফল হলে (autoInsertOnUpload থাকলে) সঙ্গে সঙ্গে HTML-এ ছবি বসে যায়।
 */
export function MediaPicker({
  onInsertHtml,
  onPickUrl,
  autoInsertOnUpload = false,
  folder = "media",
  disabled = false,
}: {
  onInsertHtml?: (html: string) => void;
  onPickUrl?: (url: string) => void;
  autoInsertOnUpload?: boolean;
  folder?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<MediaLibraryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const loadedRef = useRef(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/storage?limit=80");
      const json = (await response.json().catch(() => null)) as {
        ok?: boolean;
        error?: string;
        items?: MediaLibraryItem[];
      } | null;
      if (!response.ok || !json?.ok) {
        setError(apiErrorMessage(json, "ছবির তালিকা আনা যায়নি।", response.status));
        return;
      }
      setItems(json.items ?? []);
      loadedRef.current = true;
    } catch {
      setError("নেটওয়ার্ক সমস্যা — আবার চেষ্টা করুন।");
    } finally {
      setLoading(false);
    }
  }, []);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next && !loadedRef.current) void load();
  };

  const onFiles = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []).slice(0, 10);
    event.target.value = "";
    if (files.length === 0) return;
    setUploading(true);
    setError(null);
    setNotice(null);
    const inserted: string[] = [];
    const failures: string[] = [];
    for (const file of files) {
      try {
        const result = await uploadImageFileDetailed(file, folder);
        const item: MediaLibraryItem = {
          id: result.id ?? result.objectKey,
          url: result.url,
          objectKey: result.objectKey,
          mimeType: result.mimeType,
          sizeBytes: result.sizeBytes,
          folder,
          alt: result.alt || null,
          storage: result.storage,
          createdAt: new Date().toISOString(),
        };
        setItems((previous) => [item, ...previous]);
        if (autoInsertOnUpload && onInsertHtml) {
          onInsertHtml(imageHtmlSnippet(item.url, item.alt ?? "", { absolute: false }));
          inserted.push(file.name);
        }
      } catch (err) {
        failures.push(`${file.name}: ${err instanceof Error ? err.message : "আপলোড ব্যর্থ"}`);
      }
    }
    if (inserted.length > 0) {
      setNotice(`${inserted.length}টি ছবি আপলোড হয়ে HTML-এ বসানো হয়েছে। নিচের প্রিভিউতে দেখে Save করুন।`);
    } else if (failures.length === 0) {
      setNotice("ছবি আপলোড হয়েছে — নিচের তালিকা থেকে লিংক/HTML কপি করুন।");
    }
    if (failures.length > 0) setError(failures.join(" · "));
    setUploading(false);
  };

  return (
    <div className="media-picker">
      <button
        type="button"
        className="btn btn-outline btn-sm media-picker-toggle"
        disabled={disabled}
        aria-expanded={open}
        onClick={toggle}
      >
        <ImageIcon aria-hidden="true" />
        ছবি যোগ করুন (R2/Media) — আপলোড · লিংক কপি · HTML-এ বসান
        <ChevronDown aria-hidden="true" className={open ? "media-picker-chevron-open" : undefined} />
      </button>

      {open ? (
        <div className="media-picker-body">
          <div className="field-row">
            <input
              ref={fileRef}
              type="file"
              accept={IMAGE_ACCEPT}
              multiple
              className="sr-only"
              aria-hidden="true"
              tabIndex={-1}
              disabled={disabled || uploading}
              onChange={(event) => void onFiles(event)}
            />
            <button
              type="button"
              className="btn btn-primary btn-sm"
              disabled={disabled || uploading}
              onClick={() => fileRef.current?.click()}
            >
              <UploadCloud aria-hidden="true" />
              {uploading ? "আপলোড হচ্ছে…" : autoInsertOnUpload ? "ছবি আপলোড করে HTML-এ বসান" : "নতুন ছবি আপলোড"}
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              disabled={loading}
              onClick={() => void load()}
            >
              {loading ? <RefreshCw aria-hidden="true" className="spin" /> : <RefreshCw aria-hidden="true" />}
              Refresh
            </button>
          </div>
          <p className="help-text">
            R2 কানেক্ট থাকলে ছবি R2-তে ওঠে, না থাকলে ডেটাবেজে — দুই ক্ষেত্রেই লিংক কাজ করে।
            প্রতিটি কার্ডে &quot;লিংক&quot; (শুধু URL) ও &quot;HTML&quot; (পুরো &lt;img&gt; কোড) কপি করা যায়।
          </p>
          {notice ? (
            <p className="ok-text text-small" role="status">
              {notice}
            </p>
          ) : null}
          {error ? (
            <p className="error-text text-small" role="alert">
              {error}
            </p>
          ) : null}
          {loading && items.length === 0 ? (
            <p className="text-small text-muted mb-0">ছবির তালিকা লোড হচ্ছে…</p>
          ) : (
            <MediaLibraryGrid
              items={items}
              onInsertHtml={onInsertHtml}
              onPickUrl={onPickUrl}
              emptyMessage="এখনো কোনো ছবি নেই — উপরের বোতামে প্রথম ছবিটি আপলোড করুন।"
            />
          )}
        </div>
      ) : null}
    </div>
  );
}
