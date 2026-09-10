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
      // Attempt the EXACT insert the webhook performs (bundle for the paid buyer)
      const insertRes = await fetch(`${supabaseUrl}/rest/v1/purchases`, {
        method: "POST",
        headers: { ...h, "Content-Type": "application/json", Prefer: "return=representation" },
        body: JSON.stringify({
          user_id: "0afb59ca-d7a6-48c1-9844-099a6a38d555",
          subject_id: null,
          purchase_type: "bundle",
        }),
      });
      out.webhookInsertTest = { status: insertRes.status, body: (await insertRes.text()).slice(0, 500) };
    } else {
      out.purchasesProbe = { status: "skipped", body: "missing supabase env" };
    }
    res.status(200).json(out);
  } catch (err) {
    res.status(500).json({ error: err.message, stack: String(err.stack).split("\n").slice(0, 3) });
  }
}