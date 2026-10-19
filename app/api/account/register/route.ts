import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { guardMutation, jsonError, jsonOk, readJson, requestContext } from "@/lib/api/helpers";
import { checkRateLimit } from "@/lib/auth/rate-limit";
import { createCustomerSession } from "@/lib/auth/customer-session";
import { isDatabaseConfigured, requireDb } from "@/lib/db";
import { customerAccounts } from "@/lib/db/schema";
import { hashPhone } from "@/lib/security";
import { bdPhoneSchema, nameSchema } from "@/lib/orders/validation";

export const dynamic = "force-dynamic";

const schema = z.object({
  name: nameSchema,
  phone: bdPhoneSchema,
  password: z.string().min(8, "পাসওয়ার্ড কমপক্ষে ৮ অক্ষর").max(128),
});

/** কাস্টমার রেজিস্ট্রেশন — ঐচ্ছিক (লগইন ছাড়াও কেনাকাটা যায়) */
export async function POST(request: Request) {
  const guard = guardMutation(request);
  if (guard) return guard;
  const context = requestContext(request.headers);

  const rate = await checkRateLimit("register", context.clientIpHash);
  if (!rate.allowed) {
    return jsonError(429, `অনেকবার চেষ্টা হয়েছে। ${rate.retryAfterSeconds} সেকেন্ড পরে চেষ্টা করুন।`);
  }

  const parsed = schema.safeParse(await readJson<unknown>(request));
  if (!parsed.success) return jsonError(400, parsed.error.issues[0]?.message ?? "তথ্য সঠিক নয়।");

  if (!isDatabaseConfigured) {
    return jsonError(503, "ডেটাবেজ কনফিগার করা নেই — অ্যাকাউন্ট খোলা যাচ্ছে না।");
  }

  const db = requireDb("রেজিস্ট্রেশন");
  const { name, phone, password } = parsed.data;

  const existing = await db
    .select({ phone: customerAccounts.phone })
    .from(customerAccounts)
    .where(eq(customerAccounts.phone, phone))
    .limit(1);
  if (existing.length > 0) {
    return jsonError(409, "এই নম্বর দিয়ে আগেই অ্যাকাউন্ট আছে — লগইন করুন।");
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await db.insert(customerAccounts).values({
    phone,
    phoneHash: hashPhone(phone),
    name,
    passwordHash,
    lastLoginAt: new Date(),
  });

  await createCustomerSession({ phone, name });
  return jsonOk({ phone }, 201);
}
