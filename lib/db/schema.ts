/**
 * ডেটাবেজ স্কিমা — Drizzle ORM + Neon Postgres (স্পেক সেকশন ৮)
 *
 * মাইগ্রেশন: `npm run db:generate` (drizzle/) → `npm run db:migrate`
 * কোনো রিটার্গেটিং/অডিয়েন্স টেবিল নেই।
 */

import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/* -------------------------------------------------------------------------- */
/* Enum                                                                        */
/* -------------------------------------------------------------------------- */

export const userRole = pgEnum("user_role", ["owner", "admin", "operator", "viewer"]);

export const productStatus = pgEnum("product_status", ["draft", "active", "archived"]);

export const orderStatus = pgEnum("order_status", [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
]);

export const paymentStatus = pgEnum("payment_status", [
  "unpaid",
  "partially_paid",
  "paid",
  "refunded",
  "failed",
]);

export const landingStatus = pgEnum("landing_status", ["draft", "published", "archived"]);

export const logStatus = pgEnum("log_status", ["queued", "processing", "sent", "failed", "skipped"]);

export const couponType = pgEnum("coupon_type", ["percent", "fixed", "free_delivery"]);

export const reviewStatus = pgEnum("review_status", ["pending", "approved", "rejected"]);

/* -------------------------------------------------------------------------- */
/* অ্যাডমিন ও কাস্টমার অ্যাকাউন্ট                                                */
/* -------------------------------------------------------------------------- */

export const adminUsers = pgTable("admin_users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: userRole("role").notNull().default("owner"),
  /** পাসওয়ার্ড বদলালে authVersion বাড়ে → সব সেশন ড্রপ হয়ে যায় */
  authVersion: integer("auth_version").notNull().default(1),
  isActive: boolean("is_active").notNull().default(true),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  lastLoginIpHash: text("last_login_ip_hash"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const customerAccounts = pgTable(
  "customer_accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** নরমালাইজড মোবাইল (01XXXXXXXXX) — একাই লগইন আইডেন্টিটি */
    phone: text("phone").notNull().unique(),
    phoneHash: text("phone_hash").notNull(),
    email: text("email"),
    name: text("name"),
    passwordHash: text("password_hash"),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("customer_accounts_phone_idx").on(t.phone)],
);

/* -------------------------------------------------------------------------- */
/* ক্যাটাগরি, পণ্য, ভ্যারিয়েন্ট, ছবি                                              */
/* -------------------------------------------------------------------------- */

export const categories = pgTable(
  "categories",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    description: text("description"),
    coverImage: text("cover_image"),
    /** lucide আইকনের নাম (স্পেক ৬ক — ক্যাটাগরি আইকন ম্যাপ) */
    icon: text("icon"),
    active: boolean("active").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    isDemo: boolean("is_demo").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("categories_active_sort_idx").on(t.active, t.sortOrder)],
);

export const products = pgTable(
  "products",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    categoryId: integer("category_id").references(() => categories.id, {
      onDelete: "set null",
    }),
    sku: text("sku"),
    shortDescription: text("short_description"),
    description: text("description"),

    /* ---- সার্ভার-অথরিটেটিভ প্রাইসিং ---- */
    price: integer("price").notNull().default(0),
    compareAtPrice: integer("compare_at_price"),
    costPrice: integer("cost_price"),
    stock: integer("stock").notNull().default(0),
    lowStockThreshold: integer("low_stock_threshold").notNull().default(5),
    trackStock: boolean("track_stock").notNull().default(true),

    status: productStatus("status").notNull().default("draft"),
    featured: boolean("featured").notNull().default(false),
    isDemo: boolean("is_demo").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    viewCount: integer("view_count").notNull().default(0),
    orderCount: integer("order_count").notNull().default(0),

    /* ---- ওষুধের বাধ্যতামূলক অতিরিক্ত তথ্য ---- */
    ingredients: text("ingredients"),
    dosage: text("dosage"),
    warnings: text("warnings"),
    storage: text("storage"),
    packageSize: text("package_size"),
    manufacturer: text("manufacturer"),
    requiresPrescription: boolean("requires_prescription").notNull().default(false),
    expiryNote: text("expiry_note"),

    /* ---- SEO ---- */
    metaTitle: text("meta_title"),
    metaDescription: text("meta_description"),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("products_status_featured_idx").on(t.status, t.featured),
    index("products_category_idx").on(t.categoryId),
    index("products_price_idx").on(t.price),
  ],
);

export const productImages = pgTable(
  "product_images",
  {
    id: serial("id").primaryKey(),
    productId: integer("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    alt: text("alt"),
    sortOrder: integer("sort_order").notNull().default(0),
    isPrimary: boolean("is_primary").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("product_images_product_idx").on(t.productId, t.sortOrder)],
);

export const productVariants = pgTable(
  "product_variants",
  {
    id: serial("id").primaryKey(),
    productId: integer("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    priceDelta: integer("price_delta").notNull().default(0),
    stock: integer("stock").notNull().default(0),
    sku: text("sku"),
    active: boolean("active").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("product_variants_product_idx").on(t.productId, t.sortOrder)],
);

/* -------------------------------------------------------------------------- */
/* কাস্টমার (অর্ডার থেকে তৈরি প্রোফাইল)                                           */
/* -------------------------------------------------------------------------- */

export const customers = pgTable(
  "customers",
  {
    id: serial("id").primaryKey(),
    phone: text("phone").notNull().unique(),
    phoneHash: text("phone_hash").notNull(),
    name: text("name"),
    email: text("email"),
    address: text("address"),
    area: text("area"),
    orderCount: integer("order_count").notNull().default(0),
    deliveredCount: integer("delivered_count").notNull().default(0),
    cancelledCount: integer("cancelled_count").notNull().default(0),
    returnedCount: integer("returned_count").notNull().default(0),
    totalSpent: integer("total_spent").notNull().default(0),
    successRate: integer("success_rate").notNull().default(0),
    blocked: boolean("blocked").notNull().default(false),
    note: text("note"),
    lastOrderAt: timestamp("last_order_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("customers_phone_idx").on(t.phone)],
);

/* -------------------------------------------------------------------------- */
/* অর্ডার ইঞ্জিন                                                                 */
/* -------------------------------------------------------------------------- */

export const orders = pgTable(
  "orders",
  {
    id: serial("id").primaryKey(),
    /** US261018-A1B2C3D ফরম্যাট */
    orderNumber: text("order_number").notNull().unique(),
    /** ৪ অক্ষরের হেক্স — পাবলিক ট্র্যাকিং লিংক */
    publicToken: text("public_token").notNull().unique(),
    customerId: integer("customer_id").references(() => customers.id, {
      onDelete: "set null",
    }),
    landingPageId: integer("landing_page_id").references(() => landingPages.id, {
      onDelete: "set null",
    }),
    status: orderStatus("status").notNull().default("pending"),
    paymentStatus: paymentStatus("payment_status").notNull().default("unpaid"),
    paymentMethod: text("payment_method").notNull().default("cod"),

    /* ---- সার্ভারে হিসাব করা টাকা ---- */
    subtotal: integer("subtotal").notNull().default(0),
    discount: integer("discount").notNull().default(0),
    deliveryCharge: integer("delivery_charge").notNull().default(0),
    total: integer("total").notNull().default(0),
    advance: integer("advance").notNull().default(0),
    dueAmount: integer("due_amount").notNull().default(0),

    couponId: integer("coupon_id").references(() => coupons.id, { onDelete: "set null" }),
    couponCode: text("coupon_code"),

    /* ---- কাস্টমার তথ্য ---- */
    name: text("name").notNull(),
    phone: text("phone").notNull(),
    phoneNormalized: text("phone_normalized").notNull(),
    email: text("email"),
    address: text("address").notNull(),
    area: text("area").notNull().default("inside_dhaka"),
    note: text("note"),

    /* ---- idempotency ও ডুপ্লিকেট ব্লক ---- */
    idempotencyKey: text("idempotency_key").unique(),
    orderFingerprint: text("order_fingerprint"),

    /* ---- ফ্রড ও IP ---- */
    clientIp: text("client_ip"),
    clientIpHash: text("client_ip_hash"),
    userAgent: text("user_agent"),
    fraudScore: integer("fraud_score").notNull().default(0),
    fraudReasons: jsonb("fraud_reasons").notNull().default("[]"),
    fraudStatus: text("fraud_status").notNull().default("clear"),

    /* ---- খরচের স্ন্যাপশট (রিপোর্টের জন্য) ---- */
    courierCost: integer("courier_cost").notNull().default(0),
    packagingCost: integer("packaging_cost").notNull().default(0),
    extrasCost: integer("extras_cost").notNull().default(0),

    /** ক্যানসেলে স্টক একবারই ফেরত যাবে */
    stockRestored: boolean("stock_restored").notNull().default(false),
    source: text("source").notNull().default("store"),
    campaign: text("campaign"),
    adminNote: text("admin_note"),

    confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
    shippedAt: timestamp("shipped_at", { withTimezone: true }),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("orders_phone_idx").on(t.phoneNormalized),
    index("orders_status_idx").on(t.status),
    index("orders_created_idx").on(t.createdAt),
    index("orders_iphash_idx").on(t.clientIpHash),
    index("orders_fingerprint_idx").on(t.orderFingerprint),
  ],
);

export const orderItems = pgTable(
  "order_items",
  {
    id: serial("id").primaryKey(),
    orderId: integer("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    productId: integer("product_id").references(() => products.id, { onDelete: "set null" }),
    variantId: integer("variant_id").references(() => productVariants.id, {
      onDelete: "set null",
    }),
    /* ---- স্ন্যাপশট: পরে পণ্যের দাম বদলালেও অর্ডারের হিসাব বদলাবে না ---- */
    productName: text("product_name").notNull(),
    variantName: text("variant_name"),
    sku: text("sku"),
    imageUrl: text("image_url"),
    unitPrice: integer("unit_price").notNull(),
    compareAtPrice: integer("compare_at_price"),
    costPrice: integer("cost_price"),
    quantity: integer("quantity").notNull().default(1),
    lineTotal: integer("line_total").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("order_items_order_idx").on(t.orderId), index("order_items_product_idx").on(t.productId)],
);

export const orderStatusHistory = pgTable(
  "order_status_history",
  {
    id: serial("id").primaryKey(),
    orderId: integer("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    fromStatus: orderStatus("from_status"),
    toStatus: orderStatus("to_status").notNull(),
    note: text("note"),
    actor: text("actor").notNull().default("system"),
    actorUserId: uuid("actor_user_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("order_history_order_idx").on(t.orderId, t.createdAt)],
);

/* -------------------------------------------------------------------------- */
/* কুপন                                                                        */
/* -------------------------------------------------------------------------- */

export const coupons = pgTable(
  "coupons",
  {
    id: serial("id").primaryKey(),
    code: text("code").notNull().unique(),
    title: text("title").notNull(),
    type: couponType("type").notNull().default("percent"),
    /** percent হলে শতাংশ, fixed হলে টাকা, free_delivery হলে সর্বোচ্চ ওয়েভার */
    value: integer("value").notNull().default(0),
    minSubtotal: integer("min_subtotal").notNull().default(0),
    maxDiscount: integer("max_discount"),
    usageLimit: integer("usage_limit"),
    perPhoneLimit: integer("per_phone_limit"),
    usedCount: integer("used_count").notNull().default(0),
    startsAt: timestamp("starts_at", { withTimezone: true }),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    /** null = সব পেজ; সেট থাকলে শুধু ওই ল্যান্ডিং পেজে প্রযোজ্য */
    landingScopeId: integer("landing_scope_id").references(() => landingPages.id, {
      onDelete: "cascade",
    }),
    showOnCheckout: boolean("show_on_checkout").notNull().default(false),
    active: boolean("active").notNull().default(true),
    description: text("description"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("coupons_active_idx").on(t.active)],
);

export const couponRedemptions = pgTable(
  "coupon_redemptions",
  {
    id: serial("id").primaryKey(),
    couponId: integer("coupon_id")
      .notNull()
      .references(() => coupons.id, { onDelete: "cascade" }),
    orderId: integer("order_id").references(() => orders.id, { onDelete: "set null" }),
    phone: text("phone").notNull(),
    phoneHash: text("phone_hash").notNull(),
    ipHash: text("ip_hash"),
    amount: integer("amount").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("redemptions_coupon_idx").on(t.couponId),
    index("redemptions_phone_idx").on(t.phoneHash, t.createdAt),
  ],
);

/* -------------------------------------------------------------------------- */
/* রিভিউ                                                                       */
/* -------------------------------------------------------------------------- */

export const productReviews = pgTable(
  "product_reviews",
  {
    id: serial("id").primaryKey(),
    productId: integer("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    orderId: integer("order_id"),
    customerName: text("customer_name").notNull(),
    phone: text("phone").notNull(),
    phoneHash: text("phone_hash").notNull(),
    rating: integer("rating").notNull().default(5),
    comment: text("comment"),
    status: reviewStatus("status").notNull().default("pending"),
    isVerified: boolean("is_verified").notNull().default(false),
    moderationNote: text("moderation_note"),
    ipHash: text("ip_hash"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("reviews_product_idx").on(t.productId, t.status),
    index("reviews_status_idx").on(t.status),
  ],
);

/* -------------------------------------------------------------------------- */
/* ল্যান্ডিং পেজ ও থিম                                                             */
/* -------------------------------------------------------------------------- */

export const landingPages = pgTable(
  "landing_pages",
  {
    id: serial("id").primaryKey(),
    title: text("title").notNull(),
    slug: text("slug").notNull().unique(),
    productId: integer("product_id").references(() => products.id, { onDelete: "set null" }),
    status: landingStatus("status").notNull().default("draft"),
    themeSlug: text("theme_slug").notNull().default("emerald"),
    /** সেকশন লিস্ট — lib/landing/sections.ts-এর স্কিমা অনুযায়ী */
    sections: jsonb("sections").notNull().default("[]"),
    metaTitle: text("meta_title"),
    metaDescription: text("meta_description"),
    couponCode: text("coupon_code"),
    /** চেকআউট পেজে দেখানোর জন্য নির্বাচিত অফার (পণ্য আইডি লিস্ট) */
    checkoutOffers: jsonb("checkout_offers").notNull().default("[]"),
    thankYouOffers: jsonb("thank_you_offers").notNull().default("[]"),
    viewCount: integer("view_count").notNull().default(0),
    orderCount: integer("order_count").notNull().default(0),
    isDemo: boolean("is_demo").notNull().default(false),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("landing_status_idx").on(t.status)],
);

export const landingThemes = pgTable("landing_themes", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  tokens: jsonb("tokens").notNull().default("{}"),
  isCustom: boolean("is_custom").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/* -------------------------------------------------------------------------- */
/* ব্যানার, পপআপ, লিড, মিস্ট্রি অফার, অ্যাবান্ডনড                                  */
/* -------------------------------------------------------------------------- */

export const banners = pgTable(
  "banners",
  {
    id: serial("id").primaryKey(),
    title: text("title").notNull(),
    imageUrl: text("image_url").notNull(),
    linkUrl: text("link_url"),
    altText: text("alt_text"),
    active: boolean("active").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    isDemo: boolean("is_demo").notNull().default(false),
    startsAt: timestamp("starts_at", { withTimezone: true }),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("banners_active_sort_idx").on(t.active, t.sortOrder)],
);

export const popupCampaigns = pgTable(
  "popup_campaigns",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    /** "store" = স্টোর-ওয়াইড; landing হলে landingPageId সেট থাকবে */
    scope: text("scope").notNull().default("store"),
    landingPageId: integer("landing_page_id").references(() => landingPages.id, {
      onDelete: "cascade",
    }),
    title: text("title").notNull(),
    body: text("body"),
    imageUrl: text("image_url"),
    ctaLabel: text("cta_label"),
    ctaUrl: text("cta_url"),
    leadFormEnabled: boolean("lead_form_enabled").notNull().default(false),
    leadFormLabel: text("lead_form_label"),
    delaySeconds: integer("delay_seconds").notNull().default(3),
    frequency: text("frequency").notNull().default("once_session"),
    priority: integer("priority").notNull().default(0),
    startsAt: timestamp("starts_at", { withTimezone: true }),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    active: boolean("active").notNull().default(false),
    impressions: integer("impressions").notNull().default(0),
    leadsCount: integer("leads_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("popups_active_idx").on(t.active, t.priority)],
);

export const leads = pgTable(
  "leads",
  {
    id: serial("id").primaryKey(),
    name: text("name"),
    phone: text("phone"),
    phoneNormalized: text("phone_normalized"),
    phoneHash: text("phone_hash"),
    email: text("email"),
    source: text("source").notNull().default("popup"),
    popupLabel: text("popup_label"),
    landingPageId: integer("landing_page_id").references(() => landingPages.id, {
      onDelete: "set null",
    }),
    campaign: text("campaign"),
    smsConsent: boolean("sms_consent").notNull().default(false),
    ipHash: text("ip_hash"),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("leads_created_idx").on(t.createdAt), index("leads_phone_idx").on(t.phoneNormalized)],
);

export const mysteryOfferClaims = pgTable(
  "mystery_offer_claims",
  {
    id: serial("id").primaryKey(),
    phone: text("phone").notNull().unique(),
    phoneNormalized: text("phone_normalized").notNull(),
    phoneHash: text("phone_hash").notNull(),
    name: text("name"),
    couponCode: text("coupon_code").notNull(),
    claimedAt: timestamp("claimed_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    landingPageId: integer("landing_page_id"),
    ipHash: text("ip_hash"),
  },
  (t) => [index("mystery_phone_idx").on(t.phoneNormalized)],
);

export const abandonedCheckouts = pgTable(
  "abandoned_checkouts",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    phone: text("phone").notNull(),
    phoneNormalized: text("phone_normalized").notNull(),
    address: text("address"),
    area: text("area"),
    email: text("email"),
    cartSnapshot: jsonb("cart_snapshot").notNull().default("[]"),
    subtotal: integer("subtotal").notNull().default(0),
    couponCode: text("coupon_code"),
    landingPageId: integer("landing_page_id").references(() => landingPages.id, {
      onDelete: "set null",
    }),
    status: text("status").notNull().default("open"),
    recoveredOrderId: integer("recovered_order_id"),
    ipHash: text("ip_hash"),
    userAgent: text("user_agent"),
    lastTouchAt: timestamp("last_touch_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("abandoned_status_idx").on(t.status),
    index("abandoned_phone_idx").on(t.phoneNormalized),
  ],
);

/* -------------------------------------------------------------------------- */
/* ফ্রড ও নেটওয়ার্ক                                                               */
/* -------------------------------------------------------------------------- */

export const blockedNetworks = pgTable("blocked_networks", {
  id: serial("id").primaryKey(),
  ipHash: text("ip_hash").notNull().unique(),
  ipLabel: text("ip_label"),
  reason: text("reason"),
  active: boolean("active").notNull().default(true),
  orderCountAtBlock: integer("order_count_at_block").notNull().default(0),
  blockedBy: uuid("blocked_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  releasedAt: timestamp("released_at", { withTimezone: true }),
});

/* -------------------------------------------------------------------------- */
/* পেমেন্ট                                                                       */
/* -------------------------------------------------------------------------- */

export const paymentMethods = pgTable("payment_methods", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  name: text("name").notNull(),
  nameBn: text("name_bn"),
  adapter: text("adapter").notNull(),
  enabled: boolean("enabled").notNull().default(false),
  isDefault: boolean("is_default").notNull().default(false),
  /** ক্রেডেনশিয়াল থাকবে credential_secrets-এ — এখানে নয় */
  pendingReason: text("pending_reason"),
  logoUrl: text("logo_url"),
  sortOrder: integer("sort_order").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const payments = pgTable(
  "payments",
  {
    id: serial("id").primaryKey(),
    orderId: integer("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    methodKey: text("method_key").notNull().default("cod"),
    amount: integer("amount").notNull().default(0),
    status: text("status").notNull().default("pending"),
    transactionId: text("transaction_id"),
    providerResponse: jsonb("provider_response"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("payments_order_idx").on(t.orderId)],
);

/* -------------------------------------------------------------------------- */
/* কুরিয়ার                                                                       */
/* -------------------------------------------------------------------------- */

export const courierProviders = pgTable("courier_providers", {
  id: serial("id").primaryKey(),
  adapter: text("adapter").notNull().unique(),
  name: text("name").notNull(),
  /** এনক্রিপ্টেড ক্রেডেনশিয়াল — credential_secrets টেবিলেও থাকতে পারে; এখানে AES-GCM সাইফারটেক্সট */
  credentialsEncrypted: text("credentials_encrypted"),
  enabled: boolean("enabled").notNull().default(false),
  isDefault: boolean("is_default").notNull().default(false),
  lastConnectionStatus: text("last_connection_status"),
  lastConnectionAt: timestamp("last_connection_at", { withTimezone: true }),
  lastError: text("last_error"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const courierShipments = pgTable(
  "courier_shipments",
  {
    id: serial("id").primaryKey(),
    orderId: integer("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" })
      .unique(),
    providerId: integer("provider_id").references(() => courierProviders.id, {
      onDelete: "set null",
    }),
    consignmentId: text("consignment_id"),
    trackingNumber: text("tracking_number"),
    status: text("status").notNull().default("not_sent"),
    lastError: text("last_error"),
    providerResponse: jsonb("provider_response"),
    handedOverAt: timestamp("handed_over_at", { withTimezone: true }),
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("shipments_status_idx").on(t.status)],
);

/* -------------------------------------------------------------------------- */
/* মিডিয়া, সেটিংস, সিক্রেট ভল্ট                                                     */
/* -------------------------------------------------------------------------- */

export const media = pgTable(
  "media",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    objectKey: text("object_key").notNull().unique(),
    url: text("url").notNull(),
    mimeType: text("mime_type").notNull(),
    sizeBytes: integer("size_bytes").notNull().default(0),
    width: integer("width"),
    height: integer("height"),
    folder: text("folder").notNull().default("products"),
    alt: text("alt"),
    uploadedBy: uuid("uploaded_by"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("media_folder_idx").on(t.folder)],
);

export const siteSettings = pgTable("site_settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  updatedBy: uuid("updated_by"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * ক্রেডেনশিয়াল ভল্ট — AES-256-GCM।
 * সিক্রেট কখনো ব্রাউজারে যায় না; API শুধু "সেট করা আছে / নেই" ফেরত দেয়।
 */
export const credentialSecrets = pgTable("credential_secrets", {
  key: text("key").primaryKey(),
  algorithm: text("algorithm").notNull().default("aes-256-gcm"),
  ciphertext: text("ciphertext").notNull(),
  iv: text("iv").notNull(),
  authTag: text("auth_tag").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/* -------------------------------------------------------------------------- */
/* নোটিফিকেশন ও ট্র্যাকিং                                                           */
/* -------------------------------------------------------------------------- */

export const notificationSettings = pgTable("notification_settings", {
  channel: text("channel").primaryKey(),
  enabled: boolean("enabled").notNull().default(false),
  /** কোন কোন ইভেন্টে নোটিফিকেশন যাবে */
  events: jsonb("events").notNull().default("[]"),
  lastTestAt: timestamp("last_test_at", { withTimezone: true }),
  lastTestStatus: text("last_test_status"),
  lastTestError: text("last_test_error"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const notificationLogs = pgTable(
  "notification_logs",
  {
    id: serial("id").primaryKey(),
    channel: text("channel").notNull(),
    event: text("event").notNull(),
    entityType: text("entity_type"),
    entityId: text("entity_id"),
    idempotencyKey: text("idempotency_key").notNull().unique(),
    status: logStatus("status").notNull().default("queued"),
    attempts: integer("attempts").notNull().default(0),
    maxAttempts: integer("max_attempts").notNull().default(5),
    nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true }),
    lastError: text("last_error"),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    payload: jsonb("payload").notNull().default("{}"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("notif_status_idx").on(t.status, t.nextAttemptAt)],
);

export const trackingSettings = pgTable("tracking_settings", {
  platform: text("platform").primaryKey(),
  pixelId: text("pixel_id"),
  capiTokenEncrypted: text("capi_token_encrypted"),
  /** "confirmed" (ডিফল্ট) বা "delivered" */
  purchaseTrigger: text("purchase_trigger").notNull().default("confirmed"),
  enabled: boolean("enabled").notNull().default(false),
  lastEventAt: timestamp("last_event_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const trackingEvents = pgTable(
  "tracking_events",
  {
    id: serial("id").primaryKey(),
    platform: text("platform").notNull().default("meta"),
    eventName: text("event_name").notNull(),
    /** Pixel ও CAPI — একই event_id দিয়ে ডিডুপ */
    eventId: text("event_id").notNull().unique(),
    entityType: text("entity_type"),
    entityId: text("entity_id"),
    orderId: integer("order_id"),
    sentVia: text("sent_via").notNull().default("queued"),
    status: logStatus("status").notNull().default("queued"),
    attempts: integer("attempts").notNull().default(0),
    lastError: text("last_error"),
    payload: jsonb("payload").notNull().default("{}"),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("tracking_name_idx").on(t.eventName, t.createdAt)],
);

/* -------------------------------------------------------------------------- */
/* CMS পেজ, রেট লিমিট, অডিট                                                       */
/* -------------------------------------------------------------------------- */

export const cmsPages = pgTable("cms_pages", {
  slug: text("slug").primaryKey(),
  title: text("title").notNull(),
  body: text("body").notNull().default(""),
  metaTitle: text("meta_title"),
  metaDescription: text("meta_description"),
  showInFooter: boolean("show_in_footer").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  isDemo: boolean("is_demo").notNull().default(false),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const rateLimits = pgTable(
  "rate_limits",
  {
    id: serial("id").primaryKey(),
    bucket: text("bucket").notNull(),
    keyHash: text("key_hash").notNull(),
    count: integer("count").notNull().default(0),
    windowStart: timestamp("window_start", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (t) => [uniqueIndex("rate_limits_bucket_key_idx").on(t.bucket, t.keyHash)],
);

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: serial("id").primaryKey(),
    actorType: text("actor_type").notNull().default("system"),
    actorId: text("actor_id"),
    actorName: text("actor_name"),
    action: text("action").notNull(),
    entityType: text("entity_type"),
    entityId: text("entity_id"),
    ipHash: text("ip_hash"),
    meta: jsonb("meta").notNull().default("{}"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("audit_created_idx").on(t.createdAt), index("audit_entity_idx").on(t.entityType, t.entityId)],
);

/* -------------------------------------------------------------------------- */
/* টাইপ এক্সপোর্ট                                                                  */
/* -------------------------------------------------------------------------- */

export type AdminUser = typeof adminUsers.$inferSelect;
export type NewAdminUser = typeof adminUsers.$inferInsert;
export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
export type ProductImage = typeof productImages.$inferSelect;
export type ProductVariant = typeof productVariants.$inferSelect;
export type Customer = typeof customers.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;
export type OrderItem = typeof orderItems.$inferSelect;
export type OrderStatusHistoryRow = typeof orderStatusHistory.$inferSelect;
export type Coupon = typeof coupons.$inferSelect;
export type CouponRedemption = typeof couponRedemptions.$inferSelect;
export type ProductReview = typeof productReviews.$inferSelect;
export type LandingPage = typeof landingPages.$inferSelect;
export type NewLandingPage = typeof landingPages.$inferInsert;
export type LandingTheme = typeof landingThemes.$inferSelect;
export type Banner = typeof banners.$inferSelect;
export type PopupCampaign = typeof popupCampaigns.$inferSelect;
export type Lead = typeof leads.$inferSelect;
export type MysteryOfferClaim = typeof mysteryOfferClaims.$inferSelect;
export type AbandonedCheckout = typeof abandonedCheckouts.$inferSelect;
export type BlockedNetwork = typeof blockedNetworks.$inferSelect;
export type PaymentMethod = typeof paymentMethods.$inferSelect;
export type Payment = typeof payments.$inferSelect;
export type CourierProvider = typeof courierProviders.$inferSelect;
export type CourierShipment = typeof courierShipments.$inferSelect;
export type MediaRow = typeof media.$inferSelect;
export type SiteSettingRow = typeof siteSettings.$inferSelect;
export type NotificationLog = typeof notificationLogs.$inferSelect;
export type NotificationSetting = typeof notificationSettings.$inferSelect;
export type TrackingEvent = typeof trackingEvents.$inferSelect;
export type TrackingSetting = typeof trackingSettings.$inferSelect;
export type CmsPage = typeof cmsPages.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;
