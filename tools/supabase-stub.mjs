// Test double for @supabase/supabase-js, used by tools/check-show-your-work.mjs
// via tools/mock-loader.mjs. Records inserts so the harness can assert exactly
// what api/analytics/record.js tried to write.
export const state = {
  user: { id: "user-1" },
  authError: null,
  insertError: null,
  missingWorkingColumn: false,
  inserts: [],
};

export function reset() {
  state.user = { id: "user-1" };
  state.authError = null;
  state.insertError = null;
  state.missingWorkingColumn = false;
  state.inserts = [];
}

export function createClient() {
  return {
    auth: {
      getUser: async () =>
        state.authError ? { data: { user: null }, error: state.authError } : { data: { user: state.user }, error: null },
    },
    from(table) {
      return {
        insert(rows) {
          state.inserts.push({ table, rows });
          const hasWorking = rows.some((r) => Object.prototype.hasOwnProperty.call(r, "working"));
          if (state.missingWorkingColumn && hasWorking) {
            return {
              select: async () => ({ data: null, error: { message: "column quiz_results.working does not exist" } }),
            };
          }
          if (state.insertError && (!state.missingWorkingColumn || !hasWorking)) {
            return { select: async () => ({ data: null, error: state.insertError }) };
          }
          return { select: async () => ({ data: rows.map((_, i) => ({ id: `row-${i}` })), error: null }) };
        },
      };
    },
  };
}
