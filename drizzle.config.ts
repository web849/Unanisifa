import { defineConfig } from "drizzle-kit";

/**
 * drizzle-kit কনফিগ।
 * - `npm run db:generate` → drizzle/ ফোল্ডারে SQL মাইগ্রেশন তৈরি করে (রিপোতে কমিট থাকে)
 * - `npm run db:migrate`  → scripts/migrate.mjs DIRECT_URL দিয়ে সেই SQL প্রয়োগ করে
 * সার্ভারলেস (Neon) ড্রাইভার ব্যবহার করা হচ্ছে।
 */
export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DIRECT_URL || process.env.DATABASE_URL || "",
  },
  strict: true,
  verbose: true,
  breakpoints: true,
});
