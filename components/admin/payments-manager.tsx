"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatDateEn, formatTakaEn } from "@/lib/utils";

export type PaymentRow = {
  id: number;
  key: string;
  name: string;
  nameBn: string | null;
  adapter: string;
  enabled: boolean;
  isDefault: boolean;
  pendingReason: string | null;
  sortOrder: number;
};

export function PaymentsManager({
  initial,
  recent,
}: {
  initial: PaymentRow[];
  recent: Array<{ id: number; orderId: number; methodKey: string; amount: number; status: string; createdAt: Date }>;
}) {
  const router = useRouter();
  const [rows, setRows] = useState<PaymentRow[]>(initial);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const toggle = async (row: PaymentRow, enabled: boolean) => {
    setBusy(true);
    setMessage(null);
    const response = await fetch(`/api/admin/payments/${row.key}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled }),
    });
    const json = (await response.json()) as { ok?: boolean; error?: string };
    if (response.ok && json.ok) {
      setRows((prev) => prev.map((item) => (item.id === row.id ? { ...item, enabled } : item)));
      router.refresh();
    } else {
      setMessage(json.error ?? "Update failed");
    }
    setBusy(false);
  };

  return (
    <div className="stack stack-md">
      {message ? <p className="error-text">{message}</p> : null}

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Method</th>
              <th>Adapter</th>
              <th>Status</th>
              <th>Reason / note</th>
              <th style={{ textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>
                  {row.name}
                  {row.nameBn ? <span className="text-muted"> ({row.nameBn})</span> : null}
                  {row.isDefault ? <span className="badge badge-active"> default</span> : null}
                </td>
                <td className="mono text-small">{row.adapter}</td>
                <td>
                  <span className={row.enabled ? "stock-ok" : "badge badge-draft"}>{row.enabled ? "Live" : "Pending"}</span>
                </td>
                <td className="text-small text-muted">{row.pendingReason ?? "—"}</td>
                <td className="table-actions">
                  {row.key !== "cod" ? (
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      disabled={busy}
                      onClick={() => toggle(row, !row.enabled)}
                    >
                      {row.enabled ? "Disable" : "Enable"}
                    </button>
                  ) : (
                    <span className="text-small text-muted">Always live</span>
                  )}
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-muted">
                  No payment methods configured.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="panel">
        <div className="panel-head">
          <h2 className="panel-title">Recent payment records</h2>
        </div>
        <div className="table-wrap" style={{ border: 0, borderRadius: 0 }}>
          <table className="table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Method</th>
                <th style={{ textAlign: "right" }}>Amount</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((row) => (
                <tr key={row.id}>
                  <td>
                    <Link className="mono" href={`/admin/orders/${row.orderId}`}>
                      #{row.orderId}
                    </Link>
                  </td>
                  <td className="mono text-small">{row.methodKey}</td>
                  <td className="table-num">{formatTakaEn(row.amount)}</td>
                  <td>
                    <span className={`badge badge-${row.status === "paid" ? "active" : "draft"}`}>{row.status}</span>
                  </td>
                  <td className="text-small text-muted">{formatDateEn(row.createdAt)}</td>
                </tr>
              ))}
              {recent.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-muted">
                    No payment records yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
