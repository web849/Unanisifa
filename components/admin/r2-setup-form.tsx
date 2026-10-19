"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save, Trash2 } from "lucide-react";

const KEYS = [
  { key: "r2_account_id", label: "R2 Account ID", placeholder: "e.g. 1234567890abcdef", type: "text" },
  { key: "r2_access_key_id", label: "R2 Access Key ID", placeholder: "...", type: "text" },
  { key: "r2_secret_access_key", label: "R2 Secret Access Key", placeholder: "...", type: "password" },
  { key: "r2_bucket", label: "R2 Bucket", placeholder: "my-bucket", type: "text" },
  { key: "r2_public_base_url", label: "R2 Public Base URL (optional)", placeholder: "https://...", type: "text" },
];

export function R2SetupForm() {
  const router = useRouter();
  const [values, setValues] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const save = async (key: string) => {
    const value = values[key]?.trim();
    if (!value) return;
    setBusy(key);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/integrations/secrets", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (res.ok && json.ok) {
        setValues((prev) => ({ ...prev, [key]: "" }));
        router.refresh();
      } else {
        setMessage(json.error ?? "Save failed");
      }
    } catch {
      setMessage("Network error");
    }
    setBusy(null);
  };

  const remove = async (key: string) => {
    if (!confirm(`Remove ${key} from vault?`)) return;
    setBusy(key);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/integrations/secrets", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) setMessage(json.error ?? "Remove failed");
      else router.refresh();
    } catch {
      setMessage("Network error");
    }
    setBusy(null);
  };

  return (
    <div className="panel">
      <div className="panel-head">
        <h2 className="panel-title">Configure R2 (Cloudflare)</h2>
        <p className="panel-subtitle">Save keys to vault — then uploads work directly from this admin panel</p>
      </div>
      {message ? <p className="error-text">{message}</p> : null}
      <div className="table-wrap" style={{ border: 0, borderRadius: 0 }}>
        <table className="table">
          <tbody>
            {KEYS.map(({ key, label, placeholder, type }) => (
              <tr key={key}>
                <td style={{ minWidth: 260 }}>
                  <strong>{label}</strong>
                  <br />
                  <span className="mono text-small text-muted">{key}</span>
                </td>
                <td>
                  <input
                    className="input"
                    type={type}
                    placeholder={placeholder}
                    value={values[key] ?? ""}
                    onChange={(e) => setValues((prev) => ({ ...prev, [key]: e.target.value }))}
                    disabled={busy === key}
                  />
                </td>
                <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    disabled={busy === key || !values[key]?.trim()}
                    onClick={() => void save(key)}
                  >
                    {busy === key ? "..." : <><Save size={14} /> Save</>}
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger-outline btn-sm"
                    disabled={busy === key}
                    onClick={() => void remove(key)}
                    aria-label={`Remove ${key}`}
                    style={{ marginLeft: 4 }}
                  >
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
