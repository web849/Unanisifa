"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { formatDateEn, formatTakaEn } from "@/lib/utils";

export type CouponRow = {
  id: number;
  code: string;
  title: string;
  type: string;
  value: number;
  minSubtotal: number;
  maxDiscount: number | null;
  usageLimit: number | null;
  perPhoneLimit: number | null;
  usedCount: number;
  startsAt: Date | null;
  endsAt: Date | null;
  landingScopeId: number | null;
  showOnCheckout: boolean;
  active: boolean;
  description: string | null;
};

const emptyDraft = {
  code: "",
  title: "",
  type: "percent",
  value: 10,
  minSubtotal: 0,
  maxDiscount: 0,
  usageLimit: 0,
  perPhoneLimit: 1,
  startsAt: "",
  endsAt: "",
  landingScopeId: "",
  showOnCheckout: false,
  active: true,
  description: "",
};

export function CouponsManager({
  initial,
  landingPages,
}: {
  initial: CouponRow[];
  landingPages: Array<{ id: number; title: string; slug: string }>;
}) {
  const router = useRouter();
  const [rows, setRows] = useState<CouponRow[]>(initial);
  const [draft, setDraft] = useState(emptyDraft);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const create = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    const response = await fetch("/api/admin/coupons", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: draft.code,
        title: draft.title || draft.code,
        type: draft.type,
        value: Number(draft.value),
        minSubtotal: Number(draft.minSubtotal),
        maxDiscount: Number(draft.maxDiscount) > 0 ? Number(draft.maxDiscount) : null,
        usageLimit: Number(draft.usageLimit) > 0 ? Number(draft.usageLimit) : null,
        perPhoneLimit: Number(draft.perPhoneLimit) > 0 ? Number(draft.perPhoneLimit) : null,
        startsAt: draft.startsAt ? new Date(draft.startsAt).toISOString() : null,
        endsAt: draft.endsAt ? new Date(draft.endsAt).toISOString() : null,
        landingScopeId: draft.landingScopeId ? Number(draft.landingScopeId) : null,
        showOnCheckout: draft.showOnCheckout,
        active: draft.active,
        description: draft.description || undefined,
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

  const toggle = async (row: CouponRow) => {
    const response = await fetch(`/api/admin/coupons/${row.id}`, {
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

  const remove = async (row: CouponRow) => {
    if (!confirm(`Delete coupon ${row.code}? Redemption history stays on orders.`)) return;
    const response = await fetch(`/api/admin/coupons/${row.id}`, { method: "DELETE" });
    if (response.ok) setRows((prev) => prev.filter((item) => item.id !== row.id));
  };

  const describe = (row: CouponRow): string => {
    if (row.type === "free_delivery") return `Free delivery (waiver up to ${formatTakaEn(row.value)})`;
    if (row.type === "percent") {
      const cap = row.maxDiscount ? ` (cap ${formatTakaEn(row.maxDiscount)})` : "";
      return `${row.value}% off${cap}`;
    }
    return `${formatTakaEn(row.value)} off`;
  };

  return (
    <div className="stack stack-md">
      {message ? <p className="error-text">{message}</p> : null}

      <div className="panel">
        <div className="panel-head">
          <h2 className="panel-title">New coupon</h2>
        </div>
        <form onSubmit={create} className="panel-body grid-4">
          <label className="field">
            <span className="label">Code</span>
            <input
              className="input mono"
              value={draft.code}
              onChange={(e) => setDraft({ ...draft, code: e.target.value.toUpperCase() })}
              required
              minLength={3}
              placeholder="EID25"
            />
          </label>
          <label className="field">
            <span className="label">Title (internal)</span>
            <input
              className="input"
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              placeholder="Eid campaign 25%"
            />
          </label>
          <label className="field">
            <span className="label">Type</span>
            <select className="input" value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value })}>
              <option value="percent">Percent</option>
              <option value="fixed">Fixed amount</option>
              <option value="free_delivery">Free delivery</option>
            </select>
          </label>
          <label className="field">
            <span className="label">
              Value {draft.type === "percent" ? "(%)" : "(৳)"}
            </span>
            <input
              className="input"
              type="number"
              min={0}
              value={draft.value}
              onChange={(e) => setDraft({ ...draft, value: Number(e.target.value) })}
            />
          </label>
          <label className="field">
            <span className="label">Max discount (৳, 0 = none)</span>
            <input
              className="input"
              type="number"
              min={0}
              value={draft.maxDiscount}
              onChange={(e) => setDraft({ ...draft, maxDiscount: Number(e.target.value) })}
              disabled={draft.type !== "percent"}
            />
          </label>
          <label className="field">
            <span className="label">Min subtotal (৳)</span>
            <input
              className="input"
              type="number"
              min={0}
              value={draft.minSubtotal}
              onChange={(e) => setDraft({ ...draft, minSubtotal: Number(e.target.value) })}
            />
          </label>
          <label className="field">
            <span className="label">Total usage limit (0 = none)</span>
            <input
              className="input"
              type="number"
              min={0}
              value={draft.usageLimit}
              onChange={(e) => setDraft({ ...draft, usageLimit: Number(e.target.value) })}
            />
          </label>
          <label className="field">
            <span className="label">Per phone limit (0 = none)</span>
            <input
              className="input"
              type="number"
              min={0}
              value={draft.perPhoneLimit}
              onChange={(e) => setDraft({ ...draft, perPhoneLimit: Number(e.target.value) })}
            />
          </label>
          <label className="field">
            <span className="label">Landing scope (empty = all pages)</span>
            <select
              className="input"
              value={draft.landingScopeId}
              onChange={(e) => setDraft({ ...draft, landingScopeId: e.target.value })}
            >
              <option value="">All pages</option>
              {landingPages.map((page) => (
                <option key={page.id} value={page.id}>
                  {page.title} (/{page.slug})
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span className="label">Starts at</span>
            <input className="input" type="datetime-local" value={draft.startsAt} onChange={(e) => setDraft({ ...draft, startsAt: e.target.value })} />
          </label>
          <label className="field">
            <span className="label">Ends at</span>
            <input className="input" type="datetime-local" value={draft.endsAt} onChange={(e) => setDraft({ ...draft, endsAt: e.target.value })} />
          </label>
          <label className="field field-full">
            <span className="label">Description</span>
            <input className="input" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
          </label>
          <label className="field field-check">
            <input type="checkbox" checked={draft.showOnCheckout} onChange={(e) => setDraft({ ...draft, showOnCheckout: e.target.checked })} />
            <span>Show on checkout page</span>
          </label>
          <label className="field field-check">
            <input type="checkbox" checked={draft.active} onChange={(e) => setDraft({ ...draft, active: e.target.checked })} />
            <span>Active</span>
          </label>
          <div className="field-full">
            <button type="submit" className="btn btn-primary" disabled={busy}>
              <Plus aria-hidden="true" />
              {busy ? "Saving…" : "Create coupon"}
            </button>
          </div>
        </form>
      </div>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Discount</th>
              <th>Min</th>
              <th>Usage</th>
              <th>Window</th>
              <th>Scope</th>
              <th>Status</th>
              <th style={{ textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td className="mono">
                  {row.code}
                  {row.showOnCheckout ? <span className="badge badge-active"> checkout</span> : null}
                </td>
                <td>{describe(row)}</td>
                <td className="table-num">{row.minSubtotal > 0 ? formatTakaEn(row.minSubtotal) : "—"}</td>
                <td className="table-num">
                  {row.usedCount}
                  {row.usageLimit ? ` / ${row.usageLimit}` : ""}
                  {row.perPhoneLimit ? ` (×${row.perPhoneLimit}/phone)` : ""}
                </td>
                <td className="text-small text-muted">
                  {row.startsAt ? formatDateEn(row.startsAt) : "now"} to {row.endsAt ? formatDateEn(row.endsAt) : "—"}
                </td>
                <td className="text-small">{row.landingScopeId ? `landing #${row.landingScopeId}` : "all pages"}</td>
                <td>
                  <span className={row.active ? "stock-ok" : "badge badge-hidden"}>{row.active ? "Active" : "Inactive"}</span>
                </td>
                <td className="table-actions">
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => toggle(row)}>
                    {row.active ? "Deactivate" : "Activate"}
                  </button>
                  <button type="button" className="btn btn-danger-outline btn-sm" onClick={() => remove(row)} aria-label={`Delete ${row.code}`}>
                    <Trash2 aria-hidden="true" />
                  </button>
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-muted">
                  No coupons yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
