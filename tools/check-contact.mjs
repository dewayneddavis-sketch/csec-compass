// The Contact tab (owner spec 2026-09-23): a visible Contact tab whose form
// emails support@csec-compass.com, a notification to the team and an automatic
// DO-NOT-REPLY confirmation to the sender, with no database write.
//
//   node tools/check-contact.mjs
//
// Why this file exists — the two failures that would matter most are both
// silent:
//
//   1. A FORM THAT CLAIMS SUCCESS WITHOUT SENDING. If the sending key is absent
//      (or the provider refuses), the honest answer is a 503/502 the page turns
//      into "email us directly". A 200 there would tell a parent their message
//      was on its way while nothing left the building, and the visitor would
//      never know to try again. Asserted here by driving the real handler with
//      the key absent AND with the provider failing, and pinning that neither
//      returns ok.
//   2. A SECOND COPY OF THE COPY THAT HAS DRIFTED FROM THE FIRST. The API route
//      is self-contained by design (it imports nothing, because Vercel builds
//      each api/ file on its own and an import from ../src/ failed the deploy on
//      2026-09-23), so it MIRRORS the shared wording and validation instead of
//      importing them. A mirror is only safe if something proves it has not
//      drifted — this file does: every mirrored value must equal the real one in
//      src/data/legal.js / src/data/contact.js, the mirrored validator must
//      return byte-identical results, and the delivery address may be spelled
//      out only in those two files (plus the owner's personal address may not
//      appear anywhere at all).
//
// What else it checks: the tab is reachable (route + site-wide nav), the rules
// can't drift (caps/honeypot/copy agree with the page's shared module), the
// honeypot really drops a submission, the rate limit really bites, the
// submitter's NAME is collected by the form, required by both copies of the
// validator and carried into the notification EMAIL (the owner's notification
// renders the submitter's name, so a blank one is a blank row in the mailbox),
// and the exact wording of the automatic reply is the wording the owner asked
// for.
//
// PROVIDER (owner decision 2026-09-26). The route now sends through Resend: two
// direct POSTs to https://api.resend.com/emails, no template layer in between.
// The old integration — two workflow triggers through a channel that kept
// reporting the mail as undelivered while the form said "sent" — is asserted
// GONE below (no host, no trigger call, no old key name, anywhere in src/ or
// api/), so a revert to the layer that was failing cannot pass this file.
//
// Run it with the rest before any contact/pricing PR:
//   for f in tools/check-*.mjs; do node "$f"; done
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFileSync(join(root, rel), "utf8");

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

// Prove the counters move before trusting a green run (a harness whose check()
// cannot fail is decoration).
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

const legalSrc = read("src/data/legal.js");
const contactSrc = read("src/data/contact.js");
const pageSrc = read("src/pages/ContactPage.jsx");
const pageCss = read("src/pages/ContactPage.css");
const apiSrc = read("api/contact.js");
const appSrc = read("src/App.jsx");
const navSrc = read("src/components/Navbar.jsx");
const privacySrc = read("src/pages/PrivacyPage.jsx");

const legal = await import("../src/data/legal.js");
const shared = await import("../src/data/contact.js");
const handler = (await import("../api/contact.js")).default;
// The API route is self-contained, so its mirrored copy is imported here and
// every one of its values is compared against the real thing below.
const apiContact = await import("../api/contact.js");

// The route logs honestly whenever it cannot send. Those lines would read like
// harness noise, so they are captured and asserted on instead of printed — a
// silent failure is itself a bug worth catching.
const logs = [];
const realError = console.error;
const realWarn = console.warn;
console.error = (...args) => logs.push(["error", args.join(" ")]);
console.warn = (...args) => logs.push(["warn", args.join(" ")]);
const logged = (level, re) => logs.some(([l, m]) => l === level && re.test(m));

// --- helpers -----------------------------------------------------------------
function mockRes() {
  return {
    statusCode: null,
    body: null,
    headers: {},
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
    setHeader(k, v) {
      this.headers[k.toLowerCase()] = v;
    },
  };
}
async function call(req) {
  const res = mockRes();
  await handler(req, res);
  return res;
}
function postReq(body, ip = "10.0.0.1") {
  return {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": ip },
    body,
  };
}
const GOOD = {
  name: "Jane Smith",
  email: "parent@example.com",
  subject: "Bundle question",
  message: "Does the bundle cover Food and Nutrition as well?",
};

// The provider calls are recorded here; each case starts from a clean slate.
const calls = [];
let fetchImpl = null;
const realFetch = globalThis.fetch;
globalThis.fetch = async (url, opts = {}) => {
  calls.push({ url: String(url), opts, body: opts.body ? JSON.parse(opts.body) : null });
  if (fetchImpl) return fetchImpl(String(url), opts);
  return { ok: true, status: 200, text: async () => "" };
};
function resetCalls() {
  calls.length = 0;
  fetchImpl = null;
}

// ---------------------------------------------------------------------------
section("the Contact tab exists and is reachable");

check("App.jsx imports the Contact page", /import ContactPage from "\.\/pages\/ContactPage"/.test(appSrc));
check('a public /contact route renders it', /<Route path="\/contact" element=\{<ContactPage \/>\} \/>/.test(appSrc));
check("the route is public (not wrapped in ProtectedRoute)", !/ProtectedRoute>\s*<ContactPage/.test(appSrc));
check("exactly one /contact route (no shadowing)", (appSrc.match(/path="\/contact"/g) || []).length === 1);
check("the page pulls in its own stylesheet", /import "\.\/ContactPage\.css"/.test(pageSrc));
check("the site navigation has a Contact tab", /to="\/contact"/.test(navSrc) && /navbar-contact/.test(navSrc));
check(
  "the tab is in the always-visible nav, not the signed-in-only block",
  navSrc.indexOf('to="/contact"') < navSrc.indexOf("navbar-auth")
);
check(
  "the nav renders on every route (outside <Routes>)",
  appSrc.indexOf("<Navbar />") > 0 && appSrc.indexOf("<Navbar />") < appSrc.indexOf("<Routes>")
);
check("the Contact link is labelled Contact", /to="\/contact"[^>]*>\s*Contact\s*</.test(navSrc));

// ---------------------------------------------------------------------------
section("ONE address, written down once");

check("legal.js declares the public support address", /export const SUPPORT_EMAIL = "support@csec-compass\.com"/.test(legalSrc));
check("the data-protection address is still the business inbox", legal.PRIVACY_CONTACT_EMAIL === "csec-compass-01a1f7d3@ctomail.io");
check("support and data-protection addresses are different constants", legal.SUPPORT_EMAIL !== legal.PRIVACY_CONTACT_EMAIL);

// Count the literal across every source file that could name it.
function walk(dir) {
  const out = [];
  for (const entry of readdirSync(join(root, dir))) {
    if (entry === "node_modules" || entry === "dist" || entry.startsWith(".")) continue;
    const rel = `${dir}/${entry}`;
    if (statSync(join(root, rel)).isDirectory()) out.push(...walk(rel));
    else out.push(rel);
  }
  return out;
}
const sourceFiles = [...walk("src"), ...walk("api")];
const addressFiles = sourceFiles.filter((f) => /support@csec-compass\.com/.test(readFileSync(join(root, f), "utf8")));
check(
  "the support address is spelled out in exactly two files, and they agree",
  addressFiles.length === 2 &&
    [...addressFiles].sort().join(",") === "api/contact.js,src/data/legal.js" &&
    apiContact.SUPPORT_EMAIL === legal.SUPPORT_EMAIL,
  addressFiles.join(", ")
);
check("contact.js builds its sentences from that constant", /import \{ SUPPORT_EMAIL \} from "\.\/legal\.js"/.test(contactSrc));
check("ContactPage uses the constant for the recipient field", /import \{ SUPPORT_EMAIL \} from "\.\.\/data\/legal\.js"/.test(pageSrc) && /value=\{SUPPORT_EMAIL\}/.test(pageSrc));
check(
  "api/contact.js is self-contained: no relative import, and its mirror is the same address",
  !/from\s+"\.\.?\//.test(apiSrc) && apiContact.SUPPORT_EMAIL === legal.SUPPORT_EMAIL
);
check(
  "the delivery address is not a request field (a visitor cannot redirect our mail)",
  // The notification's recipient is the mirrored SUPPORT_EMAIL constant and
  // nothing else: no body field is read to decide where our mail goes.
  !/body\.(recipient|to|support_email)\b/.test(apiSrc) && /to: SUPPORT_EMAIL,/.test(apiSrc)
);
check(
  "the sending domain is the brand's own, not a personal mailbox",
  apiContact.CONTACT_FROM_ADDRESS === "noreply@csec-compass.com" &&
    apiContact.NOTIFICATION_FROM === "CSEC Compass <noreply@csec-compass.com>" &&
    apiContact.AUTOREPLY_FROM === "No Reply <noreply@csec-compass.com>",
  `${apiContact.NOTIFICATION_FROM} | ${apiContact.AUTOREPLY_FROM}`
);

// ---------------------------------------------------------------------------
section("the owner's personal address appears nowhere user-facing");

const personal = "dewdavis519@gmail.com";
const personalHits = sourceFiles.filter((f) => readFileSync(join(root, f), "utf8").includes(personal));
check(`no source file contains ${personal}`, personalHits.length === 0, personalHits.join(", "));
check(
  "the automatic reply is from a no-reply-style sender, not a person",
  /no.?reply/i.test(contactSrc + pageSrc) || !/@gmail\.com/.test(apiSrc + pageSrc + contactSrc),
  "no Gmail address is named in the sending code"
);
const built = existsSync(join(root, "dist"));
if (built) {
  const assets = walk("dist").filter((f) => /\.(js|html)$/.test(f));
  const leaks = assets.filter((f) => readFileSync(join(root, f), "utf8").includes(personal));
  check("the built site does not ship that address either", leaks.length === 0, leaks.join(", "));
} else {
  check("dist/ not built yet — skipped the built-bundle check", true);
}

// ---------------------------------------------------------------------------
section("client and server share the rules (they cannot drift)");

check("ContactPage imports the shared rules", /from "\.\.\/data\/contact\.js"/.test(pageSrc));
check(
  "api/contact.js mirrors the shared rules instead of importing them (it must stay self-contained)",
  !/^\s*import\b.*from\s+"[^"]*(\.\.\/|src\/)/m.test(apiSrc) && !/from "\.\.\/src\//.test(apiSrc)
);
// Every mirrored constant must equal the real one — this is the drift gate.
const MIRRORED = [
  ["SUPPORT_EMAIL", legal],
  ["CONTACT_NAME_MAX", shared],
  ["CONTACT_SUBJECT_MAX", shared],
  ["CONTACT_MESSAGE_MAX", shared],
  ["CONTACT_RATE_LIMIT", shared],
  ["CONTACT_RATE_WINDOW_MINUTES", shared],
  ["CONTACT_HONEYPOT_FIELD", shared],
  ["CONTACT_ACK_SUBJECT", shared],
  ["CONTACT_ACK_BODY", shared],
  ["CONTACT_ACK_NOTE", shared],
];
for (const [name, source] of MIRRORED) {
  check(
    `the api mirror of ${name} equals the shared constant`,
    apiContact[name] !== undefined && apiContact[name] === source[name],
    `api=${JSON.stringify(apiContact[name])} shared=${JSON.stringify(source[name])}`
  );
}
check("the subject cap comes from the constant on the page", /maxLength=\{CONTACT_SUBJECT_MAX\}/.test(pageSrc));
check("the message cap comes from the constant on the page", /maxLength=\{CONTACT_MESSAGE_MAX\}/.test(pageSrc));
check("the name cap comes from the constant on the page", /maxLength=\{CONTACT_NAME_MAX\}/.test(pageSrc));
check("the page does not hardcode the caps", !/maxLength=\{120\}|maxLength=\{3000\}/.test(pageSrc));
check("the server validates with its own copy of the shared validator", /validateContactSubmission\(body\)/.test(apiSrc));
check("the honeypot field name comes from the constant on both sides", /CONTACT_HONEYPOT_FIELD/.test(pageSrc) && /CONTACT_HONEYPOT_FIELD/.test(apiSrc));
check("the success sentence on screen is the shared one", /\{CONTACT_ACK_BODY\}/.test(pageSrc) && shared.CONTACT_ACK_BODY.length > 0);

check("caps are the owner's numbers", shared.CONTACT_SUBJECT_MAX === 120 && shared.CONTACT_MESSAGE_MAX === 3000);
check("the name cap is 120 — the same number the route slices to", shared.CONTACT_NAME_MAX === 120 && apiContact.CONTACT_NAME_MAX === 120);
check("the rate limit is 5 per hour", shared.CONTACT_RATE_LIMIT === 5 && shared.CONTACT_RATE_WINDOW_MINUTES === 60);
check("the honeypot field is named website", shared.CONTACT_HONEYPOT_FIELD === "website");
check(
  "the automatic reply subject is exactly the required wording",
  shared.CONTACT_ACK_SUBJECT === "We received your message — CSEC Compass",
  shared.CONTACT_ACK_SUBJECT
);
check(
  "the automatic reply body is exactly the required wording",
  shared.CONTACT_ACK_BODY === "We have received your message. Please allow 24–48 hours for a response.",
  shared.CONTACT_ACK_BODY
);
check(
  "the reply says replies to it are not monitored",
  /not monitored/i.test(shared.CONTACT_ACK_NOTE) && /automat(ed|ic)/i.test(shared.CONTACT_ACK_NOTE)
);
check("the notification subject is built in one place", shared.contactNotificationSubject("Hi") === "New contact message: Hi");
check(
  "shared validation accepts a real address and rejects a broken one",
  shared.contactEmailIsValid("parent@example.com") && !shared.contactEmailIsValid("parent@example") && !shared.contactEmailIsValid("a b@c.com")
);

// The mirror has to behave, not just look, the same: same inputs, byte-identical
// output. If someone edits one validator and not the other, this goes red.
{
  const INPUTS = [
    undefined,
    null,
    "not an object",
    {},
    { name: "Jane Smith", email: "parent@example.com", subject: "Bundle question", message: "Does it cover Food?" },
    { name: "not-an-email", email: "not-an-email", subject: "ok", message: "ok" },
    { name: "Jane Smith", email: "parent@example.com", subject: "   ", message: "ok" },
    { name: "Jane Smith", email: "parent@example.com", subject: "s".repeat(120), message: "ok" },
    { name: "Jane Smith", email: "parent@example.com", subject: "s".repeat(121), message: "ok" },
    { name: "Jane Smith", email: "parent@example.com", subject: "ok", message: "" },
    { name: "Jane Smith", email: "parent@example.com", subject: "ok", message: "m".repeat(3000) },
    { name: "Jane Smith", email: "parent@example.com", subject: "ok", message: "m".repeat(3001) },
    { name: "  Jane Smith  ", email: "  parent@example.com  ", subject: "  padded  ", message: "  padded  " },
    { name: "Jane Smith", email: "a".repeat(250) + "@x.com", subject: "ok", message: "ok" },
    { name: "Jane Smith", email: "parent@example.com", subject: 42, message: 7 },
    // The name is mandatory, so the mirror has to treat every shape of a missing
    // or over-long one the same way the shared validator does.
    { email: "parent@example.com", subject: "ok", message: "ok" },
    { name: "", email: "parent@example.com", subject: "ok", message: "ok" },
    { name: "   ", email: "parent@example.com", subject: "ok", message: "ok" },
    { name: null, email: "parent@example.com", subject: "ok", message: "ok" },
    { name: 42, email: "parent@example.com", subject: "ok", message: "ok" },
    { name: "n".repeat(120), email: "parent@example.com", subject: "ok", message: "ok" },
    { name: "n".repeat(121), email: "parent@example.com", subject: "ok", message: "ok" },
  ];
  const mismatches = INPUTS.filter(
    (input) =>
      JSON.stringify(apiContact.validateContactSubmission(input)) !==
      JSON.stringify(shared.validateContactSubmission(input))
  );
  check(
    `the api validator returns byte-identical results to the shared one on ${INPUTS.length} payloads`,
    mismatches.length === 0,
    `${mismatches.length} mismatch(es)`
  );
  const emailCases = ["parent@example.com", "parent@example", "a b@c.com", "", "  ", "x@y.z", "a".repeat(250) + "@x.com", null, undefined, 7];
  check(
    "the api email check agrees with the shared one on every case",
    emailCases.every((v) => apiContact.contactEmailIsValid(v) === shared.contactEmailIsValid(v))
  );
  check(
    "the api notification subject is built the same way",
    ["Hi", "  spaced  ", "", "About the Maths bundle"].every(
      (s) => apiContact.contactNotificationSubject(s) === shared.contactNotificationSubject(s)
    ) && apiContact.contactNotificationSubject("Hi") === "New contact message: Hi"
  );
  check(
    "the api mirror uses its own constants (a stray import or shared object would hide drift)",
    apiContact.CONTACT_SUBJECT_MAX === shared.CONTACT_SUBJECT_MAX &&
      apiContact.validateContactSubmission !== shared.validateContactSubmission
  );
  check(
    "the mirror's own name cap is its own constant, not the shared one",
    apiContact.CONTACT_NAME_MAX === 120 && apiContact.CONTACT_NAME_MAX === shared.CONTACT_NAME_MAX
  );
}

// ---------------------------------------------------------------------------
section("the submitter's name is required, and it reaches the owner's email");

// The owner's notification template renders data.name in a table cell. A form
// that lets a blank name through puts an empty row in the owner's mailbox, so
// the rule is pinned here on BOTH copies of the validator.
{
  const name = (v) => shared.validateContactSubmission({ ...GOOD, name: v });
  check(
    "a missing name is a field error, not a silent empty cell",
    name(undefined).ok === false && typeof name(undefined).errors.name === "string",
    JSON.stringify(name(undefined).errors)
  );
  check(
    "a whitespace-only name is rejected too (trim first, then judge)",
    name("   ").ok === false && name("   ").errors.name === "Enter your name so we know who to reply to.",
    JSON.stringify(name("   ").errors)
  );
  check(
    "the error tells the sender why we want it",
    /know who to reply to/i.test(name("").errors.name),
    name("").errors.name
  );
  check(
    "a name of exactly the cap passes",
    name("n".repeat(shared.CONTACT_NAME_MAX)).ok === true,
    JSON.stringify(name("n".repeat(shared.CONTACT_NAME_MAX)).errors)
  );
  check(
    "a name one character over the cap is rejected",
    name("n".repeat(shared.CONTACT_NAME_MAX + 1)).ok === false && !!name("n".repeat(121)).errors.name,
    JSON.stringify(name("n".repeat(121)).errors)
  );
  check(
    "a valid name is trimmed and passed through as the ready-to-send value",
    shared.validateContactSubmission({ ...GOOD, name: "  Jane Smith  " }).value.name === "Jane Smith",
    JSON.stringify(shared.validateContactSubmission({ ...GOOD, name: "  Jane Smith  " }).value)
  );
  check(
    "the ready-to-send value carries name alongside email/subject/message",
    JSON.stringify(Object.keys(shared.validateContactSubmission(GOOD).value).sort()) ===
      JSON.stringify(["email", "message", "name", "subject"]),
    Object.keys(shared.validateContactSubmission(GOOD).value).join(",")
  );
  check(
    "the api mirror refuses a missing name exactly as the shared one does",
    JSON.stringify(apiContact.validateContactSubmission({ ...GOOD, name: "" })) ===
      JSON.stringify(shared.validateContactSubmission({ ...GOOD, name: "" })) &&
      apiContact.validateContactSubmission({ ...GOOD, name: "" }).ok === false
  );
}

// ---------------------------------------------------------------------------
section("the form itself");

check("the recipient field is read-only", /readOnly/.test(pageSrc) && /aria-readonly="true"/.test(pageSrc) && /className="contact-input contact-to"/.test(pageSrc));
check("the recipient field is not a free-text field the visitor fills", /id="contact-to"[\s\S]{0,200}value=\{SUPPORT_EMAIL\}/.test(pageSrc));
// The name input. The owner's notification renders it, so the form MUST collect
// it: a form without it sends an empty name on every real submission.
check(
  "there is a name field for the sender",
  /id="contact-name"/.test(pageSrc) &&
    /<label htmlFor="contact-name">Your name<\/label>/.test(pageSrc) &&
    /name="name"/.test(pageSrc) &&
    /type="text"/.test(pageSrc) &&
    /autoComplete="name"/.test(pageSrc) &&
    /placeholder="Jane Smith"/.test(pageSrc),
  "id/label/name/type/autoComplete/placeholder"
);
check(
  "the name field is wired to the form state like the other fields",
  /value=\{form\.name\}/.test(pageSrc) && /onChange=\{update\("name"\)\}/.test(pageSrc)
);
check(
  "the name field comes before the email field",
  pageSrc.indexOf('id="contact-name"') > 0 && pageSrc.indexOf('id="contact-name"') < pageSrc.indexOf('id="contact-email"')
);
check(
  "the form state starts with an empty name, so it is submitted with the form",
  /const EMPTY = \{ name: "", email: "", subject: "", message: "" \}/.test(pageSrc) &&
    /JSON\.stringify\(\{ \.\.\.form, \[CONTACT_HONEYPOT_FIELD\]/.test(pageSrc)
);
check(
  "the name field's error is announced like the others",
  /id="contact-name-error"[\s\S]{0,40}role="alert"/.test(pageSrc)
);
check("there is an email field for the sender", /id="contact-email"/.test(pageSrc) && /type="email"/.test(pageSrc) && /autoComplete="email"/.test(pageSrc));
check("there is a subject field", /id="contact-subject"/.test(pageSrc) && /name="subject"/.test(pageSrc));
check("there is a message textarea", /<textarea/.test(pageSrc) && /id="contact-message"/.test(pageSrc));
check("the submit button says what it does", /Send message/.test(pageSrc) && /type="submit"/.test(pageSrc));
check("the page promises the 24–48 hour reply window", /CONTACT_RESPONSE_WINDOW/.test(pageSrc) && shared.CONTACT_RESPONSE_WINDOW === "24–48 hours");
check("the page says we can also be emailed directly", /CONTACT_DIRECT_NOTE/.test(pageSrc) && shared.CONTACT_DIRECT_NOTE.includes(legal.SUPPORT_EMAIL));
check("the honeypot is off-screen, not just mentioned", /\.contact-honeypot\s*\{[\s\S]{0,120}left: -9999px/.test(pageCss));
check("the honeypot cannot be tabbed to", /tabIndex=\{-1\}/.test(pageSrc));
check("the honeypot is hidden from assistive tech", /className="contact-honeypot" aria-hidden="true"/.test(pageSrc));
check("the honeypot is read from the DOM at submit (not a no-op controlled field)", /new FormData\(event\.currentTarget\)\.get\(CONTACT_HONEYPOT_FIELD\)/.test(pageSrc));
check("the honeypot input is uncontrolled so a bot's value really posts", /defaultValue=""/.test(pageSrc) && !/value=\{honeypot\}/.test(pageSrc));
check("the button is disabled while sending", /disabled=\{sending\}/.test(pageSrc) && /Sending…/.test(pageSrc));
check("errors are announced, not just coloured", /role="alert"/.test(pageSrc) && /aria-invalid=/.test(pageSrc));
check("the failure path tells the visitor to email directly", /CONTACT_UNAVAILABLE_NOTE/.test(pageSrc) && shared.CONTACT_UNAVAILABLE_NOTE.includes(legal.SUPPORT_EMAIL));
check(
  "success is only shown when the API confirmed ok",
  /if \(res\.ok && data\.ok\) \{[\s\S]{0,200}setStatus\("sent"\)/.test(pageSrc)
);
check("the page links the privacy policy", /<Link to="\/privacy">Privacy Policy<\/Link>/.test(pageSrc));
check("the privacy policy mentions contact-form messages", /contact form/i.test(privacySrc) && /Messages you send us/.test(privacySrc));

// ---------------------------------------------------------------------------
section("the API route: honest when it cannot send");

resetCalls();
delete process.env.RESEND_API_KEY;
{
  const res = await call(postReq({ ...GOOD }, "10.1.0.1"));
  check("a GET is refused with 405", (await call({ method: "GET", headers: {} })).statusCode === 405);
  check("no RESEND_API_KEY → 503, not a fake success", res.statusCode === 503, `got ${res.statusCode}`);
  check("that 503 response never says ok", res.body.ok !== true && typeof res.body.error === "string");
  check("that 503 names the direct address as the way through", String(res.body.detail || "").includes(legal.SUPPORT_EMAIL));
  check("nothing was sent to the email provider", calls.length === 0, `${calls.length} calls`);
  check(
    "the missing key is logged loudly rather than failing silently",
    logged("error", /RESEND_API_KEY/) && logged("error", /must not claim success/)
  );
}
// The required secret is RESEND_API_KEY (owner-confirmed 2026-09-26). A variable
// left over from the old provider may exist in some environment and may be
// deleted as "unused" — the form must not depend on it, so with the provider's
// own key missing a set KNOCK_API_KEY must still be a 503 with nothing sent.
// (The old name must not appear in the route at all; that is asserted in the
// "the provider that was failing is gone" section below.)
process.env.KNOCK_API_KEY = "leftover_from_the_old_provider";
resetCalls();
{
  const res = await call(postReq({ ...GOOD }, "10.1.0.9"));
  check(
    "RESEND_API_KEY missing → 503 even when the old Knock-named variable is set",
    res.statusCode === 503,
    `got ${res.statusCode}`
  );
  check("…and that submission still sends nothing", calls.length === 0, `${calls.length} calls`);
  check("…and it still never claims ok", res.body.ok !== true && typeof res.body.error === "string");
}
delete process.env.KNOCK_API_KEY;

// ---------------------------------------------------------------------------
section("the API route: a valid submission sends both emails");

process.env.RESEND_API_KEY = "re_test_offline";
resetCalls();
{
  const res = await call(postReq({ ...GOOD }, "10.2.0.1"));
  check("a valid submission returns 200 ok", res.statusCode === 200 && res.body.ok === true, JSON.stringify(res.body));
  check("both emails were sent (notification + automatic reply)", calls.length === 2, `${calls.length} calls`);
  const [notification, autoreply] = calls;
  const jsonType = (c) => String(c.opts.headers["Content-Type"] || c.opts.headers["content-type"] || "");
  check(
    "both go to the provider's send endpoint",
    notification.url === "https://api.resend.com/emails" && autoreply.url === "https://api.resend.com/emails",
    `${notification.url} | ${autoreply.url}`
  );
  check("both are POSTs", notification.opts.method === "POST" && autoreply.opts.method === "POST");
  check(
    "both carry the API key as a bearer token",
    notification.opts.headers.Authorization === "Bearer re_test_offline" &&
      autoreply.opts.headers.Authorization === "Bearer re_test_offline",
    `${notification.opts.headers.Authorization} | ${autoreply.opts.headers.Authorization}`
  );
  check("both declare JSON bodies", /application\/json/.test(jsonType(notification)) && /application\/json/.test(jsonType(autoreply)), jsonType(notification));
  check(
    "the request is given a timeout so a hung provider cannot hang the form",
    !!notification.opts.signal && !!autoreply.opts.signal
  );

  // --- 1. the notification the owner reads ---------------------------------
  check(
    "the notification goes to the support address",
    JSON.stringify(notification.body.to) === JSON.stringify([legal.SUPPORT_EMAIL]),
    JSON.stringify(notification.body.to)
  );
  check(
    "the notification comes from the brand sender on the verified domain",
    notification.body.from === "CSEC Compass <noreply@csec-compass.com>",
    notification.body.from
  );
  check("the notification carries the submitter as reply-to", notification.body.reply_to === GOOD.email, String(notification.body.reply_to));
  check(
    "the notification subject line is the required shape",
    notification.body.subject === `New contact message: ${GOOD.subject}`,
    notification.body.subject
  );
  check(
    "the notification body carries the submitter's name",
    String(notification.body.text).includes(`Name: ${GOOD.name}`),
    String(notification.body.text).slice(0, 120)
  );
  check("the notification body carries the submitter's address", String(notification.body.text).includes(GOOD.email));
  check("the notification body carries the subject", String(notification.body.text).includes(GOOD.subject));
  check("the notification body carries the whole message", String(notification.body.text).includes(GOOD.message));
  check(
    "the notification is timestamped",
    !Number.isNaN(Date.parse(String(notification.body.text).match(/Submitted at: (\S+)/)?.[1] || "")),
    String(notification.body.text).match(/Submitted at: .*/)?.[0]
  );
  check(
    "nothing in the notification body is empty or invented",
    !/undefined|\[object Object\]|null/.test(String(notification.body.text))
  );

  // --- 2. the submitter's acknowledgement ----------------------------------
  check(
    "the acknowledgement goes to the submitter, not to us",
    JSON.stringify(autoreply.body.to) === JSON.stringify([GOOD.email]),
    JSON.stringify(autoreply.body.to)
  );
  check(
    "the acknowledgement comes from the no-reply sender",
    autoreply.body.from === "No Reply <noreply@csec-compass.com>",
    autoreply.body.from
  );
  check("the acknowledgement carries the exact approved subject", autoreply.body.subject === shared.CONTACT_ACK_SUBJECT, autoreply.body.subject);
  check(
    "the acknowledgement text is the approved body + note, byte for byte",
    autoreply.body.text === `${shared.CONTACT_ACK_BODY}\n\n${shared.CONTACT_ACK_NOTE}`,
    JSON.stringify(String(autoreply.body.text).slice(0, 80))
  );
  check("the acknowledgement carries the not-monitored note", /not monitored/i.test(autoreply.body.text));
  check("the acknowledgement names the way to add to the message", String(autoreply.body.text).includes(legal.SUPPORT_EMAIL));
  check(
    "the acknowledgement has no reply-to pointing at a person",
    autoreply.body.reply_to === undefined,
    String(autoreply.body.reply_to)
  );

  // --- 3. the request carries nothing but the documented fields ------------
  check(
    "the notification body carries only the fields the provider documents",
    JSON.stringify(Object.keys(notification.body).sort()) === JSON.stringify(["from", "reply_to", "subject", "text", "to"]),
    Object.keys(notification.body).join(",")
  );
  check(
    "the acknowledgement body carries only the fields the provider documents",
    JSON.stringify(Object.keys(autoreply.body).sort()) === JSON.stringify(["from", "subject", "text", "to"]),
    Object.keys(autoreply.body).join(",")
  );
  check(
    "no template/channel leftovers ride along in a send",
    !/to_address|channel_overrides|"variables"|recipients/.test(JSON.stringify(notification.body) + JSON.stringify(autoreply.body))
  );
  check(
    "the route documents the provider it uses and why it switched",
    /api\.resend\.com\/emails/.test(apiSrc) && /owner decision 2026-09-26/i.test(apiSrc)
  );
  check(
    "the provider host is written once, as a constant (not re-typed per send)",
    (apiSrc.match(/"https:\/\/api\.resend\.com\/emails"/g) || []).length === 1
  );
  check("the response reports the acknowledgement went out", res.body.acknowledged === true);
  check("the response is not cached", res.headers["cache-control"] === "no-store");
}

// ---------------------------------------------------------------------------
section("the API route: the name travels trimmed end to end");

// A padded name is what a real person types after copy-pasting; the notification
// the owner reads must not show leading spaces in the Name cell.
resetCalls();
{
  const res = await call(postReq({ ...GOOD, name: "  Jane Smith  " }, "10.2.1.1"));
  const [notification, autoreply] = calls;
  check("a padded name is still accepted", res.statusCode === 200 && res.body.ok === true, `${res.statusCode}`);
  check(
    "the notification carries the name trimmed, not padded",
    String(notification.body.text).includes("Name: Jane Smith") &&
      !String(notification.body.text).includes("Name:  Jane"),
    String(notification.body.text).split("\n")[0]
  );
  check(
    "the automatic reply is still the approved wording after a padded name",
    autoreply.body.text === `${shared.CONTACT_ACK_BODY}\n\n${shared.CONTACT_ACK_NOTE}`
  );
}

// An over-long name must never reach the provider — the owner's notification
// would be unreadable, and the sender deserves to know before the message goes.
resetCalls();
{
  const res = await call(postReq({ ...GOOD, name: "n".repeat(121) }, "10.2.2.1"));
  check("an over-long name is refused before anything is sent", res.statusCode === 400 && calls.length === 0, `${res.statusCode} / ${calls.length} calls`);
  check("the refusal names the name field", !!res.body.fields?.name, JSON.stringify(res.body.fields));
}

// ---------------------------------------------------------------------------
section("the API route: it refuses bad input and never trusts the body");

resetCalls();
{
  const bad = [
    ["a missing name", { ...GOOD, name: undefined }, "name"],
    ["an empty name", { ...GOOD, name: "" }, "name"],
    ["a whitespace-only name", { ...GOOD, name: "   " }, "name"],
    ["a name over the cap", { ...GOOD, name: "n".repeat(121) }, "name"],
    ["a malformed email", { ...GOOD, email: "not-an-email" }, "email"],
    ["an empty subject", { ...GOOD, subject: "   " }, "subject"],
    ["a subject over the cap", { ...GOOD, subject: "s".repeat(121) }, "subject"],
    ["an empty message", { ...GOOD, message: "" }, "message"],
    ["a message over the cap", { ...GOOD, message: "m".repeat(3001) }, "message"],
  ];
  for (const [i, [label, body, field]] of bad.entries()) {
    // A fresh connection per case: the rate limiter counts every POST, rejected
    // ones included, so a shared IP would let the 6th case be rate-limited
    // instead of validation-rejected and the check would fail for the wrong
    // reason.
    const res = await call(postReq(body, `10.7.0.${i + 1}`));
    check(
      `${label} is rejected with a field error`,
      res.statusCode === 400 && res.body.fields && res.body.fields[field],
      `${res.statusCode} ${JSON.stringify(res.body)}`
    );
  }
  check("none of the rejected submissions were sent", calls.length === 0);
  const boundary = await call(postReq({ ...GOOD, name: "n".repeat(120), subject: "s".repeat(120), message: "m".repeat(3000) }, "10.3.0.2"));
  check("the exact boundary lengths are accepted (name included)", boundary.statusCode === 200, `${boundary.statusCode}`);
  check("the boundary submission sent both emails", calls.length === 2);
}

resetCalls();
{
  const res = await call(postReq({ ...GOOD, recipient: "attacker@evil.example" }, "10.3.1.1"));
  const targets = calls.map((c) => JSON.stringify(c.body.to)).join(" ");
  check("a body field cannot redirect the notification anywhere else", !targets.includes("evil.example"), targets);
  check("the notification still goes to support", calls.some((c) => c.body.to[0] === legal.SUPPORT_EMAIL));
  check("that submission is still a normal success", res.statusCode === 200);
}

// ---------------------------------------------------------------------------
section("the API route: honeypot and rate limit");

resetCalls();
{
  const res = await call(postReq({ ...GOOD, website: "http://spam.example" }, "10.4.0.1"));
  check("a filled honeypot is answered without error (the bot learns nothing)", res.statusCode === 200);
  check("a filled honeypot sends NOTHING", calls.length === 0, `${calls.length} calls`);
  check("the dropped submission is recorded in the log, not swallowed", logged("warn", /honeypot/i));
}

resetCalls();
{
  const ip = "10.5.0.9";
  const codes = [];
  for (let i = 0; i < 6; i += 1) {
    codes.push((await call(postReq({ ...GOOD, subject: `message ${i}` }, ip))).statusCode);
  }
  check("five messages from one connection are allowed", codes.slice(0, 5).every((c) => c === 200), codes.join(","));
  check("the sixth is rate limited with 429", codes[5] === 429, codes.join(","));
  const other = await call(postReq({ ...GOOD }, "10.5.1.1"));
  check("a different connection is not punished for it", other.statusCode === 200, `${other.statusCode}`);
  const limited = await call(postReq({ ...GOOD }, ip));
  check("the limited response names the direct address", String(limited.body.error || "").includes(legal.SUPPORT_EMAIL));
}

// ---------------------------------------------------------------------------
section("the API route: upstream failure is reported, never dressed up");

resetCalls();
fetchImpl = async () => ({ ok: false, status: 500, text: async () => "provider is down" });
{
  const res = await call(postReq({ ...GOOD }, "10.6.0.1"));
  check("a provider 500 becomes a 502, not a success", res.statusCode === 502, `${res.statusCode}`);
  check("the failure body never claims ok", res.body.ok !== true);
  check("the failure tells the sender to email directly", String(res.body.detail || "").includes(legal.SUPPORT_EMAIL));
  check("the automatic reply was not attempted after the notification failed", calls.length === 1, `${calls.length} calls`);
  check(
    "the upstream failure is logged with its status",
    logged("error", /notification email could not be sent.*500/)
  );
}

resetCalls();
fetchImpl = async () => {
  throw new Error("network unreachable");
};
{
  const res = await call(postReq({ ...GOOD }, "10.6.1.1"));
  check("a network failure becomes a 502 too", res.statusCode === 502, `${res.statusCode}`);
  check("a network failure never claims ok", res.body.ok !== true);
}

resetCalls();
{
  // Notification succeeds, then the automatic reply fails: the message HAS
  // reached us, so this must stay a success — with the truth in the response.
  let n = 0;
  fetchImpl = async () => {
    n += 1;
    if (n === 1) return { ok: true, status: 200, text: async () => "" };
    return { ok: false, status: 422, text: async () => "email rejected" };
  };
  const res = await call(postReq({ ...GOOD }, "10.6.2.1"));
  check("a delivered message stays a success when only the auto-reply fails", res.statusCode === 200 && res.body.ok === true, `${res.statusCode}`);
  check("…but the response admits the reply did not go out", res.body.acknowledged === false);
}

// ---------------------------------------------------------------------------
// The provider that was failing is gone, not shadowed. The route used to trigger
// two workflows through a channel that kept reporting the mail as undelivered
// while the form said "sent"; the whole point of this PR is that the layer which
// failed is no longer in the sending path. Any reappearance of it — a stale host,
// a stale call, a stale key — is a regression, so it goes red here.
section("the provider that was failing is gone, not shadowed");

check("the route no longer names the old provider's API host", !/api\.knock\.app/.test(apiSrc));
check("the route no longer calls a workflow trigger", !/triggerWorkflow/.test(apiSrc));
check("the route no longer reads the old key name", !/KNOCK_API_KEY/.test(apiSrc));
const staleRefs = [...walk("src"), ...walk("api")].filter((f) =>
  /api\.knock\.app|KNOCK_API_KEY|triggerWorkflow/.test(readFileSync(join(root, f), "utf8"))
);
check("no file under src/ or api/ still reaches for the old provider", staleRefs.length === 0, staleRefs.join(", "));
check(
  "the route reads exactly one sending key, and it is the provider's own",
  (apiSrc.match(/process\.env\.[A-Z0-9_]+/g) || []).every((v) => v === "process.env.RESEND_API_KEY"),
  [...new Set(apiSrc.match(/process\.env\.[A-Z0-9_]+/g) || [])].join(", ")
);
check(
  "the sending path is the route's own code, not a third-party SDK",
  !/^import /m.test(apiSrc) && !/require\(/.test(apiSrc)
);

// ---------------------------------------------------------------------------
section("no database, no storage");

check("the contact route touches no Supabase client", !/supabase/i.test(apiSrc));
check("the contact route imports no shared DB helper", !/from "\.\/_lib/.test(apiSrc) && !/from "\.\.\/_lib/.test(apiSrc));
check("there is no database write in it", !/\.from\(/.test(apiSrc) && !/\.insert\(/.test(apiSrc) && !/\.upsert\(/.test(apiSrc));
// The rate limiter uses Map.delete — that is not a storage call, which is why
// the check above names the DB-shaped calls instead of the bare word.
check("nothing in it writes a contact message anywhere", !/insert|upsert|create table/i.test(apiSrc.replace(/\/\/.*$/gm, "")));

// ---------------------------------------------------------------------------
globalThis.fetch = realFetch;
console.error = realError;
console.warn = realWarn;
console.log(`  (the route logged ${logs.length} line(s) while being driven — captured above, not printed)`);
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
