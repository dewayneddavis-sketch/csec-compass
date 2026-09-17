// POST /api/checkout/create-session
// Creates a Stripe Checkout Session for a per-subject, bundle, or
// school-license (3-tier ladder) purchase.
// NOTE: self-contained (inlines Stripe client init) — api/_lib/* imports crash
// on Vercel with FUNCTION_INVOCATION_FAILED, so every function keeps its
// own client init. See api/auth/user.js (same pattern, works live).
import Stripe from "stripe";

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

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { priceType, subjectId, successUrl, cancelUrl, userId } = req.body || {};
  if (!priceType || !PRICE_TYPES.includes(priceType)) {
    return res.status(400).json({
      error: "Invalid priceType. Use 'subject', 'bundle' or a school-license tier (" +
        Object.keys(SCHOOL_LICENSES).join(", ") + ").",
    });
  }
  if (!userId) {
    return res.status(400).json({ error: "Missing userId. Sign in before purchasing." });
  }

  const stripe = getStripe();
  if (!stripe) return res.status(500).json({ error: "Stripe not configured" });

  try {
    const priceId = PRICE_IDS[priceType];
    const license = SCHOOL_LICENSES[priceType];
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "payment",
      client_reference_id: userId,
      success_url: successUrl || "https://csec-compass.vercel.app/account",
      cancel_url: cancelUrl || "https://csec-compass.vercel.app/pricing",
      metadata: {
        price_type: priceType,
        subject_id: subjectId || "",
        // Seats for a school-license tier ("" for subject/bundle) so the
        // webhook row is self-describing even if the tier list changes.
        seats: license ? String(license.seats) : "",
      },
    });

    res.status(200).json({ url: session.url, sessionId: session.id });
  } catch (err) {
    console.error("Checkout error:", err);
    res.status(500).json({ error: err.message });
  }
}
