/**
 * মিডিয়া আপলোড — ভ্যালিডেশন, key বিল্ডিং ও R2-ছাড়া (ডেটাবেজ) ফলব্যাক।
 * R2 কনফিগার না থাকলেও সরাসরি আপলোড চলতে হবে, তাই এই আচরণ পিন করা।
 */

import test from "node:test";
import assert from "node:assert/strict";
import {
  MEDIA_FOLDERS,
  buildObjectKey,
  testR2Connection,
  validateMediaInput,
  type R2Config,
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

const TEST_CONFIG: R2Config = {
  accountId: "testaccountid",
  accessKeyId: "testaccesskey",
  secretAccessKey: "testsecretkey",
  bucket: "test-bucket",
};

type SeenRequest = { url: string; method: string; headers: Record<string, string> };

function stubFetch(handler: (seen: SeenRequest) => { ok: boolean; status: number; body?: string }) {
  const realFetch = globalThis.fetch;
  const seen: SeenRequest[] = [];
  globalThis.fetch = (async (url: unknown, init?: { method?: string; headers?: unknown }) => {
    const headers: Record<string, string> = {};
    for (const [key, value] of Object.entries((init?.headers ?? {}) as Record<string, unknown>)) {
      headers[String(key).toLowerCase()] = String(value);
    }
    const request: SeenRequest = { url: String(url), method: init?.method ?? "GET", headers };
    seen.push(request);
    const result = handler(request);
    return {
      ok: result.ok,
      status: result.status,
      text: async () => result.body ?? "",
    } as unknown as Response;
  }) as typeof fetch;
  return {
    seen,
    restore: () => {
      globalThis.fetch = realFetch;
    },
  };
}

test("testR2Connection PUTs then DELETEs a temp object with SigV4 auth", async () => {
  const stub = stubFetch(() => ({ ok: true, status: 200 }));
  try {
    const result = await testR2Connection(TEST_CONFIG);
    assert.match(result.objectKey, /^media\/__r2-test-[a-z0-9-]+\.png$/);
    assert.equal(stub.seen.length, 2);
    const [put, del] = stub.seen;
    assert.equal(put.method, "PUT");
    assert.ok(put.url.startsWith("https://testaccountid.r2.cloudflarestorage.com/test-bucket/media/__r2-test-"), put.url);
    assert.match(put.headers["authorization"] ?? "", /^AWS4-HMAC-SHA256 Credential=testaccesskey\//);
    assert.ok((put.headers["authorization"] ?? "").includes("SignedHeaders="));
    assert.equal(put.headers["content-type"], "image/png");
    assert.equal(del.method, "DELETE");
    assert.equal(del.url, put.url);
    assert.match(del.headers["authorization"] ?? "", /^AWS4-HMAC-SHA256 /);
  } finally {
    stub.restore();
  }
});

test("testR2Connection surfaces R2 errors instead of fake success", async () => {
  const stub = stubFetch(() => ({ ok: false, status: 403, body: "<Error><Code>AccessDenied</Code></Error>" }));
  try {
    await assert.rejects(testR2Connection(TEST_CONFIG), /R2 test upload failed \(403\)/);
    assert.equal(stub.seen.length, 1, "must not attempt DELETE when PUT failed");
  } finally {
    stub.restore();
  }
});

test("testR2Connection reports cleanup failures with the leftover key", async () => {
  const stub = stubFetch((seen) =>
    seen.method === "PUT" ? { ok: true, status: 200 } : { ok: false, status: 403 },
  );
  try {
    await assert.rejects(testR2Connection(TEST_CONFIG), /cleanup DELETE failed \(403\).*__r2-test-/);
  } finally {
    stub.restore();
  }
});
