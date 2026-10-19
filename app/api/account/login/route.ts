import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { guardMutation, jsonError, jsonOk, readJson, requestContext } from "@/lib/api/helpers";
import { checkRateLimit } from "@/lib/auth/rate-limit";
import { createCustomerSession } from "@/lib/auth/customer-session";
import { isDatabaseConfigured, requireDb } from "@/lib/db";
import { customerAccounts } from "@/lib/db/schema";
import { bdPhoneSchema } from "@/lib/orders/validation";

export const dynamic = "force-dynamic";

const schema = z.object({
  phone: bdPhoneSchema,
  password: z.string().min(1, "পাসওয়ার্ড দিন").max(128),
});

export async function POST(request: Request) {
  const guard = guardMutation(request);
  if (guard) return guard;
  const context = requestContext(request.headers);

  const rate = await checkRateLimit("login", context.clientIpHash);
  if (!rate.allowed) {
    return jsonError(429, `অনেকবার চেষ্টা হয়েছে। ${rate.retryAfterSeconds} সেকেন্ড পরে চেষ্টা করুন।`);
  }

  const parsed = schema.safeParse(await readJson<unknown>(request));
  if (!parsed.success) return jsonError(400, parsed.error.issues[0]?.message ?? "তথ্য সঠিক নয়।");

  if (!isDatabaseConfigured) {
    return jsonError(503, "ডেটাবেজ কনফিগার করা নেই — লগইন করা যাচ্ছে না।");
  }

  const db = requireDb("লগইন");
  const rows = await db
    .select()
    .from(customerAccounts)
    .where(eq(customerAccounts.phone, parsed.data.phone))
    .limit(1);
  const account = rows[0];

  if (!account?.passwordHash || !(await bcrypt.compare(parsed.data.password, account.passwordHash))) {
    return jsonError(401, "মোবাইল নম্বর বা পাসওয়ার্ড সঠিক নয়।");
  }

  await db
    .update(customerAccounts)
    .set({ lastLoginAt: new Date() })
    .where(eq(customerAccounts.id, account.id));

  await createCustomerSession({ phone: account.phone, name: account.name });
  return jsonOk({ phone: account.phone });
}
