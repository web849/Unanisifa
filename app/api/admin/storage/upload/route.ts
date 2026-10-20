import { guardMutation, jsonError, jsonOk, requestContext } from "@/lib/api/helpers";
import { getAdminSession } from "@/lib/auth/session";
import { requireAdminWrite } from "@/lib/admin/guard";
import { MEDIA_FOLDERS, MEDIA_MAX_BYTES, MEDIA_MIN_BYTES, type MediaFolder } from "@/lib/integrations/r2";
import { saveUpload } from "@/lib/media/store";
import { isDatabaseConfigured, requireDb } from "@/lib/db";
import { media } from "@/lib/db/schema";
import { audit } from "@/lib/auth/audit";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/storage/upload — multipart (file, folder, alt)
 *
 * R2 কনফিগার থাকলে R2-তে, না থাকলে ডেটাবেজে (media.data_base64) সেভ হয় —
 * দুই ক্ষেত্রেই সরাসরি আপলোড চলে, R2 বাধ্যতামূলক নয়।
 */
export async function POST(request: Request) {
  const guard = guardMutation(request);
  if (guard) return guard;
  const reqContext = requestContext(request.headers);
  const session = await getAdminSession();
  const denied = await requireAdminWrite(session, reqContext.clientIpHash, "storage");
  if (denied) return denied;

  if (!isDatabaseConfigured) {
    return jsonError(503, "ডেটাবেজ কনফিগার করা নেই — DATABASE_URL সেট করে আবার চেষ্টা করুন।");
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return jsonError(400, "Expected multipart/form-data");
  }

  const file = form.get("file");
  if (!(file instanceof File)) return jsonError(400, "Missing file");
  if (file.size < MEDIA_MIN_BYTES || file.size > MEDIA_MAX_BYTES) {
    return jsonError(400, "File must be between 64 bytes and 5 MB");
  }

  const folderRaw = String(form.get("folder") ?? "products");
  if (!MEDIA_FOLDERS.includes(folderRaw as MediaFolder)) {
    return jsonError(400, `Folder must be one of: ${MEDIA_FOLDERS.join(", ")}`);
  }
  const alt = String(form.get("alt") ?? "").trim().slice(0, 300) || null;

  const body = Buffer.from(await file.arrayBuffer());
  let result;
  try {
    result = await saveUpload(folderRaw as MediaFolder, file.name, body, file.type);
  } catch (error) {
    return jsonError(502, error instanceof Error ? error.message : "Upload failed");
  }

  let id: string | null = null;
  const db = requireDb("মিডিয়া");
  try {
    const rows = await db
      .insert(media)
      .values({
        objectKey: result.objectKey,
        url: result.url,
        mimeType: result.mimeType,
        sizeBytes: result.sizeBytes,
        folder: folderRaw,
        alt,
        storage: result.storage,
        dataBase64: result.dataBase64,
        uploadedBy: session?.userId ?? null,
      })
      .onConflictDoNothing()
      .returning({ id: media.id });
    id = rows[0]?.id ?? null;
  } catch (error) {
    // R2-তে ফাইল উঠে গেলেও রেকর্ড সেভ না হলে লিংকটি জানিয়ে দেওয়া হয়,
    // যাতে ব্যবহারকারী অন্তত লিংকটি ব্যবহার করতে পারেন।
    return jsonError(500, "ছবি আপলোড হয়েছে কিন্তু রেকর্ড সেভ করা যায়নি।", {
      url: result.url,
      objectKey: result.objectKey,
      storage: result.storage,
      detail: error instanceof Error ? error.message.slice(0, 200) : "database error",
    });
  }

  await audit({
    actorType: "admin",
    actorId: session?.userId ?? null,
    actorName: session?.name ?? null,
    action: "media.upload",
    entityType: "media",
    entityId: id,
    ipHash: reqContext.clientIpHash,
    meta: { objectKey: result.objectKey, storage: result.storage },
  }).catch(() => undefined);

  return jsonOk(
    {
      id,
      url: result.url,
      objectKey: result.objectKey,
      sizeBytes: result.sizeBytes,
      storage: result.storage,
      mimeType: result.mimeType,
      alt: alt ?? "",
    },
    201,
  );
}
