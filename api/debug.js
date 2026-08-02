// GET /api/debug — minimal diagnostic endpoint
export default async function handler(req, res) {
  try {
    // Check env vars without importing supabase
    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || null;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || null;
    
    res.status(200).json({ 
      ok: true,
      hasSupabaseUrl: !!url,
      hasServiceKey: !!key,
      nodeVersion: process.version,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
