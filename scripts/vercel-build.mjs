/**
 * Vercel বিল্ড এন্ট্রি — `vercel.json`-এর buildCommand।
 *
 *   Production  → db:migrate (লক + ট্রানজেকশনসহ) তারপর next build
 *   Preview     → ডিফল্টে মাইগ্রেশন স্কিপ; Preview-তে আলাদা Neon ব্রাঞ্চ
 *                 ব্যবহার করলে ALLOW_PREVIEW_DB_MIGRATIONS=1 দিলে চালু হবে
 *   Local/other → স্কিপ (শুধু next build)
 *
 * কারণ: প্রিভিউ ডিপ্লয় যেন কখনো প্রোডাকশন ডেটাবেজের স্কিমা বদলে না দেয়।
 * মাইগ্রেশন ব্যর্থ হলে বিল্ডও ব্যর্থ হয় — ভাঙা স্কিমার ওপর কোড ডিপ্লয় হয় না।
 */

import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

// কোনো ডিরেক্টরি থেকে চালালেও রিপো-রুট ধরে পাথ ঠিক থাকে।
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// ফাঁকা স্ট্রিংকেও "সেট নেই" ধরছি — Vercel-এ ভুল করে খালি env থাকলে
// প্রিভিউ/লোকাল ভেবে প্রোডাকশন মাইগ্রেশন বাদ পড়া চলবে না।
const vercelEnv = process.env.VERCEL_ENV?.trim() || undefined;
const onVercel = process.env.VERCEL === "1";

// VERCEL_ENV না থাকলে (কেবল Vercel-এ) প্রোডাকশন ধরে নিই — মাইগ্রেশন বাদ পড়া চলবে না।
const effectiveEnv = vercelEnv ?? (onVercel ? "production" : "local");
const allowPreviewMigrations = process.env.ALLOW_PREVIEW_DB_MIGRATIONS === "1";
const shouldMigrate =
  effectiveEnv === "production" || (effectiveEnv === "preview" && allowPreviewMigrations);

// টেস্ট/ডায়াগনস্টিকসের জন্য — কী সিদ্ধান্ত নেওয়া হবে শুধু JSON-এ দেখায়,
// মাইগ্রেশন বা বিল্ড কিছুই চালায় না।
if (process.argv.includes("--plan-only")) {
  console.log(
    JSON.stringify({
      env: effectiveEnv,
      migrate: shouldMigrate,
      allowPreviewMigrations,
      assumedProduction: !vercelEnv && onVercel,
    }),
  );
  process.exit(0);
}

if (!vercelEnv && onVercel) {
  console.warn("[build] VERCEL_ENV পাওয়া যায়নি — প্রোডাকশন ধরে নিয়ে মাইগ্রেশন চালাচ্ছি।");
}

if (shouldMigrate) {
  console.log(`[build] VERCEL_ENV=${effectiveEnv} — ডেটাবেজ মাইগ্রেশন চলছে।`);
  const migrate = spawnSync(process.execPath, [path.join(ROOT, "scripts", "migrate.mjs")], {
    stdio: "inherit",
    env: process.env,
  });
  if (migrate.error) {
    console.error("[build] মাইগ্রেশন চালু করা যায়নি:", migrate.error.message);
    process.exit(1);
  }
  if (migrate.status !== 0) {
    console.error("[build] মাইগ্রেশন ব্যর্থ — বিল্ড বন্ধ করা হলো।");
    process.exit(migrate.status ?? 1);
  }
} else {
  console.log(
    `[build] VERCEL_ENV=${effectiveEnv} — মাইগ্রেশন স্কিপ। ` +
      "প্রোডাকশন ছাড়া অন্য ডিপ্লয় প্রোডাকশন স্কিমা বদলাবে না।",
  );
  if (effectiveEnv === "preview") {
    console.log(
      "[build] Preview ডেটাবেজে মাইগ্রেশন চালাতে Vercel-এর Preview env-এ ALLOW_PREVIEW_DB_MIGRATIONS=1 দিন।",
    );
  }
}

const nextBin = path.join(ROOT, "node_modules", "next", "dist", "bin", "next");
const build = spawnSync(process.execPath, [nextBin, "build"], {
  stdio: "inherit",
  env: process.env,
});

if (build.error) {
  console.error("[build] next build চালু করা যায়নি:", build.error.message);
  process.exit(1);
}

process.exit(build.status ?? 1);
