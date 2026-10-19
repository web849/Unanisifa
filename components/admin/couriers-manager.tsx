"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PlugZap, Save } from "lucide-react";
import { formatDateEn } from "@/lib/utils";

export type CourierRow = {
  id: number;
  adapter: string;
  name: string;
  enabled: boolean;
  isDefault: boolean;
  lastConnectionStatus: string | null;
  lastConnectionAt: Date | null;
  lastError: string | null;
};

export type ShipmentRow = {
  id: number;
  orderId: number;
  orderNumber: string | null;
  status: string;
  trackingNumber: string | null;
  consignmentId: string | null;
  lastError: string | null;
  handedOverAt: Date | null;
  createdAt: Date;
};

export function CouriersManager({ providers, shipments }: { providers: CourierRow[]; shipments: ShipmentRow[] }) {
  const router = useRouter();
  const [rows, setRows] = useState<CourierRow[]>(providers);
  const [credentials, setCredentials] = useState<Record<number, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const patch = async (row: CourierRow, payload: Record<string, unknown>) => {
    setBusyId(row.id);
    setMessage(null);
    const response = await fetch(`/api/admin/couriers/${row.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = (await response.json()) as { ok?: boolean; error?: string };
    if (response.ok && json.ok) {
      setRows((prev) => prev.map((item) => (item.id === row.id ? { ...item, ...payload } as CourierRow : item)));
      setCredentials((prev) => ({ ...prev, [row.id]: "" }));
      router.refresh();
    } else {
      setMessage(json.error ?? "Update failed");
    }
    setBusyId(null);
  };

  const test = async (row: CourierRow) => {
    setBusyId(row.id);
    setMessage(null);
    const response = await fetch(`/api/admin/couriers/${row.id}/test`, { method: "POST" });
    const json = (await response.json()) as { ok?: boolean; data?: { message?: string }; error?: string };
    setMessage(json.data?.message ?? json.error ?? "Test finished");
    setBusyId(null);
    router.refresh();
  };

  return (
    <div className="stack stack-md">
      {message ? <p className="error-text">{message}</p> : null}

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Provider</th>
              <th>Adapter</th>
              <th>Status</th>
              <th>Last check</th>
              <th>Credentials</th>
              <th style={{ textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>
                  {row.name}
                  {row.isDefault ? <span className="badge badge-active"> default</span> : null}
                </td>
                <td className="mono text-small">{row.adapter}</td>
                <td>
                  <span className={row.enabled ? "stock-ok" : "badge badge-draft"}>{row.enabled ? "Enabled" : "Disabled"}</span>
                  {row.lastConnectionStatus ? (
                    <span className="text-small text-muted"> · {row.lastConnectionStatus}</span>
                  ) : null}
                </td>
                <td className="text-small text-muted">
                  {row.lastConnectionAt ? formatDateEn(row.lastConnectionAt) : "never"}
                  {row.lastError ? <span className="error-text"> — {row.lastError}</span> : null}
                </td>
                <td style={{ minWidth: 220 }}>
                  {row.adapter === "manual" ? (
                    <span className="text-small text-muted">Not needed</span>
                  ) : (
                    <input
                      className="input"
                      type="password"
                      autoComplete="off"
                      placeholder="API key / token (encrypted at rest)"
                      value={credentials[row.id] ?? ""}
                      onChange={(e) => setCredentials((prev) => ({ ...prev, [row.id]: e.target.value }))}
                    />
                  )}
                </td>
                <td className="table-actions">
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    disabled={busyId === row.id}
                    onClick={() => patch(row, { enabled: !row.enabled })}
                  >
                    <Save aria-hidden="true" />
                    {row.enabled ? "Disable" : "Enable"}
                  </button>
                  {credentials[row.id] ? (
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      disabled={busyId === row.id}
                      onClick={() => patch(row, { credentials: credentials[row.id] })}
                    >
                      Save key
                    </button>
                  ) : null}
                  <button type="button" className="btn btn-outline btn-sm" disabled={busyId === row.id} onClick={() => test(row)}>
                    <PlugZap aria-hidden="true" />
                    Test
                  </button>
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-muted">
                  No courier providers configured.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="panel">
        <div className="panel-head">
          <h2 className="panel-title">Recent shipments</h2>
        </div>
        <div className="table-wrap" style={{ border: 0, borderRadius: 0 }}>
          <table className="table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Status</th>
                <th>Tracking</th>
                <th>Handed over</th>
                <th>Error</th>
              </tr>
            </thead>
            <tbody>
              {shipments.map((row) => (
                <tr key={row.id}>
                  <td>
                    <Link className="mono" href={`/admin/orders/${row.orderId}`}>
                      {row.orderNumber ?? `#${row.orderId}`}
                    </Link>
                  </td>
                  <td>
                    <span className={`badge badge-${row.status === "delivered" ? "active" : "draft"}`}>{row.status}</span>
                  </td>
                  <td className="mono text-small">{row.trackingNumber ?? row.consignmentId ?? "—"}</td>
                  <td className="text-small text-muted">{row.handedOverAt ? formatDateEn(row.handedOverAt) : "—"}</td>
                  <td className="text-small">{row.lastError ? <span className="error-text">{row.lastError}</span> : "—"}</td>
                </tr>
              ))}
              {shipments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-muted">
                    No shipments recorded yet.
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
