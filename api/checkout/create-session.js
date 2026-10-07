// POST /api/checkout/create-session
// Creates a Stripe Checkout Session for a per-subject, bundle, or
// school-license (3-tier ladder) purchase.
// NOTE: self-contained (inlines Stripe client init) — api/_lib/* imports crash
// on Vercel with FUNCTION_INVOCATION_FAILED, so every function keeps its
// own client init. See api/auth/user.js (same pattern, works live).
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

function getStripe() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    console.warn("Stripe secret key not configured. Set STRIPE_SECRET_KEY env var.");
    return null;
  }
  return new Stripe(secretKey, { apiVersion: "2025-02-24.acacia" });
}

// School License ladder (owner decision 2026-09-13). One-year licences,
// all 10 CSEC subjects; larger cohorts buy a second licence or get a
// custom quote. purchase_type / price_type is the tier, so a school can
// buy the same tier twice (two 50-seat licences) — the webhook dedupes on
// the Stripe session id for licences, not on the tier.
const SCHOOL_LICENSES = {
  "school-license-50": {
    seats: 50,
    price: 1250,
    priceId: process.env.STRIPE_PRICE_SCHOOL_50 || "price_1UGTwiDDZe1Ivigk2DfmWUci",
  },
  "school-license-100": {
    seats: 100,
    price: 2000,
    priceId: process.env.STRIPE_PRICE_SCHOOL_100 || "price_1UGTwiDDZe1IvigkKGuEVQ5u",
  },
  "school-license-150": {
    seats: 150,
    price: 2250,
    priceId: process.env.STRIPE_PRICE_SCHOOL_150 || "price_1UFIuWDDZe1IvigkurygSgT9",
  },
};

// Price IDs are env-driven so a live/test switchover (owner sets
// STRIPE_PRICE_SUBJECT / STRIPE_PRICE_BUNDLE / STRIPE_PRICE_SCHOOL_* in
// Vercel) needs no code deploy. Subject/bundle fallbacks are the current
// test-mode IDs; the school-license fallbacks are the live ladder, which is
// already live in Stripe.
const PRICE_IDS = {
  subject: process.env.STRIPE_PRICE_SUBJECT || "price_1Tgqa4BMfL7i0JlrJuGSfD3E",
  bundle: process.env.STRIPE_PRICE_BUNDLE || "price_1TgqfGBMfL7i0JlrqzpZgtJU",
  ...Object.fromEntries(
    Object.entries(SCHOOL_LICENSES).map(([type, tier]) => [type, tier.priceId])
  ),
};

const PRICE_TYPES = ["subject", "bundle", ...Object.keys(SCHOOL_LICENSES)];

// The self-identified buyer role (owner addition 2026-09-26): "I am a…" —
// teacher / student / parent. MIRROR of src/data/buyerRoles.js (api/*.js files
// are self-contained by design and cannot import from src/); the harness asserts
// the two lists are equal, so a role cannot be added in one place only.
const BUYER_ROLE_IDS = ["teacher", "student", "parent"];

// A school licence is bought BY the school, which names itself and the person
// who will run its console (owner direction 2026-09-20: "whichever school buys
// the licence, at that time that school will select its own school admin").
// Both values ride along in the checkout metadata; api/stripe/webhook.js is the
// other half of this contract and reads exactly these two keys to provision
// public.schools / school_admins / school_members after payment.
const MAX_SCHOOL_NAME = 120;
// Deliberately strict, and the same rule as api/admin/grant-access.js (each
// api/*.js file is self-contained, so the pattern is repeated rather than
// imported). A malformed address must never become a school's admin.
const EMAIL_RE = /^[a-z0-9._%+-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)+$/;

function cleanSchoolName(value) {
  return String(value ?? "").trim().replace(/\s+/g, " ");
}

function cleanEmail(value) {
  return String(value ?? "").trim().toLowerCase();
}

// The receipt address (owner decision 2026-10-07): Stripe emails its automatic
// receipt to the address on the Checkout Session, so the session pins the
// address of the ACCOUNT THAT IS PAYING. It is read server-side from the
// authenticated user record — never from the request body, which anyone can
// type into. That record IS the verified address: Supabase hands out a session
// for an email signup only once that address is confirmed (when confirmation is
// enabled) and an OAuth address is verified by the provider, so re-checking a
// confirmation flag here would only risk silently dropping a receipt for an
// account whose flag is unset — the exact symptom being fixed.
// Every failure below degrades to the previous behaviour: a session with no
// pinned address still sells, because a receipt must never cost a sale.
const RECEIPT_LOOKUP_TIMEOUT_MS = 3000;

let cachedSupabase = null;
function getSupabaseServer() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  if (!cachedSupabase) {
    cachedSupabase = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return cachedSupabase;
}

// "" means "pin nothing" — no credentials, no user, no email on the account, a
// malformed address, a Supabase error, or a lookup that outlives the budget.
// It never throws, and it never delays the sale by more than the budget.
async function receiptEmailFor(userId) {
  let timer = null;
  try {
    const supabase = getSupabaseServer();
    if (!supabase) return "";
    const lookup = supabase.auth.admin.getUserById(userId);
    // The sale must not wait on Supabase. If the budget wins this race the
    // rejection below is already unobserved, so it is swallowed here rather
    // than surfacing later as an unhandled rejection.
    lookup.catch(() => {});
    const budget = new Promise((resolve) => {
      timer = setTimeout(
        () => resolve({ data: null, error: { message: "receipt lookup timed out" } }),
        RECEIPT_LOOKUP_TIMEOUT_MS
      );
    });
    const { data, error } = await Promise.race([lookup, budget]);
    if (error) {
      console.warn("Receipt email lookup failed — selling without a pinned address:", error.message);
      return "";
    }
    const email = cleanEmail(data?.user?.email);
    if (!email || email.length > 254 || !EMAIL_RE.test(email)) return "";
    return email;
  } catch (err) {
    console.warn("Receipt email lookup threw — selling without a pinned address:", err?.message || err);
    return "";
  } finally {
    // The lookup usually wins; this keeps an abandoned budget from lingering.
    if (timer) clearTimeout(timer);
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { priceType, subjectId, successUrl, cancelUrl, userId, schoolName, adminEmail, childEmail, buyerRole } = req.body || {};
  if (!priceType || !PRICE_TYPES.includes(priceType)) {
    return res.status(400).json({
      error: "Invalid priceType. Use 'subject', 'bundle' or a school-license tier (" +
        Object.keys(SCHOOL_LICENSES).join(", ") + ").",
    });
  }
  if (!userId) {
    return res.status(400).json({ error: "Missing userId. Sign in before purchasing." });
  }

  // Only a school licence carries a school: a subject or bundle purchase must
  // keep working exactly as before, whatever else the body contains.
  const license = SCHOOL_LICENSES[priceType];
  let school = null;
  if (license) {
    const name = cleanSchoolName(schoolName);
    const admin = cleanEmail(adminEmail);
    if (!name) {
      return res.status(400).json({
        error: "Enter your school's name — the licence and its console are registered to that school.",
      });
    }
    if (name.length > MAX_SCHOOL_NAME) {
      return res.status(400).json({
        error: `School name is too long (max ${MAX_SCHOOL_NAME} characters).`,
      });
    }
    if (!admin || admin.length > 254 || !EMAIL_RE.test(admin)) {
      return res.status(400).json({
        error:
          "Enter the email of the person who will run your school's account (for example principal@school.edu.jm).",
      });
    }
    school = { name, adminEmail: admin };
  }

  // Parent -> child link (owner decision 2026-09-22): a parent buying a SINGLE
  // SUBJECT or the BUNDLE may name their child's email so the purchase also
  // links that child to their parent dashboard. It travels in the checkout
  // metadata and api/stripe/webhook.js writes the link after payment — the link
  // is created at purchase and nowhere else, which is what makes it need no
  // approval and no admin.
  //
  // A school licence never carries one (the licence is not a family purchase),
  // and a malformed address is REFUSED rather than quietly dropped: this is the
  // parent's only chance to make the link, so a typo must be visible here.
  let child = "";
  if (priceType === "subject" || priceType === "bundle") {
    const wanted = cleanEmail(childEmail);
    if (wanted) {
      if (wanted.length > 254 || !EMAIL_RE.test(wanted)) {
        return res.status(400).json({
          error:
            "That child's email doesn't look right. Check it, or clear the field to buy without linking a child.",
        });
      }
      child = wanted;
    }
  }

  // Who the buyer says they are. It rides in the metadata so api/stripe/webhook.js
  // can record it on the grant after a VERIFIED payment — which is what later
  // lets a teacher who bought on their own link students, with no school and no
  // admin in the middle. A school licence never carries it (there the school is
  // the buyer), and an unrecognised value is REFUSED rather than dropped: the
  // answer is the whole point of asking, and guessing would mislabel the account.
  let role = "";
  if (priceType === "subject" || priceType === "bundle") {
    const wanted = String(buyerRole ?? "").trim().toLowerCase();
    if (wanted && !BUYER_ROLE_IDS.includes(wanted)) {
      return res.status(400).json({
        error: "Tell us who this purchase is for — teacher, student or parent.",
      });
    }
    role = wanted;
  }

  const stripe = getStripe();
  if (!stripe) return res.status(500).json({ error: "Stripe not configured" });

  // Who the receipt is addressed to. Looked up here — after every validation
  // above, so a rejected request never costs a Supabase round-trip, and before
  // the session exists, so the address is on the session from the start.
  const receiptEmail = await receiptEmailFor(userId);

  try {
    const priceId = PRICE_IDS[priceType];
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "payment",
      client_reference_id: userId,
      // Stripe emails the automatic receipt to this address. The key is omitted
      // entirely when the lookup gave us nothing, which is exactly the previous
      // behaviour (the buyer types their address into Checkout and that one is
      // used), so nothing here can block or alter a sale.
      ...(receiptEmail ? { customer_email: receiptEmail } : {}),
      success_url: successUrl || "https://csec-compass.vercel.app/account",
      cancel_url: cancelUrl || "https://csec-compass.vercel.app/pricing",
      metadata: {
        price_type: priceType,
        subject_id: subjectId || "",
        // Seats for a school-license tier ("" for subject/bundle) so the
        // webhook row is self-describing even if the tier list changes.
        seats: license ? String(license.seats) : "",
        // Which school bought this licence, and who runs its console. Always
        // present (empty for subject/bundle — Stripe metadata values are
        // strings) so the webhook can tell "no school named" from "key missing".
        school_name: school ? school.name : "",
        admin_email: school ? school.adminEmail : "",
        // The child this purchase is for, if the buyer named one ("" for
        // school-licence tiers and for a buyer who left the field empty).
        // Always present so the webhook can tell "no child named" from "key
        // missing". api/stripe/webhook.js reads exactly this key.
        child_email: child,
        // Who the buyer says they are, if they answered ("" for a school-licence
        // tier and for a buyer who somehow skipped the question). Always present
        // so the webhook can tell "not answered" from "key missing".
        // api/stripe/webhook.js reads exactly this key and records it on the
        // grant row, which is what the teacher gate later reads.
        buyer_role: role,
      },
    });

    res.status(200).json({ url: session.url, sessionId: session.id });
  } catch (err) {
    console.error("Checkout error:", err);
    res.status(500).json({ error: err.message });
  }
}
