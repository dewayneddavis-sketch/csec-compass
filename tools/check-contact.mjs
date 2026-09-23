// The Contact tab (owner spec 2026-09-23): a visible Contact tab whose form
// emails support@csec-compass.com, a notification to the team and an automatic
// DO-NOT-REPLY confirmation to the sender, with no database write.
//
//   node tools/check-contact.mjs
//
// Why this file exists — the two failures that would matter most are both
// silent:
//
//   1. A FORM THAT CLAIMS SUCCESS WITHOUT SENDING. If KNOCK_API_KEY is absent
//      (or Knock refuses), the honest answer is a 503/502 the page turns into
//      "email us directly". A 200 there would tell a parent their message was
//      on its way while nothing left the building, and the visitor would never
//      know to try again. Asserted here by driving the real handler with the
//      key absent AND with Knock failing, and pinning that neither returns ok.
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
// honeypot really drops a submission, the rate limit really bites, and the
// exact wording of the automatic reply is the wording the owner asked for.
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
  email: "parent@example.com",
  subject: "Bundle question",
  message: "Does the bundle cover Food and Nutrition as well?",
};

// The Knock calls are recorded here; each case starts from a clean slate.
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
  !/body\.(recipient|to|support_email)\b/.test(apiSrc) && /recipients: \[\{ id: NOTIFICATION_RECIPIENT_ID, email: SUPPORT_EMAIL \}\]/.test(apiSrc)
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
check("the page does not hardcode the caps", !/maxLength=\{120\}|maxLength=\{3000\}/.test(pageSrc));
check("the server validates with its own copy of the shared validator", /validateContactSubmission\(body\)/.test(apiSrc));
check("the honeypot field name comes from the constant on both sides", /CONTACT_HONEYPOT_FIELD/.test(pageSrc) && /CONTACT_HONEYPOT_FIELD/.test(apiSrc));
check("the success sentence on screen is the shared one", /\{CONTACT_ACK_BODY\}/.test(pageSrc) && shared.CONTACT_ACK_BODY.length > 0);

check("caps are the owner's numbers", shared.CONTACT_SUBJECT_MAX === 120 && shared.CONTACT_MESSAGE_MAX === 3000);
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
    { email: "parent@example.com", subject: "Bundle question", message: "Does it cover Food?" },
    { email: "not-an-email", subject: "ok", message: "ok" },
    { email: "parent@example.com", subject: "   ", message: "ok" },
    { email: "parent@example.com", subject: "s".repeat(120), message: "ok" },
    { email: "parent@example.com", subject: "s".repeat(121), message: "ok" },
    { email: "parent@example.com", subject: "ok", message: "" },
    { email: "parent@example.com", subject: "ok", message: "m".repeat(3000) },
    { email: "parent@example.com", subject: "ok", message: "m".repeat(3001) },
    { email: "  parent@example.com  ", subject: "  padded  ", message: "  padded  " },
    { email: "a".repeat(250) + "@x.com", subject: "ok", message: "ok" },
    { email: "parent@example.com", subject: 42, message: 7 },
  ];
  const mismatches = INPUTS.filter(
    (input) =>
      JSON.stringify(apiContact.validateContactSubmission(input)) !==
      JSON.stringify(shared.validateContactSubmission(input))
  );
  check(
    "the api validator returns byte-identical results to the shared one on 15 payloads",
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
}

// ---------------------------------------------------------------------------
section("the form itself");

check("the recipient field is read-only", /readOnly/.test(pageSrc) && /aria-readonly="true"/.test(pageSrc) && /className="contact-input contact-to"/.test(pageSrc));
check("the recipient field is not a free-text field the visitor fills", /id="contact-to"[\s\S]{0,200}value=\{SUPPORT_EMAIL\}/.test(pageSrc));
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
delete process.env.KNOCK_API_KEY;
{
  const res = await call(postReq({ ...GOOD }, "10.1.0.1"));
  check("a GET is refused with 405", (await call({ method: "GET", headers: {} })).statusCode === 405);
  check("no KNOCK_API_KEY → 503, not a fake success", res.statusCode === 503, `got ${res.statusCode}`);
  check("that 503 response never says ok", res.body.ok !== true && typeof res.body.error === "string");
  check("that 503 names the direct address as the way through", String(res.body.detail || "").includes(legal.SUPPORT_EMAIL));
  check("nothing was sent to the email service", calls.length === 0, `${calls.length} calls`);
  check(
    "the missing key is logged loudly rather than failing silently",
    logged("error", /KNOCK_API_KEY/) && logged("error", /must not claim success/)
  );
}

// ---------------------------------------------------------------------------
section("the API route: a valid submission sends both emails");

process.env.KNOCK_API_KEY = "sk_test_offline";
resetCalls();
{
  const res = await call(postReq({ ...GOOD }, "10.2.0.1"));
  check("a valid submission returns 200 ok", res.statusCode === 200 && res.body.ok === true, JSON.stringify(res.body));
  check("both emails were triggered (notification + automatic reply)", calls.length === 2, `${calls.length} calls`);
  const [notification, autoreply] = calls;
  check(
    "both go to Knock's workflow trigger endpoint",
    /^https:\/\/api\.knock\.app\/v1\/workflows\/[^/]+\/trigger$/.test(notification.url) &&
      /^https:\/\/api\.knock\.app\/v1\/workflows\/[^/]+\/trigger$/.test(autoreply.url),
    `${notification.url} | ${autoreply.url}`
  );
  check("both are POSTs", notification.opts.method === "POST" && autoreply.opts.method === "POST");
  check(
    "both carry the API key as a bearer token",
    notification.opts.headers.Authorization === "Bearer sk_test_offline" &&
      autoreply.opts.headers.Authorization === "Bearer sk_test_offline"
  );
  check("the two workflows are distinct", notification.url !== autoreply.url);
  check(
    "the notification goes to the support address",
    JSON.stringify(notification.body.recipients) === JSON.stringify([{ id: "csec-compass-support", email: legal.SUPPORT_EMAIL }]),
    JSON.stringify(notification.body.recipients)
  );
  check("the notification carries the submitter as reply-to", notification.body.data.reply_to === GOOD.email);
  check("the notification carries the submitter's address", notification.body.data.submitter_email === GOOD.email);
  check("the notification carries the subject", notification.body.data.submission_subject === GOOD.subject);
  check("the notification carries the whole message", notification.body.data.message === GOOD.message);
  check(
    "the notification subject line is the required shape",
    notification.body.data.notification_subject === `New contact message: ${GOOD.subject}`,
    notification.body.data.notification_subject
  );
  check("the notification is timestamped", !Number.isNaN(Date.parse(notification.body.data.submitted_at)));
  check(
    "the automatic reply goes to the submitter, not to us",
    JSON.stringify(autoreply.body.recipients) === JSON.stringify([{ id: GOOD.email, email: GOOD.email }]),
    JSON.stringify(autoreply.body.recipients)
  );
  check("the automatic reply carries the exact approved subject", autoreply.body.data.ack_subject === shared.CONTACT_ACK_SUBJECT);
  check("the automatic reply carries the exact approved body", autoreply.body.data.ack_body === shared.CONTACT_ACK_BODY);
  check("the automatic reply carries the not-monitored note", /not monitored/i.test(autoreply.body.data.ack_note));
  // --- The owner's real Knock workflows (created 2026-09-23) ---------------
  // Their templates render data.name / data.email / data.subject / data.message
  // (notification) and data.subject / vars.app_name (acknowledgement). These
  // checks pin the exact key set, so a rename here goes red instead of quietly
  // emptying a cell of the owner's email.
  const dataJson = JSON.stringify(notification.body.data);
  check(
    "the notification carries the template's keys: name, email, subject, message",
    ["name", "email", "subject", "message"].every((k) => k in notification.body.data) &&
      notification.body.data.email === GOOD.email &&
      notification.body.data.subject === GOOD.subject &&
      notification.body.data.message === GOOD.message,
    Object.keys(notification.body.data).join(",")
  );
  check(
    "data.name is the submitter's name, never invented from the address",
    typeof notification.body.data.name === "string" && notification.body.data.name !== GOOD.email,
    JSON.stringify(notification.body.data.name)
  );
  check(
    "the notification recipient's own email is the support address",
    notification.body.recipients.length === 1 &&
      notification.body.recipients[0].email === legal.SUPPORT_EMAIL &&
      typeof notification.body.recipients[0].id === "string" &&
      notification.body.recipients[0].id.length > 0,
    JSON.stringify(notification.body.recipients)
  );
  check(
    "the acknowledgement carries the submitter's own subject for its template",
    autoreply.body.data.subject === GOOD.subject,
    JSON.stringify(autoreply.body.data.subject)
  );
  check(
    "the acknowledgement carries app_name ('CSEC Compass') for the template",
    autoreply.body.data.app_name === "CSEC Compass",
    JSON.stringify(autoreply.body.data.app_name)
  );
  check(
    "neither trigger overrides from_name (the owner's 'No Reply' sender stands)",
    !/from_name/.test(dataJson) && !/from_name/.test(JSON.stringify(autoreply.body.data))
  );
  check(
    "no trigger payload smuggles a to_address / channel override / variables field",
    !/to_address|channel_overrides|"variables"/.test(JSON.stringify(notification.body)) &&
      !/to_address|channel_overrides|"variables"/.test(JSON.stringify(autoreply.body))
  );
  check(
    "a trigger body carries only the two documented fields (recipients, data)",
    JSON.stringify(Object.keys(notification.body).sort()) === JSON.stringify(["data", "recipients"]) &&
      JSON.stringify(Object.keys(autoreply.body).sort()) === JSON.stringify(["data", "recipients"]),
    Object.keys(notification.body).join(",")
  );
  check(
    "the route documents where a trigger CANNOT set the recipient or vars",
    /no per-trigger `to_address`/i.test(apiSrc) && /Variables page/i.test(apiSrc)
  );
  check(
    "the automatic reply has no reply-to pointing at a person",
    autoreply.body.data.reply_to === undefined
  );
  check("the response reports the acknowledgement went out", res.body.acknowledged === true);
  check("the response is not cached", res.headers["cache-control"] === "no-store");
}

// ---------------------------------------------------------------------------
section("the API route: it refuses bad input and never trusts the body");

resetCalls();
{
  const bad = [
    ["a malformed email", { ...GOOD, email: "not-an-email" }, "email"],
    ["an empty subject", { ...GOOD, subject: "   " }, "subject"],
    ["a subject over the cap", { ...GOOD, subject: "s".repeat(121) }, "subject"],
    ["an empty message", { ...GOOD, message: "" }, "message"],
    ["a message over the cap", { ...GOOD, message: "m".repeat(3001) }, "message"],
  ];
  for (const [label, body, field] of bad) {
    const res = await call(postReq(body, "10.3.0.1"));
    check(
      `${label} is rejected with a field error`,
      res.statusCode === 400 && res.body.fields && res.body.fields[field],
      `${res.statusCode} ${JSON.stringify(res.body)}`
    );
  }
  check("none of the rejected submissions were sent", calls.length === 0);
  const boundary = await call(postReq({ ...GOOD, subject: "s".repeat(120), message: "m".repeat(3000) }, "10.3.0.2"));
  check("the exact boundary lengths are accepted", boundary.statusCode === 200, `${boundary.statusCode}`);
  check("the boundary submission sent both emails", calls.length === 2);
}

resetCalls();
{
  const res = await call(postReq({ ...GOOD, recipient: "attacker@evil.example" }, "10.3.1.1"));
  const targets = calls.map((c) => JSON.stringify(c.body.recipients)).join(" ");
  check("a body field cannot redirect the notification anywhere else", !targets.includes("evil.example"), targets);
  check("the notification still goes to support", calls.some((c) => c.body.recipients[0].email === legal.SUPPORT_EMAIL));
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
fetchImpl = async () => ({ ok: false, status: 500, text: async () => "knock is down" });
{
  const res = await call(postReq({ ...GOOD }, "10.6.0.1"));
  check("a Knock 500 becomes a 502, not a success", res.statusCode === 502, `${res.statusCode}`);
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
    return { ok: false, status: 404, text: async () => "workflow not found" };
  };
  const res = await call(postReq({ ...GOOD }, "10.6.2.1"));
  check("a delivered message stays a success when only the auto-reply fails", res.statusCode === 200 && res.body.ok === true, `${res.statusCode}`);
  check("…but the response admits the reply did not go out", res.body.acknowledged === false);
}

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
