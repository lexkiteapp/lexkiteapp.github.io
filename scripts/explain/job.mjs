#!/usr/bin/env node
// Sinh lời giải đáp án theo lô trong CI (explain.yml), tiếp tục được – docs/EXPLAIN.md.
//   node scripts/explain/job.mjs --set usage [--calls N] [--langs vi,ko] [--dry]
// 1) xgen (en): mẫu + vì sao + vì sao sai (MỌI phương án nhiễu) + mẹo + 2 ví dụ  2) xjudge en  3) mỗi ngôn ngữ: xtr rồi xjudge.
// Điểm ≤ 3 → content/explain/review.json (không xuất ra web). Nguồn: content/explain/<set>.json
import fs from 'fs';
import { items, LANGS } from './sets.mjs';
const arg = (n, d) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : d; };
const SET = arg('--set', 'usage'), CALLS = +arg('--calls', 200), DRY = process.argv.includes('--dry');
const ONLY = (arg('--langs', '') || LANGS.join(',')).split(',').filter(l => LANGS.includes(l));
const API = process.env.LEXAI_URL || 'https://lexkite.com/api/lexai';
const FILE = new URL(`../../content/explain/${SET}.json`, import.meta.url);
const DB = fs.existsSync(FILE) ? JSON.parse(fs.readFileSync(FILE, 'utf8')) : {};
const save = () => { if (!DRY) { fs.mkdirSync(new URL('.', FILE), { recursive: true }); fs.writeFileSync(FILE, JSON.stringify(Object.fromEntries(Object.entries(DB).sort(([a], [b]) => (a < b ? -1 : 1))), null, 0).replace(/\},"/g, '},\n"')); } };
const sig = x => [x.s, x.ans, x.alts.join('/')].join('#');

let token = '';
async function oidc() {
  if (token) return token;
  const u = process.env.ACTIONS_ID_TOKEN_REQUEST_URL, t = process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN;
  if (!u || !t) throw new Error('thiếu OIDC (permissions: id-token: write)');
  return (token = (await (await fetch(u + '&audience=lexkite-lexai', { headers: { Authorization: 'Bearer ' + t } })).json()).value);
}
let calls = 0, fails = 0, shown = 0;
const stat = { gen: 0, tr: 0, judged: 0, low: 0 };
async function call(mode, lang, list) {
  calls++;
  if (DRY) { console.log(`[dry] ${mode} ${lang} ${list.map(x => x.k).join(' ')}`.slice(0, 160)); return null; }
  for (let i = 0; i < 3; i++) {
    const r = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + await oidc(), 'User-Agent': 'lexkite-ci' }, body: JSON.stringify({ mode, lang, items: list }) }).catch(() => null);
    if (r && r.ok) { fails = 0; return (await r.json()).out || {}; }
    if (r && r.status === 401) token = '';
    await new Promise(s => setTimeout(s, 6000 * (i + 1)));
  }
  fails++; return null;
}
const str = (v, n) => typeof v === 'string' && v.trim() && v.length <= n ? v.trim() : '';
// kiểm khuôn: đủ ghi chú cho MỌI phương án nhiễu, mẫu có [đáp án]
function okText(o, alts) {
  if (!o || !str(o.why, 400) || !str(o.hook, 300) || !o.wrong || typeof o.wrong !== 'object') return null;
  const wrong = {}; for (const a of alts) { const v = str(o.wrong[a], 300); if (!v) return null; wrong[a] = v; }
  return { why: o.why.trim(), hook: o.hook.trim(), wrong };
}
const ALL = items(SET), live = new Set(ALL.map(x => x.id));
for (const id of Object.keys(DB)) if (!live.has(id)) delete DB[id]; // câu đã xoá khỏi ngân hàng
const loop = async (todo, size, fn) => { for (let i = 0; i < todo.length && calls < CALLS && fails < 3; i += size) await fn(todo.slice(i, i + size)); };
const brief = x => ({ k: x.id, type: x.type, s: x.s, ans: x.ans, alts: x.alts, ctx: x.ctx });

// 1) sinh bản tiếng Anh (câu đổi nội dung → làm lại)
await loop(ALL.filter(x => !DB[x.id] || DB[x.id].sig !== sig(x)), 6, async b => {
  const out = await call('xgen', 'en', b.map(brief)); if (!out) return;
  if (!shown++) console.log('mẫu trả về:', JSON.stringify(out).slice(0, 700));
  for (const x of b) {
    const o = out[x.id], en = okText(o, x.alts), p = o && str(o.p, 120), ex = o && Array.isArray(o.ex) ? o.ex.map(e => str(e, 200)).filter(Boolean).slice(0, 2) : [];
    if (!en || !p || !p.includes('[') || (SET === 'usage' && !p.toLowerCase().includes('[' + x.ans.toLowerCase().split(' ')[0])) || !ex.length) continue;
    DB[x.id] = { sig: sig(x), p, ex, en, sc: {} }; stat.gen++;
  }
  save();
});
const pack = (x, l) => ({ ...brief(x), p: DB[x.id].p, ex: DB[x.id].ex, ...DB[x.id][l] });
async function judge(l) {
  await loop(ALL.filter(x => DB[x.id] && DB[x.id][l] && DB[x.id].sc[l] == null), 10, async b => {
    const out = await call('xjudge', l, b.map(x => pack(x, l))); if (!out) return;
    for (const x of b) { const s = Math.round(+out[x.id]); if (s >= 1 && s <= 5) { DB[x.id].sc[l] = s; stat.judged++; if (s <= 3) stat.low++; } }
    save();
  });
}
// 2) duyệt bản tiếng Anh  3) từng ngôn ngữ: viết lại + duyệt (chỉ từ bản en đạt ≥ 4)
await judge('en');
for (const l of ONLY) {
  if (calls >= CALLS || fails >= 3) break;
  await loop(ALL.filter(x => DB[x.id] && DB[x.id].sc.en >= 4 && !DB[x.id][l]), 8, async b => {
    const out = await call('xtr', l, b.map(x => ({ k: x.id, ...DB[x.id].en }))); if (!out) return;
    for (const x of b) { const v = okText(out[x.id], x.alts); if (v) { DB[x.id][l] = v; stat.tr++; } }
    save();
  });
  await judge(l);
}
// danh sách duyệt tay: điểm ≤ 3 (không xuất ra web)
const review = [];
for (const [id, d] of Object.entries(DB)) for (const [l, s] of Object.entries(d.sc || {})) if (s <= 3) review.push({ set: SET, id, lang: l, score: s });
if (!DRY) {
  const RF = new URL('../../content/explain/review.json', import.meta.url), old = fs.existsSync(RF) ? JSON.parse(fs.readFileSync(RF, 'utf8')) : [];
  fs.writeFileSync(RF, JSON.stringify([...old.filter(r => r.set !== SET), ...review], null, 1));
}
const ok = l => ALL.filter(x => DB[x.id] && DB[x.id].sc[l] >= 4).length;
console.log(`${SET}: ${ALL.length} câu · en đạt ${ok('en')} · ${ONLY.map(l => `${l} ${ok(l)}`).join(' · ')} · cần duyệt ${review.length}`);
console.log(`lượt này: ${calls} lần gọi · sinh ${stat.gen} · viết lại ${stat.tr} · chấm ${stat.judged} (thấp ${stat.low}) · lỗi liên tiếp ${fails}`);
if (!DRY && calls > 0 && stat.gen + stat.tr + stat.judged === 0) { console.error('✗ explain: không sinh/chấm được mục nào'); process.exit(1); }
