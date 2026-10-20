/**
 * কাস্টম HTML ব্লকের ডায়নামিক টোকেন ও কানেক্টেড ফরম্যাট।
 *
 * অ্যাডমিন HTML-এ {{product_name}}, {{product_price}}, {{checkout_url}}
 * জাতীয় টোকেন লিখলে পাবলিক পেজ ও বিল্ডার প্রিভিউতে সেগুলো ল্যান্ডিং
 * পেজের নির্বাচিত পণ্যের আসল নাম/দাম/ছবি/লিংক দিয়ে বদলে যায়। ফলে
 * নিজের হাতে HTML সাজিয়েও পণ্য ও অর্ডার/চেকআউট পুরোপুরি কানেক্ট থাকে —
 * দাম বা ছবি বদলালে HTML আবার এডিট করতে হয় না।
 *
 * দুটি কমার্স লিংক:
 *  - {{order_url}}     = একই পেজের Order Form ব্লক (#order_form) — COD অর্ডার
 *  - {{checkout_url}}  = /checkout?buy=<id> — কার্টে যোগ হয়ে চেকআউট পেজ
 */

import { DEFAULT_BRAND, MEDICAL_DISCLAIMER, type BrandSettings } from "../config";
import { directCheckoutUrl } from "../cart/direct-checkout";
import { phoneDisplay, telLink, whatsappLink, whatsappProductMessage } from "../contact-links";
import { escapeHtmlAttr } from "../media/snippet";
import { discountPercent, formatTaka, toBanglaDigits } from "../utils";
import type { LandingProduct } from "./product-types";

export type LandingHtmlTokenContext = {
  product: LandingProduct | null;
  brand?: BrandSettings;
  couponCode?: string | null;
};

/** এডিটরের টোকেন তালিকায় দেখানোর জন্য গাইড */
export const LANDING_HTML_TOKEN_GUIDE: Array<{ token: string; label: string }> = [
  { token: "{{product_name}}", label: "পণ্যের নাম" },
  { token: "{{product_image}}", label: "পণ্যের ছবির URL (img src-তে)" },
  { token: "{{product_price}}", label: "বর্তমান দাম (৳সহ)" },
  { token: "{{product_old_price}}", label: "আগের দাম (থাকলে)" },
  { token: "{{product_discount_label}}", label: "ছাড়ের লেবেল (যেমন ১৬% ছাড়)" },
  { token: "{{product_package}}", label: "প্যাকেজ সাইজ" },
  { token: "{{product_description}}", label: "সংক্ষিপ্ত বিবরণ" },
  { token: "{{product_ingredients}}", label: "উপাদান" },
  { token: "{{product_dosage}}", label: "ডোজ ও সেবনবিধি" },
  { token: "{{product_stock_label}}", label: "স্টক অবস্থা" },
  { token: "{{product_url}}", label: "পণ্য পেজের লিংক" },
  { token: "{{order_url}}", label: "এই পেজের অর্ডার ফর্মের লিংক" },
  { token: "{{checkout_url}}", label: "কার্টে যোগ করে চেকআউটের লিংক" },
  { token: "{{coupon_code}}", label: "পেজের কুপন কোড (থাকলে)" },
  { token: "{{whatsapp_url}}", label: "WhatsApp লিংক (পণ্যের বার্তাসহ)" },
  { token: "{{phone}}", label: "ফোন নম্বর (দেখানোর জন্য)" },
  { token: "{{phone_url}}", label: "tel: কল লিংক" },
  { token: "{{brand_name}}", label: "ব্র্যান্ডের নাম" },
  { token: "{{medical_disclaimer}}", label: "চিকিৎসা ডিসক্লেইমার" },
];

/**
 * পণ্য ও চেকআউট কানেক্টেড পুরো HTML ফরম্যাট।
 * নতুন HTML ব্লক যোগ করলেই এটি ডিফল্ট হিসেবে আসে — লেখা ও style বদলে
 * নিজের মতো সাজানো যাবে; টোকেনগুলো থাকলেই পণ্য/দাম/লিংক অটো আপডেট হবে।
 */
export const CONNECTED_PRODUCT_HTML_TEMPLATE = [
  "<!--",
  "কানেক্টেড প্রোডাক্ট HTML ফরম্যাট (এই কমেন্ট পাবলিক পেজে দেখা যাবে না)",
  "রাখতেই হবে: Page settings এ Main product নির্বাচন, পেজে একটি Order Form ব্লক,",
  "আর নিচের টোকেনগুলো (নাম, দাম, ছবি ও লিংক নিজে থেকে বসে যাবে)।",
  "নিজের R2 ছবি চাইলে img এর src বদলান, অথবা মিডিয়া প্যানেল থেকে আরও ছবি বসান।",
  "script, form, iframe ও style ট্যাগ চলবে না; শুধু ইনলাইন style ব্যবহার করুন।",
  "-->",
  '<section style="max-width:920px;margin:0 auto;padding:24px;border:1px solid #e4e0d3;border-radius:18px;background:#ffffff">',
  '  <div style="display:grid;gap:22px;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));align-items:center">',
  "    <div>",
  '      <img src="{{product_image}}" alt="{{product_name}}" style="width:100%;height:auto;border-radius:14px;border:1px solid #e4e0d3;display:block" />',
  "    </div>",
  "    <div>",
  '      <p style="margin:0 0 8px;color:#b38f1f;font-weight:700">বিশেষ অফার {{product_discount_label}}</p>',
  '      <h2 style="margin:0 0 8px;color:#073a2e;font-size:30px;line-height:1.3">{{product_name}}</h2>',
  '      <p style="margin:0 0 10px;color:#5b6b64">প্যাকেজ: {{product_package}}</p>',
  '      <p style="margin:0 0 14px;color:#34463d">{{product_description}}</p>',
  '      <p style="margin:0 0 6px">',
  '        <strong style="color:#073a2e;font-size:28px">{{product_price}}</strong>',
  '        <s style="color:#8a968f;margin-left:8px">{{product_old_price}}</s>',
  "      </p>",
  '      <p style="margin:0 0 16px;color:#5b6b64">{{product_stock_label}} · সারাদেশে ক্যাশ অন ডেলিভারি</p>',
  '      <div style="display:flex;gap:10px;flex-wrap:wrap;margin:0 0 14px">',
  '        <a href="{{order_url}}" style="display:inline-block;padding:13px 22px;border-radius:10px;background:#0b5d4a;color:#ffffff;text-decoration:none;font-weight:700">এখনই অর্ডার করুন</a>',
  '        <a href="{{checkout_url}}" style="display:inline-block;padding:13px 22px;border-radius:10px;border:1px solid #0b5d4a;color:#073a2e;text-decoration:none;font-weight:700">Checkout থেকে কিনুন</a>',
  "      </div>",
  '      <p style="margin:0;color:#5b6b64">',
  '        <a href="{{product_url}}" style="color:#0b5d4a">পণ্যের বিস্তারিত দেখুন</a>',
  "        ·",
  '        <a href="{{whatsapp_url}}" style="color:#0b5d4a">WhatsApp এ জিজ্ঞেস করুন</a>',
  "        ·",
  '        <a href="{{phone_url}}" style="color:#0b5d4a">কল করুন: {{phone}}</a>',
  "      </p>",
  "    </div>",
  "  </div>",
  '  <div style="display:grid;gap:14px;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));margin-top:22px">',
  '    <div style="padding:16px;border:1px solid #e4e0d3;border-radius:12px">',
  '      <h3 style="margin:0 0 8px;color:#073a2e">কেন এই পণ্য</h3>',
  '      <ul style="margin:0;padding-left:20px;color:#34463d">',
  "        <li>যাচাইযোগ্য বৈশিষ্ট্য এক লিখুন</li>",
  "        <li>যাচাইযোগ্য বৈশিষ্ট্য দুই লিখুন</li>",
  "        <li>যাচাইযোগ্য বৈশিষ্ট্য তিন লিখুন</li>",
  "      </ul>",
  "    </div>",
  '    <div style="padding:16px;border:1px solid #e4e0d3;border-radius:12px">',
  '      <h3 style="margin:0 0 8px;color:#073a2e">উপাদান</h3>',
  '      <p style="margin:0;color:#34463d;white-space:pre-line">{{product_ingredients}}</p>',
  "    </div>",
  '    <div style="padding:16px;border:1px solid #e4e0d3;border-radius:12px">',
  '      <h3 style="margin:0 0 8px;color:#073a2e">ডোজ ও সেবনবিধি</h3>',
  '      <p style="margin:0;color:#34463d;white-space:pre-line">{{product_dosage}}</p>',
  "    </div>",
  "  </div>",
  '  <p style="margin:18px 0 0;padding:14px 16px;border-radius:10px;background:#f3f7f4;color:#34463d">পণ্য হাতে পেয়ে লেবেল ও মেয়াদ দেখে তারপর পরিশোধ করুন। {{medical_disclaimer}}</p>',
  "</section>",
].join("\n");

function tokenValues(context: LandingHtmlTokenContext): Record<string, string> {
  const brand = context.brand ?? DEFAULT_BRAND;
  const product = context.product;
  const discount = product ? discountPercent(product.price, product.compareAtPrice) : 0;
  const productUrl = product ? `/products/${encodeURIComponent(product.slug)}` : "/products";
  const checkoutUrl = product
    ? directCheckoutUrl(product.id, 1, null, context.couponCode)
    : "/checkout";
  const whatsappUrl = product
    ? whatsappLink(brand, whatsappProductMessage(product.name, formatTaka(product.price)))
    : whatsappLink(brand);

  return {
    product_name: product?.name ?? "",
    "product.name": product?.name ?? "",
    product_id: product ? String(product.id) : "",
    product_slug: product?.slug ?? "",
    product_image: product?.image ?? "",
    product_image_url: product?.image ?? "",
    product_price: product ? formatTaka(product.price) : "",
    product_old_price:
      product?.compareAtPrice && product.compareAtPrice > product.price
        ? formatTaka(product.compareAtPrice)
        : "",
    product_compare_price:
      product?.compareAtPrice && product.compareAtPrice > product.price
        ? formatTaka(product.compareAtPrice)
        : "",
    product_discount_percent: discount > 0 ? `${toBanglaDigits(discount)}%` : "",
    product_discount_label: discount > 0 ? `${toBanglaDigits(discount)}% ছাড়` : "",
    product_savings:
      product?.compareAtPrice && product.compareAtPrice > product.price
        ? formatTaka(product.compareAtPrice - product.price)
        : "",
    product_package: product?.packageSize ?? "",
    product_description: product?.shortDescription ?? "",
    product_short_description: product?.shortDescription ?? "",
    product_ingredients: product?.ingredients ?? "",
    product_dosage: product?.dosage ?? "",
    product_stock_label: product ? (product.inStock ? "স্টকে আছে" : "স্টক শেষ") : "",
    product_prescription_note: product?.requiresPrescription
      ? "এই পণ্যের জন্য চিকিৎসকের ব্যবস্থাপত্র আবশ্যক।"
      : "",
    product_url: productUrl,
    order_url: "#order_form",
    order_form_url: "#order_form",
    checkout_url: checkoutUrl,
    direct_checkout_url: checkoutUrl,
    coupon_code: context.couponCode?.trim() ?? "",
    whatsapp_url: whatsappUrl,
    phone: phoneDisplay(brand),
    phone_url: telLink(brand),
    brand_name: brand.name,
    medical_disclaimer: MEDICAL_DISCLAIMER,
  };
}

/**
 * HTML-এর সব পরিচিত টোকেন আসল মান দিয়ে বদলায়।
 * মানগুলো escape করা হয় — পণ্যের নামে উদ্ধৃতি/বন্ধনী থাকলেও HTML ভাঙবে না।
 * অপরিচিত টোকেন অপরিবর্তিত থাকে, যাতে টাইপের ভুল এডিটরে ধরা পড়ে।
 */
export function applyLandingHtmlTokens(html: string, context: LandingHtmlTokenContext): string {
  if (!html || !html.includes("{{")) return html;
  const values = tokenValues(context);
  return html.replace(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g, (match, key: string) => {
    const value = values[key.toLowerCase()];
    return value === undefined ? match : escapeHtmlAttr(value);
  });
}
