// Server-side Supabase admin client for Vercel API functions
// Uses createRequire to work around Vercel ESM bundling issues
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let cachedClient = null;

export function getSupabaseAdmin() {
  if (cachedClient) return cachedClient;
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Supabase server credentials not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  }
  cachedClient = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cachedClient;
}

export default getSupabaseAdmin;
