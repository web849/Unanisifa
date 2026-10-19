/**
 * অডিট লগ — গুরুত্বপূর্ণ সব অ্যাকশন (actor, action, entity, IP, meta)।
 * ব্যর্থ হলে প্রধান অপারেশন থামবে না (catch করা হয়)।
 */

import { isDatabaseConfigured, requireDb } from "../db";
import { auditLogs } from "../db/schema";

export type AuditInput = {
  actorType: "admin" | "system" | "customer";
  actorId: string | null;
  actorName?: string | null;
  action: string;
  entityType?: string | null;
  entityId?: string | null;
  ipHash: string | null;
  meta?: Record<string, unknown>;
};

export async function audit(input: AuditInput): Promise<void> {
  if (!isDatabaseConfigured) return;
  const db = requireDb("অডিট");
  await db.insert(auditLogs).values({
    actorType: input.actorType,
    actorId: input.actorId,
    actorName: input.actorName ?? null,
    action: input.action,
    entityType: input.entityType ?? null,
    entityId: input.entityId ?? null,
    ipHash: input.ipHash,
    meta: input.meta ?? {},
  });
}
