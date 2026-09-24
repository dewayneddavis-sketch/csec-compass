// Vercel Serverless API — the consolidated student state sync route.
//
// WHY THIS FILE EXISTS
//
// /api/progress/sync (a student's lesson/quiz progress → user_progress) and
// /api/planner/sync (the revision planner load/save/reset) used to be two
// Serverless Functions. Vercel Hobby allows 12 per deployment, and the
// teacher↔student chat needed one of them, so the two handler bodies now live in
// api/_lib/ (which Vercel does not count) and this single NON-DYNAMIC file serves
// both — exactly the consolidation api/auth.js performed for /api/auth/me +
// /api/auth/user (PR #85). Neither handler was rewritten in the move: every
// status code and error string a caller depends on is unchanged.
//
// vercel.json keeps both original URLs working (the browser still calls them):
//   /api/progress/sync → /api/sync?module=progress
//   /api/planner/sync  → /api/sync?module=planner
// Both rules sit before the /api/(.*) passthrough and the SPA fallback, because
// Vercel takes the first match — and tools/check-api-functions.mjs guards that
// ordering. Note the destination uses `module`, NOT `action`: the planner
// already uses ?action=load on its own URL, so a param that could collide with
// the caller's own query string would be a trap.
//
// The module is resolved from the routed query param AND from the request path,
// so the route does not depend on how (or whether) Vercel forwards the query
// string through the rewrite. An unknown module answers JSON 404 — never the
// app's HTML, which is what a missing route under api/ used to produce.
import progressSync from "./_lib/sync-progress.js";
import plannerSync from "./_lib/sync-planner.js";

const MODULES = { progress: progressSync, planner: plannerSync };

function firstValue(value) {
  return Array.isArray(value) ? value[0] : value;
}

export function resolveModule(req) {
  const fromQuery = firstValue(req && req.query && req.query.module);
  if (typeof fromQuery === "string" && Object.prototype.hasOwnProperty.call(MODULES, fromQuery)) {
    return fromQuery;
  }
  const raw = String((req && req.url) || "");
  if (/(^|\/)api\/progress\/sync([/?#]|$)/.test(raw)) return "progress";
  if (/(^|\/)api\/planner\/sync([/?#]|$)/.test(raw)) return "planner";
  return null;
}

export default async function handler(req, res) {
  const name = resolveModule(req);
  if (!name) return res.status(404).json({ error: "Not found" });
  return MODULES[name](req, res);
}
