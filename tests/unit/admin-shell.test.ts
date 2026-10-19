/**
 * RSC সিরিয়ালাইজেশন গার্ড।
 *
 * AdminShell একটি Server Component; AdminShellClient একটি Client Component।
 * নেভিগেশন লিস্টে Lucide আইকন (ফাংশন) থাকে — সেগুলো প্রপ হিসেবে সার্ভার থেকে
 * ক্লায়েন্টে পাঠালে React থ্রো করে:
 *   "Functions cannot be passed directly to Client Components"
 * ফলে লগইনের পর প্রতিটি অ্যাডমিন পেজ ৫০০ দেয় (প্রোডাকশনে "Application
 * error: a server-side exception has occurred")। এই টেস্ট সেই ভুলটি আবার
 * ঢুকলে সাথে সাথে ধরে ফেলবে।
 */

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..", "..");

function read(relative: string): string {
  return readFileSync(path.join(ROOT, relative), "utf8");
}

test("admin shell never passes icon functions to the client component", () => {
  const shell = read("components/admin/admin-shell.tsx");

  assert.doesNotMatch(
    shell,
    /adminNavGroups/,
    "nav groups must be built inside the client component — icons are functions and cannot cross the server/client boundary",
  );

  const call = shell.match(/<AdminShellClient[\s\S]*?\/>/);
  assert.ok(call, "AdminShell must render <AdminShellClient … />");

  assert.match(call[0], /counts=\{counts\}/, "counts are plain numbers and are safe to pass");
  assert.match(call[0], /sessionName=\{session\.name\}/);
  assert.match(call[0], /sessionRole=\{session\.role\}/);
  assert.doesNotMatch(
    call[0],
    /groups=/,
    "the groups prop contains Lucide icon components and breaks RSC serialization",
  );
});

test("the client shell builds its own navigation from counts", () => {
  const client = read("components/admin/admin-shell-client.tsx");
  assert.match(client, /adminNavGroups\(counts\)/);
});
