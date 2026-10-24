#!/usr/bin/env node
// Mảnh kho từ (docs/LEXICON.md §Mảnh): dựng từ ĐÚNG những gì trình duyệt có trong IELTS_DATA.INDEX sau khi nạp data.js + gói words + tsl
// (chạy chính các file đó trong vm → mục từ giống hệt mọi giao diện, kể cả trường mới như `img` khi data.js thêm) + gói nghĩa web/packs/<lang>.json.
//   node scripts/lexicon/shards.mjs --out dist      ghi dist/data/lex-index.json + dist/data/lex/** (build-web.sh gọi)
//   node scripts/lexicon/shards.mjs --check         chỉ đo (kích thước brotli từng mảnh) – không ghi
// Tên tệp = hash nội dung → Cache-Control immutable; mục lục lex-index.json no-cache (đổi kho = đổi hash = tự hết hạn bộ đệm).
import fs from 'fs';
import path from 'path';
import vm from 'vm';
import zlib from 'zlib';
import crypto from 'crypto';
import { createRequire } from 'module';
import { loadExpand, toIndex } from './expand/lib.mjs';

const ROOT = new URL('../../', import.meta.url).pathname;
const require = createRequire(import.meta.url);
const Lex = require(path.join(ROOT, 'web/js/lex.js'));
const arg = k => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
const OUT = arg('--out'), CHECK = process.argv.includes('--check');
const CORE_RAW = +(arg('--core-bytes') || 9000), LANG_GROUP = +(arg('--lang-group') || 4), TOP_N = +(arg('--top') || 300);

// ---- Nạp dữ liệu như trình duyệt: data.js → gói 'words' → gói 'tsl' (thứ tự lấy từ BUNDLES trong app.js – một nguồn)
export function loadBrowserIndex({ expand = true } = {}) {
  const app = fs.readFileSync(path.join(ROOT, 'web/js/app.js'), 'utf8');
  const bundle = n => { const m = new RegExp(`\\b${n}: \\[([^\\]]*)\\]`).exec(app); if (!m) throw new Error('không thấy BUNDLES.' + n); return [...m[1].matchAll(/'(js\/lib\/[^']+)'/g)].map(x => 'web/' + x[1]); };
  const files = ['web/js/data.js', ...bundle('words'), ...bundle('tsl'), 'web/js/verbs-core.js'];
  const ctx = { t: s => s, console }; ctx.self = ctx; vm.createContext(ctx);
  for (const f of files) vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f });
  // Mục MỞ RỘNG đã xuất (content/lexicon/expand, docs/LEXICON.md §Mở rộng 20k): không nằm trong web/js (ngân sách) – trình duyệt nhận qua mảnh Lex;
  // ghép vào INDEX ở đây để MỌI việc hạ nguồn đọc INDEX (mảnh, trang /words/, cổng nhất quán) tự có từ mới. Không bao giờ đè mục sẵn có.
  const INDEX = ctx.IELTS_DATA.INDEX, XM = new Map();
  if (expand) for (const { e } of loadExpand()) { const k = e.w.toLowerCase(); if (INDEX[k]) continue; INDEX[k] = toIndex(e); XM.set(k, e.m || {}); }
  return { INDEX, XM, TOPICS: ctx.IELTS_DATA.TOPICS, VERBS: ctx.LK_VERBS, files };
}
const IRR_PLURAL = 'children child|men man|women woman|people person|feet foot|teeth tooth|mice mouse|geese goose|criteria criterion|phenomena phenomenon|analyses analysis|crises crisis|theses thesis|hypotheses hypothesis|data datum|media medium|bacteria bacterium|curricula curriculum|indices index|appendices appendix|lives life|wives wife|knives knife|leaves leaf|halves half|selves self|shelves shelf|wolves wolf|better good|best good|worse bad|worst bad|further far|farther far';

export function buildShards() {
  const { INDEX, TOPICS, VERBS, XM } = loadBrowserIndex();
  const E = new Map(), collide = [];
  for (const k of Object.keys(INDEX)) { const n = Lex.norm(k); if (!n) continue; if (E.has(n)) { collide.push(k); continue; } E.set(n, JSON.parse(JSON.stringify(INDEX[k]))); }
  // dạng bất quy tắc → gốc (chỉ khi dạng đó KHÔNG phải mục từ riêng)
  const R = new Map();
  for (const v of VERBS.irregularList()) for (const x of Lex.formsOf(v)) if (x && !E.has(x) && E.has(v.base)) R.set(x, v.base);
  for (const p of IRR_PLURAL.split('|')) { const [f, b] = p.split(' '); if (!E.has(f) && E.has(b)) R.set(f, b); }
  // cụm chứa từ (trang tra từ: "Cụm từ & cấu trúc với …"): ≤ 8 cụm [từ, vi, ví dụ] nằm ngay trong mảnh của từ gốc – không cần 2,3 MB gói từ
  const PM = new Map(), PH = {};
  for (const pk of E.keys()) if (/\s/.test(pk)) for (const t of pk.split(/\s+/).map(x => Lex.edge(x)).filter(Boolean)) {
    const b = E.has(t) ? t : Lex.stems(t).find(x => E.has(x)); if (!b || b === pk) continue;
    const l = PM.get(b) || PM.set(b, []).get(b); if (l.length < 8 && !l.some(x => x[0] === E.get(pk).word)) { const e = E.get(pk); l.push([e.word, e.vi || '', e.ex || '']); PH[pk] = 1; }
  }
  const F = new Map(); for (const k of E.keys()) { const f = Lex.fold(k); if (f !== k && !E.has(f) && !F.has(f)) F.set(f, k); }
  const audio = new Set(fs.readFileSync(path.join(ROOT, 'web/audio/w/index.txt'), 'utf8').split('\n').map(x => Lex.norm(x)).filter(Boolean));
  // ---- mảnh lõi: mọi khóa (mục từ + dạng r + khóa không dấu f) theo thứ tự chuỗi JS, cắt theo kích thước
  const keys = [...new Set([...E.keys(), ...R.keys(), ...F.keys()])].sort();
  const core = []; let cur = null, size = 0;
  for (const k of keys) {
    if (!cur || size >= CORE_RAW) { cur = { first: k, d: { e: {}, r: {}, f: {}, a: [], p: {} } }; core.push(cur); size = 0; }
    if (E.has(k)) { cur.d.e[k] = E.get(k); size += JSON.stringify(E.get(k)).length + k.length; if (audio.has(k)) cur.d.a.push(k); if (PM.has(k)) { cur.d.p[k] = PM.get(k); size += JSON.stringify(PM.get(k)).length; } }
    if (R.has(k)) { cur.d.r[k] = R.get(k); size += k.length * 2; }
    if (F.has(k)) { cur.d.f[k] = F.get(k); size += k.length * 2; }
  }
  // ---- mảnh nghĩa theo ngôn ngữ: nghĩa đúng từ loại của mục chính (như App.glossEntry); mảnh j phủ mảnh lõi [j·G, (j+1)·G)
  const gpos = p => { p = String(p || '').toLowerCase(); return /^(n|noun)\b/.test(p) ? 'n' : /^(phr ?v|phrasal)/.test(p) ? 'phrv' : /^(v|verb)\b/.test(p) ? 'v' : /^adj/.test(p) ? 'adj' : /^adv/.test(p) ? 'adv' : p; };
  const langs = {};
  for (const f of fs.readdirSync(path.join(ROOT, 'web/packs')).filter(f => /^[a-z]{2}\.json$/.test(f)).sort()) {
    const P = JSON.parse(fs.readFileSync(path.join(ROOT, 'web/packs', f), 'utf8')), list = [];
    core.forEach((c, i) => {
      const j = Math.floor(i / LANG_GROUP); list[j] = list[j] || {};
      for (const k of Object.keys(c.d.e)) { const e = c.d.e[k], lk = e.word.toLowerCase(), v = P[lk + '#' + gpos(e.pos)] || P[lk] || (e.x && XM.get(k) && XM.get(k)[f.slice(0, 2)] ? [XM.get(k)[f.slice(0, 2)], 2, 0] : null); if (v) list[j][k] = v; }
    });
    langs[f.slice(0, 2)] = list;
  }
  // ---- top-N từ thông dụng (thứ tự NGSL) gộp 1 tệp để tải sẵn lúc rảnh
  const top = { e: {}, a: [] };
  for (const t of TOPICS.filter(x => x.group === 'core')) for (const w of t.words) { const k = Lex.norm(w.word); if (Object.keys(top.e).length >= TOP_N) break; if (E.has(k) && E.get(k).word === w.word && !top.e[k]) { top.e[k] = E.get(k); if (audio.has(k)) top.a.push(k); } }
  return { E, R, F, PH, core, langs, top, collide };
}

const hash = (s, n = 6) => crypto.createHash('sha1').update(s).digest('hex').slice(0, n);
const br = s => zlib.brotliCompressSync(Buffer.from(s), { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 11 } }).length;
// khóa đầu mảnh rút gọn: tiền tố ngắn nhất vẫn > khóa cuối của mảnh trước (mục lục nhỏ)
const cut = (prevLast, first) => { if (prevLast == null) return ''; for (let n = 1; n <= first.length; n++) { const p = first.slice(0, n); if (p > prevLast) return p; } return first; };

export function writeShards(out) {
  const b = buildShards(), files = [], idx = { v: '', g: LANG_GROUP, c: [], l: {}, top: '', n: b.E.size };
  const put = (rel, d, h) => { const s = JSON.stringify(d); h = h || hash(s); files.push({ rel: rel.replace('{h}', h), s }); return h; };
  let last = null;
  for (const c of b.core) { const ks = Object.keys({ ...c.d.e, ...c.d.r, ...c.d.f }).sort(); idx.c.push([cut(last, ks[0]), put('data/lex/c/{h}.json', c.d)]); last = ks.at(-1); }
  for (const [l, list] of Object.entries(b.langs)) { const h = hash(JSON.stringify(list), 8); idx.l[l] = h; list.forEach((d, j) => put(`data/lex/${l}/${h}-${j}.json`, d, 'x')); }
  idx.top = 'top.' + put('data/lex/top.{h}.json', b.top);
  idx.v = hash(JSON.stringify([idx.c, idx.l, idx.top]), 10);
  const idxS = JSON.stringify(idx);
  if (out) {
    fs.rmSync(path.join(out, 'data/lex'), { recursive: true, force: true });
    for (const f of files) { const p = path.join(out, f.rel); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, f.s); }
    fs.writeFileSync(path.join(out, 'data/lex-index.json'), idxS);
  }
  const cs = files.filter(f => f.rel.startsWith('data/lex/c/')).map(f => br(f.s)).sort((x, y) => x - y);
  const ls = files.filter(f => /lex\/[a-z]{2}\//.test(f.rel)).map(f => br(f.s)).sort((x, y) => x - y);
  const st = { phrases: Object.keys(b.PH).length, words: b.E.size, irregular: b.R.size, folded: b.F.size, collisions: b.collide.length, coreShards: cs.length, coreBrMedian: cs[cs.length >> 1], coreBrMax: cs.at(-1), langShards: ls.length, langBrMedian: ls[ls.length >> 1], langBrMax: ls.at(-1), indexBr: br(idxS), topBr: br(files.find(f => f.rel.includes('top.')).s), files: files.length + 1, version: idx.v };
  return { idx, files, stats: st, build: b };
}

if (import.meta.url === 'file://' + process.argv[1]) {
  if (!OUT && !CHECK) { console.error('dùng: --out <thư mục> | --check'); process.exit(2); }
  const { stats } = writeShards(CHECK ? null : OUT);
  console.log('lex shards:', JSON.stringify(stats));
  if (stats.coreBrMax > 6000 || stats.indexBr > 4000) { console.error('✗ mảnh quá lớn (lõi ≤ 6 KB br, mục lục ≤ 4 KB br)'); process.exit(1); }
}
