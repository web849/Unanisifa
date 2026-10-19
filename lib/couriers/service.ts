/**
 * কুরিয়ার সার্ভিস লেয়ার — DB অপারেশন ও অটোমেশন।
 *
 * - ensureCourierProviders: manual/steadfast/pathao রো না থাকলে তৈরি করে
 *   (ফলে seed ছাড়াই অ্যাডমিন Couriers পেজ থেকে সরাসরি কানেক্ট করা যায়)
 * - testCourierConnection: লাইভ API টেস্ট (Steadfast balance / Pathao stores)
 * - bookOrder: কনসাইনমেন্ট বুকিং বা ম্যানুয়াল হস্তান্তর রেকর্ড
 * - maybeAutoBook: অর্ডার shipped হলে default কুরিয়ারে অটো-বুকিং
 * - syncOpenShipments: খোলা শিপমেন্টের স্ট্যাটাস সিঙ্ক; delivered হলে
 *   অর্ডারও delivered হয় (changeOrderStatus দিয়ে — নোটিফিকেশনসহ)
 *
 * ক্রেডেনশিয়াল courier_providers.credentials_encrypted-এ AES-256-GCM
 * এনক্রিপ্টেড JSON হিসেবে থাকে; ব্রাউজারে কখনো পাঠানো হয় না।
 */

import { and, eq, inArray, isNotNull, sql } from "drizzle-orm";
import { isDatabaseConfigured, requireDb, type Db } from "../db";
import {
  courierProviders,
  courierShipments,
  orderItems,
  orders,
  siteSettings,
  type Order,
} from "../db/schema";
import { decryptSecret, type EncryptedPayload } from "../security";
import { changeOrderStatus } from "../orders/service";
import { createCourierClient } from "./index";
import {
  isApiAdapter,
  isFinalShipmentStatus,
  normalizeCredentials,
  parseStoredCredentials,
  validateCredentials,
  type CourierClient,
  type CourierCredentials,
  type CourierParcel,
} from "./types";

type Provider = typeof courierProviders.$inferSelect;
type Shipment = typeof courierShipments.$inferSelect;

/* ------------------------------------------------------------------ */
/* অটোমেশন সেটিংস (site_settings > "courier")                           */
/* ------------------------------------------------------------------ */

export type CourierSettings = {
  /** shipped হলেই default কুরিয়ারে অটো-বুকিং */
  autoBookOnShipped: boolean;
  /** Pathao-র জন্য ডিফল্ট ওজন (kg) */
  defaultWeightKg: number;
};

export const DEFAULT_COURIER_SETTINGS: CourierSettings = {
  autoBookOnShipped: true,
  defaultWeightKg: 0.5,
};

export async function getCourierSettings(): Promise<CourierSettings> {
  if (!isDatabaseConfigured) return DEFAULT_COURIER_SETTINGS;
  const db = requireDb("কুরিয়ার সেটিংস");
  const rows = await db.select().from(siteSettings).where(eq(siteSettings.key, "courier")).limit(1);
  const value = (rows[0]?.value ?? {}) as Partial<CourierSettings>;
  return {
    autoBookOnShipped:
      typeof value.autoBookOnShipped === "boolean"
        ? value.autoBookOnShipped
        : DEFAULT_COURIER_SETTINGS.autoBookOnShipped,
    defaultWeightKg:
      typeof value.defaultWeightKg === "number" && value.defaultWeightKg > 0
        ? value.defaultWeightKg
        : DEFAULT_COURIER_SETTINGS.defaultWeightKg,
  };
}

export async function saveCourierSettings(
  patch: Partial<CourierSettings>,
  updatedBy: string | null,
): Promise<CourierSettings> {
  const db = requireDb("কুরিয়ার সেটিংস");
  const merged = { ...(await getCourierSettings()), ...patch };
  await db
    .insert(siteSettings)
    .values({ key: "courier", value: merged as never, updatedBy, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: siteSettings.key,
      set: { value: merged as never, updatedBy, updatedAt: new Date() },
    });
  return merged;
}

/* ------------------------------------------------------------------ */
/* প্রোভাইডার                                                           */
/* ------------------------------------------------------------------ */

const KNOWN_PROVIDERS: Array<{ adapter: string; name: string; enabled: boolean; isDefault: boolean }> = [
  { adapter: "manual", name: "Manual Handover", enabled: true, isDefault: true },
  { adapter: "steadfast", name: "Steadfast Courier", enabled: false, isDefault: false },
  { adapter: "pathao", name: "Pathao Courier", enabled: false, isDefault: false },
];

/** প্রোভাইডার রো না থাকলে তৈরি করে (adapter unique — conflict হলে কিছু করে না) */
export async function ensureCourierProviders(db: Db): Promise<void> {
  await db.insert(courierProviders).values(KNOWN_PROVIDERS).onConflictDoNothing({
    target: courierProviders.adapter,
  });
}

export async function getDefaultProvider(db: Db): Promise<Provider | null> {
  const rows = await db
    .select()
    .from(courierProviders)
    .where(and(eq(courierProviders.enabled, true), eq(courierProviders.isDefault, true)))
    .limit(1);
  return rows[0] ?? null;
}

/** ডিক্রিপ্ট + পার্স; কোনো ধাপ ব্যর্থ হলে null (ক্রেডেনশিয়াল আবার দিতে হবে) */
export function getDecryptedCredentials(provider: Provider): CourierCredentials | null {
  if (!provider.credentialsEncrypted) return null;
  try {
    const payload = JSON.parse(provider.credentialsEncrypted) as EncryptedPayload;
    return parseStoredCredentials(decryptSecret(payload));
  } catch {
    return null;
  }
}

function clientFor(provider: Provider): { client: CourierClient } | { error: string } {
  if (!isApiAdapter(provider.adapter)) {
    return { error: `Unknown API adapter: ${provider.adapter}` };
  }
  const creds = getDecryptedCredentials(provider);
  if (!creds) {
    return { error: "No usable credentials saved — enter API credentials from Admin > Couriers first" };
  }
  const normalized = normalizeCredentials(provider.adapter, creds);
  const valid = validateCredentials(provider.adapter, normalized);
  if (!valid.ok) return { error: valid.error };
  return { client: createCourierClient(provider.adapter, normalized) };
}

/** লাইভ কানেকশন টেস্ট — ফলাফল provider রো-তে লিখে রাখে */
export async function testCourierConnection(
  providerId: number,
): Promise<{ ok: boolean; status: string; message: string }> {
  const db = requireDb("কুরিয়ার");
  const rows = await db
    .select()
    .from(courierProviders)
    .where(eq(courierProviders.id, providerId))
    .limit(1);
  const provider = rows[0];
  if (!provider) return { ok: false, status: "not_found", message: "Courier provider not found" };

  const now = new Date();
  const finish = async (status: string, message: string, ok: boolean) => {
    await db
      .update(courierProviders)
      .set({
        lastConnectionStatus: status,
        lastConnectionAt: now,
        lastError: ok ? null : message.slice(0, 500),
        updatedAt: now,
      })
      .where(eq(courierProviders.id, provider.id));
    return { ok, status, message };
  };

  if (provider.adapter === "manual") {
    return finish(
      "not_applicable",
      "Manual handover mode — no API connection to test. Parcels are recorded from the order page.",
      true,
    );
  }

  const resolved = clientFor(provider);
  if ("error" in resolved) return finish("failed", resolved.error, false);

  const result = await resolved.client.testConnection();
  return finish(result.ok ? "connected" : "failed", result.message, result.ok);
}

/* ------------------------------------------------------------------ */
/* বুকিং                                                                */
/* ------------------------------------------------------------------ */

const BOOKABLE_ORDER_STATUSES = ["confirmed", "processing", "shipped"];

export type BookResult =
  | { ok: true; consignmentId: string | null; trackingNumber: string | null; providerName: string }
  | { ok: false; error: string; alreadyBooked?: boolean };

async function buildParcel(db: Db, order: Order, weightKg: number): Promise<CourierParcel> {
  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
  const description = items
    .map((item) => `${item.productName}${item.quantity > 1 ? ` x${item.quantity}` : ""}`)
    .join(", ");
  const quantity = items.reduce((sum, item) => sum + item.quantity, 0);
  return {
    invoice: order.orderNumber,
    recipientName: order.name,
    recipientPhone: order.phoneNormalized,
    recipientAddress: order.address,
    codAmount: order.dueAmount,
    note: order.note,
    itemDescription: description || null,
    itemQuantity: quantity > 0 ? quantity : 1,
    weightKg,
    recipientEmail: order.email,
  };
}

async function upsertShipment(
  db: Db,
  orderId: number,
  values: Partial<typeof courierShipments.$inferInsert>,
): Promise<void> {
  const now = new Date();
  await db
    .insert(courierShipments)
    .values({ orderId, status: "not_sent", ...values, updatedAt: now })
    .onConflictDoUpdate({
      target: courierShipments.orderId,
      set: { ...values, updatedAt: now },
    });
}

export async function bookOrder(orderId: number, providerId?: number): Promise<BookResult> {
  const db = requireDb("কুরিয়ার বুকিং");
  const orderRows = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  const order = orderRows[0];
  if (!order) return { ok: false, error: "Order not found" };
  if (!BOOKABLE_ORDER_STATUSES.includes(order.status)) {
    return {
      ok: false,
      error:
        order.status === "pending"
          ? "Confirm the order before sending it to the courier"
          : `Order is ${order.status} — courier booking is not possible`,
    };
  }

  const provider = providerId
    ? (await db.select().from(courierProviders).where(eq(courierProviders.id, providerId)).limit(1))[0]
    : await getDefaultProvider(db);
  if (!provider) return { ok: false, error: "No courier provider selected — set a default in Admin > Couriers" };
  if (!provider.enabled) return { ok: false, error: `${provider.name} is disabled` };

  const existingRows = await db
    .select()
    .from(courierShipments)
    .where(eq(courierShipments.orderId, orderId))
    .limit(1);
  const existing = existingRows[0];
  if (existing?.consignmentId) {
    return {
      ok: false,
      alreadyBooked: true,
      error: `Already booked — consignment ${existing.consignmentId}`,
    };
  }
  if (existing?.handedOverAt && provider.adapter === "manual") {
    return { ok: false, alreadyBooked: true, error: "Already marked handed over (manual)" };
  }

  const now = new Date();

  /* ম্যানুয়াল হস্তান্তর — API ছাড়াই রেকর্ড */
  if (provider.adapter === "manual") {
    await upsertShipment(db, orderId, {
      providerId: provider.id,
      status: "booked",
      handedOverAt: now,
      lastError: null,
      providerResponse: { manual: true } as never,
    });
    await moveToShippedIfProcessing(order, `Manual courier handover recorded`);
    return { ok: true, consignmentId: null, trackingNumber: null, providerName: provider.name };
  }

  const resolved = clientFor(provider);
  if ("error" in resolved) {
    await upsertShipment(db, orderId, {
      providerId: provider.id,
      status: existing?.status ?? "not_sent",
      lastError: resolved.error.slice(0, 500),
    });
    return { ok: false, error: resolved.error };
  }

  const settings = await getCourierSettings();
  const parcel = await buildParcel(db, order, settings.defaultWeightKg);
  try {
    const booked = await resolved.client.createOrder(parcel);
    await upsertShipment(db, orderId, {
      providerId: provider.id,
      consignmentId: booked.consignmentId,
      trackingNumber: booked.trackingNumber,
      status: booked.status,
      handedOverAt: now,
      lastError: null,
      lastSyncedAt: now,
      providerResponse: booked.raw as never,
    });
    await moveToShippedIfProcessing(
      order,
      `Courier booked: ${provider.name} · consignment ${booked.consignmentId}`,
    );
    return {
      ok: true,
      consignmentId: booked.consignmentId,
      trackingNumber: booked.trackingNumber,
      providerName: provider.name,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Courier booking failed";
    await upsertShipment(db, orderId, {
      providerId: provider.id,
      status: existing?.status ?? "not_sent",
      lastError: message.slice(0, 500),
    });
    return { ok: false, error: message };
  }
}

/** বুকিংয়ের পর processing অর্ডারকে shipped করা (confirmed থেকে সরাসরি যায় না — স্টেট মেশিন) */
async function moveToShippedIfProcessing(order: Order, note: string): Promise<void> {
  if (order.status !== "processing") return;
  await changeOrderStatus(
    order.id,
    "shipped",
    { actorId: null, actorName: "courier-automation", ipHash: null },
    note,
  ).catch(() => undefined);
}

/**
 * অটো-বুকিং হুক — অর্ডার shipped হলে ডাকা হয়।
 * সেটিংসে চালু থাকলে ও default প্রোভাইডার থাকলে বুক করে; ব্যর্থতা
 * শিপমেন্টে lastError হিসেবে থাকে, স্ট্যাটাস পরিবর্তন আটকায় না।
 */
export async function maybeAutoBook(orderId: number): Promise<BookResult | null> {
  if (!isDatabaseConfigured) return null;
  const settings = await getCourierSettings().catch(() => DEFAULT_COURIER_SETTINGS);
  if (!settings.autoBookOnShipped) return null;
  const db = requireDb("কুরিয়ার অটোমেশন");
  const provider = await getDefaultProvider(db).catch(() => null);
  if (!provider) return null;
  return bookOrder(orderId, provider.id).catch((error: unknown) => ({
    ok: false as const,
    error: error instanceof Error ? error.message : "Auto-booking failed",
  }));
}

/* ------------------------------------------------------------------ */
/* স্ট্যাটাস সিঙ্ক                                                          */
/* ------------------------------------------------------------------ */

export type SyncOneResult = { updated: boolean; status?: string; error?: string };

async function syncOne(
  db: Db,
  shipment: Shipment,
  provider: Provider,
  client: CourierClient,
): Promise<SyncOneResult> {
  if (!shipment.consignmentId) return { updated: false };
  const now = new Date();
  try {
    const result = await client.getStatus(shipment.consignmentId);
    const attention =
      result.status === "cancelled" || result.status === "returned" || result.status === "returning"
        ? `Courier reported "${result.rawStatus}" — review this order (stock/COD)`
        : result.status === "partial_delivered"
          ? "Partially delivered — review COD collection & remaining items"
          : null;
    await db
      .update(courierShipments)
      .set({
        status: result.status,
        lastSyncedAt: now,
        lastError: attention,
        providerResponse: result.raw as never,
        updatedAt: now,
      })
      .where(eq(courierShipments.id, shipment.id));

    /* ডেলিভারড হলে অর্ডারও delivered (paymentStatus/নোটিফিকেশন changeOrderStatus সামলায়) */
    if (result.status === "delivered") {
      await changeOrderStatus(
        shipment.orderId,
        "delivered",
        { actorId: null, actorName: "courier-sync", ipHash: null },
        `Courier delivered (${provider.name} · ${shipment.consignmentId})`,
      ).catch(() => undefined);
    }
    return { updated: true, status: result.status };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Status sync failed";
    await db
      .update(courierShipments)
      .set({ lastError: message.slice(0, 500), lastSyncedAt: now, updatedAt: now })
      .where(eq(courierShipments.id, shipment.id));
    return { updated: false, error: message };
  }
}

/** একটা অর্ডারের শিপমেন্ট সিঙ্ক (অর্ডার পেজের Sync বোতাম) */
export async function syncOrderShipment(orderId: number): Promise<SyncOneResult & { message?: string }> {
  const db = requireDb("কুরিয়ার সিঙ্ক");
  const rows = await db
    .select()
    .from(courierShipments)
    .where(eq(courierShipments.orderId, orderId))
    .limit(1);
  const shipment = rows[0];
  if (!shipment?.consignmentId || !shipment.providerId) {
    return { updated: false, message: "No API consignment to sync for this order" };
  }
  const providerRows = await db
    .select()
    .from(courierProviders)
    .where(eq(courierProviders.id, shipment.providerId))
    .limit(1);
  const provider = providerRows[0];
  if (!provider || !isApiAdapter(provider.adapter)) {
    return { updated: false, message: "Shipment provider has no API to sync" };
  }
  const resolved = clientFor(provider);
  if ("error" in resolved) return { updated: false, error: resolved.error };
  return syncOne(db, shipment, provider, resolved.client);
}

export type SyncSummary = { checked: number; updated: number; delivered: number; failed: number };

/** খোলা (final নয়) সব API শিপমেন্ট সিঙ্ক — প্রোভাইডার প্রতি একটা ক্লায়েন্ট (টোকেন রিইউজ) */
export async function syncOpenShipments(limit = 100): Promise<SyncSummary> {
  if (!isDatabaseConfigured) return { checked: 0, updated: 0, delivered: 0, failed: 0 };
  const db = requireDb("কুরিয়ার সিঙ্ক");
  const open = await db
    .select()
    .from(courierShipments)
    .where(isNotNull(courierShipments.consignmentId))
    .orderBy(sql`${courierShipments.updatedAt} ASC`)
    .limit(limit * 2);

  const candidates = open.filter((row) => !isFinalShipmentStatus(row.status)).slice(0, limit);
  if (candidates.length === 0) return { checked: 0, updated: 0, delivered: 0, failed: 0 };

  const providerIds = [...new Set(candidates.map((row) => row.providerId).filter((id): id is number => id != null))];
  const providers = providerIds.length
    ? await db.select().from(courierProviders).where(inArray(courierProviders.id, providerIds))
    : [];
  const providerById = new Map(providers.map((provider) => [provider.id, provider]));
  const clientByProvider = new Map<number, CourierClient | null>();

  const summary: SyncSummary = { checked: 0, updated: 0, delivered: 0, failed: 0 };
  for (const shipment of candidates) {
    const provider = shipment.providerId ? providerById.get(shipment.providerId) : undefined;
    if (!provider || !isApiAdapter(provider.adapter)) continue;
    if (!clientByProvider.has(provider.id)) {
      const resolved = clientFor(provider);
      clientByProvider.set(provider.id, "error" in resolved ? null : resolved.client);
    }
    const client = clientByProvider.get(provider.id);
    if (!client) {
      summary.failed += 1;
      continue;
    }
    summary.checked += 1;
    const result = await syncOne(db, shipment, provider, client);
    if (result.updated) {
      summary.updated += 1;
      if (result.status === "delivered") summary.delivered += 1;
    } else {
      summary.failed += 1;
    }
  }
  return summary;
}
