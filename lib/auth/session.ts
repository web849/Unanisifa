/**
 * অ্যাডমিন সেশন — bcrypt + jose JWT।
 * কুকি: np_admin_session (HttpOnly, SameSite=Lax, Secure in production), মেয়াদ ১২ ঘণ্টা।
 * সেশনে authVersion থাকে — পাসওয়ার্ড বদলালে সব সেশন ড্রপ হয়ে যায়।
 * রোল: owner / admin / operator / viewer (viewer শুধু দেখবে)।
 */

import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { ADMIN_SESSION_COOKIE, ADMIN_SESSION_TTL_SECONDS } from "../config";
import { requireDb } from "../db";
import { adminUsers, type AdminUser } from "../db/schema";

export type AdminRole = "owner" | "admin" | "operator" | "viewer";

export type AdminSession = {
  userId: string;
  email: string;
  name: string;
  role: AdminRole;
  authVersion: number;
};

function secret(): Uint8Array {
  const value = process.env.AUTH_SECRET;
  if (!value) throw new Error("AUTH_SECRET সেট করা নেই — অ্যাডমিন লগইন সম্ভব নয়");
  return new TextEncoder().encode(`admin:${value}`);
}

export async function createAdminSession(user: AdminUser): Promise<void> {
  const token = await new SignJWT({
    sub: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    authVersion: user.authVersion,
    scope: "admin",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${ADMIN_SESSION_TTL_SECONDS}s`)
    .sign(secret());

  const iframePreview = process.env.ALLOW_IFRAME_SESSION === "1";
  const store = await cookies();
  store.set(ADMIN_SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: iframePreview ? "none" : "lax",
    secure: iframePreview || process.env.NODE_ENV === "production",
    ...(iframePreview ? { partitioned: true } : {}),
    path: "/",
    maxAge: ADMIN_SESSION_TTL_SECONDS,
  });
}

/**
 * সেশন যাচাই — টোকেন + ডেটাবেজে ইউজার active + authVersion মিল।
 * পাসওয়ার্ড বদলালে authVersion বাড়ে → পুরোনো সব সেশন বাতিল।
 */
export async function getAdminSession(): Promise<AdminSession | null> {
  const store = await cookies();
  const token = store.get(ADMIN_SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    if (payload.scope !== "admin" || typeof payload.sub !== "string") return null;
    const db = requireDb("অ্যাডমিন সেশন");
    const rows = await db.select().from(adminUsers).where(eq(adminUsers.id, payload.sub)).limit(1);
    const user = rows[0];
    if (!user || !user.isActive) return null;
    if (user.authVersion !== Number(payload.authVersion)) return null;
    return {
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role as AdminRole,
      authVersion: user.authVersion,
    };
  } catch {
    return null;
  }
}

export async function destroyAdminSession(): Promise<void> {
  const store = await cookies();
  store.delete(ADMIN_SESSION_COOKIE);
}

const MUTATING_ROLES: AdminRole[] = ["owner", "admin", "operator"];

/** viewer রোলের মিউটেশন ৪০৩ */
export function canMutate(session: AdminSession): boolean {
  return MUTATING_ROLES.includes(session.role);
}

export function isOwner(session: AdminRole): boolean {
  return session === "owner";
}
