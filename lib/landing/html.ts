/**
 * কাস্টম HTML ব্লকের স্যানিটাইজার।
 *
 * অ্যাডমিন HTML লিখতে পারেন, কিন্তু public পেজে script, iframe, form,
 * event handler বা javascript: URL কখনো যাবে না। sanitize-html একটি
 * allowlist ভিত্তিক পার্সার ব্যবহার করে — regex দিয়ে HTML "পরিষ্কার" করা হয় না।
 *
 * ইনলাইন CSS অনুমোদিত (style attribute), তবে CSS expression / javascript:
 * জাতীয় বিপজ্জনক অংশ বাদ দেওয়া হয়।
 */

import sanitizeHtml from "sanitize-html";

const ALLOWED_TAGS = [
  "div",
  "section",
  "article",
  "header",
  "footer",
  "aside",
  "p",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "span",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "small",
  "mark",
  "br",
  "hr",
  "ul",
  "ol",
  "li",
  "a",
  "img",
  "figure",
  "figcaption",
  "blockquote",
  "cite",
  "table",
  "thead",
  "tbody",
  "tfoot",
  "tr",
  "th",
  "td",
  "caption",
  "video",
  "audio",
  "source",
  "picture",
  "svg",
  "path",
  "circle",
  "rect",
  "line",
  "polyline",
  "polygon",
  "g",
];

const ALLOWED_ATTRIBUTES: sanitizeHtml.IOptions["allowedAttributes"] = {
  "*": [
    "class",
    "id",
    "style",
    "title",
    "role",
    "dir",
    "lang",
    "aria-label",
    "aria-hidden",
    "aria-labelledby",
    "aria-describedby",
  ],
  a: ["href", "target", "rel", "name"],
  img: ["src", "alt", "width", "height", "loading", "decoding", "srcset", "sizes"],
  video: ["src", "poster", "width", "height", "controls", "muted", "loop", "playsinline"],
  audio: ["src", "controls", "loop"],
  source: ["src", "type", "media"],
  table: ["border", "cellpadding", "cellspacing"],
  td: ["colspan", "rowspan"],
  th: ["colspan", "rowspan", "scope"],
  ol: ["start", "type"],
  svg: ["viewbox", "xmlns", "fill", "stroke", "width", "height", "aria-hidden"],
  path: ["d", "fill", "stroke", "stroke-width", "stroke-linecap", "stroke-linejoin"],
  circle: ["cx", "cy", "r", "fill", "stroke"],
  rect: ["x", "y", "width", "height", "rx", "fill", "stroke"],
  line: ["x1", "y1", "x2", "y2", "stroke", "stroke-width"],
  polyline: ["points", "fill", "stroke"],
  polygon: ["points", "fill", "stroke"],
  g: ["fill", "stroke", "transform"],
};

/** CSS-এর ভেতরে স্ক্রিপ্ট-সদৃশ বা ডেটা-লিক করা অংশ বাদ দেয় */
function cleanStyle(value: string): string {
  return value
    .replace(/expression\s*\(/gi, "")
    .replace(/javascript\s*:/gi, "")
    .replace(/vbscript\s*:/gi, "")
    .replace(/behavior\s*:/gi, "")
    .replace(/-moz-binding\s*:/gi, "")
    .replace(/url\s*\(\s*['"]?\s*(?!https?:\/\/)[^)]*\)/gi, "")
    .slice(0, 4000);
}

export function sanitizeLandingHtml(input: string): string {
  if (!input || !input.trim()) return "";
  try {
    return sanitizeHtml(input, {
      allowedTags: ALLOWED_TAGS,
      allowedAttributes: ALLOWED_ATTRIBUTES,
      allowedSchemes: ["http", "https", "mailto", "tel"],
      allowedSchemesByTag: { img: ["http", "https", "data"] },
      allowProtocolRelative: false,
      disallowedTagsMode: "discard",
      // পাবলিক পেজে style tag দিয়ে পুরো সাইটের CSS বদলানো যাবে না —
      // শুধু inline style অনুমোদিত।
      nonTextTags: ["style", "script", "textarea", "option", "noscript"],
      transformTags: {
        a: (tagName, attribs) => {
          const href = attribs.href ?? "";
          const external = /^https?:\/\//i.test(href);
          return {
            tagName,
            attribs: external
              ? { ...attribs, rel: "noopener noreferrer nofollow", target: "_blank" }
              : attribs,
          };
        },
        img: (tagName, attribs) => ({
          tagName,
          attribs: {
            ...attribs,
            loading: attribs.loading || "lazy",
            decoding: attribs.decoding || "async",
          },
        }),
        "*": (tagName, attribs) => {
          const next = { ...attribs };
          if (typeof next.style === "string") next.style = cleanStyle(next.style);
          return { tagName, attribs: next };
        },
      },
    }).trim();
  } catch {
    return "";
  }
}
