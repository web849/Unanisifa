-- R2 ছাড়াই সরাসরি ছবি আপলোড: media টেবিলে DB-ব্যাকড স্টোরেজ কলাম।
-- storage="db" হলে ফাইলের base64 বাইট data_base64-তে থাকে, /api/media/... থেকে সার্ভ হয়।
ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "storage" text DEFAULT 'r2' NOT NULL;
--> statement-breakpoint
ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "data_base64" text;
