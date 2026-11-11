#!/usr/bin/env node
// Bảng động từ bất quy tắc (#/irregular, docs/LEXICON.md). Dạng V1/V2/V3 chỉ có MỘT nguồn: IRR trong web/js/verbs-core.js.
// Nguồn nội dung: content/verbs/irregular.json (CEFR, IPA Anh/Mỹ, nghĩa en, 2 câu ví dụ) + content/verbs/i18n/<lang>.json (nghĩa + ví dụ bản ngữ).
// Đối chiếu: content/verbs/sources/{wordnet-forms,cmudict-forms}.json. Ra: web/cpack/irv/core.json + web/cpack/irv/<lang>.json (tải lười).
// Dùng: node scripts/verbs/build-irregular.mjs        → kiểm + ghi · --check → kiểm + đỏ khi bản đã commit lệch (npm test)
import fs from 'node:fs'; import vm from 'node:vm';
const J = f => JSON.parse(fs.readFileSync(f, 'utf8')), CHECK = process.argv.includes('--check');
const ctx = {}; ctx.self = ctx; vm.runInNewContext(fs.readFileSync('web/js/verbs-core.js', 'utf8'), ctx);
export const list = ctx.LK_VERBS.irregularList();
const src = J('content/verbs/irregular.json'), cmu = J('content/verbs/sources/cmudict-forms.json'), wn = J('content/verbs/sources/wordnet-forms.json');
const ipaOk = J('content/verbs/sources/ipa-reviewed.json'), formOk = new Set(J('content/verbs/sources/forms-reviewed.json').list);
const LANGS = ['vi', ...fs.readFileSync('scripts/i18n-langs.txt', 'utf8').split('\n').map(s => s.trim()).filter(s => /^[a-z]{2}$/.test(s))];
const errs = [], err = s => errs.push(s);
// ---------- IPA Mỹ so với CMUdict (bỏ trọng âm/độ dài; gộp nguyên âm yếu và ɑ/ɔ vì CMU ghi theo giọng có cot–caught) ----------
const AR = { AA: 'ɑ', AE: 'æ', AH: 'ə', AO: 'ɑ', AW: 'aʊ', AY: 'aɪ', B: 'b', CH: 'tʃ', D: 'd', DH: 'ð', EH: 'e', ER: 'ər', EY: 'eɪ', F: 'f', G: 'ɡ', HH: 'h', IH: 'ə', IY: 'i', JH: 'dʒ', K: 'k', L: 'l', M: 'm', N: 'n', NG: 'ŋ', OW: 'oʊ', OY: 'ɑɪ', P: 'p', R: 'r', S: 's', SH: 'ʃ', T: 't', TH: 'θ', UH: 'ʊ', UW: 'u', V: 'v', W: 'w', Y: 'j', Z: 'z', ZH: 'ʒ' };
const dip = s => s.replace(/aɪ/g, 'A').replace(/eɪ/g, 'E').replace(/[ɑɔ]ɪ/g, 'O').replace(/oʊ/g, 'Q').replace(/aʊ/g, 'W');
const fromCmu = s => dip(s.split(' ').map(p => AR[p.replace(/\d/, '')]).join('')).replace(/ir/g, 'ər').replace(/ur/g, 'ʊr');
const norm = s => dip(s.replace(/[\/ˈˌː.()]/g, '').replace(/ɛ/g, 'e').replace(/g/g, 'ɡ')).replace(/[ʌɜɪ]/g, 'ə').replace(/[ɝɚ]/g, 'ər').replace(/ɔ/g, 'ɑ').replace(/ʤ/g, 'dʒ').replace(/ʧ/g, 'tʃ');
const norm2 = s => norm(s).replace(/ur/g, 'ʊr');
const wordCount = (s, w) => (s.match(new RegExp(`(^|[^A-Za-z'’-])${w}(?=$|[^A-Za-z'’-])`, 'gi')) || []).length;
const rank = new Map(); for (const f of ['web/js/lib/ngsl.js', 'web/js/lib/ngsl2.js']) for (const m of fs.readFileSync(f, 'utf8').matchAll(/^\s*\['([^']+)'/gm)) { const w = m[1].toLowerCase(); if (!rank.has(w)) rank.set(w, rank.size + 1); } // hạng tần suất NGSL 1.2 (thứ tự trong ngsl*.js)
const FREQ = r => (!r ? 3 : r <= 500 ? 0 : r <= 1500 ? 1 : 2); // 0 cốt lõi · 1 thông dụng · 2 ít gặp hơn · 3 hiếm
const core = [];
for (const v of list) {
  const e = src[v.base]; if (!e) { err(`${v.base}: thiếu trong irregular.json`); continue; }
  if (!/^(A1|A2|B1|B2|C1|C2)$/.test(e.cefr)) err(`${v.base}: cefr`);
  if (!e.g || /[;]|^to /.test(e.g)) err(`${v.base}: nghĩa en`);
  const P = v.past[0].w, PP = v.pp[0].w;
  for (const [k, w] of [['p', P], ['pp', PP]]) {
    const s = e[k] || ''; if (!/[.!?]$/.test(s)) err(`${v.base}.${k}: thiếu dấu câu`);
    const n = s.split(/\s+/).length; if (n < 4 || n > 9) err(`${v.base}.${k}: ${n} từ`);
    if (wordCount(s, w) !== 1) err(`${v.base}.${k}: "${w}" phải xuất hiện đúng 1 lần – ${s}`);
    if (k === 'p' && /\b(have|has|had)\b/i.test(s) && v.base !== 'have') err(`${v.base}.p: không dùng have`);
  }
  const forms = [...new Set([v.base, ...v.past.map(x => x.w), ...v.pp.map(x => x.w)])];
  for (const f of forms) {
    const ip = (e.ipa || {})[f]; if (!Array.isArray(ip) || ip.length !== 2 || !ip.every(x => /^\/.+\/$/.test(x))) { err(`${v.base}: IPA ${f}`); continue; }
    const c = cmu[f] || [], ok = !c.length || c.some(x => fromCmu(x) === norm2(ip[1])), rev = ipaOk[f] && ipaOk[f].us === ip[1];
    if (!ok && !rev) err(`${v.base}: IPA Mỹ ${f} ${ip[1]} ≠ CMU ${c.map(fromCmu).join(' | ')}`);
    if (f !== v.base && !/ed$/.test(f) && !(wn[f] || []).includes(v.base) && !formOk.has(`${v.base}:${f}`)) err(`${v.base}: dạng ${f} không có trong WordNet và chưa duyệt`);
  }
  core.push([v.base, e.cefr, FREQ(rank.get(v.base)), v.pattern, e.ipa, e.p, e.pp, e.g, e.n || '', e.ipaB || '', `${v.base}, ${P}, ${PP}.`]); // cột cuối = chuỗi 3 dạng để đọc liền (giọng Kokoro, corpus.mjs)
}
for (const b of Object.keys(src)) if (!list.some(v => v.base === b)) err(`${b}: thừa trong irregular.json`);
const out = { 'web/cpack/irv/core.json': JSON.stringify({ v: 1, rows: core }) };
for (const l of LANGS) {
  const f = `content/verbs/i18n/${l}.json`; if (!fs.existsSync(f)) { err(`${l}: thiếu tệp dịch`); continue; }
  const d = J(f), rows = {};
  for (const v of list) {
    const e = src[v.base], x = d[v.base]; if (!e) continue; if (!x) { err(`${l}/${v.base}: thiếu`); continue; }
    for (const k of ['g', 'p', 'pp']) { if (!x[k] || !String(x[k]).trim()) err(`${l}/${v.base}.${k}: rỗng`); else if (l !== 'vi' && /[ăđơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỷỹ]/i.test(x[k])) err(`${l}/${v.base}.${k}: lẫn tiếng Việt`); if (x[k] && x[k] === e[k]) err(`${l}/${v.base}.${k}: chưa dịch`); }
    if (!!x.n !== !!e.n) err(`${l}/${v.base}: ghi chú lệch nguồn`);
    rows[v.base] = x.n ? [x.g, x.p, x.pp, x.n] : [x.g, x.p, x.pp];
  }
  out[`web/cpack/irv/${l}.json`] = JSON.stringify({ v: 1, rows });
}
if (errs.length) { console.error(`✗ ${errs.length} lỗi dữ liệu động từ bất quy tắc:\n` + errs.slice(0, 60).join('\n')); process.exit(1); }
let drift = 0;
for (const [f, s] of Object.entries(out)) { if (CHECK) { if (!fs.existsSync(f) || fs.readFileSync(f, 'utf8') !== s) { console.error('✗ lệch: ' + f + ' → node scripts/verbs/build-irregular.mjs'); drift++; } } else { fs.mkdirSync('web/cpack/irv', { recursive: true }); fs.writeFileSync(f, s); } }
if (drift) process.exit(1);
console.log(`✓ ${core.length} động từ bất quy tắc, ${LANGS.length} ngôn ngữ`);
