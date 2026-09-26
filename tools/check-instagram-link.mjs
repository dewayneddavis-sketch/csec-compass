// Verification harness: the Instagram link (owner addition 2026-09-26).
//   node tools/check-instagram-link.mjs
//
// The owner asked for an Instagram logo/link on the homepage pointing at the
// confirmed handle @csec_compass, plus the site-wide footer where the layout
// allows it. Two things can rot silently here and neither shows up in a review
// of the diff:
//   1. the URL/handle gets retyped somewhere instead of read from the one data
//      module, so a later handle change updates one surface and not the others;
//   2. the link loses what makes it a link — target/rel, or the accessible name
//      (an icon-only anchor with no label is announced as "link").
// This harness reads the source of truth, then asserts the two surfaces render
// it and that the anchor keeps its security + a11y attributes.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, relative } from "node:path";
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(root, p), "utf8");
let passed = 0;
let failed = 0;
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
// other way round — check(condition, "name") — every line prints "ok   true"
// and nothing is actually asserted. This proves the counters move both ways.
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
// Walk src/ so "nobody retyped the handle" is a fact about the whole app, not
// about the two files we happen to remember.
function walk(dir, out = []) {
  for (const entry of readdirSync(join(root, dir))) {
    const rel = `${dir}/${entry}`;
    if (statSync(join(root, rel)).isDirectory()) walk(rel, out);
    else out.push(rel);
  }
  return out;
}
const socialSrc = read("src/data/social.js");
const componentSrc = read("src/components/InstagramLink.jsx");
const homeSrc = read("src/pages/Home.jsx");
const appSrc = read("src/App.jsx");
const social = await import("../src/data/social.js");
// ---------------------------------------------------------------------------
section("the handle is written down once, and it is the confirmed one");
check("the data module exports the confirmed handle", social.INSTAGRAM_HANDLE === "csec_compass", String(social.INSTAGRAM_HANDLE));
check(
  "the profile URL is exactly the confirmed one (https, handle, trailing slash)",
  social.INSTAGRAM_URL === "https://www.instagram.com/csec_compass/",
  String(social.INSTAGRAM_URL)
);
check("the URL is built from the handle, not spelled out twice", /instagram\.com\/\$\{INSTAGRAM_HANDLE\}/.test(socialSrc));
check(
  "the accessible name says whose profile it is",
  social.INSTAGRAM_LABEL === "CSEC Compass on Instagram",
  String(social.INSTAGRAM_LABEL)
);
check("the homepage copy names the handle", social.INSTAGRAM_CTA.includes(`@${social.INSTAGRAM_HANDLE}`), String(social.INSTAGRAM_CTA));
check("the footer copy is the bare handle", social.INSTAGRAM_SHORT_CTA === "@csec_compass", String(social.INSTAGRAM_SHORT_CTA));
// ---------------------------------------------------------------------------
section("no second copy of the URL or the handle anywhere in src/");
const srcFiles = walk("src");
const filesWithUrl = srcFiles.filter((f) => /instagram\.com/i.test(readFileSync(join(root, f), "utf8")));
check(
  "exactly one file under src/ spells out an instagram.com address",
  filesWithUrl.length === 1 && filesWithUrl[0] === "src/data/social.js",
  filesWithUrl.join(", ") || "none"
);
const filesWithHandle = srcFiles.filter(
  (f) => f !== "src/data/social.js" && /csec_compass/.test(readFileSync(join(root, f), "utf8"))
);
check(
  "no other file under src/ retypes the handle",
  filesWithHandle.length === 0,
  filesWithHandle.join(", ") || "none"
);
check("the link component itself holds no literal URL or handle", !/instagram\.com/i.test(componentSrc) && !/csec_compass/.test(componentSrc));
check("the homepage holds no literal URL or handle either", !/instagram\.com/i.test(homeSrc) && !/csec_compass/.test(homeSrc));
check("the footer in App.jsx holds no literal URL or handle", !/instagram\.com/i.test(appSrc) && !/csec_compass/.test(appSrc));
// ---------------------------------------------------------------------------
section("the link is a real link, accessible and safe to open in a new tab");
check("it is an <a> with an href, not a JS click handler", /<a\b[\s\S]{0,400}?href=\{INSTAGRAM_URL\}/.test(componentSrc));
check("it opens in a new tab", /target="_blank"/.test(componentSrc));
check("…without handing the opened page a window.opener handle", /rel="noopener noreferrer"/.test(componentSrc));
check("the anchor carries the accessible name (aria-label)", /aria-label=\{INSTAGRAM_LABEL\}/.test(componentSrc));
check("the same name is available as a tooltip", /title=\{INSTAGRAM_LABEL\}/.test(componentSrc));
check("its visible text comes from the data module, not from a local literal", /text\s*=\s*INSTAGRAM_CTA\b/.test(componentSrc));
check("the logo is a graphic, so a screen reader skips it", /aria-hidden="true"/.test(componentSrc) && /focusable="false"/.test(componentSrc));
check("the logo is drawn inline — no icon font, no remote asset, no <img>", /<svg\b/.test(componentSrc) && !/<img\b/.test(componentSrc) && !/url\(https?:/i.test(read("src/components/InstagramLink.css")));
check("the markup has no onClick navigation to stand in for the href", !/onClick=/.test(componentSrc));
check("imports the one source of truth", /from "\.\.\/data\/social"/.test(componentSrc));
check("it brings its own stylesheet with it", /import "\.\/InstagramLink\.css"/.test(componentSrc));
const componentCss = read("src/components/InstagramLink.css");
check("its class is actually styled", /\.instagram-link\s*\{[^}]{20,}\}/.test(componentCss));
check("keyboard focus is visible on it", /\.instagram-link:focus-visible\s*\{[^}]{10,}\}/.test(componentCss));
// ---------------------------------------------------------------------------
section("the homepage renders it");
check("Home.jsx imports the shared component", /import InstagramLink from "\.\.\/components\/InstagramLink"/.test(homeSrc));
const homeRenderAt = homeSrc.indexOf("<InstagramLink");
check("Home.jsx renders it", homeRenderAt !== -1);
check(
  "…inside the homepage component, not in a helper above it",
  homeRenderAt > homeSrc.indexOf("export default function Home"),
  `render at ${homeRenderAt}`
);
const homeCss = read("src/pages/Home.css");
check("the strip around it is styled", /\.home-social\s*\{[^}]{20,}\}/.test(homeCss) && /\.home-social-title\s*\{[^}]{10,}\}/.test(homeCss));
check("Home.css is still imported by the page", /import "\.\/Home\.css"/.test(homeSrc));
check("the homepage is the site root, so the owner's \"on the homepage\" is /", /<Route path="\/" element=\{<Home \/>\}/.test(appSrc));
// ---------------------------------------------------------------------------
section("the site-wide footer carries it too");
check("App.jsx imports the shared component", /import InstagramLink from "\.\/components\/InstagramLink"/.test(appSrc));
check("App.jsx takes the footer's short copy from the data module", /import \{ INSTAGRAM_SHORT_CTA \} from "\.\/data\/social"/.test(appSrc));
const footerAt = appSrc.indexOf('<footer className="app-footer">');
const footerEnd = appSrc.indexOf("</footer>");
const footerRenderAt = appSrc.indexOf("<InstagramLink");
check("the footer renders it", footerRenderAt !== -1);
check(
  "…inside <footer>, so every page carries the link",
  footerAt !== -1 && footerRenderAt > footerAt && footerRenderAt < footerEnd,
  `footer ${footerAt}-${footerEnd}, link at ${footerRenderAt}`
);
check("the footer link passes the handle as its visible text", /<InstagramLink[^>]*text=\{INSTAGRAM_SHORT_CTA\}/.test(appSrc));
check("the footer link has its own class", /className="app-footer-instagram"/.test(appSrc));
check("that class is styled, sized for the small-print row", /\.app-footer-instagram\s*\{[^}]{10,}\}/.test(read("src/App.css")));
// ---------------------------------------------------------------------------
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
