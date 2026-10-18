/**
 * মাইগ্রেশন রানার — drizzle/ ফোল্ডারের SQL ফাইলগুলো ক্রমানুসারে প্রয়োগ করে।
 *
 *   npm run db:migrate
 *
 * DIRECT_URL (নন-পুলড) না থাকলে DATABASE_URL ব্যবহার করে।
 * প্রতিটি ফাইল __migrations টেবিলে রেকর্ড হয় — দ্বিতীয়বার চালালে স্কিপ হয়।
 * ডেটাবেজ না থাকলে স্পষ্ট বার্তা দেখিয়ে প্রস্থান করে (ভুয়া সাকসেস নয়)।
 */

import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { neon } from "@neondatabase/serverless";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DRIZZLE_DIR = path.join(ROOT, "drizzle");

const url = process.env.DIRECT_URL || process.env.DATABASE_URL;

if (!url) {
  console.error(
    "[migrate] DATABASE_URL বা DIRECT_URL সেট করা নেই।\n" +
      "Neon ড্যাশবোর্ড থেকে কানেকশন স্ট্রিং নিয়ে .env বা Vercel-এ বসান।",
  );
  process.exit(1);
}

const sql = neon(url);

async function main() {
  await sql`CREATE TABLE IF NOT EXISTS "__migrations" (
    "name" text PRIMARY KEY,
    "applied_at" timestamptz NOT NULL DEFAULT now()
  )`;

  const appliedRows = await sql`SELECT "name" FROM "__migrations" ORDER BY "name"`;
  const applied = new Set(appliedRows.map((r) => r.name));

  const files = readdirSync(DRIZZLE_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  let appliedCount = 0;

  for (const file of files) {
    if (applied.has(file)) {
      console.log(`[migrate] skip (already applied): ${file}`);
      continue;
    }

    const content = readFileSync(path.join(DRIZZLE_DIR, file), "utf8");
    const statements = content
      .split("--> statement-breakpoint")
      .map((s) => s.trim())
      .filter(Boolean);

    console.log(`[migrate] applying ${file} (${statements.length} statements)...`);
    for (const statement of statements) {
      await sql(statement);
    }

    await sql`INSERT INTO "__migrations" ("name") VALUES (${file})`;
    appliedCount += 1;
    console.log(`[migrate] applied ${file}`);
  }

  if (appliedCount === 0) {
    console.log("[migrate] nothing to apply — ডেটাবেজ আপ-টু-ডেট।");
  } else {
    console.log(`[migrate] done — ${appliedCount}টি মাইগ্রেশন প্রয়োগ হয়েছে।`);
  }
}

main().catch((error) => {
  console.error("[migrate] failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
