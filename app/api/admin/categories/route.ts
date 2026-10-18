import { eq } from "drizzle-orm";
import { z } from "zod";
import { guardMutation, jsonError, jsonOk, readJson, requestContext } from "@/lib/api/helpers";
import { getAdminSession } from "@/lib/auth/session";
import { requireAdmin, requireAdminWrite } from "@/lib/admin/guard";
import { requireDb } from "@/lib/db";
import { categories } from "@/lib/db/schema";
import { audit } from "@/lib/auth/audit";
import { slugify } from "@/lib/utils";

export const dynamic = "force-dynamic";

const schema = z.object({
  name: z.string().trim().min(2).max(160),
  slug: z.string().trim().min(2).max(180).optional(),
  description: z.string().trim().max(500).optional(),
  coverImage: z.string().trim().max(600).optional(),
  icon: z.string().trim().max(60).optional(),
  sortOrder: z.number().int().min(0).max(999).default(0),
  active: z.boolean().default(true),
});

export async function POST(request: Request) {
  const guard = guardMutation(request);
  if (guard) return guard;
  const context = requestContext(request.headers);
  const session = await getAdminSession();
  const denied = await requireAdminWrite(session, context.clientIpHash, "categories");
  if (denied) return denied;

  const parsed = schema.safeParse(await readJson<unknown>(request));
  if (!parsed.success) return jsonError(400, "Invalid category data");

  const data = parsed.data;
  const slug = slugify(data.slug || data.name);
  const db = requireDb("ক্যাটাগরি");
  const existing = await db.select({ id: categories.id }).from(categories).where(eq(categories.slug, slug)).limit(1);
  if (existing.length > 0) return jsonError(409, `Slug already used: ${slug}`);

  const result = await db
    .insert(categories)
    .values({
      name: data.name,
      slug,
      description: data.description || null,
      coverImage: data.coverImage || null,
      icon: data.icon || null,
      sortOrder: data.sortOrder,
      active: data.active,
    })
    .returning({ id: categories.id });

  await audit({
    actorType: "admin",
    actorId: session?.userId ?? null,
    actorName: session?.name ?? null,
    action: "category.create",
    entityType: "categories",
    entityId: result[0] ? String(result[0].id) : null,
    ipHash: context.clientIpHash,
  }).catch(() => undefined);

  return jsonOk({ id: result[0]?.id }, 201);
}

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;
  const db = requireDb("ক্যাটাগরি");
  const rows = await db.select().from(categories).orderBy(categories.sortOrder, categories.id);
  return jsonOk({ categories: rows });
}
