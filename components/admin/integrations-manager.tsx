"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Save, Trash2 } from "lucide-react";
import { formatDateEn } from "@/lib/utils";

const KEY_LABELS: Record<string, string> = {
  telegram_bot_token: "Telegram bot token",
  telegram_chat_id: "Telegram chat id",
  resend_api_key: "Resend API key (email)",
  meta_capi_token: "Meta Conversions API token",
  r2_account_id: "R2 Account ID",
  r2_access_key_id: "R2 Access Key ID",
  r2_secret_access_key: "R2 Secret Access Key",
  r2_bucket: "R2 Bucket",
  r2_public_base_url: "R2 Public Base URL (optional)",
};

export function IntegrationsManager({
  secretStatus,
  vaultKeys,
  tracking,
}: {
  secretStatus: Record<string, boolean>;
  vaultKeys: string[];
  tracking: { enabled: boolean; pixelId: string | null; purchaseTrigger: string; capiTokenSet: boolean; lastEventAt: Date | null };
}) {
  const router = useRouter();
  const [values, setValues] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const [pixelId, setPixelId] = useState(tracking.pixelId ?? "");
  const [capiToken, setCapiToken] = useState("");
  const [enabled, setEnabled] = useState(tracking.enabled);
  const [purchaseTrigger, setPurchaseTrigger] = useState(tracking.purchaseTrigger);

  const saveSecret = async (key: string) => {
    const value = values[key]?.trim();
    if (!value) return;
    setBusy(key);
    setMessage(null);
    const response = await fetch("/api/admin/integrations/secrets", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, value }),
    });
    const json = (await response.json()) as { ok?: boolean; error?: string };
    if (response.ok && json.ok) {
      setValues((prev) => ({ ...prev, [key]: "" }));
      router.refresh();
    } else {
      setMessage(json.error ?? "Save failed");
    }
    setBusy(null);
  };

  const removeSecret = async (key: string) => {
    if (!confirm(`Remove ${KEY_LABELS[key] ?? key} from the vault?`)) return;
    setBusy(key);
    setMessage(null);
    const response = await fetch("/api/admin/integrations/secrets", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key }),
    });
    const json = (await response.json()) as { ok?: boolean; error?: string };
    if (!response.ok || !json.ok) setMessage(json.error ?? "Remove failed");
    setBusy(null);
    router.refresh();
  };

  const saveTracking = async () => {
    setBusy("tracking");
    setMessage(null);
    const response = await fetch("/api/admin/integrations/tracking", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        enabled,
        pixelId: pixelId.trim() || null,
        purchaseTrigger,
        ...(capiToken.trim() ? { capiToken: capiToken.trim() } : {}),
      }),
    });
    const json = (await response.json()) as { ok?: boolean; error?: string };
    if (response.ok && json.ok) {
      setCapiToken("");
      router.refresh();
    } else {
      setMessage(json.error ?? "Save failed");
    }
    setBusy(null);
  };

  return (
    <div className="stack stack-md">
      {message ? <p className="error-text">{message}</p> : null}

      <div className="panel">
        <div className="panel-head">
          <h2 className="panel-title">Credential vault</h2>
        </div>
        <div className="table-wrap" style={{ border: 0, borderRadius: 0 }}>
          <table className="table">
            <thead>
              <tr>
                <th>Key</th>
                <th>Status</th>
                <th>Value</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {vaultKeys.map((key) => (
                <tr key={key}>
                  <td>
                    <KeyRound aria-hidden="true" className="inline-icon" /> {KEY_LABELS[key] ?? key}
                    <br />
                    <span className="mono text-small text-muted">{key}</span>
                  </td>
                  <td>
                    <span className={secretStatus[key] ? "stock-ok" : "badge badge-draft"}>{secretStatus[key] ? "Set" : "Not set"}</span>
                  </td>
                  <td style={{ minWidth: 240 }}>
                    <input
                      className="input"
                      type="password"
                      autoComplete="off"
                      placeholder={secretStatus[key] ? "Replace value…" : "Enter value…"}
                      value={values[key] ?? ""}
                      onChange={(e) => setValues((prev) => ({ ...prev, [key]: e.target.value }))}
                    />
                  </td>
                  <td className="table-actions">
                    <button type="button" className="btn btn-outline btn-sm" disabled={busy === key || !values[key]?.trim()} onClick={() => void saveSecret(key)}>
                      <Save aria-hidden="true" />
                      Save
                    </button>
                    {secretStatus[key] ? (
                      <button type="button" className="btn btn-danger-outline btn-sm" disabled={busy === key} onClick={() => void removeSecret(key)} aria-label={`Remove ${key}`}>
                        <Trash2 aria-hidden="true" />
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <h2 className="panel-title">Meta Pixel & Conversions API</h2>
        </div>
        <div className="panel-body stack stack-sm">
          <div className="grid-2">
            <label className="field">
              <span className="label">Pixel ID (public, injected site-wide)</span>
              <input className="input mono" value={pixelId} onChange={(e) => setPixelId(e.target.value)} placeholder="e.g. 1234567890" />
            </label>
            <label className="field">
              <span className="label">CAPI token {tracking.capiTokenSet ? "(stored — replace to rotate)" : "(not set)"}</span>
              <input
                className="input"
                type="password"
                autoComplete="off"
                value={capiToken}
                onChange={(e) => setCapiToken(e.target.value)}
                placeholder={tracking.capiTokenSet ? "••••••••" : "EAAB…"}
              />
            </label>
            <label className="field">
              <span className="label">Server Purchase trigger</span>
              <select className="input" value={purchaseTrigger} onChange={(e) => setPurchaseTrigger(e.target.value)}>
                <option value="confirmed">On order confirmed</option>
                <option value="delivered">On order delivered</option>
              </select>
            </label>
            <label className="field field-check">
              <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
              <span>Enable server-side CAPI events</span>
            </label>
          </div>
          <div className="field-row">
            <button type="button" className="btn btn-primary" disabled={busy === "tracking"} onClick={() => void saveTracking()}>
              <Save aria-hidden="true" />
              {busy === "tracking" ? "Saving…" : "Save tracking settings"}
            </button>
            <span className="text-small text-muted">
              {tracking.lastEventAt ? `Last event sent ${formatDateEn(tracking.lastEventAt)}` : "No events sent yet"}
            </span>
          </div>
          <p className="text-small text-muted mb-0">
            Browser Purchase fires on the thank-you page; the server event uses the same event_id so Meta dedupes them.
          </p>
        </div>
      </div>
    </div>
  );
}
