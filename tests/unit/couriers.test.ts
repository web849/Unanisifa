import test from "node:test";
import assert from "node:assert/strict";
import {
  buildPathaoPayload,
  buildSteadfastPayload,
  isFinalShipmentStatus,
  mapPathaoStatus,
  mapSteadfastStatus,
  normalizeCredentials,
  parseStoredCredentials,
  trackingUrlFor,
  validateCredentials,
  type CourierParcel,
} from "../../lib/couriers/types";
import { createSteadfastClient } from "../../lib/couriers/steadfast";
import { createPathaoClient } from "../../lib/couriers/pathao";

const PARCEL: CourierParcel = {
  invoice: "US261018-A1B2C3D",
  recipientName: "Rahim Uddin",
  recipientPhone: "01712345678",
  recipientAddress: "House 1, Road 2, Dhanmondi, Dhaka",
  codAmount: 1250,
  note: "Call before delivery",
  itemDescription: "Herbal Oil x2",
  itemQuantity: 2,
  weightKg: 0.5,
  recipientEmail: "rahim@example.com",
};

/* ---------- ক্রেডেনশিয়াল ---------- */

test("normalizeCredentials trims, drops empty + unknown keys, strips baseUrl slash", () => {
  const out = normalizeCredentials("steadfast", {
    apiKey: "  key-1 ",
    secretKey: "secret-1",
    baseUrl: "https://portal.packzy.com/api/v1/",
    hacker: "nope",
    count: 42,
  });
  assert.deepEqual(out, {
    apiKey: "key-1",
    secretKey: "secret-1",
    baseUrl: "https://portal.packzy.com/api/v1",
  });
});

test("validateCredentials requires adapter-specific fields", () => {
  assert.equal(validateCredentials("steadfast", { apiKey: "k", secretKey: "s" }).ok, true);
  assert.equal(validateCredentials("steadfast", { apiKey: "k" }).ok, false);
  assert.equal(
    validateCredentials("pathao", {
      clientId: "1",
      clientSecret: "s",
      username: "a@b.com",
      password: "p",
    }).ok,
    true,
  );
  assert.equal(
    validateCredentials("pathao", {
      clientId: "1",
      clientSecret: "s",
      username: "a@b.com",
      password: "p",
      storeId: "abc",
    }).ok,
    false,
  );
  assert.equal(
    validateCredentials("steadfast", { apiKey: "k", secretKey: "s", baseUrl: "http://x" }).ok,
    false,
  );
});

test("parseStoredCredentials parses JSON objects, rejects legacy plain strings", () => {
  assert.deepEqual(parseStoredCredentials('{"apiKey":"k","secretKey":" s "}'), {
    apiKey: "k",
    secretKey: "s",
  });
  assert.equal(parseStoredCredentials("just-one-old-key"), null);
  assert.equal(parseStoredCredentials("{}"), null);
  assert.equal(parseStoredCredentials("[1,2]"), null);
});

/* ---------- স্ট্যাটাস ম্যাপিং ---------- */

test("mapSteadfastStatus maps lifecycle incl. approval-pending + returns", () => {
  assert.equal(mapSteadfastStatus("in_review"), "booked");
  assert.equal(mapSteadfastStatus("pending"), "booked");
  assert.equal(mapSteadfastStatus("hold"), "on_hold");
  assert.equal(mapSteadfastStatus("delivered_approval_pending"), "out_for_delivery");
  assert.equal(mapSteadfastStatus("delivered"), "delivered");
  assert.equal(mapSteadfastStatus("partial_delivered"), "partial_delivered");
  assert.equal(mapSteadfastStatus("cancelled"), "cancelled");
  assert.equal(mapSteadfastStatus("cancelled_return_processing"), "returning");
  assert.equal(mapSteadfastStatus("cancelled_return_received"), "returned");
  assert.equal(mapSteadfastStatus("something_new"), "unknown");
});

test("mapPathaoStatus handles slugs, labels and webhook event names", () => {
  assert.equal(mapPathaoStatus("Pending"), "booked");
  assert.equal(mapPathaoStatus("Picked"), "picked_up");
  assert.equal(mapPathaoStatus("In Transit"), "in_transit");
  assert.equal(mapPathaoStatus("assigned-for-delivery"), "out_for_delivery");
  assert.equal(mapPathaoStatus("order.delivered"), "delivered");
  assert.equal(mapPathaoStatus("Partial Delivery"), "partial_delivered");
  assert.equal(mapPathaoStatus("Return"), "returning");
  assert.equal(mapPathaoStatus("Returned to Merchant"), "returned");
  assert.equal(mapPathaoStatus("Pickup Cancelled"), "cancelled");
  assert.equal(mapPathaoStatus("???"), "unknown");
});

test("isFinalShipmentStatus only for settled outcomes", () => {
  assert.equal(isFinalShipmentStatus("delivered"), true);
  assert.equal(isFinalShipmentStatus("returned"), true);
  assert.equal(isFinalShipmentStatus("in_transit"), false);
  assert.equal(isFinalShipmentStatus("unknown"), false);
});

/* ---------- পে-লোড ---------- */

test("buildSteadfastPayload sends invoice/cod and clamps long address", () => {
  const payload = buildSteadfastPayload({ ...PARCEL, recipientAddress: "a".repeat(600), codAmount: 1250.6 });
  assert.equal(payload.invoice, "US261018-A1B2C3D");
  assert.equal(payload.cod_amount, 1251);
  assert.equal((payload.recipient_address as string).length, 490);
  assert.equal(payload.delivery_type, 0);
  assert.equal(payload.total_lot, 2);
});

test("buildPathaoPayload omits city/zone (auto-detect), clamps weight", () => {
  const payload = buildPathaoPayload({ ...PARCEL, weightKg: 99 }, 12345);
  assert.equal(payload.store_id, 12345);
  assert.equal(payload.merchant_order_id, "US261018-A1B2C3D");
  assert.equal(payload.item_weight, 10);
  assert.equal(payload.delivery_type, 48);
  assert.equal(payload.amount_to_collect, 1250);
  assert.equal("recipient_city" in payload, false);
  assert.equal("recipient_zone" in payload, false);
});

test("trackingUrlFor builds steadfast link only", () => {
  assert.equal(
    trackingUrlFor("steadfast", "ABC123", "99"),
    "https://steadfast.com.bd/tracking/ABC123",
  );
  assert.equal(trackingUrlFor("pathao", "XYZ", "XYZ"), null);
  assert.equal(trackingUrlFor("manual", null, null), null);
});

/* ---------- অ্যাডাপ্টার (fake fetch) ---------- */

type FakeResponse = { status: number; body: unknown };

function fakeFetch(handler: (url: string, init: { method?: string; headers: Record<string, string>; body?: string }) => FakeResponse) {
  const calls: Array<{ url: string; method: string; headers: Record<string, string>; body: string }> = [];
  const impl = (async (url: string, init?: { method?: string; headers?: Record<string, string>; body?: string }) => {
    const call = {
      url: String(url),
      method: init?.method ?? "GET",
      headers: init?.headers ?? {},
      body: typeof init?.body === "string" ? init.body : "",
    };
    calls.push(call);
    const { status, body } = handler(call.url, call);
    return {
      ok: status >= 200 && status < 300,
      status,
      text: async () => JSON.stringify(body),
    } as Response;
  }) as typeof fetch;
  return { impl, calls };
}

test("steadfast client: test(create/status) parse real response shapes", async () => {
  const { impl, calls } = fakeFetch((url) => {
    if (url.endsWith("/get_balance")) return { status: 200, body: { status: 200, current_balance: 4321 } };
    if (url.endsWith("/create_order")) {
      return {
        status: 200,
        body: {
          status: 200,
          consignment: { consignment_id: 777, tracking_code: "TRK777", status: "in_review" },
        },
      };
    }
    if (url.includes("/status_with_return_status_by_cid/")) {
      return { status: 200, body: { status: 200, delivery_status: "delivered" } };
    }
    return { status: 404, body: { message: "not found" } };
  });

  const client = createSteadfastClient({ apiKey: "k", secretKey: "s" }, impl);
  const testResult = await client.testConnection();
  assert.equal(testResult.ok, true);
  assert.match(testResult.message, /4321/);

  const booked = await client.createOrder(PARCEL);
  assert.equal(booked.consignmentId, "777");
  assert.equal(booked.trackingNumber, "TRK777");
  assert.equal(booked.status, "booked");
  assert.match(booked.trackingUrl ?? "", /tracking\/TRK777/);

  const status = await client.getStatus("777");
  assert.equal(status.status, "delivered");

  assert.equal(calls[0].headers["Api-Key"], "k");
  assert.equal(calls[0].headers["Secret-Key"], "s");
  assert.match(calls[1].url, /portal\.packzy\.com\/api\/v1\/create_order$/);
});

test("steadfast client: API errors surface provider message, never fake success", async () => {
  const { impl } = fakeFetch(() => ({ status: 401, body: { message: "Invalid Api-Key" } }));
  const client = createSteadfastClient({ apiKey: "bad", secretKey: "bad" }, impl);
  const result = await client.testConnection();
  assert.equal(result.ok, false);
  assert.match(result.message, /Invalid Api-Key/);
  await assert.rejects(() => client.createOrder(PARCEL), /Invalid Api-Key/);
});

test("pathao client: issue-token once, store auto-pick, create + status", async () => {
  let tokenCalls = 0;
  const { impl, calls } = fakeFetch((url, init) => {
    if (url.endsWith("/issue-token")) {
      tokenCalls += 1;
      const sent = JSON.parse(init.body || "{}") as Record<string, string>;
      assert.equal(sent.grant_type, "password");
      return { status: 200, body: { access_token: "tok-1", refresh_token: "r-1", expires_in: 3600, token_type: "Bearer" } };
    }
    if (url.endsWith("/stores")) {
      return {
        status: 200,
        body: {
          type: "success",
          code: 200,
          data: {
            data: [
              { store_id: 111, store_name: "Other", is_active: 1, is_default_store: false },
              { store_id: 222, store_name: "Main Store", is_active: 1, is_default_store: true },
            ],
          },
        },
      };
    }
    if (url.endsWith("/orders")) {
      const sent = JSON.parse(init.body || "{}") as Record<string, unknown>;
      assert.equal(sent.store_id, 222);
      assert.equal(sent.amount_to_collect, 1250);
      return {
        status: 200,
        body: { type: "success", code: 200, data: { consignment_id: "PTH999", order_status: "Pending", delivery_fee: 60 } },
      };
    }
    if (url.includes("/orders/PTH999/info")) {
      return {
        status: 200,
        body: { type: "success", code: 200, data: { consignment_id: "PTH999", order_status: "In Transit", order_status_slug: "In Transit" } },
      };
    }
    return { status: 404, body: { message: "not found" } };
  });

  const client = createPathaoClient(
    { clientId: "cid", clientSecret: "cs", username: "m@example.com", password: "pw" },
    impl,
  );
  const testResult = await client.testConnection();
  assert.equal(testResult.ok, true);
  assert.match(testResult.message, /Main Store/);

  const booked = await client.createOrder(PARCEL);
  assert.equal(booked.consignmentId, "PTH999");
  assert.equal(booked.status, "booked");

  const status = await client.getStatus("PTH999");
  assert.equal(status.status, "in_transit");

  assert.equal(tokenCalls, 1, "token should be cached per client instance");
  assert.ok(calls.some((call) => call.headers.Authorization === "Bearer tok-1"));
});

test("pathao client: explicit storeId skips store lookup mismatch, bad login fails test", async () => {
  const { impl } = fakeFetch((url) => {
    if (url.endsWith("/issue-token")) return { status: 401, body: { message: "Invalid credentials" } };
    return { status: 200, body: {} };
  });
  const client = createPathaoClient(
    { clientId: "x", clientSecret: "y", username: "a@b.com", password: "wrong" },
    impl,
  );
  const result = await client.testConnection();
  assert.equal(result.ok, false);
  assert.match(result.message, /Invalid credentials/);
});
