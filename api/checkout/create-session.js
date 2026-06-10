// POST /api/checkout/create-session
// Creates a Stripe Checkout Session for per-subject or bundle purchase
import { getStripe } from "../_lib/stripe";

const PRICES = {
  subject: { id: "price_subject", name: "Per Subject", amount: 999 },   // $9.99
  bundle: { id: "price_bundle", name: "All Subjects Bundle", amount: 4999 }, // $49.99
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
    const price = PRICES[priceType];
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [{
        price_data: {
          currency: "usd",
          product_data: {
            name: priceType === "bundle" ? "All Subjects Bundle" : `CSEC ${subjectId || "Subject"}`,
            description: priceType === "bundle"
              ? "Full access to ALL CSEC subjects"
              : `Full access to ${subjectId || "selected subject"}`,
          },
          unit_amount: price.amount,
        },
        quantity: 1,
      }],
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