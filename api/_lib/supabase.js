// Server-side Supabase admin client for Vercel API functions
// Uses a static ESM import so Vercel's bundler includes the
// @supabase/supabase-js package in the serverless function bundle.
// (A previous createRequire version crashed every importing function
// with FUNCTION_INVOCATION_FAILED on Node 24.)
import { createClient } from "@supabase/supabase-js";

function getConfig() {
  return {
    supabaseUrl: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
    supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  };
}

let cachedClient = null;

export function getSupabaseAdmin() {
  if (cachedClient) return cachedClient;
  const { supabaseUrl, supabaseServiceKey } = getConfig();
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Supabase server credentials not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  }
  cachedClient = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cachedClient;
}

export default getSupabaseAdmin;
