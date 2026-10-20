import { and, desc, eq, ilike, or } from "drizzle-orm";
import { jsonError, jsonOk } from "@/lib/api/helpers";
import { requireAdmin } from "@/lib/admin/guard";
import { isDatabaseConfigured, requireDb } from "@/lib/db";
import { media } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/storage — আপলোড করা মিডিয়ার তালিকা (dataBase64 ছাড়া)।
 *
 * ল্যান্ডিং বিল্ডারের HTML ব্লক ও অন্যান্য ফর্মের মিডিয়া-পিকার এই API
 * দিয়ে R2/ডেটাবেজে আপলোড করা ছবি দেখায় — সেখান থেকে ছবির লিংক কপি
 * বা সরাসরি HTML-এ <img> বসানো যায়।
 *
 * Query: ?folder=media&q=নাম&limit=60
 */
export async function GET(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  if (!isDatabaseConfigured) {
    return jsonError(503, "ডেটাবেজ কনফিগার করা নেই — DATABASE_URL সেট করুন।");
  }

  const { searchParams } = new URL(request.url);
  const folder = searchParams.get("folder")?.trim() || "";
  const q = searchParams.get("q")?.trim() || "";
  const limitRaw = Number(searchParams.get("limit") ?? 60);
  const limit = Math.min(Math.max(Number.isFinite(limitRaw) ? limitRaw : 60, 1), 200);

  const conditions = [];
  if (folder) conditions.push(eq(media.folder, folder));
  if (q) {
    const pattern = `%${q}%`;
    const match = or(ilike(media.objectKey, pattern), ilike(media.alt, pattern));
    if (match) conditions.push(match);
  }

  const db = requireDb("মিডিয়া");
  const rows = await db
    .select({
      id: media.id,
      url: media.url,
      objectKey: media.objectKey,
      mimeType: media.mimeType,
      sizeBytes: media.sizeBytes,
      width: media.width,
      height: media.height,
      folder: media.folder,
      alt: media.alt,
      storage: media.storage,
      createdAt: media.createdAt,
    })
    .from(media)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(media.createdAt))
    .limit(limit);

  return jsonOk({
    items: rows.map((row) => ({
      ...row,
      createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
    })),
  });
}
