/**
 * মাইগ্রেশন রানার — drizzle/ ফোল্ডারের SQL ফাইলগুলো ক্রমানুসারে প্রয়োগ করে।
 *
 *   npm run db:migrate
 *
 * DIRECT_URL (নন-পুলড) না থাকলে DATABASE_URL ব্যবহার করে।
 * প্রতিটি ফাইল __migrations টেবিলে রেকর্ড হয় — দ্বিতীয়বার চালালে স্কিপ হয়।
 * ডেটাবেজ না থাকলে স্পষ্ট বার্তা দেখিয়ে প্রস্থান করে (ভুয়া সাকসেস নয়)।
 *
 * দুটি নিরাপত্তা:
 *   ১. __migration_lock টেবিলে একবারে একটি রান — Vercel বিল্ড ও GitHub Actions
 *      একসাথে চললেও একই ফাইল দুইবার প্রয়োগ হয় না।
 *   ২. প্রতিটি ফাইল একটি ট্রানজেকশনে প্রয়োগ হয় — মাঝপথে ব্যর্থ হলে ওই ফাইলের
 *      কোনো অংশই ডেটাবেজে থাকে না। (Postgres-এ DDL ট্রানজেকশনাল।)
 */

import { randomUUID } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { neon } from "@neondatabase/serverless";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DRIZZLE_DIR = path.join(ROOT, "drizzle");

// লক কতক্ষণ ধরে অপেক্ষা করবে, আর কত পুরোনো লককে মৃত ধরে নেবে।
const LOCK_TIMEOUT_MS = 10 * 60 * 1000;
const LOCK_POLL_MS = 2000;
const STALE_LOCK_MINUTES = 30;

const OWNER = `${process.pid}-${randomUUID()}`;

const url = process.env.DIRECT_URL || process.env.DATABASE_URL;

if (!url) {
  console.error(
    "[migrate] DATABASE_URL বা DIRECT_URL সেট করা নেই।\n" +
      "Neon ড্যাশবোর্ড থেকে কানেকশন স্ট্রিং নিয়ে .env বা Vercel-এ বসান।",
  );
  process.exit(1);
}

const sql = neon(url);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

/**
 * বুককিপিং টেবিল দুটি তৈরি করে। দুটি বিল্ড একইসাথে প্রথমবার চললে
 * CREATE TABLE IF NOT EXISTS-এর ক্যাটালগ রেস হতে পারে — কিছুক্ষণ রিট্রাই করি।
 */
async function ensureBookkeepingTables() {
  for (let attempt = 1; ; attempt += 1) {
    try {
      await sql`CREATE TABLE IF NOT EXISTS "__migrations" (
        "name" text PRIMARY KEY,
        "applied_at" timestamptz NOT NULL DEFAULT now()
      )`;
      await sql`CREATE TABLE IF NOT EXISTS "__migration_lock" (
        "id" integer PRIMARY KEY,
        "owner" text,
        "acquired_at" timestamptz
      )`;
      return;
    } catch (error) {
      if (attempt >= 5) throw error;
      console.warn(`[migrate] বুককিপিং টেবিল তৈরি রিট্রাই ${attempt}: ${errorMessage(error)}`);
      await sleep(250 * attempt);
    }
  }
}

/**
 * একটি রো-ভিত্তিক লক — Neon HTTP ড্রাইভারে সেশন থাকে না, তাই
 * pg_advisory_lock ব্যবহার করা যায় না। CAS আপডেটে একবারে একজনই জেতে।
 */
async function acquireLock() {
  const startedAt = Date.now();
  let waitingLogged = false;

  for (;;) {
    await sql`INSERT INTO "__migration_lock" ("id") VALUES (1) ON CONFLICT ("id") DO NOTHING`;

    const rows = await sql`
      UPDATE "__migration_lock"
      SET "owner" = ${OWNER}, "acquired_at" = now()
      WHERE "id" = 1
        AND (
          "owner" IS NULL
          OR "acquired_at" IS NULL
          OR "acquired_at" < now() - make_interval(mins => ${STALE_LOCK_MINUTES})
        )
      RETURNING "owner"
    `;

    if (rows.length > 0) {
      return;
    }

    if (!waitingLogged) {
      console.log("[migrate] অন্য একটি মাইগ্রেশন চলছে — শেষ হওয়া পর্যন্ত অপেক্ষা করছি...");
      waitingLogged = true;
    }

    if (Date.now() - startedAt >= LOCK_TIMEOUT_MS) {
      throw new Error(
        `মাইগ্রেশন লক ${Math.round(LOCK_TIMEOUT_MS / 60000)} মিনিটেও ছাড়া হয়নি। ` +
          `অন্য কোনো রান আটকে থাকলে ডেটাবেজে চালান: ` +
          `UPDATE "__migration_lock" SET "owner" = NULL, "acquired_at" = NULL WHERE "id" = 1;`,
      );
    }

    await sleep(LOCK_POLL_MS);
  }
}

async function releaseLock() {
  try {
    await sql`
      UPDATE "__migration_lock"
      SET "owner" = NULL, "acquired_at" = NULL
      WHERE "id" = 1 AND "owner" = ${OWNER}
    `;
  } catch (error) {
    // লক ছাড়তে না পারলেও মূল ফলাফল (সফল/ব্যর্থ) ঢাকা পড়া উচিত নয়।
    console.error(`[migrate] লক ছাড়তে ব্যর্থ: ${errorMessage(error)}`);
  }
}

function readStatements(file) {
  const content = readFileSync(path.join(DRIZZLE_DIR, file), "utf8");
  return content
    .split("--> statement-breakpoint")
    .map((statement) => statement.trim())
    .filter(Boolean);
}

async function applyPending() {
  const appliedRows = await sql`SELECT "name" FROM "__migrations" ORDER BY "name"`;
  const applied = new Set(appliedRows.map((row) => row.name));

  const files = readdirSync(DRIZZLE_DIR)
    .filter((file) => file.endsWith(".sql"))
    .sort();

  let appliedCount = 0;

  for (const file of files) {
    if (applied.has(file)) {
      console.log(`[migrate] skip (already applied): ${file}`);
      continue;
    }

    const statements = readStatements(file);
    console.log(`[migrate] applying ${file} (${statements.length} statements)...`);

    try {
      // DDL + রেকর্ড একই ট্রানজেকশনে — আধা-প্রয়োগ হওয়া অসম্ভব।
      await sql.transaction((txn) => [
        ...statements.map((statement) => txn.query(statement)),
        txn`INSERT INTO "__migrations" ("name") VALUES (${file})`,
      ]);
    } catch (error) {
      throw new Error(
        `${file} প্রয়োগ ব্যর্থ — ফাইলটি সম্পূর্ণ রোলব্যাক হয়েছে, পরে আবার চালানো যাবে। ` +
          `কারণ: ${errorMessage(error)}`,
        { cause: error },
      );
    }

    appliedCount += 1;
    console.log(`[migrate] applied ${file}`);
  }

  if (appliedCount === 0) {
    console.log("[migrate] nothing to apply — ডেটাবেজ আপ-টু-ডেট।");
  } else {
    console.log(`[migrate] done — ${appliedCount}টি মাইগ্রেশন প্রয়োগ হয়েছে।`);
  }
}

async function main() {
  await ensureBookkeepingTables();
  await acquireLock();
  try {
    await applyPending();
  } finally {
    await releaseLock();
  }
}

main().catch((error) => {
  console.error("[migrate] failed:", errorMessage(error));
  process.exit(1);
});
