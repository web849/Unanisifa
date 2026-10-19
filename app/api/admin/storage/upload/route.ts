import { guardMutation, jsonError, jsonOk, requestContext } from "@/lib/api/helpers";
import { getAdminSession } from "@/lib/auth/session";
import { requireAdminWrite } from "@/lib/admin/guard";
import { getR2Config, MEDIA_FOLDERS, MEDIA_MAX_BYTES, MEDIA_MIN_BYTES, putObject, type MediaFolder } from "@/lib/integrations/r2";
import { isDatabaseConfigured, requireDb } from "@/lib/db";
import { media } from "@/lib/db/schema";
import { audit } from "@/lib/auth/audit";

export const dynamic = "force-dynamic";

/** POST /api/admin/storage/upload — multipart (file, folder, alt) */
export async function POST(request: Request) {
  const guard = guardMutation(request);
  if (guard) return guard;
  const reqContext = requestContext(request.headers);
  const session = await getAdminSession();
  const denied = await requireAdminWrite(session, reqContext.clientIpHash, "storage");
  if (denied) return denied;

  const config = await getR2Config();
  if (!config) {
    return jsonError(
      503,
      "Pending — R2 storage is not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY and R2_BUCKET to enable uploads. Until then, use local files under /public (e.g. /products/p-01.svg).",
    );
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
    return jsonError(400, "File must be between 1 KB and 5 MB");
  }

  const folderRaw = String(form.get("folder") ?? "products");
  if (!MEDIA_FOLDERS.includes(folderRaw as MediaFolder)) {
    return jsonError(400, `Folder must be one of: ${MEDIA_FOLDERS.join(", ")}`);
  }
  const alt = String(form.get("alt") ?? "").trim().slice(0, 300) || null;

  const body = Buffer.from(await file.arrayBuffer());
  let result;
  try {
    result = await putObject(config, folderRaw as MediaFolder, file.name, body, file.type);
  } catch (error) {
    return jsonError(502, error instanceof Error ? error.message : "Upload failed");
  }

  let id: string | null = null;
  if (isDatabaseConfigured) {
    const db = requireDb("মিডিয়া");
    const rows = await db
      .insert(media)
      .values({
        objectKey: result.objectKey,
        url: result.url,
        mimeType: result.mimeType,
        sizeBytes: result.sizeBytes,
        folder: folderRaw,
        alt,
        uploadedBy: session?.userId ?? null,
      })
      .onConflictDoNothing()
      .returning({ id: media.id });
    id = rows[0]?.id ?? null;
  }

  await audit({
    actorType: "admin",
    actorId: session?.userId ?? null,
    actorName: session?.name ?? null,
    action: "media.upload",
    entityType: "media",
    entityId: id,
    ipHash: reqContext.clientIpHash,
    meta: { objectKey: result.objectKey },
  }).catch(() => undefined);

  return jsonOk({ id, url: result.url, objectKey: result.objectKey, sizeBytes: result.sizeBytes }, 201);
}
