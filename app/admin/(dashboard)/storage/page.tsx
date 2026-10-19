import { AdminShell } from "@/components/admin/admin-shell";
import { StorageUploader } from "@/components/admin/storage-uploader";
import { R2SetupForm } from "@/components/admin/r2-setup-form";
import { R2TestButton } from "@/components/admin/r2-test-button";
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

  const r2 = await getR2Config();

  let rows: Array<{
    id: string;
    url: string;
    objectKey: string;
    mimeType: string;
    sizeBytes: number;
    folder: string;
    alt: string | null;
    storage: string;
    createdAt: Date;
  }> = [];
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
        storage: media.storage,
        createdAt: media.createdAt,
      })
      .from(media)
      .orderBy(sql`${media.createdAt} DESC`)
      .limit(200);
  }

  return (
    <AdminShell
      session={session}
      counts={{}}
      title="Storage"
      subtitle={`Uploads 1 KB – 5 MB · folders: ${MEDIA_FOLDERS.join(", ")}`}
    >
      {r2 ? (
        <div className="pending-note mb-4">
          <span>R2 connected — new uploads go to Cloudflare R2.</span> <R2TestButton />
        </div>
      ) : (
        <div className="pending-note mb-4">
          R2 not configured — uploads are stored securely in the database and served from this site. Product, banner,
          category, popup and logo uploads all work. Connect R2 below only if you outgrow database storage.
        </div>
      )}

      <StorageUploader folders={[...MEDIA_FOLDERS]} />

      {!r2 ? (
        <details className="panel mb-4">
          <summary className="panel-head" style={{ cursor: "pointer" }}>
            <span className="panel-title">Optional: connect Cloudflare R2</span>
          </summary>
          <div className="panel-body">
            <R2SetupForm />
          </div>
        </details>
      ) : null}

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
                <th>Backend</th>
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
                  <td className="text-small">{row.storage === "db" ? "Database" : "R2"}</td>
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
                  <td colSpan={7} className="text-muted">
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
