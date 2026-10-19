import { createPathaoClient } from "./pathao";
import { createSteadfastClient } from "./steadfast";
import type { CourierAdapterId, CourierClient, CourierCredentials, FetchImpl } from "./types";

/** অ্যাডাপ্টার অনুযায়ী API ক্লায়েন্ট তৈরি */
export function createCourierClient(
  adapter: CourierAdapterId,
  creds: CourierCredentials,
  fetchImpl?: FetchImpl,
): CourierClient {
  return adapter === "steadfast"
    ? createSteadfastClient(creds, fetchImpl)
    : createPathaoClient(creds, fetchImpl);
}

export * from "./types";
export { createPathaoClient } from "./pathao";
export { createSteadfastClient } from "./steadfast";
