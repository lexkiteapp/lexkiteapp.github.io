// Đồng hồ D1 cho trang QUẢN TRỊ (docs/CAPACITY.md §D4) – trước 03/11 nằm ngoài cổng capacity-sim (giám sát mù: 3,9 triệu dòng đọc/ngày, 78 % Free).
// Chạy mã thật functions/api/admin.js trên D1 cục bộ, dữ liệu giống production 03/11 (2.834 phiên/20 ngày, 38 % người thật, 306 khách, 78 tài khoản).
//   node scripts/capacity/admin-sim.mjs                 → node:sqlite (ước lượng)      --d1=miniflare → rows_read THẬT (CI capacity-sim.yml)
//   --scale=N (nhân dữ liệu) · --json=<tệp> · --md=<tệp> · --budget=5000 (dòng đọc / 1 lần mở trang, isolate mới, bảng tổng hợp có sẵn)
// Đo: 1 lần mở = Tổng quan + Phân tích 30 ngày + Trực tiếp + Tăng trưởng 30 ngày + Dung lượng; lạnh (chưa có stats_day) / ấm; 1 giờ Trực tiếp tự làm mới 30 giây;
// SQL cũ (ADMIN_ROLLUP=0) cùng dữ liệu để so trước/sau. ĐỎ (exit 1): lần mở ấm > ngân sách · đường mới có SCAN sessions · số đo = 0.
import { webcrypto } from 'node:crypto';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { meter, sqliteD1, miniflareD1, explainAll } from './meter.mjs';

const arg = (k, d) => { const a = process.argv.find(x => x.startsWith('--' + k + '=')); return a ? a.split('=').slice(1).join('=') : d; };
const backend = arg('d1', 'sqlite'), scale = Math.max(1, +arg('scale', 1)), BUDGET = +arg('budget', 5000);
const store = new Map();
globalThis.caches = { default: {
  async match(r) { const e = store.get(r.url); if (!e || e.exp <= Date.now()) return undefined; return new Response(e.body); },
  async put(r, res) { const age = +((res.headers.get('Cache-Control') || '').match(/max-age=(\d+)/) || [, 0])[1]; store.set(r.url, { body: await res.text(), exp: Date.now() + age * 1000 }); },
  async delete(r) { return store.delete(r.url); },
} };
const realNow = Date.now; let NOW = Date.UTC(2026, 10, 3, 9, 0, 0); Date.now = () => NOW;
const kp = await webcrypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']);
const jwk = { ...(await webcrypto.subtle.exportKey('jwk', kp.publicKey)), kid: 'k1' };
const b64u = b => Buffer.from(b).toString('base64url');
const tok = async () => { const sec = Math.floor(NOW / 1000), h = b64u(JSON.stringify({ alg: 'RS256', kid: 'k1' })), p = b64u(JSON.stringify({ aud: 'lexkite-app', iss: 'https://securetoken.google.com/lexkite-app', exp: sec + 3600, iat: sec, auth_time: sec, sub: 'uBoss', email: 'boss@lexkite.com', email_verified: true })); return h + '.' + p + '.' + b64u(await webcrypto.subtle.sign('RSASSA-PKCS1-v1_5', kp.privateKey, new TextEncoder().encode(h + '.' + p))); };
globalThis.fetch = async url => { if (String(url).includes('googleapis.com/service_accounts')) return { ok: true, json: async () => ({ keys: [jwk] }) }; return new Response('{}', { status: 404 }); };

const be = backend === 'miniflare' ? await miniflareD1() : sqliteD1(), M = meter(be.raw), DB = M.db;
const H = await import(new URL('../../functions/api/hit.js', import.meta.url));
const A = await import(new URL('../../functions/api/admin.js', import.meta.url));
const R = await import(new URL('../../functions/api/_rollup.js', import.meta.url));
const RB = await import(new URL('../../functions/api/_readbudget.js', import.meta.url));
await H.setup(DB);
for (const q of ['CREATE TABLE IF NOT EXISTS docs (uid TEXT, k TEXT, h TEXT, body TEXT, updated INTEGER, PRIMARY KEY (uid, k)) WITHOUT ROWID',
  'CREATE TABLE IF NOT EXISTS ai_quota (id TEXT, day TEXT, n INTEGER, PRIMARY KEY (id, day)) WITHOUT ROWID']) await DB.prepare(q).run();

// ---------- dữ liệu giống production 03/11 (× scale) ----------
let seed = 1103; const rnd = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32), pick = a => a[Math.floor(rnd() * a.length)];
const DAY = 864e5, VN = 7 * 3600e3, DAYS = 20, PER = Math.round(142 * scale), HV = Math.round(306 * scale), NU = Math.round(78 * scale);
const vids = Array.from({ length: HV }, (_, i) => 'h' + i.toString(36).padStart(9, '0')), rows = [];
for (let k = DAYS - 1; k >= 0; k--) {
  const d0 = Date.parse(H.dayOf(NOW - k * DAY) + 'T00:00:00Z') - VN;
  for (let i = 0; i < PER; i++) {
    const at = d0 + Math.floor(rnd() * DAY); if (at > NOW) continue;
    const human = rnd() < 0.38, dur = Math.floor(rnd() * 900);
    rows.push([`s${rows.length}`, human ? pick(vids) : 'b' + Math.floor(rnd() * 1e9).toString(36), H.dayOf(at), at, pick(['VN', 'VN', 'US', 'IN', 'ID']), pick(['', 'google.com', 't.co']), pick(['mobile', 'desktop']), pick(['vi', 'en']),
      pick(['web', 'pwa', 'android', 'ios']), pick(['home', 'review', 'learn', 'dict', 'say']), dur, 1 + Math.floor(rnd() * 5), rnd() < 0.5 ? 1 : 0, pick([null, 1800, 2600]), at + dur * 1000, 'home', human ? null : pick(['ci', 'ua', 'dc', 'ci-app'])]);
  }
}
const INS = 'INSERT INTO sessions (sid, vid, day, at, country, ref, dev, lang, plat, path, dur, pages, ret, lcp, last, last_path, bot) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17)';
for (let i = 0; i < rows.length; i += 200) await be.raw.batch(rows.slice(i, i + 200).map(r => be.raw.prepare(INS).bind(...r)));
const users = Array.from({ length: NU }, (_, i) => { const c = NOW - Math.floor(rnd() * 25 * DAY); return be.raw.prepare('INSERT INTO users (uid, email, created, seen, plat, n) VALUES (?1, ?2, ?3, ?4, ?5, ?6)').bind('u' + i, `u${i}@ex.com`, c, Math.min(NOW, c + Math.floor(rnd() * 9 * DAY)), 'web', 1 + (i % 7)); });
await DB.prepare('CREATE TABLE IF NOT EXISTS users (uid TEXT PRIMARY KEY, email TEXT, name TEXT, created INTEGER NOT NULL, seen INTEGER NOT NULL, plat TEXT, n INTEGER DEFAULT 1) WITHOUT ROWID').run();
await be.raw.batch([...users, be.raw.prepare("INSERT INTO users (uid, email, created, seen) VALUES ('uBoss', 'boss@lexkite.com', 0, 0)")]);
const links = Array.from({ length: Math.round(109 * scale) }, (_, i) => be.raw.prepare('INSERT OR IGNORE INTO vid_uid (vid, uid, at) VALUES (?1, ?2, 0)').bind(vids[i % HV], 'u' + (i % NU)));
for (let i = 0; i < links.length; i += 200) await be.raw.batch(links.slice(i, i + 200));
await be.raw.batch([be.raw.prepare("INSERT OR IGNORE INTO vid_uid (vid, uid, at) VALUES (?1, 'uBoss', 0)").bind(vids[HV - 1])]);
const total = rows.length;

// ---------- 1 lần mở Quản trị ----------
const envNew = { DB, ADMIN_EMAILS: 'boss@lexkite.com' }, envOld = { ...envNew, ADMIN_ROLLUP: '0' };
const TOUR = [['overview', {}], ['analytics', { days: 30 }], ['live', { days: 30 }], ['growth', { days: 30 }], ['usage', {}]];
let ip = 0;
// Sim ĐO dòng đọc thật của từng op: ngân sách ngày (_readbudget, 03/11) cộng dồn qua các lượt đo sẽ trả 429 giữa chừng, nên đặt lại trước mỗi lần gọi; ngân sách có test riêng (d1-cap).
const noBudget = () => { RB._resetBudget(); for (const k of store.keys()) if (k.includes('budget.lexkite.internal')) store.delete(k); };
const call = async (env, op, x, label) => {
  noBudget(); M.begin(label || op);
  const r = await A.onRequestPost({ request: new Request('https://lexkite.com/api/admin', { method: 'POST', headers: { Origin: 'https://lexkite.com', 'CF-Connecting-IP': '10.0.' + (ip >> 8 & 255) + '.' + (ip++ & 255), Authorization: 'Bearer ' + await tok(), 'Content-Type': 'application/json' }, body: JSON.stringify({ op, ...x }) }), env });
  const c = M.end(); if (r.status !== 200) throw new Error(`${op} ${r.status} ${(await r.text()).slice(0, 200)}`);
  return c.reads;
};
const fresh = () => { store.clear(); R._resetRollup(); A._resetAdminMem(); }; // isolate mới, bộ đệm biên trống
const tour = async (env, tag) => { fresh(); const by = {}; for (const [op, x] of TOUR) by[op] = await call(env, op, x, tag + ':' + op); return { by, sum: Object.values(by).reduce((a, b) => a + b, 0) }; };
const old = await tour(envOld, 'old'), cold = await tour(envNew, 'cold'), warm = await tour(envNew, 'warm');
// 1 giờ Trực tiếp tự làm mới 30 giây/lần (cùng isolate), mỗi lượt có 1 phiên mới
const hour = async (env, tag) => { fresh(); let s = 0; for (let i = 0; i < 120; i++) { NOW += 30e3; await be.raw.prepare(INS).bind(`p${tag}${i}`, pick(vids), H.dayOf(NOW), NOW, 'VN', '', 'mobile', 'vi', 'web', 'home', 30, 2, 1, null, NOW, 'home', null).run(); s += await call(env, 'live', { days: 30 }, tag + ':live-poll'); } return s; };
const hourOld = await hour(envOld, "old"), hourNew = await hour(envNew, "new"); // nối tiếp nhau (phiên của giờ trước đã qua)

const plans = explainAll(M, backend === 'sqlite' ? be.sql : undefined);
const newPath = p => p.labels.some(l => /^(cold|warm|new):/.test(l)) && !p.labels.some(l => /^old:/.test(l));
const scans = plans.filter(p => newPath(p) && p.scans.includes('sessions'));
const otherScans = plans.filter(p => newPath(p) && p.scans.length && !p.small && !p.scans.includes('sessions')).map(p => ({ q: p.q.slice(0, 140), scans: p.scans }));
const res = { backend, scale, sessions: total, budget: BUDGET, old, cold, warm, hour: { old: hourOld, now: hourNew }, ratio: +(old.sum / Math.max(1, warm.sum)).toFixed(1), scans: scans.map(p => ({ q: p.q.slice(0, 200), plan: p.plan })), otherScans };
const md = [`### Quản trị – dòng đọc D1 / lần mở (${backend}, ${total} phiên × ${DAYS} ngày, scale ${scale})`, '',
  '| | Tổng quan | Phân tích 30 | Trực tiếp | Tăng trưởng 30 | Dung lượng | **Tổng** |', '|---|---:|---:|---:|---:|---:|---:|',
  ...[['SQL cũ (ADMIN_ROLLUP=0)', old], ['Mới – lạnh (dựng stats_day)', cold], ['Mới – ấm (isolate mới)', warm]].map(([k, t]) => `| ${k} | ${TOUR.map(([op]) => t.by[op]).join(' | ')} | **${t.sum}** |`), '',
  `1 giờ Trực tiếp tự làm mới (120 lượt): SQL cũ **${hourOld}** → mới **${hourNew}** dòng. Lần mở ấm: **${old.sum} → ${warm.sum}** (${res.ratio}×), ngân sách ${BUDGET}.`,
  scans.length ? `\n**ĐỎ – SCAN sessions ở đường mới:**\n${scans.map(s => `- \`${s.q}\` → ${s.plan.join(' / ')}`).join('\n')}` : '\nĐường mới: 0 câu SCAN sessions.',
  otherScans.length ? `\nQuét bảng khác (theo dõi): ${otherScans.map(s => '`' + s.q.slice(0, 90) + '`').join(' · ')}` : ''].join('\n');
console.log(md);
const out = arg('json'), outMd = arg('md');
if (out) { mkdirSync(dirname(out), { recursive: true }); writeFileSync(out, JSON.stringify(res, null, 1)); }
if (outMd) { mkdirSync(dirname(outMd), { recursive: true }); writeFileSync(outMd, md + '\n'); }
if (be.dispose) await be.dispose();
Date.now = realNow;
const errs = [];
if (!(old.sum > 0 && warm.sum > 0)) errs.push('số đo = 0');
if (warm.sum > BUDGET) errs.push(`lần mở ấm ${warm.sum} > ngân sách ${BUDGET}`);
if (scans.length) errs.push(`${scans.length} câu SCAN sessions ở đường mới`);
if (errs.length) { console.error('✗ admin-sim: ' + errs.join(' · ')); process.exit(1); }
console.log('✓ admin-sim: trong ngân sách, 0 SCAN sessions');
if (process.env.ADMIN_SIM_DEBUG) for (const e of [...M.queries.values()].filter(e => [...e.labels].some(l => l === 'new:live-poll')).sort((a, b) => b.reads - a.reads).slice(0, 8)) console.log(e.reads, e.n, e.q.slice(0, 150));
