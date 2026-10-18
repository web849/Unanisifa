"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Ban, ShieldOff } from "lucide-react";
import { formatDateEn } from "@/lib/utils";

export type ReviewOrder = {
  id: number;
  orderNumber: string;
  name: string;
  phone: string;
  fraudScore: number;
  fraudReasons: unknown;
  status: string;
  createdAt: Date;
};

export type BlockedRow = {
  id: number;
  ipHash: string;
  ipLabel: string | null;
  reason: string | null;
  active: boolean;
  orderCountAtBlock: number;
  createdAt: Date;
  releasedAt: Date | null;
};

export function FraudManager({
  reviewOrders,
  watchOrders,
  blocked,
}: {
  reviewOrders: ReviewOrder[];
  watchOrders: ReviewOrder[];
  blocked: BlockedRow[];
}) {
  const router = useRouter();
  const [rows, setRows] = useState<BlockedRow[]>(blocked);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const blockByOrder = async (order: ReviewOrder) => {
    const reason = prompt(`Block the network behind ${order.orderNumber}? Reason:`);
    if (reason === null) return;
    setBusy(true);
    setMessage(null);
    const response = await fetch("/api/admin/fraud/block", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId: order.id, reason }),
    });
    const json = (await response.json()) as { ok?: boolean; error?: string };
    if (response.ok && json.ok) {
      router.refresh();
    } else {
      setMessage(json.error ?? "Block failed");
    }
    setBusy(false);
  };

  const release = async (row: BlockedRow) => {
    if (!confirm("Release this blocked network?")) return;
    setBusy(true);
    setMessage(null);
    const response = await fetch(`/api/admin/fraud/block/${row.id}`, { method: "DELETE" });
    const json = (await response.json()) as { ok?: boolean; error?: string };
    if (response.ok && json.ok) {
      setRows((prev) => prev.filter((item) => item.id !== row.id));
    } else {
      setMessage(json.error ?? "Release failed");
    }
    setBusy(false);
  };

  const reasons = (value: unknown): string[] => (Array.isArray(value) ? (value as string[]) : []);

  const orderTable = (title: string, list: ReviewOrder[], tone: "danger" | "warning") => (
    <div className="panel mb-4">
      <div className="panel-head">
        <h2 className="panel-title">
          {title} <span className="badge badge-draft">{list.length}</span>
        </h2>
      </div>
      <div className="table-wrap" style={{ border: 0, borderRadius: 0 }}>
        <table className="table">
          <thead>
            <tr>
              <th>Order</th>
              <th>Customer</th>
              <th style={{ textAlign: "right" }}>Score</th>
              <th>Reasons</th>
              <th>Status</th>
              <th style={{ textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {list.map((order) => (
              <tr key={order.id}>
                <td>
                  <Link className="mono" href={`/admin/orders/${order.id}`}>
                    {order.orderNumber}
                  </Link>
                  <br />
                  <span className="text-small text-muted">{formatDateEn(order.createdAt)}</span>
                </td>
                <td>
                  {order.name}
                  <br />
                  <span className="text-small text-muted mono">{order.phone}</span>
                </td>
                <td className="table-num">
                  <span className={tone === "danger" ? "error-text" : "badge badge-draft"}>{order.fraudScore}</span>
                </td>
                <td className="text-small">{reasons(order.fraudReasons).join(", ") || "—"}</td>
                <td>
                  <span className={`status-dot status-${order.status}`}>{order.status}</span>
                </td>
                <td className="table-actions">
                  <Link className="btn btn-outline btn-sm" href={`/admin/orders/${order.id}`}>
                    Open
                  </Link>
                  {tone === "danger" ? (
                    <button type="button" className="btn btn-danger-outline btn-sm" disabled={busy} onClick={() => blockByOrder(order)}>
                      <Ban aria-hidden="true" />
                      Block network
                    </button>
                  ) : null}
                </td>
              </tr>
            ))}
            {list.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-muted">
                  Nothing here.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="stack stack-md">
      {message ? <p className="error-text">{message}</p> : null}

      {orderTable("Review hold (call before confirming)", reviewOrders, "danger")}
      {orderTable("Watch list", watchOrders, "warning")}

      <div className="panel">
        <div className="panel-head">
          <h2 className="panel-title">Blocked networks</h2>
        </div>
        <div className="table-wrap" style={{ border: 0, borderRadius: 0 }}>
          <table className="table">
            <thead>
              <tr>
                <th>IP hash</th>
                <th>Label</th>
                <th>Reason</th>
                <th style={{ textAlign: "right" }}>Orders at block</th>
                <th>Blocked</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="mono text-small">{row.ipHash.slice(0, 16)}…</td>
                  <td className="text-small">{row.ipLabel ?? "—"}</td>
                  <td className="text-small">{row.reason ?? "—"}</td>
                  <td className="table-num">{row.orderCountAtBlock}</td>
                  <td className="text-small text-muted">{formatDateEn(row.createdAt)}</td>
                  <td className="table-actions">
                    <button type="button" className="btn btn-outline btn-sm" disabled={busy || !row.active} onClick={() => release(row)}>
                      <ShieldOff aria-hidden="true" />
                      Release
                    </button>
                  </td>
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-muted">
                    No blocked networks.
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
