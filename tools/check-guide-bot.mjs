// The Compass Guide's contract.
//
//   node tools/check-guide-bot.mjs
//
// WHY THIS FILE EXISTS
//
// The owner decided (2026-09-24) "bot first, then chat": a deterministic guide
// that answers site and buyer questions from a curated fact set, with no model,
// no API key and no per-message cost. The whole value of that choice is that the
// guide cannot invent anything — so the two things worth guarding are:
//
//   1. IT SAYS NOTHING WE HAVE NOT VERIFIED. Every amount, address, count and
//      policy line in src/data/guideFacts.js must be READ from the module that
//      owns it, not typed again. A guide that quotes its own copy of the price is
//      exactly the drift this repo has been bitten by before (the bundle saving,
//      the subject dropdown, the free-preview count), except now it would be a
//      CHATBOT telling a buyer a price the Pricing page no longer charges. So the
//      guide's answers are asserted against pricingSubjects.js, legal.js,
//      contact.js, access.js, mockExamRules.js and showYourWork.js, and the
//      school ladder is cross-checked against the Stripe ladder in
//      api/checkout/create-session.js. The two content counts are counted out of
//      content/<subject>/*.json directly.
//   2. IT SAYS NOTHING AT ALL WHEN IT DOES NOT KNOW. Unknown input must land on
//      the honest fallback with the Contact route in it — never a plausible
//      made-up answer. The fallback is asserted to be exactly GUIDE_FALLBACK and
//      to contain no topic's answer text.
//
// Plus the hard constraints from the task: no new api/ function (the Vercel
// 12-function cap), no LLM, no external request, no API key, no per-message cost.
//
// Run it with the rest before any PR that touches the guide:
//   for f in tools/check-*.mjs; do node "$f"; done
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
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
  console.log(`\n${title}`);
}

// --- the modules the guide must quote, not copy ----------------------------
const pricing = await import("../src/data/pricingSubjects.js");
const legal = await import("../src/data/legal.js");
const contact = await import("../src/data/contact.js");
const access = await import("../src/data/access.js");
const examRules = await import("../src/data/mockExamRules.js");
const showYourWork = await import("../src/data/showYourWork.js");
const guide = await import("../src/data/guideFacts.js");

const {
  GUIDE_TOPICS, GUIDE_FALLBACK, GUIDE_INTRO, GUIDE_CURATED_QUESTIONS,
  GUIDE_SUGGESTED_QUESTIONS, GUIDE_SUBJECT_COUNT, GUIDE_SUBJECT_NAMES,
  GUIDE_BUNDLE_SAVING_PCT, GUIDE_BUNDLE_SAVING_USD, GUIDE_SINGLES_TOTAL,
  GUIDE_PRACTICE_QUESTIONS, GUIDE_KNOWLEDGE_CHECK_QUESTIONS, GUIDE_SHOW_WORK_SUBJECTS,
  matchGuideTopic, guideReply, usd, normalizeGuideText,
} = guide;

const guideSrc = read("src/data/guideFacts.js");
const answerFor = (id) => {
  const topic = GUIDE_TOPICS.find((t) => t.id === id);
  return topic ? topic.answer : "";
};

// ===========================================================================
section("1. the guide reads the live modules instead of keeping its own copy");

check(
  "guideFacts.js imports pricing, legal, contact, access, mockExamRules and showYourWork",
  [
    /from "\.\/pricingSubjects\.js"/,
    /from "\.\/legal\.js"/,
    /from "\.\/contact\.js"/,
    /from "\.\/access\.js"/,
    /from "\.\/mockExamRules\.js"/,
    /from "\.\/showYourWork\.js"/,
  ].every((re) => re.test(guideSrc)),
  "one of the imports is missing"
);

// The cleanest possible guard for "no second copy": the values themselves must
// not appear in the CODE. Comments are stripped first — a comment that documents
// what a derived constant works out to ("// 229.77") is documentation, not a
// claim the guide can show, and it is exactly the kind of comment that helps the
// next reader.
const guideCode = guideSrc
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .split("\n")
  .map((line) => line.replace(/\/\/.*$/, ""))
  .join("\n");
const FORBIDDEN_LITERALS = [
  String(pricing.SUBJECT_PRICE),          // 9.99
  String(pricing.BUNDLE_PRICE),           // 49.99
  GUIDE_SINGLES_TOTAL.toFixed(2),         // 229.77
  GUIDE_BUNDLE_SAVING_USD.toFixed(2),     // 179.78
  "1,250", "2,000", "2,250",
  legal.SUPPORT_EMAIL,                    // support@csec-compass.com
  legal.PRIVACY_CONTACT_EMAIL,            // the data inbox
];
const typedIn = FORBIDDEN_LITERALS.filter((literal) => guideCode.includes(literal));
check(
  "no price, amount or address is typed into guideFacts.js",
  typedIn.length === 0,
  `found ${JSON.stringify(typedIn)}`
);

check(
  "the support address comes from legal.js",
  answerFor("contact").includes(legal.SUPPORT_EMAIL) &&
    answerFor("refunds").includes(legal.SUPPORT_EMAIL) &&
    GUIDE_FALLBACK.includes(legal.SUPPORT_EMAIL)
);
check(
  "the data-request address is the other one, and only in the privacy answer",
  answerFor("privacy").includes(legal.PRIVACY_CONTACT_EMAIL) &&
    !answerFor("privacy").includes(legal.SUPPORT_EMAIL + " — that is the address") &&
    !GUIDE_FALLBACK.includes(legal.PRIVACY_CONTACT_EMAIL),
  "the two addresses are meant to stay apart"
);
check(
  "the reply window is the contact module's wording",
  answerFor("contact").includes(contact.CONTACT_RESPONSE_WINDOW) &&
    GUIDE_FALLBACK.includes(contact.CONTACT_RESPONSE_WINDOW),
  `CONTACT_RESPONSE_WINDOW = ${contact.CONTACT_RESPONSE_WINDOW}`
);
check(
  "the CXC line is the one shared disclaimer, quoted whole",
  answerFor("independence").includes(legal.TRADEMARK_DISCLAIMER)
);

// ===========================================================================
section("2. the numbers in the answers are the numbers the app enforces");

check("the subject count is the catalog size", GUIDE_SUBJECT_COUNT === pricing.FALLBACK_SUBJECT_OPTIONS.length);
check("the subject list is the catalog's names", GUIDE_SUBJECT_NAMES.join("|") === pricing.FALLBACK_SUBJECT_OPTIONS.map((s) => s.name).join("|"));
check(
  "the subjects answer names every subject",
  GUIDE_SUBJECT_NAMES.every((name) => answerFor("subjects").includes(name))
);
check(
  "the single-subject price is pricingSubjects' SUBJECT_PRICE",
  pricing.SUBJECT_PRICE === 9.99 && answerFor("pricing-single").includes(usd(pricing.SUBJECT_PRICE))
);
check(
  "the bundle price is pricingSubjects' BUNDLE_PRICE",
  pricing.BUNDLE_PRICE === 49.99 && answerFor("pricing-bundle").includes(usd(pricing.BUNDLE_PRICE))
);
check(
  "the bundle saving is computed, not written down (229.77 − 49.99 = 179.78, 78%)",
  GUIDE_SINGLES_TOTAL.toFixed(2) === "229.77" &&
    GUIDE_BUNDLE_SAVING_USD.toFixed(2) === "179.78" &&
    GUIDE_BUNDLE_SAVING_PCT === 78 &&
    answerFor("pricing-bundle").includes("229.77") &&
    answerFor("pricing-bundle").includes("179.78") &&
    answerFor("pricing-bundle").includes("78%")
);
check(
  "it also matches the label the Pricing page shows",
  pricing.bundleSavingsLabel(GUIDE_SUBJECT_COUNT) === "Save 78% vs buying every subject separately"
);
check(
  "the free preview is access.js's FREE_PREVIEW_LESSONS",
  access.FREE_PREVIEW_LESSONS === 2 &&
    answerFor("free-preview").includes(`first ${access.FREE_PREVIEW_LESSONS} lessons`) &&
    /free to open/.test(answerFor("free-preview")) &&
    // …and it advertises no OTHER preview size, which is the drift that matters.
    [...answerFor("free-preview").matchAll(/(\d+)\s+lessons/g)].every(
      (m) => Number(m[1]) === access.FREE_PREVIEW_LESSONS
    ),
  `FREE_PREVIEW_LESSONS = ${access.FREE_PREVIEW_LESSONS}`
);
check(
  "the answer for 'when do I get the price now' quotes SUBJECT_PRICE too",
  answerFor("free-preview").includes(usd(pricing.SUBJECT_PRICE)) &&
    answerFor("free-preview").includes(usd(pricing.BUNDLE_PRICE))
);
// Every amount a buyer can read must be one the modules derive. This is the
// guard that catches a price typed straight into an answer, which the literal
// scan above can only catch when it happens to be the CURRENT value.
const allowedAmounts = new Set([
  usd(pricing.SUBJECT_PRICE),
  usd(pricing.BUNDLE_PRICE),
  usd(GUIDE_SINGLES_TOTAL),
  usd(GUIDE_BUNDLE_SAVING_USD),
  ...pricing.SCHOOL_LICENSES.flatMap((t) => [
    "$" + t.price.toLocaleString("en-US"),
    "$" + t.perStudent.toLocaleString("en-US"),
  ]),
]);
const shownAmounts = [...new Set(
  GUIDE_TOPICS.flatMap((t) => [...t.answer.matchAll(/\$\d[\d,]*\.?\d*/g)].map((m) => m[0]))
)];
check(
  `every amount the guide shows is derived from the modules (${shownAmounts.length} amounts)`,
  shownAmounts.length >= 5 && shownAmounts.every((amount) => allowedAmounts.has(amount)),
  `unverified: ${JSON.stringify(shownAmounts.filter((a) => !allowedAmounts.has(a)))}`
);
check(
  "the mock-exam numbers are mockExamRules' constants",
  answerFor("whats-included").includes(`${examRules.MAX_QUESTIONS} questions`) &&
    answerFor("whats-included").includes(`${examRules.SECONDS_PER_QUESTION} seconds each`) &&
    answerFor("whats-included").includes(`${examRules.PASS_PERCENTAGE}% to pass`),
  JSON.stringify(examRules)
);
check(
  "MockExam.jsx no longer keeps its own copy of those three",
  /from "\.\.\/data\/mockExamRules"/.test(read("src/components/MockExam.jsx")) &&
    !/const\s+(SECONDS_PER_QUESTION|MAX_QUESTIONS|PASS_PERCENTAGE)\s*=/.test(read("src/components/MockExam.jsx"))
);
check(
  "the show-your-work answer names the subjects showYourWork.js switches on",
  showYourWork.SHOW_YOUR_WORK.subjects.length === 1 &&
    GUIDE_SHOW_WORK_SUBJECTS.join(" and ") === "Mathematics" &&
    answerFor("show-your-work").includes("Mathematics")
);

// --- content facts: counted out of the real files --------------------------
const subjectDirs = readdirSync(join(root, "content")).filter((name) => {
  const p = join(root, "content", name);
  return statSync(p).isDirectory() && existsSync(join(p, "practice.json"));
});
const countQuestions = (subject, file) => {
  const data = JSON.parse(read(join("content", subject, file)));
  const list = Array.isArray(data) ? data : data.questions || [];
  return list.length;
};
const practiceCounts = subjectDirs.map((s) => countQuestions(s, "practice.json"));
const checkCounts = subjectDirs.map((s) => countQuestions(s, "knowledge-check.json"));
check(
  `every subject's practice bank is the advertised ${GUIDE_PRACTICE_QUESTIONS} questions`,
  subjectDirs.length >= 20 && practiceCounts.every((n) => n === GUIDE_PRACTICE_QUESTIONS),
  `${subjectDirs.length} subjects, counts ${JSON.stringify([...new Set(practiceCounts)])}`
);
check(
  `every knowledge check is the advertised ${GUIDE_KNOWLEDGE_CHECK_QUESTIONS} questions`,
  checkCounts.every((n) => n === GUIDE_KNOWLEDGE_CHECK_QUESTIONS),
  `counts ${JSON.stringify([...new Set(checkCounts)])}`
);

// --- the school ladder agrees with the Stripe ladder and the page ----------
const serverSrc = read("api/checkout/create-session.js");
const serverBlock = /const SCHOOL_LICENSES = \{([\s\S]*?)\n\};/.exec(serverSrc);
check("api/checkout/create-session.js still declares the ladder", Boolean(serverBlock));
if (serverBlock) {
  const tiers = [...serverBlock[1].matchAll(/"([a-z0-9-]+)":\s*\{\s*seats:\s*(\d+),\s*price:\s*(\d+)/g)].map((m) => ({
    priceType: m[1],
    seats: Number(m[2]),
    price: Number(m[3]),
  }));
  check(
    "the display ladder and the Stripe ladder are the same three tiers",
    tiers.length === pricing.SCHOOL_LICENSES.length &&
      tiers.every((tier, i) => {
        const mine = pricing.SCHOOL_LICENSES[i];
        return tier.priceType === mine.priceType && tier.seats === mine.seats && tier.price === mine.price;
      }),
    `${JSON.stringify(tiers)} vs ${JSON.stringify(pricing.SCHOOL_LICENSES)}`
  );
}
check(
  "the Pricing page renders the shared ladder instead of its own",
  /import \{[\s\S]*SCHOOL_LICENSES[\s\S]*\} from "\.\.\/data\/pricingSubjects"/.test(read("src/pages/PricingPage.jsx")) &&
    !/const SCHOOL_LICENSES = \[/.test(read("src/pages/PricingPage.jsx"))
);
check(
  "the school answer quotes every tier: seats, price and per-student rate",
  pricing.SCHOOL_LICENSES.every(
    (tier) =>
      answerFor("school-license").includes(`Up to ${tier.seats} students`) &&
      answerFor("school-license").includes(`$${tier.price.toLocaleString("en-US")}`) &&
      answerFor("school-license").includes(`$${tier.perStudent.toLocaleString("en-US")} per student`) &&
      answerFor("pricing-overview").includes(`Up to ${tier.seats} students`)
  )
);
check(
  "the banner and the deep-link guard share the free-preview constant",
  /Math\.min\(FREE_PREVIEW_LESSONS/.test(read("src/pages/SubjectPage.jsx")) &&
    /globalIdx >= FREE_PREVIEW_LESSONS/.test(read("src/pages/SubjectPage.jsx")) &&
    /lessonIndex < FREE_PREVIEW_LESSONS/.test(read("src/pages/LessonView.jsx")) &&
    !/globalIdx >= 2\b/.test(read("src/pages/SubjectPage.jsx"))
);

// ===========================================================================
section("3. every curated question routes to its own topic");

const misses = GUIDE_CURATED_QUESTIONS.filter(({ topicId, text }) => {
  const match = matchGuideTopic(text);
  return !match.matched || match.topicId !== topicId;
});
check(
  `all ${GUIDE_CURATED_QUESTIONS.length} curated questions land on their own topic`,
  misses.length === 0,
  JSON.stringify(misses.slice(0, 3))
);
check(
  "the chips are curated questions, one per suggested topic",
  GUIDE_SUGGESTED_QUESTIONS.length >= 5 &&
    GUIDE_SUGGESTED_QUESTIONS.every((q) => GUIDE_TOPICS.some((t) => t.id === q.topicId && t.questions.includes(q.text)))
);
check(
  "every topic has questions, keywords and an answer",
  GUIDE_TOPICS.every((t) => t.questions.length >= 2 && t.keywords.length >= 3 && t.answer.length > 80)
);
check(
  "every topic names where its claims come from, and those files exist",
  GUIDE_TOPICS.every((t) => Array.isArray(t.sources) && t.sources.length > 0 && t.sources.every((p) => existsSync(join(root, p))))
);
check(
  "topic ids are unique",
  new Set(GUIDE_TOPICS.map((t) => t.id)).size === GUIDE_TOPICS.length
);

// ===========================================================================
section("4. paraphrases land where they should (not just the exact wording)");

const PARAPHRASES = [
  ["how much does it cost for all the subjects", "pricing-bundle"],
  ["what is the price", "pricing-overview"],
  ["how much is one subject", "pricing-single"],
  ["is it free", "free-preview"],
  ["i want to try it before i buy", "free-preview"],
  ["how do i show my working", "show-your-work"],
  ["what happens if i get a question wrong", "show-your-work"],
  ["can i get my money back", "refunds"],
  ["we want to use this in our class", "school-license"],
  ["we are a school of 90 students", "school-license"],
  ["do you offer discounts for schools", "school-license"],
  ["how long does access last", "access-duration"],
  ["does my access renew automatically", "access-duration"],
  ["i forgot my password", "account"],
  ["do you have biology?", "subjects"],
  ["can you help me with physics", "subjects"],
  ["how many subjects are there", "subjects"],
  ["is this official cxc material", "independence"],
  ["can parents see progress", "teachers-parents"],
  ["is there a revision planner", "planner"],
  ["how do i pay", "how-to-buy"],
  ["who do i email for data deletion", "privacy"],
  ["how much is the bundle", "pricing-bundle"],
  ["can i talk to a human", "contact"],
  ["what is included in a subject", "whats-included"],
  ["how many questions are in the mock exam", "whats-included"],
  ["how much for everything", "pricing-bundle"],
];
const wrongTopic = PARAPHRASES.filter(([q, want]) => matchGuideTopic(q).topicId !== want);
check(
  `all ${PARAPHRASES.length} paraphrases reach the intended topic`,
  wrongTopic.length === 0,
  JSON.stringify(wrongTopic)
);
check(
  "matching is case- and punctuation-insensitive",
  matchGuideTopic("HOW MUCH IS THE BUNDLE?!").topicId === "pricing-bundle" &&
    matchGuideTopic("  how much is the bundle  ").topicId === "pricing-bundle" &&
    normalizeGuideText("How much is ONE subject?") === "how much is one subject"
);

// ===========================================================================
section("5. unknown input gets the honest fallback, never an invented answer");

const UNKNOWN = [
  "",
  "   ",
  "???",
  "what is the weather in Kingston",
  "write my essay for me",
  "who won the world cup",
  "asdfghjkl",
  "can you do my homework",
  "sing me a song",
  "how do I make jollof rice",
  "what is the capital of France",
  "recommend a movie",
  "solve this equation for me",
  "is the moon made of cheese",
  "tell me a joke",
];
for (const input of UNKNOWN) {
  const reply = guideReply(input);
  const anyAnswerLeaked = GUIDE_TOPICS.some((t) => reply.text.includes(t.answer));
  check(
    `unknown input falls back honestly: ${JSON.stringify(input)}`,
    reply.matched === false && reply.topicId === null && reply.text === GUIDE_FALLBACK && !anyAnswerLeaked,
    reply.matched ? `matched ${reply.topicId}` : "leaked an answer"
  );
}
check(
  "the fallback says what it is and hands the person to a human",
  GUIDE_FALLBACK.includes("guide") &&
    legal.SUPPORT_EMAIL &&
    GUIDE_FALLBACK.includes(legal.SUPPORT_EMAIL) &&
    /Contact form/.test(GUIDE_FALLBACK)
);
check(
  "the intro tells the user what it can answer",
  GUIDE_INTRO.length > 60 && /guide/i.test(GUIDE_INTRO) && /questions below/i.test(GUIDE_INTRO)
);
check(
  "a matched reply carries the topic it answered from",
  (() => {
    const reply = guideReply("how much is one subject");
    return reply.matched === true && reply.topicId === "pricing-single" && reply.text === answerFor("pricing-single");
  })()
);

// ===========================================================================
section("6. no model, no key, no request, no new api/ function");

check(
  "the guide never fetches anything (no per-message cost, no data sent out)",
  !/\bfetch\s*\(/.test(guideSrc) &&
    !/XMLHttpRequest|axios|EventSource|WebSocket/.test(guideSrc) &&
    !/new URL\(|https?:\/\//.test(guideSrc),
  "guideFacts.js touches the network"
);
check(
  "no model, no key: nothing reads an API key or calls an LLM endpoint",
  !/process\.env|api[_-]?key|openai|anthropic|gemini|claude|gpt/i.test(guideSrc)
);
check(
  "the guide imports nothing from api/",
  !/from "\.\.\/api\//.test(guideSrc) && !/from "\.\.\/api\//.test(read("src/components/GuideBot.jsx"))
);
const apiRouteFiles = (function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return name.startsWith("_") ? [] : walk(full);
    return name.endsWith(".js") && !name.startsWith("_") ? [full] : [];
  });
})(join(root, "api"));
check(
  "api/ is still 12 route functions (this change adds no function)",
  apiRouteFiles.length === 12,
  `${apiRouteFiles.length}: ${apiRouteFiles.map((f) => f.replace(root + "/", "")).join(", ")}`
);
check(
  "the guide is a pure module (no React, no JSX) so the harness drives the real one",
  !/from "react/.test(guideSrc) && !/<[A-Z][A-Za-z]*[\s/>]/.test(guideCode)
);

// ===========================================================================
section("7. the UI is wired into the shell and is usable");

const appSrc = read("src/App.jsx");
const uiSrc = read("src/components/GuideBot.jsx");
const cssSrc = read("src/components/GuideBot.css");

check("App.jsx imports the widget", /import GuideBot from "\.\/components\/GuideBot"/.test(appSrc));
check(
  "it renders on every page: inside the shell, OUTSIDE <Routes> (like the footer)",
  /<\/Routes>/.test(appSrc) &&
    appSrc.indexOf("</Routes>") < appSrc.indexOf("<GuideBot />") &&
    appSrc.indexOf("<GuideBot />") !== -1
);
check("the widget renders the curated answers", /guideReply\(/.test(uiSrc) && /GUIDE_SUGGESTED_QUESTIONS/.test(uiSrc));
check("the intro is shown when the panel opens", /GUIDE_INTRO/.test(uiSrc));
check(
  "an unmatched answer also offers the Contact form",
  /matched === false/.test(uiSrc) && /to="\/contact"/.test(uiSrc)
);
check(
  "it is keyboard-usable: Escape closes, the input is labelled and focused",
  /event\.key === "Escape"/.test(uiSrc) &&
    /htmlFor="guidebot-input"/.test(uiSrc) &&
    /inputRef\.current\.focus\(\)/.test(uiSrc) &&
    /aria-expanded=\{open\}/.test(uiSrc) &&
    /aria-label=/.test(uiSrc)
);
check(
  "the transcript is announced politely (aria-live) and no HTML is injected",
  /aria-live="polite"/.test(uiSrc) && !/dangerouslySetInnerHTML/.test(uiSrc)
);
check(
  "the panel is styled and usable on a phone",
  /\.gb-panel\s*\{/.test(cssSrc) && /\.gb-launcher\s*\{/.test(cssSrc) && /@media \(max-width: 480px\)/.test(cssSrc)
);
check(
  "it is unobtrusive: fixed, above the navbar (z-index 200), bottom-right",
  /position: fixed/.test(cssSrc) && /z-index: 200/.test(cssSrc)
);

// ===========================================================================
// Prove the harness can fail: one known-false and one known-true assertion run
// through the same check(), and the counters must move by exactly one each.
section("8. wiring self-test (a false condition must fail, a true one must pass)");
{
  const p0 = passed;
  const f0 = failed;
  quiet = true;
  check("probe-false", false);
  check("probe-true", true);
  quiet = false;
  const wired = failed === f0 + 1 && passed === p0 + 1;
  passed = p0;
  failed = f0;
  check("a false condition fails and a true one passes (check() is not vacuous)", wired);
}

console.log(`\ncheck-guide-bot: ${passed}/${passed + failed} green${failed ? ` (${failed} FAILED)` : ""}`);
process.exit(failed === 0 ? 0 : 1);
