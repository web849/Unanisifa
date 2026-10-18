import { notFound } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-shell";
import { ProductForm } from "@/components/admin/product-form";
import { getAdminSession } from "@/lib/auth/session";
import { isDatabaseConfigured, requireDb } from "@/lib/db";
import { categories, productImages, products } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getAdminSession();
  if (!session) return null;
  const { id } = await params;
  if (!isDatabaseConfigured) notFound();

  const db = requireDb("প্রোডাক্ট");
  const rows = await db.select().from(products).where(eq(products.id, Number(id))).limit(1);
  const product = rows[0];
  if (!product) notFound();

  const [cats, imageRows] = await Promise.all([
    db.select({ id: categories.id, name: categories.name }).from(categories).orderBy(categories.sortOrder),
    db.select().from(productImages).where(eq(productImages.productId, product.id)).orderBy(productImages.sortOrder),
  ]);

  return (
    <AdminShell session={session} counts={{}} title={`Edit · ${product.name}`} subtitle={`/${product.slug}`}>
      <ProductForm
        categories={cats}
        productId={product.id}
        initial={{
          name: product.name,
          slug: product.slug,
          categoryId: product.categoryId,
          sku: product.sku ?? "",
          shortDescription: product.shortDescription ?? "",
          description: product.description ?? "",
          price: product.price,
          compareAtPrice: product.compareAtPrice ?? 0,
          costPrice: product.costPrice ?? 0,
          stock: product.stock,
          lowStockThreshold: product.lowStockThreshold,
          trackStock: product.trackStock,
          status: product.status,
          featured: product.featured,
          sortOrder: product.sortOrder,
          ingredients: product.ingredients ?? "",
          dosage: product.dosage ?? "",
          warnings: product.warnings ?? "",
          storage: product.storage ?? "",
          packageSize: product.packageSize ?? "",
          manufacturer: product.manufacturer ?? "",
          requiresPrescription: product.requiresPrescription,
          expiryNote: product.expiryNote ?? "",
          metaTitle: product.metaTitle ?? "",
          metaDescription: product.metaDescription ?? "",
          images: imageRows.map((image) => ({ url: image.url, alt: image.alt ?? "" })),
        }}
      />
    </AdminShell>
  );
}
