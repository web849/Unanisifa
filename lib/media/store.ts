/**
 * মিডিয়া স্টোরেজ — হাইব্রিড ব্যাকএন্ড।
 *
 * - R2 কনফিগার থাকলে → Cloudflare R2-তে আপলোড (আগের মতোই)।
 * - R2 না থাকলে → ফাইলের বাইট ডেটাবেজে (media.data_base64) সেভ হয়,
 *   /api/media/<objectKey> থেকে সার্ভ হয়।
 *
 * ফলে R2 সেটআপ ছাড়াই অ্যাডমিন প্যানেলের সব জায়গায় (পণ্য, ব্যানার,
 * ক্যাটাগরি, পপআপ, লোগো) সরাসরি ছবি আপলোড চলে — Vercel-এও পারসিস্ট করে,
 * কারণ Neon Postgres-এ থাকে।
 */

import {
  buildObjectKey,
  getR2Config,
  putObject,
  resolveMediaMimeType,
  sanitizeSvgBuffer,
  validateMediaInput,
  type MediaFolder,
} from "../integrations/r2";

export type MediaStorageBackend = "r2" | "db";

export type StoredUpload = {
  url: string;
  objectKey: string;
  sizeBytes: number;
  mimeType: string;
  storage: MediaStorageBackend;
  /** storage="db" হলে base64 বাইট (media টেবিলে সেভ করতে হবে); R2-তে null */
  dataBase64: string | null;
};

export async function saveUpload(
  folder: MediaFolder,
  filename: string,
  body: Buffer,
  mimeType: string,
): Promise<StoredUpload> {
  const normalizedMime = resolveMediaMimeType(mimeType, filename);
  const safeBody = normalizedMime === "image/svg+xml" ? sanitizeSvgBuffer(body) : body;

  const config = await getR2Config();
  if (config) {
    const result = await putObject(config, folder, filename, safeBody, normalizedMime);
    return { ...result, storage: "r2", dataBase64: null };
  }

  // R2 নেই — ডেটাবেজ-ব্যাকড স্টোরেজ (একই ভ্যালিডেশন + একই key ফরম্যাট)
  const extension = validateMediaInput(normalizedMime, safeBody.length);
  const objectKey = buildObjectKey(folder, filename, extension);
  return {
    url: `/api/media/${objectKey}`,
    objectKey,
    sizeBytes: safeBody.length,
    mimeType: normalizedMime,
    storage: "db",
    dataBase64: safeBody.toString("base64"),
  };
}

/** বর্তমানে কোন ব্যাকএন্ডে আপলোড যাবে (UI নোটিশের জন্য) */
export async function getStorageBackend(): Promise<MediaStorageBackend> {
  const config = await getR2Config();
  return config ? "r2" : "db";
}
