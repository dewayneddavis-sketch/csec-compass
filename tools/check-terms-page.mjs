// Verification harness: Terms of Service + the site-wide trademark disclaimer.
//   node tools/check-terms-page.mjs
//
// Owner's legal review (2026-09-22, Jamaica Copyright Act / Consumer Protection
// Act) asked the site for two things it did not have: a Terms of Service page,
// and the independence/trademark disclaimer. Everything here is ADDITIVE — the
// review found no CXC past-paper reproduction and no endorsement or pass-rate
// claims, so this harness also guards against such a claim creeping in later.
//
// It checks the wording rather than trusting it: the exact sentence the review
// specified has to be present verbatim, the footer has to carry it on every page
// (it lives outside <Routes>), and the page has to cover the five points the
// review named.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(root, p), "utf8");

let passed = 0;
let failed = 0;
function check(name, cond, detail) {
  if (cond) {
    passed += 1;
    console.log(`  ok   ${name}`);
  } else {
    failed += 1;
    console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`);
  }
}
function section(title) {
  console.log(`\n== ${title}`);
}

// Copy is written for humans, so line breaks are not wording: compare on a
// whitespace-normalised copy of the source everywhere below.
const flat = (text) => text.replace(/’/g, "'").replace(/\s+/g, " ").trim();

const legal = read("src/data/legal.js");
const termsPage = read("src/pages/TermsPage.jsx");
const app = read("src/App.jsx");
const appCss = read("src/App.css");
const flatLegal = flat(legal);
const flatTerms = flat(termsPage);
const flatApp = flat(app);

// The sentence the review asked for, word for word.
const REQUIRED_DISCLAIMER =
  "CSEC Compass is an independent study platform and is not affiliated with, authorized, or endorsed by the Caribbean Examinations Council (CXC). CSEC® is a registered trademark of the Caribbean Examinations Council.";

// ===========================================================================
section("1. the exact independence + trademark disclaimer");

check("the required sentence exists, word for word", flatLegal.includes(REQUIRED_DISCLAIMER), flatLegal.slice(0, 220));
check("it names the Caribbean Examinations Council in full", REQUIRED_DISCLAIMER.includes("Caribbean Examinations Council"));
check("it says independent", /independent study platform/.test(flatLegal));
check("it denies affiliation, authorization AND endorsement", /not affiliated with, authorized, or endorsed by/.test(flatLegal));
check("it marks CSEC as a registered trademark", /CSEC® is a registered trademark/.test(flatLegal));
check("the page renders that constant rather than a paraphrase", /\{TRADEMARK_DISCLAIMER\}/.test(termsPage));
check("the footer renders the same constant", /\{TRADEMARK_DISCLAIMER\}/.test(app));
check(
  "the wording is not repeated inline anywhere (no chance of drift)",
  !/is not affiliated with/i.test(termsPage.replace(/\{TRADEMARK_DISCLAIMER\}/g, "")) && !/is not affiliated with/i.test(app),
);
check("the version shown on the page has no line break inside the sentence", /"[^"\n]*CSEC® is a registered trademark of the Caribbean Examinations Council\.",?$/m.test(legal) || /CSEC® is a registered trademark of the Caribbean Examinations Council\.";/.test(flat(legal)));

// ===========================================================================
section("2. the Terms page covers what the review named");

check("the /terms page is a real page with a heading", /<h1>Terms of Service<\/h1>/.test(termsPage));
check("it is dated", /Last updated/.test(termsPage) && /\{TERMS_LAST_UPDATED\}/.test(termsPage));
check(
  "content is our own and written to match CSEC topics",
  /original creations of CSEC Compass/.test(flatTerms) && /written to match the style and structure of CSEC examination topics/.test(flatTerms),
);
check("and explicitly not official past papers", /not official CXC past papers/.test(flatTerms) && /not reproduced from any past paper/.test(flatTerms));
check("external links to CXC are called out as external", /external link/i.test(flatTerms));
check("results vary by individual student effort", /Results vary by individual student effort/.test(flatTerms));
check("and no grade outcome is guaranteed", /no grade outcome is guaranteed/i.test(flatTerms));
check("the page promises no pass either", /do not promise a pass/i.test(flatTerms));
check("one year of access from purchase", /one year of access from the date of purchase/.test(flatTerms));
check("the school licence is per seat, per year", /per seat, per year/.test(flatTerms));
check("refunds are handled per Stripe's policy", /refunds are handled per Stripe's policy/i.test(flatTerms) && /Stripe/.test(flatTerms));
check("it points at the purchase record for a refund", /purchase record/.test(flatTerms));
check("it says nothing auto-renews", /does not quietly renew/.test(flatTerms));
check("single-user accounts", /One account, one person/.test(flatTerms) && /single-user/.test(flatTerms));
check("no sharing logins", /Do not share your login/.test(flatTerms));
check("no redistribution or resale of the content", /resell or redistribute/.test(flatTerms));
check("no scraping", /Do not use automated tools to scrape/.test(flatTerms));
check("breaking the rules can suspend an account", /may be suspended or closed/.test(flatTerms));
check("and it says how changes to the terms are handled", /Changes to these terms/.test(flatTerms));

// ===========================================================================
section("3. the /terms route");

check("the route exists", /<Route path="\/terms" element=\{<TermsPage \/>\} \/>/.test(app));
check("the page is imported", /import TermsPage from "\.\/pages\/TermsPage"/.test(app));
check("the route is public (not wrapped in ProtectedRoute)", /<Route path="\/terms" element=\{<TermsPage \/>\} \/>/.test(app) && !/path="\/terms"[^\n]*ProtectedRoute/.test(app));
check("the import list is alphabetical-ish with its neighbours", app.indexOf("import TermsPage") > app.indexOf("import PlannerPage"));
check("the terms page is not lazy or behind an auth check", !/lazy\(|ProtectedRoute>\s*<TermsPage/.test(app));

// ===========================================================================
section("4. the disclaimer is site-wide (Home, Pricing and every other page)");

const footerAt = app.indexOf('<footer className="app-footer">');
const routesCloseAt = app.indexOf("</Routes>");
check("the footer exists", footerAt !== -1);
check("it sits OUTSIDE <Routes>, so every route renders it", routesCloseAt !== -1 && routesCloseAt < footerAt, `routesClose@${routesCloseAt} footer@${footerAt}`);
check("the footer carries the disclaimer", flatApp.includes("{TRADEMARK_DISCLAIMER}"));
check("the footer links to the terms", /<Link to="\/terms">Terms of Service<\/Link>/.test(app));
check(
  "App.jsx imports Link (the footer uses it — a missing import blanks the whole app)",
  /import \{[^}]*\bLink\b[^}]*\} from "react-router-dom"/.test(app),
  app.split("\n").find((l) => l.includes("react-router-dom")) || "",
);
check("the footer keeps its original tagline", /CSEC Compass — Your self-paced CSEC exam prep platform/.test(app));
check("the footer disclaims on Home and Pricing specifically (they render no footer of their own)", !read("src/pages/Home.jsx").includes("app-footer") && !read("src/pages/PricingPage.jsx").includes("app-footer"));
check("the compass wordmark style is untouched", read("src/components/Navbar.jsx").includes("🧭"));
check("the legal line is styled, not left bare", /\.app-footer-legal\s*\{/.test(appCss) && /\.app-footer-links\s+a\s*\{/.test(appCss));
check("the terms page brings its own stylesheet", /import "\.\/TermsPage\.css"/.test(termsPage) && /\.terms-page\s*\{/.test(read("src/pages/TermsPage.css")));

// ===========================================================================
section("5. guards: no guarantee claim, no endorsement claim, no new dependency");

const pages = ["src/pages/Home.jsx", "src/pages/PricingPage.jsx", "src/pages/TermsPage.jsx", "src/pages/AccountPage.jsx"];
let guaranteeClaim = null;
// Our own DENIALS are the point of the page, so remove them before looking for
// an affirmative claim: "no grade outcome is guaranteed" is the wording the
// review asked for, not a claim.
const DENIALS = [/no grade outcome is guaranteed/gi, /do not promise a pass/gi, /no grade[^.]*guaranteed/gi];
for (const p of pages) {
  let text = flat(read(p));
  for (const d of DENIALS) text = text.replace(d, " ");
  const m =
    text.match(/\bguarantee(s|d)?\b[^.]{0,60}\b(pass|grade|A|score|success)\b/i) ||
    text.match(/\b(pass|grade|score)\b[^.]{0,30}\bguaranteed\b/i);
  if (m) guaranteeClaim = `${p}: ${m[0]}`;
}
check("no page claims a guaranteed pass or grade", guaranteeClaim === null, guaranteeClaim || "");
check("no page claims endorsement by CXC", !pages.some((p) => /endorsed by (the )?(CXC|Caribbean)/i.test(read(p).replace(/\{TRADEMARK_DISCLAIMER\}/g, ""))));
check("no page claims to be official", !pages.some((p) => /\bofficial CXC\b/i.test(read(p).replace(/not official CXC past papers|official CXC past papers and are not/i, ""))));
check(
  "the terms page pulls in no new library (react + the router only)",
  termsPage
    .split("\n")
    .filter((l) => /^\s*import /.test(l))
    .every((l) =>
      /^\s*import "\.\/[A-Za-z]+\.css";\s*$/.test(l) || // a side-effect stylesheet import names no package
      /from "(react|react-router-dom|\.\.\/data\/legal)"/.test(l)
    ),
  termsPage.split("\n").filter((l) => /^\s*import /.test(l)).join(" | "),
);
check("no new dependency was added for this page", !/"(marked|remark|react-markdown|dompurify)"/.test(read("package.json")));

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
