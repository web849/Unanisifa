/**
 * ডেটাবেজ ক্লায়েন্ট — Neon (serverless HTTP driver) + Drizzle ORM।
 *
 * DATABASE_URL না থাকলে db = null থাকে:
 *  - পাবলিক ক্যাটালগ লোকাল ডেমো ডেটা দিয়ে রেন্ডার হয় (ডিজাইন রিভিউয়ের জন্য)
 *  - যেকোনো রাইট / অ্যাডমিন লগইন স্পষ্ট "database not configured" বার্তা দেখায়
 *  - কখনো ভুয়া সাকসেস দেখায় না
 */

import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import * as schema from "./schema";

export * as schema from "./schema";

const DATABASE_URL = process.env.DATABASE_URL ?? "";

export const isDatabaseConfigured: boolean = DATABASE_URL.length > 0;

export type Db = ReturnType<typeof createDb>;

/**
 * neon-serverless (websocket Pool) ড্রাইভার ব্যবহার করা হয় কারণ অর্ডার ইঞ্জিনে
 * আসল ট্রানজেকশন + অ্যাডভাইজরি লক লাগে (HTTP ড্রাইভারে ট্রানজেকশন নেই)।
 */
function createDb() {
  const pool = new Pool({ connectionString: DATABASE_URL, max: 3 });
  return drizzle(pool, { schema });
}

export const db: Db | null = isDatabaseConfigured ? createDb() : null;

/** ডেটাবেজ কনফিগার না থাকলে স্পষ্ট বাংলা এরর */
export class DatabaseNotConfiguredError extends Error {
  constructor(context?: string) {
    super(
      context
        ? `ডেটাবেজ কনফিগার করা নেই (${context})। Vercel বা .env-এ DATABASE_URL সেট করুন, তারপর npm run db:migrate ও npm run db:seed চালান।`
        : "ডেটাবেজ কনফিগার করা নেই। Vercel বা .env-এ DATABASE_URL সেট করুন, তারপর npm run db:migrate ও npm run db:seed চালান।",
    );
    this.name = "DatabaseNotConfiguredError";
  }
}

/** রাইট-অপারেশনের জন্য db — না থাকলে এরর */
export function requireDb(context?: string): Db {
  if (!db) throw new DatabaseNotConfiguredError(context);
  return db;
}

/**
 * Neon HTTP ড্রাইভারে ট্রানজেকশন নেই বলে অর্ডার ইঞ্জিন অ্যাডভাইজরি লক
 * (pg_advisory_xact_lock) ব্যবহার করে — সেটা scripts ও service-এ র‍্য SQL দিয়ে হয়।
 * এই হেল্পারটি শুধু pooled কানেকশনে একক স্টেটমেন্ট চালানোর জন্য।
 */
export async function runRaw<T = unknown>(sqlText: string): Promise<T> {
  const database = requireDb();
  const result = await database.execute(sqlText as never);
  return result as unknown as T;
}

/** ডেটাবেজ কানেকশন হেলথ চেক (অ্যাডমিন ড্যাশবোর্ডে দেখানো হয়) */
export async function checkDatabase(): Promise<{ ok: boolean; message: string }> {
  if (!db) {
    return {
      ok: false,
      message: "DATABASE_URL সেট করা নেই — ডেটাবেজ কানেক্ট নয়।",
    };
  }
  try {
    await db.execute("SELECT 1" as never);
    return { ok: true, message: "ডেটাবেজ কানেক্টেড।" };
  } catch (error) {
    return {
      ok: false,
      message: `ডেটাবেজ এরর: ${error instanceof Error ? error.message : "অজানা এরর"}`,
    };
  }
}
