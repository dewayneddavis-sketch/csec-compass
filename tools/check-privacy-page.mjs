// Verification harness: the Privacy Policy page + the consent and refund
// affordances the owner's legal review asked for (round 2).
//   node tools/check-privacy-page.mjs
//
// Round 1 (PR #79) added the Terms page and the site-wide trademark
// disclaimer. This round adds the privacy half, the signup consent checkbox and
// a refund/access pointer on Pricing. Everything here is ADDITIVE.
//
// It checks the wording rather than trusting it: the business inbox has to be
// spelled exactly as the owner gave it and must exist in ONE place, the page has
// to name the Act and cover each point the review named, and BOTH
// account-creation forms on the site (/signup and /auth/signup) have to carry
// the consent checkbox — a consent step that one of the two forms skips would
// not be consent.

import { readFileSync } from "node:fs";
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
// for every line and asserts nothing at all, which is how a whole section of the
// teacher-dashboard harness once passed while pointing at stale code. This block
// proves the counters move for both outcomes instead of trusting a comment.
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

// Copy is written for humans, so line breaks are not wording: compare on a
// whitespace-normalised copy of the source everywhere below.
const flat = (text) => text.replace(/’/g, "'").replace(/\s+/g, " ").trim();

const legal = read("src/data/legal.js");
const privacyPage = read("src/pages/PrivacyPage.jsx");
const privacyCss = read("src/pages/PrivacyPage.css");
const termsPage = read("src/pages/TermsPage.jsx");
const app = read("src/App.jsx");
const appCss = read("src/App.css");
const authPage = read("src/pages/AuthPage.jsx");
const authCss = read("src/pages/Auth.css");
const signupPage = read("src/pages/SignupPage.jsx");
const signupCss = read("src/pages/SignupPage.css");
const pricingPage = read("src/pages/PricingPage.jsx");
const pricingCss = read("src/pages/Pricing.css");

const flatLegal = flat(legal);
const flatPrivacy = flat(privacyPage);
const flatApp = flat(app);
const flatAuth = flat(authPage);
const flatSignup = flat(signupPage);
const flatPricing = flat(pricingPage);

// The owner's business inbox, spelled exactly as given. It is the ONLY contact
// on the page: no personal address, no phone number.
const REQUIRED_INBOX = "csec-compass-01a1f7d3@ctomail.io";

// ===========================================================================
section("1. the one place a person writes to (the business inbox)");

check("the exact business inbox is declared, word for word", flatLegal.includes(`"${REQUIRED_INBOX}"`), flatLegal.slice(-160));
check("it is the only contact address in the source tree", (function () {
  // Exactly one occurrence anywhere under src/: the constant by the pages that
  // render it. A second copy is how the page and the constant drift apart.
  const files = [
    "src/data/legal.js",
    "src/pages/PrivacyPage.jsx",
    "src/pages/TermsPage.jsx",
    "src/App.jsx",
    "src/pages/PricingPage.jsx",
    "src/pages/AuthPage.jsx",
    "src/pages/SignupPage.jsx",
  ];
  let count = 0;
  for (const f of files) count += (read(f).match(new RegExp(REQUIRED_INBOX.replace(/[.@]/g, "\\$&"), "g")) || []).length;
  return count === 1;
})());
check("the page renders the constant rather than a typed-out address", /\{PRIVACY_CONTACT_EMAIL\}/.test(privacyPage));
check("the address is not re-typed inline on the page", !privacyPage.includes(REQUIRED_INBOX));
const FREE_MAIL = /@(gmail|yahoo|hotmail|outlook|icloud|aol|live|proton(mail)?)\./i;
check("nothing on the legal pages points at a free-mail address", !FREE_MAIL.test(legal) && !FREE_MAIL.test(privacyPage) && !FREE_MAIL.test(app));
check("the owner's own address does not appear in legal copy", !/dewdavis519|OWNER_EMAILS/.test(legal) && !/dewdavis519/.test(privacyPage));
check("no phone number, WhatsApp or 'call us' on the page", !/whatsapp|tel:|call us|\+1\s?\(?\d{3}\)?/i.test(privacyPage));
check("the private inbox is styled so it is not missed", /\.privacy-contact\s*\{/.test(privacyCss));

// ===========================================================================
section("2. the page is the privacy half of the review");

check("the /privacy page is a real page with a heading", /<h1>Privacy Policy<\/h1>/.test(privacyPage));
check("it is dated", /Last updated \{PRIVACY_LAST_UPDATED\}/.test(privacyPage));
check("the date constant exists and matches the terms date", /PRIVACY_LAST_UPDATED = "22 September 2026"/.test(flatLegal));
check("it names the Act in full", /Jamaica’s Data Protection Act 2020|Jamaica's Data Protection Act 2020/.test(flatPrivacy) || /Data Protection Act 2020/.test(flatPrivacy));
check("it says which country's law this is", /Jamaica/.test(flatPrivacy));

// --- what we collect ------------------------------------------------------
check("it says the account needs an email address", /Your email address/.test(flatPrivacy) && /the one you sign up with/i.test(flatPrivacy));
check("and that signup asks for nothing else", /no name, no address, no phone number, no date of birth/i.test(flatPrivacy));
check("it is true: neither signup form collects a name", !/name="(full)?name"|>Full Name<|>Name</.test(authPage) && !/name="(full)?name"|>Full Name<|>Name</.test(signupPage));
check("it says the password is stored hashed by the auth provider", /hashed form/.test(flatPrivacy) && /Supabase/.test(flatPrivacy) && /never keeps your password in readable form/.test(flatPrivacy));
check("it lists the study activity it keeps", /lessons you have ticked off/.test(flatPrivacy) && /lab activities/.test(flatPrivacy) && /mock exam results/.test(flatPrivacy) && /revision plan/.test(flatPrivacy));
check("it tells the truth about browser storage for drafts", /browser’s local\s+storage|browser's local storage/.test(flatPrivacy));
check("it records what was bought and when", /Your purchase record/.test(flatPrivacy) && /single subject, the All\s+Subjects bundle, or a school licence/.test(flatPrivacy));
check("it names the emails collected for linking", /Emails used for linking/.test(flatPrivacy) && /at\s+checkout/.test(flatPrivacy));
check(
  "it says card numbers never reach us",
  /never reach CSEC Compass/.test(flatPrivacy) && /we never see or store them/i.test(flatPrivacy),
);
check("it says what is NOT collected", /What we do not collect/.test(flatPrivacy) && /No card or bank details/.test(flatPrivacy));
check("it says no special-category data is wanted", /special categories/.test(flatPrivacy) && /we do not ask for any of it/i.test(flatPrivacy));
check("it says there are no ad or analytics trackers", /no ad networks and no third-party\s+analytics/i.test(flatPrivacy));
check("it is true: index.html loads no third-party script", !/<script[^>]+(?!src="\/src\/main\.jsx")[^>]*src="https?:/.test(read("index.html")));

// --- why, and the legal basis --------------------------------------------
check("it gives the reason: the access that was bought", /the access you bought/.test(flatPrivacy));
check("it gives the reason: progress for the linked adult", /show progress/.test(flatPrivacy) && /per-student progress view/.test(flatPrivacy));
check("it says there is no profiling and no advertising use", /no profiling, no advertising, no selling/i.test(flatPrivacy));
check("consent is named as a basis", /Your consent/.test(flatPrivacy) && /withdraw that consent/.test(flatPrivacy));
check("the purchase contract is named as a basis", /The contract with you/.test(flatPrivacy));
check("the adult who makes a link is named as the basis for linking", /The adult who makes a link/.test(flatPrivacy));

// --- who sees what --------------------------------------------------------
check("it says the student sees their own work", /You<\/strong> — your own account|your own account sees your own lessons/.test(flatPrivacy));
check("a teacher sees only the students they linked", /students that teacher has linked/.test(flatPrivacy));
check("a parent sees only their linked child", /only for the child linked to that parent/.test(flatPrivacy));
check("a school admin is scoped to one school", /scoped to one school and cannot see another school/.test(flatPrivacy));
check("it states the fail-closed behaviour in plain words", /refuse to return any data at all/i.test(flatPrivacy));
check("the processors are named", /Supabase/.test(flatPrivacy) && /Stripe/.test(flatPrivacy) && /Vercel/.test(flatPrivacy));
check("it denies selling, and only selling", /We do not sell or rent personal data to anyone/.test(flatPrivacy));
check("it never claims to sell or trade data", !/\bwe (sell|trade|rent out)\b(?! )?.*(data|information)/i.test(flatPrivacy.replace(/We do not sell or rent personal data to anyone/gi, "")));

// --- children -------------------------------------------------------------
check("it addresses students under 18", /under 18/.test(flatPrivacy));
check("it says the adult makes the link, never the child", /made by an adult who\s+is responsible for the student/.test(flatPrivacy) && /does not create them/.test(flatPrivacy));
check("it says a link cannot sign in as the student", /does not give the linked adult the student’s password|ability to sign in as them/.test(flatPrivacy));
check("it tells a parent how to remove a link", /want a link removed/.test(flatPrivacy));
check("it puts the school's duty to inform on the school", /responsible for telling its students/.test(flatPrivacy));

// --- retention, rights ----------------------------------------------------
check("it says data is kept while the account is active", /While your account is active/.test(flatPrivacy));
check("it says a deletion request is honoured", /If you ask us to delete it, we delete it/.test(flatPrivacy));
check("it is honest that purchase records are kept longer", /Purchase records are kept longer/.test(flatPrivacy));
check("it explains what happens when the year of access ends", /year of access ends/.test(flatPrivacy));
check("it names the four rights (see, correct, delete, withdraw)", /ask to see the personal data/.test(flatPrivacy) && /correct it if it is wrong/.test(flatPrivacy) && /ask us to delete it/.test(flatPrivacy) && /withdraw your consent/.test(flatPrivacy));
check("it does not promise an export feature that does not exist", !/\b(download|export) your data\b/i.test(flatPrivacy) && !/\bdata export\b/i.test(flatPrivacy));
check("it admits rights are exercised by email, not by a button", /no button for this in the app yet/i.test(flatPrivacy));
check("it points at the Information Commissioner for complaints", /Office of the Information Commissioner in Jamaica/.test(flatPrivacy));

// --- cookies, changes -----------------------------------------------------
check("cookies section exists and claims no tracking cookies", /Cookies and your browser’s storage|Cookies and your browser's storage/.test(flatPrivacy) && /no advertising or third-party tracking cookies/i.test(flatPrivacy));
check("it says the sign-in session lives in the browser", /sign-in session and your unfinished work are kept in your own browser/.test(flatPrivacy));
check("it points at Stripe's own policy for the checkout page", /Stripe’s privacy policy|Stripe's privacy policy/.test(flatPrivacy));
check("it says how changes are handled, with a date", /Changes to this policy/.test(flatPrivacy) && /update the date/i.test(flatPrivacy));
check("it cross-references the Terms page", /<Link to="\/terms"/.test(privacyPage));

// ===========================================================================
section("3. the /privacy route and the footer link");

check("the route exists", /<Route path="\/privacy" element=\{<PrivacyPage \/>\} \/>/.test(app));
check("the page is imported", /import PrivacyPage from "\.\/pages\/PrivacyPage"/.test(app));
check("the route is public (not wrapped in ProtectedRoute)", /<Route path="\/privacy" element=\{<PrivacyPage \/>\} \/>/.test(app) && !/path="\/privacy"[^\n]*ProtectedRoute/.test(app));
check("it sits next to the terms route", app.indexOf('path="/privacy"') > app.indexOf('path="/terms"'));
check("the page brings its own stylesheet", /import "\.\/PrivacyPage\.css"/.test(privacyPage) && /\.privacy-page\s*\{/.test(privacyCss));
check("the page links in-app with the router, not with raw anchors", /import \{ Link \} from "react-router-dom"/.test(privacyPage) && !/<a\s+href="\/terms"/.test(privacyPage));
check("the footer links to the privacy policy", /<Link to="\/privacy">Privacy Policy<\/Link>/.test(app));
check("the footer still links to the terms", /<Link to="\/terms">Terms of Service<\/Link>/.test(app));
check("the two footer links are separated by a styled element", /app-footer-sep/.test(app) && /\.app-footer-sep\s*\{/.test(appCss));
check("the footer keeps the trademark disclaimer", /\{TRADEMARK_DISCLAIMER\}/.test(app));
const footerAt = app.indexOf('<footer className="app-footer">');
check("the footer still sits outside <Routes>, so it shows on every route", app.indexOf("</Routes>") < footerAt, `routesClose@${app.indexOf("</Routes>")} footer@${footerAt}`);
check(
  "App.jsx imports Link (a footer link without the import blanks the whole app)",
  /import \{[^}]*\bLink\b[^}]*\} from "react-router-dom"/.test(app),
  app.split("\n").find((l) => l.includes("react-router-dom")) || "",
);

// ===========================================================================
section("4. consent is taken before an account is created (both signup forms)");

// The site has TWO account-creation forms: /signup (SignupPage) and
// /auth/signup (AuthPage mode="signup"). Both must require consent — the review
// asked for consent before account creation, and a form that skips it would make
// that untrue.
check("AuthPage offers both links in the consent line", /<Link to="\/terms"[^>]*>Terms of Service<\/Link>/.test(authPage) && /<Link to="\/privacy"[^>]*>Privacy Policy<\/Link>/.test(authPage));
check("AuthPage renders the checkbox only in signup mode", /\{mode === "signup" && \([\s\S]{0,900}auth-consent-box/.test(authPage));
check("AuthPage's checkbox is uncontrolled-by-default, i.e. starts unticked", /const \[agreed, setAgreed\] = useState\(false\)/.test(authPage));
check("AuthPage's submit is disabled until it is ticked", /disabled=\{busy \|\| \(mode === "signup" && !agreed\)\}/.test(authPage));
check("AuthPage blocks the submission too (Enter key cannot bypass it)", /if \(mode === "signup" && !agreed\) \{/.test(authPage) && /return;/.test(authPage));
check("the sign-in path is NOT gated by the checkbox", !/if \(mode === "signin" && !agreed\)/.test(authPage) && /if \(mode === "signin"\) \{/.test(authPage));
check("switching mode clears consent, so it is given afresh", (authPage.match(/setAgreed\(false\)/g) || []).length >= 3);
check("AuthPage imports Link for those two links", /import \{ Link \} from "react-router-dom"/.test(authPage), authPage.split("\n")[1] || "");
check("the consent box is styled on the auth page", /\.auth-consent\s*\{/.test(authCss) && /\.auth-consent-box\s*\{/.test(authCss));

check("SignupPage offers both links in the consent line", /<Link to="\/terms"[^>]*>Terms of Service<\/Link>/.test(signupPage) && /<Link to="\/privacy"[^>]*>Privacy Policy<\/Link>/.test(signupPage));
check("SignupPage renders a checkbox", /type="checkbox"/.test(signupPage) && /sp-consent-box/.test(signupPage));
check("it starts unticked", /const \[agreed, setAgreed\] = useState\(false\)/.test(signupPage));
check("its submit is disabled until it is ticked", /disabled=\{busy \|\| !agreed\}/.test(signupPage));
check("it blocks the submission too", /if \(!agreed\) \{[\s\S]{0,220}return;/.test(signupPage));
check("the consent box is styled on the signup page", /\.sp-consent\s*\{/.test(signupCss) && /\.sp-consent-box\s*\{/.test(signupCss));

check("no account is created without consent anywhere in the two forms", (function () {
  // Every call to signUp(...) must sit after a consent guard. SignupPage's guard
  // is the `if (!agreed) return` above its single call; AuthPage's is the
  // mode-scoped guard above its single call.
  const signupCallAt = authPage.indexOf("await signUp(");
  const guardAt = authPage.indexOf('if (mode === "signup" && !agreed)');
  const signupCallAt2 = signupPage.indexOf("await signUp(");
  const guardAt2 = signupPage.indexOf("if (!agreed)");
  return guardAt !== -1 && guardAt < signupCallAt && guardAt2 !== -1 && guardAt2 < signupCallAt2;
})());

// ===========================================================================
section("5. Pricing points at the terms (refund/access), with no price change");

check("the access line is on the page", /One year of access from purchase\. Refunds per our/.test(flatPricing));
check("it links to the terms of service", /<Link to="\/terms"[^>]*>Terms of Service<\/Link>/.test(pricingPage));
check("it links to the privacy policy", /<Link to="\/privacy"[^>]*>Privacy Policy<\/Link>/.test(pricingPage));
check(
  "PricingPage imports Link (it did not need it before this change)",
  /import \{ useNavigate, useSearchParams, Link \} from "react-router-dom"/.test(pricingPage) || /import \{[^}]*\bLink\b[^}]*\} from "react-router-dom"/.test(pricingPage),
  pricingPage.split("\n").find((l) => l.includes("react-router-dom")) || "",
);
check("the pointer sits with the existing one-time-payment note", /pricing-note pricing-legal-note/.test(pricingPage));
check("it is styled, not left bare", /\.pricing-legal-note\s*\{/.test(pricingCss) && /\.pricing-legal-link\s*\{/.test(pricingCss));
check("no price changed", /\$9\.99/.test(pricingPage) && /\$49\.99/.test(pricingPage) && /1250/.test(pricingPage) && /2000/.test(pricingPage) && /2250/.test(pricingPage));
check("the child-email field is untouched", /Your child&rsquo;s email \(optional\)/.test(pricingPage) && /childEmail/.test(pricingPage));
check("the school tiers still need a school name and admin", /Who should run this school&rsquo;s account\?/.test(pricingPage));

// ===========================================================================
section("6. guards: no CXC claim, no guarantee, no invented clause, no new dependency");

const scanned = {
  "src/pages/PrivacyPage.jsx": privacyPage,
  "src/pages/TermsPage.jsx": termsPage,
  "src/pages/PricingPage.jsx": pricingPage,
  "src/pages/AuthPage.jsx": authPage,
  "src/pages/SignupPage.jsx": signupPage,
  "src/App.jsx": app,
};
for (const [file, src] of Object.entries(scanned)) {
  // Our own DENIALS are the point of these pages, so strip them before hunting
  // for an affirmative claim.
  const text = flat(src)
    .replace(/no grade outcome is guaranteed/gi, " ")
    .replace(/do not promise a pass/gi, " ")
    .replace(/is not affiliated with, authorized, or endorsed by/gi, " ")
    // The Terms page's own denial of official status ("they are NOT official CXC
    // past papers") is the wording the review asked for, not a claim — strip it
    // before looking for one, or this guard fails on the page doing its job.
    .replace(/not official CXC past papers/gi, " ")
    .replace(/official CXC past papers and are not/gi, " ");
  const guarantee = text.match(/\bguarantee(s|d)?\b[^.]{0,60}\b(pass|grade|score|success)\b/i) || text.match(/\b(pass|grade|score)\b[^.]{0,30}\bguaranteed\b/i);
  check(`no guaranteed pass or grade in ${file}`, guarantee === null, guarantee ? guarantee[0] : "");
  check(`no CXC endorsement or official-status claim in ${file}`, !/endorsed by (the )?(CXC|Caribbean)/i.test(text) && !/\bofficial CXC\b/i.test(text) && !/approved by CXC/i.test(text));
}
check("the privacy page pulls in no new library (react + the router only)", privacyPage.split("\n").filter((l) => /^\s*import /.test(l)).every((l) => /^\s*import "\.\/[A-Za-z]+\.css";\s*$/.test(l) || /from "(react|react-router-dom|\.\.\/data\/legal)"/.test(l)), privacyPage.split("\n").filter((l) => /^\s*import /.test(l)).join(" | "));
check("no new dependency was added for any of this", !/"(marked|remark|react-markdown|dompurify|date-fns|dayjs)"/.test(read("package.json")));
check("the privacy page promises no time limit we do not run to", !/within \d+ (business )?days/i.test(flatPrivacy));
check("it promises no self-service account deletion that does not exist", !/delete your own account|delete it yourself/i.test(flatPrivacy));

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
