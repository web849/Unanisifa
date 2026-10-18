/**
 * ব্র্যান্ড আইকন জেনারেটর — কোনো ইমেজ লাইব্রেরি ছাড়াই PNG ও ICO তৈরি করে।
 *
 * আউটপুট:
 *   public/brand/icon-192.png, icon-512.png, apple-touch-icon.png (180),
 *   public/brand/favicon.ico (16/32/48), app/apple-icon.png
 *
 * চালান: npm run assets:demo  (অথবা node scripts/generate-brand-icons.mjs)
 */

import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/* -------------------------------------------------------------------------- */
/* পাথ পার্সার (M/L/C/H/V/Z, absolute) → পলিগন                               */
/* -------------------------------------------------------------------------- */

const SHIELD_OUTLINE =
  "M32 5.6 L56.4 14.7 V33.3 C56.4 46.3 46 54.7 32 58.8 C18 54.7 7.6 46.3 7.6 33.3 V14.7 Z";

const LEAF =
  "M32 15.5 C40.8 20.6 45.4 28.4 43.2 37.6 C41.8 43.4 37.4 47.4 32 49.6 " +
  "C26.6 47.4 22.2 43.4 20.8 37.6 C18.6 28.4 23.2 20.6 32 15.5 Z";

const VEINS = [
  [32, 18.4, 32, 47.2],
  [32, 25.6, 38.6, 22.2],
  [32, 31.4, 39.8, 27.6],
  [32, 37.2, 39.4, 33.6],
  [32, 25.6, 25.4, 22.2],
  [32, 31.4, 24.2, 27.6],
  [32, 37.2, 24.6, 33.6],
];

/** SVG পাথ স্ট্রিংকে পলিগন পয়েন্টে বদলায় (কিউবিক বেজিয়ে ফ্ল্যাটেনিং) */
function pathToPolygon(d, steps = 24) {
  const tokens = d.match(/[MLCHVZ]|-?\d*\.?\d+(?:e[-+]?\d+)?/gi) ?? [];
  const points = [];
  let i = 0;
  let cx = 0;
  let cy = 0;
  let cmd = "";
  const num = () => Number(tokens[i++]);
  while (i < tokens.length) {
    const token = tokens[i];
    if (/^[MLCHVZ]$/i.test(token)) {
      cmd = token.toUpperCase();
      i += 1;
    }
    switch (cmd) {
      case "M":
      case "L": {
        cx = num();
        cy = num();
        points.push([cx, cy]);
        break;
      }
      case "H": {
        cx = num();
        points.push([cx, cy]);
        break;
      }
      case "V": {
        cy = num();
        points.push([cx, cy]);
        break;
      }
      case "C": {
        const x1 = num();
        const y1 = num();
        const x2 = num();
        const y2 = num();
        const x = num();
        const y = num();
        for (let s = 1; s <= steps; s += 1) {
          const t = s / steps;
          const mt = 1 - t;
          const px =
            mt * mt * mt * cx + 3 * mt * mt * t * x1 + 3 * mt * t * t * x2 + t * t * t * x;
          const py =
            mt * mt * mt * cy + 3 * mt * mt * t * y1 + 3 * mt * t * t * y2 + t * t * t * y;
          points.push([px, py]);
        }
        cx = x;
        cy = y;
        break;
      }
      case "Z": {
        break;
      }
      default: {
        i += 1;
      }
    }
  }
  return points;
}

function pointInPolygon(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function distanceToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  let t = lenSq === 0 ? 0 : ((px - x1) * dx + (py - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const qx = x1 + t * dx;
  const qy = y1 + t * dy;
  return Math.hypot(px - qx, py - qy);
}

function distanceToPolygonEdge(px, py, poly) {
  let min = Infinity;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    min = Math.min(min, distanceToSegment(px, py, xi, yi, xj, yj));
  }
  return min;
}

/* -------------------------------------------------------------------------- */
/* রঙ মিশ্রণ                                                                    */
/* -------------------------------------------------------------------------- */

const hexToRgb = (hex) => {
  const v = hex.replace("#", "");
  return [
    parseInt(v.slice(0, 2), 16),
    parseInt(v.slice(2, 4), 16),
    parseInt(v.slice(4, 6), 16),
  ];
};

const EMERALD_DARK = hexToRgb("#073A2E");
const EMERALD = hexToRgb("#0B5D4A");
const GOLD = hexToRgb("#C9A227");
const GOLD_DARK = hexToRgb("#B38F1F");

function lerp(a, b, t) {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ];
}

/** alpha ওভার কম্পোজিশন */
function over(base, baseA, color, alpha) {
  const a = baseA + alpha * (1 - baseA);
  if (a === 0) return [0, 0, 0, 0];
  const r = (color[0] * alpha + base[0] * baseA * (1 - alpha)) / a;
  const g = (color[1] * alpha + base[1] * baseA * (1 - alpha)) / a;
  const b = (color[2] * alpha + base[2] * baseA * (1 - alpha)) / a;
  return [r, g, b, a];
}

/* -------------------------------------------------------------------------- */
/* রেন্ডারার                                                                    */
/* -------------------------------------------------------------------------- */

const shieldPoly = pathToPolygon(SHIELD_OUTLINE);
const leafPoly = pathToPolygon(LEAF);

function sample(x, y, size, cornerRadius) {
  // x, y ∈ [0, size); আইকন স্পেস 64x64-এ নরমালাইজ করা হয়
  const u = (x / size) * 64;
  const v = (y / size) * 64;

  let [r, g, b] = [0, 0, 0];
  let a = 0;

  // ১) রাউন্ডেড স্কয়ার ব্যাকগ্রাউন্ড (১৩৫° এমারেল্ড গ্রেডিয়েন্ট + গোল্ড গ্লো)
  const cr = (cornerRadius / size) * 64;
  const inRounded = (() => {
    if (u < cr && v < cr) return Math.hypot(u - cr, v - cr) <= cr;
    if (u > 64 - cr && v < cr) return Math.hypot(u - (64 - cr), v - cr) <= cr;
    if (u < cr && v > 64 - cr) return Math.hypot(u - cr, v - (64 - cr)) <= cr;
    if (u > 64 - cr && v > 64 - cr) return Math.hypot(u - (64 - cr), v - (64 - cr)) <= cr;
    return u >= 0 && u <= 64 && v >= 0 && v <= 64;
  })();

  if (inRounded) {
    const t = Math.max(0, Math.min(1, (u + v) / 128));
    const bg = lerp(EMERALD_DARK, EMERALD, t);
    // গোল্ড গ্লো (উপরে-ডানে, ১৮% অপাসিটি)
    const glow = Math.max(0, 1 - Math.hypot(u - 52, v - 8) / 46);
    const glowColor = lerp(bg, GOLD, glow * 0.18);
    [r, g, b] = glowColor;
    a = 1;

    // ২) শিল্ড আউটলাইন স্ট্রোক (গোল্ড, ৪৫% অপাসিটি)
    const dShield = distanceToPolygonEdge(u, v, shieldPoly);
    const shieldWidth = 1.4 / 2;
    if (dShield <= shieldWidth + 0.6) {
      const alpha = Math.max(0, Math.min(1, (shieldWidth + 0.6 - dShield) / 1.2)) * 0.45;
      const mixed = over([r, g, b], a, GOLD, alpha);
      [r, g, b] = [mixed[0], mixed[1], mixed[2]];
      a = mixed[3];
    }

    // ৩) সোনালি পাতা
    if (pointInPolygon(u, v, leafPoly)) {
      const tLeaf = Math.max(0, Math.min(1, (v - 15.5) / 34));
      [r, g, b] = lerp(GOLD, GOLD_DARK, tLeaf);
      a = 1;

      // ৪) পাতার শিরা (গাঢ় এমারেল্ড)
      for (const [x1, y1, x2, y2] of VEINS) {
        const w = (x1 === x2 && y1 === 18.4 ? 1.6 : 1.3) / 2;
        const d = distanceToSegment(u, v, x1, y1, x2, y2);
        if (d <= w + 0.5) {
          const alpha =
            Math.max(0, Math.min(1, (w + 0.5 - d) / 1.0)) *
            (x1 === x2 && y1 === 18.4 ? 0.5 : 0.34);
          const mixed = over([r, g, b], a, EMERALD_DARK, alpha);
          [r, g, b] = [mixed[0], mixed[1], mixed[2]];
          a = mixed[3];
        }
      }
    }
  }

  return [r, g, b, a * 255];
}

function render(size, cornerRadius, supersample = 4) {
  const buf = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      for (let sy = 0; sy < supersample; sy += 1) {
        for (let sx = 0; sx < supersample; sx += 1) {
          const px = x + (sx + 0.5) / supersample;
          const py = y + (sy + 0.5) / supersample;
          const s = sample(px, py, size, cornerRadius);
          r += s[0];
          g += s[1];
          b += s[2];
          a += s[3];
        }
      }
      const n = supersample * supersample;
      const idx = (y * size + x) * 4;
      buf[idx] = Math.round(r / n);
      buf[idx + 1] = Math.round(g / n);
      buf[idx + 2] = Math.round(b / n);
      buf[idx + 3] = Math.round(a / n);
    }
  }
  return buf;
}

/* -------------------------------------------------------------------------- */
/* PNG ও ICO এনকোডার                                                            */
/* -------------------------------------------------------------------------- */

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i += 1) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function encodePng(size, rgba) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y += 1) {
    raw[y * (size * 4 + 1)] = 0; // filter: none
    rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }

  return Buffer.concat([
    signature,
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function encodeIco(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);

  let offset = 6 + images.length * 16;
  const entries = [];
  for (const img of images) {
    const entry = Buffer.alloc(16);
    entry[0] = img.size >= 256 ? 0 : img.size;
    entry[1] = img.size >= 256 ? 0 : img.size;
    entry[2] = 0;
    entry[3] = 0;
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(img.data.length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += img.data.length;
    entries.push(entry);
  }
  return Buffer.concat([header, ...entries, ...images.map((i) => i.data)]);
}

/* -------------------------------------------------------------------------- */
/* আউটপুট                                                                      */
/* -------------------------------------------------------------------------- */

const brandDir = path.join(ROOT, "public", "brand");
mkdirSync(brandDir, { recursive: true });
mkdirSync(path.join(ROOT, "app"), { recursive: true });

const targets = [
  { file: path.join(brandDir, "icon-192.png"), size: 192 },
  { file: path.join(brandDir, "icon-512.png"), size: 512 },
  { file: path.join(brandDir, "apple-touch-icon.png"), size: 180 },
  { file: path.join(ROOT, "app", "apple-icon.png"), size: 180 },
];

for (const target of targets) {
  const cornerRadius = Math.round(target.size * 0.21875);
  const png = encodePng(target.size, render(target.size, cornerRadius));
  writeFileSync(target.file, png);
  console.log(`wrote ${path.relative(ROOT, target.file)} (${(png.length / 1024).toFixed(1)} KB)`);
}

const icoSizes = [16, 32, 48];
const icoImages = icoSizes.map((size) => ({
  size,
  data: encodePng(size, render(size, Math.round(size * 0.16))),
}));
const ico = encodeIco(icoImages);
writeFileSync(path.join(brandDir, "favicon.ico"), ico);
console.log(`wrote public/brand/favicon.ico (${(ico.length / 1024).toFixed(1)} KB)`);
