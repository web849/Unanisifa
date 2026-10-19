import test from "node:test";
import assert from "node:assert/strict";
import { sanitizeLandingHtml } from "../../lib/landing/html";

test("custom HTML strips scripts, iframes and event handlers", () => {
  const output = sanitizeLandingHtml(
    '<div onclick="alert(1)">safe</div><script>alert(2)</script><iframe src="https://example.com"></iframe>',
  );
  assert.match(output, /safe/);
  assert.doesNotMatch(output, /script/i);
  assert.doesNotMatch(output, /iframe/i);
  assert.doesNotMatch(output, /onclick/i);
});

test("custom HTML drops javascript: URLs but keeps safe links with rel", () => {
  const output = sanitizeLandingHtml(
    '<a href="javascript:alert(1)">bad</a><a href="https://example.com">good</a>',
  );
  assert.doesNotMatch(output, /javascript:/i);
  assert.match(output, /href="https:\/\/example.com"/);
  assert.match(output, /rel="noopener noreferrer nofollow"/);
});

test("custom HTML keeps inline styles, images and tables", () => {
  const output = sanitizeLandingHtml(
    '<div style="padding:12px;background-color:#fff"><img src="https://example.com/a.jpg" onerror="x()" /><table><tr><td>A</td></tr></table></div>',
  );
  assert.match(output, /padding:12px/);
  assert.match(output, /<img[^>]+loading="lazy"/);
  assert.match(output, /<table>/);
  assert.doesNotMatch(output, /onerror/i);
});

test("custom HTML removes style tags so the whole page CSS cannot be replaced", () => {
  const output = sanitizeLandingHtml("<style>body{display:none}</style><p style=\"color:#fff\">ok</p>");
  assert.doesNotMatch(output, /<style/i);
  assert.doesNotMatch(output, /body\{/);
  assert.match(output, /color:#fff/);
});

test("empty input is empty output", () => {
  assert.equal(sanitizeLandingHtml(""), "");
  assert.equal(sanitizeLandingHtml("   "), "");
});
