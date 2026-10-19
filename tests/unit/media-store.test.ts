/**
 * মিডিয়া আপলোড — ভ্যালিডেশন, key বিল্ডিং ও R2-ছাড়া (ডেটাবেজ) ফলব্যাক।
 * R2 কনফিগার না থাকলেও সরাসরি আপলোড চলতে হবে, তাই এই আচরণ পিন করা।
 */

import test from "node:test";
import assert from "node:assert/strict";
import {
  MEDIA_FOLDERS,
  buildObjectKey,
  validateMediaInput,
} from "../../lib/integrations/r2";
import { getStorageBackend, saveUpload } from "../../lib/media/store";

function clearR2Env() {
  delete process.env.R2_ACCOUNT_ID;
  delete process.env.R2_ACCESS_KEY_ID;
  delete process.env.R2_SECRET_ACCESS_KEY;
  delete process.env.R2_BUCKET;
  delete process.env.R2_PUBLIC_BASE_URL;
}

test("media folders cover every admin upload surface", () => {
  for (const folder of ["products", "banners", "categories", "brand", "popups", "media"]) {
    assert.ok((MEDIA_FOLDERS as readonly string[]).includes(folder), `missing folder: ${folder}`);
  }
});

test("validateMediaInput accepts image types and returns the extension", () => {
  assert.equal(validateMediaInput("image/jpeg", 2048), "jpg");
  assert.equal(validateMediaInput("image/png", 2048), "png");
  assert.equal(validateMediaInput("image/webp", 2048), "webp");
  assert.equal(validateMediaInput("image/avif", 2048), "avif");
  assert.equal(validateMediaInput("image/svg+xml", 2048), "svg");
});

test("validateMediaInput rejects bad types and out-of-range sizes", () => {
  assert.throws(() => validateMediaInput("application/pdf", 2048), /Unsupported file type/);
  assert.throws(() => validateMediaInput("", 2048), /Unsupported file type/);
  assert.throws(() => validateMediaInput("image/png", 512), /too small/);
  assert.throws(() => validateMediaInput("image/png", 6 * 1024 * 1024), /too large/);
});

test("buildObjectKey sanitizes filenames and keeps the folder prefix", () => {
  const key = buildObjectKey("banners", "ঈদ Offer Banner 2026!.PNG", "jpg");
  assert.ok(key.startsWith("banners/"), key);
  assert.ok(key.endsWith(".jpg"), key);
  assert.match(key, /^banners\/[a-z0-9-]+\.jpg$/);
  const fallback = buildObjectKey("products", "!!!", "webp");
  assert.match(fallback, /^products\/file-[a-z0-9]+\.webp$/);
});

test("getStorageBackend reports db when R2 is not configured", async () => {
  clearR2Env();
  assert.equal(await getStorageBackend(), "db");
});

test("saveUpload stores bytes for the database when R2 is not configured", async () => {
  clearR2Env();
  const body = Buffer.alloc(2048, 7);
  const result = await saveUpload("products", "test-image.png", body, "image/png");
  assert.equal(result.storage, "db");
  assert.equal(result.mimeType, "image/png");
  assert.equal(result.sizeBytes, 2048);
  assert.ok(result.objectKey.startsWith("products/"), result.objectKey);
  assert.equal(result.url, `/api/media/${result.objectKey}`);
  assert.ok(result.dataBase64, "db storage must carry base64 bytes");
  assert.deepEqual(Buffer.from(result.dataBase64 as string, "base64"), body);
});

test("saveUpload validates before storing", async () => {
  clearR2Env();
  await assert.rejects(saveUpload("products", "tiny.png", Buffer.alloc(10), "image/png"), /too small/);
  await assert.rejects(saveUpload("products", "doc.pdf", Buffer.alloc(2048), "application/pdf"), /Unsupported/);
});
