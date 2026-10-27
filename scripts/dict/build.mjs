#!/usr/bin/env node
// 📖 Dữ liệu + tầng tĩnh cho trang từ điển Lexkite (docs/SEO-DICT-PAGES.md). Chạy trên CI (.github/workflows/dict-pages.yml), không trong build Pages.
// CHỈ ĐỌC nguồn của app: kho từ (web/js/data.js + lib, như trình duyệt), ghi chú vi (web/js/notes), "Cách dùng từ" (web/js/usage), âm thanh (audioKey),
// bài blog đã đăng (content/blog/<lang>/*.md). Ghi vào DICT_OUT (mặc định dist-dict, gitignore):
//   data/v1/<lang>/<slug>.json  – JSON từng từ (đẩy lên R2 lexkite-dict-data; Worker dựng trang đuôi dài từ đây)
//   data/v1/shell.json          – khung chung (CSS/header/footer/JS) cho Worker · data/v1/manifest.json – slug + băm (đẩy R2 chỉ file đổi)
//   assets/<lang>/<path>/<slug>/index.html – tầng tĩnh (Workers Static Assets, miễn phí không tính lượt) · hub · sitemap-dict-<lang>-<n>.xml · _headers
//   report.json                 – điểm chất lượng, ứng viên index, số liệu cho chủ duyệt
// Biến: DICT_N (200 từ – tập được phép index theo bậc stage.json), DICT_POOL (POOL – tổng số trang dựng, noindex ngoài DICT_N), DICT_STATIC_N (số trang/ngôn ngữ dựng tĩnh, mặc định = tất cả), DICT_INDEX ('' = noindex hết – MẶC ĐỊNH; xem render.mjs parseOpen).
import fs from 'node:fs'; import path from 'node:path'; import vm from 'node:vm'; import crypto from 'node:crypto'; import { execFileSync } from 'node:child_process'; import { pathToFileURL } from 'node:url';
import { loadBrowserIndex } from '../lexicon/shards.mjs';
import { loadVocab } from '../lib/seo-data.mjs';
import { CSS, SEO_CSS, UI_JS, siteHeader, siteFooter, appHref, landingHref } from '../lib/site-layout.mjs';
import { toolPath, toolStrings } from '../lib/tools-links.mjs';
import { DICT_PATH as T_ALL, ENABLED, T, SITE, hubPath, wordPath, letterPath, slugOf, renderWord, renderHub, renderSitemap, parseOpen, isIndexable } from '../../workers/dict/render.mjs';

const VI_RE = /[ăâđêôơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]/i; // nhãn soạn tiếng Việt trong "Cách dùng từ" → không lọt sang trang en
export const QUALITY_MIN = 70, WORDS_MIN = 150; // ngưỡng ứng viên index (§5) – chỉ được TĂNG
export const POOL = 5000; // tập trang dựng sẵn (noindex ngoài N của bậc hiện tại) – từ phổ biến theo tần suất NGSL + CEFR A1–B2, có đủ dữ liệu tự soạn + audio
const J = f => JSON.parse(fs.readFileSync(f, 'utf8'));
const hash = s => crypto.createHash('sha1').update(s).digest('hex');
const gpos = p => { p = String(p || '').toLowerCase(); return /^(n|noun)\b/.test(p) ? 'n' : /^(phr ?v|phrasal)/.test(p) ? 'phrv' : /^(v|verb)\b/.test(p) ? 'v' : /^adj/.test(p) ? 'adj' : /^adv/.test(p) ? 'adv' : /^idiom/.test(p) ? 'idiom' : /^(phr|phrase|expr)/.test(p) ? 'phr' : /^prep/.test(p) ? 'prep' : /^conj/.test(p) ? 'conj' : /^pron/.test(p) ? 'pron' : /^det/.test(p) ? 'det' : p; };
const gitDate = (...f) => { try { return execFileSync('git', ['log', '-1', '--format=%cs', '--', ...f], { encoding: 'utf8' }).trim() || new Date().toISOString().slice(0, 10); } catch { return new Date().toISOString().slice(0, 10); } };

// ---------- Nguồn ----------
function loadSources() {
  const { INDEX } = loadBrowserIndex();
  const { audioKey } = loadVocab();
  const notes = {}; for (const f of fs.readdirSync('web/js/notes').filter(f => f.endsWith('.json'))) Object.assign(notes, J('web/js/notes/' + f));
  const ctx = {}; ctx.self = ctx; vm.createContext(ctx);
  const run = f => vm.runInContext(fs.readFileSync(f, 'utf8'), ctx, { filename: f });
  run('web/js/verbs-core.js'); run('web/js/usage-core.js'); for (const f of fs.readdirSync('web/js/usage').filter(f => f.endsWith('.js')).sort()) run('web/js/usage/' + f);
  const U = ctx.LK_USAGE, usage = new Map();
  for (const k of U.KINDS) for (const e of U.load(k)) for (const w of U.words(e)) (usage.get(w) || usage.set(w, []).get(w)).push(e);
  const now = Date.now(), blog = {};
  for (const l of ENABLED) {
    const dir = `content/blog/${l}`; blog[l] = [];
    for (const f of fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => f.endsWith('.md')) : []) {
      const s = fs.readFileSync(path.join(dir, f), 'utf8'), fm = (s.match(/^---\n([\s\S]*?)\n---/) || [])[1]; if (!fm) continue;
      const g = k => ((fm.match(new RegExp(`^${k}:\\s*(.*)$`, 'm')) || [])[1] || '').trim().replace(/^"(.*)"$/, '$1');
      const at = Date.parse(g('publishAt')); if (g('status') !== 'ready' || !(at <= now) || !g('slug')) continue; // chỉ bài ĐÃ đăng → không link 404
      blog[l].push({ t: g('title'), slug: g('slug'), kw: g('keyword').toLowerCase(), tags: g('tags').replace(/[[\]]/g, '').toLowerCase().split(/\s*,\s*/), body: s.slice(fm.length + 8).toLowerCase() });
    }
  }
  // Kho câu tự soạn của app (ví dụ mọi mục kho từ + "Cách dùng từ") → thêm ví dụ thật cho từ ít ví dụ; chỉ mục theo token
  const corpus = new Map(), addS = s => { if (!s || s.length < 25 || s.length > 130 || VI_RE.test(s)) return; for (const t of new Set(s.toLowerCase().match(/[a-z]+/g) || [])) { const a = corpus.get(t) || corpus.set(t, []).get(t); if (a.length < 40 && !a.includes(s)) a.push(s); } };
  for (const e of Object.values(INDEX)) if (e) addS(e.ex);
  for (const k of U.KINDS) for (const e of U.load(k)) for (const x of e.items || []) for (const q of x.ex || []) addS(U.example(q).text);
  for (const a of corpus.values()) a.sort((x, y) => x.length - y.length || x.localeCompare(y));
  const wn = fs.existsSync('content/dict/wordnet.json') ? J('content/dict/wordnet.json').words : {}; // Open English WordNet (CC BY 4.0) – scripts/dict/wordnet.mjs
  return { INDEX, audioKey, notes, U, usage, blog, corpus, wn };
}

// ---------- Chọn từ: từ đơn thông dụng (NGSL/A1–B1) có đủ dữ liệu tự soạn ----------
const LV = { A1: 3, A2: 3, B1: 2, B2: 1 };
function select(src, n) {
  const { INDEX, audioKey, notes, usage } = src;
  const ok = e => e && /^[a-z]{3,}$/.test(e.word) && e.def && e.ex && e.vi && e.ipa && audioKey(e.word) && LV[String(e.level).toUpperCase()];
  const sc = e => LV[String(e.level).toUpperCase()] + (/^ngsl/.test(e.topic || '') ? 3 : 0) + (usage.has(e.word) ? 3 : 0) + (notes[e.word] ? 2 : 0) + ((e.col || []).length ? 1 : 0) + ((e.syn || []).length ? 1 : 0);
  return Object.values(INDEX).filter(ok).sort((a, b) => sc(b) - sc(a) || a.word.localeCompare(b.word)).slice(0, n).sort((a, b) => a.word.localeCompare(b.word));
}
// Từ có trang từ điển (pool, theo dữ liệu hiện tại) – cho hộp liên kết trong bài blog (scripts/dict/links.mjs)
let POOL_CACHE = null;
export function dictPool(n = POOL) { return (POOL_CACHE ||= select(loadSources(), n).map(e => ({ word: e.word, vi: e.vi, def: e.def }))); }
// Tập trang dựng (pool) ⊇ tập được index (top n theo cùng thứ tự select → n của bậc stage.json không đổi nghĩa khi pool lớn lên)
function selectPool(src, n, pool) { const all = select(src, Math.max(n, pool)), top = new Set(select(src, n).map(e => e.word)); return { list: all, top }; }

// ---------- Một từ → JSON theo ngôn ngữ ----------
function seeded(word) { let x = parseInt(hash(word).slice(0, 8), 16); return () => (x = (x * 1103515245 + 12345) >>> 0) / 2 ** 32; }
function shuffle(arr, rnd) { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

function entryJson(src, e, l, ctx) {
  const { U, usage, notes, audioKey, INDEX, blog } = src, w = e.word, k = w.toLowerCase(), pos = gpos(e.pos), rnd = seeded(l + w);
  const inSet = ctx.bySlug, href = x => { const s = slugOf(x); return inSet.has(s) ? wordPath(l, s) : ''; };
  const meaning = l === 'vi' ? e.vi : e.def, m = x => (l === 'vi' ? x.vi || x.en : x.en || x.vi) || '';
  const ux = usage.get(k) || [], exText = s => U.example(s).text;
  const examples = [e.ex], addEx = s => { if (s && examples.length < 6 && !examples.includes(s) && new RegExp(`\\b${k}`, 'i').test(s)) examples.push(s); };
  const patterns = [], confus = [], mistakes = [], col = [...(e.col || [])];
  for (const u of ux) {
    if (u.kind === 'c') confus.push({ items: u.items.map(x => ({ h: l === 'vi' ? x.h : x.h.replace(/\s*\(([^)]*)\)/, (_, a) => (VI_RE.test(a) ? ` (${a.split(',')[0].trim()})` : ` (${a})`)), m: m(x), ex: x.ex[0] ? exText(x.ex[0]) : '' })), tip: (u.notes[0] && (l === 'vi' ? u.notes[0].vi : u.notes[0].en)) || '' }); // href thêm sau khi có cHref
    else if (u.kind === 'p' || u.kind === 'v') for (const x of u.items.slice(0, 4)) { patterns.push({ h: u.kind === 'p' ? `${u.key} ${x.h}` : `${u.key} + ${x.h}`, m: m(x), ex: x.ex[0] ? exText(x.ex[0]) : '' }); x.ex.forEach(s => addEx(exText(s))); }
    for (const x of u.mis || []) if (mistakes.length < 3) mistakes.push({ w: x.w, r: x.r, why: l === 'vi' ? x.vi : x.en });
    for (const c of u.col || []) if (!col.includes(c)) col.push(c);
  }
  for (const p of ctx.phrases.get(k) || []) { if (col.length < 10 && !col.includes(p.word)) col.push(p.word); addEx(p.ex); }
  for (const t of [k, k + 's', k + 'es', k + 'ed', k + 'd', k + 'ing']) for (const s of src.corpus.get(t) || []) addEx(s); // câu tự soạn khác của app có chứa từ
  const wn = (src.wn[k] && src.wn[k][pos]) || {}, chip = x => ({ w: x, href: href(x) });
  const syn = [...new Set([...(e.syn || []), ...(wn.syn || [])])].slice(0, 8).map(chip);
  const wnS = (wn.s || []).filter(([g]) => g && g.toLowerCase() !== String(e.def).toLowerCase()).map(([g, x]) => ({ g, x }));
  const ts = toolStrings(l), lvU = String(e.level || '').toUpperCase();
  const tools = ts ? [ts.levels && ts.levels[lvU] && [toolPath(l, 'test', lvU), fill(ts.level.h1, { lv: lvU, name: ts.levels[lvU].name })], [toolPath(l, 'test'), ts.nav.levelTest], [toolPath(l, 'toeic'), ts.nav.toeic]].filter(Boolean).map(([href, t]) => ({ href, t })) : [];
  const cHref = h => href(String(h).split(/[\s(]/)[0]);
  const related = ctx.list.filter(x => x !== e && x.topic === e.topic).slice(0, 8);
  const i = ctx.list.indexOf(e); for (const x of ctx.list.slice(Math.max(0, i - 4), i + 5)) if (related.length < 8 && x !== e && !related.includes(x)) related.push(x);
  // Bài blog liên quan: tiêu đề/từ khoá/thẻ nhắc từ, hoặc thân bài nhấn *từ* (đang bàn về chính từ này)
  const re = new RegExp(`(^|[^a-z])${k}([^a-z]|$)`);
  const blogs = blog[l].map(b => ({ b, s: (re.test(b.t.toLowerCase()) || re.test(b.kw) ? 3 : 0) + (b.tags.includes(k) ? 2 : 0) + (b.body.includes(`*${k}*`) ? 1 : 0) })).filter(x => x.s).sort((a, b) => b.s - a.s || a.b.slug.localeCompare(b.b.slug)).slice(0, 3).map(({ b }) => ({ t: b.t, href: `/${l}/blog/${b.slug}/` }));
  // Kiểm tra nhanh (0 JS, đáp án trong <details>): nghĩa · điền chỗ trống · câu đúng
  const quiz = [], same = ctx.list.filter(x => x !== e && gpos(x.pos) === pos);
  const pool = (same.length >= 3 ? same : ctx.list.filter(x => x !== e));
  const seenM = new Set([meaning]), d3 = shuffle(pool, rnd).filter(x => { const v = l === 'vi' ? x.vi : x.def; return !seenM.has(v) && seenM.add(v); }).slice(0, 3); // 4 lựa chọn khác nghĩa nhau (pool lớn có từ trùng nghĩa)
  if (d3.length === 3) { const o = shuffle([meaning, ...d3.map(x => (l === 'vi' ? x.vi : x.def))], rnd); quiz.push({ q: fill(T[l].qMean, { w }), o, a: o.indexOf(meaning), oEn: l === 'en' }); }
  const gap = examples.map(s => [s, s.match(new RegExp(`\\b(${k}s?)\\b`, 'i'))]).find(([, mm]) => mm);
  if (gap) { const [s, mm] = gap, form = mm[1].toLowerCase(), suf = form.slice(k.length), o = shuffle([form, ...shuffle(pool, rnd).slice(0, 3).map(x => x.word + suf)], rnd); quiz.push({ q: T[l].qGap, s: s.replace(mm[0], '_____'), o, a: o.indexOf(form), oEn: true }); }
  if (mistakes[0]) { const o = shuffle([mistakes[0].r, mistakes[0].w], rnd); quiz.push({ q: T[l].qRight, o, a: o.indexOf(mistakes[0].r), oEn: true }); }
  const note = l === 'vi' && notes[k] ? Object.fromEntries(['m', 'e', 'u', 'f'].filter(q => notes[k][q]).map(q => [q, notes[k][q]])) : null;
  // trang web mở sẵn mọi mục (đọc đủ + máy tìm kiếm thấy hết); app mặc định chỉ mở "Mẹo nhớ"
  const noteHtml = note ? wordCard().notes(notes[k], w).replace(/<details class="(wc-sec[^"]*)" data-wc="(\w)">/g, '<details class="$1" data-wc="$2" open>') : '';
  const d = { v: 1, lang: l, slug: slugOf(w), word: w, pos, level: e.level, emoji: e.emoji || '', usage: usage.has(k), ipa: e.ipa, ipaUS: e.ipaUS || (src.wn[k] && src.wn[k].us) || '', audio: audioKey(w), meaning, def: e.def, examples, col: col.slice(0, 10), patterns: patterns.slice(0, 6), syn, ant: (wn.ant || []).map(chip), fam: (wn.der || []).map(chip), wn: wnS, tools, confus: confus.slice(0, 2).map(c => ({ ...c, items: c.items.map(x => ({ ...x, href: x.h.split(/[\s(]/)[0].toLowerCase() === k ? '' : cHref(x.h) })) })), mistakes, note, noteHtml, quiz, blog: blogs, related: related.map(x => ({ w: x.word, href: wordPath(l, slugOf(x.word)) })), app: `${appHref(l)}#/dict/${encodeURIComponent(w)}`, lastmod: ctx.lastmod };
  d.quality = quality(d);
  return d;
}
const fill = (s, o) => String(s).replace(/\{(\w+)\}/g, (_, k) => o[k] ?? '');
// Chuẩn bị 13 ngôn ngữ (docs/I18N-PIPELINE.md): bao nhiêu từ trong pool có nghĩa bản địa trong gói web/packs/<lang>.json – chỉ đo, không dựng trang
function prepLangs(list) {
  const out = {};
  for (const l of Object.keys(T_ALL).filter(x => !ENABLED.includes(x))) { const f = `web/packs/${l}.json`; if (!fs.existsSync(f)) { out[l] = { pack: false }; continue; }
    let pk; try { pk = J(f); } catch { out[l] = { pack: 'lỗi đọc' }; continue; } const m = pk; // { từ: [nghĩa, cờ] } – cờ ≥ 1 = đã duyệt (docs §2 điều kiện mở)
    out[l] = { pack: true, of: list.length, withMeaning: list.filter(e => Array.isArray(m[e.word]) && m[e.word][0]).length, reviewed: list.filter(e => Array.isArray(m[e.word]) && m[e.word][1] >= 1).length }; }
  return out;
}

// Điểm 0–100: mỗi phần nội dung độc nhất có trọng số (§5). Thiếu nghĩa/IPA/ví dụ đã bị loại ở select().
export function quality(d) {
  const p = {
    core: 20, ipa: d.ipa ? 8 : 0, ipaUS: d.ipaUS ? 4 : 0, audio: d.audio ? 8 : 0, examples: d.examples.length >= 2 ? 8 : 0,
    col: d.col.length + d.patterns.length >= 3 ? 10 : d.col.length + d.patterns.length ? 5 : 0, confus: d.confus.length ? 10 : 0,
    mistakes: d.mistakes.length || d.note ? 10 : 0, quiz: d.quiz.length >= 3 ? 8 : d.quiz.length === 2 ? 5 : 0, blog: d.blog.length ? 6 : 0,
    syn: d.syn.length ? 4 : 0, related: d.related.length >= 4 ? 4 : 0,
  };
  const words = [d.meaning, d.def, ...d.examples, ...d.col, ...d.patterns.flatMap(x => [x.h, x.m, x.ex]), ...d.confus.flatMap(c => [c.tip, ...c.items.flatMap(x => [x.h, x.m, x.ex])]), ...d.mistakes.flatMap(x => [x.w, x.r, x.why]), ...Object.values(d.note || {}), ...d.quiz.flatMap(q => [q.q, q.s, ...q.o])].join(' ').split(/\s+/).filter(Boolean).length;
  const score = Object.values(p).reduce((a, b) => a + b, 0);
  return { score, words, parts: p, index: score >= QUALITY_MIN && words >= WORDS_MIN, rank: 0 };
}


// ---------- CSS thẻ tra từ lấy từ app (một nguồn: web/css/style.css, web/css/wordcard.css) ----------
const APP_SEL = /^(\.(card|chip|icon-btn|entry-head|entry-word|pron|vi|ipa|example-box|ex|row|muted|small|tiny|pos-block|pos-head|wc-chips|wc-clb|wc-chip)(?![\w-])|mark(?![\w-])|a\.chip|\.btn(?![\w-]))/;
function topRules(css) { // tách quy tắc cấp ngoài (bỏ @media/@keyframes – xử lý riêng)
  const out = []; let i = 0, depth = 0, start = 0;
  css = css.replace(/\/\*[\s\S]*?\*\//g, '');
  for (; i < css.length; i++) { const c = css[i]; if (c === '{') depth++; else if (c === '}' && --depth === 0) { out.push(css.slice(start, i + 1).trim()); start = i + 1; } }
  return out;
}
export function appCss() {
  const src = fs.readFileSync('web/css/style.css', 'utf8'), rules = topRules(src), out = [];
  const scope = sel => sel.split(',').map(x => x.trim()).map(x => (x.startsWith(':root') ? x.replace(/^(:root(?::not\(\[data-theme="light"\]\)|\[data-theme="dark"\])?)$/, '$1 .wd') : `.wd ${x}`)).join(',');
  for (const r of rules) {
    const sel = r.slice(0, r.indexOf('{')).trim(), body = r.slice(r.indexOf('{'));
    if (/^:root(\[data-theme="dark"\])?$/.test(sel)) out.push(scope(sel) + body.replace(/\s+/g, ' '));
    else if (/^@media \(prefers-color-scheme: dark\)/.test(sel) && /^\s*\{\s*:root:not\(\[data-theme="light"\]\)\s*\{\s*--/.test(body)) out.push(sel + '{' + body.slice(1).replace(/:root:not\(\[data-theme="light"\]\)\s*\{/, ':root:not([data-theme="light"]) .wd{').replace(/\s+/g, ' '));
    else if (/^@media \(max-width/.test(sel)) { const inner = topRules(body.slice(1, -1)).filter(x => sel && APP_SEL.test(x.trim())); if (inner.length) out.push(`${sel}{${inner.map(x => scope(x.slice(0, x.indexOf('{'))) + x.slice(x.indexOf('{'))).join('')}}`); }
    else if (!sel.startsWith('@') && sel.split(',').every(x => APP_SEL.test(x.trim()))) out.push(scope(sel) + body);
  }
  const wc = fs.readFileSync('web/css/wordcard.css', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  return (out.join('\n') + '\n' + wc).replace(/\n\s*/g, '\n').replace(/\s*([{};:,])\s*/g, '$1').replace(/;}/g, '}');
}

// ---------- Khung tra từ của ADD-ON (một nguồn: CSS trong extension/content.js) – đầu trang từ điển giống hệt cửa sổ tra từ của add-on ----------
const ADDON_SEL = /^\.(box|head|pic|w|chip|lv|ipa|spks|spk|vi|body|def|ex|pg|pvi|pdef|wn-x|pex|foot|btn|f1|mw0)(?![\w-])|^mark(?![\w-])/;
export function addonCss() {
  const src = fs.readFileSync('extension/content.js', 'utf8'), css = (src.match(/const CSS = `([\s\S]*?)`;/) || [])[1] || '';
  if (!css) throw new Error('addonCss: không thấy CSS trong extension/content.js');
  const light = [], dark = [], D = ':root:not([data-theme="light"]) .lkb';
  const map = (x, pre) => (pre + ' ' + x.replace(/^\.box(\.dark)?/, '')).trim();
  for (const r of topRules(css)) {
    const sel = r.slice(0, r.indexOf('{')).trim(), body = r.slice(r.indexOf('{'));
    if (sel.startsWith('@')) continue;
    const L = [], Dk = [];
    for (const x of sel.split(',').map(y => y.trim())) {
      if (/^\.box\.dark$/.test(x)) Dk.push(D);
      else if (/^\.dark\s+/.test(x)) { const y = x.replace(/^\.dark\s+/, ''); if (ADDON_SEL.test(y) && !/[\w-]\s*\.(lw|chipw|back|st|ctx|src|x|muted|inDeck)/.test(y)) Dk.push(map(y, D)); }
      else if (ADDON_SEL.test(x) && !/:host|\[hidden\]|noimg|pcredit|canvas|\.box:focus/.test(x)) L.push(map(x, '.lkb'));
    }
    if (L.length) light.push(L.join(',') + body);
    if (Dk.length) dark.push(Dk.join(',') + body);
  }
  const fix = '.lkb{position:static;width:auto;max-width:none;max-height:none;z-index:auto;margin:0 0 1rem;animation:none}.lkb .body{max-height:none;overflow:visible}.lkb .w{margin:0;display:inline;line-height:inherit}.lkb .btn{text-decoration:none;display:inline-flex;align-items:center;min-height:32px;padding:7px 12px;font-size:13px;font-weight:600;line-height:1;border-radius:10px;box-shadow:none;color:#1c1d2b!important}.lkb .btn.p{color:#fff!important}.lkb .foot{flex-wrap:wrap}.lkb .pic{font-size:32px}.lkb .pex .spk.mini{margin-left:4px}';
  const fixDark = `${D} .btn{color:#ecedf5!important}${D} .btn.p{color:#fff!important}`;
  return [light.join(''), fix, `@media (prefers-color-scheme:dark){${dark.join('')}${fixDark}}`].join('\n').replace(/\s*\n\s*/g, ' ').replace(/\s*([{};,])\s*/g, '$1');
}

// ---------- Khối "Hiểu sâu" của app (web/js/wordcard.js chạy trong vm) – trang vi dùng đúng markup thẻ từ của app ----------
let WC = null;
function wordCard() {
  if (WC) return WC;
  const ctx = { console, Promise, setTimeout: () => 0 }; ctx.window = ctx; ctx.self = ctx;
  ctx.document = { querySelector: () => ({}), addEventListener() {}, createElement: () => ({ dataset: {} }), head: { appendChild() {} } };
  ctx.I18N = { learnLang: () => 'vi' }; ctx.t = (s, v) => (v ? s.replace(/\{(\w+)\}/g, (m, k) => (v[k] != null ? v[k] : m)) : s);
  vm.createContext(ctx); vm.runInContext(fs.readFileSync('web/js/wordcard.js', 'utf8'), ctx, { filename: 'wordcard.js' });
  return (WC = ctx.WordCard);
}

// ---------- Lọc CSS không dùng (giữ trang ≤ 16 KB gzip mà không bỏ nội dung): giữ quy tắc có ≥ 1 bộ chọn mà MỌI class đều xuất hiện
// trong HTML đã dựng hoặc trong chuỗi JS (class do script thêm lúc chạy). Không class (thẻ, :root, @font-face, @keyframes) → giữ.
export function purgeCss(css, used) {
  const keepSel = sel => sel.split(',').some(x => (x.match(/\.[\w-]+/g) || []).every(c => used.has(c.slice(1))));
  const walk = src => { let out = '', i = 0, depth = 0, start = 0;
    for (; i < src.length; i++) { const c = src[i]; if (c === '{') depth++; else if (c === '}' && --depth === 0) { const r = src.slice(start, i + 1).trim(), b = r.indexOf('{'), sel = r.slice(0, b).trim();
      if (/^@(media|supports)/.test(sel)) { const inner = walk(r.slice(b + 1, -1)); if (inner) out += `${sel}{${inner}}`; } else if (sel.startsWith('@') || keepSel(sel)) out += r; start = i + 1; } }
    return out; };
  return walk(css.replace(/\/\*[\s\S]*?\*\//g, ''));
}
export const usedClasses = (htmls, js) => { const u = new Set(); for (const h of htmls) for (const m of h.matchAll(/class="([^"]*)"/g)) m[1].split(/\s+/).forEach(c => c && u.add(c)); for (const m of js.matchAll(/['"`]([\w -]+)['"`]/g)) m[1].split(/\s+/).forEach(c => c && u.add(c)); return u; };

export function buildShell() {
  const CSS2 = `.wd .pron .au{margin:0}.wd .acts .btn{text-decoration:none}.wd .acts .btn:not(.primary){color:var(--text)!important;background:var(--surface)}.wd .entry-head{grid-template-columns:minmax(0,1fr)}.wd h1.entry-word{margin:0}.wd .def{margin-top:.4rem}.wd .acts{margin-top:.9rem}.wd .example-box{margin-top:1rem}.wd .example-box p{margin:.3rem 0}.wd .wc-chips{margin-top:.9rem}.wd .wn.wc{margin-top:1rem}.wd .blk{margin-top:1rem}.wd .card h2{font-size:1.1rem;margin:0 0 .6rem}.wd .card h3{font-size:1rem;margin:.9rem 0 .2rem}.wd .pair+.pair{border-top:1px dashed var(--line);margin-top:.6rem;padding-top:.4rem}.wd .tip{margin:.6rem 0 0;padding:.6rem .8rem;border-radius:12px;background:var(--gold-soft)}.wd .note{margin:.3rem 0}.wd .notes{margin-top:1rem}.quiz{padding-inline-start:1.2rem;margin:0}.quiz>li{margin:.8rem 0}.quiz .opts{list-style:none;padding:0;margin:.3rem 0;display:flex;flex-wrap:wrap;gap:.4rem}.quiz .opts .chip{font-size:.9rem;white-space:normal}.quiz details{margin:.3rem 0}.quiz summary{cursor:pointer;min-height:44px;display:flex;align-items:center;color:var(--link)}.wd .ok{color:var(--good-text)}.wd .wc-chip{min-height:44px;box-sizing:border-box;text-decoration:none}.wd .cta{margin-top:1rem}.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}.az{columns:3 12rem;column-gap:1.5rem}.az li{break-inside:avoid;margin:.15rem 0}.az small{color:var(--muted)}.letters{display:flex;flex-wrap:wrap;gap:.4rem;margin:.8rem 0}.letters a{display:inline-flex;align-items:center;justify-content:center;min-width:44px;min-height:44px;box-sizing:border-box;padding:.2rem .5rem;border:1px solid var(--line);border-radius:6px;text-decoration:none}`;
  const header = {}, footer = {};
  const APP_CSS = appCss() + '\n' + addonCss(); // thẻ tra từ giống hệt app/add-on: lấy CHÍNH CSS của app (web/css/style.css + wordcard.css), đóng khung trong .wd
  for (const l of ENABLED) {
    const lh = x => `__LH_${x}__`;
    header[l] = siteHeader({ nav: [[`/${l}/blog/`, 'Blog'], [hubPath(l), T[l].hub]], open: [appHref(l) + '#/dict', T[l].open], home: landingHref(l), lang: l, langHref: lh });
    footer[l] = siteFooter({ lang: l, text: T[l].foot, langHref: lh });
  }
  const SPK_JS = `(function(d){var L=['https://audio.lexkite.com/audio/l/','https://lexkiteapp.github.io/lexkite-media-2/audio/l/'],cur;function tts(w,acc,r){try{var u=new SpeechSynthesisUtterance(w);u.lang=acc;u.rate=r||.95;speechSynthesis.cancel();speechSynthesis.speak(u)}catch(e){}}d.addEventListener('click',function(e){var b=e.target.closest('.spk');if(!b)return;var w=b.getAttribute('data-w')||b.getAttribute('data-text'),k=b.getAttribute('data-a'),acc=b.getAttribute('data-acc')||'en-GB';if(b.hasAttribute('data-slow'))return tts(w,acc,.55);if(!k)return tts(w,acc);if(cur)cur.pause();var i=0,a=new Audio(L[0]+k+'.mp3');cur=a;a.onerror=function(){if(++i<L.length){a.src=L[i]+k+'.mp3';a.play().catch(function(){})}else tts(w,acc)};a.play().catch(function(){tts(w,acc)})})})(document);`; // nút 🔊 UK (file giọng đọc của app, lỗi → giọng máy) · 🔊 US · 🐢 (giọng máy) như add-on
  return { v: 1, css: `${CSS}\n${SEO_CSS}\n${APP_CSS}\n${CSS2}`, header, footer, js: UI_JS + '\n' + SPK_JS };
}

export function build({ out = 'dist-dict', n = 200, pool = n, staticN = Infinity, index = '', write = true } = {}) {
  const src = loadSources(), { list, top } = selectPool(src, n, pool), open = parseOpen(index), lastmod = gitDate('web/js/data.js', 'web/js/lib', 'web/js/usage', 'web/js/notes', 'scripts/dict', 'workers/dict');
  const phrases = new Map(); for (const e of Object.values(src.INDEX)) if (e && /\s/.test(e.word)) for (const t of e.word.toLowerCase().split(/\s+/)) { const a = phrases.get(t) || phrases.set(t, []).get(t); if (a.length < 6) a.push(e); }
  const PIN = fs.existsSync('content/dict/open-pin.json') ? J('content/dict/open-pin.json') : {}, pin = (l, d) => ((PIN[l] || []).includes(d.slug) ? 1 : 0); // trang đã mở xếp trước → không rơi index khi điểm đổi
  const ctx = { list, phrases, lastmod, bySlug: new Set(list.map(e => slugOf(e.word))) };
  const pages = {}; for (const l of ENABLED) {
    pages[l] = list.map(e => entryJson(src, e, l, ctx));
    for (const d of pages[l]) d.quality.pool = !top.has(d.word); // ngoài N của bậc hiện tại → noindex dù đạt ngưỡng (bot stage.mjs mở N lớn dần)
    pages[l].filter(d => d.quality.index && !d.quality.pool).sort((a, b) => pin(l, b) - pin(l, a) || b.quality.score - a.quality.score || a.word.localeCompare(b.word)).forEach((d, i) => (d.quality.rank = i));
    pages[l].filter(d => !d.quality.index || d.quality.pool).forEach(d => (d.quality.rank = 1e9));
  }
  for (const l of ENABLED) for (const d of pages[l]) d.alts = Object.fromEntries(ENABLED.filter(x => x !== l).map(x => { const o = pages[x].find(y => y.word === d.word); return [x, { slug: o.slug, q: { index: o.quality.index, rank: o.quality.rank } }]; }).concat([[l, { slug: d.slug, q: { index: d.quality.index, rank: d.quality.rank } }]]));
  const shell = buildShell(), files = {}, put = (p, s) => (files[p] = s);
  { // lần dựng nháp với CSS đầy đủ → lấy tập class thật sự dùng → lọc CSS (cả 2 chế độ noindex/mở cho cùng markup)
    const drafts = ENABLED.flatMap(l => [renderHub(l, pages[l], shell, { open: { vi: 1e9, en: 1e9 } }), ...pages[l].map(d => renderWord(d, shell, { open: { vi: 1e9, en: 1e9 } }))]);
    shell.css = purgeCss(shell.css, usedClasses(drafts, shell.js + Object.values(shell.footer).join('') + ['workers/dict/render.mjs', 'web/js/wordcard.js'].map(f => fs.readFileSync(f, 'utf8')).join('') + "'A1 A2 B1 B2 C1 C2'")); // + mọi class trong mã dựng → trang đuôi dài (Worker) không thiếu kiểu
  }
  const manifest = { v: 1, lastmod, langs: {} };
  for (const l of ENABLED) {
    manifest.langs[l] = {};
    pages[l].forEach((d, i) => {
      const js = JSON.stringify(d); put(`data/v1/${l}/${d.slug}.json`, js); manifest.langs[l][d.slug] = hash(js).slice(0, 12);
      if (i < staticN) put(`assets${wordPath(l, d.slug)}index.html`, renderWord(d, shell, { open }));
    });
    put(`assets${hubPath(l)}index.html`, renderHub(l, pages[l], shell, { open }));
    for (const c of [...new Set(pages[l].map(d => d.word[0]))]) put(`assets${letterPath(l, c)}index.html`, renderHub(l, pages[l], shell, { open, letter: c })); // trang A–Z (noindex,follow – điều hướng cho người + bot)
    const rows = pages[l].filter(d => isIndexable(d, open)).map(d => ({ loc: SITE + wordPath(l, d.slug), lastmod, alts: [...ENABLED.filter(x => isIndexable({ lang: x, quality: d.alts[x].q }, open)).map(x => [x, SITE + wordPath(x, d.alts[x].slug)])] }));
    for (const r of rows) { if (r.alts.length > 1 && r.alts.some(([x]) => x === 'en')) r.alts.push(['x-default', r.alts.find(([x]) => x === 'en')[1]]); else r.alts = []; }
    for (let s = 0; s * 10000 < rows.length; s++) put(`assets/sitemap-dict-${l}-${s + 1}.xml`, renderSitemap(rows.slice(s * 10000, (s + 1) * 10000)));
  }
  put('assets/dict-open.json', JSON.stringify(Object.fromEntries(ENABLED.map(l => [l, pages[l].filter(d => isIndexable(d, open)).map(d => d.slug)])))); // Worker: /<lang>/words/<từ> đã mở → 301 (§1)
  put('data/v1/shell.json', JSON.stringify(shell)); put('data/v1/manifest.json', JSON.stringify(manifest));
  put('assets/_headers', '/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n  Cache-Control: public, max-age=600, s-maxage=86400\n');
  const report = { at: new Date().toISOString(), n: list.length, index: index || '(tắt – noindex hết)', thresholds: { QUALITY_MIN, WORDS_MIN }, langs: {} };
  report.pool = list.length; report.prep = prepLangs(list); // 13 ngôn ngữ chưa mở: độ phủ nghĩa bản địa (web/packs) – I18N-PIPELINE, mở ở S4 (người duyệt nhãn)
  for (const l of ENABLED) { const ps = pages[l], sc = ps.map(d => d.quality.score).sort((a, b) => a - b); report.langs[l] = { pages: ps.length, candidates: ps.filter(d => d.quality.index && !d.quality.pool).length, poolCandidates: ps.filter(d => d.quality.index && d.quality.pool).length, withWordNet: ps.filter(d => d.wn.length || d.syn.length).length, withIpaUS: ps.filter(d => d.ipaUS).length, indexable: ps.filter(d => isIndexable(d, open)).length, scoreMin: sc[0], scoreMedian: sc[sc.length >> 1], withConfusables: ps.filter(d => d.confus.length).length, withBlog: ps.filter(d => d.blog.length).length, quiz3: ps.filter(d => d.quiz.length >= 3).length, below: ps.filter(d => !d.quality.index && !d.quality.pool).map(d => `${d.word}:${d.quality.score}/${d.quality.words}w`) }; }
  put('report.json', JSON.stringify(report, null, 1));
  if (write) { fs.rmSync(out, { recursive: true, force: true }); for (const [p, s] of Object.entries(files)) { const f = path.join(out, p); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, s); } }
  return { files, pages, report, shell, open };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const st = JSON.parse(fs.readFileSync('content/dict/stage.json', 'utf8')); // mặc định = giai đoạn hiện tại do scripts/dict/stage.mjs giữ
  const r = build({ out: process.env.DICT_OUT || 'dist-dict', n: +(process.env.DICT_N || st.n), pool: +(process.env.DICT_POOL || POOL), staticN: +(process.env.DICT_STATIC_N || Math.floor(19000 / ENABLED.length)), index: process.env.DICT_INDEX ?? st.index }).report;
  for (const [l, x] of Object.entries(r.langs)) console.log(`· ${l}: ${x.pages} trang · ứng viên index ${x.candidates} (+${x.poolCandidates} ngoài N) · đang index ${x.indexable} · điểm min/trung vị ${x.scoreMin}/${x.scoreMedian} · từ dễ nhầm ${x.withConfusables} · blog ${x.withBlog} · quiz đủ 3 câu ${x.quiz3}`);
  if (!r.n || Object.values(r.langs).some(x => !x.pages)) { console.error('✗ dict: 0 trang – dừng (METHODS §4: workflow tự đỏ khi kết quả = 0)'); process.exit(1); }
}
