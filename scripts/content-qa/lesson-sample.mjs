#!/usr/bin/env node
// Lấy mẫu phân tầng nội dung người học đang thấy (đã có trên main) để chấm mù (docs/research/lesson-qa-1511.md).
// Dùng: node scripts/content-qa/lesson-sample.mjs --seed 1 --out DIR [--per 600]
// Ra: DIR/items.jsonl (đầy đủ, có nguồn) + DIR/batch-NN.json (bản mù: id + loại + nội dung, KHÔNG có nguồn/đáp án chấm sẵn).
// Chỉ đọc, chạy nhanh trên Mac (không mạng). Cùng --seed → cùng mẫu.
import fs from 'node:fs';
import path from 'node:path';
import { loadScripts } from './lesson-load.mjs';
import { loadAll } from '../lexicon/lib.mjs';

const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const seed = +arg('seed', 1), out = arg('out', 'lesson-qa-sample'), TOTAL = +arg('per', 600);
const LANGS = ['ar', 'de', 'es', 'fr', 'hi', 'id', 'ja', 'ko', 'pt', 'ru', 'th', 'tr', 'zh'];
const ROOT = process.cwd();
const R = p => path.join(ROOT, p);
let s = seed * 2654435761 >>> 0;
const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const lvOf = l => (String(l || '').match(/[ABC][12]/) || [''])[0] || '?';
// lấy n mục phân tầng theo khoá strat(x) (vòng tròn qua các tầng)
function strat(arr, n, key) {
  const m = new Map(); for (const x of shuffle(arr)) { const k = key(x); (m.get(k) || m.set(k, []).get(k)).push(x); }
  const q = [...m.values()], res = [];
  while (res.length < n && q.some(b => b.length)) for (const b of q) { if (b.length && res.length < n) res.push(b.shift()); }
  return res;
}
const ls = d => fs.readdirSync(R(d)).filter(f => f.endsWith('.js')).map(f => d + '/' + f);
const items = [];
const add = (kind, lv, lang, src, body) => items.push({ kind, lv: lvOf(lv), lang, src, body });
const share = f => Math.round(TOTAL * f);

// ---- 1. Ngữ pháp: quiz + drill (EN + giải thích tiếng Việt) ----
{
  const g = loadScripts([...['starter', 'starter2', 'book2', 'academic', 'mastery', 'drills-c'].map(f => `web/cpack/grammar/${f}.js`)], ROOT);
  const pool = [];
  for (const L of g.GRAMMAR || []) {
    (L.quiz || []).forEach((q, i) => pool.push({ L, t: 'quiz', q, i }));
    (L.drills || []).forEach((q, i) => pool.push({ L, t: 'drill', q, i }));
  }
  for (const x of strat(pool, share(0.2), x => x.L.level + x.t)) {
    add('grammar-' + x.t, x.L.level, 'vi', `grammar:${x.L.id}#${x.t}${x.i}`, { lesson: x.L.en, ...x.q });
  }
}
// ---- 2. Gold: câu sai/đúng + ví dụ + lý do ----
{
  const g = loadScripts(['web/cpack/lesson/gold.js'], ROOT), pool = [];
  for (const [w, arr] of Object.entries(g.LESSON_GOLD || {})) arr.forEach((e, i) => pool.push({ w, i, e }));
  for (const x of strat(pool, share(0.08), () => 1)) add('gold', '?', 'en', `gold:${x.w}#${x.i}`, { word: x.w, ...x.e });
}
// ---- 3. Nhập vai (từng lượt) ----
{
  const g = loadScripts(['web/cpack/roleplay/data-lot1.js', 'web/cpack/roleplay/data-lot2.js'], ROOT), pool = [];
  for (const r of g.ROLEPLAY || []) (r.turns || []).forEach((t, i) => pool.push({ r, t, i }));
  for (const x of strat(pool, share(0.07), x => (x.r.lv || [])[0])) add('roleplay', (x.r.lv || [])[0], 'en', `roleplay:${x.r.id}#${x.i}`, { scene: x.r.title, you: x.r.you, turn: x.t });
}
// ---- 4. Speaking mẫu ----
{
  const g = loadScripts(ls('web/cpack/speak').filter(f => !f.includes('/s/')), ROOT), pool = Object.entries(g.SPEAK_SAMPLES || {});
  for (const [q, v] of strat(pool, share(0.05), () => 1)) add('speaking', '?', 'en', `speak:${q.slice(0, 40)}`, { question: q, ...v });
}
// ---- 5. Truyện + câu hỏi + ghép nghĩa 13 ngôn ngữ ----
{
  const g = loadScripts(['web/cpack/lesson/stories.js'], ROOT), pool = [], mpool = [];
  for (const st of g.LESSON_STORIES || []) for (const [i, c] of (st.checks || []).entries()) {
    if (c.type === 'q') pool.push({ st, c, i });
    if (c.type === 'match') for (const p of c.pairs || []) mpool.push({ st, p });
  }
  for (const x of strat(pool, share(0.05), x => x.st.cefr)) add('story-q', x.st.cefr, 'en', `story:${x.st.id}#${x.i}`, { story: x.st.lines.map(l => `${l.who}: ${l.en}`).join(' / '), ...x.c });
  // ghép nghĩa: mỗi cặp chấm 2 ngôn ngữ ngẫu nhiên, phủ đủ 13+vi
  const per = share(0.1);
  let li = Math.floor(rnd() * 14);
  for (const x of shuffle(mpool).slice(0, per)) {
    const langs = Object.keys(x.p.m || {}).filter(l => l !== 'en');
    const l = langs.length ? langs[li++ % langs.length] : null; if (!l) continue;
    add('match-tr', x.st.cefr, l, `story:${x.st.id}#match`, { en: x.p.en, gloss: x.p.m.en, lang: l, translation: x.p.m[l] });
  }
}
// ---- 6. Đề: nghe, đọc, Cambridge ----
{
  const pre = path.join(path.dirname(out), '.pre.js'); fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
  const tmp = path.join(fs.mkdtempSync(path.join(process.env.TMPDIR || '/tmp', 'lq-')), 'pre.js');
  fs.writeFileSync(tmp, `self.LTI=Array(40).fill('(instruction)');self.RTI=Array(40).fill('(instruction)');`);
  const g = loadScripts([tmp, ...ls('web/cpack/listen'), ...ls('web/cpack/readtest').map(f => f), ...[1, 2, 3].flatMap(n => ['a2', 'b1', 'b2', 'c1', 'c2'].map(l => `web/cpack/cambridge/${l}/t${n}.js`).filter(f => fs.existsSync(R(f))))].map(f => (f === tmp ? f : R(f))), '/');
  const pool = [];
  for (const t of g.LISTENING || []) for (const gr of t.groups || []) for (const it of gr.items || []) pool.push({ k: 'listen', lv: t.level, id: t.id, it, ctx: t.context });
  for (const t of g.READTESTS || []) for (const p of t.passages || []) for (const gr of p.groups || []) for (const it of gr.items || []) pool.push({ k: 'readtest', lv: p.level, id: t.id + '-p' + p.n, it, ctx: p.title });
  for (const t of g.CAMBRIDGE || []) for (const p of (t.rw && t.rw.parts) || []) for (const it of p.items || []) pool.push({ k: 'cambridge', lv: t.level, id: t.id, it, ctx: p.instr });
  for (const x of strat(pool, share(0.1), x => x.k + x.lv)) add('exam-' + x.k, x.lv, 'en', `exam:${x.id}`, { context: x.ctx, ...x.it });
}
// ---- 7. Từ vựng: IPA UK/US + nghĩa vi + ví dụ + 1 bản dịch ngôn ngữ khác ----
{
  const all = loadAll().filter(e => /^[ABC][12]$/.test(e.row[8]));
  const packs = Object.fromEntries(LANGS.map(l => [l, JSON.parse(fs.readFileSync(R(`web/packs/${l}.json`), 'utf8'))]));
  let li = Math.floor(rnd() * 13);
  for (const e of strat(all, share(0.18), e => e.row[8] + e.row[2])) {
    const r = e.row, ls2 = [LANGS[li++ % 13], LANGS[li++ % 13]], tr = {};
    for (const l of ls2) { const v = packs[l][r[0]]; if (v) tr[l] = v[0]; }
    add('vocab', r[8], ls2.join('+'), `lex:${e.file}:${e.line}`, { word: r[0], pos: r[2], ipaUK: r[1], ipaUS: r[10] || '(same)', vi: r[3], def: r[4], example: r[5], translations: tr });
  }
}
// ---- 8. Dịch giao diện/giải thích: 13 ngôn ngữ (xưng hô: de Sie, es tú, fr vous…) ----
{
  const per = share(0.17), perLang = Math.ceil(per / 13);
  for (const l of LANGS) {
    const c = JSON.parse(fs.readFileSync(R(`web/i18n/content/${l}.json`), 'utf8'));
    const pool = Object.entries(c).filter(([k, v]) => typeof v === 'string' && k.length > 25 && /[à-ỹĐđ]/i.test(k));
    for (const [k, v] of shuffle(pool).slice(0, perLang)) add('i18n-ui', '?', l, `i18n:${l}:${k.slice(0, 30)}`, { vi_source: k, lang: l, translation: v });
  }
  // lỗi hay gặp theo tiếng mẹ đẻ
  for (const l of LANGS) {
    try {
      const g = loadScripts([`web/cpack/grammar-l1/${l}.js`], ROOT), n = (g.GRAMMAR_L1 || {}).notes || {}, pool = Object.entries(n).flatMap(([id, a]) => a.map(x => ({ id, x })));
      for (const e of shuffle(pool).slice(0, 3)) add('l1-note', '?', l, `l1:${l}:${e.id}`, { wrong: e.x[0], right: e.x[1], explanation_in_lang: e.x[2], lang: l });
    } catch { /* ngôn ngữ chưa có */ }
  }
}

// ---- chia lô mù ----
fs.mkdirSync(out, { recursive: true });
const all = shuffle(items).map((it, i) => ({ id: 'I' + String(i + 1).padStart(3, '0'), ...it }));
fs.writeFileSync(path.join(out, 'items.jsonl'), all.map(x => JSON.stringify(x)).join('\n') + '\n');
const B = 30, nb = Math.ceil(all.length / B);
for (let b = 0; b < nb; b++) fs.writeFileSync(path.join(out, `batch-${String(b + 1).padStart(2, '0')}.json`), JSON.stringify(all.slice(b * B, b * B + B).map(x => ({ id: x.id, kind: x.kind, level: x.lv, lang: x.lang, content: x.body })), null, 1));
const by = {}; for (const x of all) by[x.kind] = (by[x.kind] || 0) + 1;
console.log(`seed ${seed}: ${all.length} mục, ${nb} lô`, JSON.stringify(by));
