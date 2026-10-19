/**
 * মিউটেশন গার্ড টেস্ট — অ্যাডমিনের "সেভ/আপডেট/ডিলিট" কলগুলো
 * (PATCH / PUT / DELETE) যেন 405-এ ব্লক না হয়, আবার GET বা
 * অন্য সাইট থেকে আসা রিকোয়েস্ট যেন ঢুকতে না পারে।
 */

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { guardMutation } from "../../lib/api/helpers";

const HOST = "unanisifa.example.com";

function request(method: string, headers: Record<string, string> = {}): Request {
  return new Request(`https://${HOST}/api/admin/settings`, {
    method,
    headers: { host: HOST, ...headers },
  });
}

async function statusOf(response: Response): Promise<number> {
  return response.status;
}

test("guardMutation allows the state-changing methods admins save with", () => {
  for (const method of ["POST", "PATCH", "PUT", "DELETE"]) {
    const result = guardMutation(request(method, { origin: `https://${HOST}` }));
    assert.equal(result, null, `${method} should be allowed`);
  }
});

test("guardMutation stays open for lowercase / mixed-case methods", () => {
  const result = guardMutation(request("patch", { origin: `https://${HOST}` }));
  assert.equal(result, null);
});

test("guardMutation rejects read methods with 405", async () => {
  for (const method of ["GET", "HEAD", "OPTIONS"]) {
    const result = guardMutation(request(method, { origin: `https://${HOST}` }));
    assert.ok(result, `${method} should be blocked`);
    assert.equal(await statusOf(result), 405);
  }
});

test("guardMutation rejects cross-origin mutations with 403", async () => {
  const result = guardMutation(request("PATCH", { origin: "https://evil.example" }));
  assert.ok(result);
  assert.equal(await statusOf(result), 403);
});

test("guardMutation rejects mutations with no origin or referer", async () => {
  const result = guardMutation(request("PATCH"));
  assert.ok(result);
  assert.equal(await statusOf(result), 403);
});

test("guardMutation accepts a matching referer when origin is absent", () => {
  const result = guardMutation(request("PATCH", { referer: `https://${HOST}/admin/settings` }));
  assert.equal(result, null);
});

/**
 * রিগ্রেশন গার্ড — যেসব রুট guardMutation কল করে, তাদের হ্যান্ডলার
 * অবশ্যই এমন কোনো মেথড এক্সপোর্ট করবে যা গার্ড অনুমতি দেয়।
 * (একবার গার্ড POST-only ছিল, তখন সব PATCH সেভ 405 খেয়ে মরে গিয়েছিল।)
 */
test("every route that calls guardMutation handles an allowed method", () => {
  const allowed = new Set(["POST", "PATCH", "PUT", "DELETE"]);
  const apiRoot = path.resolve(import.meta.dirname, "..", "..", "app", "api");
  const offenders: string[] = [];

  const walk = (dir: string): string[] =>
    readdirSync(dir).flatMap((entry) => {
      const full = path.join(dir, entry);
      if (statSync(full).isDirectory()) return walk(full);
      return full.endsWith("route.ts") ? [full] : [];
    });

  for (const file of walk(apiRoot)) {
    const source = readFileSync(file, "utf8");
    if (!source.includes("guardMutation")) continue;
    const methods = [...source.matchAll(/export\s+async\s+function\s+([A-Z]+)\b/g)].map((m) => m[1]);
    const guarded = methods.filter((method) => allowed.has(method));
    if (guarded.length === 0) {
      offenders.push(path.relative(path.resolve(import.meta.dirname, "..", ".."), file));
    }
  }

  assert.deepEqual(offenders, []);
});
