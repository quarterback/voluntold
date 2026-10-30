// The parts of Cloudflare D1 the worker uses, over SQLite in the browser
// (sql.js). The browser demo runs the worker's own routes against this, so
// every screen behaves as it does on the server.

import type { Database, SqlValue } from 'sql.js';

type Row = Record<string, unknown>;

function toSql(v: unknown): SqlValue {
  if (v === undefined || v === null) return null;
  if (typeof v === 'boolean') return v ? 1 : 0;
  if (typeof v === 'number' || typeof v === 'string' || v instanceof Uint8Array) return v;
  return String(v);
}

class Statement {
  constructor(private db: BrowserD1, readonly sql: string, readonly params: SqlValue[] = []) {}

  bind(...values: unknown[]) {
    return new Statement(this.db, this.sql, values.map(toSql));
  }

  /** Runs now, synchronously. Returns the rows and how many rows changed. */
  exec(): { rows: Row[]; changes: number; lastRowId: number } {
    const raw = this.db.sqlite;
    const stmt = raw.prepare(this.sql);
    const rows: Row[] = [];
    try {
      stmt.bind(this.params);
      while (stmt.step()) rows.push(stmt.getAsObject() as Row);
    } finally {
      stmt.free();
    }
    const changes = raw.getRowsModified();
    const lastRowId = Number(raw.exec('SELECT last_insert_rowid()')[0]?.values[0][0] ?? 0);
    return { rows, changes, lastRowId };
  }

  async first<T = Row>(column?: string): Promise<T | null> {
    const row = this.exec().rows[0];
    if (!row) return null;
    return (column ? row[column] : row) as T;
  }

  async all<T = Row>() {
    const { rows, changes, lastRowId } = this.exec();
    return { results: rows as T[], success: true, meta: { changes, last_row_id: lastRowId } };
  }

  async run() {
    const { changes, lastRowId } = this.exec();
    return { results: [], success: true, meta: { changes, last_row_id: lastRowId } };
  }

  async raw<T = unknown[]>() {
    return this.exec().rows.map((r) => Object.values(r)) as T[];
  }
}

export class BrowserD1 {
  constructor(public sqlite: Database) {
    // D1 enforces foreign keys, and the schema's cascades depend on it.
    sqlite.run('PRAGMA foreign_keys = ON');
  }

  prepare(sql: string) {
    return new Statement(this, sql);
  }

  /** All or nothing, as D1 does it. */
  async batch(statements: Statement[]) {
    this.sqlite.run('BEGIN');
    try {
      const out = statements.map((s) => {
        const { rows, changes, lastRowId } = s.exec();
        return { results: rows, success: true, meta: { changes, last_row_id: lastRowId } };
      });
      this.sqlite.run('COMMIT');
      return out;
    } catch (e) {
      this.sqlite.run('ROLLBACK');
      throw e;
    }
  }

  async exec(sql: string) {
    this.sqlite.exec(sql);
    return { count: 0, duration: 0 };
  }

  /** Total rows changed since the database opened, to tell when to save. */
  totalChanges(): number {
    return Number(this.sqlite.exec('SELECT total_changes()')[0]?.values[0][0] ?? 0);
  }
}
