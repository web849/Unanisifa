import { AdminShell } from "@/components/admin/admin-shell";
import { IntegrationsManager } from "@/components/admin/integrations-manager";
import { getAdminSession } from "@/lib/auth/session";
import { isDatabaseConfigured, requireDb } from "@/lib/db";
import { credentialSecrets, trackingSettings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { VAULT_KEYS } from "@/app/api/admin/integrations/secrets/route";

export const dynamic = "force-dynamic";

export default async function AdminIntegrationsPage() {
  const session = await getAdminSession();
  if (!session) return null;

  const secretStatus: Record<string, boolean> = {};
  let tracking = { enabled: false, pixelId: null as string | null, purchaseTrigger: "confirmed", capiTokenSet: false, lastEventAt: null as Date | null };

  if (isDatabaseConfigured) {
    const db = requireDb("ইন্টিগ্রেশন");
    const rows = await db.select({ key: credentialSecrets.key }).from(credentialSecrets);
    const present = new Set(rows.map((row) => row.key));
    for (const key of VAULT_KEYS) secretStatus[key] = present.has(key);

    const trackingRows = await db.select().from(trackingSettings).where(eq(trackingSettings.platform, "meta")).limit(1);
    const row = trackingRows[0];
    if (row) {
      tracking = {
        enabled: row.enabled,
        pixelId: row.pixelId,
        purchaseTrigger: row.purchaseTrigger as "confirmed" | "delivered",
        capiTokenSet: Boolean(row.capiTokenEncrypted),
        lastEventAt: row.lastEventAt,
      };
    }
  }

  return (
    <AdminShell session={session} counts={{}} title="Integrations" subtitle="Secrets are stored AES-256-GCM encrypted and never returned to the browser">
      {!isDatabaseConfigured ? (
        <div className="pending-note">Pending — database not configured.</div>
      ) : (
        <IntegrationsManager secretStatus={secretStatus} vaultKeys={[...VAULT_KEYS]} tracking={tracking} />
      )}
    </AdminShell>
  );
}
