/**
 * ইমোজি-মুক্তি স্ক্যান — সাইট, কপি, ইনভয়েস, অ্যাডমিন, OGP: কোথাও ইমোজি নয়।
 * কোড কমেন্ট স্ক্যানের বাইরে (কমেন্ট কপি নয়), কিন্তু সব স্ট্রিং/JSX টেক্সট ধরা পড়ে।
 */

import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { containsEmoji } from "../../lib/utils";

const ROOT = path.resolve(import.meta.dirname, "..", "..");
const SCAN_DIRS = ["app", "components", "lib", "public/brand", "scripts"];
const SCAN_EXTENSIONS = new Set([".ts", ".tsx", ".css", ".svg", ".mjs"]);

function walk(directory: string, files: string[] = []): string[] {
  for (const entry of readdirSync(directory)) {
    const full = path.join(directory, entry);
    if (entry === "node_modules" || entry.startsWith(".")) continue;
    if (statSync(full).isDirectory()) {
      walk(full, files);
    } else if (SCAN_EXTENSIONS.has(path.extname(full))) {
      files.push(full);
    }
  }
  return files;
}

function isCommentLine(line: string): boolean {
  const trimmed = line.trim();
  return (
    trimmed.startsWith("//") ||
    trimmed.startsWith("*") ||
    trimmed.startsWith("/*") ||
    trimmed.startsWith("{/*")
  );
}

test("no emoji anywhere in customer or admin copy (code comments excluded)", () => {
  const violations: string[] = [];

  for (const directory of SCAN_DIRS) {
    const absolute = path.join(ROOT, directory);
    let entries: string[] = [];
    try {
      entries = walk(absolute);
    } catch {
      continue; // ডিরেক্টরি না থাকলে স্কিপ
    }
    for (const file of entries) {
      const content = readFileSync(file, "utf8");
      const lines = content.split("\n");
      lines.forEach((line, index) => {
        if (isCommentLine(line)) return;
        if (containsEmoji(line)) {
          violations.push(`${path.relative(ROOT, file)}:${index + 1}: ${line.trim().slice(0, 120)}`);
        }
      });
    }
  }

  assert.deepEqual(violations, [], `Emoji found in copy:\n${violations.join("\n")}`);
});
