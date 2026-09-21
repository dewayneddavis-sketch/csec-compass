// ESM loader hook for tools/check-school-onboarding.mjs: routes BOTH
// `@supabase/supabase-js` and `stripe` to local test doubles, so the real
// checkout, webhook and admin handlers run offline in one process.
//
// Same trick as tools/grants-loader.mjs, but pointed at teacher-stub.mjs: the
// webhook's school provisioning upserts (on conflict name), which grants-stub
// does not implement, and teacher-stub's richer doubles (upsert, staged errors)
// are what this harness needs.
export async function resolve(specifier, context, nextResolve) {
  if (specifier === "@supabase/supabase-js") {
    return { url: new URL("./teacher-stub.mjs", import.meta.url).href, shortCircuit: true };
  }
  if (specifier === "stripe") {
    return { url: new URL("./stripe-stub.mjs", import.meta.url).href, shortCircuit: true };
  }
  return nextResolve(specifier, context);
}
