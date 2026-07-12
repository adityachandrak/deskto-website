// Tiny in-memory replacement for the `pg` module's Pool + Client. Implements
// just enough SQL surface (CREATE TABLE, INSERT, UPDATE, DELETE, SELECT,
// WHERE, ORDER BY, RETURNING, transactions) to exercise the homepage
// CMS code paths used by the routes. Parameterised queries use $1, $2, etc.
//
// This is *not* a general-purpose PostgreSQL replacement — it is a
// contract-test stub for the production code path.

class FakeClient {
  constructor(db) { this.db = db; this._inTxn = false; this._txn = null; }
  async query(text, params) {
    const s = (text || '').trim();
    if (/^BEGIN$/i.test(s)) {
      this._inTxn = true;
      this._txn = { pending: [] };
      return { rows: [], rowCount: 0 };
    }
    if (/^COMMIT$/i.test(s)) {
      // Apply pending to the actual table
      for (const op of this._txn.pending) {
        const t = this.db.tables.get(op.table);
        if (t) t.rows.push(op.row);
      }
      this._inTxn = false;
      this._txn = null;
      return { rows: [], rowCount: 0 };
    }
    if (/^ROLLBACK$/i.test(s)) {
      this._inTxn = false;
      this._txn = null;
      return { rows: [], rowCount: 0 };
    }
    // SELECTs that need the existing rows to be visible while in a txn
    if (this._inTxn && /^SELECT/i.test(s)) {
      return this.db._exec(s, params, null);
    }
    if (this._inTxn) {
      return this.db._exec(s, params, this._txn);
    }
    return this.db._exec(s, params, null);
  }
  release() {}
}

class FakePool {
  constructor(db) { this.db = db; }
  async query(text, params) { return this.db._query(text, params, null); }
  async connect() { return new FakeClient(this.db); }
  on() { return this; }
  async end() { /* noop */ }
}

function paramToValue(p) {
  if (p === undefined || p === null) return null;
  if (p instanceof Date) return p;
  return p;
}

function evalWhere(row, whereSql, params) {
  if (!whereSql) return true;
  // Parse "col op $N" or "col op $N AND col op $N"
  // Supports: =, <>, !=, <, >, <=, >=, IS NULL, IS NOT NULL
  // The caller passes actual VALUES in the order $N appears in the
  // WHERE clause. So params[0] is the value of the first $N in WHERE,
  // params[1] of the second, etc.
  const parts = whereSql.split(/\s+AND\s+/i);
  let paramCursor = 0;
  for (const partRaw of parts) {
    const part = partRaw.trim();
    // IS NULL / IS NOT NULL
    let m = part.match(/^([a-zA-Z0-9_."]+)\s+IS\s+NULL$/i);
    if (m) {
      const v = getField(row, m[1]);
      if (v != null) return false;
      continue;
    }
    m = part.match(/^([a-zA-Z0-9_."]+)\s+IS\s+NOT\s+NULL$/i);
    if (m) {
      const v = getField(row, m[1]);
      if (v == null) return false;
      continue;
    }
    m = part.match(/^([a-zA-Z0-9_."]+)\s*(=|!=|<>|<=|>=|<|>)\s*\$(\d+)$/i);
    if (m) {
      const v = getField(row, m[1]);
      const op = m[2];
      // The caller passes actual VALUES in the order $N appears in the
      // WHERE clause. params[0] is the value of the first $N in WHERE.
      const p = params[paramCursor];
      paramCursor++;
      const pv = paramToValue(p);
      if (!compareOp(v, op, pv)) return false;
      continue;
    }
    // Fallback: silently ignore unknown
  }
  return true;
}

function compareOp(a, op, b) {
  switch (op) {
    case '=': return a == b;
    case '!=': case '<>': return a != b;
    case '<': return a < b;
    case '>': return a > b;
    case '<=': return a <= b;
    case '>=': return a >= b;
  }
  return false;
}

function getField(row, col) {
  // Allow "col" or "table.col"
  const c = col.split('.').pop().replace(/"/g, '');
  return row[c];
}

class FakeDB {
  constructor() {
    this.tables = new Map();
    this.idCounter = 1;
  }
  createTable(name) {
    if (!this.tables.has(name)) {
      this.tables.set(name, { name, cols: [], rows: [] });
    }
    return this.tables.get(name);
  }
  _exec(sql, params, txn) {
    const s = sql.trim();
    if (/^CREATE\s+TABLE/i.test(s)) {
      const m = s.match(/CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+([a-zA-Z0-9_]+)/i)
            || s.match(/CREATE\s+TABLE\s+([a-zA-Z0-9_]+)/i);
      const t = this.createTable(m[1]);
      return { rows: [], rowCount: 0 };
    }
    if (/^CREATE\s+INDEX/i.test(s) || /^CREATE\s+TRIGGER/i.test(s) || /^CREATE\s+FUNCTION/i.test(s) || /^CREATE\s+TYPE/i.test(s) || /^CREATE\s+EXTENSION/i.test(s) || /^DROP/i.test(s) || /^ALTER/i.test(s) || /^SELECT\s+NOW\(\)/i.test(s)) {
      return { rows: [{ now: new Date() }], rowCount: 1 };
    }
    if (/^SELECT\s+1$/i.test(s)) {
      return { rows: [{ '?column?': 1 }], rowCount: 1 };
    }
    if (/^SELECT\s+1\s+FROM\s+([a-zA-Z0-9_]+)/i.test(s)) {
      const t = s.match(/FROM\s+([a-zA-Z0-9_]+)/i)[1];
      const table = this.tables.get(t) || { rows: [] };
      if (table.rows.length > 0) return { rows: [{ '?column?': 1 }], rowCount: 1 };
      return { rows: [], rowCount: 0 };
    }
    // INSERT
    if (/^INSERT\s+INTO/i.test(s)) {
      const tableMatch = s.match(/INSERT\s+INTO\s+([a-zA-Z0-9_]+)\s*\(([^)]+)\)/i);
      const table = this.tables.get(tableMatch[1]);
      if (!table) throw new Error(`Table not found: ${tableMatch[1]}`);
      const cols = tableMatch[2].split(',').map(c => c.trim().replace(/"/g, ''));
      // Register columns on first insert (always include id)
      for (const c of [...cols, 'id']) if (!table.cols.includes(c)) table.cols.push(c);
      const returning = /RETURNING\s+\*/i.test(s);
      const row = {};
      cols.forEach((c, i) => { row[c] = paramToValue(params[i]); });
      // Auto-generate UUID for id (always, even if not in cols list).
      // This matches the production schema where id is a UUID PRIMARY KEY
      // DEFAULT uuid_generate_v4().
      if (!row.id) {
        row.id = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, ch => {
          const r = Math.floor(Math.random() * 16);
          return (ch === 'x' ? r : (r & 0x3) | 0x8).toString(16);
        });
      }
      // Auto timestamps
      const now = new Date();
      if (cols.includes('created_at') && !row.created_at) row.created_at = now;
      if (cols.includes('updated_at') && !row.updated_at) row.updated_at = now;
      if (txn) {
        txn.pending.push({ type: 'insert', table: tableMatch[1], row });
      } else {
        table.rows.push(row);
      }
      return returning ? { rows: [Object.assign({}, row)], rowCount: 1 } : { rows: [], rowCount: 1 };
    }
    // UPDATE
    if (/^UPDATE\s+([a-zA-Z0-9_]+)\s+SET\s+([\s\S]+?)(?:\s+WHERE\s+([\s\S]+?))?(?:\s+RETURNING\s+\*)?$/i.test(s)) {
      const m = s.match(/^UPDATE\s+([a-zA-Z0-9_]+)\s+SET\s+([\s\S]+?)(?:\s+WHERE\s+([\s\S]+?))?(?:\s+RETURNING\s+\*)?$/i);
      const table = this.tables.get(m[1]);
      if (!table) throw new Error(`Table not found: ${m[1]}`);
      const setClause = m[2];
      const whereClause = m[3] || '';
      const returning = /RETURNING\s+\*/i.test(s);
      // Parse set clause: "col = $N, col2 = $N, updated_at = NOW()"
      const setItems = setClause.split(/,(?![^()]*\))/);
      const updates = [];
      let consumed = 0;
      for (const item of setItems) {
        const trimmed = item.trim();
        // Special: updated_at = NOW()
        if (/^updated_at\s*=\s*NOW\(\)$/i.test(trimmed)) {
          updates.push({ col: 'updated_at', special: 'now' });
          continue;
        }
        const m2 = trimmed.match(/^([a-zA-Z0-9_."]+)\s*=\s*\$(\d+)$/);
        if (m2) {
          updates.push({ col: m2[1].replace(/"/g, ''), paramIdx: parseInt(m2[2], 10) });
          consumed = Math.max(consumed, parseInt(m2[2], 10));
        } else if (/^([a-zA-Z0-9_."]+)\s*=\s*\$(\d+)::text\[\]$/i.test(trimmed)) {
          const m3 = trimmed.match(/^([a-zA-Z0-9_."]+)\s*=\s*\$(\d+)::text\[\]$/i);
          updates.push({ col: m3[1].replace(/"/g, ''), paramIdx: parseInt(m3[2], 10) });
          consumed = Math.max(consumed, parseInt(m3[2], 10));
        } else if (/^([a-zA-Z0-9_."]+)\s*=\s*COALESCE\(\s*([a-zA-Z0-9_."]+)\s*,\s*NOW\(\)\s*\)$/i.test(trimmed)) {
          const m3 = trimmed.match(/^([a-zA-Z0-9_."]+)\s*=\s*COALESCE\(\s*([a-zA-Z0-9_."]+)\s*,\s*NOW\(\)\s*\)$/i);
          updates.push({ col: m3[1].replace(/"/g, ''), special: 'coalesce_now', fallback: m3[2].replace(/"/g, '') });
        } else {
          // Literal value: e.g. status = 'published'
          const mLit = trimmed.match(/^([a-zA-Z0-9_."]+)\s*=\s*('([^']*)'|NULL|TRUE|FALSE|([0-9]+(?:\.[0-9]+)?)$)/i);
          if (mLit) {
            const col = mLit[1].replace(/"/g, '');
            let value;
            if (mLit[2] === 'NULL') value = null;
            else if (mLit[2] === 'TRUE') value = true;
            else if (mLit[2] === 'FALSE') value = false;
            else if (mLit[4] !== undefined) value = parseFloat(mLit[4]);
            else value = mLit[3]; // string literal
            updates.push({ col, special: 'literal', value });
          } else {
            // Skip silently
          }
        }
      }
      // If a WHERE clause uses $N, those come AFTER the SET params
      let whereOffset = consumed;
      const whereMatch = whereClause.match(/\$(\d+)/g);
      if (whereMatch) {
        whereOffset = consumed;
      }
      // Apply updates
      const updated = [];
      for (const row of table.rows) {
        // Build a synthetic param array for WHERE evaluation
        const whereParams = [];
        if (whereClause) {
          for (const wm of whereClause.matchAll(/\$(\d+)/g)) {
            const idx = parseInt(wm[1], 10);
            whereParams.push(params[idx - 1]);
          }
        }
        if (!evalWhere(row, whereClause, whereParams)) continue;
        for (const u of updates) {
          if (u.special === 'now') {
            row[u.col] = new Date();
          } else if (u.special === 'coalesce_now') {
            const existing = row[u.fallback];
            row[u.col] = existing || new Date();
          } else if (u.special === 'literal') {
            row[u.col] = u.value;
          } else {
            row[u.col] = paramToValue(params[u.paramIdx - 1]);
          }
        }
        updated.push(Object.assign({}, row));
      }
      if (returning) return { rows: updated, rowCount: updated.length };
      return { rows: [], rowCount: updated.length };
    }
    // DELETE
    if (/^DELETE\s+FROM\s+([a-zA-Z0-9_]+)/i.test(s)) {
      const m = s.match(/^DELETE\s+FROM\s+([a-zA-Z0-9_]+)\s*(?:WHERE\s+([\s\S]+?))?$/i);
      const table = this.tables.get(m[1]);
      if (!table) return { rows: [], rowCount: 0 };
      const whereClause = m[2] || '';
      const before = table.rows.length;
      table.rows = table.rows.filter(r => {
        const whereParams = [];
        if (whereClause) {
          for (const wm of whereClause.matchAll(/\$(\d+)/g)) {
            const idx = parseInt(wm[1], 10);
            whereParams.push(params[idx - 1]);
          }
        }
        return !evalWhere(r, whereClause, whereParams);
      });
      return { rows: [], rowCount: before - table.rows.length };
    }
    // BEGIN / COMMIT / ROLLBACK
    if (/^BEGIN$/i.test(s)) {
      return { rows: [], rowCount: 0 };
    }
    if (/^COMMIT$/i.test(s)) {
      return { rows: [], rowCount: 0 };
    }
    if (/^ROLLBACK$/i.test(s)) {
      return { rows: [], rowCount: 0 };
    }
    // SELECT
    if (/^SELECT\s+/i.test(s)) {
      const tableMatch = s.match(/FROM\s+([a-zA-Z0-9_]+)/i);
      if (!tableMatch) {
        // Constant expression
        return { rows: [{ result: 1 }], rowCount: 1 };
      }
      const table = this.tables.get(tableMatch[1]) || { rows: [] };
      const whereMatch = s.match(/WHERE\s+([\s\S]+?)(?:\s+ORDER\s+BY|\s+LIMIT|\s*$)/i);
      const whereClause = whereMatch ? whereMatch[1] : '';
      const whereParams = [];
      if (whereClause) {
        for (const wm of whereClause.matchAll(/\$(\d+)/g)) {
          const idx = parseInt(wm[1], 10);
          whereParams.push(params[idx - 1]);
        }
      }
      const filtered = table.rows.filter(r => evalWhere(r, whereClause, whereParams));
      const orderMatch = s.match(/ORDER\s+BY\s+([\s\S]+?)(?:\s+LIMIT|\s*$)/i);
      let sorted = filtered.slice();
      if (orderMatch) {
        const orderExpr = orderMatch[1].trim();
        const parts = orderExpr.split(',').map(p => p.trim());
        sorted.sort((a, b) => {
          for (const part of parts) {
            const dirMatch = part.match(/^([a-zA-Z0-9_."()]+)(?:\s+(ASC|DESC))?$/i);
            if (!dirMatch) continue;
            let col = dirMatch[1].replace(/"/g, '');
            const dir = (dirMatch[2] || 'ASC').toUpperCase();
            // COALESCE(col, other)
            const coalMatch = col.match(/^COALESCE\(\s*([a-zA-Z0-9_."]+)\s*,\s*([a-zA-Z0-9_."]+)\s*\)$/i);
            let av, bv;
            if (coalMatch) {
              av = getField(a, coalMatch[1]) || getField(a, coalMatch[2]);
              bv = getField(b, coalMatch[1]) || getField(b, coalMatch[2]);
            } else {
              av = getField(a, col);
              bv = getField(b, col);
            }
            if (av == null && bv == null) continue;
            if (av == null) return dir === 'ASC' ? 1 : -1;
            if (bv == null) return dir === 'ASC' ? -1 : 1;
            if (av < bv) return dir === 'ASC' ? -1 : 1;
            if (av > bv) return dir === 'ASC' ? 1 : -1;
          }
          return 0;
        });
      }
      const limitMatch = s.match(/LIMIT\s+(\d+)/i);
      if (limitMatch) sorted = sorted.slice(0, parseInt(limitMatch[1], 10));
      return { rows: sorted.map(r => Object.assign({}, r)), rowCount: sorted.length };
    }
    throw new Error(`Unsupported SQL: ${s}`);
  }
  _query(sql, params, txn) {
    if (txn) {
      // Already in a transaction — execute against pending buffer
      const s = sql.trim();
      if (/^BEGIN$/i.test(s)) return { rows: [], rowCount: 0 };
      if (/^COMMIT$/i.test(s)) {
        // Apply all pending
        for (const op of txn.pending) {
          const t = this.tables.get(op.table);
          if (t) t.rows.push(op.row);
        }
        txn.pending = [];
        return { rows: [], rowCount: 0 };
      }
      if (/^ROLLBACK$/i.test(s)) {
        txn.pending = [];
        return { rows: [], rowCount: 0 };
      }
      return this._exec(s, params, txn);
    }
    return this._exec(sql, params, null);
  }
}

class FakePgModule {
  constructor() { this.db = new FakeDB(); }
  Pool() { return new FakePool(this.db); }
  Client() { return new FakeClient(this.db); }
}

module.exports = { FakePgModule, FakeDB, FakeClient };
