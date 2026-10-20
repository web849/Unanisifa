"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { UploadCloud } from "lucide-react";
import { IMAGE_ACCEPT } from "@/components/admin/image-field";

type UploadResult = { name: string; ok: boolean; url?: string; error?: string };

export function StorageUploader({ folders }: { folders: string[] }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [folder, setFolder] = useState(folders[0] ?? "products");
  const [alt, setAlt] = useState("");
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<UploadResult[] | null>(null);

  const upload = async (event: React.FormEvent) => {
    event.preventDefault();
    const files = fileRef.current?.files;
    if (!files || files.length === 0) {
      setResults([{ name: "", ok: false, error: "Choose at least one file first" }]);
      return;
    }
    setBusy(true);
    setResults(null);
    const batch = Array.from(files).slice(0, 10);
    const done: UploadResult[] = [];
    for (const file of batch) {
      if (file.size < 64 || file.size > 5 * 1024 * 1024) {
        done.push({ name: file.name, ok: false, error: "File must be between 64 B and 5 MB" });
        continue;
      }
      try {
        const form = new FormData();
        form.set("file", file);
        form.set("folder", folder);
        form.set("alt", alt);
        const response = await fetch("/api/admin/storage/upload", { method: "POST", body: form });
        const json = (await response.json()) as { ok?: boolean; error?: string; url?: string };
        if (response.ok && json.ok && json.url) {
          done.push({ name: file.name, ok: true, url: json.url });
        } else {
          done.push({ name: file.name, ok: false, error: json.error ?? "Upload failed" });
        }
      } catch {
        done.push({ name: file.name, ok: false, error: "Network error" });
      }
    }
    setResults(done);
    if (fileRef.current) fileRef.current.value = "";
    setAlt("");
    setBusy(false);
    router.refresh();
  };

  return (
    <div className="panel mb-4">
      <div className="panel-head">
        <h2 className="panel-title">Upload</h2>
      </div>
      <form onSubmit={upload} className="panel-body grid-4">
        <label className="field">
          <span className="label">Files (jpg, png, webp, avif, svg · up to 10)</span>
          <input className="input" type="file" ref={fileRef} accept={IMAGE_ACCEPT} multiple required />
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
          <ul className="field-full image-list mb-0">
            {results.map((result, index) => (
              <li key={`${result.name}-${index}`}>
                <span className={result.ok ? "ok-text" : "error-text"}>
                  {result.ok ? `Uploaded ${result.name}: ${result.url}` : `${result.name || "File"}: ${result.error}`}
                </span>
              </li>
            ))}
          </ul>
        ) : null}
      </form>
    </div>
  );
}
