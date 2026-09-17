// POST /api/checkout/create-session
// Creates a Stripe Checkout Session for per-subject, bundle, or school-license purchase
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

// Price IDs are env-driven so the live switchover (owner sets
// STRIPE_PRICE_SUBJECT / STRIPE_PRICE_BUNDLE / STRIPE_PRICE_SCHOOL in Vercel)
// needs no code deploy. Subject/bundle fallbacks are the current test-mode
// IDs; the school-license fallback is the live ID — the school license product
// (up to 150 students, all 10 subjects, $2,250/yr) is live in Stripe.
const PRICE_IDS = {
  subject: process.env.STRIPE_PRICE_SUBJECT || "price_1Tgqa4BMfL7i0JlrJuGSfD3E",
  bundle: process.env.STRIPE_PRICE_BUNDLE || "price_1TgqfGBMfL7i0JlrqzpZgtJU",
  "school-license": process.env.STRIPE_PRICE_SCHOOL || "price_1UFIuWDDZe1IvigkurygSgT9",
};

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { priceType, subjectId, successUrl, cancelUrl, userId } = req.body || {};
  if (!priceType || !["subject", "bundle", "school-license"].includes(priceType)) {
    return res.status(400).json({ error: "Invalid priceType. Use 'subject', 'bundle' or 'school-license'." });
  }
  if (!userId) {
    return res.status(400).json({ error: "Missing userId. Sign in before purchasing." });
  }

  const stripe = getStripe();
  if (!stripe) return res.status(500).json({ error: "Stripe not configured" });

  try {
    const priceId = PRICE_IDS[priceType];
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
      },
    });

    res.status(200).json({ url: session.url, sessionId: session.id });
  } catch (err) {
    console.error("Checkout error:", err);
    res.status(500).json({ error: err.message });
  }
}