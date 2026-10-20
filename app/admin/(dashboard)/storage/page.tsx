import Link from "next/link";
import { AdminShell } from "@/components/admin/admin-shell";
import { StorageUploader } from "@/components/admin/storage-uploader";
import { MediaLibraryGrid, type MediaLibraryItem } from "@/components/admin/media-library";
import { R2SetupForm } from "@/components/admin/r2-setup-form";
import { R2TestButton } from "@/components/admin/r2-test-button";
import { getAdminSession } from "@/lib/auth/session";
import { getR2Config, MEDIA_FOLDERS } from "@/lib/integrations/r2";
import { isDatabaseConfigured, requireDb } from "@/lib/db";
import { media } from "@/lib/db/schema";
import { sql } from "drizzle-orm";

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

  const items: MediaLibraryItem[] = rows.map((row) => ({
    id: row.id,
    url: row.url,
    objectKey: row.objectKey,
    mimeType: row.mimeType,
    sizeBytes: row.sizeBytes,
    folder: row.folder,
    alt: row.alt,
    storage: row.storage,
    createdAt: row.createdAt.toISOString(),
  }));

  return (
    <AdminShell
      session={session}
      counts={{}}
      title="Storage (R2)"
      subtitle={`ছবি আপলোড · লিংক কপি · HTML কোড কপি — uploads up to 5 MB · folders: ${MEDIA_FOLDERS.join(", ")}`}
    >
      {r2 ? (
        <div className="pending-note mb-4">
          <span>
            R2 connected — new uploads go to Cloudflare R2 (bucket: <span className="mono">{r2.bucket}</span>).
            {r2.publicBaseUrl ? (
              <>
                {" "}
                ছবির লিংক হবে সরাসরি R2/CDN: <span className="mono">{r2.publicBaseUrl}</span>
              </>
            ) : (
              <>
                {" "}
                Public base URL সেট নেই, তাই লিংক এই সাইটের <span className="mono">/api/media/…</span> পথে
                সার্ভ হয় — HTML-এ ব্যবহারে সমস্যা নেই। সরাসরি R2/CDN লিংক চাইলে নিচের &quot;R2 settings&quot;-এ{" "}
                <span className="mono">r2_public_base_url</span> দিন (বাকেটের Custom Domain অথবা r2.dev URL)।
              </>
            )}
          </span>{" "}
          <R2TestButton />
        </div>
      ) : (
        <div className="pending-note mb-4">
          R2 not configured — uploads are stored securely in the database and served from this site. Product, banner,
          category, popup and logo uploads all work. Connect R2 below only if you outgrow database storage.
        </div>
      )}

      <div className="panel mb-4">
        <div className="panel-head">
          <h2 className="panel-title">ছবি দিয়ে HTML ল্যান্ডিং সাজান — ৩ ধাপে</h2>
        </div>
        <div className="panel-body">
          <ol className="storage-steps">
            <li>
              <strong>১. ছবি আপলোড করুন</strong> — নিচের আপলোডার থেকে (folder: media)। R2 কানেক্ট থাকলে ছবি
              R2-তে উঠবে, না থাকলে ডেটাবেজে — দুই ক্ষেত্রেই লিংক কাজ করবে।
            </li>
            <li>
              <strong>২. লিংক বা HTML কপি করুন</strong> — প্রতিটি ছবির কার্ডে &quot;লিংক কপি&quot; (শুধু URL)
              অথবা &quot;HTML কপি&quot; (পুরো &lt;img&gt; কোড) বোতাম আছে।
            </li>
            <li>
              <strong>৩. HTML-এ পেস্ট করুন</strong> —{" "}
              <Link href="/admin/landing-pages">Landing Pages</Link> খুলে Builder-এ গিয়ে <em>HTML Code</em> ব্লকে পেস্ট
              করে inline style দিয়ে নিজের মতো সাজান। বিল্ডারের HTML ব্লকের ভেতর থেকেও সরাসরি ছবি আপলোড করে
              বসানো যায় (&quot;ছবি যোগ করুন (R2/Media)&quot; বোতাম)।
            </li>
          </ol>
        </div>
      </div>

      <StorageUploader folders={[...MEDIA_FOLDERS]} />

      <details className="panel mb-4">
        <summary className="panel-head" style={{ cursor: "pointer" }}>
          <span className="panel-title">
            {r2 ? "R2 settings — কী / Public URL আপডেট" : "Optional: connect Cloudflare R2"}
          </span>
        </summary>
        <div className="panel-body">
          <R2SetupForm />
        </div>
      </details>

      <div className="panel">
        <div className="panel-head">
          <h2 className="panel-title">Uploaded media ({rows.length}) — লিংক কপি করে HTML-এ ব্যবহার করুন</h2>
        </div>
        <div className="panel-body">
          <MediaLibraryGrid items={items} emptyMessage="No uploads yet — প্রথম ছবিটি উপরের আপলোডার থেকে আপলোড করুন।" />
        </div>
      </div>
    </AdminShell>
  );
}
