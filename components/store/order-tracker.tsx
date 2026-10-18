import { formatDateTimeBangla } from "@/lib/utils";
import { ORDER_STATUS_LABEL, type OrderStatusValue } from "@/lib/orders/status";

const FLOW: OrderStatusValue[] = ["pending", "confirmed", "processing", "shipped", "delivered"];

export type TrackerHistory = { toStatus: string; note: string | null; createdAt: string };

/**
 * অর্ডার স্ট্যাটাস টাইমলাইন — publicToken/ফোন দিয়ে যাচাই করা অর্ডারের জন্য।
 * বাতিল হলে আলাদাভাবে দেখায়।
 */
export function OrderTracker({
  status,
  history,
}: {
  status: OrderStatusValue;
  history: TrackerHistory[];
}) {
  const historyMap = new Map(history.map((row) => [row.toStatus, row]));
  const cancelled = status === "cancelled";
  const currentIndex = FLOW.indexOf(status);

  return (
    <ol className="timeline" aria-label="অর্ডার স্ট্যাটাস">
      {FLOW.map((step, index) => {
        const done = !cancelled && index <= currentIndex;
        const entry = historyMap.get(step);
        return (
          <li
            key={step}
            className="timeline-item"
            data-done={done}
            data-current={step === status && !cancelled}
          >
            <span className="timeline-title">{ORDER_STATUS_LABEL[step]}</span>
            <span className="timeline-meta">
              {entry ? formatDateTimeBangla(entry.createdAt) : done ? "" : "অপেক্ষমাণ"}
            </span>
          </li>
        );
      })}
      {cancelled ? (
        <li className="timeline-item" data-cancelled="true" data-current="true">
          <span className="timeline-title">{ORDER_STATUS_LABEL.cancelled}</span>
          <span className="timeline-meta">
            {historyMap.get("cancelled") ? formatDateTimeBangla(historyMap.get("cancelled")!.createdAt) : ""}
          </span>
        </li>
      ) : null}
    </ol>
  );
}
