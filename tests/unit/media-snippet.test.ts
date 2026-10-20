import test from "node:test";
import assert from "node:assert/strict";
import { absoluteMediaUrl, escapeHtmlAttr, imageHtmlSnippet } from "../../lib/media/snippet";
import { buildUniqueSlug, landingSlugBase } from "../../lib/landing/slug";

test("absoluteMediaUrl prefixes origin for relative media paths", () => {
  assert.equal(
    absoluteMediaUrl("/api/media/media/a-1.jpg", "https://unanisifa.com/"),
    "https://unanisifa.com/api/media/media/a-1.jpg",
  );
  assert.equal(
    absoluteMediaUrl("api/media/x.png", "https://unanisifa.com"),
    "https://unanisifa.com/api/media/x.png",
  );
});

test("absoluteMediaUrl keeps absolute, protocol-relative and data URLs unchanged", () => {
  assert.equal(
    absoluteMediaUrl("https://cdn.example.com/media/a.jpg", "https://unanisifa.com"),
    "https://cdn.example.com/media/a.jpg",
  );
  assert.equal(absoluteMediaUrl("//cdn.example.com/a.jpg", "https://unanisifa.com"), "//cdn.example.com/a.jpg");
  assert.equal(absoluteMediaUrl("data:image/png;base64,AAA", "https://x.test"), "data:image/png;base64,AAA");
  assert.equal(absoluteMediaUrl("  ", "https://x.test"), "");
});

test("absoluteMediaUrl without origin on server leaves relative URL unchanged", () => {
  assert.equal(absoluteMediaUrl("/api/media/media/a.jpg"), "/api/media/media/a.jpg");
});

test("imageHtmlSnippet builds a responsive img with escaped alt", () => {
  const snippet = imageHtmlSnippet("/api/media/media/a.jpg", 'সিরাপ "বিশেষ" <অফার>', {
    origin: "https://unanisifa.com",
  });
  assert.match(snippet, /^<img src="https:\/\/unanisifa\.com\/api\/media\/media\/a\.jpg"/);
  assert.match(snippet, /alt="সিরাপ &quot;বিশেষ&quot; &lt;অফার&gt;"/);
  assert.match(snippet, /loading="lazy"/);
  assert.match(snippet, /max-width:100%/);
});

test("imageHtmlSnippet can keep the stored (relative) URL for in-site HTML blocks", () => {
  const snippet = imageHtmlSnippet("/api/media/media/a.jpg", "", { absolute: false });
  assert.match(snippet, /^<img src="\/api\/media\/media\/a\.jpg"/);
  assert.match(snippet, /alt="ছবি"/);
});

test("escapeHtmlAttr escapes quotes and angle brackets", () => {
  assert.equal(escapeHtmlAttr(`a"b'c<d>&e`), "a&quot;b&#39;c&lt;d&gt;&amp;e");
});

test("landingSlugBase slugifies titles and falls back when nothing slug-able remains", () => {
  assert.equal(landingSlugBase("My Offer Page"), "my-offer-page");
  assert.match(landingSlugBase("!!!", 123456), /^offer-/);
});

test("buildUniqueSlug returns base when free, suffixes when taken", async () => {
  const taken = new Set(["offer", "offer-2"]);
  const exists = async (slug: string) => taken.has(slug);
  assert.equal(await buildUniqueSlug("free-page", exists), "free-page");
  assert.equal(await buildUniqueSlug("offer", exists), "offer-3");
});
