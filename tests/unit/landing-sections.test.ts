import test from "node:test";
import assert from "node:assert/strict";
import {
  SECTION_CATALOG,
  SECTION_TYPE_LABEL,
  createLandingSection,
  defaultSectionsFor,
  isSectionContentEmpty,
  type LandingSection,
  type LandingSectionType,
} from "../../lib/landing/sections";

test("section catalog includes the custom HTML block exactly once", () => {
  const htmlBlocks = SECTION_CATALOG.filter((item) => item.type === "html");
  assert.equal(htmlBlocks.length, 1);
  assert.equal(htmlBlocks[0]?.group, "layout");
  assert.equal(SECTION_TYPE_LABEL.html, "HTML Code");
});

test("every catalog type has a label and a default factory", () => {
  for (const item of SECTION_CATALOG) {
    assert.ok(SECTION_TYPE_LABEL[item.type], `missing label for ${item.type}`);
    const section = createLandingSection(item.type, 1, { pageTitle: "টেস্ট পেজ" });
    assert.equal(section.id, 1);
    assert.equal(section.type, item.type);
    assert.equal(typeof section.settings, "object");
    assert.ok(section.settings !== null);
  }
});

test("starter template has unique ids and the mandatory blocks", () => {
  const sections = defaultSectionsFor("গ্যাস্ট্রিক সিরাপ");
  const ids = sections.map((section) => section.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(sections.length >= 8);
  assert.ok(sections.some((section) => section.type === "order_form"));
  assert.ok(sections.some((section) => section.type === "doctor_advice"));
  assert.ok(sections.some((section) => section.type === "hero"));
});

test("new HTML and popup blocks arrive with usable defaults", () => {
  const html = createLandingSection("html", 2, { pageTitle: "পেজ" });
  assert.equal(typeof html.settings.html, "string");
  assert.match(String(html.settings.html), /কানেক্টেড প্রোডাক্ট HTML ফরম্যাট/);
  assert.match(String(html.settings.html), /\{\{product_name\}\}/);
  assert.match(String(html.settings.html), /\{\{order_url\}\}/);
  assert.match(String(html.settings.html), /\{\{checkout_url\}\}/);

  const popup = createLandingSection("popup", 3, { pageTitle: "পেজ" });
  assert.equal(popup.settings.frequency, "once_session");
  assert.equal(Number(popup.settings.delaySeconds) >= 1, true);
});

test("empty-state helper catches blank blocks but not structural blocks", () => {
  const emptyText: LandingSection = { id: 1, type: "text", settings: {} };
  assert.equal(isSectionContentEmpty(emptyText), true);

  const filledText: LandingSection = { id: 2, type: "text", settings: { title: "শিরোনাম" } };
  assert.equal(isSectionContentEmpty(filledText), false);

  const emptyFaq: LandingSection = { id: 3, type: "faq", settings: { items: [] } };
  assert.equal(isSectionContentEmpty(emptyFaq), true);

  const divider: LandingSection = { id: 4, type: "divider", settings: {} };
  assert.equal(isSectionContentEmpty(divider), false);

  const productsWithoutContext: LandingSection = { id: 5, type: "products", settings: {} };
  assert.equal(isSectionContentEmpty(productsWithoutContext), true);
  assert.equal(isSectionContentEmpty(productsWithoutContext, { hasProduct: true }), false);
});

test("every section type in the union is represented in the catalog", () => {
  const catalogTypes = new Set<LandingSectionType>(SECTION_CATALOG.map((item) => item.type));
  const expected: LandingSectionType[] = [
    "hero", "text", "split", "images", "video", "html",
    "products", "order_form", "cta",
    "features", "steps", "faq", "testimonials", "reviews", "countdown", "popup",
    "announcement", "guarantee", "contact", "divider", "spacer",
    "ingredients", "dosage", "doctor_advice",
  ];
  for (const type of expected) assert.ok(catalogTypes.has(type), `missing ${type}`);
});
