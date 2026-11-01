// Kiểm nội dung Play & Speak: content/situations/*.json (docs/specs/play-and-speak.md §3, §6).
// Chạy: node scripts/test/situations.mjs  (không mạng, không phụ thuộc)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const DIR = path.join(ROOT, 'content/situations');
const LANGS = ['en', 'vi', ...fs.readFileSync(path.join(ROOT, 'scripts/i18n-langs.txt'), 'utf8').split('\n').map(s => s.trim()).filter(s => s && !s.startsWith('#'))];
const SCRIPT = { ar: /[؀-ۿ]/, ru: /[Ѐ-ӿ]/, th: /[฀-๿]/, hi: /[ऀ-ॿ]/, zh: /[一-鿿]/, ja: /[぀-ヿ一-鿿]/, ko: /[가-힯]/ };
const CEFR = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const VOICES = ['ama', 'carlos'];
const WHO = ['customer', 'barista'];
const MAX_WORDS = { A1: 12, A2: 12 };

const errs = [];
const words = s => (s || '').toLowerCase().match(/[a-z]+(?:'[a-z]+)?/g) || [];
const nWords = s => (s || '').trim().split(/\s+/).filter(Boolean).length;
const isStr = v => typeof v === 'string' && v.trim().length > 0;

let ok = 0;
if (LANGS.length !== 15) errs.push(`i18n-langs.txt: cần 13 mã + en + vi = 15, đang có ${LANGS.length}`);
const files = fs.existsSync(DIR) ? fs.readdirSync(DIR).filter(f => f.endsWith('.json')).sort() : [];
if (!files.length) errs.push('content/situations: không có tệp .json nào');

for (const f of files) {
  const E = m => errs.push(`${f}: ${m}`);
  let s;
  try { s = JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8')); } catch (e) { E(`JSON lỗi – ${e.message}`); continue; }
  const before = errs.length;
  const multi = []; // mọi trường {15} để đo tỉ lệ đã dịch
  const L15 = (v, where) => {
    if (!v || typeof v !== 'object' || Array.isArray(v)) return E(`${where}: phải là object 15 ngôn ngữ`);
    for (const l of LANGS) if (!isStr(v[l])) E(`${where}: thiếu/rỗng "${l}"`);
    for (const k of Object.keys(v)) if (!LANGS.includes(k)) E(`${where}: mã ngôn ngữ lạ "${k}"`);
    for (const [l, re] of Object.entries(SCRIPT)) if (isStr(v[l]) && !re.test(v[l])) E(`${where}.${l}: sai hệ chữ (không thấy ký tự ${l})`);
    multi.push([where, v]);
  };

  if (s.id !== path.basename(f, '.json')) E(`id "${s.id}" phải trùng tên tệp`);
  if (!isStr(s.group)) E('thiếu group');
  if (!CEFR.includes(s.cefr)) E(`cefr "${s.cefr}" không hợp lệ`);
  L15(s.title, 'title'); L15(s.goal, 'goal'); L15(s.culture, 'culture');
  if (!Array.isArray(s.roles) || s.roles.length !== 2 || !s.roles.every(r => WHO.includes(r))) E(`roles phải là 2 vai trong ${WHO.join('/')}`);
  const roles = new Set(s.roles || []);

  // lines
  const lines = Array.isArray(s.lines) ? s.lines : (E('lines phải là mảng'), []);
  const ids = new Set(), allIds = [];
  const maxW = MAX_WORDS[s.cefr];
  for (const [i, ln] of lines.entries()) {
    const w = `lines[${i}]${ln && ln.id ? '#' + ln.id : ''}`;
    if (!ln || typeof ln !== 'object') { E(`${w}: không phải object`); continue; }
    if (!isStr(ln.id)) E(`${w}: thiếu id`); else { if (ids.has(ln.id)) E(`${w}: id trùng`); ids.add(ln.id); }
    if (!roles.has(ln.who)) E(`${w}: who "${ln.who}" không thuộc roles`);
    if (!isStr(ln.en)) E(`${w}: thiếu en`);
    if (!ln.variants || !isStr(ln.variants.polite) || !isStr(ln.variants.casual)) E(`${w}: variants cần polite + casual`);
    if (maxW) for (const [k, t] of [['en', ln.en], ['polite', ln.variants?.polite], ['casual', ln.variants?.casual]]) if (isStr(t) && nWords(t) > maxW) E(`${w}.${k}: ${nWords(t)} từ > ${maxW} (${s.cefr})`);
    L15(ln.gloss, `${w}.gloss`);
    if (!ln.audio || !VOICES.includes(ln.audio.voice) || typeof ln.audio.slow !== 'boolean') E(`${w}: audio cần voice ∈ {${VOICES}} + slow boolean`);
    else { const want = ln.who === 'customer' ? 'ama' : 'carlos'; if (ln.audio.voice !== want) E(`${w}: vai ${ln.who} phải dùng giọng ${want}`); }
    if (!Array.isArray(ln.pitfalls)) E(`${w}: pitfalls phải là mảng`);
    for (const [j, p] of (ln.pitfalls || []).entries()) {
      const pw = `${w}.pitfalls[${j}]`;
      if (!isStr(p.l1) || !(p.l1 === '*' || LANGS.includes(p.l1))) E(`${pw}: l1 phải là "*" hoặc mã ngôn ngữ`);
      if (!isStr(p.w) || !words(ln.en).includes(p.w.toLowerCase())) E(`${pw}: w "${p.w}" không phải một từ của en`);
      if (p.ipa != null && !/^\/.+\/$/.test(p.ipa)) E(`${pw}: ipa phải dạng /…/`);
      L15(p.note, `${pw}.note`);
      if (p.hi != null && !(isStr(p.hi) && p.note?.en?.includes(p.hi))) E(`${pw}: hi "${p.hi}" phải là chuỗi con của note.en`);
    }
    if (ln.open === true) {
      if (!Array.isArray(ln.keywords) || ln.keywords.length < 3 || !ln.keywords.every(isStr)) E(`${w}: câu mở cần keywords (≥3 chuỗi)`);
    } else if (ln.open != null) E(`${w}: open chỉ được là true`);
    else if (ln.keywords) E(`${w}: keywords chỉ dành cho câu mở`);
  }
  const practice = lines.filter(l => l && l.open !== true), open = lines.filter(l => l && l.open === true);
  if (practice.length !== 12) E(`cần đúng 12 câu luyện, đang có ${practice.length}`);
  if (open.length !== 2) E(`cần đúng 2 câu mở, đang có ${open.length}`);
  if (lines.filter(l => l && (l.pitfalls || []).length).length < 3) E('cần ≥3 câu có pitfall');

  // stages
  if (!Array.isArray(s.stages) || !s.stages.length) E('thiếu stages');
  const seen = new Map(), stIds = new Set();
  for (const [i, st] of (s.stages || []).entries()) {
    const w = `stages[${i}]`;
    if (!isStr(st.id) || stIds.has(st.id)) E(`${w}: id thiếu/trùng`); stIds.add(st.id);
    L15(st.title, `${w}.title`);
    if (!Array.isArray(st.lines) || !st.lines.length) E(`${w}: lines rỗng`);
    for (const id of st.lines || []) { if (!ids.has(id)) E(`${w}: id câu "${id}" không tồn tại`); seen.set(id, (seen.get(id) || 0) + 1); }
  }
  for (const l of practice) if (seen.get(l.id) !== 1) E(`stages: câu luyện "${l.id}" xuất hiện ${seen.get(l.id) || 0} lần (cần đúng 1)`);
  for (const l of open) if (seen.has(l.id)) E(`stages: câu mở "${l.id}" không được nằm trong stage`);

  // dialogue
  const dlg = s.dialogue || [];
  if (!Array.isArray(dlg) || dlg.length < 8 || dlg.length > 10) E(`dialogue cần 8–10 lượt, đang có ${dlg.length}`);
  for (const [i, t] of dlg.entries()) if (!roles.has(t.who) || !isStr(t.en)) E(`dialogue[${i}]: cần who thuộc roles + en`);

  // listening
  const lis = s.listening || [];
  if (!Array.isArray(lis) || lis.length !== 2) E(`listening cần đúng 2 bài, đang có ${lis.length}`);
  const lisIds = new Set();
  for (const [i, x] of lis.entries()) {
    const w = `listening[${i}]`;
    if (!isStr(x.id) || lisIds.has(x.id)) E(`${w}: id thiếu/trùng`); lisIds.add(x.id);
    if (!Array.isArray(x.turns) || x.turns.length < 2) E(`${w}: cần ≥2 lượt`);
    for (const [j, t] of (x.turns || []).entries()) if (!roles.has(t.who) || !isStr(t.en)) E(`${w}.turns[${j}]: cần who + en`);
    L15(x.q, `${w}.q`);
    const all = (x.turns || []).map(t => t.en || '').join(' ').toLowerCase();
    if (!isStr(x.answer) || !all.includes(x.answer.toLowerCase())) E(`${w}: answer "${x.answer}" không có trong turns`);
  }

  // mission
  const tasks = s.mission?.tasks;
  if (!Array.isArray(tasks) || tasks.length !== 3) E(`mission.tasks cần đúng 3, đang có ${tasks?.length}`);
  const tIds = new Set();
  for (const [i, t] of (tasks || []).entries()) {
    const w = `mission.tasks[${i}]`;
    if (!isStr(t.id) || tIds.has(t.id)) E(`${w}: id thiếu/trùng`); tIds.add(t.id);
    L15(t.title, `${w}.title`);
    if (!Array.isArray(t.intents) || !t.intents.length) E(`${w}: intents rỗng`);
    for (const id of t.intents || []) if (!ids.has(id)) E(`${w}: intent "${id}" không phải id câu`);
  }

  // id duy nhất toàn tệp (câu, stage, bài nghe, nhiệm vụ)
  for (const id of [...stIds, ...lisIds, ...tIds]) allIds.push(id);
  for (const id of allIds) if (ids.has(id)) E(`id "${id}" trùng với id câu`);

  // tỉ lệ đã dịch: mỗi ngôn ngữ khác en ở ≥80% trường {15}
  for (const l of LANGS.filter(l => l !== 'en')) {
    const diff = multi.filter(([, v]) => isStr(v[l]) && v[l].trim() !== (v.en || '').trim()).length;
    if (multi.length && diff / multi.length < 0.8) E(`${l}: chỉ ${diff}/${multi.length} trường khác en (<80%) – còn sót tiếng Anh?`);
  }

  if (errs.length === before) ok++;
}

if (errs.length) { for (const e of errs) console.error('✗', e); console.error(`situations: ${errs.length} lỗi`); process.exit(1); }
console.log(`situations: ${ok} ok`);
