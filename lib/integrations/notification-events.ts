/**
 * নোটিফিকেশন ইভেন্ট তালিকা — ক্লায়েন্ট-সেফ মডিউল (কোনো Node ইমপোর্ট নেই)।
 * অ্যাডমিন UI (client component) ও zod ভ্যালিডেশন দুই জায়গা থেকেই ব্যবহৃত হয়;
 * সার্ভার-সাইড কিউ লজিক lib/integrations/notifications.ts-এ।
 */

export type NotificationEvent =
  | "order_created"
  | "order_confirmed"
  | "order_shipped"
  | "order_delivered"
  | "order_cancelled"
  | "fraud_review"
  | "test";

/** রানটাইম তালিকা — অ্যাডমিন UI ও zod ভ্যালিডেশনের জন্য */
export const NOTIFICATION_EVENTS = [
  "order_created",
  "order_confirmed",
  "order_shipped",
  "order_delivered",
  "order_cancelled",
  "fraud_review",
  "test",
] as const;

/** অ্যাডমিন প্যানেলে ইংরেজি লেবেল */
export const NOTIFICATION_EVENT_LABEL_EN: Record<NotificationEvent, string> = {
  order_created: "New order",
  order_confirmed: "Order confirmed",
  order_shipped: "Order shipped",
  order_delivered: "Order delivered",
  order_cancelled: "Order cancelled",
  fraud_review: "Fraud review needed",
  test: "Test message",
};
