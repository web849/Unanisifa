/** API রুট হেল্পার — JSON রেসপন্স, রিকোয়েস্ট কনটেক্সট, same-origin চেক */

import { NextResponse } from "next/server";
import { clientIpFromHeaders, hashIp, isSameOriginRequest } from "../security";

export type RequestContext = {
  clientIp: string;
  clientIpHash: string;
  userAgent: string | null;
};

export function requestContext(headers: Headers): RequestContext {
  const clientIp = clientIpFromHeaders(headers);
  return {
    clientIp,
    clientIpHash: hashIp(clientIp),
    userAgent: headers.get("user-agent"),
  };
}

export function jsonError(status: number, error: string, extra?: Record<string, unknown>) {
  return NextResponse.json({ ok: false, error, ...extra }, { status });
}

export function jsonOk(data: Record<string, unknown>, status = 200) {
  return NextResponse.json({ ok: true, ...data }, { status });
}

/**
 * মিউটেশন রুট গার্ড — same-origin (Origin/Referer) + POST-only।
 * ব্যর্থ হলে 403।
 */
export function guardMutation(request: Request): NextResponse | null {
  if (request.method !== "POST") {
    return jsonError(405, "এই অপারেশনের জন্য POST প্রয়োজন।");
  }
  if (!isSameOriginRequest(request.headers)) {
    return jsonError(403, "অনুমোদিত নয়: রিকোয়েস্টটি এই সাইট থেকে আসেনি।");
  }
  return null;
}

export async function readJson<T>(request: Request): Promise<T | null> {
  try {
    return (await request.json()) as T;
  } catch {
    return null;
  }
}
