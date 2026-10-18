"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { UploadCloud } from "lucide-react";

export function StorageUploader({ folders }: { folders: string[] }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [folder, setFolder] = useState(folders[0] ?? "products");
  const [alt, setAlt] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "err"; text: string } | null>(null);

  const upload = async (event: React.FormEvent) => {
    event.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setMessage({ tone: "err", text: "Choose a file first" });
      return;
    }
    if (file.size < 1024 || file.size > 5 * 1024 * 1024) {
      setMessage({ tone: "err", text: "File must be between 1 KB and 5 MB" });
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const form = new FormData();
      form.set("file", file);
      form.set("folder", folder);
      form.set("alt", alt);
      const response = await fetch("/api/admin/storage/upload", { method: "POST", body: form });
      const json = (await response.json()) as { ok?: boolean; error?: string; data?: { url?: string } };
      if (response.ok && json.ok) {
        setMessage({ tone: "ok", text: `Uploaded: ${json.data?.url ?? ""}` });
        if (fileRef.current) fileRef.current.value = "";
        setAlt("");
        router.refresh();
      } else {
        setMessage({ tone: "err", text: json.error ?? "Upload failed" });
      }
    } catch {
      setMessage({ tone: "err", text: "Network error" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="panel mb-4">
      <div className="panel-head">
        <h2 className="panel-title">Upload</h2>
      </div>
      <form onSubmit={upload} className="panel-body grid-4">
        <label className="field">
          <span className="label">File (jpg, png, webp, avif, svg)</span>
          <input className="input" type="file" ref={fileRef} accept="image/jpeg,image/png,image/webp,image/avif,image/svg+xml" required />
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
        {message ? (
          <p className={`field-full mb-0 ${message.tone === "ok" ? "ok-text" : "error-text"}`}>{message.text}</p>
        ) : null}
      </form>
    </div>
  );
}
