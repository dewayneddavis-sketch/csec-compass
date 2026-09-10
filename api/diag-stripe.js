// TEMP DIAGNOSTIC — remove before ship. Reports webhook registration,
// recent Stripe events, env presence (booleans only), and whether the
// Supabase `purchases` table is readable by the service role.
import Stripe from "stripe";
export default async function handler(req, res) {
  try {
    const out = {
      env: {
        stripeSecretSet: !!process.env.STRIPE_SECRET_KEY,
        webhookSecretSet: !!process.env.STRIPE_WEBHOOK_SECRET,
        supabaseUrlSet: !!(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL),
        serviceRoleSet: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      },
    };
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2025-02-24.acacia",
    });
    const wh = await stripe.webhookEndpoints.list({ limit: 10 });
    out.webhookEndpoints = wh.data.map((e) => ({
      id: e.id,
      url: e.url,
      status: e.status,
      events: e.enabled_events.slice(0, 6),
    }));
    const evs = await stripe.events.list({ limit: 15 });
    out.events = evs.data.map((e) => {
      const s = e.data?.object || {};
      return {
        type: e.type,
        created: new Date(e.created * 1000).toISOString(),
        sessionId: s.id || null,
        payment_status: s.payment_status || null,
        clientRef: s.client_reference_id || null,
        metadata: s.metadata || null,
      };
    });
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    if (supabaseUrl && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const h = { apikey: process.env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}` };
      const dbRes = await fetch(`${supabaseUrl}/rest/v1/purchases?select=*&limit=5`, { headers: h });
      out.purchasesProbe = { status: dbRes.status, body: (await dbRes.text()).slice(0, 800) };
      const buyerRes = await fetch(
        `${supabaseUrl}/rest/v1/purchases?user_id=eq.0afb59ca-d7a6-48c1-9844-099a6a38d555&select=*`,
        { headers: h }
      );
      out.purchasesForBuyer = { status: buyerRes.status, body: (await buyerRes.text()).slice(0, 500) };
    } else {
      out.purchasesProbe = { status: "skipped", body: "missing supabase env" };
    }
    // SELF-CALL TEST: craft a signed checkout.session.completed with the
    // DEPLOYED webhook secret and POST it to the webhook's own URL. This
    // proves the deployed secret matches the endpoint (200) or not (400).
    try {
      const payload = JSON.stringify({
        id: "evt_selftest_" + Date.now(),
        object: "event",
        api_version: "2025-02-24.acacia",
        created: Math.floor(Date.now() / 1000),
        type: "checkout.session.completed",
        data: {
          object: {
            id: "cs_test_selftest_" + Date.now(),
            object: "checkout.session",
            client_reference_id: "0afb59ca-d7a6-48c1-9844-099a6a38d555",
            metadata: { price_type: "bundle", subject_id: "" },
            payment_status: "paid",
          },
        },
      });
      const signature = stripe.webhooks.generateTestHeaderString({
        payload,
        secret: process.env.STRIPE_WEBHOOK_SECRET,
      });
      const self = await fetch("https://csec-compass.vercel.app/api/stripe/webhook", {
        method: "POST",
        headers: { "content-type": "application/json", "stripe-signature": signature },
        body: payload,
      });
      out.selfWebhookTest = { status: self.status, body: (await self.text()).slice(0, 300) };
    } catch (err) {
      out.selfWebhookTest = { error: err.message };
    }
    res.status(200).json(out);
  } catch (err) {
    res.status(500).json({ error: err.message, stack: String(err.stack).split("\n").slice(0, 3) });
  }
}