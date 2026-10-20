/**
 * Steadfast Courier (Packzy) API ক্লায়েন্ট — zero dependency, fetch-ভিত্তিক।
 * বেস: https://portal.packzy.com/api/v1 · হেডার: Api-Key, Secret-Key
 *
 * ব্যবহৃত এন্ডপয়েন্ট:
 * - GET  /get_balance                          → কানেকশন টেস্ট
 * - POST /create_order                         → কনসাইনমেন্ট বুকিং
 * - GET  /status_with_return_status_by_cid/:id → স্ট্যাটাস (রিটার্নসহ)
 */

import {
  buildSteadfastPayload,
  CourierApiError,
  extractApiError,
  mapSteadfastStatus,
  trackingUrlFor,
  STEADFAST_DEFAULT_BASE_URL,
  type CourierClient,
  type CourierCredentials,
  type CourierParcel,
  type FetchImpl,
} from "./types";

const TIMEOUT_MS = 20_000;

type SteadfastConsignment = {
  consignment_id?: number | string;
  tracking_code?: string;
  tracking_link?: string;
  status?: string;
};

export function createSteadfastClient(creds: CourierCredentials, fetchImpl: FetchImpl = fetch): CourierClient {
  const baseUrl = (creds.baseUrl || STEADFAST_DEFAULT_BASE_URL).replace(/\/+$/, "");

  async function request(path: string, init?: { method?: string; body?: unknown }): Promise<unknown> {
    let response: Response;
    try {
      response = await fetchImpl(`${baseUrl}${path}`, {
        method: init?.method ?? "GET",
        headers: {
          "Api-Key": creds.apiKey ?? "",
          "Secret-Key": creds.secretKey ?? "",
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
        signal: AbortSignal.timeout(TIMEOUT_MS),
        redirect: "manual",
      });
    } catch (error) {
      throw new CourierApiError(
        error instanceof Error && error.name === "TimeoutError"
          ? "Steadfast API timeout — আবার চেষ্টা করুন"
          : "Steadfast API-তে পৌঁছানো যাচ্ছে না (network error)",
      );
    }

    const text = await response.text().catch(() => "");
    let body: unknown = null;
    try {
      body = text ? (JSON.parse(text) as unknown) : null;
    } catch {
      body = null;
    }

    if (!response.ok) {
      throw new CourierApiError(
        `Steadfast: ${extractApiError(body, `HTTP ${response.status}`)}`,
        response.status,
      );
    }
    if (body === null) throw new CourierApiError("Steadfast API থেকে অবৈধ রেসপন্স এসেছে");
    return body;
  }

  return {
    async testConnection() {
      try {
        const body = (await request("/get_balance")) as { current_balance?: unknown };
        const balance = Number(body.current_balance);
        if (!Number.isFinite(balance)) {
          return { ok: false, message: "Steadfast রেসপন্সে ব্যালেন্স পাওয়া যায়নি — API key যাচাই করুন" };
        }
        return { ok: true, message: `Connected to Steadfast. Current balance: ৳${balance}` };
      } catch (error) {
        return {
          ok: false,
          message: error instanceof Error ? error.message : "Steadfast connection test failed",
        };
      }
    },

    async createOrder(parcel: CourierParcel) {
      const body = (await request("/create_order", {
        method: "POST",
        body: buildSteadfastPayload(parcel),
      })) as { consignment?: SteadfastConsignment };
      const consignment = body.consignment;
      if (!consignment?.consignment_id) {
        throw new CourierApiError("Steadfast বুকিং সফল হলেও consignment_id আসেনি");
      }
      const trackingNumber = consignment.tracking_code ?? null;
      return {
        consignmentId: String(consignment.consignment_id),
        trackingNumber,
        trackingUrl: consignment.tracking_link ?? trackingUrlFor("steadfast", trackingNumber, null),
        status: mapSteadfastStatus(consignment.status ?? "in_review"),
        raw: body,
      };
    },

    async getStatus(consignmentId: string) {
      const body = (await request(
        `/status_with_return_status_by_cid/${encodeURIComponent(consignmentId)}`,
      )) as { delivery_status?: unknown };
      const rawStatus = typeof body.delivery_status === "string" ? body.delivery_status : "";
      if (!rawStatus) throw new CourierApiError("Steadfast স্ট্যাটাস রেসপন্সে delivery_status নেই");
      return { status: mapSteadfastStatus(rawStatus), rawStatus, raw: body };
    },
  };
}
