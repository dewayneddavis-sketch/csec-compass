// /api/auth/* — the two auth lookups this repo has always served, in ONE
// Serverless Function.
//
//   GET  /api/auth/me     — current user from the session token (id, email,
//                           created_at). Reads SUPABASE_URL || VITE_SUPABASE_URL.
//   GET  /api/auth/user   — current user from the session token (id, email).
//   POST /api/auth/user   — create a user (admin, email pre-confirmed).
//
// WHY THESE TWO SHARE A FILE (2026-09-23): Vercel rejects a deployment that
// carries more than 12 Serverless Functions, and api/ was at 12. Adding the
// contact route took it to 13 and the whole deployment failed — the site kept
// serving the previous build, so /api/contact did not exist in production.
// Consolidating the two smallest, most similar functions back into one
// dynamic-segment file brings api/ to 12 again without dropping a URL:
// api/auth/me.js and api/auth/user.js are gone, and both paths now land here
// (Vercel maps the path segment to req.query.action).
//
// Every branch below is the ORIGINAL body of the file it replaces, moved
// verbatim — including which env var each one reads and the exact error
// strings, so callers cannot tell the difference. tools/check-api-functions.mjs
// drives both paths and asserts those responses, and fails the build if api/
// ever goes back over the 12-function cap.
import { createClient } from "@supabase/supabase-js";

// The path segment Vercel hands us for a dynamic file. Falls back to the
// request URL so the behaviour does not depend on how the param is delivered.
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
  // a page.
  return res.status(404).json({ error: "Not found" });
}
