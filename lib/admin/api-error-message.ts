/**
 * অ্যাডমিন API এরর পেলোড থেকে মানুষের পড়ার মতো বিস্তারিত বার্তা বানায়।
 *
 * সার্ভার zod ভ্যালিডেশনে ব্যর্থ হলে `{ ok:false, error:"Invalid … data",
 * fieldErrors:{ slug:["…"] }, formErrors:[] }` পাঠায়। আগে ফ্রন্টএন্ড শুধু
 * `error` দেখাত — "Invalid landing page data" দেখে বোঝা যেত না কোন ফিল্ডে
 * সমস্যা, ফলে মনে হতো পেজই তৈরি হচ্ছে না। এখন ফিল্ড-ভিত্তিক কারণও দেখায়।
 */

type ApiErrorPayload = {
  error?: unknown;
  fieldErrors?: Record<string, unknown>;
  formErrors?: unknown;
} | null | undefined;

export function apiErrorMessage(payload: ApiErrorPayload, fallback: string, httpStatus?: number): string {
  const details: string[] = [];

  if (payload?.fieldErrors && typeof payload.fieldErrors === "object") {
    for (const [field, messages] of Object.entries(payload.fieldErrors)) {
      if (Array.isArray(messages)) {
        for (const message of messages.slice(0, 2)) {
          if (typeof message === "string" && message.trim()) details.push(`${field}: ${message}`);
        }
      }
    }
  }
  if (Array.isArray(payload?.formErrors)) {
    for (const message of payload.formErrors.slice(0, 2)) {
      if (typeof message === "string" && message.trim()) details.push(message);
    }
  }

  const base =
    typeof payload?.error === "string" && payload.error.trim()
      ? payload.error.trim()
      : httpStatus
        ? `${fallback} (HTTP ${httpStatus})`
        : fallback;

  return details.length > 0 ? `${base} — ${details.join("; ")}` : base;
}
