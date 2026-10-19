/**
 * ওনার অ্যাকাউন্ট তৈরি — bcrypt হ্যাশ সহ admin_users-এ লেখে।
 *
 *   ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='strong-pass' npm run db:bootstrap-admin
 *   (চাইলে: node scripts/bootstrap-admin.mjs name@example.com 'strong-pass' "Owner Name")
 *
 * একই ইমেইল আগে থেকে থাকলে কিছু বদলায় না (পাসওয়ার্ড রিসেট ইচ্ছাকৃতভাবে নেই —
 * নতুন ইউজার বানাতে অ্যাডমিন প্যানেল/SQL ব্যবহার করুন)।
 */

import { neon } from "@neondatabase/serverless";
import bcrypt from "bcryptjs";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("[bootstrap-admin] DATABASE_URL সেট করা নেই।");
  process.exit(1);
}

const email = (process.argv[2] || process.env.ADMIN_EMAIL || "").trim().toLowerCase();
const password = process.argv[3] || process.env.ADMIN_PASSWORD || "";
const name = (process.argv[4] || process.env.ADMIN_NAME || "Owner").trim();

if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
  console.error(
    "[bootstrap-admin] ইমেইল দিন:\n" +
      "  ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='...' npm run db:bootstrap-admin\n" +
      "  অথবা: node scripts/bootstrap-admin.mjs you@example.com '...' \"Owner Name\"",
  );
  process.exit(1);
}
if (password.length < 10) {
  console.error("[bootstrap-admin] পাসওয়ার্ড কমপক্ষে ১০ অক্ষরের হতে হবে।");
  process.exit(1);
}

const sql = neon(url);
const existing = await sql`SELECT id FROM admin_users WHERE email = ${email}`;
if (existing.length > 0) {
  console.log(`[bootstrap-admin] ${email} আগে থেকেই আছে — কিছু বদলানো হয়নি।`);
  process.exit(0);
}

const passwordHash = await bcrypt.hash(password, 12);
const rows = await sql`
  INSERT INTO admin_users (name, email, password_hash, role, auth_version, is_active)
  VALUES (${name}, ${email}, ${passwordHash}, 'owner', 1, TRUE)
  RETURNING id, role
`;

console.log(`[bootstrap-admin] owner তৈরি হয়েছে: ${email} (role=${rows[0]?.role})`);
console.log("[bootstrap-admin] এখন /admin/login থেকে সাইন ইন করুন।");
