/**
 * অ্যাবান্ডনড চেকআউট — নাম+মোবাইল+ঠিকানা মিনিমাম পূরণ হলে অটো-সেভ;
 * একই ফোনে সফল অর্ডার এলে অর্ডার সার্ভিস নিজেই "recovered" মার্ক করে।
 */

import { and, eq } from "drizzle-orm";
import { requireDb } from "../db";
import { abandonedCheckouts } from "../db/schema";

export async function saveAbandonedCheckout(input: {
  name: string;
  phone: string;
  address: string;
  area: "inside_dhaka" | "outside_dhaka";
  email: string | null;
  cartSnapshot: Array<{ productId: number; quantity: number }>;
  subtotal: number;
  landingSlug: string | null;
  ipHash: string;
  userAgent: string | null;
}): Promise<void> {
  const db = requireDb("অ্যাবান্ডনড চেকআউট");

  let landingPageId: number | null = null;
  if (input.landingSlug) {
    const { landingPages } = await import("../db/schema");
    const rows = await db
      .select({ id: landingPages.id })
      .from(landingPages)
      .where(eq(landingPages.slug, input.landingSlug))
      .limit(1);
    landingPageId = rows[0]?.id ?? null;
  }

  const existing = await db
    .select()
    .from(abandonedCheckouts)
    .where(
      and(
        eq(abandonedCheckouts.phoneNormalized, input.phone),
        eq(abandonedCheckouts.status, "open"),
      ),
    )
    .limit(1);

  if (existing[0]) {
    await db
      .update(abandonedCheckouts)
      .set({
        name: input.name,
        address: input.address,
        area: input.area,
        email: input.email,
        cartSnapshot: input.cartSnapshot,
        subtotal: input.subtotal,
        landingPageId,
        ipHash: input.ipHash,
        userAgent: input.userAgent,
        lastTouchAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(abandonedCheckouts.id, existing[0].id));
    return;
  }

  await db.insert(abandonedCheckouts).values({
    name: input.name,
    phone: input.phone,
    phoneNormalized: input.phone,
    address: input.address,
    area: input.area,
    email: input.email,
    cartSnapshot: input.cartSnapshot,
    subtotal: input.subtotal,
    landingPageId,
    status: "open",
    ipHash: input.ipHash,
    userAgent: input.userAgent,
  });
}
