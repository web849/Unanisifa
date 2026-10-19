/**
 * Cloudflare R2 (S3-compatible) ক্লায়েট — dependency-free AWS SigV4 (node:crypto)।
 * R2_* env না থাকলে আপলোড নিষ্ক্রিয়; UI সত্যিকারের "Pending" অবস্থা দেখায়।
 */

import { createHmac, createHash } from "node:crypto";
import { resolveSecret } from "./secrets";
import { isDatabaseConfigured } from "../db";

export type R2Config = {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  publicBaseUrl?: string;
};

export async function getR2Config(): Promise<R2Config | null> {
  // Fast path — env directly set (existing deploys)
  const envAccountId = process.env.R2_ACCOUNT_ID?.trim();
  const envAccessKeyId = process.env.R2_ACCESS_KEY_ID?.trim();
  const envSecretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim();
  const envBucket = process.env.R2_BUCKET?.trim();
  if (envAccountId && envAccessKeyId && envSecretAccessKey && envBucket) {
    return {
      accountId: envAccountId,
      accessKeyId: envAccessKeyId,
      secretAccessKey: envSecretAccessKey,
      bucket: envBucket,
      publicBaseUrl: process.env.R2_PUBLIC_BASE_URL?.trim() || undefined,
    };
  }

  // Vault / DB fallback — only if database is available
  if (!isDatabaseConfigured) return null;
  try {
    const [accountId, accessKeyId, secretAccessKey, bucket, publicBaseUrl] = await Promise.all([
      resolveSecret("r2_account_id", process.env.R2_ACCOUNT_ID),
      resolveSecret("r2_access_key_id", process.env.R2_ACCESS_KEY_ID),
      resolveSecret("r2_secret_access_key", process.env.R2_SECRET_ACCESS_KEY),
      resolveSecret("r2_bucket", process.env.R2_BUCKET),
      resolveSecret("r2_public_base_url", process.env.R2_PUBLIC_BASE_URL),
    ]);
    if (!accountId || !accessKeyId || !secretAccessKey || !bucket) return null;
    return {
      accountId,
      accessKeyId,
      secretAccessKey,
      bucket,
      publicBaseUrl: publicBaseUrl || undefined,
    };
  } catch {
    return null;
  }
}

export const MEDIA_FOLDERS = ["products", "banners", "categories", "brand", "popups", "media"] as const;
export type MediaFolder = (typeof MEDIA_FOLDERS)[number];

export const MEDIA_MAX_BYTES = 5 * 1024 * 1024;
export const MEDIA_MIN_BYTES = 1 * 1024;

const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
  "image/svg+xml": "svg",
};

/** আপলোড ভ্যালিডেশন — R2 ও ডেটাবেজ-স্টোরেজ দুটোতেই একই নিয়ম */
export function validateMediaInput(mimeType: string, sizeBytes: number): string {
  const extension = ALLOWED_TYPES[mimeType];
  if (!extension) throw new Error(`Unsupported file type: ${mimeType || "(unknown)"}. Use jpg, png, webp, avif or svg.`);
  if (sizeBytes < MEDIA_MIN_BYTES) throw new Error("File too small (minimum 1 KB)");
  if (sizeBytes > MEDIA_MAX_BYTES) throw new Error("File too large (maximum 5 MB)");
  return extension;
}

/** ফোল্ডার + নিরাপদ ফাইলনাম থেকে ইউনিক object key */
export function buildObjectKey(folder: MediaFolder, filename: string, extension: string): string {
  const safeBase =
    filename
      .toLowerCase()
      .replace(/\.[^.]+$/, "")
      .replace(/[^a-z0-9-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40) || "file";
  return `${folder}/${safeBase}-${Date.now().toString(36)}.${extension}`;
}

function hmac(key: Buffer | string, data: string): Buffer {
  return createHmac("sha256", key).update(data, "utf8").digest();
}

function sha256Hex(data: Buffer | string): string {
  return createHash("sha256").update(data).digest("hex");
}

/** SigV4 স্বাক্ষর — R2-এর S3 API-এর জন্য */
function signRequest(config: R2Config, method: string, path: string, headers: Record<string, string>, payloadHash: string) {
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);
  const host = `${config.accountId}.r2.cloudflarestorage.com`;
  const region = "auto";
  const service = "s3";

  const signedHeaderEntries = Object.entries({ ...headers, host, "x-amz-content-sha256": payloadHash, "x-amz-date": amzDate })
    .map(([key, value]) => [key.toLowerCase(), value.trim()] as const)
    .sort((a, b) => (a[0] < b[0] ? -1 : 1));
  const signedHeaders = signedHeaderEntries.map(([key]) => key).join(";");
  const canonicalHeaders = signedHeaderEntries.map(([key, value]) => `${key}:${value}\n`).join("");

  const canonicalRequest = [method, path, "", canonicalHeaders, signedHeaders, payloadHash].join("\n");
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = ["AWS4-HMAC-SHA256", amzDate, credentialScope, sha256Hex(canonicalRequest)].join("\n");

  const kDate = hmac(`AWS4${config.secretAccessKey}`, dateStamp);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, service);
  const kSigning = hmac(kService, "aws4_request");
  const signature = createHmac("sha256", kSigning).update(stringToSign, "utf8").digest("hex");

  const authorization = `AWS4-HMAC-SHA256 Credential=${config.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  return {
    url: `https://${host}${path}`,
    headers: { ...headers, host, "x-amz-date": amzDate, "x-amz-content-sha256": payloadHash, Authorization: authorization },
  };
}

export type PutObjectResult = { url: string; objectKey: string; sizeBytes: number; mimeType: string };

/** ফাইল যাচাই + R2-তে PUT; ব্যর্থ হলে সত্যিকারের এরর থ্রো করে */
export async function putObject(
  config: R2Config,
  folder: MediaFolder,
  filename: string,
  body: Buffer,
  mimeType: string,
): Promise<PutObjectResult> {
  const extension = validateMediaInput(mimeType, body.length);
  const objectKey = buildObjectKey(folder, filename, extension);
  const path = `/${config.bucket}/${objectKey}`;
  const payloadHash = sha256Hex(body);

  const signed = signRequest(config, "PUT", path, { "content-type": mimeType }, payloadHash);
  const response = await fetch(signed.url, { method: "PUT", headers: signed.headers, body: new Uint8Array(body) });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`R2 upload failed (${response.status}): ${text.slice(0, 200)}`);
  }

  const url = config.publicBaseUrl
    ? `${config.publicBaseUrl.replace(/\/$/, "")}/${objectKey}`
    : `/api/media/${objectKey}`;

  return { url, objectKey, sizeBytes: body.length, mimeType };
}
