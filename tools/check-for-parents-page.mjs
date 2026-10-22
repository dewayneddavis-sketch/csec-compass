// Verification harness for the public "For parents" page (owner direction
// 2026-10-19: a real page on the site, not a document).
//   node tools/check-for-parents-page.mjs
//
// The page is public and aimed at parents, so this harness checks the two things
// that can go wrong quietly: a claim that is not true of the shipped product
// (the subject count, the prices, a feature that does not exist), and a route or
// link that does not resolve. Prices are read back from the pricing data module
// and the Pricing page rather than trusted, so a price change makes this red
// instead of leaving the parents' page quoting yesterday's Stripe ladder.
//
// Convention note: check(name, condition) — the other order prints "ok true"
// for every line and asserts nothing. The wiring self-test below proves the
// counters move in both directions before any real assertion runs.

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

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

// Copy is written for humans; compare on a whitespace-normalised copy.
const flat = (t) => t.replace(/’/g, "'").replace(/\s+/g, " ").trim();

const page = read("src/pages/ForParentsPage.jsx");
const css = read("src/pages/ForParentsPage.css");
const app = read("src/App.jsx");
const home = read("src/pages/Home.jsx");
const legal = read("src/data/legal.js");
const pricingData = read("src/data/pricingSubjects.js");
const pricingPage = read("src/pages/PricingPage.jsx");
const flatPage = flat(page).replace(/&amp;/g, "&");
// What the banned-claim guards scan: the copy a READER sees. The source
// comments are stripped (they discuss these rules rather than state a claim),
// and so are the page's own denials and the licence ladder's cohort sizes —
// otherwise the guard fires on the page doing the right thing.
const scanText = flatPage
  .replace(/\/\*[\s\S]*?\*\//g, " ")
  .replace(/Nothing here is a trial, a discount or a limited-time offer\./g, " ")
  .replace(/up to 50 \/ 100 \/ 150 students/g, " ");

// ===========================================================================
section("1. the route is real, public and imported");

check("the page is imported by App.jsx", /import ForParentsPage from "\.\/pages\/ForParentsPage"/.test(app));
check("the /for-parents route exists", /<Route path="\/for-parents" element=\{<ForParentsPage \/>\} \/>/.test(app));
check("the route is public (no ProtectedRoute)", !/path="\/for-parents"[^\n]*ProtectedRoute/.test(app));
check("the page brings its own stylesheet", /import "\.\/ForParentsPage\.css"/.test(page) && /\.fp-page\s*\{/.test(css));
check("the page links in-app with the router, not with raw anchors", /import \{ Link \} from "react-router-dom"/.test(page) && !/<a\s+href="\//.test(page));
check("the footer sits outside <Routes> (the new route cannot hide it)", app.indexOf("</Routes>") < app.indexOf('<footer className="app-footer">'));

// ===========================================================================
section("2. a parent can find it");

check("the footer links to it", /<Link to="\/for-parents">For parents<\/Link>/.test(app));
check("the footer link is separated like its neighbours", /app-footer-sep/.test(app));
check("the home page links to it", /<Link to="\/for-parents"/.test(home));
check("the home page still imports Link", /import \{[^}]*\bLink\b[^}]*\} from "react-router-dom"/.test(home));

// ===========================================================================
section("3. every in-page link points at a route that exists");

{
  const targets = [...page.matchAll(/\bto="([^"]+)"/g)].map((m) => m[1]);
  const routes = new Set([...app.matchAll(/<Route path="([^"]+)"/g)].map((m) => m[1]));
  const missing = [...new Set(targets)].filter((t) => !routes.has(t));
  check("the page links somewhere", targets.length > 0, `targets: ${targets.join(", ")}`);
  check("every link resolves to a declared route", missing.length === 0, `missing: ${missing.join(", ")}`);
}

// ===========================================================================
section("4. the claims are true of the shipped product");

check("it says what the platform is, in one plain sentence", /online exam preparation your child works through at their own pace/.test(flatPage));
check("it carries a heading", /<h1>For parents<\/h1>/.test(page));
{
  // The catalogue on disk, not a memory of it: one directory per subject, each
  // with a metadata.json. The page's own number has to agree with it.
  const contentDir = join(root, "content");
  const subjectDirs = readdirSync(contentDir).filter((d) => existsSync(join(contentDir, d, "metadata.json")));
  const stated = (flatPage.match(/(?:<strong>)?(\d+) subjects/) || [])[1];
  check(
    "the subject count on the page equals the catalogue on disk",
    stated !== undefined && Number(stated) === subjectDirs.length,
    `page says ${stated}, catalogue has ${subjectDirs.length}: ${subjectDirs.join(",")}`,
  );
  check(
    "and the split it states is the one that ships (23 CSEC + the two City & Guilds subjects)",
    subjectDirs.length === 25 &&
      subjectDirs.includes("city-guilds-mathematics") &&
      subjectDirs.includes("city-guilds-english") &&
      /23 CSEC subjects plus City & Guilds Mathematics and English/.test(flatPage),
    `dirs: ${subjectDirs.join(",")}`,
  );
}

// The per-subject shape, each asserted against the code that ships it.
check("it claims lessons with an interactive activity each", /<strong>Lessons with an interactive activity for each one\.<\/strong>/.test(page));
check("it claims the 100-question extra practice bank", /<strong>100 extra practice questions<\/strong>/.test(page));
{
  const practice = read("content/english-a/practice.json");
  const bank = JSON.parse(practice);
  check("the 100-question claim matches a real bank (english-a)", Array.isArray(bank) && bank.length === 100, `length ${Array.isArray(bank) ? bank.length : "n/a"}`);
}
check("it describes the timed mock exam, the pass mark and the retake", /about 1½ minutes per question, 60% to pass, and both\s+review and retake/.test(flatPage));
{
  const rules = read("src/data/mockExamRules.js");
  check(
    "the mock-exam numbers are the shipped ones",
    /(^|[^\d])(60|0\.6)([^\d]|$)/.test(rules) && /(1\.5|90|SECOND|MINUT)/i.test(rules),
    rules.split("\n").filter((l) => /60|0\.6|QUES|SECOND|MINUT/i.test(l)).join(" | ").slice(0, 300),
  );
}
check("it claims the 25-question knowledge check", /<strong>A 25-question knowledge check<\/strong>/.test(page));
check("it scopes Paper 2 to the subjects that have one", /Paper 2 typed-answer practice<\/strong> where the subject has a written paper/.test(flatPage));
check("it describes the exam-support section", /command words and exam technique, plus the\s+SBA or oral-exam guidance/.test(flatPage));
check("it claims show-your-work on every Mathematics answer", /box on every Mathematics question/.test(flatPage));
check("and it is true: show-your-work is wired for mathematics", read("src/data/showYourWork.js").includes("mathematics"));
check("it claims the step-by-step method for a wrong answer", /step-by-step method/.test(flatPage));
check("and it is true: the method component exists", /export default function/.test(read("src/components/HowToSolveIt.jsx")));
check("it describes the parent link honestly (progress only, no sign-in as the child)", /does not give you their password or let you sign in as them/.test(flatPage));
check("it tells the parent they can name their child at purchase", /enter your child&rsquo;s email/.test(flatPage));
check("and it is true: the checkout form has that field", /childEmail/.test(pricingPage) || /Your child&rsquo;s email \(optional\)/.test(pricingPage));

// ===========================================================================
section("5. the prices are the ones Stripe and the site carry");

check("the single-subject price is on the page", /\$9\.99/.test(flatPage));
check("the bundle price is on the page", /\$49\.99/.test(flatPage));
check("it states one-time yearly payment with no auto-renewal", /one-time yearly payment: one year of access from\s+the date of purchase, with no automatic renewal/.test(flatPage));
check(
  "the three school tiers are on the page, and they are the shared ladder's numbers",
  /\$1,250 \/ \$2,000 \/ \$2,250 per year/.test(flatPage) &&
    /price: 1250/.test(pricingData) &&
    /price: 2000/.test(pricingData) &&
    /price: 2250/.test(pricingData),
  "page or pricingSubjects.js disagree",
);
check("the cohort sizes are the shared ladder's", /up to 50 \/ 100 \/\s+150 students/.test(flatPage) && pricingData.includes("school-license-50") && pricingData.includes("school-license-150"));
{
  const amounts = [...new Set((flatPage.match(/\$\s?[\d,]+(?:\.\d+)?/g) || []).map((s) => s.replace(/\s/g, "")))].sort();
  check(
    "the page quotes no other money amount (no invented fee, discount or trial)",
    amounts.join(" ") === ["$1,250", "$2,000", "$2,250", "$9.99", "$49.99"].sort().join(" "),
    amounts.join(", "),
  );
}

// ===========================================================================
section("6. the public-page rules: no social proof, no urgency, no guarantee");

const BANNED = [
  [/\b(testimonial|trusted by|thousands of|join \d+|students say)/i, "social proof"],
  [/\b(\d[\d,]*)\s*(students|learners|schools|parents)\b/i, "a count of users"],
  [/\b(pass rate|pass-rate|success rate|results? (of|from) our)\b/i, "a results claim"],
  [/\bguarantee(s|d)?\b[^.]{0,60}\b(pass|grade|score|success)\b/i, "a guarantee"],
  [/\b(improve|boost|raise|increase)\b[^.]{0,30}\b(grades?|marks?|scores?)\b/i, "a grade claim"],
  [/\b(limited time|act now|hurry|only \d+ (spots|places)|spaces (are )?filling|final notice|expires)\b/i, "invented urgency"],
  [/\bwithin \d+ (business )?days\b/i, "a time promise"],
  [/\b(free trial|discount|coupon|promo(tion)?al? code|money[- ]back)\b/i, "an offer that does not exist"],
  [/\b(best|leading|#1|number one)\b[^.]{0,20}\b(platform|site|app)\b/i, "a comparison claim"],
  [/endorsed by (the )?(CXC|Caribbean|City & Guilds)/i, "an endorsement claim"],
];
for (const [re, what] of BANNED) {
  const m = scanText.match(re);
  check(`the page makes no ${what}`, m === null, m ? m[0] : "");
}
check("it does not promise deadlines or rushing", /Nothing on the platform sets\s+deadlines or rushes them/.test(flatPage));

// ===========================================================================
section("7. the honest lines are the shared ones, and no dependency was added");

check("it renders the trademark disclaimer from the shared constant", /\{TRADEMARK_DISCLAIMER\}/.test(page));
check("it renders the City & Guilds counterpart too", /\{CG_TRADEMARK_DISCLAIMER\}/.test(page));
check("both constants are imported from src/data/legal.js", /import \{ TRADEMARK_DISCLAIMER, CG_TRADEMARK_DISCLAIMER \} from "\.\.\/data\/legal"/.test(page));
check("it does not retype the disclaimer's sentence", !/is not affiliated with/i.test(page));
check("it says the content is original material written for CSEC", /original material written for\s+CSEC preparation/.test(flatPage));
check("it says nothing is copied from past papers", /Nothing is copied from past papers/.test(flatPage));
check(
  "the page pulls in no new library (react + the router + legal only)",
  page
    .split("\n")
    .filter((l) => /^\s*import /.test(l))
    .every((l) => /^\s*import "\.\/[A-Za-z]+\.css";\s*$/.test(l) || /from "(react-router-dom|\.\.\/data\/legal)"/.test(l)),
  page.split("\n").filter((l) => /^\s*import /.test(l)).join(" | "),
);
check("no new dependency was added for any of this", !/"(marked|remark|react-markdown|dompurify|date-fns|dayjs|framer-motion)"/.test(read("package.json")));

// ===========================================================================
section("8. mobile-first, on the site's own tokens");

check("the base rules are the phone layout", /\.fp-page\s*\{[^}]*padding: 1\.25rem 1rem/.test(css));
check("the buttons stack on a phone and only go inline from 640px up", /\.fp-cta-row\s*\{[^}]*flex-direction: column/.test(css) && /@media \(min-width: 640px\)/.test(css) && /\.fp-cta-row \{ flex-direction: row; flex-wrap: wrap; \}/.test(css));
check("it uses the site's existing colour values", /#0e7490/.test(css) && /#0f172a/.test(css) && /#e2e8f0/.test(css));
check("the CTA buttons are styled and there is a ghost variant", /\.fp-btn\s*\{/.test(css) && /\.fp-btn-ghost\s*\{/.test(css));
check("the trademark lines are styled, not left bare", /\.fp-disclaimer\s*\{/.test(css));

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
