import { sql } from "drizzle-orm";
import { requireAdmin } from "@/lib/admin/guard";
import { isDatabaseConfigured, requireDb } from "@/lib/db";
import { leads } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/leads/export — UTF-8 BOM সহ CSV (এক্সেল-বান্ধব), সর্বোচ্চ ১০,০০০ রো।
 * শুধু তালিকা এক্সপোর্ট — কোনো সেগমেন্টেশন/অডিয়েন্স বিল্ডিং নেই।
 */
export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;

  if (!isDatabaseConfigured) {
    return new Response("Database not configured", { status: 503 });
  }

  const db = requireDb("লিডস এক্সপোর্ট");
  const rows = await db
    .select({
      name: leads.name,
      phone: leads.phone,
      email: leads.email,
      source: leads.source,
      popupLabel: leads.popupLabel,
      campaign: leads.campaign,
      smsConsent: leads.smsConsent,
      note: leads.note,
      createdAt: leads.createdAt,
    })
    .from(leads)
    .orderBy(sql`${leads.createdAt} DESC`)
    .limit(10000);

  const escape = (value: string | null | undefined): string => {
    const text = value ?? "";
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };

  const header = ["name", "phone", "email", "source", "popup", "campaign", "sms_consent", "note", "created_at"];
  const lines = rows.map((row) =>
    [
      escape(row.name),
      escape(row.phone),
      escape(row.email),
      escape(row.source),
      escape(row.popupLabel),
      escape(row.campaign),
      row.smsConsent ? "yes" : "no",
      escape(row.note),
      row.createdAt.toISOString(),
    ].join(","),
  );

  const csv = `\uFEFF${header.join(",")}\n${lines.join("\n")}\n`;
  const filename = `leads-${new Date().toISOString().slice(0, 10)}.csv`;

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
