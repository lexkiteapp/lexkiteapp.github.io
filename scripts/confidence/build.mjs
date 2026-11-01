#!/usr/bin/env node
// 🗣️ Giao tiếp tự tin – MỘT NGUỒN: content/confidence/{units/*.json,toolkit.json,daily.json,ui.json,i18n/<lang>.json} (docs/CONFIDENCE.md §1).
//   node scripts/confidence/build.mjs            cổng kiểm (npm test): nội dung, id vĩnh viễn, tiếng Anh hướng dẫn ≤ B1, đủ 13 bản dịch, bản sinh khớp nguồn
//   node scripts/confidence/build.mjs --write    sinh web/js/confidence/data.js, web/js/i18n/en/confidence.js, web/js/i18n/<lang>/confidence.js,
//                                               khóa lõi/nhãn ngắn → scripts/i18n-fixed.json, content/confidence/i18n/_source.json (đầu vào người dịch), ids.lock.json
//   Sau --write: bash scripts/build-i18n.sh && node scripts/i18n-fix.mjs
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { missingSegments } from '../i18n-english.mjs';
import { known } from '../scriptbank/lib.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const R = p => path.join(ROOT, p), rd = p => fs.readFileSync(R(p), 'utf8'), J = p => JSON.parse(rd(p));
const WRITE = process.argv.includes('--write');
const LANGS = rd('scripts/i18n-langs.txt').split('\n').map(s => s.trim()).filter(s => s && !s.startsWith('#'));
const LEVELS = ['A1', 'A2', 'B1', 'B2'], ID = /^[a-z][a-z0-9-]{1,40}$/, VI = /[ăđơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]/i;
const errs = [], E = m => errs.push(m);
const loadDict = f => { if (!fs.existsSync(R(f))) return {}; const c = { self: {} }; c.self = c; vm.createContext(c); vm.runInContext(rd(f), c); return Object.values(c.I18N_DICT || {})[0] || {}; };

// ---------- Nguồn ----------
const UD = 'content/confidence/units';
const units = fs.readdirSync(R(UD)).filter(f => f.endsWith('.json')).map(f => ({ f, ...J(`${UD}/${f}`) })).sort((a, b) => a.order - b.order);
const toolkit = J('content/confidence/toolkit.json').groups, daily = J('content/confidence/daily.json').prompts, ui = J('content/confidence/ui.json');
delete ui._note;
const rpIds2 = new Set([...[rd('web/js/roleplay/data-a.js'), rd('web/js/roleplay/data-b.js'), rd('web/js/roleplay/data-everyday.js')].join('\n').matchAll(/id: '([a-z-]+)'/g)].map(m => m[1]));

// ---------- Khóa dịch (vi → en) từ nội dung ----------
const KEYS = new Map(); // vi → en
const key = (o, where) => {
  if (!o || !o.vi || !o.en) { E(`${where}: thiếu vi/en`); return ''; }
  if (VI.test(o.en)) E(`${where}: bản en có chữ Việt`);
  if (KEYS.has(o.vi) && KEYS.get(o.vi) !== o.en) E(`${where}: khóa "${o.vi}" có 2 bản en khác nhau`);
  KEYS.set(o.vi, o.en); return o.vi;
};
const words = s => String(s).match(/[A-Za-z][A-Za-z'’-]*/g) || [];
// Từ tình huống được dạy chính trong bài (A1–B1 nhưng ngoài NGSL) + dạng bất quy tắc NGSL chưa nhận
const ALLOW = new Set(('wi-fi wifi lexkite whisper umm checkout penicillin barista ok okay online coworkers coworker staff refund replacement fitting taste done understood forgot goodbye rude uk us '
  + 'airport pharmacy headache allergy allergies allergic pills lamp patel dizzy adjective countryside streak fluency toolkit mic hint audio upload recordings dialogue stuck browser deleted').split(' '));
const b1 = (s, where) => { // hướng dẫn tiếng Anh ≤ B1: từ ngoài NGSL (bỏ đoạn trong ngoặc kép = ví dụ học) bị chặn
  const plain = String(s).replace(/“[^”]*”|"[^"]*"|‘[^’]*’|\{[a-z]+\}/g, ' ');
  const bad = [...new Set(words(plain).filter(w => !ALLOW.has(w.toLowerCase().replace(/'s$/, '')) && !known(w)))];
  if (bad.length) E(`${where}: từ khó hơn B1 trong hướng dẫn: ${bad.join(', ')}`);
};
const ids = [];
const seenUnit = new Set(), seenOrder = new Set();
const outUnits = units.map(u => {
  const W = `${u.f}`;
  if (!ID.test(u.id) || seenUnit.has(u.id)) E(`${W}: id bài sai/trùng "${u.id}"`); seenUnit.add(u.id);
  if (u.f !== u.id + '.json') E(`${W}: tên tệp phải là ${u.id}.json`);
  if (!LEVELS.includes(u.level)) E(`${W}: level lạ ${u.level}`);
  if (seenOrder.has(u.order)) E(`${W}: order trùng`); seenOrder.add(u.order);
  if (u.rp && !rpIds2.has(u.rp)) E(`${W}: rp "${u.rp}" không có trong roleplay/data-*.js`);
  ids.push(`cf:${u.id}`);
  const L = u.dialogue || {};
  if (!L.a || !L.aRole || !Array.isArray(L.lines) || L.lines.length < 6 || L.lines.length > 10) E(`${W}: hội thoại mẫu cần 6–10 câu, a, aRole`);
  for (const [s, x] of L.lines || []) { if (!['a', 'b'].includes(s) || !x || VI.test(x)) E(`${W}: câu hội thoại lỗi "${x}"`); }
  const ph = u.phrases || [];
  if (ph.length < 6 || ph.length > 8) E(`${W}: cần 6–8 cụm câu (có ${ph.length})`);
  const seen = new Set();
  const phrases = ph.map(p => {
    const w = `${W} ${p.id}`;
    if (!ID.test(p.id) || seen.has(p.id)) E(`${w}: id cụm sai/trùng`); seen.add(p.id);
    ids.push(`cf:${u.id}:${p.id}`);
    if (!p.say || !p.not || p.say.trim() === p.not.trim()) E(`${w}: cần cặp say/not khác nhau`);
    if (!p.gap || !new RegExp(`\\b${p.gap.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(p.say)) E(`${w}: gap "${p.gap}" không có trong câu`);
    if (p.tk && !toolkit.some(g => g.id === p.tk)) E(`${w}: tk "${p.tk}" không phải nhóm bộ công cụ`);
    b1(p.mean && p.mean.en, w + ' mean'); b1(p.why && p.why.en, w + ' why');
    return { id: p.id, say: p.say, not: p.not, gap: p.gap, mean: key(p.mean, w + ' mean'), meanEn: (p.mean || {}).en, why: key(p.why, w + ' why'), ...(p.tk ? { tk: p.tk } : {}) };
  });
  const r = u.roleplay || {};
  if (!r.ai || !r.ai.name || !r.you || !Array.isArray(r.turns) || r.turns.length < 3 || !r.end) E(`${W}: roleplay thiếu ai/you/turns≥3/end`);
  for (const [k, x] of (r.turns || []).entries()) {
    if (!x.a || !x.h) E(`${W}: lượt ${k} thiếu a/h`);
    for (const [re] of x.br || []) { try { new RegExp('\\b(' + re + ')', 'i'); } catch (e) { E(`${W}: lượt ${k} regex lỗi ${re}`); } }
  }
  b1(r.you, W + ' roleplay.you'); b1(u.goal && u.goal.en, W + ' goal');
  return { id: u.id, level: u.level, em: u.em, rp: u.rp || null, title: key(u.title, W + ' title'), titleEn: (u.title || {}).en, goal: key(u.goal, W + ' goal'), dialogue: L, phrases, roleplay: r };
});
for (const lv of ['A1', 'A2', 'B1']) if (outUnits.filter(u => u.level === lv).length < 4) E(`cấp ${lv} cần ≥ 4 bài`);
const outTk = toolkit.map(g => {
  if (!ID.test(g.id)) E(`toolkit: id nhóm sai ${g.id}`);
  b1(g.intro && g.intro.en, `toolkit ${g.id} intro`);
  const ps = g.phrases.map(p => { ids.push(`cf:tk:${g.id}:${p.id}`); if (!ID.test(p.id)) E(`toolkit ${g.id}: id cụm sai ${p.id}`); b1(p.mean && p.mean.en, `toolkit ${g.id}.${p.id}`); return { id: p.id, say: p.say, mean: key(p.mean, `toolkit ${g.id}.${p.id}`) }; });
  if (ps.length < 4) E(`toolkit ${g.id}: cần ≥ 4 cụm`);
  return { id: g.id, em: g.em, title: key(g.title, `toolkit ${g.id} title`), intro: key(g.intro, `toolkit ${g.id} intro`), phrases: ps };
});
for (const x of ['repair', 'fillers', 'smalltalk', 'disagree', 'noword']) if (!outTk.some(g => g.id === x)) E(`toolkit thiếu nhóm ${x}`);
const dIds = new Set(); for (const q of daily) { if (!ID.test(q.id) || dIds.has(q.id)) E(`daily: id sai/trùng ${q.id}`); dIds.add(q.id); ids.push(`cf:daily:${q.id}`); b1(q.q, `daily ${q.id}`); }
for (const [k, v] of Object.entries(ui)) { if (VI.test(v)) E(`ui "${k}": bản en có chữ Việt`); b1(v, `ui "${k}"`); }
if (new Set(ids).size !== ids.length) E('id trùng giữa các bài/bộ công cụ');

// ---------- Id vĩnh viễn (link video/script bank) ----------
const LOCK = 'content/confidence/ids.lock.json', lock = fs.existsSync(R(LOCK)) ? J(LOCK) : [];
const gone = lock.filter(x => !ids.includes(x));
if (gone.length) E(`id đã phát hành bị xóa/đổi (link video sẽ chết): ${gone.slice(0, 5).join(', ')}`);

// ---------- Khóa: nhóm tải lười "confidence" vs khóa đã có ở nhóm khác ----------
const EN_CORE = loadDict('web/js/i18n/en.js');
const groups = ((rd('scripts/build-i18n.sh').match(/^LAZY="([^"]*)"/m) || [])[1] || '').split(/\s+/).filter(g => g && g !== 'confidence');
const EN_OTHER = Object.assign({}, ...groups.map(g => loadDict(`web/js/i18n/en/${g}.js`)));
const GROUP = {};
for (const [k, v] of [...Object.entries(ui), ...KEYS]) {
  if (EN_CORE[k] != null || EN_OTHER[k] != null) { if ((EN_CORE[k] ?? EN_OTHER[k]) !== v) E(`khóa "${k}" đã có ở nhóm khác với bản en khác ("${EN_CORE[k] ?? EN_OTHER[k]}")`); continue; }
  GROUP[k] = v;
}
// Khóa ngoài nhóm (lõi en.js / rpbasic) do tính năng này thêm → bản dịch qua scripts/i18n-fixed.json
const EXTRA = J('content/confidence/i18n-extra.json'); delete EXTRA._note;
for (const k of Object.keys(EXTRA)) if (EN_CORE[k] == null && EN_OTHER[k] == null) E(`i18n-extra "${k}" không có trong en.js/nhóm tải lười`);
const ALL = { ...GROUP, ...Object.fromEntries(Object.keys(EXTRA).map(k => [k, EN_CORE[k] ?? EN_OTHER[k]])) };

// ---------- Bản dịch 13 ngôn ngữ ----------
const vars = s => (String(s).match(/\{[a-zA-Z0-9_]+\}/g) || []).sort().join(',');
const TR = {};
for (const l of LANGS) {
  const f = `content/confidence/i18n/${l}.json`, d = fs.existsSync(R(f)) ? J(f) : {};
  TR[l] = d; let miss = 0;
  for (const [k, en] of Object.entries(ALL)) {
    const v = d[k];
    if (v == null || !String(v).trim()) { miss++; continue; }
    if (vars(v) !== vars(en)) E(`${l} "${k}": sai biến`);
    if (VI.test(v)) E(`${l} "${k}": lẫn chữ Việt`);
    const lost = missingSegments(k, en, v); if (lost.length) E(`${l} "${k}": mất tiếng Anh mẫu ${lost.join(' | ')}`);
  }
  if (miss) E(`${l}: thiếu ${miss}/${Object.keys(ALL).length} bản dịch (content/confidence/i18n/${l}.json)`);
  for (const k of Object.keys(d)) if (!(k in ALL) && k !== '_note') E(`${l}: khóa thừa "${k.slice(0, 40)}"`);
}

// ---------- Sinh ----------
const data = { v: 1, units: outUnits, toolkit: outTk, daily: daily.map(({ id, q, tip }) => ({ id, q, tip })) };
const OUT = {
  'web/js/confidence/data.js': `/* 🗣️ Giao tiếp tự tin – FILE SINH TỰ ĐỘNG từ content/confidence/*.json bằng scripts/confidence/build.mjs. Đừng sửa tay. */\nself.CONF = ${JSON.stringify(data)};\n`,
  'web/js/i18n/en/confidence.js': `/* English UI – confidence (lazy group, LAZY in scripts/build-i18n.sh). GENERATED from content/confidence by scripts/confidence/build.mjs – do not edit. */\n(function (g) {\n  const D = g.I18N_DICT = g.I18N_DICT || {};\n  D.en = Object.assign(D.en || {}, ${JSON.stringify(GROUP, null, 1).replace(/\n/g, '\n  ')});\n})(typeof self !== 'undefined' ? self : this);\n`,
};
for (const l of LANGS) OUT[`web/js/i18n/${l}/confidence.js`] = `/* UI ${l} – confidence (nhóm tải lười). Sinh tự động từ scripts/build-i18n.sh. */\n(function (g) { const D = g.I18N_DICT = g.I18N_DICT || {}; D["${l}"] = Object.assign(D["${l}"] || {}, ${JSON.stringify(Object.fromEntries(Object.keys(GROUP).map(k => [k, TR[l][k] ?? GROUP[k]])))}); })(typeof self !== 'undefined' ? self : this);\n`;
const short = v => String(v).trim().split(/\s+/).length <= 3 && !/[{<]/.test(v);
const FIX = 'scripts/i18n-fixed.json', fixed = J(FIX);
for (const [k, en] of Object.entries(ALL)) if (EXTRA[k] != null || short(en)) fixed[k] = Object.assign(fixed[k] || {}, Object.fromEntries(LANGS.filter(l => TR[l][k]).map(l => [l, TR[l][k]])));
const SRC = { _note: 'Đầu vào cho người dịch: khóa (vi) → bản tiếng Anh. Dịch từ tiếng Anh; giữ nguyên {biến} và mọi cụm tiếng Anh trong ngoặc kép.', ...ALL };
if (WRITE) {
  for (const [f, c] of Object.entries(OUT)) { fs.mkdirSync(path.dirname(R(f)), { recursive: true }); fs.writeFileSync(R(f), c); }
  fs.writeFileSync(R(FIX), JSON.stringify(fixed, null, 2) + '\n');
  fs.writeFileSync(R('content/confidence/i18n/_source.json'), JSON.stringify(SRC, null, 1) + '\n');
  if (!errs.length) fs.writeFileSync(R(LOCK), JSON.stringify([...new Set([...lock, ...ids])], null, 0).replace(/","/g, '",\n"') + '\n');
} else {
  for (const [f, c] of Object.entries(OUT)) {
    if (f.includes('/i18n/') && !f.includes('/en/')) continue; // split-i18n ghi lại nhóm ngôn ngữ (cùng nội dung, khác định dạng) – đã kiểm ở trên
    if (!fs.existsSync(R(f)) || rd(f) !== c) E(`${f} lệch nguồn – chạy: node scripts/confidence/build.mjs --write`);
  }
  for (const x of ids) if (!lock.includes(x)) E(`id mới chưa khoá: ${x} – chạy --write`);
}
const n = outUnits.reduce((a, u) => a + u.phrases.length, 0);
if (errs.length) { console.error(`✗ confidence: ${errs.length} lỗi\n  - ` + errs.slice(0, 40).join('\n  - ')); process.exit(1); }
console.log(`✓ confidence: ${outUnits.length} bài · ${n} cụm · ${outTk.length} nhóm công cụ · ${daily.length} đề ngày · ${Object.keys(ALL).length} khóa × ${LANGS.length} ngôn ngữ${WRITE ? ' (đã ghi)' : ''}`);
