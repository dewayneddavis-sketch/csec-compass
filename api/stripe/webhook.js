// POST /api/stripe/webhook
// Handles checkout.session.completed — upserts purchase into Supabase
import { getSupabaseAdmin } from "../_lib/supabase";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const sig = req.headers["stripe-signature"];
  if (!sig) return res.status(400).json({ error: "No signature" });

  let event;
  try {
    const stripe = (await import("../_lib/stripe")).getStripe();
    if (!stripe) return res.status(500).json({ error: "Stripe not configured" });

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) return res.status(500).json({ error: "Webhook secret not configured" });

    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    return res.status(400).json({ error: "Webhook signature verification failed" });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const { price_type, subject_id } = session.metadata || {};

    try {
      const supabase = getSupabaseAdmin();

      if (price_type === "bundle") {
        // Grant access to all subjects
        const { error } = await supabase.from("purchases").insert({
          user_id: session.client_reference_id || session.id,
          subject_id: null,
          purchase_type: "bundle",
        });
        if (error) console.error("Insert bundle error:", error);
      } else if (price_type === "subject" && subject_id) {
        const { error } = await supabase.from("purchases").upsert({
          user_id: session.client_reference_id || session.id,
          subject_id,
          purchase_type: "subject",
        }, { onConflict: "user_id,subject_id" });
        if (error) console.error("Insert subject purchase error:", error);
      }

      res.status(200).json({ received: true });
    } catch (err) {
      console.error("Webhook processing error:", err);
      res.status(500).json({ error: err.message });
    }
  } else {
    res.status(200).json({ received: true });
  }
}