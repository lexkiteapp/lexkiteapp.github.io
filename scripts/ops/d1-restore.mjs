// Khôi phục / diễn tập khôi phục D1 chính từ bản sao lưu .bak.ndjson (docs/ROLLBACK.md §Dữ liệu).
//   node scripts/ops/d1-restore.mjs --file X.bak.ndjson --key-env DRIVE_ENC_KEY --sql out/restore.sql      ← NGOẠI TUYẾN (chủ giữ DRIVE_ENC_KEY): ra file SQL cho `wrangler d1 execute lexkite-sync --remote --file=…`
//   node scripts/ops/d1-restore.mjs --latest --api --drill [--engine miniflare|sqlite]                      ← CI: tải bản mới nhất từ Kho Drive, giải mã qua /api/drive (op backup_open), nạp vào D1 CỤC BỘ, đối chiếu số dòng
// Tuỳ chọn: --tables users,docs  --manifest infra/backups/d1-main.json  --copy N (bản sao Drive thử trước)
// SQL sinh ra là INSERT OR REPLACE (chạy lại được, không xoá dòng ngoài bản sao lưu); CREATE TABLE IF NOT EXISTS lấy DDL lúc sao lưu.
import fs from 'fs';
import path from 'path';
import { webcrypto } from 'crypto';
import zlib from 'zlib';
import { driveApi } from '../video/library.mjs';
import { arg, downloadCopy, loadJson, summary, alert } from './lib.mjs';

const A = process.argv.slice(2), has = f => A.includes('--' + f);
const unb64 = s => Buffer.from(s, 'base64');
const FILTER = arg(A, 'tables', '') ? new Set(arg(A, 'tables').split(',')) : null;

export async function openOffline(rawB64, table, { iv, ct }) {
  const raw = unb64(String(rawB64).trim()); if (raw.length !== 32) throw new Error('khoá phải là 32 byte base64');
  const base = await webcrypto.subtle.importKey('raw', raw, 'HKDF', false, ['deriveKey']);
  const key = await webcrypto.subtle.deriveKey({ name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(0), info: new TextEncoder().encode('lexkite-backup-v1') }, base, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
  const plain = await webcrypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(iv), additionalData: new TextEncoder().encode('backup:' + table) }, key, unb64(ct));
  return JSON.parse(zlib.gunzipSync(Buffer.from(plain)).toString('utf8'));
}
const unjv = v => (v && typeof v === 'object' && typeof v.$b === 'string' ? Buffer.from(v.$b, 'base64') : v);
export const lit = v => { v = unjv(v); return v == null ? 'NULL' : Buffer.isBuffer(v) ? `X'${v.toString('hex')}'` : typeof v === 'number' ? (Number.isFinite(v) ? String(v) : 'NULL') : typeof v === 'boolean' ? (v ? '1' : '0') : "'" + String(v).replace(/'/g, "''") + "'"; };

/** Đọc file → lần lượt { page } rồi { done, head, end }. */
export async function* readPages(file, opener, filter = null) {
  let head = null, end = null;
  for (const l of fs.readFileSync(file, 'utf8').split('\n').filter(Boolean)) {
    const o = JSON.parse(l);
    if (o['lexkite-backup']) { head = o; continue; }
    if (o.end) { end = o; continue; }
    if (filter && !filter.has(o.t)) continue;
    yield { page: await opener(o.t, o) };
  }
  yield { done: true, head, end };
}

async function main() {
  let file = arg(A, 'file', ''), opener;
  if (has('api')) opener = async (t, o) => (await driveApi('backup_open', { table: t, iv: o.iv, ct: o.ct })).page;
  else { const kv = process.env[arg(A, 'key-env', 'DRIVE_ENC_KEY')]; if (!kv) { console.error('Thiếu khoá: đặt biến môi trường (mặc định DRIVE_ENC_KEY) hoặc dùng --api'); process.exit(2); } opener = (t, o) => openOffline(kv, t, o); }
  if (has('latest')) {
    const man = loadJson(path.resolve(arg(A, 'manifest', 'infra/backups/d1-main.json')), { items: [] }), it = man.items[0];
    if (!it) { console.error('Sổ chưa có bản sao lưu nào'); process.exit(2); }
    file = path.join(path.resolve(arg(A, 'out', 'out/d1-restore')), it.name);
    let ok = false; const cps = it.copies || [], first = +arg(A, 'copy', 0);
    for (const c of cps.slice(first).concat(cps.slice(0, first))) { try { const r = await downloadCopy(c.fileId, file); if (r.sha256 === it.sha256 && r.size === it.size) { ok = true; break; } console.error('⚠ bản sao Drive ' + c.driveId + ': sai sha256'); } catch (e) { console.error('⚠ bản sao Drive ' + c.driveId + ': ' + e.message); } }
    if (!ok) { await alert('backup_d1', false, 'Diễn tập khôi phục D1: không tải được bản nào khớp sha256'); console.error('✗ không tải được bản nào khớp sha256'); process.exit(1); }
    console.log(`✓ tải ${it.name} (${(it.size / 1e6).toFixed(2)} MB) – sha256 khớp`);
  }
  if (!file || !fs.existsSync(file)) { console.error('Thiếu --file hoặc --latest'); process.exit(2); }

  const sqlOut = arg(A, 'sql', ''), drill = has('drill'), engine = arg(A, 'engine', 'sqlite');
  let db = null, dispose = async () => {};
  if (drill) {
    if (engine === 'miniflare') { const { Miniflare } = await import('miniflare'); const mf = new Miniflare({ modules: true, script: 'export default { fetch() { return new Response("ok") } }', d1Databases: ['DB'], compatibilityDate: '2026-07-01' }); const d1 = await mf.getD1Database('DB'); db = { run: async (q, a = []) => { await d1.prepare(q).bind(...a).run(); }, count: async t => (await d1.prepare(`SELECT COUNT(*) AS n FROM ${t}`).first()).n, name: 'Miniflare D1 (workerd)' }; dispose = () => mf.dispose(); }
    else { const { DatabaseSync } = await import('node:sqlite'); const s = new DatabaseSync(':memory:'); db = { run: async (q, a = []) => { s.prepare(q).run(...a.map(x => (Buffer.isBuffer(x) ? new Uint8Array(x) : x))); }, count: async t => s.prepare(`SELECT COUNT(*) AS n FROM ${t}`).get().n, name: 'SQLite (node:sqlite)' }; }
  }
  const ws = sqlOut ? (fs.mkdirSync(path.dirname(path.resolve(sqlOut)), { recursive: true }), fs.createWriteStream(sqlOut)) : null;
  const got = {}; let end = null;
  for await (const x of readPages(file, opener, FILTER)) {
    if (x.done) { end = x.end; break; }
    const p = x.page; if (!p) continue;
    if (p.ddl && !(p.t in got)) { const ddl = p.ddl.replace(/^CREATE TABLE\s+(IF NOT EXISTS\s+)?/i, 'CREATE TABLE IF NOT EXISTS '); if (ws) ws.write(ddl + ';\n'); if (db) await db.run(ddl); }
    got[p.t] = (got[p.t] || 0) + p.rows.length;
    if (!p.rows.length) continue;
    const ins = `INSERT OR REPLACE INTO ${p.t} (${p.cols.join(', ')}) VALUES (${p.cols.map(() => '?').join(', ')})`;
    for (const r of p.rows) { if (ws) ws.write(`INSERT OR REPLACE INTO ${p.t} (${p.cols.join(', ')}) VALUES (${r.map(lit).join(', ')});\n`); if (db) await db.run(ins, r.map(unjv)); }
  }
  if (ws) await new Promise(r => ws.end(r));
  const bad = [];
  if (!end) bad.push('thiếu dòng kết thúc (bản sao lưu cụt)');
  else for (const t of end.tables) if (!FILTER || FILTER.has(t)) { if ((got[t] || 0) !== (end.counts[t] || 0)) bad.push(`${t}: giải mã ${got[t] || 0} ≠ sổ ${end.counts[t] || 0}`); if (db && (got[t] || 0) > 0) { const n = await db.count(t); if (n !== got[t]) bad.push(`${t}: D1 cục bộ có ${n} ≠ ${got[t]}`); } }
  await dispose();
  const total = Object.values(got).reduce((a, b) => a + b, 0);
  summary(bad.length ? `✗ khôi phục${drill ? ' (diễn tập)' : ''}: ${bad.join('; ')}` : `✓ ${drill ? 'diễn tập khôi phục vào ' + db.name : 'giải mã'} ${path.basename(file)}: ${total} dòng / ${Object.keys(got).length} bảng khớp sổ${sqlOut ? ' · SQL: ' + sqlOut : ''}`);
  if (drill) await alert('backup_d1', !bad.length, bad.length ? 'Diễn tập khôi phục D1 THẤT BẠI: ' + bad[0] : 'ok');
  process.exit(bad.length ? 1 : 0);
}
if (process.argv[1] && process.argv[1].endsWith('d1-restore.mjs')) main().catch(e => { console.error('✗ ' + e.message); process.exit(1); });
