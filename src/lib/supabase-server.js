import { createClient } from "@supabase/supabase-js";

// Server-side Supabase client (uses service role key for admin operations)
// This file is imported by Vercel API functions only (server-side)
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let serverClient = null;

export function getServerSupabaseClient() {
  if (serverClient) return serverClient;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.warn("Supabase server credentials not configured");
    return null;
  }

  serverClient = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return serverClient;
}

export default getServerSupabaseClient;