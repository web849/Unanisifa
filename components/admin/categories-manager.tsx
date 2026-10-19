"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { ImageField } from "@/components/admin/image-field";

export type CategoryRow = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  coverImage: string | null;
  icon: string | null;
  active: boolean;
  sortOrder: number;
};

export function CategoriesManager({ initial }: { initial: CategoryRow[] }) {
  const router = useRouter();
  const [rows, setRows] = useState<CategoryRow[]>(initial);
  const [draft, setDraft] = useState({ name: "", slug: "", description: "", coverImage: "", icon: "", sortOrder: 0 });
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const create = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    const response = await fetch("/api/admin/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...draft, sortOrder: Number(draft.sortOrder) }),
    });
    const json = (await response.json()) as { ok?: boolean; error?: string };
    if (response.ok && json.ok) {
      setDraft({ name: "", slug: "", description: "", coverImage: "", icon: "", sortOrder: 0 });
      router.refresh();
    } else {
      setMessage(json.error ?? "Create failed");
    }
    setBusy(false);
  };

  const toggle = async (row: CategoryRow) => {
    const response = await fetch(`/api/admin/categories/${row.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !row.active }),
    });
    if (response.ok) {
      setRows((prev) => prev.map((item) => (item.id === row.id ? { ...item, active: !item.active } : item)));
    }
  };

  const remove = async (row: CategoryRow) => {
    if (!confirm(`Delete category "${row.name}"? Products must be moved first.`)) return;
    const response = await fetch(`/api/admin/categories/${row.id}`, { method: "DELETE" });
    const json = (await response.json()) as { ok?: boolean; error?: string };
    if (response.ok && json.ok) {
      setRows((prev) => prev.filter((item) => item.id !== row.id));
    } else {
      setMessage(json.error ?? "Delete failed");
    }
  };

  return (
    <div className="stack stack-md">
      {message ? <p className="error-text">{message}</p> : null}

      <div className="panel">
        <div className="panel-head">
          <h2 className="panel-title">New category</h2>
        </div>
        <form onSubmit={create} className="panel-body grid-4">
          <label className="field">
            <span className="label">Name (Bangla)</span>
            <input className="input" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} required />
          </label>
          <label className="field">
            <span className="label">Slug</span>
            <input className="input mono" value={draft.slug} onChange={(e) => setDraft({ ...draft, slug: e.target.value })} placeholder="auto" />
          </label>
          <ImageField
            label="Cover image"
            value={draft.coverImage}
            onChange={(url) => setDraft({ ...draft, coverImage: url })}
            folder="categories"
            placeholder="/categories/c-01.svg"
            hint="ছবি তুলুন অথবা URL পেস্ট করুন"
            alt={draft.name}
          />
          <label className="field">
            <span className="label">Icon (lucide name)</span>
            <input className="input mono" value={draft.icon} onChange={(e) => setDraft({ ...draft, icon: e.target.value })} placeholder="Leaf" />
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
          <label className="field field-full">
            <span className="label">Description</span>
            <input className="input" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
          </label>
          <div className="field-full">
            <button type="submit" className="btn btn-primary" disabled={busy}>
              <Plus aria-hidden="true" />
              {busy ? "Saving…" : "Add category"}
            </button>
          </div>
        </form>
      </div>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Slug</th>
              <th>Icon</th>
              <th style={{ textAlign: "right" }}>Order</th>
              <th>Status</th>
              <th style={{ textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>
                  {row.coverImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={row.coverImage} alt="" width={40} height={40} className="table-thumb" style={{ marginRight: 8 }} />
                  ) : null}
                  {row.name}
                </td>
                <td className="mono text-small">{row.slug}</td>
                <td className="mono text-small">{row.icon ?? "—"}</td>
                <td className="table-num">{row.sortOrder}</td>
                <td>
                  <span className={row.active ? "stock-ok" : "badge badge-hidden"}>{row.active ? "Active" : "Inactive"}</span>
                </td>
                <td className="table-actions">
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => toggle(row)}>
                    {row.active ? "Deactivate" : "Activate"}
                  </button>
                  <button type="button" className="btn btn-danger-outline btn-sm" onClick={() => remove(row)} aria-label={`Delete ${row.name}`}>
                    <Trash2 aria-hidden="true" />
                  </button>
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-muted">
                  No categories yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
