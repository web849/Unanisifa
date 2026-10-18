"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { formatDateEn } from "@/lib/utils";

export type PopupRow = {
  id: number;
  name: string;
  scope: string;
  landingPageId: number | null;
  title: string;
  body: string | null;
  imageUrl: string | null;
  ctaLabel: string | null;
  ctaUrl: string | null;
  leadFormEnabled: boolean;
  leadFormLabel: string | null;
  delaySeconds: number;
  frequency: string;
  priority: number;
  startsAt: Date | null;
  endsAt: Date | null;
  active: boolean;
  impressions: number;
  leadsCount: number;
};

const emptyDraft = {
  name: "",
  scope: "store",
  landingPageId: "",
  title: "",
  body: "",
  imageUrl: "",
  ctaLabel: "",
  ctaUrl: "",
  leadFormEnabled: false,
  leadFormLabel: "",
  delaySeconds: 3,
  frequency: "once_session",
  priority: 0,
  active: false,
};

export function PopupsManager({
  initial,
  landingPages,
}: {
  initial: PopupRow[];
  landingPages: Array<{ id: number; title: string; slug: string }>;
}) {
  const router = useRouter();
  const [rows, setRows] = useState<PopupRow[]>(initial);
  const [draft, setDraft] = useState(emptyDraft);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const create = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    const response = await fetch("/api/admin/popups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...draft,
        landingPageId: draft.scope === "landing" && draft.landingPageId ? Number(draft.landingPageId) : null,
        delaySeconds: Number(draft.delaySeconds),
        priority: Number(draft.priority),
      }),
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

  const toggle = async (row: PopupRow) => {
    const response = await fetch(`/api/admin/popups/${row.id}`, {
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

  const remove = async (row: PopupRow) => {
    if (!confirm(`Delete popup "${row.name}"?`)) return;
    const response = await fetch(`/api/admin/popups/${row.id}`, { method: "DELETE" });
    if (response.ok) setRows((prev) => prev.filter((item) => item.id !== row.id));
  };

  return (
    <div className="stack stack-md">
      {message ? <p className="error-text">{message}</p> : null}

      <div className="panel">
        <div className="panel-head">
          <h2 className="panel-title">New popup</h2>
        </div>
        <form onSubmit={create} className="panel-body grid-4">
          <label className="field">
            <span className="label">Internal name</span>
            <input className="input" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} required />
          </label>
          <label className="field">
            <span className="label">Title (Bangla, shown to visitor)</span>
            <input className="input" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} required />
          </label>
          <label className="field">
            <span className="label">Scope</span>
            <select className="input" value={draft.scope} onChange={(e) => setDraft({ ...draft, scope: e.target.value })}>
              <option value="store">Store-wide</option>
              <option value="landing">Landing page</option>
            </select>
          </label>
          {draft.scope === "landing" ? (
            <label className="field">
              <span className="label">Landing page</span>
              <select className="input" value={draft.landingPageId} onChange={(e) => setDraft({ ...draft, landingPageId: e.target.value })} required>
                <option value="">Select…</option>
                {landingPages.map((page) => (
                  <option key={page.id} value={page.id}>
                    {page.title} (/{page.slug})
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <label className="field field-full">
            <span className="label">Body</span>
            <input className="input" value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} maxLength={600} />
          </label>
          <label className="field">
            <span className="label">Image URL</span>
            <input className="input" value={draft.imageUrl} onChange={(e) => setDraft({ ...draft, imageUrl: e.target.value })} placeholder="/popups/…" />
          </label>
          <label className="field">
            <span className="label">CTA label</span>
            <input className="input" value={draft.ctaLabel} onChange={(e) => setDraft({ ...draft, ctaLabel: e.target.value })} />
          </label>
          <label className="field">
            <span className="label">CTA URL</span>
            <input className="input" value={draft.ctaUrl} onChange={(e) => setDraft({ ...draft, ctaUrl: e.target.value })} placeholder="/products" />
          </label>
          <label className="field">
            <span className="label">Delay (1–120s)</span>
            <input
              className="input"
              type="number"
              min={1}
              max={120}
              value={draft.delaySeconds}
              onChange={(e) => setDraft({ ...draft, delaySeconds: Number(e.target.value) })}
            />
          </label>
          <label className="field">
            <span className="label">Frequency</span>
            <select className="input" value={draft.frequency} onChange={(e) => setDraft({ ...draft, frequency: e.target.value })}>
              <option value="every_visit">Every visit</option>
              <option value="once_session">Once per session</option>
              <option value="once_day">Once per day</option>
            </select>
          </label>
          <label className="field">
            <span className="label">Priority (higher wins)</span>
            <input
              className="input"
              type="number"
              min={0}
              max={99}
              value={draft.priority}
              onChange={(e) => setDraft({ ...draft, priority: Number(e.target.value) })}
            />
          </label>
          <label className="field field-check">
            <input
              type="checkbox"
              checked={draft.leadFormEnabled}
              onChange={(e) => setDraft({ ...draft, leadFormEnabled: e.target.checked })}
            />
            <span>Collect phone (lead form)</span>
          </label>
          {draft.leadFormEnabled ? (
            <label className="field">
              <span className="label">Lead form label</span>
              <input className="input" value={draft.leadFormLabel} onChange={(e) => setDraft({ ...draft, leadFormLabel: e.target.value })} />
            </label>
          ) : null}
          <label className="field field-check">
            <input type="checkbox" checked={draft.active} onChange={(e) => setDraft({ ...draft, active: e.target.checked })} />
            <span>Active</span>
          </label>
          <div className="field-full">
            <button type="submit" className="btn btn-primary" disabled={busy}>
              <Plus aria-hidden="true" />
              {busy ? "Saving…" : "Create popup"}
            </button>
          </div>
        </form>
      </div>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Title</th>
              <th>Scope</th>
              <th>Timing</th>
              <th style={{ textAlign: "right" }}>Impr.</th>
              <th style={{ textAlign: "right" }}>Leads</th>
              <th>Status</th>
              <th style={{ textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>{row.name}</td>
                <td className="text-small">{row.title}</td>
                <td className="text-small">
                  {row.scope === "landing" ? `landing #${row.landingPageId}` : "store"}
                  {row.startsAt || row.endsAt ? (
                    <span className="text-muted">
                      {" "}
                      ({row.startsAt ? formatDateEn(row.startsAt) : "now"} to {row.endsAt ? formatDateEn(row.endsAt) : "—"})
                    </span>
                  ) : null}
                </td>
                <td className="text-small text-muted">
                  {row.delaySeconds}s · {row.frequency} · p{row.priority}
                </td>
                <td className="table-num">{row.impressions}</td>
                <td className="table-num">{row.leadsCount}</td>
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
                <td colSpan={8} className="text-muted">
                  No popups yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
