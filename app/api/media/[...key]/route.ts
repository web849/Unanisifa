import { getR2Config } from "@/lib/integrations/r2";

export const dynamic = "force-dynamic";

/**
 * GET /api/media/products/x.jpg — R2 অবজেক্ট প্রক্সি (public base URL না থাকলে)।
 * GET সর্বজনীন; path ট্রাভার্সাল রোধে key শুধু অনুমোদিত ফোল্ডার প্রিফিক্স থেকে।
 */
export async function GET(_request: Request, context: { params: Promise<{ key: string[] }> }) {
  const { key } = await context.params;
  const config = await getR2Config();
  if (!config) return new Response("Storage not configured", { status: 503 });

  const objectKey = key.join("/");
  const folder = objectKey.split("/")[0];
  if (!["products", "banners", "brand", "popups", "media"].includes(folder) || objectKey.includes("..")) {
    return new Response("Invalid key", { status: 400 });
  }

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
