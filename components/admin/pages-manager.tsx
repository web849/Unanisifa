"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Save } from "lucide-react";
import { formatDateEn } from "@/lib/utils";

export type PageRow = {
  slug: string;
  title: string;
  body: string;
  metaTitle: string | null;
  metaDescription: string | null;
  showInFooter: boolean;
  sortOrder: number;
  isDemo: boolean;
  updatedAt: Date;
};

const emptyDraft = {
  slug: "",
  title: "",
  body: "",
  metaTitle: "",
  metaDescription: "",
  showInFooter: true,
  sortOrder: 0,
};

export function PagesManager({ initial }: { initial: PageRow[] }) {
  const router = useRouter();
  const [rows, setRows] = useState<PageRow[]>(initial);
  const [editing, setEditing] = useState<PageRow | null>(null);
  const [draft, setDraft] = useState(emptyDraft);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const openEditor = (row: PageRow | null) => {
    setEditing(row);
    if (row) {
      setDraft({
        slug: row.slug,
        title: row.title,
        body: row.body,
        metaTitle: row.metaTitle ?? "",
        metaDescription: row.metaDescription ?? "",
        showInFooter: row.showInFooter,
        sortOrder: row.sortOrder,
      });
    } else {
      setDraft(emptyDraft);
    }
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    const response = await fetch("/api/admin/pages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft),
    });
    const json = (await response.json()) as { ok?: boolean; error?: string };
    if (response.ok && json.ok) {
      setMessage(null);
      openEditor(null);
      router.refresh();
    } else {
      setMessage(json.error ?? "Save failed");
    }
    setBusy(false);
  };

  const toggleFooter = async (row: PageRow) => {
    const response = await fetch("/api/admin/pages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug: row.slug, title: row.title, body: row.body, showInFooter: !row.showInFooter, sortOrder: row.sortOrder }),
    });
    if (response.ok) {
      setRows((prev) => prev.map((item) => (item.slug === row.slug ? { ...item, showInFooter: !item.showInFooter } : item)));
      router.refresh();
    }
  };

  return (
    <div className="stack stack-md">
      {message ? <p className="error-text">{message}</p> : null}

      {editing !== null || rows.length === 0 ? (
        <div className="panel">
          <div className="panel-head">
            <h2 className="panel-title">{editing ? `Edit /${editing.slug}` : "New page"}</h2>
            {editing ? (
              <button type="button" className="btn btn-outline btn-sm" onClick={() => openEditor(null)}>
                Close
              </button>
            ) : null}
          </div>
          <form onSubmit={save} className="panel-body stack stack-sm">
            <div className="grid-2">
              <label className="field">
                <span className="label">Title</span>
                <input className="input" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} required />
              </label>
              <label className="field">
                <span className="label">Slug</span>
                <input
                  className="input"
                  value={draft.slug}
                  onChange={(e) => setDraft({ ...draft, slug: e.target.value })}
                  disabled={Boolean(editing)}
                  placeholder="auto from title"
                />
              </label>
            </div>
            <label className="field">
              <span className="label">Body (simple markdown: ## heading, - list, 1. numbered, **bold**)</span>
              <textarea className="input mono" rows={14} value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} />
            </label>
            <div className="grid-2">
              <label className="field">
                <span className="label">Meta title</span>
                <input className="input" value={draft.metaTitle} onChange={(e) => setDraft({ ...draft, metaTitle: e.target.value })} maxLength={255} />
              </label>
              <label className="field">
                <span className="label">Meta description</span>
                <input className="input" value={draft.metaDescription} onChange={(e) => setDraft({ ...draft, metaDescription: e.target.value })} maxLength={500} />
              </label>
            </div>
            <div className="grid-2">
              <label className="field field-check">
                <input type="checkbox" checked={draft.showInFooter} onChange={(e) => setDraft({ ...draft, showInFooter: e.target.checked })} />
                <span>Show in footer</span>
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
            </div>
            <div>
              <button type="submit" className="btn btn-primary" disabled={busy}>
                <Save aria-hidden="true" />
                {busy ? "Saving…" : "Save page"}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="panel-head">
          <h2 className="panel-title">All pages ({rows.length})</h2>
          <button type="button" className="btn btn-primary btn-sm" onClick={() => openEditor(null)}>
            New page
          </button>
        </div>
      )}

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Title</th>
              <th>URL</th>
              <th>Footer</th>
              <th style={{ textAlign: "right" }}>Order</th>
              <th>Updated</th>
              <th style={{ textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.slug}>
                <td>
                  {row.title}
                  {row.isDemo ? <span className="badge badge-draft"> demo</span> : null}
                </td>
                <td>
                  <Link className="mono text-small" href={`/${row.slug}`} target="_blank">
                    /{row.slug}
                  </Link>
                </td>
                <td>{row.showInFooter ? "Yes" : "—"}</td>
                <td className="table-num">{row.sortOrder}</td>
                <td className="text-small text-muted">{formatDateEn(row.updatedAt)}</td>
                <td className="table-actions">
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => openEditor(row)}>
                    Edit
                  </button>
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => toggleFooter(row)}>
                    {row.showInFooter ? "Unlist" : "List"}
                  </button>
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-muted">
                  No pages yet — create about, shipping, terms, privacy and FAQ.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
