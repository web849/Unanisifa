/**
 * ডেমো অ্যাসেট জেনারেটর — সব isDemo কনটেন্টের জন্য কোহেরেন্ট SVG ইলাস্ট্রেশন।
 *
 *   npm run assets:demo
 *
 * আউটপুট: public/images/demo/*.svg
 * ডিজাইন নিয়ম (স্পেক ৬): উষ্ণ-নিউট্রাল টোন, আইভরি ব্যাকগ্রাউন্ড,
 * এমারেল্ড/গোল্ড প্যালেট, ভেষজ পাতা-কাচের বোতল-ল্যাব পরিবেশ, কোনো টেক্সট নয়
 * (SVG <img> কনটেক্সটে ওয়েবফন্ট লোড হয় না, তাই ছবিতে লেখা রাখা হয়নি),
 * রোগ বা ভয়ের কোনো ছবি নয়।
 */

import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "public", "images", "demo");
mkdirSync(OUT, { recursive: true });

const IVORY = "#FAF8F2";
const SAGE = "#DDE9E1";
const SAGE_SOFT = "#F3F7F4";
const EMERALD = "#0B5D4A";
const EMERALD_DARK = "#073A2E";
const EMERALD_LIGHT = "#0E7A61";
const GOLD = "#C9A227";
const GOLD_SOFT = "#F1E3B5";

/** পাতার মোটিফ */
const leaf = (x, y, scale, rotate, color = GOLD, opacity = 0.9) =>
  `<g transform="translate(${x} ${y}) rotate(${rotate}) scale(${scale})">` +
  `<path d="M0 -22 C12 -14 16 -2 12 10 C9 18 4 22 0 24 C-4 22 -9 18 -12 10 C-16 -2 -12 -14 0 -22 Z" fill="${color}" opacity="${opacity}"/>` +
  `<path d="M0 -18 V20" stroke="${EMERALD_DARK}" stroke-opacity="0.35" stroke-width="1.6" fill="none"/>` +
  `</g>`;

/** পটভূমি — আইভরি + সফট রেডিয়াল সেজ + কোণায় পাতা */
const background = (id) =>
  `<defs>` +
  `<radialGradient id="${id}-bg" cx="0.5" cy="0.38" r="0.85">` +
  `<stop offset="0%" stop-color="${SAGE_SOFT}"/><stop offset="100%" stop-color="${IVORY}"/>` +
  `</radialGradient>` +
  `<linearGradient id="${id}-glass" x1="0" y1="0" x2="1" y2="1">` +
  `<stop offset="0%" stop-color="${EMERALD_LIGHT}" stop-opacity="0.85"/>` +
  `<stop offset="55%" stop-color="${EMERALD}" stop-opacity="0.92"/>` +
  `<stop offset="100%" stop-color="${EMERALD_DARK}"/>` +
  `</linearGradient>` +
  `<linearGradient id="${id}-label" x1="0" y1="0" x2="0" y2="1">` +
  `<stop offset="0%" stop-color="#FFFFFF"/><stop offset="100%" stop-color="${SAGE}"/>` +
  `</linearGradient>` +
  `<linearGradient id="${id}-gold" x1="0" y1="0" x2="0" y2="1">` +
  `<stop offset="0%" stop-color="${GOLD}"/><stop offset="100%" stop-color="#B38F1F"/>` +
  `</linearGradient>` +
  `</defs>` +
  `<rect width="600" height="600" fill="url(#${id}-bg)"/>` +
  `<circle cx="300" cy="310" r="196" fill="${SAGE}" opacity="0.5"/>` +
  leaf(96, 108, 1.1, -24, GOLD_SOFT, 1) +
  leaf(512, 120, 0.9, 26, SAGE, 1) +
  leaf(492, 486, 0.7, 160, GOLD_SOFT, 1);

/** কাচের সিরাপ বোতল */
const syrupBottle = (id, labelColor = GOLD) =>
  `<g transform="translate(300 320)">` +
  `<rect x="-26" y="-176" width="52" height="34" rx="8" fill="url(#${id}-gold)"/>` +
  `<rect x="-34" y="-146" width="68" height="20" rx="6" fill="${EMERALD_DARK}"/>` +
  `<path d="M-52 -120 C-52 -128 -44 -132 -38 -136 L38 -136 C44 -132 52 -128 52 -120 L58 116 C58 138 40 150 0 150 C-40 150 -58 138 -58 116 Z" fill="url(#${id}-glass)"/>` +
  `<path d="M-40 -108 L-46 108 C-46 122 -34 132 -12 134 C-26 96 -28 -34 -22 -108 Z" fill="#FFFFFF" opacity="0.16"/>` +
  `<rect x="-52" y="-40" width="104" height="96" rx="10" fill="url(#${id}-label)"/>` +
  `<rect x="-52" y="-40" width="104" height="10" fill="${labelColor}"/>` +
  leaf(0, 6, 0.62, 0, EMERALD, 0.9) +
  `<rect x="-30" y="34" width="60" height="6" rx="3" fill="${EMERALD}" opacity="0.55"/>` +
  `<rect x="-22" y="46" width="44" height="5" rx="2.5" fill="${EMERALD}" opacity="0.35"/>` +
  `</g>`;

/** গোলাকার জার (চূর্ণ/প্যাক) */
const jar = (id) =>
  `<g transform="translate(300 330)">` +
  `<rect x="-74" y="-150" width="148" height="34" rx="10" fill="url(#${id}-gold)"/>` +
  `<rect x="-80" y="-120" width="160" height="16" rx="8" fill="${EMERALD_DARK}"/>` +
  `<path d="M-84 -104 C-96 -70 -96 40 -84 96 C-72 128 -40 142 0 142 C40 142 72 128 84 96 C96 40 96 -70 84 -104 Z" fill="url(#${id}-glass)"/>` +
  `<path d="M-64 -92 C-72 -40 -72 40 -62 88 C-74 40 -76 -40 -64 -92 Z" fill="#FFFFFF" opacity="0.18"/>` +
  `<rect x="-70" y="-52" width="140" height="104" rx="12" fill="url(#${id}-label)"/>` +
  `<rect x="-70" y="-52" width="140" height="12" fill="${GOLD}"/>` +
  leaf(0, 8, 0.72, 0, EMERALD, 0.9) +
  `<rect x="-42" y="40" width="84" height="6" rx="3" fill="${EMERALD}" opacity="0.5"/>` +
  `</g>`;

/** সরু অয়েল/ড্রপ বোতল */
const oilBottle = (id, dropper = false) =>
  `<g transform="translate(300 330)">` +
  (dropper
    ? `<rect x="-16" y="-196" width="32" height="40" rx="10" fill="url(#${id}-gold)"/><rect x="-8" y="-158" width="16" height="30" fill="${EMERALD_DARK}"/>`
    : `<rect x="-18" y="-186" width="36" height="34" rx="8" fill="url(#${id}-gold)"/><rect x="-24" y="-156" width="48" height="16" rx="6" fill="${EMERALD_DARK}"/>`) +
  `<path d="M-24 -140 C-24 -148 -18 -150 -14 -152 L14 -152 C18 -150 24 -148 24 -140 L40 -86 C48 -58 50 -20 50 30 C50 108 30 142 0 142 C-30 142 -50 108 -50 30 C-50 -20 -48 -58 -40 -86 Z" fill="url(#${id}-glass)"/>` +
  `<path d="M-30 -60 C-36 -10 -36 60 -28 100 C-38 40 -40 -20 -30 -60 Z" fill="#FFFFFF" opacity="0.16"/>` +
  `<rect x="-44" y="-24" width="88" height="96" rx="10" fill="url(#${id}-label)"/>` +
  `<rect x="-44" y="-24" width="88" height="10" fill="${GOLD}"/>` +
  leaf(0, 18, 0.6, 0, EMERALD, 0.9) +
  `<rect x="-26" y="56" width="52" height="5" rx="2.5" fill="${EMERALD}" opacity="0.5"/>` +
  `</g>`;

/** ক্যাপসুল/ট্যাবলেট বক্স */
const capsuleBox = (id) =>
  `<g transform="translate(300 320)">` +
  `<rect x="-118" y="-120" width="236" height="250" rx="16" fill="url(#${id}-label)"/>` +
  `<path d="M-118 -104 L118 -104 L118 -120 C118 -112 108 -120 96 -120 L-96 -120 C-108 -120 -118 -112 -118 -104 Z" fill="${SAGE}"/>` +
  `<rect x="-118" y="-120" width="236" height="52" rx="16" fill="${EMERALD}"/>` +
  `<rect x="-118" y="-84" width="236" height="10" fill="${GOLD}"/>` +
  leaf(-58, 40, 0.85, -8, EMERALD, 0.85) +
  `<g transform="translate(46 44)">` +
  `<rect x="-30" y="-14" width="60" height="28" rx="14" fill="${GOLD}"/>` +
  `<path d="M0 -14 A14 14 0 0 1 0 14 L-30 14 A14 14 0 0 1 -30 -14 Z" fill="${EMERALD}"/>` +
  `<rect x="-24" y="-8" width="12" height="5" rx="2.5" fill="#FFFFFF" opacity="0.55"/>` +
  `</g>` +
  `<rect x="-96" y="96" width="132" height="7" rx="3.5" fill="${EMERALD}" opacity="0.5"/>` +
  `<rect x="-96" y="112" width="96" height="6" rx="3" fill="${EMERALD}" opacity="0.32"/>` +
  `</g>`;

/** পাউচ/প্যাক (ফেস প্যাক, চূর্ণ) */
const pouch = (id) =>
  `<g transform="translate(300 330)">` +
  `<path d="M-96 -128 L96 -128 L110 118 C112 134 96 142 0 142 C-96 142 -112 134 -110 118 Z" fill="url(#${id}-label)"/>` +
  `<path d="M-96 -128 L96 -128 L99 -96 L-99 -96 Z" fill="${EMERALD}"/>` +
  `<rect x="-99" y="-100" width="198" height="8" fill="${GOLD}"/>` +
  leaf(0, 6, 0.9, 0, EMERALD, 0.85) +
  `<rect x="-56" y="72" width="112" height="7" rx="3.5" fill="${EMERALD}" opacity="0.5"/>` +
  `<rect x="-40" y="88" width="80" height="6" rx="3" fill="${EMERALD}" opacity="0.32"/>` +
  `<path d="M-96 -128 L-84 -128 L-98 118 L-110 118 Z" fill="${SAGE}" opacity="0.6"/>` +
  `</g>`;

/** মালিশ অয়েল — চ্যাপ্টা বোতল */
const massageBottle = (id) =>
  `<g transform="translate(300 330)">` +
  `<rect x="-20" y="-170" width="40" height="30" rx="8" fill="url(#${id}-gold)"/>` +
  `<rect x="-26" y="-144" width="52" height="16" rx="6" fill="${EMERALD_DARK}"/>` +
  `<path d="M-62 -128 C-74 -96 -78 -30 -78 30 C-78 112 -46 146 0 146 C46 146 78 112 78 30 C78 -30 74 -96 62 -128 Z" fill="url(#${id}-glass)"/>` +
  `<path d="M-46 -100 C-56 -40 -58 40 -50 96 C-62 30 -64 -40 -46 -100 Z" fill="#FFFFFF" opacity="0.16"/>` +
  `<rect x="-58" y="-46" width="116" height="110" rx="12" fill="url(#${id}-label)"/>` +
  `<rect x="-58" y="-46" width="116" height="12" fill="${GOLD}"/>` +
  leaf(-24, 14, 0.62, -14, EMERALD, 0.9) +
  leaf(24, 18, 0.5, 16, EMERALD_LIGHT, 0.85) +
  `<rect x="-34" y="46" width="68" height="6" rx="3" fill="${EMERALD}" opacity="0.5"/>` +
  `</g>`;

/** টিন (ভিটামিন/চুয়িং) */
const tin = (id) =>
  `<g transform="translate(300 340)">` +
  `<ellipse cx="0" cy="-96" rx="104" ry="26" fill="url(#${id}-gold)"/>` +
  `<path d="M-104 -96 L-104 74 C-104 104 -60 122 0 122 C60 122 104 104 104 74 L104 -96" fill="url(#${id}-glass)"/>` +
  `<ellipse cx="0" cy="-96" rx="88" ry="20" fill="${EMERALD_DARK}"/>` +
  `<rect x="-104" y="-40" width="208" height="86" fill="url(#${id}-label)"/>` +
  `<rect x="-104" y="-40" width="208" height="10" fill="${GOLD}"/>` +
  leaf(-46, 8, 0.6, -10, EMERALD, 0.9) +
  leaf(30, 12, 0.5, 12, EMERALD_LIGHT, 0.85) +
  `<rect x="-16" y="-8" width="64" height="6" rx="3" fill="${EMERALD}" opacity="0.5"/>` +
  `<rect x="-16" y="8" width="48" height="5" rx="2.5" fill="${EMERALD}" opacity="0.32"/>` +
  `</g>`;

const KIND = {
  syrup: syrupBottle,
  jar,
  oil: (id) => oilBottle(id, false),
  drops: (id) => oilBottle(id, true),
  box: capsuleBox,
  pouch,
  massage: massageBottle,
  tin,
};

function productSvg(id, kind) {
  const draw = KIND[kind] ?? syrupBottle;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" width="600" height="600" role="img" aria-label="পণ্যের ছবি">` +
    background(id) +
    `<ellipse cx="300" cy="500" rx="150" ry="20" fill="${EMERALD_DARK}" opacity="0.1"/>` +
    draw(id) +
    `</svg>`
  );
}

/** ক্যাটাগরি কভার (৪০০x৪০) — আইকন-সদৃশ কম্পোজিশন */
function categorySvg(id, kind, tint) {
  const draw = KIND[kind] ?? syrupBottle;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="400" height="400" role="img" aria-label="ক্যাটাগরি">` +
    `<defs><radialGradient id="${id}-bg" cx="0.5" cy="0.4" r="0.9">` +
    `<stop offset="0%" stop-color="${SAGE_SOFT}"/><stop offset="100%" stop-color="${tint}"/>` +
    `</radialGradient>` +
    `<linearGradient id="${id}-glass" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0%" stop-color="${EMERALD_LIGHT}" stop-opacity="0.85"/>` +
    `<stop offset="55%" stop-color="${EMERALD}" stop-opacity="0.92"/>` +
    `<stop offset="100%" stop-color="${EMERALD_DARK}"/></linearGradient>` +
    `<linearGradient id="${id}-label" x1="0" y1="0" x2="0" y2="1">` +
    `<stop offset="0%" stop-color="#FFFFFF"/><stop offset="100%" stop-color="${SAGE}"/></linearGradient>` +
    `<linearGradient id="${id}-gold" x1="0" y1="0" x2="0" y2="1">` +
    `<stop offset="0%" stop-color="${GOLD}"/><stop offset="100%" stop-color="#B38F1F"/></linearGradient>` +
    `</defs>` +
    `<rect width="400" height="400" fill="url(#${id}-bg)"/>` +
    `<circle cx="200" cy="206" r="128" fill="${SAGE}" opacity="0.55"/>` +
    leaf(64, 70, 0.8, -20, GOLD_SOFT, 1) +
    leaf(338, 84, 0.66, 22, SAGE, 1) +
    `<g transform="translate(-100 -120) scale(0.84) translate(100 120) scale(1)">` +
    `<g transform="translate(0 0) scale(1)">${draw(id).replace('translate(300 320)', "translate(300 320)").replace('translate(300 330)', "translate(300 330)")}</g>` +
    `</g>` +
    `</svg>`
  ).replace('<g transform="translate(-100 -120) scale(0.84) translate(100 120) scale(1)"><g transform="translate(0 0) scale(1)">', '<g transform="scale(0.84) translate(47 47)">').replace("</g></g></svg>", "</g></svg>");
}

/** ব্যানার ১২০০x৪৮ — ইমেজ-ওনলি (ওভারলে টেক্সট নয়) */
function bannerSvg(id, variant) {
  const accents = [
    { a: EMERALD_DARK, b: EMERALD, c: GOLD_SOFT },
    { a: EMERALD, b: EMERALD_LIGHT, c: GOLD },
    { a: EMERALD_DARK, b: "#0E4A3C", c: GOLD },
  ];
  const palette = accents[variant % accents.length];
  const leaves = Array.from({ length: 7 }, (_, i) =>
    leaf(120 + i * 160, 380 + (i % 2) * 40, 1.1 + (i % 3) * 0.25, -30 + i * 14, palette.c, 0.16 + (i % 2) * 0.1),
  ).join("");
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 480" width="1200" height="480" role="img" aria-label="অফার ব্যানার">` +
    `<defs><linearGradient id="${id}-bg" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0%" stop-color="${palette.a}"/><stop offset="100%" stop-color="${palette.b}"/>` +
    `</linearGradient>` +
    `<radialGradient id="${id}-glow" cx="0.86" cy="0.16" r="0.7">` +
    `<stop offset="0%" stop-color="${GOLD}" stop-opacity="0.18"/><stop offset="100%" stop-color="${GOLD}" stop-opacity="0"/>` +
    `</radialGradient></defs>` +
    `<rect width="1200" height="480" fill="url(#${id}-bg)"/>` +
    `<rect width="1200" height="480" fill="url(#${id}-glow)"/>` +
    leaves +
    `<g transform="translate(180 240) scale(1.35)">${syrupBottle(id).replace('translate(300 320)', "")}</g>` +
    `<g transform="translate(430 250) scale(1.15)">${jar(id).replace('translate(300 330)', "")}</g>` +
    `<g transform="translate(660 258) scale(1.05)">${oilBottle(id).replace('translate(300 330)', "")}</g>` +
    `<g transform="translate(880 262) scale(0.95)">${tin(id).replace('translate(300 340)', "")}</g>` +
    `<rect x="0" y="452" width="1200" height="28" fill="${palette.c}" opacity="0.22"/>` +
    `<circle cx="1040" cy="120" r="72" fill="${GOLD}" opacity="0.14"/>` +
    `<circle cx="1040" cy="120" r="44" fill="${GOLD}" opacity="0.2"/>` +
    `</svg>`
  );
}

/* -------------------------------------------------------------------------- */

const PRODUCTS = [
  ["p-01", "syrup"],
  ["p-02", "syrup"],
  ["p-03", "pouch"],
  ["p-04", "syrup"],
  ["p-05", "syrup"],
  ["p-06", "massage"],
  ["p-07", "oil"],
  ["p-08", "pouch"],
  ["p-09", "pouch"],
  ["p-10", "drops"],
  ["p-11", "syrup"],
  ["p-12", "massage"],
  ["p-13", "box"],
  ["p-14", "tin"],
  ["p-15", "box"],
];

let count = 0;
for (const [id, kind] of PRODUCTS) {
  const svg = productSvg(id, kind);
  writeFileSync(path.join(OUT, `${id}.svg`), svg);
  count += 1;
}

const CATEGORIES = [
  ["c-01", "syrup", SAGE_SOFT],
  ["c-02", "jar", "#EDF4EF"],
  ["c-03", "oil", SAGE_SOFT],
  ["c-04", "drops", "#F1F6F2"],
  ["c-05", "box", SAGE_SOFT],
];

for (const [id, kind, tint] of CATEGORIES) {
  writeFileSync(path.join(OUT, `${id}.svg`), categorySvg(id, kind, tint));
  count += 1;
}

for (let i = 1; i <= 3; i += 1) {
  writeFileSync(path.join(OUT, `banner-0${i}.svg`), bannerSvg(`b${i}`, i - 1));
  count += 1;
}

console.log(`[demo-assets] ${count}টি SVG অ্যাসেট তৈরি হয়েছে, ফোল্ডার: public/images/demo/`);
