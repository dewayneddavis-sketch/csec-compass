// Test double for @supabase/supabase-js, wired in by tools/messages-loader.mjs so
// tools/check-messages.mjs runs the REAL api/messages.js and api/sync.js offline.
//
// It is deliberately more faithful than the older doubles in this directory in
// three places the chat depends on:
//   * whatever an insert stores is what it RETURNS (real id + created_at), since
//     api/messages.js answers with the row it just wrote;
//   * order() and limit() really order and cut, so the "500 rows per thread, and
//     they are the NEWEST 500" cap can be asserted;
//   * the (sender_id, client_id) partial unique index really fires, so the
//     idempotent-send race path is exercised rather than described.
export const state = {
  user: null, // the verified token's user — { id, email }
  authError: null,
  tables: {},
  selects: [],
  inserts: [],
  upserts: [],
  deletes: [],
  readErrors: {}, // table -> error returned by any select
  writeErrors: {}, // table -> error returned by any insert
  clock: Date.parse("2026-09-24T12:00:00.000Z"),
  nextRow: 1,
  // Staging a send race: the row exists (so the INSERT hits the unique index)
  // but the ONE read below — the clientId lookup — cannot see it yet.
  missNextReadOn: null,
};

export function reset() {
  state.user = null;
  state.authError = null;
  state.tables = {};
  state.selects = [];
  state.inserts = [];
  state.upserts = [];
  state.deletes = [];
  state.readErrors = {};
  state.writeErrors = {};
  state.clock = Date.parse("2026-09-24T12:00:00.000Z");
  state.nextRow = 1;
  state.missNextReadOn = null;
}

export function setTable(name, rows) {
  state.tables[name] = rows.map((row) => ({ ...row }));
}

export function rows(name) {
  return state.tables[name] || [];
}

export function failReads(table, error) {
  state.readErrors[table] = error;
}

export function failWrites(table, error) {
  state.writeErrors[table] = error;
}

/** Advance the insert clock, so ordering tests do not depend on real time. */
export function tick(seconds = 1) {
  state.clock += seconds * 1000;
}

function matches(row, filters) {
  return filters.every(([column, value, isIn]) =>
    isIn ? value.includes(row[column]) : row[column] === value
  );
}

function compareBy(column, ascending) {
  return (a, b) => {
    const left = a[column] === null || a[column] === undefined ? "" : String(a[column]);
    const right = b[column] === null || b[column] === undefined ? "" : String(b[column]);
    if (left === right) return 0;
    return (left < right ? -1 : 1) * (ascending ? 1 : -1);
  };
}

export function createClient() {
  return {
    auth: {
      getUser: async () =>
        state.authError
          ? { data: { user: null }, error: state.authError }
          : { data: { user: state.user }, error: null },
    },
    from(table) {
      const filters = [];
      const orders = [];
      let op = "select";
      let payload = null;
      let conflict = null;
      let cut = null;

      const run = () => {
        const tableRows = state.tables[table] || [];
        if (op === "delete") {
          state.deletes.push({ table, filters: filters.map((f) => [...f]) });
          const removed = tableRows.filter((row) => matches(row, filters));
          state.tables[table] = tableRows.filter((row) => !matches(row, filters));
          return { data: removed, error: state.writeErrors[table] || null };
        }
        if (op === "insert" || op === "upsert") {
          const incoming = Array.isArray(payload) ? payload : [payload];
          const error = state.writeErrors[table] || null;
          if (op === "insert") {
            state.inserts.push({ table, rows: incoming });
            if (error) return { data: null, error };
            // The partial unique index from supabase/messages.sql:
            //   unique (sender_id, client_id) where client_id is not null
            for (const row of incoming) {
              if (row.client_id === null || row.client_id === undefined) continue;
              const clash = tableRows.some(
                (existing) => existing.sender_id === row.sender_id && existing.client_id === row.client_id
              );
              if (clash) {
                return {
                  data: null,
                  error: {
                    code: "23505",
                    message: 'duplicate key value violates unique constraint "private_messages_sender_client_uniq"',
                  },
                };
              }
            }
          } else {
            state.upserts.push({ table, rows: incoming, conflict, ignoreDuplicates: false });
            if (error) return { data: null, error };
          }
          const stored = [];
          const next = [...tableRows];
          for (const row of incoming) {
            const stamped = {
              id: `row-${state.nextRow}`,
              created_at: new Date(state.clock).toISOString(),
              ...row,
            };
            state.nextRow += 1;
            state.clock += 1000;
            const keys = conflict ? conflict.split(",") : null;
            const index = keys ? next.findIndex((existing) => keys.every((key) => existing[key] === stamped[key])) : -1;
            if (op === "insert") {
              next.push(stamped);
            } else if (index >= 0) {
              next[index] = { ...next[index], ...stamped, id: next[index].id, created_at: next[index].created_at };
            } else {
              next.push(stamped);
            }
            stored.push(stamped);
          }
          state.tables[table] = next;
          // What the database gives back: the rows as stored (ids, timestamps).
          const returned = op === "insert" ? stored : incoming;
          return { data: returned, error: null };
        }
        if (state.readErrors[table]) return { data: null, error: state.readErrors[table] };
        state.selects.push({ table, filters: filters.map((f) => [...f]), orders: [...orders], limit: cut });
        if (state.missNextReadOn === table) {
          state.missNextReadOn = null;
          return { data: [], error: null };
        }
        let found = tableRows.filter((row) => matches(row, filters));
        for (const { column, ascending } of [...orders].reverse()) found = found.slice().sort(compareBy(column, ascending));
        if (typeof cut === "number") found = found.slice(0, cut);
        return { data: found, error: null };
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
        order(column, options = {}) {
          orders.push({ column, ascending: options.ascending !== false });
          return builder;
        },
        limit(count) {
          cut = Number(count);
          return builder;
        },
        insert(nextPayload) {
          op = "insert";
          payload = nextPayload;
          return builder;
        },
        upsert(nextPayload, options = {}) {
          op = "upsert";
          payload = nextPayload;
          conflict = options.onConflict || null;
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
