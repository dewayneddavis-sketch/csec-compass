// TEMPORARY diagnostic — GET /api/diag-stripe
// Lists prices visible to the deployed STRIPE_SECRET_KEY so we can see
// which account the key belongs to and what price IDs it holds.
// REMOVE AFTER SELL-READINESS TEST COMPLETES.
import Stripe from "stripe";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  const secretKey = process.env.STRIPE_SECRET_KEY || "";
  if (!secretKey) {
    return res.status(200).json({ keyConfigured: false, prices: [] });
  }
  const stripe = new Stripe(secretKey, { apiVersion: "2025-02-24.acacia" });
  try {
    const prices = await stripe.prices.list({ limit: 25 });
    const rows = [];
    for (const p of prices.data) {
      let productName = "";
      try {
        const prod = await stripe.products.retrieve(p.product);
        productName = prod.name;
      } catch (e) { productName = "(fetch failed)"; }
      rows.push({
        id: p.id,
        amount: p.unit_amount,
        currency: p.currency,
        productName,
        active: p.active,
      });
    }
    const s = {
      keyConfigured: true,
      keySuffix: secretKey.slice(-4),
      keyMode: secretKey.startsWith("sk_live_") ? "live" : "test",
      priceCount: rows.length,
      prices: rows,
    };
// --- sessions listing appended ---
  try {
    const sessions = await stripe.checkout.sessions.list({ limit: 5 });
    s.sessions = sessions.data.map((x) => ({
      id: x.id,
      status: x.payment_status,
      amount: x.amount_total,
      clientRef: x.client_reference_id,
      email: x.customer_details ? x.customer_details.email : null,
      created: new Date(x.created * 1000).toISOString(),
    }));
  } catch (e) { s.sessionsError = e.message; }
  res.status(200).json(s);

  } catch (err) {
    res.status(500).json({ error: err.message, keySuffix: secretKey.slice(-4) });
  }
}