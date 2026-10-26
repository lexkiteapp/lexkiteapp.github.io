#!/usr/bin/env node
// Chủ đề kho từ 20k (docs/LEXICON.md §Chủ đề) – nguồn: content/lexicon/topics.json (miền → chủ đề → tiểu chủ đề = chủ đề × từ loại, tên 15 ngôn ngữ).
// Mỗi mục mở rộng mang `tp` (≤ 2 nút lá "chủ-đề.n|v|d"). Bộ học là DẪN XUẤT (không lưu tay): nút lá < 10 từ gộp vào "chủ-đề.all", vẫn < 10 → chờ (đủ từ lượt sau);
// nút > 60 tách phần theo CEFR → tần suất; trong nút: bộ 10–20 từ, xếp CEFR → tần suất, gom nghĩa gần (Jaccard def/syn/col), 2 từ neo lấy từ 104 bộ hiện có (sets).
//   node scripts/lexicon/expand/topics.mjs [--assign] [--batch <lô>]   gắn tp cho mục chưa có + in/ghi reports/lexicon-topics.json
import fs from 'fs';
import vm from 'vm';
import { ROOT, rd, wr } from '../lib.mjs';
import { VI, SCRIPT } from '../../content-qa/lib.mjs';
import { pathToFileURL } from 'node:url';

export const TAX = () => JSON.parse(rd('content/lexicon/topics.json'));
const CEFR = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'], cr = l => { const i = CEFR.indexOf(String(l || '').toUpperCase().slice(0, 2)); return i < 0 ? 6 : i; };
export const posGroup = p => (p === 'n' ? 'n' : p === 'v' ? 'v' : 'd');

/** tp của 1 mục: chủ đề Gemini (topic, topic2) ∈ cây → lá "chủ-đề.<n|v|d>"; không có/không hợp lệ → xw-everyday (như expandRows) */
export function assignTopics(e, tax = TAX()) {
  const ids = new Set(tax.topics.map(t => t.id)), g = posGroup(e.pos), out = [];
  for (const t of [e.topic, e.topic2]) if (t && ids.has(t) && !out.includes(t + '.' + g)) out.push(t + '.' + g);
  if (!out.length) out.push('xw-everyday.' + g);
  return out.slice(0, tax.rules.maxTopicsPerWord);
}

/** 104 bộ hiện có (web/js/data.js + web/js/lib/*.js) → Map id → [{ word, pos, level }] */
export function existingSets() {
  const box = { console: { log() {}, warn() {}, error() {} }, document: { addEventListener() {}, querySelector() { return null; } }, localStorage: { getItem() { return null; }, setItem() {} } };
  box.window = box.self = box.globalThis = box; vm.createContext(box);
  const files = ['web/js/data.js', ...fs.readdirSync(new URL('web/js/lib/', ROOT)).filter(f => f.endsWith('.js')).sort().map(f => 'web/js/lib/' + f)];
  for (const f of files) { try { vm.runInContext(rd(f), box, { filename: f }); } catch (e) { /* tệp không phải gói từ */ } }
  const T = (box.IELTS_DATA && box.IELTS_DATA.TOPICS) || [];
  return new Map(T.map(t => [t.id, (t.words || []).map(w => ({ word: String(w.word || '').toLowerCase(), pos: String(w.pos || ''), level: w.level || '' }))]));
}

const toks = e => new Set(String([e.def, ...(e.syn || []), ...(e.col || [])].join(' ')).toLowerCase().match(/[a-z]{4,}/g) || []);
const jac = (a, b) => { let n = 0; for (const x of a) if (b.has(x)) n++; return n / (a.size + b.size - n || 1); };
/** Xếp: CEFR → trong cùng bậc chuỗi tham lam theo nghĩa gần (bắt đầu từ tần suất cao nhất) */
export function order(list) {
  const by = new Map(); for (const x of list) { const c = cr(x.e.level); (by.get(c) || by.set(c, []).get(c)).push(x); }
  const out = [];
  for (const c of [...by.keys()].sort((a, b) => a - b)) {
    const rest = by.get(c).map(x => ({ ...x, t: toks(x.e) })).sort((a, b) => (+b.e.z || 0) - (+a.e.z || 0) || a.k.localeCompare(b.k));
    let cur = rest.shift(); out.push(cur);
    while (rest.length) { let bi = 0, bs = -1; rest.forEach((y, i) => { const s = jac(cur.t, y.t); if (s > bs + 1e-9) { bs = s; bi = i; } }); cur = rest.splice(bi, 1)[0]; out.push(cur); }
  }
  return out.map(({ t, ...x }) => x);
}
/** Chia n phần đều trong [lo, hi] (n ≥ lo) */
export function split(arr, lo, hi) { const k = Math.max(1, Math.ceil(arr.length / hi)), out = []; let i = 0; for (let j = 0; j < k; j++) { const n = Math.floor(arr.length / k) + (j < arr.length % k ? 1 : 0); out.push(arr.slice(i, i + n)); i += n; } return out.filter(x => x.length); }

/** entries = [{ k: 'từ#loại', e }] → { nodes, waiting, orphans, stats } */
export function buildTopicSets(entries, tax = TAX(), existing = new Map()) {
  const R = tax.rules, T = new Map(tax.topics.map(t => [t.id, t])), leaves = new Map(), orphans = [];
  for (const x of entries) {
    const tp = (x.e.tp && x.e.tp.length ? x.e.tp : assignTopics(x.e, tax)).filter(id => T.has(id.split('.')[0]));
    if (!tp.length) { orphans.push(x.k); continue; }
    for (const id of tp) (leaves.get(id) || leaves.set(id, []).get(id)).push(x);
  }
  // lá < nodeMin → gộp "chủ-đề.all"; vẫn < nodeMin → chờ
  const nodes = [], waiting = [], small = new Map();
  for (const [id, l] of leaves) { const [t] = id.split('.'); if (l.length >= R.nodeMin) nodes.push({ id, l }); else (small.get(t) || small.set(t, []).get(t)).push(...l); }
  for (const [t, l] of small) if (l.length >= R.nodeMin) nodes.push({ id: t + '.all', l }); else waiting.push(...l.map(x => x.k));
  const used = new Map(), out = [];
  for (const { id, l } of nodes.sort((a, b) => a.id.localeCompare(b.id))) {
    const [t, sub] = id.split('.'), topic = T.get(t), ord = order(l), parts = split(ord, R.nodeMin, R.nodeMax);
    // từ neo: từ đơn quen thuộc của bộ hiện có (bộ chính trước, CEFR thấp trước), mỗi từ neo dùng 1 lần cho tới khi cạn
    const pool = []; topic.sets.forEach((s, si) => { for (const w of existing.get(s) || []) if (/^[a-z]+$/.test(w.word) && (sub === 'all' || posGroup(w.pos) === sub) && !pool.some(p => p.word === w.word)) pool.push({ ...w, si }); });
    pool.sort((a, b) => a.si - b.si || cr(a.level) - cr(b.level) || a.word.localeCompare(b.word));
    parts.forEach((p, pi) => {
      const nid = parts.length > 1 ? `${id}.${pi + 1}` : id, own = new Set(p.map(x => x.e.w));
      const sets = split(p, R.setMin, R.setMax).map((s, si) => {
        const anchors = [];
        for (let lim = 1; lim <= 3 && anchors.length < R.anchors; lim++) for (const w of pool) { if (anchors.length >= R.anchors) break; if (own.has(w.word) || anchors.includes(w.word) || (used.get(w.word) || 0) >= lim) continue; anchors.push(w.word); used.set(w.word, (used.get(w.word) || 0) + 1); }
        return { id: `${nid}#${si + 1}`, words: s.map(x => x.k), anchors };
      });
      out.push({ id: nid, domain: topic.domain, topic: t, sub, n: p.length, sets });
    });
  }
  const per = new Map(); for (const nd of out) for (const s of nd.sets) for (const k of s.words) per.set(k, (per.get(k) || 0) + 1);
  return { nodes: out, waiting, orphans, stats: { words: entries.length, nodes: out.length, sets: out.reduce((a, n) => a + n.sets.length, 0), inSets: per.size, waiting: waiting.length, orphans: orphans.length, domains: [...new Set(out.map(n => n.domain))].length } };
}

/** Lỗi cây + bộ dẫn xuất (test chặn) */
export function validate(res, entries, tax = TAX(), existing = null) {
  const err = [], R = tax.rules, D = new Set(tax.domains.map(d => d.id));
  const names = [...tax.domains.map(d => [d.id, d.name]), ...Object.entries(tax.sub), ...tax.topics.map(t => [t.id, t.name])];
  for (const [id, nm] of names) for (const l of tax.langs) {
    const s = String((nm || {})[l] || '').trim();
    if (!s) err.push(`${id}: thiếu tên ${l}`);
    else if (l !== 'vi' && VI.test(s)) err.push(`${id}: tên ${l} lẫn tiếng Việt`);
    else if (SCRIPT[l] && !SCRIPT[l].test(s)) err.push(`${id}: tên ${l} sai chữ viết`);
  }
  for (const t of tax.topics) { if (!D.has(t.domain)) err.push(`${t.id}: miền ${t.domain} không có`); if (!t.sets.length) err.push(`${t.id}: chưa nối bộ hiện có`); if (existing) for (const s of t.sets) if (!existing.has(s)) err.push(`${t.id}: bộ ${s} không thuộc 104 bộ`); }
  for (const d of D) if (!tax.topics.some(t => t.domain === d)) err.push(`miền ${d} rỗng`);
  for (const n of res.nodes) {
    if (n.n < R.nodeMin || n.n > R.nodeMax) err.push(`nút ${n.id}: ${n.n} từ (cần ${R.nodeMin}–${R.nodeMax})`);
    for (const s of n.sets) { if (s.words.length < R.setMin || s.words.length > R.setMax) err.push(`bộ ${s.id}: ${s.words.length} từ (cần ${R.setMin}–${R.setMax})`); }
  }
  const per = new Map(); for (const n of res.nodes) for (const s of n.sets) for (const k of s.words) per.set(k, (per.get(k) || new Set()).add(n.topic));
  for (const [k, s] of per) if (s.size > R.maxTopicsPerWord) err.push(`${k}: ở ${s.size} chủ đề (> ${R.maxTopicsPerWord})`);
  const wait = new Set(res.waiting); for (const x of entries) if (!per.has(x.k) && !wait.has(x.k)) err.push(`${x.k}: mồ côi (không ở bộ nào, không chờ)`);
  for (const k of res.orphans) err.push(`${k}: tp không thuộc cây chủ đề`);
  return err;
}

/** Mọi mục mở rộng (đã xuất + chờ soát) */
export function allEntries(batch) {
  const dir = f => fs.existsSync(new URL(f, ROOT)) ? fs.readdirSync(new URL(f, ROOT)).filter(x => x.endsWith('.json') && x !== 'topic-sets.json').map(x => f + x) : [];
  const files = [...dir('content/lexicon/expand/'), ...dir('content/lexicon/expand/pending/')].filter(f => !batch || f.endsWith('/' + batch + '.json'));
  return files.map(f => ({ f, J: JSON.parse(rd(f)) })).filter(x => x.J && x.J.items);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const arg = n => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : null; };
  const tax = TAX(), ex = existingSets(), files = allEntries(arg('--batch')), entries = [];
  for (const { f, J } of files) {
    let ch = 0; for (const [k, e] of Object.entries(J.items)) { if (process.argv.includes('--assign') && !(e.tp && e.tp.length)) { e.tp = assignTopics(e, tax); ch++; } entries.push({ k, e }); }
    if (ch) { wr(f, JSON.stringify(J).replace(/,"(?=[^"]+#(n|v|adj|adv)":)/g, ',\n"') + '\n'); console.log(`  ${f}: gắn tp ${ch} mục`); }
  }
  const res = buildTopicSets(entries, tax, ex), err = validate(res, entries, tax, ex);
  const rep = { at: new Date().toISOString(), ...res.stats, errors: err.length, nodes: res.nodes.map(n => ({ id: n.id, n: n.n, sets: n.sets.map(s => s.words.length), anchors: n.sets.map(s => s.anchors) })) };
  fs.mkdirSync(new URL('reports/', ROOT), { recursive: true }); wr('reports/lexicon-topics.json', JSON.stringify(rep, null, 1) + '\n');
  console.log(`${err.length ? '✗' : '✓'} lexicon-topics ${JSON.stringify(res.stats)}${err.length ? '\n  ' + err.slice(0, 15).join('\n  ') : ''}`);
  if (err.length) process.exit(1);
}
