import { eq } from "drizzle-orm";
import { guardMutation, jsonError, jsonOk, requestContext } from "@/lib/api/helpers";
import { getAdminSession } from "@/lib/auth/session";
import { requireAdminWrite } from "@/lib/admin/guard";
import { requireDb } from "@/lib/db";
import { courierProviders } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

/**
 * POST — কানেকশন টেস্ট। অ্যাডাপ্টার "manual" হলে টেস্ট প্রযোজ্য নয়;
 * API অ্যাডাপ্টার হলে ক্রেডেনশিয়াল সেট আছে কিনা যাচাই করে সত্য ফলাফল লেখে।
 */
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const guard = guardMutation(request);
  if (guard) return guard;
  const reqContext = requestContext(request.headers);
  const session = await getAdminSession();
  const denied = await requireAdminWrite(session, reqContext.clientIpHash, "couriers");
  if (denied) return denied;

  const { id } = await context.params;
  const db = requireDb("কুরিয়ার");
  const rows = await db.select().from(courierProviders).where(eq(courierProviders.id, Number(id))).limit(1);
  const provider = rows[0];
  if (!provider) return jsonError(404, "Courier provider not found");

  const now = new Date();

  if (provider.adapter === "manual") {
    await db
      .update(courierProviders)
      .set({ lastConnectionStatus: "not_applicable", lastConnectionAt: now, lastError: null, updatedAt: now })
      .where(eq(courierProviders.id, provider.id));
    return jsonOk({
      status: "not_applicable",
      message: "Manual handover mode — no API connection to test. Orders are marked shipped from the order page.",
    });
  }

  if (!provider.credentialsEncrypted) {
    await db
      .update(courierProviders)
      .set({
        lastConnectionStatus: "failed",
        lastConnectionAt: now,
        lastError: "No credentials stored",
        updatedAt: now,
      })
      .where(eq(courierProviders.id, provider.id));
    return jsonOk({ status: "failed", message: "Pending — no credentials stored for this provider yet." });
  }

  /* API অ্যাডাপ্টার: ক্রেডেনশিয়াল ডিক্রিপ্টযোগ্য কিনা যাচাই (সত্য পরীক্ষা, ভুল সাফল্য নয়) */
  try {
    const { decryptSecret } = await import("@/lib/security");
    decryptSecret(JSON.parse(provider.credentialsEncrypted));
    await db
      .update(courierProviders)
      .set({
        lastConnectionStatus: "credentials_ok",
        lastConnectionAt: now,
        lastError: null,
        updatedAt: now,
      })
      .where(eq(courierProviders.id, provider.id));
    return jsonOk({
      status: "credentials_ok",
      message: "Stored credentials decrypt successfully. Live API dispatch requires the provider's endpoint adapter.",
    });
  } catch {
    await db
      .update(courierProviders)
      .set({
        lastConnectionStatus: "failed",
        lastConnectionAt: now,
        lastError: "Stored credentials cannot be decrypted (key changed?)",
        updatedAt: now,
      })
      .where(eq(courierProviders.id, provider.id));
    return jsonOk({ status: "failed", message: "Stored credentials cannot be decrypted — re-enter them." });
  }
}
