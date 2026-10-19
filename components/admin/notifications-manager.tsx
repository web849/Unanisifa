"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";
import { formatDateEn } from "@/lib/utils";
import { NOTIFICATION_EVENT_LABEL_EN, NOTIFICATION_EVENTS } from "@/lib/integrations/notification-events";

export type ChannelRow = {
  channel: string;
  enabled: boolean;
  events: unknown;
  lastTestAt: Date | null;
  lastTestStatus: string | null;
  lastTestError: string | null;
};

export type LogRow = {
  id: number;
  channel: string;
  event: string;
  status: string;
  attempts: number;
  lastError: string | null;
  sentAt: Date | null;
  createdAt: Date;
};

const CHANNEL_HINTS: Record<string, string> = {
  telegram: "Needs telegram_bot_token + telegram_chat_id in the vault (or TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID env).",
  email: "Needs resend_api_key in the vault (or RESEND_API_KEY env) and ALERT_EMAIL/ADMIN_EMAIL.",
};

export function NotificationsManager({ channels, logs }: { channels: ChannelRow[]; logs: LogRow[] }) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const byChannel = (name: string) => channels.find((row) => row.channel === name);

  const eventsOf = (row: ChannelRow | undefined): string[] => {
    if (!row || !Array.isArray(row.events)) return [];
    return row.events as string[];
  };

  const saveChannel = async (channel: "telegram" | "email", enabled: boolean, events: string[]) => {
    setBusy(channel);
    setMessage(null);
    const response = await fetch("/api/admin/notifications/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channel, enabled, events }),
    });
    const json = (await response.json()) as { ok?: boolean; error?: string };
    if (!response.ok || !json.ok) setMessage(json.error ?? "Save failed");
    setBusy(null);
    router.refresh();
  };

  const toggleEvent = (channel: "telegram" | "email", event: string) => {
    const row = byChannel(channel);
    const current = eventsOf(row);
    const next = current.includes(event) ? current.filter((item) => item !== event) : [...current, event];
    void saveChannel(channel, row?.enabled ?? true, next);
  };

  const test = async (channel: "telegram" | "email") => {
    setBusy(`${channel}-test`);
    setMessage(null);
    const response = await fetch("/api/admin/notifications/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channel }),
    });
    const json = (await response.json()) as { ok?: boolean; data?: { message?: string; ok?: boolean }; error?: string };
    setMessage(json.data?.message ?? json.error ?? "Done");
    setBusy(null);
    router.refresh();
  };

  const channelCard = (channel: "telegram" | "email", label: string) => {
    const row = byChannel(channel);
    const events = eventsOf(row);
    return (
      <div className="panel">
        <div className="panel-head">
          <h2 className="panel-title">{label}</h2>
          <label className="field-check">
            <input
              type="checkbox"
              checked={row?.enabled ?? false}
              disabled={busy === channel}
              onChange={(e) => void saveChannel(channel, e.target.checked, events)}
            />
            <span>Enabled</span>
          </label>
        </div>
        <div className="panel-body stack stack-sm">
          <p className="text-small text-muted mb-0">{CHANNEL_HINTS[channel]}</p>
          <div className="chip-row">
            {NOTIFICATION_EVENTS.filter((event) => event !== "test").map((event) => (
              <button
                key={event}
                type="button"
                className={`chip ${events.includes(event) ? "chip-on" : ""}`}
                disabled={busy === channel}
                onClick={() => toggleEvent(channel, event)}
                aria-pressed={events.includes(event)}
              >
                {NOTIFICATION_EVENT_LABEL_EN[event] ?? event}
              </button>
            ))}
          </div>
          <div className="field-row">
            <button type="button" className="btn btn-outline btn-sm" disabled={busy === `${channel}-test`} onClick={() => void test(channel)}>
              <Send aria-hidden="true" />
              {busy === `${channel}-test` ? "Sending…" : "Send test"}
            </button>
            <span className="text-small text-muted">
              {row?.lastTestAt
                ? `Last test ${formatDateEn(row.lastTestAt)} — ${row.lastTestStatus ?? "?"}${row.lastTestError ? `: ${row.lastTestError}` : ""}`
                : "Never tested"}
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="stack stack-md">
      {message ? <p className="error-text">{message}</p> : null}
      <div className="grid-2">
        {channelCard("telegram", "Telegram")}
        {channelCard("email", "Email (Resend)")}
      </div>

      <div className="panel">
        <div className="panel-head">
          <h2 className="panel-title">Recent log (50)</h2>
        </div>
        <div className="table-wrap" style={{ border: 0, borderRadius: 0 }}>
          <table className="table">
            <thead>
              <tr>
                <th>Channel</th>
                <th>Event</th>
                <th>Status</th>
                <th style={{ textAlign: "right" }}>Attempts</th>
                <th>Error</th>
                <th>Sent</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((row) => (
                <tr key={row.id}>
                  <td className="text-small">{row.channel}</td>
                  <td className="text-small mono">{row.event}</td>
                  <td>
                    <span className={`badge badge-${row.status === "sent" ? "active" : row.status === "failed" ? "hidden" : "draft"}`}>
                      {row.status}
                    </span>
                  </td>
                  <td className="table-num">{row.attempts}</td>
                  <td className="text-small">{row.lastError ? <span className="error-text">{row.lastError.slice(0, 80)}</span> : "—"}</td>
                  <td className="text-small text-muted">{row.sentAt ? formatDateEn(row.sentAt) : "—"}</td>
                </tr>
              ))}
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-muted">
                    No notifications logged yet.
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
