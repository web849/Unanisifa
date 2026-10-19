import Link from "next/link";
import { Plus } from "lucide-react";
import { AdminShell } from "@/components/admin/admin-shell";
import { getAdminSession } from "@/lib/auth/session";
import { isDatabaseConfigured, requireDb } from "@/lib/db";
import { categories, productImages, products } from "@/lib/db/schema";
import { and, eq, ilike, sql } from "drizzle-orm";
import { formatTakaEn } from "@/lib/utils";

export const dynamic = "force-dynamic";

type Params = Promise<{ search?: string; status?: string; filter?: string; categoryId?: string }>;

export default async function AdminProductsPage({ searchParams }: { searchParams: Params }) {
  const session = await getAdminSession();
  if (!session) return null;
  const params = await searchParams;

  let rows: Array<{
    id: number;
    name: string;
    slug: string;
    price: number;
    compareAtPrice: number | null;
    stock: number;
    lowStockThreshold: number;
    status: string;
    featured: boolean;
    image: string | null;
    category: string | null;
  }> = [];
  let cats: Array<{ id: number; name: string }> = [];

  if (isDatabaseConfigured) {
    const db = requireDb("প্রোডাক্ট তালিকা");
    const conditions = [];
    if (params.search?.trim()) conditions.push(ilike(products.name, `%${params.search.trim()}%`));
    if (params.status && ["draft", "active", "archived"].includes(params.status)) {
      conditions.push(eq(products.status, params.status as "draft"));
    }
    if (params.categoryId) conditions.push(eq(products.categoryId, Number(params.categoryId)));
    if (params.filter === "low") {
      conditions.push(and(eq(products.trackStock, true), sql`${products.stock} <= ${products.lowStockThreshold}`)!);
    }
    rows = await db
      .select({
        id: products.id,
        name: products.name,
        slug: products.slug,
        price: products.price,
        compareAtPrice: products.compareAtPrice,
        stock: products.stock,
        lowStockThreshold: products.lowStockThreshold,
        status: sql<string>`${products.status}`,
        featured: products.featured,
        image: sql<string | null>`(SELECT ${productImages.url} FROM ${productImages} WHERE ${productImages.productId} = ${products.id} ORDER BY ${productImages.sortOrder} LIMIT 1)`,
        category: categories.name,
      })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .where(conditions.length > 0 ? and(...conditions) : sql`TRUE`)
      .orderBy(sql`${products.sortOrder} DESC, ${products.id} DESC`)
      .limit(200);
    cats = await db.select({ id: categories.id, name: categories.name }).from(categories).orderBy(categories.sortOrder);
  }

  return (
    <AdminShell session={session} counts={{}} title="Products" subtitle={`${rows.length} product(s)`}>
      <div className="panel mb-4">
        <div className="panel-head">
          <h2 className="panel-title">Catalog</h2>
          <Link className="btn btn-primary btn-sm" href="/admin/products/new">
            <Plus aria-hidden="true" />
            New product
          </Link>
        </div>
        <div className="panel-body">
          <form className="filters mb-0" method="get">
            <input className="input" name="search" placeholder="Search name…" defaultValue={params.search ?? ""} />
            <select className="input" name="status" defaultValue={params.status ?? ""}>
              <option value="">All statuses</option>
              <option value="active">Active</option>
              <option value="draft">Draft</option>
              <option value="archived">Archived</option>
            </select>
            <select className="input" name="categoryId" defaultValue={params.categoryId ?? ""}>
              <option value="">All categories</option>
              {cats.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            <select className="input" name="filter" defaultValue={params.filter ?? ""}>
              <option value="">All stock</option>
              <option value="low">Low stock only</option>
            </select>
            <button type="submit" className="btn btn-outline btn-sm">
              Apply
            </button>
          </form>
        </div>
      </div>

      {!isDatabaseConfigured ? (
        <div className="pending-note">Pending — database not configured; product list unavailable.</div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: 56 }} />
                <th>Name</th>
                <th>Category</th>
                <th style={{ textAlign: "right" }}>Price</th>
                <th style={{ textAlign: "right" }}>Stock</th>
                <th>Status</th>
                <th>Featured</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>
                    {row.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={row.image} alt="" width={40} height={40} className="table-thumb" />
                    ) : (
                      <span className="table-thumb table-thumb-empty" aria-hidden="true" />
                    )}
                  </td>
                  <td>
                    <Link href={`/admin/products/${row.id}`}>{row.name}</Link>
                    <br />
                    <span className="text-small text-muted mono">/{row.slug}</span>
                  </td>
                  <td className="text-muted">{row.category ?? "—"}</td>
                  <td className="table-num">
                    {formatTakaEn(row.price)}
                    {row.compareAtPrice ? <span className="text-small text-muted"> / {formatTakaEn(row.compareAtPrice)}</span> : null}
                  </td>
                  <td className="table-num">
                    <span className={row.stock <= row.lowStockThreshold ? "stock-low" : "stock-ok"}>{row.stock}</span>
                  </td>
                  <td>
                    <span className={`badge badge-${row.status === "active" ? "active" : row.status === "draft" ? "draft" : "hidden"}`}>
                      {row.status}
                    </span>
                  </td>
                  <td>{row.featured ? "Yes" : "—"}</td>
                  <td className="table-actions">
                    <Link className="btn btn-outline btn-sm" href={`/admin/products/${row.id}`}>
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-muted">
                    No products match the filter.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      )}
    </AdminShell>
  );
}
