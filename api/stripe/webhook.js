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

// ---------------------------------------------------------------------------
// School self-service (owner direction 2026-09-20)
//
// The school names itself and its own admin on the Pricing page; those two
// values ride in the checkout metadata (api/checkout/create-session.js) and the
// school is provisioned HERE, on the payment that created it — no owner in the
// loop. Idempotent by construction, because Stripe re-delivers events:
//   * the school NAME is the identity (a unique index on public.schools.name),
//     so replaying a purchase cannot create a second school;
//   * a second licence bought by the same school attaches its admin to the
//     school that already exists.
//
// ONE ADMIN = ONE SCHOOL. If the admin email already runs another school the
// purchase is still granted and the school is still recorded, but the admin row
// is left exactly where it was: a school cannot take over someone else's console
// by typing their address at checkout. The owner can correct it from the admin
// card, which is the global oversight view.
// ---------------------------------------------------------------------------
const MAX_SCHOOL_NAME = 120;
// Same rule as api/checkout/create-session.js and api/admin/grant-access.js.
const EMAIL_RE = /^[a-z0-9._%+-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)+$/;
// Seats per tier, used only when a session's metadata carries no usable `seats`
// (an owner-issued payment link, or the pre-ladder single 'school-license').
const SEATS_BY_TIER = { "school-license-50": 50, "school-license-100": 100, "school-license-150": 150 };

function cleanSchoolName(value) {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
}

function cleanEmail(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

// The schools table with its licence columns, falling back to the original
// shape: a database that predates them (see supabase/schema.sql) still
// provisions and lists schools — only the licence shown on the owner's card is
// unknown ("—"). Same column-tolerance as insertPurchaseRow above.
async function loadSchoolRows(supabase) {
  const projected = await supabase.from("schools").select("id,name,license_tier,seats").limit(500);
  if (!projected.error || !isUnknownColumnError(projected.error)) return projected;
  console.warn(
    "schools table has no license_tier/seats columns — provisioning the school without its licence details. Apply supabase/schema.sql."
  );
  return await supabase.from("schools").select("id,name").limit(500);
}

async function provisionSchool(supabase, { rawName, rawAdminEmail, tier, seats, sessionId }) {
  const name = cleanSchoolName(rawName);
  const adminEmail = cleanEmail(rawAdminEmail);
  // An owner-issued payment link (or a pre-self-service checkout) carries no
  // school, and that is not an error: the licence is granted, there is simply
  // nothing to provision. Never a 4xx/5xx here — Stripe would retry forever.
  if (!name) return { status: "skipped", reason: "no school_name metadata" };
  if (name.length > MAX_SCHOOL_NAME) return { status: "invalid", reason: "school name is too long" };
  if (!adminEmail || adminEmail.length > 254 || !EMAIL_RE.test(adminEmail)) {
    return { status: "invalid", reason: "admin email is not a valid address" };
  }

  const { data: schoolRows, error: listError } = await loadSchoolRows(supabase);
  if (listError) return { status: "error", reason: listError.message };

  // Case- and spacing-insensitive, like the owner's own "create school" action:
  // "Wolmer's Boys' School" and "wolmer's boys' school" are one school.
  const existing = (schoolRows || []).find(
    (row) => cleanSchoolName(row.name).toLowerCase() === name.toLowerCase()
  ) || null;

  // The licence recorded on the school is the LARGEST it holds: a school that
  // bought 50 seats and later 150 has 150 seats' worth of students to account
  // for on the owner's card.
  const knownSeats = Number(existing?.seats) || 0;
  const bigger = Number.isFinite(seats) && seats > knownSeats;
  const recordLicense = !!tier && (bigger || (!existing?.license_tier && !knownSeats));
  const schoolName = existing ? existing.name : name;
  const payload = {
    name: schoolName,
    ...(recordLicense ? { license_tier: tier, seats: Number.isFinite(seats) ? seats : null } : {}),
  };

  let { error: writeError } = await supabase.from("schools").upsert([payload], { onConflict: "name" });
  if (writeError && recordLicense && isUnknownColumnError(writeError)) {
    ({ error: writeError } = await supabase.from("schools").upsert([{ name: schoolName }], { onConflict: "name" }));
  }
  if (writeError) return { status: "error", reason: writeError.message };

  // Re-read: the id is the database's to assign, never the upsert's echo.
  const { data: school } = await supabase
    .from("schools")
    .select("id,name")
    .eq("name", schoolName)
    .maybeSingle();
  const schoolId = school?.id || existing?.id;
  if (!schoolId) return { status: "error", reason: "the school row could not be read back" };

  const licence = recordLicense ? { tier, seats: Number.isFinite(seats) ? seats : null } : null;
  const base = { schoolId, schoolName, adminEmail, license: licence, sessionId };

  const { data: adminRows, error: adminLookupError } = await supabase
    .from("school_admins")
    .select("school_id,email")
    .eq("email", adminEmail)
    .limit(5);
  if (adminLookupError) return { status: "error", ...base, reason: adminLookupError.message };

  const alreadyAdminHere = (adminRows || []).some((row) => row.school_id === schoolId);
  const boundElsewhere = (adminRows || []).some((row) => row.school_id !== schoolId);
  if (boundElsewhere && !alreadyAdminHere) {
    // Fail closed on the ADMIN only: the licence and the school stand.
    console.error(
      "Webhook: school provisioned without its admin — that email already runs a different school",
      { sessionId, school: schoolName, email: adminEmail }
    );
    return { status: "admin-conflict", ...base, adminAttached: false };
  }

  if (!alreadyAdminHere) {
    const { error: adminError } = await supabase
      .from("school_admins")
      .insert([{ school_id: schoolId, email: adminEmail }]);
    // A racing second delivery can lose this insert to the unique index on the
    // email; that is already the state we wanted, so it is not a failure.
    if (adminError && !/duplicate|unique/i.test(String(adminError.message || ""))) {
      return { status: "error", ...base, reason: adminError.message };
    }
  }

  // Also on the roster as a teacher, so the school's own console reads work from
  // the first sign-in (the owner's card does the same for a school it creates).
  const { data: memberRows, error: memberLookupError } = await supabase
    .from("school_members")
    .select("id,school_id,email")
    .eq("school_id", schoolId)
    .eq("email", adminEmail)
    .limit(1);
  if (memberLookupError) return { status: "error", ...base, reason: memberLookupError.message };

  if (!(memberRows || []).length) {
    const { error: memberError } = await supabase
      .from("school_members")
      .insert([{ school_id: schoolId, email: adminEmail, role: "teacher" }]);
    if (memberError && !/duplicate|unique/i.test(String(memberError.message || ""))) {
      return { status: "error", ...base, reason: memberError.message };
    }
  }

  return { status: "provisioned", ...base, adminAttached: true };
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
      // Reported back on every 200 from this event, so the outcome of the school
      // self-service provisioning is visible in the Stripe delivery log.
      let schoolProvisioning = null;

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

        // Provision the school named at checkout BEFORE the grant is recorded.
        // That order matters: a re-delivered event returns early below
        // (alreadyGranted), so provisioning must run on every delivery to be able
        // to finish one that failed the first time. It is idempotent, and a
        // problem here NEVER costs the buyer their licence.
        if (isSchoolLicense) {
          const metadataSeats = Number.parseInt(session.metadata?.seats ?? "", 10);
          const seats =
            Number.isFinite(metadataSeats) && metadataSeats > 0
              ? metadataSeats
              : SEATS_BY_TIER[price_type] || null;
          try {
            schoolProvisioning = await provisionSchool(supabase, {
              rawName: session.metadata?.school_name,
              rawAdminEmail: session.metadata?.admin_email,
              tier: price_type,
              seats,
              sessionId: session.id,
            });
          } catch (err) {
            console.error("Webhook: school provisioning threw (the licence is still granted):", err);
            schoolProvisioning = { status: "error", reason: err.message };
          }
          if (schoolProvisioning.status === "skipped") {
            console.warn(
              "Webhook: school not provisioned — no school_name metadata on the session",
              session.id
            );
          } else if (schoolProvisioning.status === "invalid") {
            console.error("Webhook: school not provisioned — unusable school_name/admin_email metadata", {
              sessionId: session.id,
              reason: schoolProvisioning.reason,
            });
          }
        }
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
          // A re-delivery: the grant is already recorded, but the provisioning
          // above still ran (it is idempotent) and is reported back so the
          // outcome is visible in the Stripe delivery log.
          return res.status(200).json({
            received: true,
            alreadyGranted: true,
            ...(schoolProvisioning ? { school: schoolProvisioning } : {}),
          });
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

      res.status(200).json({
        received: true,
        ...(schoolProvisioning ? { school: schoolProvisioning } : {}),
      });
    } catch (err) {
      console.error("Webhook processing error:", err);
      res.status(500).json({ error: err.message });
    }
  } else {
    res.status(200).json({ received: true });
  }
}
