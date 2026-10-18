import { eq } from "drizzle-orm";
import { z } from "zod";
import { guardMutation, jsonError, jsonOk, readJson, requestContext } from "@/lib/api/helpers";
import { getAdminSession } from "@/lib/auth/session";
import { requireAdmin, requireAdminWrite } from "@/lib/admin/guard";
import { requireDb } from "@/lib/db";
import { siteSettings } from "@/lib/db/schema";
import { audit } from "@/lib/auth/audit";

export const dynamic = "force-dynamic";

const brandSchema = z.object({
  name: z.string().trim().min(2).max(120),
  tagline: z.string().trim().max(200).default(""),
  description: z.string().trim().max(600).default(""),
  phone: z.string().trim().max(20).default(""),
  phoneInternational: z.string().trim().max(20).default(""),
  whatsapp: z.string().trim().max(20).default(""),
  email: z.string().trim().email().max(160).or(z.literal("")),
  address: z.string().trim().max(300).default(""),
  returnAddress: z.string().trim().max(300).default(""),
  serviceArea: z.string().trim().max(160).default(""),
  supportHours: z.string().trim().max(120).default(""),
  facebook: z.string().trim().max(300).default(""),
  siteUrl: z.string().trim().max(300).default(""),
  primaryColor: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/).default("#0B5D4A"),
  logoUrl: z.string().trim().max(600).default(""),
  logoLightUrl: z.string().trim().max(600).default(""),
  drugLicense: z.string().trim().max(120).default(""),
});

const commerceSchema = z.object({
  deliveryInsideDhaka: z.number().int().min(0).max(100000),
  deliveryOutsideDhaka: z.number().int().min(0).max(100000),
  freeDeliveryThreshold: z.number().int().min(0).max(10000000),
  codEnabled: z.boolean(),
  currency: z.string().trim().max(8).default("BDT"),
  currencySymbol: z.string().trim().max(4).default("৳"),
  maxQuantity: z.number().int().min(1).max(100),
  lowStockThreshold: z.number().int().min(0).max(10000),
  defaultAdvance: z.number().int().min(0).max(10000000),
  courierCostInside: z.number().int().min(0).max(100000),
  courierCostOutside: z.number().int().min(0).max(100000),
  packagingCost: z.number().int().min(0).max(100000),
  perOrderExtras: z.number().int().min(0).max(100000),
  monthlyFixedCost: z.number().int().min(0).max(10000000),
  minSubtotal: z.number().int().min(0).max(10000000),
});

const popupSchema = z.object({
  mysteryEnabled: z.boolean(),
});

const wrapper = z.object({
  brand: brandSchema.partial().optional(),
  commerce: commerceSchema.partial().optional(),
  popup: popupSchema.partial().optional(),
});

/** GET — বর্তমান মান (brand, commerce, popup) */
export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;
  const db = requireDb("সেটিংস");
  const rows = await db.select().from(siteSettings);
  const values: Record<string, unknown> = {};
  for (const row of rows) values[row.key] = row.value;
  return jsonOk({ settings: values });
}

/** PATCH — আংশিক আপডেট; প্রতিটি key-এর jsonb মার্জ হয় */
export async function PATCH(request: Request) {
  const guard = guardMutation(request);
  if (guard) return guard;
  const reqContext = requestContext(request.headers);
  const session = await getAdminSession();
  const denied = await requireAdminWrite(session, reqContext.clientIpHash, "settings");
  if (denied) return denied;

  const parsed = wrapper.safeParse(await readJson<unknown>(request));
  if (!parsed.success) return jsonError(400, "Invalid settings payload", parsed.error.flatten());

  const db = requireDb("সেটিংস");
  const updated: string[] = [];

  const currentFor = async (key: string): Promise<Record<string, unknown>> => {
    const rows = await db.select().from(siteSettings).where(eq(siteSettings.key, key)).limit(1);
    return (rows[0]?.value as Record<string, unknown>) ?? {};
  };

  const upsert = async (key: string, value: Record<string, unknown>) => {
    await db
      .insert(siteSettings)
      .values({ key, value: value as never, updatedBy: session?.userId ?? null, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: siteSettings.key,
        set: { value: value as never, updatedBy: session?.userId ?? null, updatedAt: new Date() },
      });
    updated.push(key);
  };

  if (parsed.data.brand) {
    const brand = parsed.data.brand;
    if (brand.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(brand.email)) {
      return jsonError(400, "Invalid support email");
    }
    if (brand.phone && !/^[+\d][\d\s-]{5,18}$/.test(brand.phone)) {
      return jsonError(400, "Invalid support phone format");
    }
    await upsert("brand", { ...(await currentFor("brand")), ...brand });
  }

  if (parsed.data.commerce) {
    const commerce = parsed.data.commerce;
    if (commerce.maxQuantity !== undefined && commerce.maxQuantity < 1) {
      return jsonError(400, "maxQuantity must be at least 1");
    }
    await upsert("commerce", { ...(await currentFor("commerce")), ...commerce });
  }

  if (parsed.data.popup) {
    await upsert("popup", { ...(await currentFor("popup")), ...parsed.data.popup });
  }

  if (updated.length === 0) return jsonError(400, "Nothing to update");

  await audit({
    actorType: "admin",
    actorId: session?.userId ?? null,
    actorName: session?.name ?? null,
    action: "settings.update",
    entityType: "site_settings",
    entityId: updated.join(","),
    ipHash: reqContext.clientIpHash,
  }).catch(() => undefined);

  return jsonOk({ updated });
}
