/**
 * Pathao Courier (Hermes) API ক্লায়েন্ট — OAuth2 password grant।
 * বেস: https://api-hermes.pathao.com · সব পাথের prefix /aladdin/api/v1
 *
 * ব্যবহৃত এন্ডপয়েন্ট:
 * - POST /issue-token            → access_token (client instance-এ ক্যাশ হয়)
 * - GET  /stores                 → কানেকশন টেস্ট + default store খোঁজা
 * - POST /orders                 → কনসাইনমেন্ট বুকিং (city/zone/area অটো-ডিটেক্ট)
 * - GET  /orders/:id/info        → স্ট্যাটাস
 *
 * টোকেন DB-তে সেভ হয় না — প্রতিটি অপারেশন-ব্যাচে একবার issue করা হয়
 * (সার্ভারলেসে stateless রাখা সহজ ও নিরাপদ; Pathao রেট লিমিট ৬০/মিনিট)।
 */

import {
  buildPathaoPayload,
  CourierApiError,
  extractApiError,
  mapPathaoStatus,
  PATHAO_DEFAULT_BASE_URL,
  type CourierClient,
  type CourierCredentials,
  type CourierParcel,
  type FetchImpl,
} from "./types";

const TIMEOUT_MS = 20_000;

type PathaoStore = {
  store_id: number;
  store_name: string;
  is_active?: number | boolean;
  is_default_store?: boolean;
};

export function createPathaoClient(creds: CourierCredentials, fetchImpl: FetchImpl = fetch): CourierClient {
  const baseUrl = (creds.baseUrl || PATHAO_DEFAULT_BASE_URL).replace(/\/+$/, "");
  const api = `${baseUrl}/aladdin/api/v1`;
  let tokenPromise: Promise<string> | null = null;

  async function rawRequest(
    url: string,
    init: { method?: string; body?: unknown; token?: string },
  ): Promise<unknown> {
    let response: Response;
    try {
      response = await fetchImpl(url, {
        method: init.method ?? "GET",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          ...(init.token ? { Authorization: `Bearer ${init.token}` } : {}),
        },
        body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
        signal: AbortSignal.timeout(TIMEOUT_MS),
        redirect: "manual",
      });
    } catch (error) {
      throw new CourierApiError(
        error instanceof Error && error.name === "TimeoutError"
          ? "Pathao API timeout — আবার চেষ্টা করুন"
          : "Pathao API-তে পৌঁছানো যাচ্ছে না (network error)",
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
        `Pathao: ${extractApiError(body, `HTTP ${response.status}`)}`,
        response.status,
      );
    }
    if (body === null) throw new CourierApiError("Pathao API থেকে অবৈধ রেসপন্স এসেছে");
    return body;
  }

  function accessToken(): Promise<string> {
    tokenPromise ??= (async () => {
      const body = (await rawRequest(`${api}/issue-token`, {
        method: "POST",
        body: {
          client_id: creds.clientId ?? "",
          client_secret: creds.clientSecret ?? "",
          username: creds.username ?? "",
          password: creds.password ?? "",
          grant_type: "password",
        },
      })) as { access_token?: unknown };
      if (typeof body.access_token !== "string" || !body.access_token) {
        throw new CourierApiError("Pathao টোকেন পাওয়া যায়নি — ক্রেডেনশিয়াল যাচাই করুন");
      }
      return body.access_token;
    })().catch((error: unknown) => {
      tokenPromise = null;
      throw error;
    });
    return tokenPromise;
  }

  async function authed(path: string, init?: { method?: string; body?: unknown }): Promise<unknown> {
    const token = await accessToken();
    return rawRequest(`${api}${path}`, { ...init, token });
  }

  async function listStores(): Promise<PathaoStore[]> {
    const body = (await authed("/stores")) as { data?: { data?: unknown } };
    const rows = body.data?.data;
    return Array.isArray(rows) ? (rows as PathaoStore[]) : [];
  }

  /** creds.storeId থাকলে সেটাই; নাহলে default/active store */
  async function resolveStore(): Promise<PathaoStore> {
    const stores = await listStores();
    if (stores.length === 0) {
      throw new CourierApiError("Pathao অ্যাকাউন্টে কোনো store নেই — আগে merchant panel-এ store তৈরি করুন");
    }
    const wanted = creds.storeId ? Number(creds.storeId) : null;
    if (wanted) {
      const match = stores.find((store) => store.store_id === wanted);
      if (!match) throw new CourierApiError(`Pathao Store ID ${wanted} এই অ্যাকাউন্টে পাওয়া যায়নি`);
      return match;
    }
    return (
      stores.find((store) => store.is_default_store) ??
      stores.find((store) => store.is_active === 1 || store.is_active === true) ??
      stores[0]
    );
  }

  return {
    async testConnection() {
      try {
        const store = await resolveStore();
        return {
          ok: true,
          message: `Connected to Pathao. Store: ${store.store_name} (#${store.store_id})`,
        };
      } catch (error) {
        return {
          ok: false,
          message: error instanceof Error ? error.message : "Pathao connection test failed",
        };
      }
    },

    async createOrder(parcel: CourierParcel) {
      const storeId = creds.storeId ? Number(creds.storeId) : (await resolveStore()).store_id;
      const body = (await authed("/orders", {
        method: "POST",
        body: buildPathaoPayload(parcel, storeId),
      })) as { data?: { consignment_id?: unknown; order_status?: string } };
      const consignmentId = body.data?.consignment_id;
      if (typeof consignmentId !== "string" && typeof consignmentId !== "number") {
        throw new CourierApiError("Pathao বুকিং সফল হলেও consignment_id আসেনি");
      }
      return {
        consignmentId: String(consignmentId),
        trackingNumber: String(consignmentId),
        trackingUrl: null,
        status: mapPathaoStatus(body.data?.order_status ?? "Pending"),
        raw: body,
      };
    },

    async getStatus(consignmentId: string) {
      const body = (await authed(`/orders/${encodeURIComponent(consignmentId)}/info`)) as {
        data?: { order_status?: string; order_status_slug?: string };
      };
      const rawStatus = body.data?.order_status_slug || body.data?.order_status || "";
      if (!rawStatus) throw new CourierApiError("Pathao স্ট্যাটাস রেসপন্সে order_status নেই");
      return { status: mapPathaoStatus(rawStatus), rawStatus, raw: body };
    },
  };
}
