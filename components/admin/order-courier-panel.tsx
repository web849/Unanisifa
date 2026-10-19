"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, PackageCheck, RefreshCw, Truck } from "lucide-react";
import { formatDateEn } from "@/lib/utils";

export type OrderCourierProvider = {
  id: number;
  name: string;
  adapter: string;
  isDefault: boolean;
};

export type OrderCourierShipment = {
  status: string;
  consignmentId: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
  providerName: string | null;
  providerAdapter: string | null;
  lastError: string | null;
  handedOverAt: Date | null;
  lastSyncedAt: Date | null;
};

/**
 * অর্ডার পেজের কুরিয়ার প্যানেল —
 * কনসাইনমেন্ট না থাকলে provider বেছে "Send to courier";
 * থাকলে ট্র্যাকিং + "Sync status"।
 */
export function OrderCourierPanel({
  orderId,
  orderStatus,
  providers,
  shipment,
}: {
  orderId: number;
  orderStatus: string;
  providers: OrderCourierProvider[];
  shipment: OrderCourierShipment | null;
}) {
  const router = useRouter();
  const defaultProvider = providers.find((p) => p.isDefault) ?? providers[0];
  const [providerId, setProviderId] = useState<number | "">(defaultProvider?.id ?? "");
  const [busy, setBusy] = useState<"book" | "sync" | null>(null);
  const [message, setMessage] = useState<{ tone: "ok" | "err"; text: string } | null>(null);

  const booked = Boolean(shipment?.consignmentId);
  const handedManual = !booked && Boolean(shipment?.handedOverAt);
  const canBook = ["confirmed", "processing", "shipped"].includes(orderStatus) && !booked && !handedManual;
  const canSync = booked && shipment?.providerAdapter !== "manual";

  const call = async (action: "book" | "sync") => {
    setBusy(action);
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/orders/${orderId}/courier`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          action === "book" ? { action, providerId: providerId === "" ? undefined : providerId } : { action },
        ),
      });
      const json = (await response.json()) as {
        ok?: boolean;
        error?: string;
        provider?: string;
        consignmentId?: string | null;
        status?: string | null;
        synced?: boolean;
        message?: string | null;
      };
      if (!response.ok || !json.ok) {
        setMessage({ tone: "err", text: json.error ?? "Courier action failed" });
        return;
      }
      setMessage({
        tone: "ok",
        text:
          action === "book"
            ? json.consignmentId
              ? `Booked with ${json.provider ?? "courier"} — consignment ${json.consignmentId}`
              : `Marked handed over (${json.provider ?? "manual"})`
            : json.synced
              ? `Status synced: ${json.status ?? "updated"}`
              : (json.message ?? "Nothing to sync"),
      });
      router.refresh();
    } catch {
      setMessage({ tone: "err", text: "Network error" });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="panel">
      <div className="panel-head">
        <h2 className="panel-title">Courier</h2>
        {canSync ? (
          <button type="button" className="btn btn-outline btn-sm" disabled={busy !== null} onClick={() => void call("sync")}>
            <RefreshCw aria-hidden="true" />
            {busy === "sync" ? "Syncing…" : "Sync status"}
          </button>
        ) : null}
      </div>
      <div className="panel-body stack stack-sm">
        {shipment ? (
          <>
            <p className="mb-0 text-small">
              <span className={`badge badge-${shipment.status === "delivered" ? "active" : "draft"}`}>{shipment.status}</span>
              {shipment.providerName ? ` · ${shipment.providerName}` : ""}
            </p>
            {shipment.consignmentId ? (
              <p className="mb-0 text-small">
                Consignment: <span className="mono">{shipment.consignmentId}</span>
                {shipment.trackingNumber && shipment.trackingNumber !== shipment.consignmentId ? (
                  <>
                    {" · Tracking: "}
                    <span className="mono">{shipment.trackingNumber}</span>
                  </>
                ) : null}
                {shipment.trackingUrl ? (
                  <>
                    {" · "}
                    <a href={shipment.trackingUrl} target="_blank" rel="noreferrer">
                      Track <ExternalLink aria-hidden="true" size={12} />
                    </a>
                  </>
                ) : null}
              </p>
            ) : handedManual ? (
              <p className="mb-0 text-small">
                <PackageCheck aria-hidden="true" size={14} /> Handed over manually
                {shipment.handedOverAt ? ` · ${formatDateEn(shipment.handedOverAt)}` : ""}
              </p>
            ) : null}
            {shipment.handedOverAt && shipment.consignmentId ? (
              <p className="mb-0 text-small text-muted">Booked {formatDateEn(shipment.handedOverAt)}</p>
            ) : null}
            {shipment.lastSyncedAt ? (
              <p className="mb-0 text-small text-muted">Last sync {formatDateEn(shipment.lastSyncedAt)}</p>
            ) : null}
            {shipment.lastError ? <p className="error-text mb-0">{shipment.lastError}</p> : null}
          </>
        ) : (
          <p className="mb-0 text-small text-muted">No courier booking yet.</p>
        )}

        {canBook ? (
          <div className="field-row">
            <select
              className="input"
              value={providerId}
              onChange={(e) => setProviderId(Number(e.target.value))}
              aria-label="Courier provider"
            >
              {providers.map((provider) => (
                <option key={provider.id} value={provider.id}>
                  {provider.name}
                  {provider.isDefault ? " (default)" : ""}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              disabled={busy !== null || providers.length === 0}
              onClick={() => void call("book")}
            >
              <Truck aria-hidden="true" />
              {busy === "book"
                ? "Booking…"
                : providers.find((p) => p.id === providerId)?.adapter === "manual"
                  ? "Mark handed over"
                  : "Send to courier"}
            </button>
          </div>
        ) : !booked && orderStatus === "pending" ? (
          <p className="mb-0 text-small text-muted">Confirm the order first — তারপর কুরিয়ারে পাঠানো যাবে।</p>
        ) : null}

        {message ? <p className={message.tone === "ok" ? "ok-text" : "error-text"}>{message.text}</p> : null}
      </div>
    </div>
  );
}
