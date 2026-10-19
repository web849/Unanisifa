import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { guardMutation, jsonError, jsonOk, readJson, requestContext } from "@/lib/api/helpers";
import { checkRateLimit } from "@/lib/auth/rate-limit";
import { createAdminSession } from "@/lib/auth/session";
import { isDatabaseConfigured, requireDb } from "@/lib/db";
import { adminUsers } from "@/lib/db/schema";
import { hashIp } from "@/lib/security";
import { audit } from "@/lib/auth/audit";

export const dynamic = "force-dynamic";

const schema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1).max(200),
});

/** অ্যাডমিন লগইন — bcrypt + রেট লিমিট + IP লগ (audit_logs) */
export async function POST(request: Request) {
  const guard = guardMutation(request);
  if (guard) return guard;
  const context = requestContext(request.headers);

  const rate = await checkRateLimit("login", context.clientIpHash);
  if (!rate.allowed) {
    return jsonError(429, `অনেকবার চেষ্টা হয়েছে। ${rate.retryAfterSeconds} সেকেন্ড পরে চেষ্টা করুন।`);
  }

  const parsed = schema.safeParse(await readJson<unknown>(request));
  if (!parsed.success) return jsonError(400, "ইমেইল ও পাসওয়ার্ড দিন।");

  if (!isDatabaseConfigured) {
    return jsonError(
      503,
      "ডেটাবেজ কনফিগার করা নেই — অ্যাডমিন লগইন সম্ভব নয়। DATABASE_URL সেট করে npm run db:migrate ও npm run db:seed চালান।",
    );
  }

  const db = requireDb("অ্যাডমিন লগইন");
  const rows = await db
    .select()
    .from(adminUsers)
    .where(eq(adminUsers.email, parsed.data.email.toLowerCase()))
    .limit(1);
  const user = rows[0];

  const ok = user && user.isActive && (await bcrypt.compare(parsed.data.password, user.passwordHash));

  if (!ok) {
    await audit({
      actorType: "system",
      actorId: null,
      actorName: parsed.data.email,
      action: "admin.login.failed",
      entityType: "admin_users",
      entityId: user?.id ?? null,
      ipHash: context.clientIpHash,
      meta: {},
    }).catch(() => undefined);
    return jsonError(401, "ইমেইল বা পাসওয়ার্ড সঠিক নয়।");
  }

  await db
    .update(adminUsers)
    .set({ lastLoginAt: new Date(), lastLoginIpHash: hashIp(context.clientIp) })
    .where(eq(adminUsers.id, user.id));

  await createAdminSession(user);

  await audit({
    actorType: "admin",
    actorId: user.id,
    actorName: user.name,
    action: "admin.login",
    entityType: "admin_users",
    entityId: user.id,
    ipHash: context.clientIpHash,
    meta: { role: user.role },
  }).catch(() => undefined);

  return jsonOk({ name: user.name, role: user.role });
}
