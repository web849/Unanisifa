/**
 * ক্রেডেনশিয়াল ভল্ট অ্যাক্সেস — AES-256-GCM (lib/security)।
 * API কখনো প্লেইন মান ফেরত দেয় না; শুধু "সেট করা আছে / নেই"।
 */

import { eq } from "drizzle-orm";
import { requireDb } from "../db";
import { credentialSecrets } from "../db/schema";
import { decryptSecret, encryptSecret } from "../security";

export async function setSecret(key: string, value: string): Promise<void> {
  const db = requireDb("সিক্রেট সেভ");
  const encrypted = encryptSecret(value);
  await db
    .insert(credentialSecrets)
    .values({ key, ...encrypted })
    .onConflictDoUpdate({
      target: credentialSecrets.key,
      set: { ...encrypted, updatedAt: new Date() },
    });
}

export async function getSecret(key: string): Promise<string | null> {
  const db = requireDb("সিক্রেট পড়া");
  const rows = await db.select().from(credentialSecrets).where(eq(credentialSecrets.key, key)).limit(1);
  const row = rows[0];
  if (!row) return null;
  try {
    return decryptSecret({
      algorithm: row.algorithm,
      ciphertext: row.ciphertext,
      iv: row.iv,
      authTag: row.authTag,
    });
  } catch {
    return null;
  }
}

export async function hasSecret(key: string): Promise<boolean> {
  const db = requireDb("সিক্রেট চেক");
  const rows = await db
    .select({ key: credentialSecrets.key })
    .from(credentialSecrets)
    .where(eq(credentialSecrets.key, key))
    .limit(1);
  return rows.length > 0;
}

export async function deleteSecret(key: string): Promise<void> {
  const db = requireDb("সিক্রেট মুছা");
  await db.delete(credentialSecrets).where(eq(credentialSecrets.key, key));
}

/** env ফলব্যাকসহ সিক্রেট — প্রথমে ভল্ট, না থাকলে env */
export async function resolveSecret(key: string, envValue?: string): Promise<string | null> {
  const fromVault = await getSecret(key).catch(() => null);
  if (fromVault) return fromVault;
  return envValue && envValue.trim() ? envValue.trim() : null;
}
