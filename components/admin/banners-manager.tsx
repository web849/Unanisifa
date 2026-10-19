"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { formatDateEn } from "@/lib/utils";
import { ImageField } from "@/components/admin/image-field";

export type BannerRow = {
  id: number;
  title: string;
  imageUrl: string;
  linkUrl: string | null;
  altText: string | null;
  sortOrder: number;
  active: boolean;
  startsAt: Date | null;
  endsAt: Date | null;
};

const emptyDraft = {
  title: "",
  imageUrl: "",
  linkUrl: "",
  altText: "",
  sortOrder: 0,
  active: true,
};

export function BannersManager({ initial }: { initial: BannerRow[] }) {
  const router = useRouter();
  const [rows, setRows] = useState<BannerRow[]>(initial);
  const [draft, setDraft] = useState(emptyDraft);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const activeCount = rows.filter((row) => row.active).length;

  const create = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    const response = await fetch("/api/admin/banners", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft),
    });
    const json = (await response.json()) as { ok?: boolean; error?: string };
    if (response.ok && json.ok) {
      setDraft(emptyDraft);
      router.refresh();
    } else {
      setMessage(json.error ?? "Create failed");
    }
    setBusy(false);
  };

  const toggle = async (row: BannerRow) => {
    const response = await fetch(`/api/admin/banners/${row.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !row.active }),
    });
    const json = (await response.json()) as { ok?: boolean; error?: string };
    if (response.ok && json.ok) {
      setRows((prev) => prev.map((item) => (item.id === row.id ? { ...item, active: !item.active } : item)));
    } else {
      setMessage(json.error ?? "Update failed");
    }
  };

  const remove = async (row: BannerRow) => {
    if (!confirm(`Delete banner "${row.title}"?`)) return;
    const response = await fetch(`/api/admin/banners/${row.id}`, { method: "DELETE" });
    if (response.ok) setRows((prev) => prev.filter((item) => item.id !== row.id));
  };

  return (
    <div className="stack stack-md">
      {message ? <p className="error-text">{message}</p> : null}
      <p className={`text-small mb-0 ${activeCount >= 5 ? "error-text" : "text-muted"}`}>Active banners: {activeCount}/5</p>

      <div className="panel">
        <div className="panel-head">
          <h2 className="panel-title">New banner</h2>
        </div>
        <form onSubmit={create} className="panel-body grid-4">
          <label className="field">
            <span className="label">Title (Bangla)</span>
            <input className="input" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} required />
          </label>
          <ImageField
            label="Image (1200×480)"
            value={draft.imageUrl}
            onChange={(url) => setDraft({ ...draft, imageUrl: url })}
            folder="banners"
            required
            placeholder="/banners/b-01.svg"
            hint="ছবি তুলুন অথবা URL পেস্ট করুন"
            alt={draft.title}
          />
          <label className="field">
            <span className="label">Link URL</span>
            <input
              className="input"
              value={draft.linkUrl}
              onChange={(e) => setDraft({ ...draft, linkUrl: e.target.value })}
              placeholder="/products or /offer/slug"
            />
          </label>
          <label className="field">
            <span className="label">Alt text</span>
            <input className="input" value={draft.altText} onChange={(e) => setDraft({ ...draft, altText: e.target.value })} />
          </label>
          <label className="field">
            <span className="label">Sort order</span>
            <input
              className="input"
              type="number"
              min={0}
              value={draft.sortOrder}
              onChange={(e) => setDraft({ ...draft, sortOrder: Number(e.target.value) })}
            />
          </label>
          <label className="field field-check">
            <input type="checkbox" checked={draft.active} onChange={(e) => setDraft({ ...draft, active: e.target.checked })} />
            <span>Active</span>
          </label>
          <div className="field-full">
            <button type="submit" className="btn btn-primary" disabled={busy || activeCount >= 5}>
              <Plus aria-hidden="true" />
              {busy ? "Saving…" : "Add banner"}
            </button>
          </div>
        </form>
      </div>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th style={{ width: 96 }}>Image</th>
              <th>Title</th>
              <th>Link</th>
              <th style={{ textAlign: "right" }}>Order</th>
              <th>Schedule</th>
              <th>Status</th>
              <th style={{ textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={row.imageUrl} alt={row.altText ?? ""} width={88} height={35} className="table-thumb" />
                </td>
                <td>{row.title}</td>
                <td className="text-small mono">{row.linkUrl ?? "—"}</td>
                <td className="table-num">{row.sortOrder}</td>
                <td className="text-small text-muted">
                  {row.startsAt || row.endsAt
                    ? `${row.startsAt ? formatDateEn(row.startsAt) : "now"} to ${row.endsAt ? formatDateEn(row.endsAt) : "—"}`
                    : "always"}
                </td>
                <td>
                  <span className={row.active ? "stock-ok" : "badge badge-hidden"}>{row.active ? "Active" : "Inactive"}</span>
                </td>
                <td className="table-actions">
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => toggle(row)}>
                    {row.active ? "Deactivate" : "Activate"}
                  </button>
                  <button type="button" className="btn btn-danger-outline btn-sm" onClick={() => remove(row)} aria-label="Delete banner">
                    <Trash2 aria-hidden="true" />
                  </button>
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-muted">
                  No banners yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
