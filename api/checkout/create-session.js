// POST /api/checkout/create-session
// Creates a Stripe Checkout Session for per-subject or bundle purchase
import { getStripe } from "../_lib/stripe";

const PRICE_IDS = {
  subject: "price_1Tgqa4BMfL7i0JlrJuGSfD3E",
  bundle: "price_1TgqfGBMfL7i0JlrqzpZgtJU",
};

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { priceType, subjectId, successUrl, cancelUrl } = req.body;
  if (!priceType || !["subject", "bundle"].includes(priceType)) {
    return res.status(400).json({ error: "Invalid priceType. Use 'subject' or 'bundle'." });
  }

  const stripe = getStripe();
  if (!stripe) return res.status(500).json({ error: "Stripe not configured" });

  try {
    const priceId = PRICE_IDS[priceType];
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "payment",
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