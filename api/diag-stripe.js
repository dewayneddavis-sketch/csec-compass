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
    res.status(200).json({
      keyConfigured: true,
      keySuffix: secretKey.slice(-4),
      keyMode: secretKey.startsWith("sk_live_") ? "live" : "test",
      priceCount: rows.length,
      prices: rows,
    });
  } catch (err) {
    res.status(500).json({ error: err.message, keySuffix: secretKey.slice(-4) });
  }
}