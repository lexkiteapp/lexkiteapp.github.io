#!/usr/bin/env node
// Dịch lại nghĩa 13 ngôn ngữ THEO NGHĨA + TỪ LOẠI rồi duyệt AI – chạy trong CI (workflow lexicon-i18n.yml), tiếp tục được (resume).
//   node scripts/lexicon/i18n-job.mjs [--calls N] [--langs ko,th] [--dry]
// Đầu vào: dist/lexicon.json (node scripts/build-lexicon.mjs --write). Gọi https://lexkite.com/api/lexai bằng JWT OIDC của GitHub Actions.
// Gói web/packs/<lang>.json: "từ" → [nghĩa, cờ, tin cậy]  (cờ 2 = đã dịch theo nghĩa+từ loại; tin cậy: 0 đạt, 1 = điểm duyệt ≤ 3 → hiện nhãn "Dịch máy")
//   "từ#loại" chỉ ghi cho từ có ≥ 2 từ loại trong kho (record#v…); khóa "từ" = nghĩa của mục thông dụng nhất. Bảng tay *.gloss.json luôn thắng.
import fs from 'fs';
import { ROOT, rd, wr } from './lib.mjs';
const arg = (n, d) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : d; };
const CALLS = +arg('--calls', 60), DRY = process.argv.includes('--dry'), BATCH = 25;
const ORDER = ['ko', 'th', 'hi', 'zh', 'ja', 'ar', 'es', 'pt', 'fr', 'de', 'id', 'ru', 'tr'];
const LANGS = (arg('--langs', '') || ORDER.join(',')).split(',').filter(l => ORDER.includes(l));
const API = process.env.LEXAI_URL || 'https://lexkite.com/api/lexai';
const LEX = JSON.parse(rd('dist/lexicon.json'));
const GLOSS = fs.readdirSync(new URL('content/wordlists/', ROOT)).filter(f => f.endsWith('.gloss.json')).map(f => JSON.parse(rd('content/wordlists/' + f)));

// Mục theo thứ tự kho (NGSL trước) → từ thông dụng được làm trước; từ nhiều từ loại có khóa riêng
const entries = Object.entries(LEX).filter(([, e]) => !e.x).map(([k, e]) => ({ k, w: e.w.toLowerCase().trim(), pos: e.pos, def: e.def, ex: e.ex }));
const posCount = {}; for (const e of entries) posCount[e.w] = (posCount[e.w] || 0) + 1;
const firstOf = {}; for (const e of entries) if (!firstOf[e.w]) firstOf[e.w] = e.k;
const packKeys = e => [...(firstOf[e.w] === e.k ? [e.w] : []), ...(posCount[e.w] > 1 ? [e.k] : [])];

let token = '';
async function oidc() {
  if (token) return token;
  const u = process.env.ACTIONS_ID_TOKEN_REQUEST_URL, t = process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN;
  if (!u || !t) throw new Error('thiếu OIDC (permissions: id-token: write)');
  token = (await (await fetch(u + '&audience=lexkite-lexai', { headers: { Authorization: 'Bearer ' + t } })).json()).value;
  return token;
}
async function call(mode, lang, items) {
  for (let i = 0; i < 3; i++) {
    const r = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + await oidc(), 'User-Agent': 'lexkite-ci' }, body: JSON.stringify({ mode, lang, items }) }).catch(() => null);
    if (r && r.ok) return (await r.json()).out || {};
    if (r && r.status === 401) { token = ''; }
    await new Promise(s => setTimeout(s, 8000 * (i + 1)));
  }
  return null;
}

let calls = 0, done = 0, judged = 0, low = 0, fails = 0;
for (const lang of LANGS) {
  const P = `web/packs/${lang}.json`, pack = fs.existsSync(new URL(P, ROOT)) ? JSON.parse(rd(P)) : {};
  const hand = Object.assign({}, ...GLOSS.map(g => g[lang] || {}));
  // 1) dịch: mục chưa có cờ 2 ở khóa chính
  const todo = entries.filter(e => { const k = packKeys(e)[0]; return k && !hand[e.w] && !(pack[k] && pack[k][1] === 2); });
  for (let i = 0; i < todo.length && calls < CALLS; i += BATCH) {
    const b = todo.slice(i, i + BATCH); calls++;
    if (DRY) { console.log(`[dry] ${lang} translate ${b.map(x => x.k).join(' ')}`.slice(0, 200)); continue; }
    const out = await call('translate', lang, b.map(({ k, w, pos, def, ex }) => ({ k, w, pos, def, ex })));
    if (!out) { fails++; if (fails >= 3) break; continue; }
    for (const e of b) { const tr = String(out[e.k] || '').trim(); if (!tr || tr.length > 80) continue; for (const pk of packKeys(e)) pack[pk] = [tr, 2]; done++; }
  }
  // 2) duyệt AI: mục cờ 2 chưa có điểm
  const tj = entries.filter(e => { const k = packKeys(e)[0]; return k && pack[k] && pack[k][1] === 2 && pack[k][2] == null; });
  for (let i = 0; i < tj.length && calls < CALLS; i += BATCH) {
    const b = tj.slice(i, i + BATCH); calls++;
    if (DRY) continue;
    const out = await call('judge', lang, b.map(({ k, w, pos, def, ex }) => ({ k, w, pos, def, ex, tr: pack[packKeys({ k, w })[0]][0] })));
    if (!out) { fails++; if (fails >= 3) break; continue; }
    for (const e of b) { const s = +out[e.k]; if (!(s >= 1 && s <= 5)) continue; for (const pk of packKeys(e)) if (pack[pk]) pack[pk][2] = s <= 3 ? 1 : 0; judged++; if (s <= 3) low++; }
  }
  for (const [w, m] of Object.entries(hand)) pack[w] = [m, 1, 0]; // bảng tay thắng, tin cậy
  if (!DRY) wr(P, JSON.stringify(Object.fromEntries(Object.entries(pack).sort(([a], [b]) => (a < b ? -1 : 1)))));
  const v2 = entries.filter(e => { const k = packKeys(e)[0]; return k && pack[k] && pack[k][1] === 2; }).length;
  console.log(`${lang}: dịch theo nghĩa ${v2}/${entries.length} · đã duyệt ${entries.filter(e => { const k = packKeys(e)[0]; return pack[k] && pack[k][2] != null; }).length} · tin cậy thấp ${entries.filter(e => { const k = packKeys(e)[0]; return pack[k] && pack[k][2] === 1; }).length}`);
  if (calls >= CALLS || fails >= 3) break;
}
console.log(`lượt này: ${calls} lần gọi · dịch ${done} · duyệt ${judged} (thấp ${low}) · lỗi ${fails}`);
if (!DRY && calls > 0 && done + judged === 0) { console.error('✗ lexicon-i18n: không dịch/duyệt được mục nào'); process.exit(1); }
