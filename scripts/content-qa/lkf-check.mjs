#!/usr/bin/env node
// Cổng khung Can-do LKF (docs/CONTENT-WORLD-PLAN.md P0.1 / P0-C). 0 token, chỉ đọc repo.
// 1) content/framework/lkf.json: id duy nhất & đúng dạng, kỹ năng/cấp/đối tượng hợp lệ, gse nằm trong dải của cấp và không giảm theo id,
//    mỗi cấp gốc (A1…C2) × kỹ năng ≥ 15 mục tiêu và có đủ 3 đối tượng, can_do_en tự viết (bắt đầu "Can ", 30–200 ký tự, không trùng,
//    không chứa cụm đặc trưng của bộ mô tả đã xuất bản – CONTENT-RULES §1).
// 2) content/framework/lo-map.json: mọi `lo` trỏ tới mục tiêu có thật, cấp mục tiêu lệch cấp nội dung ≤ 1 bậc gốc, không có mục thừa
//    (khoá không còn trong dữ liệu), độ phủ từng nhóm và toàn bộ ≥ 95 %.
// Dùng: node scripts/content-qa/lkf-check.mjs            → kiểm + ghi reports/lkf-coverage.json
//       node scripts/content-qa/lkf-check.mjs --suggest  → (tầng 0) điền `lo` gợi ý theo luật cho mục CHƯA gắn rồi kiểm; không ghi đè mục đã gắn tay
import fs from 'node:fs';
import path from 'node:path';
import { loadContent, ROOT } from '../lib/content-load.mjs';
import { loadAllPlus, key } from '../lexicon/lib.mjs';

const P = f => path.resolve(ROOT, f), rd = f => fs.readFileSync(P(f), 'utf8'), ex = f => fs.existsSync(P(f));
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; }; // --lkf/--map: tệp thay thế (dùng cho test hồi quy)
const LKF = arg('--lkf', 'content/framework/lkf.json'), MAP = arg('--map', 'content/framework/lo-map.json'), REPORT = arg('--report', 'reports/lkf-coverage.json'), MIN_CELL = 15, MIN_COV = 0.95;
const SUGGEST = process.argv.includes('--suggest');
const errs = [], E = m => errs.push(m);
const BASES = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'], SKILLS = ['R', 'L', 'S', 'W', 'I', 'M'], AUD = ['gen', 'acad', 'work'];
const base = l => (String(l || '').match(/[ABC][12]/) || [])[0] || null; // 'B2–C1' → B2, 'A2+' → A2
// Cụm đặc trưng của bộ mô tả CEFR/GSE đã xuất bản – câu tự viết không được chứa (chặn chép nguyên văn). Chỉ là mẩu dò, không phải nội dung.
const BANNED = ['familiar everyday expressions and very basic phrases', 'virtually everything heard or read', 'live or broadcast', 'at fast native speed',
  'enter unprepared into conversation', 'likely to arise whilst travelling', 'likely to arise while travelling', 'regular interaction with native speakers',
  'clear, detailed text on a wide range of subjects', 'clear, detailed descriptions on a wide range of subjects', 'smoothly flowing', 'finer shades of meaning',
  'appreciate distinctions of style', 'lengthy, complex texts', 'express him/herself fluently and spontaneously', 'express himself fluently and spontaneously',
  'fluently and spontaneously', 'emotional, allusive and joking usage', 'relationships are only implied', 'linking a series of shorter discrete elements',
  'in an area of immediate need', 'can introduce him/herself and others'];

// ---------- 1. Khung ----------
const F = JSON.parse(rd(LKF));
const LV = new Map((F.levels || []).map(l => [l.id, l]));
const O = new Map();
const seenText = new Map();
for (const o of F.objectives || []) {
  const w = `lkf ${o.id}`;
  if (O.has(o.id)) E(`${w}: id trùng`);
  O.set(o.id, o);
  const lv = LV.get(o.level);
  if (!SKILLS.includes(o.skill)) E(`${w}: skill "${o.skill}" không thuộc R|L|S|W|I|M`);
  if (!lv) { E(`${w}: level "${o.level}" không có trong levels`); continue; }
  if (o.id !== `${o.skill}.${o.level.replace('+', 'p')}.${o.id.split('.')[2]}` || !/^\d{2}$/.test(o.id.split('.')[2] || '')) E(`${w}: id phải là <kỹ năng>.<cấp>.<nn> khớp skill/level`);
  if (!Number.isInteger(o.gse) || o.gse < lv.min || o.gse > lv.max) E(`${w}: gse ${o.gse} ngoài dải ${lv.min}–${lv.max} của ${o.level}`);
  if (!AUD.includes(o.audience)) E(`${w}: audience "${o.audience}" không thuộc gen|acad|work`);
  const t = String(o.can_do_en || '');
  if (!/^Can [a-z]/.test(t) || t.length < 30 || t.length > 200 || !/[.?!]$/.test(t)) E(`${w}: can_do_en phải bắt đầu "Can …", 30–200 ký tự, kết thúc bằng dấu câu`);
  const low = t.toLowerCase();
  for (const b of BANNED) if (low.includes(b)) E(`${w}: chứa cụm của bộ mô tả đã xuất bản "${b}" – viết lại bằng lời mình`);
  const norm = low.replace(/[^a-z ]/g, '').replace(/\s+/g, ' ');
  if (seenText.has(norm)) E(`${w}: trùng câu với ${seenText.get(norm)}`); else seenText.set(norm, o.id);
}
// gse không giảm theo số thứ tự trong cùng kỹ năng × cấp
const cells = {};
for (const o of O.values()) (cells[`${o.skill}.${o.level}`] ||= []).push(o);
for (const [c, list] of Object.entries(cells)) list.sort((a, b) => a.id < b.id ? -1 : 1).forEach((o, i) => { if (i && o.gse < list[i - 1].gse) E(`lkf ${o.id}: gse ${o.gse} < mục trước ${list[i - 1].gse} (${c})`); });
for (const s of SKILLS) for (const b of BASES) {
  const list = [...O.values()].filter(o => o.skill === s && base(o.level) === b);
  if (list.length < MIN_CELL) E(`lkf ${s}×${b}: ${list.length} mục tiêu < ${MIN_CELL}`);
  for (const a of AUD) if (!list.some(o => o.audience === a)) E(`lkf ${s}×${b}: thiếu đối tượng ${a}`);
}

// ---------- 2. Mục nội dung hiện có (khoá ổn định + cấp) ----------
const C = loadContent();
const vmFiles = (dir, re, name) => { const g = {}; for (const f of fs.readdirSync(P(dir)).filter(f => re.test(f)).sort((a, b) => (a.includes('-') - b.includes('-')) || (a < b ? -1 : 1)) /* calls.js gán mảng, calls-exam.js nối thêm – nạp đúng thứ tự app */) { try { new Function('self', 'window', rd(`${dir}/${f}`))(g, g); } catch (e) { E(`nạp ${dir}/${f}: ${e.message}`); } } return g[name] || []; };
const jsonDir = d => (ex(d) ? fs.readdirSync(P(d)).filter(f => f.endsWith('.json')).sort().map(f => JSON.parse(rd(`${d}/${f}`))) : []);
const slug = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').split('-').filter(Boolean).slice(0, 8).join('-');
const TOEFL_B2 = new Set(['academic', 'talk', 'discussion']);
const items = { // nhóm → [{id, level, ...thuộc tính cho luật gợi ý}]
  grammar: (C.GRAMMAR || []).map(g => ({ id: g.id, level: g.level })),
  reading: (C.READINGS || []).map(r => ({ id: r.id, level: r.level })),
  'ielts-reading': (C.READTESTS || []).map(r => ({ id: r.id, level: r.gt ? 'B1' : 'B2', gt: !!r.gt })),
  'ielts-listening': (C.LISTENING || []).map(r => ({ id: r.id, level: r.level, part: r.part })),
  'toeic-reading': (C.TOEIC?.reading || []).flatMap(t => (t.parts || []).map(p => ({ id: `${t.id}/p${p.part}`, level: 'B1', part: p.part }))),
  'toeic-listening': (C.TOEIC?.listening || []).map(r => ({ id: r.id, level: 'B1', part: r.part })),
  'toeic-sw': [...(C.TOEIC_SW?.speaking || []), ...(C.TOEIC_SW?.writing || [])].map(r => ({ id: r.id, level: 'B1', task: r.task })),
  toefl: ['reading', 'listening', 'writing', 'speaking'].flatMap(s => (C.TOEFL?.[s] || []).map(r => ({ id: r.id, level: TOEFL_B2.has(r.task) ? 'B2' : 'B1', task: r.task }))),
  'writing-model': (C.MODELS || []).map(m => ({ id: m.id, level: 'B2', task: String(m.task) })),
  'gt-letter': (C.GT_LETTERS || []).map(l => ({ id: l.id, level: 'B1', tone: l.tone })),
  task1: (C.TASK1_MORE || []).map(t => ({ id: t.id, level: 'B2' })),
  'writing-prompt': (C.WRITE_MORE || []).map(w => ({ id: w[0], level: 'B2' })),
  speaking: (C.SPEAK_MORE || []).map(s => ({ id: slug(s.p2?.q || s.title), level: 'B1' })), // topic không duy nhất → khoá = đề Part 2
  ideas: (C.IDEAS || []).map(s => ({ id: s.topic, level: 'B2' })),
  story: (ex('content/lesson/stories.json') ? JSON.parse(rd('content/lesson/stories.json')).items : []).map(s => ({ id: s.id, level: s.cefr, kind: s.kind })),
  situation: jsonDir('content/situations').map(s => ({ id: s.id, level: s.cefr })),
  call: vmFiles('web/js/call', /^calls.*\.js$/, 'CALLS').map(c => ({ id: c.id, level: c.lv, exam: c.exam || '' })),
  roleplay: vmFiles('web/js/roleplay', /^data-.*\.js$/, 'ROLEPLAY').map(r => ({ id: r.id, level: Array.isArray(r.lv) ? r.lv[1] || r.lv[0] : 'B2' })), // công sở: mỗi lượt 3 bậc B1/B2/C1 → lấy giữa; đời sống: level [A1,A2,B1] → giữa
};
for (const [col, list] of Object.entries(items)) { const s = new Set(); for (const it of list) { if (s.has(it.id)) E(`${col}/${it.id}: khoá trùng – không gắn lo được`); s.add(it.id); } }

// ---------- Luật gợi ý tầng 0 (chỉ dùng với --suggest, cho mục chưa gắn; gắn tay luôn thắng) ----------
const BY_LEVEL = (m, l) => m[base(l)];
const RULES = {
  reading: it => BY_LEVEL({ A2: 'R.A2p.02', B1: 'R.B1.01', B2: 'R.B2.01', C1: 'R.C1.06' }, it.level),
  'ielts-reading': it => (it.gt ? ['R.B1p.05', 'R.B1.04'] : ['R.B2.05', 'R.B2.06', 'R.B2.07']),
  'ielts-listening': it => ({ 1: 'L.B1.03', 2: 'L.B1p.04', 3: 'L.B2.06', 4: ['L.B2.05', 'L.B2p.03'] })[it.part],
  'toeic-reading': it => ({ 5: 'R.B1.09', 6: 'R.B1p.05', 7: ['R.B1.04', 'R.B1p.06'] })[it.part],
  'toeic-listening': it => ({ 1: 'L.B1.11', 2: 'L.B1.12', 3: 'L.B1.09', 4: 'L.B1p.05' })[it.part],
  'toeic-sw': it => ({ read: 'S.B1.11', respond: 'I.B1.08', info: 'I.B1p.05', opinion: 'S.B1.04', request: 'W.B1.09', essay: 'W.B1p.03', picture: 'S.A2.05', sentence: 'W.A2.02', 'picture-sentence': 'W.A2.02' })[it.task],
  toefl: it => ({ cw: 'R.B1p.02', daily: 'R.B1.05', academic: 'R.B2.05', response: 'L.B1.12', conversation: 'L.B1.09', announcement: 'L.B1p.05', talk: 'L.B2.05',
    sentence: 'W.B1.01', email: 'W.B1.05', discussion: 'W.B1p.03', repeat: 'S.B1.12', interview: 'I.B1.08' })[it.task],
  'writing-model': it => ({ 1: 'W.B2.06', 2: 'W.B2.05', gt: 'W.B2.02' })[it.task],
  'gt-letter': it => ({ formal: 'W.B1.05', 'semi-formal': 'W.B1p.01', informal: 'W.B1.02' })[it.tone] || 'W.B1.05',
  task1: () => 'W.B2.06',
  'writing-prompt': () => 'W.B2.05',
  speaking: () => ['I.B1p.04', 'S.B1.03', 'S.B2.08'],
  ideas: () => ['W.B2.05', 'S.B2.02'],
  call: it => ({ 'ielts-p1': 'I.B1p.04', 'ielts-p2': 'S.B1.03', 'ielts-p3': 'S.B2.08', toeic: 'I.B1.10', everyday: 'I.A2.03' })[it.exam],
  roleplay: () => 'I.B2.08',
};
const MAPJ = ex(MAP) ? JSON.parse(rd(MAP)) : { items: {} };
MAPJ.items ||= {};
if (SUGGEST) {
  let n = 0;
  for (const [col, list] of Object.entries(items)) {
    const m = (MAPJ.items[col] ||= {});
    for (const it of list) if (m[it.id] == null && RULES[col]) { const v = RULES[col](it); if (v) { m[it.id] = v; n++; } }
    MAPJ.items[col] = Object.fromEntries(list.filter(it => m[it.id] != null).map(it => [it.id, m[it.id]]).concat(Object.entries(m).filter(([k]) => !list.some(it => it.id === k))));
  }
  fs.writeFileSync(P(MAP), JSON.stringify(MAPJ, null, 1).replace(/\[\n\s+("[^"]+")(?:,\n\s+("[^"]+"))?(?:,\n\s+("[^"]+"))?\n\s+\]/g, (m, ...g) => '[' + g.slice(0, 3).filter(x => typeof x === 'string').join(', ') + ']') + '\n');
  console.log(`· --suggest: gắn ${n} mục chưa có lo theo luật tầng 0`);
}

// ---------- 3. Kiểm lo + độ phủ ----------
const validLo = (lo, level, w) => {
  const list = Array.isArray(lo) ? lo : [lo];
  if (!list.length) { E(`${w}: lo rỗng`); return false; }
  let ok = true;
  for (const id of list) {
    const o = O.get(id);
    if (!o) { E(`${w}: lo "${id}" không có trong lkf.json`); ok = false; continue; }
    const b = base(level);
    if (b && Math.abs(BASES.indexOf(base(o.level)) - BASES.indexOf(b)) > 1) { E(`${w}: lo ${id} (${o.level}) lệch cấp nội dung ${level} quá 1 bậc`); ok = false; }
  }
  return ok;
};
const cov = {};
for (const [col, list] of Object.entries(items)) {
  const m = MAPJ.items[col] || {}, ids = new Set(list.map(it => it.id));
  for (const k of Object.keys(m)) if (!ids.has(k)) E(`lo-map ${col}/${k}: mục không còn trong dữ liệu (xoá dòng hoặc sửa khoá)`);
  let ok = 0;
  for (const it of list) if (m[it.id] != null && validLo(m[it.id], it.level, `lo ${col}/${it.id}`)) ok++;
  cov[col] = { items: list.length, tagged: ok };
}
// Từ vựng: lo theo cấp CEFR của nghĩa (luật trong lo-map.vocab – mọi từ#loại có cấp hợp lệ đều nhận mục tiêu "vốn từ" cùng cấp)
const V = MAPJ.vocab || {};
for (const [lv, lo] of Object.entries(V)) if (!lv.startsWith('_')) validLo(lo, lv, `lo-map vocab.${lv}`);
const rows = new Map(); for (const e of await loadAllPlus()) { const k = key(e.row); if (!rows.has(k)) rows.set(k, e.row); }
const vocabOk = [...rows.values()].filter(r => V[base(r[8])] && O.has(V[base(r[8])])).length;
cov.vocab = { items: rows.size, tagged: vocabOk };

const tot = Object.values(cov).reduce((a, c) => ({ items: a.items + c.items, tagged: a.tagged + c.tagged }), { items: 0, tagged: 0 });
for (const [col, c] of Object.entries(cov)) { if (!c.items) E(`${col}: đếm được 0 mục (nguồn hỏng?)`); else if (c.tagged / c.items < MIN_COV) E(`${col}: độ phủ lo ${(100 * c.tagged / c.items).toFixed(1)} % < 95 %`); }
const used = new Set(Object.values(MAPJ.items).flatMap(m => Object.values(m).flat()).concat(Object.values(V)));
const perCell = {}; for (const o of O.values()) { const k = `${o.skill}.${base(o.level)}`; perCell[k] = (perCell[k] || 0) + 1; }
const report = { objectives: O.size, cells: Object.keys(perCell).length, cellsOk: Object.values(perCell).filter(n => n >= MIN_CELL).length, minCell: Math.min(...Object.values(perCell)), objectivesUsed: [...used].filter(id => O.has(id)).length,
  coverage: Object.fromEntries(Object.entries(cov).map(([k, c]) => [k, { ...c, pct: Math.round(1000 * c.tagged / Math.max(1, c.items)) / 10 }])),
  total: { ...tot, pct: Math.round(1000 * tot.tagged / Math.max(1, tot.items)) / 10 }, errors: errs.length };
fs.mkdirSync(path.dirname(P(REPORT)), { recursive: true });
fs.writeFileSync(P(REPORT), JSON.stringify(report, null, 1) + '\n');
const show = Object.entries(report.coverage).map(([k, c]) => `${k} ${c.tagged}/${c.items}`).join(' · ');
if (errs.length) { errs.slice(0, 60).forEach(e => console.log('✗', e)); if (errs.length > 60) console.log(`… +${errs.length - 60} lỗi`); console.log(`✗ lkf-check: ${errs.length} lỗi`); process.exit(1); }
console.log(`✓ lkf-check: ${O.size} mục tiêu (${report.cells} ô kỹ năng×cấp, ô ít nhất ${report.minCell}), ${report.objectivesUsed} mục tiêu đang được dùng · lo ${tot.tagged}/${tot.items} = ${report.total.pct} % (${show})`);
