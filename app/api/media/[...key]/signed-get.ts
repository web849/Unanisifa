import { createHmac, createHash } from "node:crypto";
import type { R2Config } from "@/lib/integrations/r2";

function hmac(key: Buffer | string, data: string): Buffer {
  return createHmac("sha256", key).update(data, "utf8").digest();
}

/** প্রাইভেট R2 অবজেক্টের জন্য SigV4 স্বাক্ষরিত GET → Response */
export async function signedGet(config: R2Config, objectKey: string): Promise<Response> {
  const host = `${config.accountId}.r2.cloudflarestorage.com`;
  const path = `/${config.bucket}/${objectKey}`;
  const payloadHash = createHash("sha256").update("").digest("hex");
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);
  const region = "auto";
  const service = "s3";

  const canonicalHeaders = `host:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`;
  const signedHeaders = "host;x-amz-content-sha256;x-amz-date";
  const canonicalRequest = ["GET", path, "", canonicalHeaders, signedHeaders, payloadHash].join("\n");
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = ["AWS4-HMAC-SHA256", amzDate, credentialScope, createHash("sha256").update(canonicalRequest).digest("hex")].join("\n");

  const kDate = hmac(`AWS4${config.secretAccessKey}`, dateStamp);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, service);
  const kSigning = hmac(kService, "aws4_request");
  const signature = createHmac("sha256", kSigning).update(stringToSign, "utf8").digest("hex");
  const authorization = `AWS4-HMAC-SHA256 Credential=${config.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const response = await fetch(`https://${host}${path}`, {
    headers: {
      host,
      "x-amz-date": amzDate,
      "x-amz-content-sha256": payloadHash,
      Authorization: authorization,
    },
  });

  if (!response.ok) {
    return new Response("Object not found", { status: 404 });
  }

  return new Response(response.body, {
    headers: {
      "Content-Type": response.headers.get("content-type") ?? "application/octet-stream",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
