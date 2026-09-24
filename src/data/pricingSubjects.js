// Pricing catalog + the per-subject purchase helpers.
//
// WHY THIS FILE EXISTS (owner decision 2026-09-18). The Pricing page used to keep
// its own hardcoded 10-subject dropdown. When the owner decided that EVERY subject
// is purchasable individually at the same $9.99 as the existing singles — French
// and every newer subject included, no longer bundle-only — that invented list
// became a silent gate: 13 of the 23 subjects in content/subjects.json could not
// be selected at all, so a student who clicked "Unlock full access" on (say) a
// French lesson landed on /pricing and could not buy French. Nothing errored; the
// dropdown was just short.
//
// So the dropdown is now DERIVED from content/subjects.json — the single source of
// truth for the catalog (see tools/check-subject-catalog.mjs) — and this module
// owns the small amount of pure logic that entails so it can be tested without a
// browser (tools/check-subject-pricing.mjs).
//
// Stripe needs no per-subject product for this: one generic "Single Subject
// Access" price ($9.99, api/checkout/create-session.js PRICE_IDS.subject) backs
// every subject, and api/stripe/webhook.js grants whatever subject id arrives in
// the session metadata.
//
// FALLBACK_SUBJECT_OPTIONS still lists all 23 on purpose: if the catalog fetch
// fails the dropdown must not come up empty, and the harness asserts this list is
// exactly the catalog (same ids, same names, same order) so it cannot drift either.

// Display-only amounts (the live amounts come from Stripe: see
// api/checkout/create-session.js PRICE_IDS / SCHOOL_LICENSES).
export const SUBJECT_PRICE = 9.99;
export const BUNDLE_PRICE = 49.99;

// Alphabetical by display name; ids must match content/subjects.json.
export const FALLBACK_SUBJECT_OPTIONS = [
  { id: "agriculture-double-option", name: "Agriculture (Double Option)" },
  { id: "biology", name: "Biology" },
  { id: "caribbean-history", name: "Caribbean History" },
  { id: "chemistry", name: "Chemistry" },
  { id: "clothing-textile-and-fashion", name: "Clothing, Textile and Fashion" },
  { id: "edpm", name: "EDPM" },
  { id: "english-a", name: "English A" },
  { id: "english-b", name: "English B" },
  { id: "food-and-nutrition", name: "Food and Nutrition" },
  { id: "french", name: "French" },
  { id: "human-social-biology", name: "Human & Social Biology" },
  { id: "information-technology", name: "Information Technology" },
  { id: "integrated-science", name: "Integrated Science" },
  { id: "mathematics", name: "Mathematics" },
  { id: "physical-education", name: "Physical Education" },
  { id: "physics", name: "Physics" },
  { id: "principles-of-accounts", name: "Principles of Accounts" },
  { id: "principles-of-business", name: "Principles of Business" },
  { id: "social-studies", name: "Social Studies" },
  { id: "spanish", name: "Spanish" },
  { id: "technical-drawing", name: "Technical Drawing" },
  { id: "theater-arts", name: "Theater Arts" },
  { id: "visual-arts", name: "Visual Arts" },
];

// The dropdown order is always this one, so the static fallback and the fetched
// catalog render identically (no reshuffle when the fetch lands).
export function sortSubjectOptions(options) {
  return [...options].sort((a, b) => a.name.localeCompare(b.name, "en"));
}

// Catalog JSON -> dropdown options. Anything malformed falls back to the static
// list rather than rendering a partial or empty subject list on a sales page.
export function buildSubjectOptions(catalog) {
  if (!Array.isArray(catalog)) return FALLBACK_SUBJECT_OPTIONS;
  const options = catalog
    .filter(
      (s) =>
        s &&
        typeof s.id === "string" &&
        s.id.trim() &&
        typeof s.name === "string" &&
        s.name.trim()
    )
    .map((s) => ({ id: s.id, name: s.name }));
  return options.length > 0 ? sortSubjectOptions(options) : FALLBACK_SUBJECT_OPTIONS;
}

// /pricing?subject=<id> (every paywall link in the app: locked lessons, the
// preview banner, the subject page's "Purchase to access") preselects that
// subject. An id the dropdown does not know resolves to "" — the page then shows
// the neutral "choose the subject you want" hint instead of the
// "Please select a subject first" error, which is about the buyer forgetting to
// pick, not about a stale link. Never preselect an unknown id either: buying it
// would charge the card and grant a subject that does not exist.
export function resolvePreselectedSubject(raw, options) {
  if (typeof raw !== "string") return "";
  const wanted = raw.trim();
  if (!wanted) return "";
  return (Array.isArray(options) ? options : []).some((o) => o.id === wanted) ? wanted : "";
}

// Honest bundle arithmetic, computed from the number of purchasable subjects
// instead of a number written down once ("save 50% vs 10 subjects" stopped being
// true the moment the 11th subject shipped). Rounds DOWN, so the claim shown is
// never an overstatement.
export function bundleSavingsPct(subjectCount) {
  const n = Number(subjectCount);
  if (!Number.isFinite(n) || n <= 0) return null;
  const separateTotal = n * SUBJECT_PRICE;
  if (separateTotal <= BUNDLE_PRICE) return null;
  return Math.floor((1 - BUNDLE_PRICE / separateTotal) * 100);
}

export function bundleSavingsLabel(subjectCount) {
  const pct = bundleSavingsPct(subjectCount);
  // No saving to claim -> claim nothing.
  return pct === null
    ? "Every CSEC subject in one payment"
    : `Save ${pct}% vs buying every subject separately`;
}

// School licence ladder (owner decision 2026-09-13): one-year licences,
// seats × per-student rate — 50×$25, 100×$20, 150×$15. The amounts here are the
// DISPLAY values; the Stripe price ids are owned by
// api/checkout/create-session.js (SCHOOL_LICENSES there), and priceType is the
// key the two must agree on.
//
// These tiers used to live inside src/pages/PricingPage.jsx, which meant the only
// way to read them was to parse a .jsx file — impossible from a Node harness, and
// impossible from the Compass Guide's fact table, which would have had to carry a
// second copy of every amount. So they moved HERE: the Pricing page renders this
// array, src/data/guideFacts.js quotes it, and tools/check-guide-bot.mjs asserts
// the guide's school answer matches it tier for tier.
export const SCHOOL_LICENSES = [
  { priceType: "school-license-50", seats: 50, price: 1250, perStudent: 25 },
  { priceType: "school-license-100", seats: 100, price: 2000, perStudent: 20 },
  { priceType: "school-license-150", seats: 150, price: 2250, perStudent: 15 },
];
