// ESM loader hook: swaps @supabase/supabase-js for the local test double so the
// real api/analytics/record.js handler can be driven without a network or a live
// database. Registered by tools/check-show-your-work.mjs.
export async function resolve(specifier, context, nextResolve) {
  if (specifier === "@supabase/supabase-js") {
    return {
      url: new URL("./supabase-stub.mjs", import.meta.url).href,
      shortCircuit: true,
    };
  }
  return nextResolve(specifier, context);
}
