// ESM loader hook: swaps @supabase/supabase-js for the local test double so the
// real API handlers run offline in tools/check-teacher-dashboard.mjs.
export async function resolve(specifier, context, next) {
  if (specifier === "@supabase/supabase-js") {
    return next(new URL("./teacher-stub.mjs", import.meta.url).href, context);
  }
  return next(specifier, context);
}
