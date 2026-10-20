/**
 * কাস্টমার সেশন — jose JWT, HttpOnly, SameSite=Lax, Secure in production।
 * মেয়াদ ৭ দিন। স্টোরফ্রন্ট টোকেন দিয়ে স্টাফ রুটে ঢোকা যায় না
 * (অ্যাডমিন সেশন আলাদা কুকি ও আলাদা সিক্রেট পেইলোড)।
 */

import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { CUSTOMER_SESSION_COOKIE, CUSTOMER_SESSION_TTL_SECONDS } from "../config";

function secret(): Uint8Array {
  const value = process.env.AUTH_SECRET;
  if (!value) throw new Error("AUTH_SECRET সেট করা নেই");
  return new TextEncoder().encode(`customer:${value}`);
}

export type CustomerSession = { phone: string; name: string | null };

export async function createCustomerSession(session: CustomerSession): Promise<void> {
  const token = await new SignJWT({ ...session, scope: "customer" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${CUSTOMER_SESSION_TTL_SECONDS}s`)
    .sign(secret());

  const iframePreview = process.env.ALLOW_IFRAME_SESSION === "1";
  const store = await cookies();
  store.set(CUSTOMER_SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: iframePreview ? "none" : "lax",
    secure: iframePreview || process.env.NODE_ENV === "production",
    ...(iframePreview ? { partitioned: true } : {}),
    path: "/",
    maxAge: CUSTOMER_SESSION_TTL_SECONDS,
  });
}

export async function getCustomerSession(): Promise<CustomerSession | null> {
  const store = await cookies();
  const token = store.get(CUSTOMER_SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    if (payload.scope !== "customer" || typeof payload.phone !== "string") return null;
    return { phone: payload.phone, name: typeof payload.name === "string" ? payload.name : null };
  } catch {
    return null;
  }
}

export async function destroyCustomerSession(): Promise<void> {
  const store = await cookies();
  store.delete(CUSTOMER_SESSION_COOKIE);
}
