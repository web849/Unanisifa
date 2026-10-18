/**
 * ডেটাবেজ-বেইজড রেট লিমিট (fixed window) — login, register, order, lead,
 * coupon, review রুটে ব্যবহৃত। DB না থাকলে লিমিট প্রযোজ্য নয়
 * (তখন রাইট-অপারেশনই "database not configured" দেখায়)।
 */

import { and, eq, sql } from "drizzle-orm";
import { isDatabaseConfigured, requireDb } from "../db";
import { rateLimits } from "../db/schema";
import { hashRateKey } from "../security";

export type RateLimitResult = { allowed: boolean; remaining: number; retryAfterSeconds: number };

export const RATE_BUCKETS = {
  login: { limit: 8, windowSeconds: 15 * 60 },
  register: { limit: 6, windowSeconds: 60 * 60 },
  order: { limit: 12, windowSeconds: 10 * 60 },
  lead: { limit: 15, windowSeconds: 10 * 60 },
  coupon: { limit: 30, windowSeconds: 10 * 60 },
  review: { limit: 6, windowSeconds: 60 * 60 },
  mystery: { limit: 5, windowSeconds: 60 * 60 },
  adminWrite: { limit: 60, windowSeconds: 60 },
} as const;

export type RateBucket = keyof typeof RATE_BUCKETS;

export async function checkRateLimit(
  bucket: RateBucket,
  key: string,
): Promise<RateLimitResult> {
  const config = RATE_BUCKETS[bucket];
  if (!isDatabaseConfigured) {
    return { allowed: true, remaining: config.limit, retryAfterSeconds: 0 };
  }

  const db = requireDb("রেট লিমিট");
  const keyHash = hashRateKey(`${bucket}:${key}`);
  const now = new Date();

  const rows = await db
    .select()
    .from(rateLimits)
    .where(and(eq(rateLimits.bucket, bucket), eq(rateLimits.keyHash, keyHash)))
    .limit(1);
  const row = rows[0];

  if (!row || row.expiresAt <= now) {
    const expiresAt = new Date(now.getTime() + config.windowSeconds * 1000);
    if (row) {
      await db
        .update(rateLimits)
        .set({ count: 1, windowStart: now, expiresAt })
        .where(eq(rateLimits.id, row.id));
      return { allowed: true, remaining: config.limit - 1, retryAfterSeconds: 0 };
    }
    await db.insert(rateLimits).values({ bucket, keyHash, count: 1, windowStart: now, expiresAt });
    return { allowed: true, remaining: config.limit - 1, retryAfterSeconds: 0 };
  }

  if (row.count >= config.limit) {
    const retryAfterSeconds = Math.max(1, Math.ceil((row.expiresAt.getTime() - now.getTime()) / 1000));
    return { allowed: false, remaining: 0, retryAfterSeconds };
  }

  await db
    .update(rateLimits)
    .set({ count: sql`${rateLimits.count} + 1` })
    .where(eq(rateLimits.id, row.id));
  return { allowed: true, remaining: config.limit - row.count - 1, retryAfterSeconds: 0 };
}
