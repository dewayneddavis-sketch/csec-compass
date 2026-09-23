// Verification harness: the site's downloadable flyer and the Pricing link to
// it.
//   node tools/check-flyer-download.mjs
//
// Owner decision 2026-09-22: the A5 two-sided one-pager IS the site's
// downloadable flyer. It replaces the PDF that used to sit at the same stable
// URL — /leave-behind.pdf, served straight out of public/ — which was the
// password-protected A4 variant (md5 f9c17b7d…) nobody could open. Pricing now
// carries a "Download our flyer (PDF)" link beside the access/refund line at the
// foot of the page: findable, not loud.
//
// Two things have to stay true, and neither is visible in a diff:
//   1. the file at public/leave-behind.pdf is the two-page A5 (a re-render that
//      silently produced one page, or A4, would still "look fine" here);
//   2. it opens without a password (an encrypted PDF is a dead download).
// This harness reads the PDF's own geometry out of its bytes, so it does not
// care which renderer produced it, and it deliberately does NOT try to read the
// flyer's wording — chromium subsets the fonts and encodes text as glyph ids, so
// a text search over the bytes proves nothing either way. Copy is checked at the
// source (principal-meeting/v2/flyer-a5.html) before the PDF is rendered.
import { readFileSync, existsSync, statSync } from "node:fs";
import { inflateSync } from "node:zlib";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(root, p), "utf8");
let passed = 0;
let failed = 0;
// The wiring self-test below deliberately asserts a false condition, and it must
// not print a FAIL line while doing so — a green run should read green.
let quiet = false;
function check(name, cond, detail) {
  if (cond) {
    passed += 1;
    if (!quiet) console.log(`  ok   ${name}`);
  } else {
    failed += 1;
    if (!quiet) console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`);
  }
}
function section(title) {
  console.log(`\n== ${title}`);
}
// ---------------------------------------------------------------------------
// Wiring self-test, run before anything real and then reset.
//
// NOTE on argument order: the convention is check(name, condition). Written the
// other way round — check(condition, "name") — the harness prints "ok   true"
// for every line and asserts nothing at all. This block proves the counters
// move for both outcomes instead of trusting a comment.
{
  const p0 = passed;
  const f0 = failed;
  quiet = true;
  check("probe-false", false);
  check("probe-true", true);
  quiet = false;
  const wired = failed === f0 + 1 && passed === p0 + 1;
  passed = 0;
  failed = 0;
  check("wiring: a false condition counts as a failure and a true one as a pass", wired);
}
const flat = (text) => text.replace(/\s+/g, " ").trim();
// ---------------------------------------------------------------------------
// The flyer file: public/leave-behind.pdf, served at /leave-behind.pdf.
const PDF_PATH = "public/leave-behind.pdf";
// The retired variant that used to be live at this URL: the password-protected
// A4 one-pager. If this ever comes back, the download is broken again.
const RETIRED_MD5 = "f9c17b7dd446ae3825f0db0ee4b73453";
const RETIRED_SIZE = 75407;
// A5 in points (148 x 210 mm). chromium prints 420 x 594.95996 for the CSS box
// the flyer pins, so compare with a tolerance rather than an exact string.
const A5_W = 419.53;
const A5_H = 595.28;
const TOL = 2;
section("the flyer file");
const pdfExists = existsSync(join(root, PDF_PATH));
check(`${PDF_PATH} exists`, pdfExists);
const pdf = pdfExists ? readFileSync(join(root, PDF_PATH)) : Buffer.alloc(0);
const pdfSize = pdfExists ? statSync(join(root, PDF_PATH)).size : 0;
check("the flyer is a real PDF (starts with %PDF- and ends with %%EOF)", /^%PDF-1\.\d/.test(pdf.toString("latin1", 0, 8)) && pdf.toString("latin1").trimEnd().endsWith("%%EOF"));
check("the flyer has real content in it (> 60 KB, not a placeholder)", pdfSize > 60000, `${pdfSize} bytes`);
check("the site no longer serves the retired password-protected A4 variant", createHash("md5").update(pdf).digest("hex") !== RETIRED_MD5 && pdfSize !== RETIRED_SIZE);
// An encrypted PDF asks for a password in every reader; the whole point of the
// new file is that it just opens. /Encrypt lives in the trailer.
const latin = pdf.toString("latin1");
check("the flyer opens without a password (no /Encrypt in the trailer)", !/\/Encrypt\b/.test(latin));
// Object streams: chromium usually writes page dictionaries in clear text, but
// a different renderer may put them inside a FlateDecode stream. Search the raw
// bytes first and fall back to the inflated streams so the geometry checks below
// are never silently skipped.
let haystack = latin;
if (!/\/MediaBox/.test(haystack)) {
  let inflated = "";
  for (const match of latin.matchAll(/stream\r?\n([\s\S]*?)\r?\nendstream/g)) {
    try {
      inflated += inflateSync(Buffer.from(match[1], "latin1")).toString("latin1");
    } catch {
      /* not a Flate stream (image, font) — ignore */
    }
  }
  haystack += inflated;
}
// /Type /Page but not /Type /Pages (and not a /Type /PageRef-ish token).
const pageCount = [...haystack.matchAll(/\/Type\s*\/Page(?![sA-Za-z])/g)].length;
const declaredCount = haystack.match(/\/Type\s*\/Pages[\s\S]{0,200}?\/Count\s+(\d+)/);
const boxes = [...haystack.matchAll(/\/MediaBox\s*\[\s*([\d.\-]+)\s+([\d.\-]+)\s+([\d.\-]+)\s+([\d.\-]+)\s*\]/g)].map((m) => ({
  raw: m[0].replace(/\s+/g, " "),
  w: Number(m[3]) - Number(m[1]),
  h: Number(m[4]) - Number(m[2]),
}));
check("the flyer is two pages, front and back", pageCount === 2, `found ${pageCount} page objects`);
check("the page tree declares two pages too", declaredCount ? Number(declaredCount[1]) === 2 : false, declaredCount ? `declared ${declaredCount[1]}` : "no /Count found");
check("at least one page box is readable from the file", boxes.length > 0, `${boxes.length} MediaBox entries`);
const sizes = boxes.map((b) => `${b.w}x${b.h}`);
const a5 = (b) => Math.abs(b.w - A5_W) <= TOL && Math.abs(b.h - A5_H) <= TOL;
check(`every page is A5 (${A5_W} x ${A5_H} pt, ±${TOL})`, boxes.every(a5), sizes.join(", "));
check("no page is still the old A4 box", !boxes.some((b) => Math.abs(b.w - 595) <= TOL && Math.abs(b.h - 842) <= TOL));
if (boxes.length > 1) {
  const same = boxes.every((b) => Math.abs(b.w - boxes[0].w) < 0.01 && Math.abs(b.h - boxes[0].h) < 0.01);
  check("front and back are the same size", same, sizes.join(", "));
} else {
  check("front and back are the same size (one box on the page tree)", boxes.length === 1, String(boxes.length));
}
console.log(`       geometry: ${pageCount} page(s), ${boxes.map((b) => `${b.w.toFixed(2)}x${b.h.toFixed(2)}`).join(", ") || "none"}, ${pdfSize} bytes`);
// ---------------------------------------------------------------------------
// The Pricing page: one visible link, on the stable URL, styled, and inside the
// header block (not buried under the plan cards).
section("the Pricing page links to it");
const pricingPage = read("src/pages/PricingPage.jsx");
const pricingCss = read("src/pages/Pricing.css");
const flatPricing = flat(pricingPage);
// Count hrefs, not every mention: the comment above the link names the URL on
// purpose, and a bare substring count would read that as a second link.
const hrefCount = (flatPricing.match(/href="\/leave-behind\.pdf"/g) || []).length;
check("the page links to /leave-behind.pdf exactly once (the stable URL kept from before)", hrefCount === 1, `${hrefCount} href(s)`);
check("the link is a link, not a button that needs JS", /<a\b[^>]*href="\/leave-behind\.pdf"/.test(flatPricing));
check('the link says what it is: "Download our flyer (PDF)"', /Download our flyer \(PDF\)/.test(flatPricing));
check("it downloads under a sensible file name", /download="csec-compass-flyer\.pdf"/.test(flatPricing));
const linkAt = flatPricing.indexOf('href="/leave-behind.pdf"');
const gridAt = flatPricing.indexOf("pricing-grid");
// Where it belongs: the lead's re-scope put the link with the access/refund
// pointer — "so it's findable but not loud" — at the foot of the page, not up in
// the header competing with the plans. Both halves are checked: it comes after
// that pointer, and it is below the plan cards.
const refundAt = flatPricing.indexOf("Refunds per our");
check("the link sits with the access/refund pointer, not up in the header", refundAt !== -1 && linkAt > refundAt, `access/refund pointer at ${refundAt}, link at ${linkAt}`);
check("it is below the plan cards, where the page's small print lives", gridAt !== -1 && linkAt > gridAt);
check("the link carries its own class", /className="pricing-flyer-link"/.test(flatPricing));
const cssRule = pricingCss.match(/\.pricing-flyer-link\{([^}]*)\}/);
check("that class is actually styled in Pricing.css", cssRule !== null && cssRule[1].length > 20, cssRule ? "" : "no .pricing-flyer-link rule");
check("its note wrapper is styled too (it sits in the small print)", /\.pricing-flyer-note\{[^}]{5,}\}/.test(pricingCss));
check("the driver styles reach the link (PricingPage imports Pricing.css)", /import "\.\/Pricing\.css";/.test(pricingPage));
// ---------------------------------------------------------------------------
// Static hosting: /leave-behind.pdf has to be served as the PDF, not swallowed
// by the SPA fallback that every other route relies on.
section("it is served at that URL, not swallowed by the SPA fallback");
const viteConfig = read("vite.config.js");
check("vite still copies public/ to the site root (no publicDir override)", !/publicDir/.test(viteConfig));
check("no rewrite targets the flyer (static files win, so the rule would be shadowing)", !/leave-behind\.pdf/.test(read("vercel.json")) && !/leave-behind\.pdf/.test(read("netlify.toml")));
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
