import { getR2Config, MEDIA_FOLDERS } from "@/lib/integrations/r2";
import { db, isDatabaseConfigured } from "@/lib/db";
import { media } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

/**
 * GET /api/media/products/x.jpg — মিডিয়া সার্ভার।
 *
 * ১. ডেটাবেজে সেভ করা ছবি (R2 ছাড়া আপলোড) হলে media.data_base64 থেকে সার্ভ করে।
 * ২. R2-তে থাকলে আগের মতো R2 প্রক্সি / স্বাক্ষরিত GET।
 *
 * GET সর্বজনীন; path ট্রাভার্সাল রোধে key শুধু অনুমোদিত ফোল্ডার প্রিফিক্স থেকে।
 */
export async function GET(_request: Request, context: { params: Promise<{ key: string[] }> }) {
  const { key } = await context.params;

  const objectKey = key.join("/");
  const folder = objectKey.split("/")[0];
  const allowedFolders: readonly string[] = MEDIA_FOLDERS;
  if (!allowedFolders.includes(folder) || objectKey.includes("..")) {
    return new Response("Invalid key", { status: 400 });
  }

  /* ডেটাবেজ-ব্যাকড ছবি (R2 ছাড়া আপলোড করা) */
  if (isDatabaseConfigured && db) {
    try {
      const rows = await db
        .select({ mimeType: media.mimeType, dataBase64: media.dataBase64, storage: media.storage })
        .from(media)
        .where(eq(media.objectKey, objectKey))
        .limit(1);
      const row = rows[0];
      if (row?.storage === "db" && row.dataBase64) {
        const bytes = Buffer.from(row.dataBase64, "base64");
        return new Response(new Uint8Array(bytes), {
          headers: {
            "Content-Type": row.mimeType || "application/octet-stream",
            "Cache-Control": "public, max-age=31536000, immutable",
            "Content-Length": String(bytes.length),
          },
        });
      }
    } catch {
      /* DB পড়তে ব্যর্থ হলে R2 ফলব্যাক চেষ্টা করি */
    }
  }

  const config = await getR2Config();
  if (!config) return new Response("Storage not configured", { status: 503 });

  const host = `${config.accountId}.r2.cloudflarestorage.com`;
  const response = await fetch(`https://${host}/${config.bucket}/${objectKey}`, {
    headers: { Authorization: "" }, // unsigned GET only works if bucket is public; otherwise use signed below
  }).catch(() => null);

  if (response && response.ok) {
    return new Response(response.body, {
      headers: {
        "Content-Type": response.headers.get("content-type") ?? "application/octet-stream",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  }

  /* প্রাইভেট বাকেট: SigV4 স্বাক্ষরিত GET */
  const { signedGet } = await import("./signed-get");
  return signedGet(config, objectKey);
}
