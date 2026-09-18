// ESM loader hook for tools/check-admin-grants.mjs: routes both `@supabase/supabase-js`
// and `stripe` to local test doubles, so api/admin/grant-access.js and
// api/stripe/webhook.js run offline against fake tables whose COLUMNS are known.
export async function resolve(specifier, context, nextResolve) {
  if (specifier === "@supabase/supabase-js") {
    return { url: new URL("./grants-stub.mjs", import.meta.url).href, shortCircuit: true };
  }
  if (specifier === "stripe") {
    return { url: new URL("./stripe-stub.mjs", import.meta.url).href, shortCircuit: true };
  }
  return nextResolve(specifier, context);
}
