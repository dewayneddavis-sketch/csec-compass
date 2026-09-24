// /api/auth — the two auth lookups this repo has always served, in ONE
// Serverless Function reached through a rewrite.
//
//   GET  /api/auth/me     — current user from the session token (id, email,
//                           created_at). Reads SUPABASE_URL || VITE_SUPABASE_URL.
//   GET  /api/auth/user   — current user from the session token (id, email).
//   POST /api/auth/user   — create a user (admin, email pre-confirmed).
//
// WHY THIS FILE IS AT api/auth.js AND NOT api/auth/[action].js (regression
// found live 2026-09-24)
//
// Two forces met here. Vercel rejects a deployment that carries more than 12
// Serverless Functions in api/ (the contact route made it 13 and the whole
// deployment failed), so the two auth files had to be consolidated. The first
// attempt consolidated them into api/auth/[action].js, assuming a bracketed
// filename would behave like a dynamic route — that is a **Next.js** feature.
// This project is a plain Vite app, so Vercel treated "[action]" as a literal
// path segment: /api/auth/me matched nothing, fell through to the SPA rewrite
// and answered index.html instead of the JSON 401 the old route returned. The
// endpoints silently regressed from functions to HTML.
//
// The fix is a NON-DYNAMIC filename routed by vercel.json:
//   { "source": "/api/auth/:action", "destination": "/api/auth" }
// Vercel turns a named source segment into a query parameter on the destination
// (their docs' own example: /resize/:width/:height → /api/sharp becomes
// /api/sharp?width=800&height=600), so /api/auth/me arrives here as
// /api/auth?action=me and this file's action switch answers it. No dynamic
// segment, nothing for the filesystem router to misread.
//
// Every branch below is the ORIGINAL body of the file it replaces, moved
// verbatim — including which env var each one reads and the exact error
// strings, so callers cannot tell the difference. tools/check-api-functions.mjs
// drives both paths (both the way the rewrite delivers them and the bare URL
// form) and asserts those responses, asserts the rewrite exists in vercel.json,
// and fails the build if api/ ever goes back over the 12-function cap or grows
// a bracketed filename again.
import { createClient } from "@supabase/supabase-js";

// Which lookup was asked for. Vercel's rewrite delivers it as ?action=me / user
// (its named-segment convention); the request URL is also accepted so the
// behaviour does not depend on how the param arrives — the value is a switch
// key, never anything that reaches a client or a query.
function actionOf(req) {
  const q = req?.query?.action;
  if (Array.isArray(q) && q.length) return String(q[0]);
  if (typeof q === "string" && q) return q;
  const m = /\/api\/auth\/([^/?#]+)/.exec(String(req?.url || ""));
  return m ? m[1] : "";
}

// --- GET /api/auth/me (was api/auth/me.js) ---------------------------------
async function handleMe(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: "No authorization header", user: null });
    }
    const token = authHeader.replace("Bearer ", "");
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error(
        "Supabase server credentials not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
      );
    }
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);
    if (error || !user) {
      return res.status(401).json({ error: "Invalid or expired token", user: null });
    }
    return res.status(200).json({
      user: {
        id: user.id,
        email: user.email,
        created_at: user.created_at,
      },
    });
  } catch (err) {
    console.error("Auth me error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// --- GET|POST /api/auth/user (was api/auth/user.js) ------------------------
async function handleUser(req, res) {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: "Supabase not configured" });
  }
  const supabase = createClient(supabaseUrl, supabaseKey);
  if (req.method === "GET") {
    // Get user from auth header
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: "No auth header" });
    }
    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);
    if (error || !user) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }
    return res.status(200).json({ user: { id: user.id, email: user.email } });
  }
  if (req.method === "POST") {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password required" });
    }
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (error) return res.status(400).json({ error: error.message });
    return res.status(201).json({ user: { id: data.user.id, email: data.user.email } });
  }
  return res.status(405).json({ error: "Method not allowed" });
}

export default async function handler(req, res) {
  const action = actionOf(req);
  if (action === "me") return handleMe(req, res);
  if (action === "user") return handleUser(req, res);
  // A path under /api/auth/ that was never a route. Answered as JSON rather
  // than the app's HTML fallback, so a typo is visible instead of looking like
  // a page. (The vercel.json rewrite catches every /api/auth/:action, so this
  // is what an unknown segment gets.)
  return res.status(404).json({ error: "Not found" });
}
