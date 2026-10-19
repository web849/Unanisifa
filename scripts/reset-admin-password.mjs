/**
 * Reset an existing admin password without changing its role or active status.
 *
 *   ADMIN_EMAIL=owner@example.com ADMIN_PASSWORD='new-strong-password' npm run db:reset-admin-password
 *
 * The account's auth_version is incremented to invalidate all existing sessions.
 */

import { neon } from "@neondatabase/serverless";
import bcrypt from "bcryptjs";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("[reset-admin-password] DATABASE_URL is not configured.");
  process.exit(1);
}

const email = (process.argv[2] || process.env.ADMIN_EMAIL || "").trim().toLowerCase();
const password = process.argv[3] || process.env.ADMIN_PASSWORD || "";

if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
  console.error("[reset-admin-password] Set ADMIN_EMAIL to the existing admin account's email.");
  process.exit(1);
}
if (password.length < 10 || password.length > 128) {
  console.error("[reset-admin-password] ADMIN_PASSWORD must be between 10 and 128 characters.");
  process.exit(1);
}

const sql = neon(url);
const passwordHash = await bcrypt.hash(password, 12);
const rows = await sql`
  UPDATE admin_users
  SET password_hash = ${passwordHash},
      auth_version = auth_version + 1,
      updated_at = now()
  WHERE lower(email) = ${email}
  RETURNING email, role, is_active
`;

if (rows.length === 0) {
  console.error(`[reset-admin-password] No admin account found for ${email}.`);
  process.exit(1);
}

console.log(`[reset-admin-password] Password updated for ${rows[0].email} (role=${rows[0].role}, active=${rows[0].is_active}).`);
console.log("[reset-admin-password] All existing admin sessions have been invalidated.");
