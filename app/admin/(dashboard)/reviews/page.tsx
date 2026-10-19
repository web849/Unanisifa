import { AdminShell } from "@/components/admin/admin-shell";
import { ReviewsManager, type ReviewRow } from "@/components/admin/reviews-manager";
import { getAdminSession } from "@/lib/auth/session";
import { isDatabaseConfigured, requireDb } from "@/lib/db";
import { productReviews, products } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

type Params = Promise<{ status?: string }>;

export default async function AdminReviewsPage({ searchParams }: { searchParams: Params }) {
  const session = await getAdminSession();
  if (!session) return null;
  const params = await searchParams;

  let rows: ReviewRow[] = [];
  let pending = 0;

  if (isDatabaseConfigured) {
    const db = requireDb("রিভিউ");
    const status = params.status && ["pending", "approved", "rejected"].includes(params.status) ? params.status : null;
    rows = await db
      .select({
        id: productReviews.id,
        customerName: productReviews.customerName,
        rating: productReviews.rating,
        comment: productReviews.comment,
        status: sql<string>`${productReviews.status}`,
        isVerified: productReviews.isVerified,
        createdAt: productReviews.createdAt,
        productName: products.name,
      })
      .from(productReviews)
      .leftJoin(products, eq(productReviews.productId, products.id))
      .where(status ? eq(productReviews.status, status as "pending") : sql`TRUE`)
      .orderBy(sql`${productReviews.createdAt} DESC`)
      .limit(200);
    const counts = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(productReviews)
      .where(eq(productReviews.status, "pending"));
    pending = counts[0]?.count ?? 0;
  }

  return (
    <AdminShell
      session={session}
      counts={{ reviews: pending }}
      title="Reviews"
      subtitle={`${pending} awaiting moderation — fake reviews must be rejected`}
    >
      {!isDatabaseConfigured ? (
        <div className="pending-note">Pending — database not configured.</div>
      ) : (
        <ReviewsManager initial={rows} currentStatus={params.status ?? ""} />
      )}
    </AdminShell>
  );
}
