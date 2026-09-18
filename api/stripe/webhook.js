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

// Did PostgREST reject this because a column supabase/schema.sql declares is
// missing from the live table? 42703 = undefined_column; PGRST204 = unknown
// column in the schema cache (what an insert returns). The code is the reliable
// signal — the message text differs between a read and a write.
function isUnknownColumnError(err) {
  if (!err) return false;
  if (err.code === "42703" || err.code === "PGRST204") return true;
  const msg = String(err.message || "");
  return /column .* does not exist/i.test(msg) || /Could not find the '.*' column/i.test(msg);
}

// Record a grant. `stripe_session_id` is written whenever the live table has it
// (it is what dedupes a re-delivered school-license event); on a table that
// predates that column — the owner's, until supabase/schema.sql is applied — the
// row is recorded WITHOUT it instead of the sale failing with a 500. An audit
// column must never be the reason a paying customer gets no access.
async function insertPurchaseRow(supabase, payload) {
  const first = await supabase.from("purchases").insert(payload);
  if (!first.error || !isUnknownColumnError(first.error)) return first;
  if (!Object.prototype.hasOwnProperty.call(payload, "stripe_session_id")) return first;
  console.warn(
    "purchases table has no stripe_session_id column — recording the grant without it. Apply supabase/schema.sql to add the column."
  );
  const withoutSession = { ...payload };
  delete withoutSession.stripe_session_id;
  return await supabase.from("purchases").insert(withoutSession);
}

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

    // School License tiers are 'school-license-50' | '-100' | '-150'
    // (see api/checkout/create-session.js + the Pricing page ladder). Strict
    // allowlist on purpose: any other value is refused below rather than
    // granted full access. A bare 'school-license' row from the pre-ladder
    // single-tier build is still honoured.
    const SCHOOL_LICENSE_TIERS = ["school-license", "school-license-50", "school-license-100", "school-license-150"];
    const isSchoolLicense = SCHOOL_LICENSE_TIERS.includes(price_type);

    try {
      const supabase = getSupabaseAdmin();

      if (price_type === "bundle" || isSchoolLicense) {
        // FULL-ACCESS GRANT. The bundle covers every subject for the buyer; a
        // school license does the same for the buying account (the school's
        // contact can verify the platform) — per-student seats are granted by
        // the owner via api/admin/grant-access.js.
        //
        // Idempotency differs per product, on purpose:
        //   bundle         -> one per user, so dedupe on (user, purchase_type)
        //   school license -> a school may legitimately buy the SAME tier twice
        //                     (two 50-seat licenses for a 75-student cohort),
        //                     so dedupe on the Stripe session id, which is all
        //                     that a duplicate webhook delivery repeats.
        let { data: existing, error: lookupErr } = isSchoolLicense
          ? await supabase.from("purchases").select("id").eq("stripe_session_id", session.id).limit(1)
          : await supabase.from("purchases").select("id").eq("user_id", userId).eq("purchase_type", "bundle").limit(1);
        // Without a session column the session-id lookup cannot run at all, so
        // dedupe the school license on (account, tier) instead: a re-delivered
        // event still cannot double-grant. The one case that fallback cannot tell
        // apart is a school legitimately buying the same tier twice — on such a
        // table the owner grants the second license by hand.
        if (lookupErr && isSchoolLicense && isUnknownColumnError(lookupErr)) {
          console.warn(
            "purchases table has no stripe_session_id column — deduping the school license on (account, tier) instead."
          );
          ({ data: existing, error: lookupErr } = await supabase
            .from("purchases")
            .select("id")
            .eq("user_id", userId)
            .eq("purchase_type", price_type)
            .limit(1));
        }
        if (lookupErr) {
          console.error("Full-access lookup error (" + price_type + "):", lookupErr);
          return res.status(500).json({ error: "Failed to check purchase: " + lookupErr.message });
        }
        if (existing && existing.length > 0) {
          return res.status(200).json({ received: true, alreadyGranted: true });
        }
        const { error } = await insertPurchaseRow(supabase, {
          user_id: userId,
          subject_id: null,
          // Stores 'bundle' or the exact license tier ('school-license-150'),
          // so the sold tier stays visible in api/purchases/list.js.
          purchase_type: isSchoolLicense ? price_type : "bundle",
          stripe_session_id: session.id,
        });
        if (error) {
          console.error("Insert full-access error (" + price_type + "):", error);
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
        const { error } = await insertPurchaseRow(supabase, {
          user_id: userId,
          subject_id,
          purchase_type: subject_id,
          stripe_session_id: session.id,
        });
        if (error) {
          console.error("Insert subject purchase error:", error);
          return res.status(500).json({ error: "Failed to record purchase: " + error.message });
        }
      } else {
        console.error("Webhook: unknown price_type/metadata on session", {
          sessionId: session.id,
          client_reference_id: userId,
          metadata: session.metadata,
        });
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
