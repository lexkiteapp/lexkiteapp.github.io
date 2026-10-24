#!/usr/bin/env node
// Mở rộng kho từ tới 20k (docs/LEXICON.md §Mở rộng 20k) – việc nền `lexicon-expand` (infra/jobs.json), chạy trên CI, tiếp tục được, idempotent.
//   node scripts/lexicon/expand/job.mjs --candidates <candidates.json> --cmu <cmudict.dict> [--n 400] [--pilot] [--calls 400] [--batch <id>] [--dry]
// Mỗi từ: IPA Mỹ CMUdict (BSD-2) · IPA Anh Wiktionary qua kaikki.org (CC BY-SA 4.0, ghi công) · nghĩa WordNet làm khung
//   → /api/lexai lxgen (Gemini: định nghĩa ≤ B1, 2 ví dụ, cụm, đồng nghĩa, CEFR, chủ đề, vi, lỗi hay gặp vi) → lxtr (13 ngôn ngữ)
//   → 2 giám khảo KHÁC HỌ (gemini + gemma) chấm mục + từng bản dịch + dịch ngược → cổng (scripts/lexicon/expand/lib.mjs gateEntry).
// Đạt → content/lexicon/expand/pending/<lô>.json (CHƯA xuất). Trượt → content/qa/review-queue.json (src lexicon-expand). Không bao giờ xuất thẳng:
// xuất = `promote.mjs` sau khi soát mẫu ≥ 5 % (docs/CONTENT-QA.md lớp 6) → content/lexicon/expand/<lô>.json + content/qa/batches/lx-<lô>.json.
import fs from 'fs';
import { arpaToIpa, badChars } from '../ipa.mjs';
import { ROOT, rd, wr } from '../lib.mjs';
import { gateEntry, doneWords, LANGS, TOPIC_CHOICES, QUEUE } from './lib.mjs';
const arg = (n, d) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : d; };
const N = +arg('--n', 400), CALLS = +arg('--calls', 400), PILOT = process.argv.includes('--pilot'), DRY = process.argv.includes('--dry');
const API = process.env.LEXAI_URL || 'https://lexkite.com/api/lexai';
const BATCH = arg('--batch', new Date().toISOString().slice(0, 10).replace(/-/g, '') + (PILOT ? '-pilot' : ''));
const C = JSON.parse(fs.readFileSync(arg('--candidates'), 'utf8'));
const t0 = Date.now(), stat = { calls: 0, fail: 0, kaikki: 0, ukMiss: 0 };

// ---- chọn từ: nối tiếp (theo tần suất) hoặc pilot rải đều dải tần suất × nhóm WordNet
const done = doneWords();
let pool = C.items.filter(e => !done.has(e.w));
if (PILOT) {
  const by = new Map(); for (const e of pool) { const b = Math.min(5.5, Math.max(2.5, e.band)); (by.get(b) || by.set(b, []).get(b)).push(e); }
  const bands = [...by.keys()].sort((a, b) => b - a), pick = [];
  for (const b of bands) { const l = by.get(b), lx = new Map(); for (const e of l) (lx.get(e.lex) || lx.set(e.lex, []).get(e.lex)).push(e); by.set(b, [...lx.values()]); }
  for (let r = 0; pick.length < N; r++) { let any = false; for (const b of bands) { const groups = by.get(b), g = groups[r % groups.length]; const e = g && g.shift(); if (e) { pick.push(e); any = true; } if (pick.length >= N) break; } if (!any && r > 5000) break; }
  pool = pick;
} else pool = pool.slice(0, N);
console.log(`lexicon-expand ${BATCH}: ${pool.length} từ (đã có ${done.size}) · bands ${JSON.stringify(pool.reduce((o, e) => (o[e.band] = (o[e.band] || 0) + 1, o), {}))}`);

// ---- IPA: CMUdict (Mỹ) + Wiktionary/kaikki (Anh, Mỹ dự phòng)
const CMU = new Map();
for (const l of fs.readFileSync(arg('--cmu'), 'latin1').split('\n')) { const i = l.indexOf(' '); if (i < 0 || l[0] === ';') continue; const w = l.slice(0, i).replace(/\(\d+\)$/, ''); if (!CMU.has(w)) CMU.set(w, l.slice(i + 1).replace(/\s*#.*$/, '')); }
const KPOS = { n: 'noun', v: 'verb', adj: 'adj', adv: 'adv' };
async function kaikki(w, pos) {
  const u = `https://kaikki.org/dictionary/English/meaning/${w[0]}/${w.slice(0, 2)}/${encodeURIComponent(w)}.jsonl`;
  for (let i = 0; i < 3; i++) {
    try { const r = await fetch(u, { headers: { 'User-Agent': 'lexkite-lexicon-expand (lexkite.com)' } }); if (r.status === 404) return {}; if (!r.ok) throw 0; stat.kaikki++;
      const ents = (await r.text()).split('\n').filter(Boolean).map(x => { try { return JSON.parse(x); } catch { return null; } }).filter(Boolean);
      const ord = [...ents.filter(e => e.pos === KPOS[pos]), ...ents.filter(e => e.pos !== KPOS[pos])], pick = re => { for (const e of ord) for (const s of e.sounds || []) if (s.ipa && (s.tags || []).some(t => re.test(t))) return s.ipa; return ''; };
      return { uk: pick(/^(Received-Pronunciation|UK|British)$/), us: pick(/^(General-American|US)$/) };
    } catch { await new Promise(s => setTimeout(s, 1500 * (i + 1))); }
  }
  return {};
}
const clean = s => { s = String(s || '').trim(); const m = /^\/[^/]+\//.exec(s); return m ? m[0].replace(/\./g, '').replace(/ɹ/g, 'r').replace(/ɫ/g, 'l').replace(/ɡ/g, 'g').replace(/ɐ/g, 'ʌ').replace(/ɜ(?!ː)/g, 'ɜː').replace(/ɪə/g, 'ɪə') : ''; };
async function pmap(list, n, f) { const out = []; let i = 0; await Promise.all(Array.from({ length: n }, async () => { while (i < list.length) { const k = i++; out[k] = await f(list[k], k); } })); return out; }
const ipa = await pmap(pool, 6, async e => { const k = await kaikki(e.w, e.pos); const cmu = CMU.get(e.w); const us = cmu ? '/' + arpaToIpa(cmu) + '/' : clean(k.us); if (!k.uk) stat.ukMiss++; return { uk: clean(k.uk), us, ukSrc: k.uk ? 'wiktionary' : '' }; });

// ---- AI qua /api/lexai (OIDC GitHub)
let token = '';
async function oidc() { if (token) return token; const u = process.env.ACTIONS_ID_TOKEN_REQUEST_URL, t = process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN; if (!u || !t) throw new Error('thiếu OIDC (permissions: id-token: write)'); token = (await (await fetch(u + '&audience=lexkite-lexai', { headers: { Authorization: 'Bearer ' + t } })).json()).value; return token; }
const MODELS = { lxgen: ['gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-3-flash-preview', 'gemini-3.8-flash'], lxtr: ['gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-3-flash-preview', 'gemini-3.8-flash'] };
async function call(mode, items, model) {
  const ms = model ? [model] : MODELS[mode];
  for (let i = 0; i < 4; i++) {
    if (stat.calls >= CALLS) return null; stat.calls++;
    const r = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + await oidc(), 'User-Agent': 'lexkite-ci' }, body: JSON.stringify({ mode, items, model: ms[i % ms.length] }) }).catch(() => null);
    if (r && r.ok) { const j = await r.json(); return { out: j.out || {}, model: j.model }; }
    stat.fail++; if (r && r.status === 401) token = '';
    const d = r ? await r.text().catch(() => '') : 'net'; console.log(`  ${mode} ${r && r.status} ${String(d).slice(0, 160)}`);
    await new Promise(s => setTimeout(s, 6000 * (i + 1)));
  }
  return null;
}
const items = pool.map((e, i) => ({ k: e.w + '#' + e.pos, w: e.w, pos: e.pos, gloss: e.gloss, cefr: e.cefr, lex: e.lex, topics: TOPIC_CHOICES, _c: e, _ipa: ipa[i] }));
const chunks = (a, n) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n));
const strip = x => { const { _c, _ipa, ...r } = x; return r; };
if (DRY) { console.log(JSON.stringify(items.slice(0, 3).map(strip)), stat); process.exit(0); }
const G = {}, T = {}, JA = {}, JB = {}; let mGen = '', mA = '', mB = '';
await pmap(chunks(items, 10), 3, async ch => { const r = await call('lxgen', ch.map(strip)); if (r) { mGen = r.model; for (const x of ch) if (r.out[x.k]) G[x.k] = r.out[x.k]; } });
const kept = items.filter(x => G[x.k] && G[x.k].keep !== false && G[x.k].def);
await pmap(chunks(kept, 10), 3, async ch => { const r = await call('lxtr', ch.map(x => ({ k: x.k, w: x.w, pos: G[x.k].pos || x.pos, def: G[x.k].def, ex: G[x.k].ex || [] }))); if (r) for (const x of ch) if (r.out[x.k]) T[x.k] = r.out[x.k]; });
const forJudge = x => ({ k: x.k, w: x.w, pos: G[x.k].pos || x.pos, gloss: x.gloss, def: G[x.k].def, ex: G[x.k].ex, col: G[x.k].col, syn: G[x.k].syn, cefr: G[x.k].cefr, vi: G[x.k].vi, note_vi: G[x.k].note_vi, tr: T[x.k] || {} });
const judged = kept.filter(x => T[x.k]);
await pmap(chunks(judged, 10), 2, async ch => {
  const [a, b] = await Promise.all([call('lxjudge', ch.map(forJudge), 'gemini-3.5-flash'), call('lxjudge', ch.map(forJudge), 'gemma-3-27b-it')]);
  if (a) { mA = a.model; for (const x of ch) if (a.out[x.k]) JA[x.k] = a.out[x.k]; }
  if (b) { mB = b.model; for (const x of ch) if (b.out[x.k]) JB[x.k] = b.out[x.k]; }
});

// ---- cổng + ghi
const PEND = `content/lexicon/expand/pending/${BATCH}.json`;
const pend = fs.existsSync(new URL(PEND, ROOT)) ? JSON.parse(rd(PEND)) : { id: BATCH, at: new Date().toISOString(), items: {} };
const queue = fs.existsSync(new URL(QUEUE, ROOT)) ? JSON.parse(rd(QUEUE)) : { _doc: 'Hàng duyệt nội dung (docs/CONTENT-QA.md): mục KHÔNG đạt cổng – không xuất.', items: [] };
const why = {};
for (const x of items) {
  const g = G[x.k], c = x._c;
  const ent = g ? { w: x.w, pos: g.pos || x.pos, ipa: x._ipa.uk, ipaUS: x._ipa.us, def: g.def || '', ex: g.ex || [], col: g.col || [], syn: g.syn || [], level: g.cefr || c.cefr, cefrF: c.cefr, z: c.z, emoji: g.emoji || '', topic: g.topic || '', vi: g.vi || '', note_vi: g.note_vi || '', m: T[x.k] || {},
    src: { freq: 'wordfreq-3.1', sense: 'wordnet-3.0:' + c.syn, ipaUS: CMU.has(x.w) ? 'cmudict' : 'wiktionary', ipaUK: x._ipa.ukSrc, gen: mGen }, qa: {} } : null;
  if (ent) { const a = JA[x.k], b = JB[x.k]; ent.qa = { j: { ...(a ? { ['gemini:' + mA]: +a.s } : {}), ...(b ? { ['gemma:' + mB]: +b.s } : {}) }, f: [a && a.f, b && b.f].filter(Boolean), tr: {}, bt: null };
    for (const l of LANGS) ent.qa.tr[l] = [a && a.tr && +a.tr[l], b && b.tr && +b.tr[l]].filter(Number.isFinite);
    ent.qa.btw = Object.fromEntries(LANGS.map(l => [l, [a && a.bt && a.bt[l], b && b.bt && b.bt[l]].filter(Boolean)])); }
  const r = gateEntry(ent, { keep: g ? g.keep !== false : null, keepWhy: g && g.why });
  if (r.ok) { ent.qa.bt = r.bt; delete ent.qa.btw; pend.items[x.k] = ent; }
  else { why[r.why[0].split(':')[0]] = (why[r.why[0].split(':')[0]] || 0) + 1; queue.items = queue.items.filter(q => !(q.src === 'lexicon-expand' && q.id === x.k)); queue.items.push({ src: 'lexicon-expand', id: x.k, batch: BATCH, why: r.why.slice(0, 4), at: new Date().toISOString().slice(0, 10), ...(ent ? { data: ent } : {}) }); }
}
pend.n = Object.keys(pend.items).length;
fs.mkdirSync(new URL('content/lexicon/expand/pending/', ROOT), { recursive: true });
wr(PEND, JSON.stringify(pend, null, 0).replace(/,"(?=[^"]+#(n|v|adj|adv)":)/g, ',\n"') + '\n');
wr(QUEUE, JSON.stringify(queue, null, 1) + '\n');
const sec = (Date.now() - t0) / 1000, pass = Object.keys(pend.items).length;
const rep = { batch: BATCH, n: items.length, pass, review: items.length - pass, why, calls: stat.calls, fail: stat.fail, ukMiss: stat.ukMiss, sec: Math.round(sec), perHour: Math.round(items.length / sec * 3600), models: { gen: mGen, a: mA, b: mB } };
fs.mkdirSync(new URL('reports/', ROOT), { recursive: true }); wr('reports/lexicon-expand.json', JSON.stringify(rep, null, 1));
console.log('✓ lexicon-expand ' + JSON.stringify(rep));
if (!pass) { console.error('✗ lexicon-expand: 0 mục đạt'); process.exit(1); }
