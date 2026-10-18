import { AdminShell } from "@/components/admin/admin-shell";
import { StorageUploader } from "@/components/admin/storage-uploader";
import { getAdminSession } from "@/lib/auth/session";
import { getR2Config, MEDIA_FOLDERS } from "@/lib/integrations/r2";
import { isDatabaseConfigured, requireDb } from "@/lib/db";
import { media } from "@/lib/db/schema";
import { sql } from "drizzle-orm";
import { formatDateEn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminStoragePage() {
  const session = await getAdminSession();
  if (!session) return null;

  const r2 = getR2Config();

  let rows: Array<{ id: string; url: string; objectKey: string; mimeType: string; sizeBytes: number; folder: string; alt: string | null; createdAt: Date }> = [];
  if (isDatabaseConfigured) {
    const db = requireDb("মিডিয়া");
    rows = await db
      .select({
        id: media.id,
        url: media.url,
        objectKey: media.objectKey,
        mimeType: media.mimeType,
        sizeBytes: media.sizeBytes,
        folder: media.folder,
        alt: media.alt,
        createdAt: media.createdAt,
      })
      .from(media)
      .orderBy(sql`${media.createdAt} DESC`)
      .limit(200);
  }

  return (
    <AdminShell session={session} counts={{}} title="Storage (R2)" subtitle={`Uploads 1 KB – 5 MB · folders: ${MEDIA_FOLDERS.join(", ")}`}>
      {r2 ? (
        <StorageUploader folders={[...MEDIA_FOLDERS]} />
      ) : (
        <div className="pending-note mb-4">
          <span>
            Pending — R2 uploads are disabled because environment variables are missing. Set{" "}
            <span className="mono">R2_ACCOUNT_ID</span>, <span className="mono">R2_ACCESS_KEY_ID</span>,{" "}
            <span className="mono">R2_SECRET_ACCESS_KEY</span>, <span className="mono">R2_BUCKET</span> (optionally{" "}
            <span className="mono">R2_PUBLIC_BASE_URL</span>) to enable. Until then, product images can use local files under{" "}
            <span className="mono">/public</span> (e.g. <span className="mono">/products/p-01.svg</span>).
          </span>
        </div>
      )}

      <div className="panel">
        <div className="panel-head">
          <h2 className="panel-title">Uploaded media ({rows.length})</h2>
        </div>
        <div className="table-wrap" style={{ border: 0, borderRadius: 0 }}>
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: 72 }}>Preview</th>
                <th>Object key</th>
                <th>Folder</th>
                <th style={{ textAlign: "right" }}>Size</th>
                <th>URL</th>
                <th>Uploaded</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>
                    {row.mimeType.startsWith("image/") ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={row.url} alt={row.alt ?? ""} width={56} height={56} className="table-thumb" />
                    ) : (
                      <span className="table-thumb table-thumb-empty" aria-hidden="true" />
                    )}
                  </td>
                  <td className="mono text-small">{row.objectKey}</td>
                  <td className="text-small">{row.folder}</td>
                  <td className="table-num text-small">{Math.round(row.sizeBytes / 1024)} KB</td>
                  <td className="text-small">
                    <a href={row.url} target="_blank" rel="noreferrer" className="mono">
                      open
                    </a>
                  </td>
                  <td className="text-small text-muted">{formatDateEn(row.createdAt)}</td>
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-muted">
                    No uploads yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </AdminShell>
  );
}
