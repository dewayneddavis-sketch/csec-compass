// LIVE, read-only probe of the real Supabase project's purchases table.
//   node tools/live-buyer-role-probe.mjs [path/to/.env]
//
// It answers one question the owner asked: has `purchases.buyer_role` (the column
// PR #98's teacher-buyer gate reads) been applied to the live database?
//
// HOW IT CAN TELL WITH ONLY THE PUBLIC KEY (no service key needed)
// PostgREST resolves the columns named in `select=` while planning the request,
// BEFORE it checks table privileges. So the live project answers:
//   * a column that does not exist  → 400 / 42703 "column purchases.x does not exist"
//   * a column that exists          → column resolution passes, and the request
//                                     then dies on the (deliberately absent) anon
//                                     GRANT with 401 / 42501 "permission denied"
// The two are distinguishable, and the CONTROL column below is what proves it:
// if the probe could not produce a 42703 it would prove nothing.
//
// WHAT THIS CANNOT SEE: indexes. PostgREST exposes no index metadata, and the
// team has no service-role key or Postgres connection string, so
// purchases_user_buyer_role_idx cannot be confirmed from here — only reported as
// unverified. (An index affects speed, not correctness: PR #98's gate can only
// ever fail closed.)
import { readFileSync } from "node:fs";

const envPath = process.argv[2] || "/home/team/shared/csec-compass/.env";
const env = {};
try {
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line);
    if (match) env[match[1]] = match[2].replace(/^["']|["']$/g, "");
  }
} catch {
  /* fall through to process.env below */
}
const url = (env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "").replace(/\/$/, "");
const key = env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "";
if (!url || !key) {
  console.error(`No VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY in ${envPath} or the environment.`);
  process.exit(2);
}

async function probe(query) {
  const res = await fetch(`${url}/rest/v1/purchases?${query}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}`, Accept: "application/json" },
  });
  const text = await res.text();
  let code = null;
  let message = text.slice(0, 200);
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) message = `${parsed.length} row(s) visible`;
    else {
      code = parsed && parsed.code;
      message = (parsed && parsed.message) || message;
    }
  } catch {
    /* keep the raw text */
  }
  return { status: res.status, code, message };
}

console.log(`project: ${url.replace(/^https:\/\/([^.]+).*$/, "https://$1.supabase.co")}`);
console.log(`key: public (anon/publishable) — read-only, no writes\n`);

const column = await probe("select=user_id,buyer_role&limit=1");
const control = await probe("select=user_id,csec_compass_no_such_column&limit=1");

const columnExists = control.code === "42703" && column.code !== "42703";
console.log(`select=buyer_role            → ${column.status} ${column.code || ""} ${column.message}`);
console.log(`select=<control column>      → ${control.status} ${control.code || ""} ${control.message}`);
console.log(`\nprobe is not vacuous (control is refused as unknown): ${control.code === "42703"}`);
console.log(`purchases.buyer_role EXISTS on the live project:      ${columnExists}`);
console.log("index purchases_user_buyer_role_idx:                  NOT verifiable from outside the database");
process.exit(columnExists ? 0 : 1);
