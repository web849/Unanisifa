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
 * স্টেট-চেঞ্জিং HTTP মেথড — এগুলোই মিউটেশন হিসেবে গণ্য।
 * অ্যাডমিনের সব "সেভ / আপডেট / ডিলিট" কল PATCH, PUT আর DELETE দিয়ে আসে
 * (যেমন সেটিংস সেভ, প্রোডাক্ট এডিট, কুপন আপডেট), তাই এগুলো ব্লক করলে
 * পুরো রাইট পাথ নষ্ট হয় — শুধু POST নয়।
 */
const MUTATION_METHODS = new Set(["POST", "PATCH", "PUT", "DELETE"]);

/**
 * মিউটেশন রুট গার্ড — same-origin (Origin/Referer) + স্টেট-চেঞ্জিং মেথড।
 * মেথড ম্যাচ না করলে 405, same-origin না হলে 403।
 */
export function guardMutation(request: Request): NextResponse | null {
  if (!MUTATION_METHODS.has(request.method.toUpperCase())) {
    return jsonError(405, "এই অপারেশনের জন্য POST/PATCH/PUT/DELETE প্রয়োজন।");
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
