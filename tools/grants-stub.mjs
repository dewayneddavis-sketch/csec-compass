// Test double for @supabase/supabase-js, used by tools/check-admin-grants.mjs via
// tools/grants-loader.mjs.
//
// Unlike the other doubles in this folder, this one knows which COLUMNS each fake
// table has, so a query that names a column the "live" table does not have fails
// the way PostgREST fails. That is what lets the harness reproduce the owner's
// live error offline:
//   column purchases.stripe_session_id does not exist        (on a read)
//   Could not find the 'stripe_session_id' column of ...     (on a write)
// Set a table's columns with setTable(name, rows, columns); leave them out and the
// double stays permissive (no column checking) for older harnesses.

export const state = {
  user: { id: "owner-1", email: "dewayneddavis@gmail.com" },
  authError: null,
  users: [],
  listUsersError: null,
  tableRows: {},
  tableColumns: {},
  selectErrors: {},
  statements: [], // every statement the handlers issued, for inspection
  inserts: [],
  deletes: [],
};

export function reset() {
  state.user = { id: "owner-1", email: "dewayneddavis@gmail.com" };
  state.authError = null;
  state.users = [];
  state.listUsersError = null;
  state.tableRows = {};
  state.tableColumns = {};
  state.selectErrors = {};
  state.statements = [];
  state.inserts = [];
  state.deletes = [];
}

export function setTable(name, rows, columns) {
  state.tableRows[name] = (rows || []).map((r) => ({ ...r }));
  if (columns) state.tableColumns[name] = [...columns];
}

export function rows(name) {
  return state.tableRows[name] || [];
}

export function columnsOf(name) {
  return state.tableColumns[name] ? [...state.tableColumns[name]] : null;
}

// The owner's live table: created before supabase/schema.sql grew the column, so
// there is no stripe_session_id to read or write.
export const PURCHASES_LEGACY_COLUMNS = ["id", "user_id", "subject_id", "purchase_type", "created_at"];
// A fresh install from supabase/schema.sql.
export const PURCHASES_MODERN_COLUMNS = [
  "id",
  "user_id",
  "subject_id",
  "purchase_type",
  "stripe_session_id",
  "created_at",
];

export function setPurchases(purchases, { modern = false, columns } = {}) {
  setTable("purchases", purchases, columns || (modern ? PURCHASES_MODERN_COLUMNS : PURCHASES_LEGACY_COLUMNS));
}

function readError(table, column) {
  return { code: "42703", message: `column ${table}.${column} does not exist` };
}

function writeError(table, column) {
  return { code: "PGRST204", message: `Could not find the '${column}' column of '${table}' in the schema cache` };
}

function matches(row, filters) {
  return filters.every(([column, value, isIn]) => (isIn ? value.includes(row[column]) : row[column] === value));
}

function project(row, projection) {
  if (!projection || projection === "*") return { ...row };
  const out = {};
  for (const column of projection.split(",").map((c) => c.trim()).filter(Boolean)) {
    if (Object.prototype.hasOwnProperty.call(row, column)) out[column] = row[column];
  }
  return out;
}

export function createClient() {
  return {
    auth: {
      getUser: async () =>
        state.authError
          ? { data: { user: null }, error: state.authError }
          : { data: { user: state.user }, error: null },
      admin: {
        // Same pagination contract as supabase-js: a page smaller than perPage
        // means the end of the list.
        listUsers: async ({ page = 1, perPage = 50 } = {}) => {
          if (state.listUsersError) return { data: null, error: state.listUsersError };
          const start = (page - 1) * perPage;
          return { data: { users: state.users.slice(start, start + perPage) }, error: null };
        },
      },
    },
    from(table) {
      const query = { table, op: "select", projection: null, filters: [], payload: null };
      const columns = () => (state.tableColumns[table] ? [...state.tableColumns[table]] : null);
      let running = null;

      const run = () => {
        if (running) return running;
        running = (async () => {
          state.statements.push({
            table,
            op: query.op,
            projection: query.projection,
            filters: query.filters.map((f) => [...f]),
            columns: columns(),
          });

          if (state.selectErrors[table]) return { data: null, error: state.selectErrors[table] };

          const known = columns();

          // A named projection, a filter, or an insert key that names a column the
          // live table does not have is exactly what PostgREST rejects.
          if (known && query.op === "select" && query.projection && query.projection !== "*") {
            for (const column of query.projection.split(",").map((c) => c.trim()).filter(Boolean)) {
              if (!known.includes(column)) return { data: null, error: readError(table, column) };
            }
          }
          if (known) {
            for (const [column] of query.filters) {
              if (!known.includes(column)) return { data: null, error: readError(table, column) };
            }
          }

          if (query.op === "insert") {
            const incoming = Array.isArray(query.payload) ? query.payload : [query.payload];
            state.inserts.push({ table, rows: incoming });
            if (known) {
              for (const row of incoming) {
                for (const key of Object.keys(row)) {
                  if (!known.includes(key)) return { data: null, error: writeError(table, key) };
                }
              }
            }
            const next = [...(state.tableRows[table] || [])];
            for (const row of incoming) {
              const stamped = { id: `row-${next.length + 1}`, ...row };
              if (!known || known.includes("created_at")) stamped.created_at = "2026-09-18T00:00:00Z";
              next.push(stamped);
            }
            state.tableRows[table] = next;
            return { data: incoming, error: null };
          }

          if (query.op === "delete") {
            state.deletes.push({ table, filters: query.filters.map((f) => [...f]) });
            const all = state.tableRows[table] || [];
            state.tableRows[table] = all.filter((row) => !matches(row, query.filters));
            return { data: all.filter((row) => matches(row, query.filters)), error: null };
          }

          const allRows = state.tableRows[table] || [];
          const found = allRows.filter((row) => matches(row, query.filters));
          return { data: found.map((row) => project(row, query.projection)), error: null };
        })();
        return running;
      };

      const builder = {
        select(projection = "*") {
          if (query.op !== "insert") {
            query.op = "select";
            query.projection = projection;
          }
          return builder;
        },
        insert(payload) {
          query.op = "insert";
          query.payload = payload;
          return builder;
        },
        delete() {
          query.op = "delete";
          return builder;
        },
        eq(column, value) {
          query.filters.push([column, value, false]);
          return builder;
        },
        in(column, value) {
          query.filters.push([column, value, true]);
          return builder;
        },
        order() {
          return builder;
        },
        limit() {
          return builder;
        },
        maybeSingle: async () => {
          const result = await run();
          if (result.error) return result;
          return { data: result.data && result.data.length ? result.data[0] : null, error: null };
        },
        single: async () => {
          const result = await run();
          if (result.error) return result;
          return { data: result.data && result.data.length ? result.data[0] : null, error: null };
        },
        then(onFulfilled, onRejected) {
          return run().then(onFulfilled, onRejected);
        },
      };
      return builder;
    },
  };
}
