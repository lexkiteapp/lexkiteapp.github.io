// Đồng hồ D1 cho mô phỏng hạn mức (scripts/capacity/sim.mjs, scripts/test/capacity.mjs) – docs/CAPACITY.md.
// Bọc 1 cơ sở dữ liệu kiểu D1 (prepare/bind/first/all/run/batch) và cộng meta.rows_read / rows_written theo từng YÊU CẦU (begin/end).
// Hai nguồn:
//   - 'miniflare': D1 cục bộ của workerd (cùng mã máy D1 thật) → meta.rows_read/rows_written THẬT. Chạy trên CI (sandbox Mac chặn mở cổng).
//   - 'sqlite'  : node:sqlite + ƯỚC LƯỢNG (EXPLAIN QUERY PLAN: SCAN = cả bảng, SEARCH = số dòng trả/đổi; ghi = dòng đổi × (1 + số chỉ mục)).
// Mọi câu SQL đã chạy được giữ lại kèm tham số → explainAll() chạy EXPLAIN QUERY PLAN trên bản sao lược đồ (node:sqlite) và gắn cờ SCAN.
import { DatabaseSync } from 'node:sqlite';

const norm = q => String(q).replace(/\s+/g, ' ').trim();
const tableOf = q => { const m = norm(q).match(/^(?:INSERT(?: OR \w+)? INTO|REPLACE INTO|UPDATE(?: OR \w+)?|DELETE FROM)\s+(\w+)/i); return m ? m[1] : null; };
const isDDL = q => /^\s*(CREATE|ALTER|DROP)\s/i.test(q);
const isRead = q => /^\s*(SELECT|WITH|PRAGMA)\b/i.test(q);
// Bảng nhỏ, do quản trị soạn (không lớn theo số người dùng) → SCAN chấp nhận được, vẫn ghi vào báo cáo
export const SMALL_TABLES = new Set(['config', 'quota_config', 'quota_allow', 'quota_block', 'hit_meta', 'api_keys', 'key_alerts', 'sqlite_master', 'sqlite_schema']);

/** D1 giả trên node:sqlite (ước lượng meta). → { raw, sql } */
export function sqliteD1() {
  const sql = new DatabaseSync(':memory:');
  const idxCount = new Map();
  const nIdx = t => { if (!idxCount.has(t)) { try { idxCount.set(t, sql.prepare("SELECT COUNT(*) AS n FROM sqlite_master WHERE type = 'index' AND tbl_name = ? AND sql IS NOT NULL").get(t).n); } catch (e) { idxCount.set(t, 0); } } return idxCount.get(t); };
  const count = t => { try { return sql.prepare(`SELECT COUNT(*) AS n FROM "${t}"`).get().n; } catch (e) { return 0; } };
  const planRead = (q, args, returned) => {
    if (isDDL(q)) return 0;
    let rows = 0, any = false;
    try {
      for (const p of sql.prepare('EXPLAIN QUERY PLAN ' + q).all(...args)) {
        const d = String(p.detail), s = d.match(/^SCAN (\w+)/), x = d.match(/^SEARCH (\w+)/);
        if (s && s[1] !== 'CONSTANT') { rows += count(s[1]); any = true; }
        else if (x) { rows += Math.max(1, returned); any = true; }
      }
    } catch (e) { /* bỏ qua */ }
    return any ? rows : 0;
  };
  const exec = (q, args, mode) => {
    if (isDDL(q)) { sql.exec(q.replace(/^\s+/, '')); idxCount.clear(); return { results: [], meta: { rows_read: 0, rows_written: 0, changes: 0 } }; }
    const st = sql.prepare(q), t = tableOf(q);
    const before = t ? planRead(q, args, 1) : 0;
    if (isRead(q) || /\bRETURNING\b/i.test(q)) {
      const results = st.all(...args), w = t ? results.length * (1 + nIdx(t)) : 0;
      return { results, meta: { rows_read: t ? before : planRead(q, args, results.length), rows_written: w, changes: t ? results.length : 0 } };
    }
    const r = st.run(...args), ch = Number(r.changes) || 0;
    return { results: [], meta: { rows_read: t ? before : 0, rows_written: t ? ch * (1 + nIdx(t)) : 0, changes: ch } };
  };
  const stmt = (q, args = []) => ({
    bind: (...a) => stmt(q, a),
    async all() { return exec(q, args, 'all'); },
    async run() { return exec(q, args, 'run'); },
    async first(col) { const r = exec(q, args, 'all'); const row = r.results[0] || null; return col && row ? row[col] : row; },
    _q: q, _a: args,
  });
  const raw = {
    prepare: q => stmt(q),
    async batch(list) { sql.exec('BEGIN'); try { const out = list.map(s => exec(s._q, s._a, 'all')); sql.exec('COMMIT'); return out; } catch (e) { sql.exec('ROLLBACK'); throw e; } },
    async exec(q) { sql.exec(q); return { count: 1 }; },
  };
  return { raw, sql, kind: 'sqlite' };
}

/** D1 cục bộ của Miniflare (workerd) – số đo thật. Chỉ chạy được ở nơi cho mở cổng loopback (CI). */
export async function miniflareD1() {
  const { Miniflare } = await import('miniflare');
  const mf = new Miniflare({ modules: true, script: 'export default { fetch() { return new Response("ok") } }', d1Databases: ['DB'], compatibilityDate: '2026-07-01' });
  const d1 = await mf.getD1Database('DB');
  return { raw: d1, kind: 'miniflare', dispose: () => mf.dispose() };
}

/** Bọc DB → { db, begin, end, queries, totals }. Mỗi lượt prepare/batch cộng vào yêu cầu đang mở. */
export function meter(raw, { fixed = () => false } = {}) {
  const queries = new Map(); // sql chuẩn hoá → { q, args, n, reads, writes, labels:Set }
  const ddl = [];
  let cur = null;
  const totals = { reads: 0, writes: 0, queries: 0, fixedReads: 0 };
  const note = (q, args, meta) => {
    const k = norm(q), r = +(meta && meta.rows_read) || 0, w = +(meta && meta.rows_written) || 0;
    if (isDDL(q)) { if (!ddl.includes(q)) ddl.push(q); }
    let e = queries.get(k); if (!e) queries.set(k, e = { q: k, args, n: 0, reads: 0, writes: 0, labels: new Set() });
    e.n++; e.reads += r; e.writes += w; if (cur) e.labels.add(cur.label);
    totals.reads += r; totals.writes += w; totals.queries++;
    if (fixed(k)) { totals.fixedReads += r; return; }
    if (cur) { cur.reads += r; cur.writes += w; cur.queries++; }
  };
  const wrap = (st, q, args) => ({
    _s: st, _q: q, _a: args,
    bind: (...a) => wrap(st.bind(...a), q, a),
    async all() { const r = await st.all(); note(q, args, r && r.meta); return r; },
    async run() { const r = await st.run(); note(q, args, r && r.meta); return r; },
    async first(col) { const r = await st.all(); note(q, args, r && r.meta); const row = ((r && r.results) || [])[0] ?? null; return col && row ? row[col] : row; },
    async raw() { const r = await st.all(); note(q, args, r && r.meta); return ((r && r.results) || []).map(o => Object.values(o)); },
  });
  const db = {
    prepare: q => wrap(raw.prepare(q), q, []),
    async batch(list) { const out = await raw.batch(list.map(x => x._s || x)); out.forEach((r, i) => note(list[i]._q, list[i]._a, r && r.meta)); return out; },
    async exec(q) { const r = await raw.exec(q); if (cur) cur.queries++; return r; },
    dump: raw.dump && (() => raw.dump()),
  };
  return {
    db, queries, ddl, totals,
    begin(label) { cur = { label, reads: 0, writes: 0, queries: 0 }; return cur; },
    end() { const c = cur; cur = null; return c; },
  };
}

/** EXPLAIN QUERY PLAN mọi câu đã chạy, trên bản sao lược đồ (node:sqlite). → [{ q, labels, plan, scans:[bảng], small }] */
export function explainAll(m, shadowSql) {
  const sql = shadowSql || (() => { const s = new DatabaseSync(':memory:'); for (const q of m.ddl) { try { s.exec(q); } catch (e) { /* ALTER trùng cột */ } } return s; })();
  const out = [];
  for (const e of m.queries.values()) {
    if (isDDL(e.q) || !/^(SELECT|WITH|UPDATE|DELETE|INSERT|REPLACE)/i.test(e.q)) continue;
    let plan = [];
    try { plan = sql.prepare('EXPLAIN QUERY PLAN ' + e.q).all(...e.args).map(p => String(p.detail)); } catch (err) { plan = ['? ' + String(err.message).slice(0, 80)]; }
    const scans = plan.map(d => (d.match(/^SCAN (\w+)/) || [])[1]).filter(t => t && t !== 'CONSTANT');
    out.push({ q: e.q, labels: [...e.labels], n: e.n, reads: e.reads, writes: e.writes, plan, scans, small: scans.length > 0 && scans.every(t => SMALL_TABLES.has(t)) });
  }
  return out;
}
