/**
 * কুরিয়ার অ্যাডাপ্টারের pure অংশ — ক্রেডেনশিয়াল ফিল্ড সংজ্ঞা, পে-লোড বিল্ডার,
 * স্ট্যাটাস ম্যাপিং। কোনো DB/নেটওয়ার্ক নেই, তাই unit test করা যায় এবং
 * অ্যাডমিন ক্লায়েন্ট কম্পোনেন্ট থেকেও নিরাপদে import হয়।
 *
 * সমর্থিত API অ্যাডাপ্টার:
 * - steadfast: Steadfast Courier (Packzy) — Api-Key / Secret-Key হেডার
 * - pathao: Pathao Courier (Hermes) — OAuth2 password grant (issue-token)
 * এছাড়া "manual" অ্যাডাপ্টার (API ছাড়া হাতে হস্তান্তর) service লেয়ারে থাকে।
 */

export type CourierAdapterId = "steadfast" | "pathao";

export const API_ADAPTERS: readonly CourierAdapterId[] = ["steadfast", "pathao"];

export function isApiAdapter(adapter: string): adapter is CourierAdapterId {
  return (API_ADAPTERS as readonly string[]).includes(adapter);
}

/* ------------------------------------------------------------------ */
/* ক্রেডেনশিয়াল                                                        */
/* ------------------------------------------------------------------ */

/** সব ক্রেডেনশিয়াল string — DB-তে AES-GCM এনক্রিপ্টেড JSON হিসেবে থাকে */
export type CourierCredentials = Record<string, string>;

export type CredentialField = {
  key: string;
  label: string;
  placeholder?: string;
  help?: string;
  required: boolean;
  /** true হলে password ইনপুট */
  secret?: boolean;
};

export const STEADFAST_DEFAULT_BASE_URL = "https://portal.packzy.com/api/v1";
export const PATHAO_DEFAULT_BASE_URL = "https://api-hermes.pathao.com";
export const PATHAO_SANDBOX_BASE_URL = "https://courier-api-sandbox.pathao.com";

export const CREDENTIAL_FIELDS: Record<CourierAdapterId, CredentialField[]> = {
  steadfast: [
    {
      key: "apiKey",
      label: "API Key",
      required: true,
      secret: true,
      help: "Steadfast merchant panel (portal.packzy.com) > API settings থেকে পাবেন",
    },
    { key: "secretKey", label: "Secret Key", required: true, secret: true },
    {
      key: "baseUrl",
      label: "Base URL (optional)",
      required: false,
      placeholder: STEADFAST_DEFAULT_BASE_URL,
    },
  ],
  pathao: [
    {
      key: "clientId",
      label: "Client ID",
      required: true,
      help: "Pathao merchant panel > Developer API থেকে পাবেন",
    },
    { key: "clientSecret", label: "Client Secret", required: true, secret: true },
    { key: "username", label: "Username (merchant email)", required: true },
    { key: "password", label: "Password", required: true, secret: true },
    {
      key: "storeId",
      label: "Store ID (optional)",
      required: false,
      placeholder: "Blank = default store auto-selected",
    },
    {
      key: "baseUrl",
      label: "Base URL (optional)",
      required: false,
      placeholder: PATHAO_DEFAULT_BASE_URL,
      help: `Sandbox testing: ${PATHAO_SANDBOX_BASE_URL}`,
    },
  ],
};

/** খালি ফিল্ড বাদ + ট্রিম + baseUrl-এর শেষের "/" কাটা */
export function normalizeCredentials(
  adapter: CourierAdapterId,
  input: Record<string, unknown>,
): CourierCredentials {
  const out: CourierCredentials = {};
  for (const field of CREDENTIAL_FIELDS[adapter]) {
    const raw = input[field.key];
    if (typeof raw !== "string") continue;
    const value = field.key === "baseUrl" ? raw.trim().replace(/\/+$/, "") : raw.trim();
    if (value) out[field.key] = value;
  }
  return out;
}

export function validateCredentials(
  adapter: CourierAdapterId,
  creds: CourierCredentials,
): { ok: true } | { ok: false; error: string } {
  for (const field of CREDENTIAL_FIELDS[adapter]) {
    if (field.required && !creds[field.key]) {
      return { ok: false, error: `${field.label} is required for ${adapter}` };
    }
  }
  if (creds.baseUrl && !/^https:\/\//i.test(creds.baseUrl)) {
    return { ok: false, error: "Base URL must start with https://" };
  }
  if (adapter === "pathao" && creds.storeId && !/^\d+$/.test(creds.storeId)) {
    return { ok: false, error: "Store ID must be a number" };
  }
  return { ok: true };
}

/**
 * ডিক্রিপ্ট করা প্লেইনটেক্সট > ক্রেডেনশিয়াল অবজেক্ট।
 * পুরনো ফরম্যাট (শুধু একটা string কী) JSON নয় > null (আবার ইনপুট দিতে হবে)।
 */
export function parseStoredCredentials(plaintext: string): CourierCredentials | null {
  try {
    const parsed = JSON.parse(plaintext) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    const out: CourierCredentials = {};
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof value === "string" && value.trim()) out[key] = value.trim();
    }
    return Object.keys(out).length > 0 ? out : null;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* পার্সেল ও শিপমেন্ট স্ট্যাটাস                                            */
/* ------------------------------------------------------------------ */

export type CourierParcel = {
  /** আমাদের অর্ডার নম্বর (US…) */
  invoice: string;
  recipientName: string;
  /** 01XXXXXXXXX (১১ ডিজিট) */
  recipientPhone: string;
  recipientAddress: string;
  /** COD সংগ্রহের পরিমাণ (due amount); প্রিপেইড হলে 0 */
  codAmount: number;
  note?: string | null;
  itemDescription?: string | null;
  itemQuantity: number;
  weightKg: number;
  recipientEmail?: string | null;
};

export const SHIPMENT_STATUSES = [
  "not_sent",
  "booked",
  "picked_up",
  "in_transit",
  "out_for_delivery",
  "delivered",
  "partial_delivered",
  "on_hold",
  "returning",
  "returned",
  "cancelled",
  "unknown",
] as const;

export type ShipmentStatus = (typeof SHIPMENT_STATUSES)[number];

/** চূড়ান্ত অবস্থা — এর পর আর সিঙ্ক করার দরকার নেই */
export function isFinalShipmentStatus(status: string): boolean {
  return (
    status === "delivered" ||
    status === "partial_delivered" ||
    status === "returned" ||
    status === "cancelled"
  );
}

/**
 * Steadfast delivery_status > আমাদের স্ট্যাটাস।
 * `*_approval_pending` রাইডারের দাবি, নিশ্চিত নয় — তাই final নয় এমন
 * কাছাকাছি অবস্থায় ম্যাপ হয়; নিশ্চিত স্ট্যাটাস এলেই final হয়।
 */
export function mapSteadfastStatus(raw: string): ShipmentStatus {
  const value = raw.trim().toLowerCase();
  if (value.endsWith("_return_received")) return "returned";
  if (value.includes("_return_")) return "returning";
  switch (value) {
    case "pending":
    case "in_review":
      return "booked";
    case "hold":
    case "exceptional":
    case "cancelled_approval_pending":
      return "on_hold";
    case "delivered_approval_pending":
    case "partial_delivered_approval_pending":
      return "out_for_delivery";
    case "delivered":
      return "delivered";
    case "partial_delivered":
    case "partially_delivered":
      return "partial_delivered";
    case "cancelled":
      return "cancelled";
    default:
      return "unknown";
  }
}

const PATHAO_STATUS_MAP: Record<string, ShipmentStatus> = {
  pending: "booked",
  created: "booked",
  "order-created": "booked",
  "pickup-requested": "booked",
  "assigned-for-pickup": "booked",
  picked: "picked_up",
  "at-the-sorting-hub": "in_transit",
  "in-transit": "in_transit",
  "received-at-last-mile-hub": "in_transit",
  "assigned-for-delivery": "out_for_delivery",
  delivered: "delivered",
  "partial-delivery": "partial_delivered",
  "pickup-failed": "on_hold",
  "delivery-failed": "on_hold",
  "on-hold": "on_hold",
  "pickup-cancelled": "cancelled",
  returned: "returning",
  return: "returning",
  "return-id-created": "returning",
  "return-in-transit": "returning",
  "paid-return": "returning",
  exchanged: "returning",
  exchange: "returning",
  "returned-to-merchant": "returned",
};

/**
 * Pathao order_status / order_status_slug > আমাদের স্ট্যাটাস।
 * "In Transit", "in_transit", "order.delivered" — সব স্পেলিংই চলবে।
 */
export function mapPathaoStatus(raw: string): ShipmentStatus {
  const key = raw.trim().toLowerCase().replace(/^order\./, "").replace(/[\s_]+/g, "-");
  return PATHAO_STATUS_MAP[key] ?? "unknown";
}

/* ------------------------------------------------------------------ */
/* পে-লোড বিল্ডার                                                       */
/* ------------------------------------------------------------------ */

function clampText(value: string, max: number): string {
  const trimmed = value.trim();
  return trimmed.length > max ? trimmed.slice(0, max) : trimmed;
}

function codInt(amount: number): number {
  if (!Number.isFinite(amount) || amount < 0) return 0;
  return Math.round(amount);
}

/** Steadfast POST /create_order বডি (ওভার-লং মান Steadfast চুপচাপ truncate করে — তাই আগে কাটা হয়) */
export function buildSteadfastPayload(parcel: CourierParcel): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    invoice: clampText(parcel.invoice, 100),
    recipient_name: clampText(parcel.recipientName, 100),
    recipient_phone: parcel.recipientPhone,
    recipient_address: clampText(parcel.recipientAddress, 490),
    cod_amount: codInt(parcel.codAmount),
    delivery_type: 0,
    total_lot: Math.max(1, Math.floor(parcel.itemQuantity) || 1),
  };
  if (parcel.note) payload.note = clampText(parcel.note, 480);
  if (parcel.itemDescription) payload.item_description = clampText(parcel.itemDescription, 255);
  if (parcel.recipientEmail) payload.recipient_email = clampText(parcel.recipientEmail, 160);
  return payload;
}

/**
 * Pathao POST /aladdin/api/v1/orders বডি।
 * recipient_city/zone/area পাঠানো হয় না — Pathao পুরো ঠিকানা থেকে
 * অটো-ডিটেক্ট করে (তাই ঠিকানায় এলাকা/থানা/জেলা থাকা জরুরি)।
 */
export function buildPathaoPayload(parcel: CourierParcel, storeId: number): Record<string, unknown> {
  const name = clampText(parcel.recipientName, 100).padEnd(3, ".");
  let address = clampText(parcel.recipientAddress, 220);
  if (address.length < 10) address = `${address}, বাংলাদেশ`.slice(0, 220);
  const weight = Math.min(10, Math.max(0.5, Number.isFinite(parcel.weightKg) ? parcel.weightKg : 0.5));
  const payload: Record<string, unknown> = {
    store_id: storeId,
    merchant_order_id: clampText(parcel.invoice, 100),
    recipient_name: name,
    recipient_phone: parcel.recipientPhone,
    recipient_address: address,
    delivery_type: 48,
    item_type: 2,
    item_quantity: Math.max(1, Math.floor(parcel.itemQuantity) || 1),
    item_weight: weight,
    amount_to_collect: codInt(parcel.codAmount),
  };
  if (parcel.itemDescription) payload.item_description = clampText(parcel.itemDescription, 255);
  if (parcel.note) payload.special_instruction = clampText(parcel.note, 255);
  return payload;
}

/** কাস্টমার-দেখা ট্র্যাকিং লিংক (থাকলে) */
export function trackingUrlFor(
  adapter: string,
  trackingNumber: string | null,
  _consignmentId: string | null,
): string | null {
  if (adapter === "steadfast" && trackingNumber) {
    return `https://steadfast.com.bd/tracking/${encodeURIComponent(trackingNumber)}`;
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* অ্যাডাপ্টার ইন্টারফেস                                                   */
/* ------------------------------------------------------------------ */

export type BookingResult = {
  consignmentId: string;
  trackingNumber: string | null;
  trackingUrl: string | null;
  status: ShipmentStatus;
  raw: unknown;
};

export type CourierStatusResult = {
  status: ShipmentStatus;
  rawStatus: string;
  raw: unknown;
};

export type ConnectionTestResult = { ok: boolean; message: string };

export type CourierClient = {
  /** লাইভ API কল করে যাচাই — throw করে না, ok:false ফেরত দেয় */
  testConnection: () => Promise<ConnectionTestResult>;
  createOrder: (parcel: CourierParcel) => Promise<BookingResult>;
  getStatus: (consignmentId: string) => Promise<CourierStatusResult>;
};

/** API ত্রুটি — মেসেজে কখনো ক্রেডেনশিয়াল থাকে না */
export class CourierApiError extends Error {
  readonly httpStatus?: number;

  constructor(message: string, httpStatus?: number) {
    super(message);
    this.name = "CourierApiError";
    this.httpStatus = httpStatus;
  }
}

export type FetchImpl = typeof fetch;

/** প্রোভাইডারের এরর বডি থেকে মানুষের পড়ার মতো সংক্ষিপ্ত মেসেজ */
export function extractApiError(body: unknown, fallback: string): string {
  if (body && typeof body === "object") {
    const record = body as Record<string, unknown>;
    if (typeof record.message === "string" && record.message.trim()) {
      return record.message.trim().slice(0, 300);
    }
    const errors = record.errors;
    if (errors && typeof errors === "object") {
      for (const value of Object.values(errors as Record<string, unknown>)) {
        if (Array.isArray(value) && typeof value[0] === "string") return value[0].slice(0, 300);
        if (typeof value === "string") return value.slice(0, 300);
      }
    }
    if (typeof record.error === "string" && record.error.trim()) {
      return record.error.trim().slice(0, 300);
    }
  }
  return fallback;
}
