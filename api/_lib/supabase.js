// Server-side Supabase admin client for Vercel API functions
// Uses SUPABASE_SERVICE_ROLE_KEY env var for admin access
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let cachedClient = null;

export function getSupabaseAdmin() {
  if (cachedClient) return cachedClient;
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Supabase server credentials not configured. Set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  }
  cachedClient = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cachedClient;
}

export default getSupabaseAdmin;