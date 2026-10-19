"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Printer } from "lucide-react";
import type { OrderStatusValue } from "@/lib/orders/status";

export function OrderActions({
  orderId,
  orderNumber,
  status,
  nextOptions,
  statusLabels,
}: {
  orderId: number;
  orderNumber: string;
  status: string;
  nextOptions: OrderStatusValue[];
  statusLabels: Record<string, string>;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState("");

  const transition = async (to: OrderStatusValue) => {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/orders/${orderId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: to, note: note.trim() || undefined }),
      });
      const json = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !json.ok) {
        setError(json.error ?? "Status change failed");
        return;
      }
      setNote("");
      router.refresh();
    } catch {
      setError("Network error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="panel">
      <div className="panel-head">
        <h2 className="panel-title">Status · {statusLabels[status] ?? status}</h2>
        <button type="button" className="btn btn-outline btn-sm" onClick={() => window.print()}>
          <Printer aria-hidden="true" />
          Print invoice
        </button>
      </div>
      <div className="panel-body stack stack-sm">
        {nextOptions.length > 0 ? (
          <>
            <label className="field mb-0">
              <span className="label">Internal note (optional, stored in history)</span>
              <input className="input" value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} />
            </label>
            <div className="field-row">
              {nextOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={option === "cancelled" ? "btn btn-danger-outline" : "btn btn-primary"}
                  disabled={busy}
                  onClick={() => transition(option)}
                >
                  {busy ? "Working…" : `Mark ${statusLabels[option] ?? option}`}
                </button>
              ))}
            </div>
          </>
        ) : (
          <p className="text-muted mb-0">No further transitions from {status}.</p>
        )}
        {error ? <p className="error-text">{error}</p> : null}
        <p className="text-small text-muted mb-0">Order: <span className="mono">{orderNumber}</span></p>
      </div>
    </div>
  );
}
