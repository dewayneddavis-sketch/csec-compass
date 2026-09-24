// ESM loader hook: swaps @supabase/supabase-js for the local test double so the
// real api/messages.js + api/sync.js handlers run offline in
// tools/check-messages.mjs.
export async function resolve(specifier, context, next) {
  if (specifier === "@supabase/supabase-js") {
    return next(new URL("./messages-stub.mjs", import.meta.url).href, context);
  }
  return next(specifier, context);
}
