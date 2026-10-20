"use client";

/**
 * Storage (R2) আপলোডার — আপলোড শেষ হলেই প্রতিটি ছবির প্রিভিউসহ
 * "লিংক কপি" ও "HTML কপি" বোতাম দেখায়, যাতে ওই লিংক/কোড সরাসরি
 * ল্যান্ডিং পেজের HTML ব্লক বা যেকোনো HTML-এ পেস্ট করা যায়।
 * ফাইল টেনে এনে (drag & drop) ছেড়েও আপলোড করা যায়।
 */

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { UploadCloud } from "lucide-react";
import { IMAGE_ACCEPT, uploadImageFileDetailed, type UploadedImage } from "@/components/admin/image-field";
import { MediaCopyActions } from "@/components/admin/media-copy-actions";

type UploadResult =
  | { name: string; ok: true; uploaded: UploadedImage }
  | { name: string; ok: false; error: string };

export function StorageUploader({ folders }: { folders: string[] }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [folder, setFolder] = useState(() =>
    folders.includes("media") ? "media" : folders[0] ?? "media",
  );
  const [alt, setAlt] = useState("");
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [results, setResults] = useState<UploadResult[] | null>(null);

  const uploadFiles = async (files: File[]) => {
    const batch = files.slice(0, 10);
    if (batch.length === 0) {
      setResults([{ name: "", ok: false, error: "অন্তত একটি ছবি বেছে নিন।" }]);
      return;
    }
    setBusy(true);
    setResults(null);
    const done: UploadResult[] = [];
    for (const file of batch) {
      try {
        const uploaded = await uploadImageFileDetailed(file, folder, alt.trim());
        done.push({ name: file.name, ok: true, uploaded });
      } catch (error) {
        done.push({
          name: file.name,
          ok: false,
          error: error instanceof Error ? error.message : "আপলোড ব্যর্থ হয়েছে।",
        });
      }
    }
    setResults(done);
    if (fileRef.current) fileRef.current.value = "";
    setAlt("");
    setBusy(false);
    router.refresh();
  };

  const upload = async (event: React.FormEvent) => {
    event.preventDefault();
    await uploadFiles(Array.from(fileRef.current?.files ?? []));
  };

  return (
    <div className="panel mb-4">
      <div className="panel-head">
        <h2 className="panel-title">Upload — ছবি আপলোড করুন</h2>
      </div>
      <form
        onSubmit={(event) => void upload(event)}
        className="panel-body grid-4"
        onDragOver={(event) => {
          event.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragOver(false);
          void uploadFiles(Array.from(event.dataTransfer.files ?? []));
        }}
        data-drag-over={dragOver ? "true" : undefined}
      >
        <label className="field">
          <span className="label">Files (jpg, png, webp, avif, svg · up to 10)</span>
          <input className="input" type="file" ref={fileRef} accept={IMAGE_ACCEPT} multiple required />
          <span className="help-text">অথবা ছবি এই প্যানেলে টেনে এনে ছেড়ে দিন।</span>
        </label>
        <label className="field">
          <span className="label">Folder</span>
          <select className="input" value={folder} onChange={(e) => setFolder(e.target.value)}>
            {folders.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <span className="help-text">ল্যান্ডিং/HTML-এর ছবির জন্য media রাখুন।</span>
        </label>
        <label className="field">
          <span className="label">Alt text</span>
          <input className="input" value={alt} onChange={(e) => setAlt(e.target.value)} maxLength={300} />
        </label>
        <div className="field">
          <span className="label">&nbsp;</span>
          <button type="submit" className="btn btn-primary" disabled={busy}>
            <UploadCloud aria-hidden="true" />
            {busy ? "Uploading…" : "Upload"}
          </button>
        </div>

        {results ? (
          <div className="field-full media-upload-results">
            {results.map((result, index) =>
              result.ok ? (
                <div className="media-result-row" key={`${result.name}-${index}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={result.uploaded.url} alt="" className="media-result-thumb" />
                  <div className="media-result-main">
                    <p className="mb-0">
                      <strong>{result.name}</strong>{" "}
                      <span className="text-small text-muted">
                        ({result.uploaded.storage === "r2" ? "Cloudflare R2" : "Database"} ·{" "}
                        {Math.max(1, Math.round(result.uploaded.sizeBytes / 1024))} KB)
                      </span>
                    </p>
                    <input
                      className="input mono media-result-url"
                      value={result.uploaded.url}
                      readOnly
                      aria-label="ছবির লিংক"
                      onFocus={(event) => event.target.select()}
                    />
                  </div>
                  <MediaCopyActions url={result.uploaded.url} alt={result.uploaded.alt} />
                </div>
              ) : (
                <p className="error-text mb-0" key={`${result.name}-${index}`} role="alert">
                  {result.name || "File"}: {result.error}
                </p>
              ),
            )}
            {results.some((result) => result.ok) ? (
              <p className="help-text mb-0">
                &quot;HTML কপি&quot; চাপলে পুরো &lt;img&gt; কোড কপি হবে — Landing Pages থেকে Builder খুলে HTML
                Code ব্লকে পেস্ট করে নিজের মতো সাজান (style বদলাতে পারেন)।
              </p>
            ) : null}
          </div>
        ) : null}
      </form>
    </div>
  );
}
