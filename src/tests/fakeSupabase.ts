/**
 * A minimal in-memory stand-in for the Supabase JS client, covering just the
 * query-builder surface our repositories actually use (select/insert/update
 * /upsert/delete with eq/gte/lte/in/order/limit/single/maybeSingle, plus a
 * trivial storage bucket and a fixed authenticated user). Good enough to
 * exercise real repository/service code paths without a live database.
 */

export const FAKE_USER_ID = 'test-user-id';

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

type Row = Record<string, unknown>;

/** Mimics the Postgres column defaults our migrations declare (`id uuid
 * default gen_random_uuid()`, `user_id uuid default auth.uid()`), since real
 * repositories often omit both and rely on the database to fill them in. */
function applyRowDefaults(item: Row): Row {
  const row = { ...item };
  if (row.id === undefined) row.id = crypto.randomUUID();
  if (row.user_id === undefined) row.user_id = FAKE_USER_ID;
  return row;
}

class FakeTableStore {
  private tables = new Map<string, Row[]>();

  getTable(name: string): Row[] {
    if (!this.tables.has(name)) this.tables.set(name, []);
    return this.tables.get(name) as Row[];
  }

  setTable(name: string, rows: Row[]): void {
    this.tables.set(name, rows);
  }

  reset(): void {
    this.tables.clear();
  }
}

class FakeQueryBuilder {
  private op: 'select' | 'insert' | 'update' | 'upsert' | 'delete' = 'select';
  private filters: Array<(row: Row) => boolean> = [];
  private payload: Row | Row[] | undefined;
  private wantSingle = false;
  private wantMaybeSingle = false;
  private countMode: 'exact' | null = null;
  private headOnly = false;
  private orderBy?: { col: string; ascending: boolean };
  private limitN?: number;
  private onConflictCols?: string[];

  private readonly store: FakeTableStore;
  private readonly table: string;

  constructor(store: FakeTableStore, table: string) {
    this.store = store;
    this.table = table;
  }

  select(_cols?: string, opts?: { count?: 'exact'; head?: boolean }): this {
    if (opts?.count) this.countMode = opts.count;
    if (opts?.head) this.headOnly = true;
    return this;
  }
  insert(payload: Row | Row[]): this {
    this.op = 'insert';
    this.payload = payload;
    return this;
  }
  update(payload: Row): this {
    this.op = 'update';
    this.payload = payload;
    return this;
  }
  upsert(payload: Row | Row[], opts?: { onConflict?: string }): this {
    this.op = 'upsert';
    this.payload = payload;
    if (opts?.onConflict) this.onConflictCols = opts.onConflict.split(',');
    return this;
  }
  delete(): this {
    this.op = 'delete';
    return this;
  }
  eq(col: string, val: unknown): this {
    this.filters.push((row) => row[col] === val);
    return this;
  }
  gte(col: string, val: unknown): this {
    this.filters.push((row) => (row[col] as string) >= (val as string));
    return this;
  }
  lte(col: string, val: unknown): this {
    this.filters.push((row) => (row[col] as string) <= (val as string));
    return this;
  }
  in(col: string, vals: unknown[]): this {
    this.filters.push((row) => vals.includes(row[col]));
    return this;
  }
  order(col: string, opts?: { ascending?: boolean }): this {
    this.orderBy = { col, ascending: opts?.ascending ?? true };
    return this;
  }
  limit(n: number): this {
    this.limitN = n;
    return this;
  }
  single(): this {
    this.wantSingle = true;
    return this;
  }
  maybeSingle(): this {
    this.wantMaybeSingle = true;
    return this;
  }

  private execute(): { data: unknown; error: unknown; count: number | null } {
    const rows = this.store.getTable(this.table);

    if (this.op === 'select') {
      let result = rows.filter((r) => this.filters.every((f) => f(r)));
      if (this.orderBy) {
        const { col, ascending } = this.orderBy;
        result = [...result].sort((a, b) => {
          const dir = ascending ? 1 : -1;
          return (a[col] as string) > (b[col] as string) ? dir : (a[col] as string) < (b[col] as string) ? -dir : 0;
        });
      }
      if (this.limitN != null) result = result.slice(0, this.limitN);
      const count = this.countMode ? result.length : null;
      if (this.headOnly) return { data: null, error: null, count };
      if (this.wantSingle) {
        return result.length === 1
          ? { data: clone(result[0]), error: null, count }
          : { data: null, error: { message: 'Row not found' }, count };
      }
      if (this.wantMaybeSingle) {
        return { data: result[0] ? clone(result[0]) : null, error: null, count };
      }
      return { data: result.map(clone), error: null, count };
    }

    if (this.op === 'insert') {
      const items = Array.isArray(this.payload) ? this.payload : [this.payload as Row];
      const inserted = items.map((item) => {
        const row = applyRowDefaults(item);
        rows.push(row);
        return row;
      });
      return this.wantSingle
        ? { data: clone(inserted[0]), error: null, count: null }
        : { data: inserted.map(clone), error: null, count: null };
    }

    if (this.op === 'update') {
      const matched = rows.filter((r) => this.filters.every((f) => f(r)));
      matched.forEach((r) => Object.assign(r, this.payload));
      if (this.wantSingle) {
        return matched[0]
          ? { data: clone(matched[0]), error: null, count: null }
          : { data: null, error: { message: 'Row not found' }, count: null };
      }
      return { data: matched.map(clone), error: null, count: null };
    }

    if (this.op === 'upsert') {
      const items = Array.isArray(this.payload) ? this.payload : [this.payload as Row];
      const conflictCols = this.onConflictCols ?? ['id'];
      const results = items.map((item) => {
        const existingIdx = rows.findIndex((r) => conflictCols.every((c) => r[c] === item[c]));
        if (existingIdx >= 0) {
          rows[existingIdx] = { ...rows[existingIdx], ...item };
          return rows[existingIdx];
        }
        const row = applyRowDefaults(item);
        rows.push(row);
        return row;
      });
      return this.wantSingle
        ? { data: clone(results[0]), error: null, count: null }
        : { data: results.map(clone), error: null, count: null };
    }

    // delete
    const toDelete = new Set(rows.filter((r) => this.filters.every((f) => f(r))));
    this.store.setTable(
      this.table,
      rows.filter((r) => !toDelete.has(r))
    );
    return { data: Array.from(toDelete).map(clone), error: null, count: null };
  }

  then<TResult1 = unknown, TResult2 = never>(
    onfulfilled?: ((value: { data: unknown; error: unknown; count: number | null }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return Promise.resolve(this.execute()).then(onfulfilled, onrejected);
  }
}

class FakeStorageBucket {
  private files = new Map<string, Blob>();

  async upload(path: string, blob: Blob) {
    this.files.set(path, blob);
    return { data: { path }, error: null };
  }

  async download(path: string) {
    const blob = this.files.get(path);
    return blob ? { data: blob, error: null } : { data: null, error: { message: 'Not found' } };
  }

  async remove(paths: string[]) {
    paths.forEach((p) => this.files.delete(p));
    return { data: paths.map((p) => ({ name: p })), error: null };
  }

  async list(prefix: string) {
    const names = Array.from(this.files.keys())
      .filter((p) => p.startsWith(`${prefix}/`))
      .map((p) => ({ name: p.slice(prefix.length + 1) }));
    return { data: names, error: null };
  }
}

export function createFakeSupabaseClient() {
  const store = new FakeTableStore();
  const bucket = new FakeStorageBucket();

  return {
    from(table: string) {
      return new FakeQueryBuilder(store, table);
    },
    storage: {
      from() {
        return bucket;
      },
    },
    auth: {
      async getUser() {
        return { data: { user: { id: FAKE_USER_ID } }, error: null };
      },
    },
    __reset() {
      store.reset();
    },
  };
}
