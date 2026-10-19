import { revalidatePath } from "next/cache";
import { audit } from "@/lib/auth/audit";
import { getAdminSession } from "@/lib/auth/session";
import { requireAdminWrite } from "@/lib/admin/guard";
import { guardMutation, jsonError, jsonOk, requestContext } from "@/lib/api/helpers";
import { requireDb } from "@/lib/db";
import { importDemoCatalog } from "@/lib/demo/import-catalog";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/demo-catalog
 * খালি ক্যাটালগে ডেমো পণ্য, ক্যাটাগরি, ব্যানার ও CMS পেজ ইমপোর্ট করে।
 * শুধু লিখন-অনুমতিপ্রাপ্ত অ্যাডমিন (owner/admin/operator)।
 */
export async function POST(request: Request) {
  const guard = guardMutation(request);
  if (guard) return guard;
  const context = requestContext(request.headers);
  const session = await getAdminSession();
  const denied = await requireAdminWrite(session, context.clientIpHash, "demo-catalog");
  if (denied) return denied;

  const db = requireDb("ডেমো ক্যাটালগ");
  const result = await importDemoCatalog(db);

  await audit({
    actorType: "admin",
    actorId: session?.userId ?? null,
    actorName: session?.name ?? null,
    action: "demo.import",
    entityType: "catalog",
    entityId: null,
    ipHash: context.clientIpHash,
    meta: { ...result },
  }).catch(() => undefined);

  revalidatePath("/");
  revalidatePath("/products");
  revalidatePath("/admin/landing-pages");
  revalidatePath("/admin/products");
  revalidatePath("/admin/categories");

  if (result.products === 0 && result.categories === 0) {
    return jsonOk({ ...result, alreadyPresent: true });
  }

  return jsonOk({ ...result, alreadyPresent: false });
}

export async function GET() {
  return jsonError(405, "Use POST to import the demo catalog");
}
