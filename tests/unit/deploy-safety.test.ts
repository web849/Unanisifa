/**
 * ডিপ্লয়-নিরাপত্তা টেস্ট — কোন পরিবেশে ডেটাবেজ মাইগ্রেশন চলবে তার সিদ্ধান্ত।
 * ভুল হলে প্রিভিউ ডিপ্লয় থেকে প্রোডাকশন স্কিমা বদলে যেতে পারে, তাই এটা পিন করা।
 */

import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..", "..");
const SCRIPT = path.join(ROOT, "scripts", "vercel-build.mjs");

type Plan = {
  env: string;
  migrate: boolean;
  allowPreviewMigrations: boolean;
  assumedProduction: boolean;
};

function plan(env: Record<string, string>): Plan {
  const result = spawnSync(process.execPath, [SCRIPT, "--plan-only"], {
    cwd: ROOT,
    env: {
      ...process.env,
      VERCEL: "",
      VERCEL_ENV: "",
      ALLOW_PREVIEW_DB_MIGRATIONS: "",
      ...env,
    },
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout) as Plan;
}

test("production build runs migrations", () => {
  const decision = plan({ VERCEL: "1", VERCEL_ENV: "production" });
  assert.equal(decision.env, "production");
  assert.equal(decision.migrate, true);
});

test("preview build never touches the production schema by default", () => {
  const decision = plan({ VERCEL: "1", VERCEL_ENV: "preview" });
  assert.equal(decision.env, "preview");
  assert.equal(decision.migrate, false);
});

test("preview migrations require an explicit opt-in", () => {
  const decision = plan({
    VERCEL: "1",
    VERCEL_ENV: "preview",
    ALLOW_PREVIEW_DB_MIGRATIONS: "1",
  });
  assert.equal(decision.migrate, true);
  assert.equal(decision.allowPreviewMigrations, true);
});

test("local builds skip migrations", () => {
  assert.equal(plan({}).migrate, false);
  assert.equal(plan({ VERCEL_ENV: "development" }).migrate, false);
});

test("a Vercel build without VERCEL_ENV is treated as production", () => {
  const decision = plan({ VERCEL: "1" });
  assert.equal(decision.env, "production");
  assert.equal(decision.migrate, true);
  assert.equal(decision.assumedProduction, true);
});

test("migrate fails loudly when no database URL is configured", () => {
  const result = spawnSync(process.execPath, [path.join(ROOT, "scripts", "migrate.mjs")], {
    cwd: ROOT,
    env: { ...process.env, DATABASE_URL: "", DIRECT_URL: "" },
    encoding: "utf8",
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /DATABASE_URL বা DIRECT_URL সেট করা নেই/);
});
