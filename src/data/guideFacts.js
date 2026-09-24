// The Compass Guide — a deterministic, curated answer set.
//
// WHY THIS FILE EXISTS (owner decision 2026-09-24: "bot first, then chat").
// The guide answers site and buyer questions from THIS file and nothing else.
// There is no model, no API key, no per-message cost and no network request: the
// matcher below is a plain keyword score over the curated topics, so the guide
// cannot invent a price, a policy or a promise. It either finds a topic it was
// given, or it says it does not know and points at the Contact form.
//
// EVERY CLAIM IS READ FROM THE MODULE THAT OWNS IT — never typed twice:
//   price, subject list, school ladder -> src/data/pricingSubjects.js
//   support address, data address, CXC wording -> src/data/legal.js
//   reply window -> src/data/contact.js
//   free-preview size -> src/data/access.js
//   mock-exam rules -> src/data/mockExamRules.js
//   which subjects have the working box -> src/data/showYourWork.js
// tools/check-guide-bot.mjs drives the real matcher and fails the build if any of
// those values drift, so the guide can never quote a price the Pricing page has
// stopped charging. The two remaining numbers (practice bank and knowledge-check
// sizes) are counted out of content/<subject>/*.json by the same harness, because
// they are content facts rather than code constants.
import {
  SUBJECT_PRICE,
  BUNDLE_PRICE,
  FALLBACK_SUBJECT_OPTIONS,
  SCHOOL_LICENSES,
  bundleSavingsPct,
} from "./pricingSubjects.js";
import { SUPPORT_EMAIL, PRIVACY_CONTACT_EMAIL, TRADEMARK_DISCLAIMER } from "./legal.js";
import { CONTACT_RESPONSE_WINDOW } from "./contact.js";
import { FREE_PREVIEW_LESSONS } from "./access.js";
import { SECONDS_PER_QUESTION, MAX_QUESTIONS, PASS_PERCENTAGE } from "./mockExamRules.js";
import { SHOW_YOUR_WORK } from "./showYourWork.js";

// --- values the guide quotes, derived from the modules above ---------------
export const GUIDE_SUBJECT_COUNT = FALLBACK_SUBJECT_OPTIONS.length;
export const GUIDE_SUBJECT_NAMES = FALLBACK_SUBJECT_OPTIONS.map((s) => s.name);
export const GUIDE_SINGLES_TOTAL = GUIDE_SUBJECT_COUNT * SUBJECT_PRICE; // 229.77
export const GUIDE_BUNDLE_SAVING_USD = GUIDE_SINGLES_TOTAL - BUNDLE_PRICE; // 179.78
export const GUIDE_BUNDLE_SAVING_PCT = bundleSavingsPct(GUIDE_SUBJECT_COUNT); // 78

// Content facts (asserted against every content/<subject>/*.json by the harness).
export const GUIDE_PRACTICE_QUESTIONS = 100;
export const GUIDE_KNOWLEDGE_CHECK_QUESTIONS = 25;

// Display helper: "$9.99". Every amount the guide shows goes through this, so a
// price can never be printed with the wrong number of decimals or a stray float.
export function usd(amount) {
  return "$" + Number(amount).toFixed(2);
}

// Thousands-separated amounts for the school ladder ("$1,250").
function usdGrouped(amount) {
  return "$" + Number(amount).toLocaleString("en-US");
}

function subjectName(id) {
  const hit = FALLBACK_SUBJECT_OPTIONS.find((s) => s.id === id);
  return hit ? hit.name : id;
}

// Which subjects the show-your-work box is switched on for, named.
export const GUIDE_SHOW_WORK_SUBJECTS = SHOW_YOUR_WORK.subjects.map(subjectName);

// --- the curated topics ----------------------------------------------------
// Each topic: id, a short title, the questions we suggest/recognise verbatim,
// discriminating keywords (multi-word phrases score higher), and the answer
// built from the values above. `sources` names where every claim came from; the
// harness asserts they point at real modules.
export const GUIDE_TOPICS = [
  {
    id: "subjects",
    title: "Subjects we cover",
    sources: ["src/data/pricingSubjects.js", "content/subjects.json"],
    questions: [
      "What subjects do you cover?",
      "Which CSEC subjects are on the platform?",
      "Do you have my subject?",
    ],
    keywords: [
      "what subjects",
      "which subjects",
      "subject list",
      "list of subjects",
      "available subjects",
      "do you cover",
      "subjects do you",
      "csec subjects",
      "subjects",
    ],
    answer:
      `CSEC Compass covers ${GUIDE_SUBJECT_COUNT} CSEC subjects:\n\n` +
      GUIDE_SUBJECT_NAMES.map((n) => `• ${n}`).join("\n") +
      "\n\nEvery subject is complete: lessons in modules, a Play lab for each lesson, " +
      `an Extra Practice bank of ${GUIDE_PRACTICE_QUESTIONS} questions, a ` +
      `${GUIDE_KNOWLEDGE_CHECK_QUESTIONS}-question knowledge check and a timed mock exam. ` +
      `Any single subject is ${usd(SUBJECT_PRICE)} for a year, and all ${GUIDE_SUBJECT_COUNT} ` +
      `together are ${usd(BUNDLE_PRICE)}.`,
  },
  {
    id: "pricing-single",
    title: "One subject",
    sources: ["src/data/pricingSubjects.js", "src/pages/TermsPage.jsx"],
    questions: [
      "How much does one subject cost?",
      "What is the price of a single subject?",
      "Can I buy just one subject?",
    ],
    keywords: [
      "one subject",
      "single subject",
      "per subject",
      "just one",
      "cost of a subject",
      "price of a subject",
      "how much is a subject",
      "how much does a subject",
      "buy one subject",
      "one course",
      usd(SUBJECT_PRICE),
      String(SUBJECT_PRICE),
    ],
    answer:
      `One subject costs ${usd(SUBJECT_PRICE)} for a full year of access.\n\n` +
      `Every subject we publish can be bought on its own at that price — there are no ` +
      `"bundle only" subjects. You pick it on the Pricing page and pay by card; access ` +
      `unlocks as soon as the payment is confirmed.`,
  },
  {
    id: "pricing-bundle",
    title: "All subjects (bundle)",
    sources: ["src/data/pricingSubjects.js", "src/pages/TermsPage.jsx"],
    questions: [
      "How much is the all subjects bundle?",
      "Is there a discount for taking everything?",
      "Can I buy all the subjects in one payment?",
    ],
    keywords: [
      "bundle",
      "all subjects",
      "every subject",
      "all the subjects",
      "everything",
      "all of it",
      "discount",
      "cheaper",
      `all ${GUIDE_SUBJECT_COUNT}`,
      usd(BUNDLE_PRICE),
      String(BUNDLE_PRICE),
    ],
    answer:
      `All ${GUIDE_SUBJECT_COUNT} subjects together cost ${usd(BUNDLE_PRICE)} for a year — ` +
      `every subject we publish, in one payment.\n\n` +
      `Buying them one at a time would be ${usd(GUIDE_SINGLES_TOTAL)} ` +
      `(${GUIDE_SUBJECT_COUNT} × ${usd(SUBJECT_PRICE)}), so the bundle saves ` +
      `${usd(GUIDE_BUNDLE_SAVING_USD)} — about ${GUIDE_BUNDLE_SAVING_PCT}%.`,
  },
  {
    id: "school-license",
    title: "School licences",
    sources: ["src/data/pricingSubjects.js", "src/pages/PricingPage.jsx"],
    questions: [
      "Do you sell school licences?",
      "How much does it cost for a whole class or school?",
      "Can my school buy seats for students?",
    ],
    keywords: [
      "school",
      "schools",
      "licence",
      "license",
      "licences",
      "licenses",
      "my class",
      "our class",
      "whole class",
      "year group",
      "class",
      "students",
      "our students",
      "seats",
      "per student",
      "bulk",
      "institution",
      "department of education",
      "our school",
    ],
    answer:
      `Schools buy a one-year licence in seats. Each seat gets all ${GUIDE_SUBJECT_COUNT} subjects:\n\n` +
      SCHOOL_LICENSES.map(
        (tier) =>
          `• Up to ${tier.seats} students — ${usdGrouped(tier.price)} a year ` +
          `(${usdGrouped(tier.perStudent)} per student)`
      ).join("\n") +
      `\n\nThe school names itself and its own admin at checkout, and that person runs the ` +
      `school console (roster, teacher links, seats). A larger cohort buys a second licence ` +
      `or asks us for a quote — seats can be reassigned inside the school's account.`,
  },
  {
    id: "free-preview",
    title: "Free preview",
    sources: ["src/data/access.js", "src/pages/LessonView.jsx"],
    questions: [
      "Is there a free trial?",
      "Can I try it before paying?",
      "How much can I see for free?",
    ],
    keywords: [
      "free",
      "preview",
      "trial",
      "try before",
      "try it",
      "without paying",
      "for free",
      "test it",
      "sample lessons",
      "2 lessons",
      "two lessons",
    ],
    answer:
      `Yes. The first ${FREE_PREVIEW_LESSONS} lessons of every subject are free to open — no ` +
      `card, no trial clock, nothing to cancel.\n\n` +
      `You do need a free account to open lessons (that is how your progress is kept). ` +
      `After the preview, that subject is ${usd(SUBJECT_PRICE)} for a year, or ` +
      `${usd(BUNDLE_PRICE)} for all ${GUIDE_SUBJECT_COUNT}.`,
  },
  {
    id: "access-duration",
    title: "How long access lasts",
    sources: ["src/pages/TermsPage.jsx", "src/pages/PricingPage.jsx"],
    questions: [
      "How long do I have access?",
      "Does access expire or renew?",
      "Is this a subscription?",
    ],
    keywords: [
      "how long",
      "one year",
      "1 year",
      "expire",
      "expires",
      "expiry",
      "subscription",
      "renew",
      "renews",
      "monthly",
      "duration",
      "access last",
      "12 months",
    ],
    answer:
      `Access runs for one year from the date of purchase, and nothing renews by itself — ` +
      `when the year ends it simply ends unless you buy again.\n\n` +
      `One subject unlocks that subject; the ${usd(BUNDLE_PRICE)} bundle unlocks every ` +
      `subject; a school licence covers the seats bought for its year.`,
  },
  {
    id: "whats-included",
    title: "What a subject includes",
    sources: [
      "src/data/mockExamRules.js",
      "content/subjects.json",
      "src/pages/TermsPage.jsx",
    ],
    questions: [
      "What do I get in a subject?",
      "What is included in the course?",
      "What practice and exams are in there?",
    ],
    keywords: [
      "what do i get",
      "what is included",
      "whats included",
      "what's included",
      "what is in it",
      "features",
      "mock exam",
      "extra practice",
      "knowledge check",
      "practice questions",
      "labs",
      "paper 2",
      "sba",
      "includes",
    ],
    answer:
      `Each subject is a full self-paced course:\n\n` +
      `• Lessons grouped into modules, with a Play lab for each lesson\n` +
      `• Extra Practice — ${GUIDE_PRACTICE_QUESTIONS} questions you can work through as often as you like\n` +
      `• A ${GUIDE_KNOWLEDGE_CHECK_QUESTIONS}-question knowledge check to see if you are ready\n` +
      `• A timed mock exam: ${MAX_QUESTIONS} questions, ${SECONDS_PER_QUESTION} seconds each, ` +
      `${PASS_PERCENTAGE}% to pass, with a full review and retakes\n` +
      `• Paper 2 typed-answer practice for the subjects that have a written paper\n` +
      `• An exam-support tab with the command words and the technique guide\n\n` +
      `Every wrong answer shows the correct answer with the step-by-step method, so you ` +
      `learn the method and not just the mark.`,
  },
  {
    id: "show-your-work",
    title: "Showing your work",
    sources: ["src/data/showYourWork.js", "src/components/HowToSolveIt.jsx"],
    questions: [
      "Why do I have to show my working?",
      "Do I have to write out my steps?",
      "What happens when I get a question wrong?",
    ],
    keywords: [
      "show your work",
      "show my work",
      "show working",
      "working box",
      "write my steps",
      "my working",
      "steps",
      "how to solve",
      "step by step",
      "wrong answer",
      "wrong answers",
      "question wrong",
      "answer wrong",
      "answers wrong",
      "correct answer",
      "get it wrong",
      "got it wrong",
      "explanation",
      "solutions",
    ],
    answer:
      `On every answer in ${GUIDE_SHOW_WORK_SUBJECTS.join(" and ")} you write your working in ` +
      `a box next to the question, so the answer proves you solved it rather than guessed or ` +
      `copied.\n\n` +
      `Get one wrong and you are shown the correct answer with the full step-by-step method, ` +
      `plus a "Practice a similar question" button to try the same skill again. In the timed ` +
      `mock exam the method is shown in the review afterwards, never while the clock runs.`,
  },
  {
    id: "how-to-buy",
    title: "How to buy",
    sources: ["src/pages/PricingPage.jsx", "src/pages/TermsPage.jsx"],
    questions: [
      "How do I buy a subject?",
      "How do I unlock the full course?",
      "How do I pay?",
    ],
    keywords: [
      "how do i buy",
      "how to buy",
      "unlock",
      "purchase",
      "buy the",
      "payment",
      "pay for",
      "pay by",
      "card",
      "checkout",
      "get access",
      "sign up and pay",
    ],
    answer:
      `Open the Pricing page, choose the subject (or the bundle, or a school licence) and you ` +
      `are sent to our payment provider, Stripe, to pay by card.\n\n` +
      `You need to be signed in first — if you are not, the Pricing page sends you to sign in ` +
      `and then on to checkout. As soon as the payment is confirmed the subject unlocks on ` +
      `your account. We never see or store your card details; Stripe handles the payment and ` +
      `emails your receipt.`,
  },
  {
    id: "refunds",
    title: "Refunds",
    sources: ["src/pages/TermsPage.jsx", "src/data/legal.js"],
    questions: [
      "Can I get a refund?",
      "What is your refund policy?",
      "Can I cancel a purchase?",
    ],
    keywords: [
      "refund",
      "refunds",
      "money back",
      "cancel",
      "cancellation",
      "return my money",
      "chargeback",
      "guarantee",
    ],
    answer:
      `Refunds are handled through the same purchase record Stripe created for the payment — ` +
      `the receipt Stripe emailed you identifies it.\n\n` +
      `Write to ${SUPPORT_EMAIL} with the payment details and we will sort it out. The ` +
      `details are in our Terms of Service (see the Terms link in the footer): one year of ` +
      `access from purchase, and nothing renews by itself.`,
  },
  {
    id: "contact",
    title: "Reaching a person",
    sources: ["src/data/contact.js", "src/data/legal.js", "src/pages/ContactPage.jsx"],
    questions: [
      "How do I contact you?",
      "How do I get support?",
      "Can I speak to someone?",
    ],
    keywords: [
      "contact",
      "support",
      "email you",
      "email us",
      "reach you",
      "speak to",
      "talk to someone",
      "customer service",
      "human",
      "reply",
    ],
    answer:
      `The Contact form on this site is the way to reach the team, and it also works as a ` +
      `plain email: write to ${SUPPORT_EMAIL}.\n\n` +
      `Tell us your name, an address we can reply to, a subject line and your message, and we ` +
      `usually answer within ${CONTACT_RESPONSE_WINDOW}. If the form is ever unavailable the ` +
      `page says so honestly rather than pretending the message went through, and points you ` +
      `at the address above.`,
  },
  {
    id: "account",
    title: "Accounts and signing in",
    sources: ["src/App.jsx", "src/pages/AuthPage.jsx", "src/pages/SignupPage.jsx"],
    questions: [
      "How do I create an account?",
      "I cannot sign in — what do I do?",
      "How do I reset my password?",
    ],
    keywords: [
      "create an account",
      "sign up",
      "signup",
      "sign in",
      "signin",
      "log in",
      "login",
      "password",
      "forgot",
      "reset",
      "my account",
      "register",
    ],
    answer:
      `Creating an account is free: sign up with an email address and a password, and use ` +
      `Sign In to come back to it. You need an account to open even the free preview lessons ` +
      `and to keep your progress.\n\n` +
      `Forgotten password? Use the "Forgot password" link on the sign-in page and we email ` +
      `you a reset link. If that does not arrive, check your spam folder and then write to ` +
      `${SUPPORT_EMAIL} — do not create a second account, because purchases and progress ` +
      `belong to the first one.`,
  },
  {
    id: "privacy",
    title: "Your data and privacy",
    sources: ["src/data/legal.js", "src/pages/PrivacyPage.jsx"],
    questions: [
      "What do you do with my data?",
      "Where can I read your privacy policy?",
      "How do I delete my data?",
    ],
    keywords: [
      "privacy",
      "my data",
      "personal data",
      "personal information",
      "my information",
      "data deletion",
      "delete data",
      "data request",
      "gdpr",
      "data protection",
      "delete my data",
      "delete my account",
      "store my",
      "share my",
      "policy",
    ],
    answer:
      `The Privacy Policy explains what we collect (your email, your study activity, the ` +
      `purchase record — never your card details), why, and your rights under the Jamaica ` +
      `Data Protection Act, 2020.\n\n` +
      `We do not sell your data. For a request to see, correct or delete your information, ` +
      `write to ${PRIVACY_CONTACT_EMAIL} — that is the address reserved for data requests ` +
      `(day-to-day support goes to ${SUPPORT_EMAIL}).`,
  },
  {
    id: "independence",
    title: "CSEC and CXC",
    sources: ["src/data/legal.js"],
    questions: [
      "Are you affiliated with CXC?",
      "Is this an official CSEC site?",
    ],
    keywords: [
      "cxc",
      "affiliated",
      "endorsed",
      "official",
      "trademark",
      "caribbean examinations council",
      "is this official",
    ],
    answer:
      `${TRADEMARK_DISCLAIMER}\n\n` +
      `The lessons, practice questions and marked solutions here are written by us for ` +
      `practice — they are not past papers and not official exam material.`,
  },
  {
    id: "teachers-parents",
    title: "Teachers and parents",
    sources: ["src/App.jsx", "src/pages/TeacherPage.jsx", "src/pages/ParentPage.jsx"],
    questions: [
      "Can my teacher see my progress?",
      "Is there a parent dashboard?",
      "How does the teacher dashboard work?",
    ],
    keywords: [
      "teacher",
      "teachers",
      "my parent",
      "my child",
      "parent",
      "parents",
      "dashboard",
      "monitor progress",
      "class progress",
      "see my progress",
      "link a student",
    ],
    answer:
      `There is a dashboard for teachers and one for parents, both showing the same picture of ` +
      `a student's work (lessons ticked, knowledge checks done, quiz results).\n\n` +
      `A teacher sees the students linked to them — from a school roster or linked by email — ` +
      `and a parent sees the child they linked when they bought. Nothing is shared with ` +
      `anyone else: a dashboard account only ever sees the students attached to it.`,
  },
  {
    id: "planner",
    title: "Revision planner",
    sources: ["src/App.jsx", "src/data/planner.js"],
    questions: [
      "Is there a study planner?",
      "How do I plan my revision?",
    ],
    keywords: ["planner", "plan my revision", "study plan", "revision plan", "schedule"],
    answer:
      `Yes — the Planner lays out what to revise and when, across the subjects you are taking, ` +
      `so you are not deciding what to study every time you sit down.`,
  },
  // Last on purpose. This is the catch-all for a vague money question ("what is
  // the price?", "how much?"), and its keywords are deliberately weak single
  // words so a specific topic — "bundle", "one subject", "school" — always wins
  // the tie. Listed last, it also loses any remaining tie.
  {
    id: "pricing-overview",
    title: "Prices at a glance",
    sources: ["src/data/pricingSubjects.js"],
    questions: ["What are your prices?", "How much does it cost?"],
    keywords: ["price", "prices", "pricing", "cost", "costs", "expensive", "afford", "fees", "charges"],
    answer:
      `Prices are simple, and everything lasts a year:\n\n` +
      `• One subject — ${usd(SUBJECT_PRICE)}\n` +
      `• All ${GUIDE_SUBJECT_COUNT} subjects — ${usd(BUNDLE_PRICE)} (saving ` +
      `${usd(GUIDE_BUNDLE_SAVING_USD)} against buying them one at a time)\n` +
      SCHOOL_LICENSES.map(
        (tier) =>
          `• Up to ${tier.seats} students — ${usdGrouped(tier.price)} a year for a school`
      ).join("\n") +
      `\n\nThe first ${FREE_PREVIEW_LESSONS} lessons of every subject are free to try. Ask me ` +
      `about any of these and I will give you the detail.`,
  },
];

// What to show when the guide has not been taught the answer. It never guesses:
// the honest move is to say so and hand the person to a human.
export const GUIDE_FALLBACK =
  `I am only a guide — I know what is written on this site (prices, subjects, the free ` +
  `preview, access, refunds, accounts and how to reach us), and I do not have an answer for ` +
  `that.\n\n` +
  `Please ask a person through the Contact form instead, or email ${SUPPORT_EMAIL} — you will ` +
  `get a real reply within ${CONTACT_RESPONSE_WINDOW}.`;

export const GUIDE_INTRO =
  `Hi! I am the Compass Guide. I answer questions about CSEC Compass — prices, subjects, the ` +
  `free preview, how long access lasts, refunds and how to reach the team. Pick one of the ` +
  `questions below or type your own.`;

// The chips offered in the panel. One question per topic, in this order, so the
// first thing a buyer sees is the thing most people ask about.
const SUGGESTED_TOPIC_IDS = [
  "pricing-single",
  "pricing-bundle",
  "free-preview",
  "subjects",
  "school-license",
  "contact",
];

export const GUIDE_SUGGESTED_QUESTIONS = SUGGESTED_TOPIC_IDS.map((id) => {
  const topic = GUIDE_TOPICS.find((t) => t.id === id);
  return topic ? { topicId: topic.id, text: topic.questions[0] } : null;
}).filter(Boolean);

// --- matching (deterministic, no model) ------------------------------------
// Lowercase, drop the punctuation that only gets in the way, keep $ . % digits
// so "$9.99" survives as a keyword.
export function normalizeGuideText(input) {
  return String(input == null ? "" : input)
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[^a-z0-9$%.']+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// A single word must sit on its own word boundary ("free" must not match
// "freedom" or "carefree"); a phrase is matched as a substring of the
// normalised text. Multi-word phrases score by length so "all subjects" beats a
// bare "subjects" when someone asks about the bundle.
function keywordScore(needle, text) {
  if (needle.includes(" ")) {
    return text.includes(needle) ? needle.split(" ").length + 2 : 0;
  }
  return new RegExp(`(^| )${escapeRe(needle)}( |$)`).test(text) ? 1 : 0;
}

// The score a topic earns for an input, plus which phrases matched (kept so the
// harness can explain a result rather than just assert one).
export function scoreGuideTopic(topic, input) {
  const text = normalizeGuideText(input);
  const phrases = [];
  let score = 0;
  if (!text) return { score: 0, phrases };
  for (const question of topic.questions) {
    if (normalizeGuideText(question) === text) {
      // Typing (or clicking) one of our own questions is an exact hit.
      score += 100;
      phrases.push(question);
    }
  }
  for (const keyword of topic.keywords) {
    const needle = normalizeGuideText(keyword);
    if (!needle) continue;
    const points = keywordScore(needle, text);
    if (points > 0) {
      score += points;
      phrases.push(keyword);
    }
  }
  return { score, phrases };
}

// The one thing a keyword list cannot carry: the 23 subject names. Rather than
// repeat them as keywords, a mention of a subject name (or of its distinctive
// last word — "biology", "accounts", "chemistry") boosts the subjects topic, so
// "do you have biology?" lands. The boost is deliberately small: any specific
// phrase from another topic still outranks it.
const SUBJECT_TOKEN_STOPLIST = new Set(["option", "and", "of"]);

export function subjectMentionedIn(input) {
  const text = normalizeGuideText(input);
  if (!text) return null;
  for (const subject of FALLBACK_SUBJECT_OPTIONS) {
    const name = normalizeGuideText(subject.name);
    if (!name) continue;
    const tokens = name.split(" ");
    const last = tokens[tokens.length - 1];
    const needles = [name];
    if (last.length >= 4 && !SUBJECT_TOKEN_STOPLIST.has(last)) needles.push(last);
    if (needles.some((n) => new RegExp(`(^| )${escapeRe(n)}( |$)`).test(text))) {
      return subject.name;
    }
  }
  return null;
}

// The whole matcher. Returns the best topic only if something actually matched;
// otherwise `matched: false` and the caller answers with GUIDE_FALLBACK. Ties go
// to the topic listed first, so the order of GUIDE_TOPICS is the tie-breaker.
export function matchGuideTopic(input) {
  const text = normalizeGuideText(input);
  if (!text) return { matched: false, topicId: null, score: 0, phrases: [] };
  const namedSubject = subjectMentionedIn(text);
  let best = null;
  for (const topic of GUIDE_TOPICS) {
    const scored = scoreGuideTopic(topic, input);
    let { score, phrases } = scored;
    if (namedSubject && topic.id === "subjects") {
      score += 3;
      phrases = phrases.concat([`subject: ${namedSubject}`]);
    }
    if (score > 0 && (!best || score > best.score)) {
      best = { matched: true, topicId: topic.id, score, phrases };
    }
  }
  return best || { matched: false, topicId: null, score: 0, phrases: [] };
}

// What the UI renders for one question. `text` is always safe to show: either a
// curated answer or the honest fallback.
export function guideReply(input) {
  const match = matchGuideTopic(input);
  if (!match.matched) {
    return { matched: false, topicId: null, title: null, text: GUIDE_FALLBACK };
  }
  const topic = GUIDE_TOPICS.find((t) => t.id === match.topicId);
  return {
    matched: true,
    topicId: topic.id,
    title: topic.title,
    text: topic.answer,
    sources: topic.sources,
  };
}

// Every curated question, with the topic it belongs to. Used by the UI chips and
// by the harness ("every curated question routes to its own topic").
export const GUIDE_CURATED_QUESTIONS = GUIDE_TOPICS.flatMap((topic) =>
  topic.questions.map((q) => ({ topicId: topic.id, text: q }))
);
