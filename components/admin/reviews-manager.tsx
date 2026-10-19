"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Trash2, X } from "lucide-react";
import { formatDateEn } from "@/lib/utils";

export type ReviewRow = {
  id: number;
  customerName: string;
  rating: number;
  comment: string | null;
  status: string;
  isVerified: boolean;
  createdAt: Date;
  productName: string | null;
};

export function ReviewsManager({ initial, currentStatus }: { initial: ReviewRow[]; currentStatus: string }) {
  const router = useRouter();
  const [rows, setRows] = useState<ReviewRow[]>(initial);
  const [message, setMessage] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const moderate = async (row: ReviewRow, status: "approved" | "rejected") => {
    setBusyId(row.id);
    setMessage(null);
    const response = await fetch(`/api/admin/reviews/${row.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const json = (await response.json()) as { ok?: boolean; error?: string };
    if (response.ok && json.ok) {
      setRows((prev) => prev.map((item) => (item.id === row.id ? { ...item, status } : item)));
      router.refresh();
    } else {
      setMessage(json.error ?? "Moderation failed");
    }
    setBusyId(null);
  };

  const remove = async (row: ReviewRow) => {
    if (!confirm("Delete this review permanently?")) return;
    const response = await fetch(`/api/admin/reviews/${row.id}`, { method: "DELETE" });
    if (response.ok) setRows((prev) => prev.filter((item) => item.id !== row.id));
  };

  return (
    <div className="stack stack-md">
      {message ? <p className="error-text">{message}</p> : null}

      <form className="filters" method="get">
        <select className="input" name="status" defaultValue={currentStatus}>
          <option value="">All</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
        <button type="submit" className="btn btn-outline btn-sm">
          Apply
        </button>
      </form>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Product</th>
              <th>Reviewer</th>
              <th style={{ textAlign: "right" }}>Rating</th>
              <th>Comment</th>
              <th>Status</th>
              <th>Date</th>
              <th style={{ textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td className="text-small">{row.productName ?? "—"}</td>
                <td>
                  {row.customerName}
                  {row.isVerified ? <span className="badge badge-active"> verified</span> : null}
                </td>
                <td className="table-num">{row.rating}/5</td>
                <td className="text-small">{row.comment ?? "—"}</td>
                <td>
                  <span className={`badge badge-${row.status === "approved" ? "active" : row.status === "pending" ? "draft" : "hidden"}`}>
                    {row.status}
                  </span>
                </td>
                <td className="text-small text-muted">{formatDateEn(row.createdAt)}</td>
                <td className="table-actions">
                  {row.status !== "approved" ? (
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      disabled={busyId === row.id}
                      onClick={() => moderate(row, "approved")}
                      aria-label="Approve review"
                    >
                      <Check aria-hidden="true" />
                    </button>
                  ) : null}
                  {row.status !== "rejected" ? (
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      disabled={busyId === row.id}
                      onClick={() => moderate(row, "rejected")}
                      aria-label="Reject review"
                    >
                      <X aria-hidden="true" />
                    </button>
                  ) : null}
                  <button type="button" className="btn btn-danger-outline btn-sm" onClick={() => remove(row)} aria-label="Delete review">
                    <Trash2 aria-hidden="true" />
                  </button>
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-muted">
                  No reviews match the filter.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
