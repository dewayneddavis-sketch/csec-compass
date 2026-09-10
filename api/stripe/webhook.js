// POST /api/stripe/webhook
// Handles checkout.session.completed — upserts purchase into Supabase
// NOTE: self-contained (inlines Stripe + Supabase client init) — api/_lib/*
// imports crash on Vercel with FUNCTION_INVOCATION_FAILED, so this function
// keeps its own client init. See api/auth/user.js (same pattern, works live).
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

function getSupabaseAdmin() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Supabase server credentials not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  }
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// Stripe signature verification needs the raw request body, so disable
// Vercel's default JSON body parsing for this route.
export const config = { api: { bodyParser: false } };

async function readRawBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks);
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const sig = req.headers["stripe-signature"];
  if (!sig) return res.status(400).json({ error: "No signature" });

  let event;
  try {
    const stripe = getStripe();
    if (!stripe) return res.status(500).json({ error: "Stripe not configured" });

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) return res.status(500).json({ error: "Webhook secret not configured" });

    const rawBody = await readRawBody(req);
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    // 500 (not 400) so a dashboard "Send test webhook" distinguishes
    // signature failure (500) from a business-logic skip (200/400).
    console.error("Webhook signature verification failed:", err.message);
    return res.status(500).json({ error: "Webhook signature verification failed" });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const { price_type, subject_id } = session.metadata || {};
    const userId = session.client_reference_id;
    if (!userId) {
      // Real sessions always carry client_reference_id (create-session sets it).
      // Dashboard test events do not — return 200 so the test shows "OK" when
      // the secret is correct, and log loudly if a real event ever misses it.
      console.error("Webhook: missing client_reference_id on checkout session", session.id);
      return res.status(200).json({ received: true, note: "missing client_reference_id", sessionId: session.id });
    }

    try {
      const supabase = getSupabaseAdmin();

      if (price_type === "bundle") {
        // Grant access to all subjects (idempotent: skip if already granted)
        const { data: existing, error: lookupErr } = await supabase
          .from("purchases")
          .select("id")
          .eq("user_id", userId)
          .eq("purchase_type", "bundle")
          .limit(1);
        if (lookupErr) {
          console.error("Bundle lookup error:", lookupErr);
          return res.status(500).json({ error: "Failed to check purchase: " + lookupErr.message });
        }
        if (existing && existing.length > 0) {
          return res.status(200).json({ received: true, alreadyGranted: true });
        }
        const { error } = await supabase.from("purchases").insert({
          user_id: userId,
          subject_id: null,
          purchase_type: "bundle",
        });
        if (error) {
          console.error("Insert bundle error:", error);
          return res.status(500).json({ error: "Failed to record purchase: " + error.message });
        }
      } else if (price_type === "subject" && subject_id) {
        // purchase_type stores the subject id — matches api/purchases/list.js
        // (idempotent: skip if already granted)
        const { data: existing, error: lookupErr } = await supabase
          .from("purchases")
          .select("id")
          .eq("user_id", userId)
          .eq("purchase_type", subject_id)
          .limit(1);
        if (lookupErr) {
          console.error("Subject lookup error:", lookupErr);
          return res.status(500).json({ error: "Failed to check purchase: " + lookupErr.message });
        }
        if (existing && existing.length > 0) {
          return res.status(200).json({ received: true, alreadyGranted: true });
        }
        const { error } = await supabase.from("purchases").insert({
          user_id: userId,
          subject_id,
          purchase_type: subject_id,
        });
        if (error) {
          console.error("Insert subject purchase error:", error);
          return res.status(500).json({ error: "Failed to record purchase: " + error.message });
        }
      } else {
        console.error("Webhook: unknown price_type/metadata on session", session.id, session.metadata);
        return res.status(400).json({ error: "Unknown price_type or missing subject_id" });
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
