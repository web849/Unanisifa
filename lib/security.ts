/**
 * সিকিউরিটি হেল্পার — IP ও ফোন হ্যাশ, same-origin চেক, ক্রেডেনশিয়াল ভল্ট।
 * সিক্রেট কখনো ব্রাউজারে যায় না।
 */

import { createHmac, createCipheriv, createDecipheriv, randomBytes, timingSafeEqual } from "node:crypto";

const IP_HASH_SECRET = process.env.IP_HASH_SECRET || process.env.AUTH_SECRET || "dev-ip-hash-secret";

/** IP → SHA-256 HMAC হ্যাশ (প্লেইন IP ডেটাবেজে রাখা হয় না) */
export function hashIp(ip: string): string {
  return createHmac("sha256", IP_HASH_SECRET).update(ip).digest("hex");
}

/** ফোন → HMAC হ্যাশ (কুপন per-phone লিমিট ও লিড ডিডুপে ব্যবহৃত) */
export function hashPhone(phone: string): string {
  return createHmac("sha256", IP_HASH_SECRET).update(`phone:${phone}`).digest("hex");
}

/** ডেটাবেজ-বেইজড রেট লিমিটের কী */
export function hashRateKey(key: string): string {
  return createHmac("sha256", IP_HASH_SECRET).update(`rate:${key}`).digest("hex");
}

/**
 * ক্রেডেনশিয়াল ভল্ট — AES-256-GCM।
 * কী: AUTH_SECRET (৩২ বাইট) থেকে SHA-256।
 */
function vaultKey(): Buffer {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET সেট করা নেই — ক্রেডেনশিয়াল এনক্রিপ্ট করা যাচ্ছে না");
  return createHmac("sha256", "unanisifa-vault-v1").update(secret).digest();
}

export type EncryptedPayload = { algorithm: string; ciphertext: string; iv: string; authTag: string };

export function encryptSecret(plaintext: string): EncryptedPayload {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", vaultKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return {
    algorithm: "aes-256-gcm",
    ciphertext: encrypted.toString("base64"),
    iv: iv.toString("base64"),
    authTag: cipher.getAuthTag().toString("base64"),
  };
}

export function decryptSecret(payload: EncryptedPayload): string {
  const decipher = createDecipheriv(
    "aes-256-gcm",
    vaultKey(),
    Buffer.from(payload.iv, "base64"),
  );
  decipher.setAuthTag(Buffer.from(payload.authTag, "base64"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(payload.ciphertext, "base64")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}

/** কনস্ট্যান্ট-টাইম তুলনা */
export function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/** same-origin মিউটেশন প্রটেকশন — Origin/Referer চেক */
export function isSameOriginRequest(headers: Headers): boolean {
  const origin = headers.get("origin");
  const referer = headers.get("referer");
  const host = headers.get("host");
  if (!host) return false;
  if (origin) {
    try {
      return new URL(origin).host === host;
    } catch {
      return false;
    }
  }
  if (referer) {
    try {
      return new URL(referer).host === host;
    } catch {
      return false;
    }
  }
  // GET-সদৃশ নন-میউটেশন কল ছাড়া origin/referer না থাকা সন্দেহজনক
  return false;
}

/** ক্লায়েন্ট IP এক্সট্রাকশন (Vercel / proxy হেডার) */
export function clientIpFromHeaders(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const real = headers.get("x-real-ip");
  if (real) return real;
  return headers.get("x-vercel-proxied-for") ?? "0.0.0.0";
}
