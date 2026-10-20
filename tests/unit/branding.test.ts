import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DEFAULT_BRAND } from "../../lib/config";
import { clampLogoHeight, resolveBrandLogo } from "../../lib/brand-logo";
import { BrandMark } from "../../components/brand-mark";
import { adminNavGroups } from "../../components/admin/admin-nav";

const ROOT = path.resolve(import.meta.dirname, "..", "..");

test("default brand settings resolve to built-in shield mark with brand text", () => {
  const header = resolveBrandLogo(DEFAULT_BRAND, "dark");
  assert.equal(header.isCustom, false);
  assert.equal(header.src, "/brand/logo.svg");
  assert.equal(header.heightPx, 36);
  assert.equal(header.showText, true);
  assert.equal(header.darkTreatment, "none");

  const footer = resolveBrandLogo(DEFAULT_BRAND, "light");
  assert.equal(footer.isCustom, false);
  assert.equal(footer.src, "/brand/logo-light.svg");
});

test("single uploaded main logo applies to both header and dark footer with dark mode options", () => {
  const custom = {
    ...DEFAULT_BRAND,
    logoUrl: "/api/media/brand/custom-main.png",
    logoHeight: 44,
    logoShowText: false,
    darkLogoMode: "white" as const,
  };

  const header = resolveBrandLogo(custom, "dark");
  assert.equal(header.isCustom, true);
  assert.equal(header.src, "/api/media/brand/custom-main.png");
  assert.equal(header.heightPx, 44);
  assert.equal(header.darkTreatment, "none");
  assert.equal(header.showText, false);

  const footer = resolveBrandLogo(custom, "light");
  assert.equal(footer.isCustom, true);
  assert.equal(footer.src, "/api/media/brand/custom-main.png");
  assert.equal(footer.darkTreatment, "white");
});

test("dedicated light logo overrides main logo on dark surfaces without inverting colors", () => {
  const dual = {
    ...DEFAULT_BRAND,
    logoUrl: "/api/media/brand/dark-wordmark.png",
    logoLightUrl: "/api/media/brand/white-wordmark.png",
    darkLogoMode: "white" as const,
  };

  const footer = resolveBrandLogo(dual, "light");
  assert.equal(footer.src, "/api/media/brand/white-wordmark.png");
  assert.equal(footer.usesDedicatedLightLogo, true);
  assert.equal(footer.darkTreatment, "none");
});

test("clampLogoHeight enforces safe bounds and fallback", () => {
  assert.equal(clampLogoHeight(10), 24);
  assert.equal(clampLogoHeight(200), 72);
  assert.equal(clampLogoHeight(42), 42);
  assert.equal(clampLogoHeight(Number.NaN), 36);
});

test("BrandMark SSR renders inline shield by default and custom img + optional text when uploaded", () => {
  const defaultHtml = renderToStaticMarkup(
    React.createElement(BrandMark, { brand: DEFAULT_BRAND, variant: "dark" }),
  );
  assert.match(defaultHtml, /<svg/);
  assert.match(defaultHtml, /ইউনানী সিফা/);

  const wordmarkHtml = renderToStaticMarkup(
    React.createElement(BrandMark, {
      brand: {
        ...DEFAULT_BRAND,
        logoUrl: "/api/media/brand/my-logo.svg",
        logoShowText: false,
        darkLogoMode: "pill",
      },
      variant: "light",
    }),
  );
  assert.match(wordmarkHtml, /src="\/api\/media\/brand\/my-logo\.svg"/);
  assert.match(wordmarkHtml, /brand-logo-pill/);
  assert.doesNotMatch(wordmarkHtml, /header-brand-name/);

  const iconPlusTextHtml = renderToStaticMarkup(
    React.createElement(BrandMark, {
      brand: {
        ...DEFAULT_BRAND,
        logoUrl: "/api/media/brand/square-icon.png",
        logoShowText: true,
      },
      variant: "dark",
    }),
  );
  assert.match(iconPlusTextHtml, /src="\/api\/media\/brand\/square-icon\.png"/);
  assert.match(iconPlusTextHtml, /ইউনানী সিফা/);
});

test("admin navigation exposes Logo & Branding directly under Store", () => {
  const groups = adminNavGroups({});
  const storeItems = groups.find((group) => group.title === "Store")?.items ?? [];
  assert.ok(
    storeItems.some((item) => item.href === "/admin/branding" && item.label === "Logo & Branding"),
  );
});

test("settings API invalidates storefront layout cache when saving logo/brand changes", () => {
  const routeSource = readFileSync(path.join(ROOT, "app/api/admin/settings/route.ts"), "utf8");
  assert.match(routeSource, /revalidatePath\("\/",\s*"layout"\)/);
});
