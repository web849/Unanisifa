CREATE TYPE "public"."coupon_type" AS ENUM('percent', 'fixed', 'free_delivery');--> statement-breakpoint
CREATE TYPE "public"."landing_status" AS ENUM('draft', 'published', 'archived');--> statement-breakpoint
CREATE TYPE "public"."log_status" AS ENUM('queued', 'processing', 'sent', 'failed', 'skipped');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('unpaid', 'partially_paid', 'paid', 'refunded', 'failed');--> statement-breakpoint
CREATE TYPE "public"."product_status" AS ENUM('draft', 'active', 'archived');--> statement-breakpoint
CREATE TYPE "public"."review_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('owner', 'admin', 'operator', 'viewer');--> statement-breakpoint
CREATE TABLE "abandoned_checkouts" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"phone_normalized" text NOT NULL,
	"address" text,
	"area" text,
	"email" text,
	"cart_snapshot" jsonb DEFAULT '[]' NOT NULL,
	"subtotal" integer DEFAULT 0 NOT NULL,
	"coupon_code" text,
	"landing_page_id" integer,
	"status" text DEFAULT 'open' NOT NULL,
	"recovered_order_id" integer,
	"ip_hash" text,
	"user_agent" text,
	"last_touch_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admin_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" "user_role" DEFAULT 'owner' NOT NULL,
	"auth_version" integer DEFAULT 1 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_login_at" timestamp with time zone,
	"last_login_ip_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "admin_users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"actor_type" text DEFAULT 'system' NOT NULL,
	"actor_id" text,
	"actor_name" text,
	"action" text NOT NULL,
	"entity_type" text,
	"entity_id" text,
	"ip_hash" text,
	"meta" jsonb DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "banners" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"image_url" text NOT NULL,
	"link_url" text,
	"alt_text" text,
	"active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_demo" boolean DEFAULT false NOT NULL,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "blocked_networks" (
	"id" serial PRIMARY KEY NOT NULL,
	"ip_hash" text NOT NULL,
	"ip_label" text,
	"reason" text,
	"active" boolean DEFAULT true NOT NULL,
	"order_count_at_block" integer DEFAULT 0 NOT NULL,
	"blocked_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"released_at" timestamp with time zone,
	CONSTRAINT "blocked_networks_ip_hash_unique" UNIQUE("ip_hash")
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"cover_image" text,
	"icon" text,
	"active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_demo" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "cms_pages" (
	"slug" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"meta_title" text,
	"meta_description" text,
	"show_in_footer" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_demo" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "coupon_redemptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"coupon_id" integer NOT NULL,
	"order_id" integer,
	"phone" text NOT NULL,
	"phone_hash" text NOT NULL,
	"ip_hash" text,
	"amount" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "coupons" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"title" text NOT NULL,
	"type" "coupon_type" DEFAULT 'percent' NOT NULL,
	"value" integer DEFAULT 0 NOT NULL,
	"min_subtotal" integer DEFAULT 0 NOT NULL,
	"max_discount" integer,
	"usage_limit" integer,
	"per_phone_limit" integer,
	"used_count" integer DEFAULT 0 NOT NULL,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"landing_scope_id" integer,
	"show_on_checkout" boolean DEFAULT false NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "coupons_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "courier_providers" (
	"id" serial PRIMARY KEY NOT NULL,
	"adapter" text NOT NULL,
	"name" text NOT NULL,
	"credentials_encrypted" text,
	"enabled" boolean DEFAULT false NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"last_connection_status" text,
	"last_connection_at" timestamp with time zone,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "courier_providers_adapter_unique" UNIQUE("adapter")
);
--> statement-breakpoint
CREATE TABLE "courier_shipments" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer NOT NULL,
	"provider_id" integer,
	"consignment_id" text,
	"tracking_number" text,
	"status" text DEFAULT 'not_sent' NOT NULL,
	"last_error" text,
	"provider_response" jsonb,
	"handed_over_at" timestamp with time zone,
	"last_synced_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "courier_shipments_order_id_unique" UNIQUE("order_id")
);
--> statement-breakpoint
CREATE TABLE "credential_secrets" (
	"key" text PRIMARY KEY NOT NULL,
	"algorithm" text DEFAULT 'aes-256-gcm' NOT NULL,
	"ciphertext" text NOT NULL,
	"iv" text NOT NULL,
	"auth_tag" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customer_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phone" text NOT NULL,
	"phone_hash" text NOT NULL,
	"email" text,
	"name" text,
	"password_hash" text,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "customer_accounts_phone_unique" UNIQUE("phone")
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" serial PRIMARY KEY NOT NULL,
	"phone" text NOT NULL,
	"phone_hash" text NOT NULL,
	"name" text,
	"email" text,
	"address" text,
	"area" text,
	"order_count" integer DEFAULT 0 NOT NULL,
	"delivered_count" integer DEFAULT 0 NOT NULL,
	"cancelled_count" integer DEFAULT 0 NOT NULL,
	"returned_count" integer DEFAULT 0 NOT NULL,
	"total_spent" integer DEFAULT 0 NOT NULL,
	"success_rate" integer DEFAULT 0 NOT NULL,
	"blocked" boolean DEFAULT false NOT NULL,
	"note" text,
	"last_order_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "customers_phone_unique" UNIQUE("phone")
);
--> statement-breakpoint
CREATE TABLE "landing_pages" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"product_id" integer,
	"status" "landing_status" DEFAULT 'draft' NOT NULL,
	"theme_slug" text DEFAULT 'emerald' NOT NULL,
	"sections" jsonb DEFAULT '[]' NOT NULL,
	"meta_title" text,
	"meta_description" text,
	"coupon_code" text,
	"checkout_offers" jsonb DEFAULT '[]' NOT NULL,
	"thank_you_offers" jsonb DEFAULT '[]' NOT NULL,
	"view_count" integer DEFAULT 0 NOT NULL,
	"order_count" integer DEFAULT 0 NOT NULL,
	"is_demo" boolean DEFAULT false NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "landing_pages_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "landing_themes" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"tokens" jsonb DEFAULT '{}' NOT NULL,
	"is_custom" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "landing_themes_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "leads" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text,
	"phone" text,
	"phone_normalized" text,
	"phone_hash" text,
	"email" text,
	"source" text DEFAULT 'popup' NOT NULL,
	"popup_label" text,
	"landing_page_id" integer,
	"campaign" text,
	"sms_consent" boolean DEFAULT false NOT NULL,
	"ip_hash" text,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "media" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"object_key" text NOT NULL,
	"url" text NOT NULL,
	"mime_type" text NOT NULL,
	"size_bytes" integer DEFAULT 0 NOT NULL,
	"width" integer,
	"height" integer,
	"folder" text DEFAULT 'products' NOT NULL,
	"alt" text,
	"uploaded_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "media_object_key_unique" UNIQUE("object_key")
);
--> statement-breakpoint
CREATE TABLE "mystery_offer_claims" (
	"id" serial PRIMARY KEY NOT NULL,
	"phone" text NOT NULL,
	"phone_normalized" text NOT NULL,
	"phone_hash" text NOT NULL,
	"name" text,
	"coupon_code" text NOT NULL,
	"claimed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"landing_page_id" integer,
	"ip_hash" text,
	CONSTRAINT "mystery_offer_claims_phone_unique" UNIQUE("phone")
);
--> statement-breakpoint
CREATE TABLE "notification_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"channel" text NOT NULL,
	"event" text NOT NULL,
	"entity_type" text,
	"entity_id" text,
	"idempotency_key" text NOT NULL,
	"status" "log_status" DEFAULT 'queued' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer DEFAULT 5 NOT NULL,
	"next_attempt_at" timestamp with time zone,
	"last_error" text,
	"sent_at" timestamp with time zone,
	"payload" jsonb DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "notification_logs_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
CREATE TABLE "notification_settings" (
	"channel" text PRIMARY KEY NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"events" jsonb DEFAULT '[]' NOT NULL,
	"last_test_at" timestamp with time zone,
	"last_test_status" text,
	"last_test_error" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer NOT NULL,
	"product_id" integer,
	"variant_id" integer,
	"product_name" text NOT NULL,
	"variant_name" text,
	"sku" text,
	"image_url" text,
	"unit_price" integer NOT NULL,
	"compare_at_price" integer,
	"cost_price" integer,
	"quantity" integer DEFAULT 1 NOT NULL,
	"line_total" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_status_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer NOT NULL,
	"from_status" "order_status",
	"to_status" "order_status" NOT NULL,
	"note" text,
	"actor" text DEFAULT 'system' NOT NULL,
	"actor_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_number" text NOT NULL,
	"public_token" text NOT NULL,
	"customer_id" integer,
	"landing_page_id" integer,
	"status" "order_status" DEFAULT 'pending' NOT NULL,
	"payment_status" "payment_status" DEFAULT 'unpaid' NOT NULL,
	"payment_method" text DEFAULT 'cod' NOT NULL,
	"subtotal" integer DEFAULT 0 NOT NULL,
	"discount" integer DEFAULT 0 NOT NULL,
	"delivery_charge" integer DEFAULT 0 NOT NULL,
	"total" integer DEFAULT 0 NOT NULL,
	"advance" integer DEFAULT 0 NOT NULL,
	"due_amount" integer DEFAULT 0 NOT NULL,
	"coupon_id" integer,
	"coupon_code" text,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"phone_normalized" text NOT NULL,
	"email" text,
	"address" text NOT NULL,
	"area" text DEFAULT 'inside_dhaka' NOT NULL,
	"note" text,
	"idempotency_key" text,
	"order_fingerprint" text,
	"client_ip" text,
	"client_ip_hash" text,
	"user_agent" text,
	"fraud_score" integer DEFAULT 0 NOT NULL,
	"fraud_reasons" jsonb DEFAULT '[]' NOT NULL,
	"fraud_status" text DEFAULT 'clear' NOT NULL,
	"courier_cost" integer DEFAULT 0 NOT NULL,
	"packaging_cost" integer DEFAULT 0 NOT NULL,
	"extras_cost" integer DEFAULT 0 NOT NULL,
	"stock_restored" boolean DEFAULT false NOT NULL,
	"source" text DEFAULT 'store' NOT NULL,
	"campaign" text,
	"admin_note" text,
	"confirmed_at" timestamp with time zone,
	"shipped_at" timestamp with time zone,
	"delivered_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "orders_order_number_unique" UNIQUE("order_number"),
	CONSTRAINT "orders_public_token_unique" UNIQUE("public_token"),
	CONSTRAINT "orders_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
CREATE TABLE "payment_methods" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"name_bn" text,
	"adapter" text NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"pending_reason" text,
	"logo_url" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payment_methods_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer NOT NULL,
	"method_key" text DEFAULT 'cod' NOT NULL,
	"amount" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"transaction_id" text,
	"provider_response" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "popup_campaigns" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"scope" text DEFAULT 'store' NOT NULL,
	"landing_page_id" integer,
	"title" text NOT NULL,
	"body" text,
	"image_url" text,
	"cta_label" text,
	"cta_url" text,
	"lead_form_enabled" boolean DEFAULT false NOT NULL,
	"lead_form_label" text,
	"delay_seconds" integer DEFAULT 3 NOT NULL,
	"frequency" text DEFAULT 'once_session' NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"active" boolean DEFAULT false NOT NULL,
	"impressions" integer DEFAULT 0 NOT NULL,
	"leads_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_images" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"url" text NOT NULL,
	"alt" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_reviews" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"order_id" integer,
	"customer_name" text NOT NULL,
	"phone" text NOT NULL,
	"phone_hash" text NOT NULL,
	"rating" integer DEFAULT 5 NOT NULL,
	"comment" text,
	"status" "review_status" DEFAULT 'pending' NOT NULL,
	"is_verified" boolean DEFAULT false NOT NULL,
	"moderation_note" text,
	"ip_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_variants" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"name" text NOT NULL,
	"price_delta" integer DEFAULT 0 NOT NULL,
	"stock" integer DEFAULT 0 NOT NULL,
	"sku" text,
	"active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"category_id" integer,
	"sku" text,
	"short_description" text,
	"description" text,
	"price" integer DEFAULT 0 NOT NULL,
	"compare_at_price" integer,
	"cost_price" integer,
	"stock" integer DEFAULT 0 NOT NULL,
	"low_stock_threshold" integer DEFAULT 5 NOT NULL,
	"track_stock" boolean DEFAULT true NOT NULL,
	"status" "product_status" DEFAULT 'draft' NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	"is_demo" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"view_count" integer DEFAULT 0 NOT NULL,
	"order_count" integer DEFAULT 0 NOT NULL,
	"ingredients" text,
	"dosage" text,
	"warnings" text,
	"storage" text,
	"package_size" text,
	"manufacturer" text,
	"requires_prescription" boolean DEFAULT false NOT NULL,
	"expiry_note" text,
	"meta_title" text,
	"meta_description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "products_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "rate_limits" (
	"id" serial PRIMARY KEY NOT NULL,
	"bucket" text NOT NULL,
	"key_hash" text NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	"window_start" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "site_settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"updated_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tracking_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"platform" text DEFAULT 'meta' NOT NULL,
	"event_name" text NOT NULL,
	"event_id" text NOT NULL,
	"entity_type" text,
	"entity_id" text,
	"order_id" integer,
	"sent_via" text DEFAULT 'queued' NOT NULL,
	"status" "log_status" DEFAULT 'queued' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"payload" jsonb DEFAULT '{}' NOT NULL,
	"sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tracking_events_event_id_unique" UNIQUE("event_id")
);
--> statement-breakpoint
CREATE TABLE "tracking_settings" (
	"platform" text PRIMARY KEY NOT NULL,
	"pixel_id" text,
	"capi_token_encrypted" text,
	"purchase_trigger" text DEFAULT 'confirmed' NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"last_event_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "abandoned_checkouts" ADD CONSTRAINT "abandoned_checkouts_landing_page_id_landing_pages_id_fk" FOREIGN KEY ("landing_page_id") REFERENCES "public"."landing_pages"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coupon_redemptions" ADD CONSTRAINT "coupon_redemptions_coupon_id_coupons_id_fk" FOREIGN KEY ("coupon_id") REFERENCES "public"."coupons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coupon_redemptions" ADD CONSTRAINT "coupon_redemptions_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coupons" ADD CONSTRAINT "coupons_landing_scope_id_landing_pages_id_fk" FOREIGN KEY ("landing_scope_id") REFERENCES "public"."landing_pages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "courier_shipments" ADD CONSTRAINT "courier_shipments_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "courier_shipments" ADD CONSTRAINT "courier_shipments_provider_id_courier_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."courier_providers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "landing_pages" ADD CONSTRAINT "landing_pages_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_landing_page_id_landing_pages_id_fk" FOREIGN KEY ("landing_page_id") REFERENCES "public"."landing_pages"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_status_history" ADD CONSTRAINT "order_status_history_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_landing_page_id_landing_pages_id_fk" FOREIGN KEY ("landing_page_id") REFERENCES "public"."landing_pages"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_coupon_id_coupons_id_fk" FOREIGN KEY ("coupon_id") REFERENCES "public"."coupons"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "popup_campaigns" ADD CONSTRAINT "popup_campaigns_landing_page_id_landing_pages_id_fk" FOREIGN KEY ("landing_page_id") REFERENCES "public"."landing_pages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_reviews" ADD CONSTRAINT "product_reviews_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "abandoned_status_idx" ON "abandoned_checkouts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "abandoned_phone_idx" ON "abandoned_checkouts" USING btree ("phone_normalized");--> statement-breakpoint
CREATE INDEX "audit_created_idx" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "audit_entity_idx" ON "audit_logs" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "banners_active_sort_idx" ON "banners" USING btree ("active","sort_order");--> statement-breakpoint
CREATE INDEX "categories_active_sort_idx" ON "categories" USING btree ("active","sort_order");--> statement-breakpoint
CREATE INDEX "redemptions_coupon_idx" ON "coupon_redemptions" USING btree ("coupon_id");--> statement-breakpoint
CREATE INDEX "redemptions_phone_idx" ON "coupon_redemptions" USING btree ("phone_hash","created_at");--> statement-breakpoint
CREATE INDEX "coupons_active_idx" ON "coupons" USING btree ("active");--> statement-breakpoint
CREATE INDEX "shipments_status_idx" ON "courier_shipments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "customer_accounts_phone_idx" ON "customer_accounts" USING btree ("phone");--> statement-breakpoint
CREATE INDEX "customers_phone_idx" ON "customers" USING btree ("phone");--> statement-breakpoint
CREATE INDEX "landing_status_idx" ON "landing_pages" USING btree ("status");--> statement-breakpoint
CREATE INDEX "leads_created_idx" ON "leads" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "leads_phone_idx" ON "leads" USING btree ("phone_normalized");--> statement-breakpoint
CREATE INDEX "media_folder_idx" ON "media" USING btree ("folder");--> statement-breakpoint
CREATE INDEX "mystery_phone_idx" ON "mystery_offer_claims" USING btree ("phone_normalized");--> statement-breakpoint
CREATE INDEX "notif_status_idx" ON "notification_logs" USING btree ("status","next_attempt_at");--> statement-breakpoint
CREATE INDEX "order_items_order_idx" ON "order_items" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "order_items_product_idx" ON "order_items" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "order_history_order_idx" ON "order_status_history" USING btree ("order_id","created_at");--> statement-breakpoint
CREATE INDEX "orders_phone_idx" ON "orders" USING btree ("phone_normalized");--> statement-breakpoint
CREATE INDEX "orders_status_idx" ON "orders" USING btree ("status");--> statement-breakpoint
CREATE INDEX "orders_created_idx" ON "orders" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "orders_iphash_idx" ON "orders" USING btree ("client_ip_hash");--> statement-breakpoint
CREATE INDEX "orders_fingerprint_idx" ON "orders" USING btree ("order_fingerprint");--> statement-breakpoint
CREATE INDEX "payments_order_idx" ON "payments" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "popups_active_idx" ON "popup_campaigns" USING btree ("active","priority");--> statement-breakpoint
CREATE INDEX "product_images_product_idx" ON "product_images" USING btree ("product_id","sort_order");--> statement-breakpoint
CREATE INDEX "reviews_product_idx" ON "product_reviews" USING btree ("product_id","status");--> statement-breakpoint
CREATE INDEX "reviews_status_idx" ON "product_reviews" USING btree ("status");--> statement-breakpoint
CREATE INDEX "product_variants_product_idx" ON "product_variants" USING btree ("product_id","sort_order");--> statement-breakpoint
CREATE INDEX "products_status_featured_idx" ON "products" USING btree ("status","featured");--> statement-breakpoint
CREATE INDEX "products_category_idx" ON "products" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "products_price_idx" ON "products" USING btree ("price");--> statement-breakpoint
CREATE UNIQUE INDEX "rate_limits_bucket_key_idx" ON "rate_limits" USING btree ("bucket","key_hash");--> statement-breakpoint
CREATE INDEX "tracking_name_idx" ON "tracking_events" USING btree ("event_name","created_at");