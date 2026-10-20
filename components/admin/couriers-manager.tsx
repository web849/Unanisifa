"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PlugZap, Power, RefreshCw, Save, Star } from "lucide-react";
import { formatDateEn } from "@/lib/utils";
import { CREDENTIAL_FIELDS, isApiAdapter, type CourierAdapterId } from "@/lib/couriers/types";
import type { CourierSettings } from "@/lib/couriers/service";

export type CourierRow = {
  id: number;
  adapter: string;
  name: string;
  enabled: boolean;
  isDefault: boolean;
  lastConnectionStatus: string | null;
  lastConnectionAt: Date | null;
  lastError: string | null;
  hasCredentials: boolean;
};

export type ShipmentRow = {
  id: number;
  orderId: number;
  orderNumber: string | null;
  providerName: string | null;
  providerAdapter: string | null;
  status: string;
  trackingNumber: string | null;
  consignmentId: string | null;
  trackingUrl: string | null;
  lastError: string | null;
  handedOverAt: Date | null;
  lastSyncedAt: Date | null;
  createdAt: Date;
};

const CONNECT_HINTS: Record<CourierAdapterId, string> = {
  steadfast:
    "API Key ও Secret Key পাবেন: Steadfast merchant panel (portal.packzy.com) > Settings > API। কী দুটো এখানে বসিয়ে Save করুন, তারপর Test connection চাপুন।",
  pathao:
    "Client ID ও Client Secret পাবেন: Pathao merchant panel (merchant.pathao.com) > Developer API। Username/Password হলো আপনার মার্চেন্ট লগইন ইমেইল ও পাসওয়ার্ড।",
};

type ProviderMessage = { tone: "ok" | "err"; text: string };

export function CouriersManager({
  providers,
  shipments,
  settings,
}: {
  providers: CourierRow[];
  shipments: ShipmentRow[];
  settings: CourierSettings;
}) {
  const router = useRouter();
  const [rows, setRows] = useState<CourierRow[]>(providers);
  const [inputs, setInputs] = useState<Record<number, Record<string, string>>>({});
  const [providerMessages, setProviderMessages] = useState<Record<number, ProviderMessage>>({});
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [autoBook, setAutoBook] = useState(settings.autoBookOnShipped);
  const [weightKg, setWeightKg] = useState(String(settings.defaultWeightKg));
  const [automationMessage, setAutomationMessage] = useState<ProviderMessage | null>(null);

  const setField = (providerId: number, key: string, value: string) =>
    setInputs((prev) => ({ ...prev, [providerId]: { ...prev[providerId], [key]: value } }));

  const say = (providerId: number, tone: "ok" | "err", text: string) =>
    setProviderMessages((prev) => ({ ...prev, [providerId]: { tone, text } }));

  const patch = async (row: CourierRow, payload: Record<string, unknown>, busy: string) => {
    setBusyKey(busy);
    const response = await fetch(`/api/admin/couriers/${row.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = (await response.json()) as { ok?: boolean; error?: string };
    setBusyKey(null);
    if (!response.ok || !json.ok) {
      say(row.id, "err", json.error ?? "Update failed");
      return false;
    }
    return true;
  };

  const saveCredentials = async (row: CourierRow) => {
    const ok = await patch(row, { credentials: inputs[row.id] ?? {} }, `save-${row.id}`);
    if (!ok) return;
    setRows((prev) =>
      prev.map((item) =>
        item.id === row.id
          ? { ...item, hasCredentials: true, lastConnectionStatus: null, lastError: null }
          : item,
      ),
    );
    setInputs((prev) => ({ ...prev, [row.id]: {} }));
    say(row.id, "ok", "Credentials saved (encrypted). Now run “Test connection”.");
    router.refresh();
  };

  const test = async (row: CourierRow) => {
    setBusyKey(`test-${row.id}`);
    const response = await fetch(`/api/admin/couriers/${row.id}/test`, { method: "POST" });
    const json = (await response.json()) as {
      ok?: boolean;
      connected?: boolean;
      message?: string;
      status?: string;
      error?: string;
    };
    setBusyKey(null);
    const connected = json.connected === true;
    setRows((prev) =>
      prev.map((item) =>
        item.id === row.id
          ? {
              ...item,
              lastConnectionStatus: json.status ?? item.lastConnectionStatus,
              lastConnectionAt: new Date(),
              lastError: connected ? null : item.lastError,
            }
          : item,
      ),
    );
    say(row.id, connected ? "ok" : "err", json.message ?? json.error ?? "Test finished");
    router.refresh();
  };

  const toggleEnabled = async (row: CourierRow) => {
    const ok = await patch(row, { enabled: !row.enabled }, `toggle-${row.id}`);
    if (!ok) return;
    setRows((prev) => prev.map((item) => (item.id === row.id ? { ...item, enabled: !item.enabled } : item)));
    say(row.id, "ok", row.enabled ? "Provider disabled." : "Provider enabled.");
    router.refresh();
  };

  const makeDefault = async (row: CourierRow) => {
    const ok = await patch(row, { isDefault: true }, `default-${row.id}`);
    if (!ok) return;
    setRows((prev) =>
      prev.map((item) => ({ ...item, isDefault: item.id === row.id, enabled: item.id === row.id ? true : item.enabled })),
    );
    say(row.id, "ok", `${row.name} is now the default courier.`);
    router.refresh();
  };

  const saveAutomation = async () => {
    setBusyKey("automation");
    setAutomationMessage(null);
    const weight = Number(weightKg);
    const response = await fetch("/api/admin/couriers/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        autoBookOnShipped: autoBook,
        defaultWeightKg: Number.isFinite(weight) && weight > 0 ? weight : undefined,
      }),
    });
    const json = (await response.json()) as { ok?: boolean; error?: string };
    setBusyKey(null);
    setAutomationMessage(
      response.ok && json.ok
        ? { tone: "ok", text: "Automation settings saved." }
        : { tone: "err", text: json.error ?? "Save failed" },
    );
    if (response.ok && json.ok) router.refresh();
  };

  const syncAll = async () => {
    setBusyKey("sync");
    setAutomationMessage(null);
    const response = await fetch("/api/admin/couriers/sync", { method: "POST" });
    const json = (await response.json()) as {
      ok?: boolean;
      checked?: number;
      updated?: number;
      delivered?: number;
      failed?: number;
      error?: string;
    };
    setBusyKey(null);
    if (response.ok && json.ok) {
      setAutomationMessage({
        tone: "ok",
        text: `Sync done — checked ${json.checked ?? 0}, updated ${json.updated ?? 0}, delivered ${json.delivered ?? 0}, failed ${json.failed ?? 0}.`,
      });
      router.refresh();
    } else {
      setAutomationMessage({ tone: "err", text: json.error ?? "Sync failed" });
    }
  };

  const credentialsReady = (row: CourierRow): boolean => {
    if (!isApiAdapter(row.adapter)) return false;
    const values = inputs[row.id] ?? {};
    return CREDENTIAL_FIELDS[row.adapter].every(
      (field) => !field.required || (values[field.key] ?? "").trim().length > 0,
    );
  };

  return (
    <div className="stack stack-md">
      {/* ---------- অটোমেশন ---------- */}
      <div className="panel">
        <div className="panel-head">
          <h2 className="panel-title">Automation</h2>
          <div className="field-row">
            <button type="button" className="btn btn-outline btn-sm" disabled={busyKey === "sync"} onClick={() => void syncAll()}>
              <RefreshCw aria-hidden="true" />
              {busyKey === "sync" ? "Syncing…" : "Sync all statuses"}
            </button>
            <button type="button" className="btn btn-primary btn-sm" disabled={busyKey === "automation"} onClick={() => void saveAutomation()}>
              <Save aria-hidden="true" />
              Save automation
            </button>
          </div>
        </div>
        <div className="panel-body stack stack-sm">
          <label className="field-check">
            <input type="checkbox" checked={autoBook} onChange={(e) => setAutoBook(e.target.checked)} />
            <span>
              Auto-book with the default courier when an order is marked <strong>shipped</strong>
              <span className="text-muted"> — consignment তৈরি হবে অটোমেটিক; ব্যর্থ হলে অর্ডার পেজে এরর দেখা যাবে</span>
            </span>
          </label>
          <label className="field" style={{ maxWidth: 260 }}>
            <span className="label">Default parcel weight (kg) — Pathao-র জন্য</span>
            <input className="input" type="number" min={0.5} max={10} step={0.5} value={weightKg} onChange={(e) => setWeightKg(e.target.value)} />
          </label>
          <p className="text-small text-muted mb-0">
            ডেলিভারি স্ট্যাটাস Sync করলে delivered পার্সেলের অর্ডার অটোমেটিক delivered হয়ে যায়। প্রতিদিনের
            ক্রনও একবার সিঙ্ক করে; চাইলে উপরের বোতামে যেকোনো সময় হাতে সিঙ্ক করা যায়।
          </p>
          {automationMessage ? (
            <p className={automationMessage.tone === "ok" ? "ok-text" : "error-text"}>{automationMessage.text}</p>
          ) : null}
        </div>
      </div>

      {/* ---------- প্রোভাইডার কানেক্ট ---------- */}
      {rows.map((row) => {
        const apiAdapter = isApiAdapter(row.adapter) ? (row.adapter as CourierAdapterId) : null;
        const message = providerMessages[row.id];
        return (
          <div className="panel" key={row.id}>
            <div className="panel-head">
              <h2 className="panel-title">
                {row.name} <span className="mono text-small text-muted">{row.adapter}</span>
                {row.isDefault ? (
                  <>
                    {" "}
                    <span className="badge badge-active">default</span>
                  </>
                ) : null}
                {" "}
                <span className={row.enabled ? "stock-ok" : "badge badge-draft"}>{row.enabled ? "Enabled" : "Disabled"}</span>
                {apiAdapter ? (
                  <span className="text-small text-muted">
                    {" · "}
                    {row.lastConnectionStatus === "connected" ? (
                      <span className="stock-ok">Connected</span>
                    ) : row.hasCredentials ? (
                      "Credentials saved — not tested"
                    ) : (
                      "Not connected"
                    )}
                    {row.lastConnectionAt ? ` · last check ${formatDateEn(row.lastConnectionAt)}` : ""}
                  </span>
                ) : null}
              </h2>
              <div className="field-row">
                {!row.isDefault ? (
                  <button type="button" className="btn btn-outline btn-sm" disabled={busyKey === `default-${row.id}`} onClick={() => void makeDefault(row)}>
                    <Star aria-hidden="true" />
                    Make default
                  </button>
                ) : null}
                <button type="button" className="btn btn-outline btn-sm" disabled={busyKey === `toggle-${row.id}`} onClick={() => void toggleEnabled(row)}>
                  <Power aria-hidden="true" />
                  {row.enabled ? "Disable" : "Enable"}
                </button>
              </div>
            </div>
            <div className="panel-body stack stack-sm">
              {row.lastError ? <p className="error-text mb-0">Last error: {row.lastError}</p> : null}

              {apiAdapter ? (
                <>
                  <p className="text-small text-muted mb-0">{CONNECT_HINTS[apiAdapter]}</p>
                  <div className="field-grid">
                    {CREDENTIAL_FIELDS[apiAdapter].map((field) => (
                      <label className="field" key={field.key}>
                        <span className="label">{field.label}{field.required ? " *" : ""}</span>
                        <input
                          className="input"
                          type={field.secret ? "password" : "text"}
                          autoComplete="off"
                          placeholder={field.placeholder ?? (row.hasCredentials ? "•••••••• (saved — re-enter to replace)" : "")}
                          value={inputs[row.id]?.[field.key] ?? ""}
                          onChange={(e) => setField(row.id, field.key, e.target.value)}
                        />
                        {field.help ? <span className="text-small text-muted">{field.help}</span> : null}
                      </label>
                    ))}
                  </div>
                  <p className="text-small text-muted mb-0">
                    ক্রেডেনশিয়াল AES-256 এনক্রিপ্ট হয়ে ডেটাবেজে থাকে এবং কখনো আবার দেখানো হয় না —
                    বদলাতে হলে সব required (*) ফিল্ড আবার দিয়ে Save করুন।
                  </p>
                  <div className="field-row">
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      disabled={busyKey === `save-${row.id}` || !credentialsReady(row)}
                      onClick={() => void saveCredentials(row)}
                    >
                      <Save aria-hidden="true" />
                      {busyKey === `save-${row.id}` ? "Saving…" : "Save credentials"}
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      disabled={busyKey === `test-${row.id}` || !row.hasCredentials}
                      onClick={() => void test(row)}
                    >
                      <PlugZap aria-hidden="true" />
                      {busyKey === `test-${row.id}` ? "Testing…" : "Test connection"}
                    </button>
                  </div>
                </>
              ) : (
                <p className="text-small text-muted mb-0">
                  API ছাড়া হাতে কুরিয়ারে দেওয়ার মোড। অর্ডার shipped হলে হস্তান্তরের রেকর্ড থাকে,
                  কোনো API কল হয় না। API অটোমেশন চাইলে Steadfast বা Pathao কানেক্ট করে default করুন।
                </p>
              )}

              {message ? <p className={message.tone === "ok" ? "ok-text" : "error-text"}>{message.text}</p> : null}
            </div>
          </div>
        );
      })}
      {rows.length === 0 ? <p className="text-muted">No courier providers configured.</p> : null}

      {/* ---------- শিপমেন্ট ---------- */}
      <div className="panel">
        <div className="panel-head">
          <h2 className="panel-title">Recent shipments</h2>
        </div>
        <div className="table-wrap" style={{ border: 0, borderRadius: 0 }}>
          <table className="table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Provider</th>
                <th>Status</th>
                <th>Tracking</th>
                <th>Handed over</th>
                <th>Last sync</th>
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
                  <td className="text-small">{row.providerName ?? "—"}</td>
                  <td>
                    <span className={`badge badge-${row.status === "delivered" ? "active" : "draft"}`}>{row.status}</span>
                  </td>
                  <td className="mono text-small">
                    {row.trackingUrl ? (
                      <a href={row.trackingUrl} target="_blank" rel="noreferrer">
                        {row.trackingNumber ?? row.consignmentId}
                      </a>
                    ) : (
                      (row.trackingNumber ?? row.consignmentId ?? "—")
                    )}
                  </td>
                  <td className="text-small text-muted">{row.handedOverAt ? formatDateEn(row.handedOverAt) : "—"}</td>
                  <td className="text-small text-muted">{row.lastSyncedAt ? formatDateEn(row.lastSyncedAt) : "—"}</td>
                  <td className="text-small">{row.lastError ? <span className="error-text">{row.lastError}</span> : "—"}</td>
                </tr>
              ))}
              {shipments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-muted">
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
