// Test double for @supabase/supabase-js used by tools/check-teacher-dashboard.mjs
// via tools/teacher-loader.mjs. Keeps a tiny in-memory table store plus
// configurable errors, so the real API handlers can be exercised offline and the
// harness can assert exactly what they read and wrote.

export const state = {
  user: { id: "student-1", email: "student1@school.edu" },
  authError: null,
  users: [], // auth.admin.listUsers() results
  listUsersError: null,
  tables: {}, // table name -> rows[]
  selectErrors: {}, // table name -> error thrown on select
  writeErrors: {}, // table name -> error thrown on insert/upsert
  inserts: [],
  upserts: [],
  deletes: [],
  selects: [],
};

export function reset() {
  state.user = { id: "student-1", email: "student1@school.edu" };
  state.authError = null;
  state.users = [];
  state.listUsersError = null;
  state.tables = {};
  state.selectErrors = {};
  state.writeErrors = {};
  state.inserts = [];
  state.upserts = [];
  state.deletes = [];
  state.selects = [];
}

export function setTable(name, rows) {
  state.tables[name] = rows.map((r) => ({ ...r }));
}

export function rows(name) {
  return state.tables[name] || [];
}

function matches(row, filters) {
  return filters.every(([column, value, isIn]) =>
    isIn ? value.includes(row[column]) : row[column] === value
  );
}

export function createClient() {
  return {
    auth: {
      getUser: async () =>
        state.authError
          ? { data: { user: null }, error: state.authError }
          : { data: { user: state.user }, error: null },
      admin: {
        listUsers: async () =>
          state.listUsersError
            ? { data: null, error: state.listUsersError }
            : { data: { users: state.users }, error: null },
      },
    },
    from(table) {
      const filters = [];
      let op = "select";
      let payload = null;
      let conflict = null;
      let ignoreDuplicates = false;

      const run = () => {
        const tableRows = state.tables[table] || [];

        if (op === "delete") {
          state.deletes.push({ table, filters });
          const kept = tableRows.filter((r) => !matches(r, filters));
          const removed = tableRows.filter((r) => matches(r, filters));
          state.tables[table] = kept;
          return { data: removed, error: state.writeErrors[table] || null };
        }

        if (op === "insert" || op === "upsert") {
          const incoming = Array.isArray(payload) ? payload : [payload];
          if (op === "insert") state.inserts.push({ table, rows: incoming });
          else state.upserts.push({ table, rows: incoming, conflict, ignoreDuplicates });
          const error = state.writeErrors[table] || null;
          if (error) return { data: null, error };
          const keyFields = conflict ? conflict.split(",") : null;
          const next = [...tableRows];
          for (const row of incoming) {
            const stamped = { id: `row-${next.length + 1}`, created_at: "2026-09-18T00:00:00Z", ...row };
            const idx = keyFields
              ? next.findIndex((r) => keyFields.every((k) => r[k] === stamped[k]))
              : -1;
            // ignoreDuplicates mirrors Postgres `ON CONFLICT … DO NOTHING`:
            // the stored row wins and the incoming one is dropped.
            if (idx >= 0) {
              if (!ignoreDuplicates) next[idx] = { ...next[idx], ...stamped };
            } else next.push(stamped);
          }
          state.tables[table] = next;
          return { data: incoming, error: null };
        }

        const error = state.selectErrors[table] || null;
        state.selects.push({ table, filters: filters.map((f) => [...f]) });
        if (error) return { data: null, error };
        return { data: tableRows.filter((r) => matches(r, filters)), error: null };
      };

      const builder = {
        select() {
          return builder;
        },
        eq(column, value) {
          filters.push([column, value, false]);
          return builder;
        },
        in(column, value) {
          filters.push([column, value, true]);
          return builder;
        },
        order() {
          return builder;
        },
        limit() {
          return builder;
        },
        insert(nextPayload) {
          op = "insert";
          payload = nextPayload;
          return builder;
        },
        upsert(nextPayload, options) {
          op = "upsert";
          payload = nextPayload;
          conflict = options?.onConflict || null;
          ignoreDuplicates = !!options?.ignoreDuplicates;
          return builder;
        },
        delete() {
          op = "delete";
          return builder;
        },
        async maybeSingle() {
          const { data, error } = run();
          return { data: Array.isArray(data) ? data[0] ?? null : data, error };
        },
        async single() {
          const { data, error } = run();
          return { data: Array.isArray(data) ? data[0] ?? null : data, error };
        },
        then(resolve, reject) {
          return Promise.resolve(run()).then(resolve, reject);
        },
      };
      return builder;
    },
  };
}
