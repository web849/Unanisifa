import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_BRAND } from "../../lib/config";
import { directCheckoutUrl, parseDirectCheckoutParams } from "../../lib/cart/direct-checkout";
import { sanitizeLandingHtml } from "../../lib/landing/html";
import {
  CONNECTED_PRODUCT_HTML_TEMPLATE,
  applyLandingHtmlTokens,
} from "../../lib/landing/html-tokens";
import type { LandingProduct } from "../../lib/landing/product-types";

const product: LandingProduct = {
  id: 42,
  name: 'ঝাউপাতা "বিশেষ" <সিরাপ>',
  slug: "jhaupata-syrup",
  price: 450,
  compareAtPrice: 600,
  packageSize: "২০০ মিলি",
  shortDescription: "সংক্ষিপ্ত বিবরণ",
  ingredients: "ঝাউপাতা, মধু",
  dosage: "প্রতিদিন ২ বার",
  image: "/api/media/products/syrup.webp",
  inStock: true,
  requiresPrescription: false,
  status: "active",
  isDemo: false,
};

test("html tokens are filled from the connected product and escaped", () => {
  const html = applyLandingHtmlTokens(
    '<h2>{{product_name}}</h2><p>{{ product_price }} | {{product_old_price}} | {{product_discount_label}}</p>' +
      '<a href="{{order_url}}">অর্ডার</a><a href="{{checkout_url}}">চেকআউট</a>' +
      '<img src="{{product_image}}" alt="{{product_name}}" />',
    { product, brand: DEFAULT_BRAND, couponCode: "EID10" },
  );
  assert.match(html, /ঝাউপাতা &quot;বিশেষ&quot; &lt;সিরাপ&gt;/);
  assert.match(html, /৳৪৫০/);
  assert.match(html, /৳৬০০/);
  assert.match(html, /২৫% ছাড়/);
  assert.match(html, /href="#order_form"/);
  assert.match(html, /href="\/checkout\?buy=42&amp;coupon=EID10"/);
  assert.match(html, /src="\/api\/media\/products\/syrup\.webp"/);
});

test("unknown tokens stay untouched and missing product falls back to safe links", () => {
  const html = applyLandingHtmlTokens(
    '<p>{{unknown_token}}</p><a href="{{product_url}}">x</a><a href="{{checkout_url}}">y</a>',
    { product: null, brand: DEFAULT_BRAND },
  );
  assert.match(html, /\{\{unknown_token\}\}/);
  assert.match(html, /href="\/products"/);
  assert.match(html, /href="\/checkout"/);
});

test("connected template renders through the sanitizer with working links", () => {
  const rendered = sanitizeLandingHtml(
    applyLandingHtmlTokens(CONNECTED_PRODUCT_HTML_TEMPLATE, {
      product,
      brand: DEFAULT_BRAND,
    }),
  );
  assert.doesNotMatch(rendered, /\{\{/);
  assert.match(rendered, /ঝাউপাতা/);
  assert.match(rendered, /href="#order_form"/);
  assert.match(rendered, /href="\/checkout\?buy=42"/);
  assert.match(rendered, /href="\/products\/jhaupata-syrup"/);
  assert.doesNotMatch(rendered, /<script/i);
});

test("direct checkout url and parsing round-trip with clamps", () => {
  assert.equal(directCheckoutUrl(7), "/checkout?buy=7");
  assert.equal(directCheckoutUrl(7, 3, 12), "/checkout?buy=7&qty=3&variant=12");
  assert.equal(
    directCheckoutUrl(7, 1, null, "EID10"),
    "/checkout?buy=7&coupon=EID10",
  );

  assert.deepEqual(parseDirectCheckoutParams(new URLSearchParams("buy=7")), {
    productId: 7,
    variantId: null,
    quantity: 1,
  });
  assert.deepEqual(parseDirectCheckoutParams(new URLSearchParams("buy=7&qty=99&variant=12")), {
    productId: 7,
    variantId: 12,
    quantity: 20,
  });
  assert.equal(parseDirectCheckoutParams(new URLSearchParams("buy=abc")), null);
  assert.equal(parseDirectCheckoutParams(new URLSearchParams("")), null);
});
