// Nạp dữ liệu app (web/js/…) cho trang SEO tĩnh – dùng chung bởi build-samples.mjs (vi) và build-samples-en.mjs (en).
import fs from 'node:fs'; import vm from 'node:vm';

const ctx = (extra = {}) => { const c = { self: {}, window: {}, t: s => s, localStorage: { getItem() {}, setItem() {} }, ...extra }; c.self = c.window = c; vm.createContext(c); return c; };
const run = (c, f) => vm.runInContext(fs.readFileSync(`web/js/${f}.js`, 'utf8'), c);
const load = files => { const c = ctx(); for (const f of files) run(c, f); return c; };

// Writing Task 2: đề (write.js PROMPTS + WRITE_MORE) + bài mẫu (MODELS)
export function loadWriting() {
  const c = load(['write/task2-more', 'models', 'write/models2', 'write/models3', 'write/models4', 'write/models5']);
  const w = fs.readFileSync('web/js/write.js', 'utf8'), T = (id, type, topic, text) => ({ id, type, topic, text });
  const P = vm.runInNewContext(w.slice(w.indexOf('const PROMPTS = [') + 16, w.indexOf('];', w.indexOf('const PROMPTS = [')) + 1), { T });
  for (const a of c.WRITE_MORE || []) if (!P.some(p => p.id === a[0])) P.push(T(...a));
  return { PROMPTS: P, MODELS: c.MODELS || [] };
}
// IELTS Speaking: BANK (speaking.js) + SPEAK_MORE + câu trả lời mẫu
export function loadSpeaking() {
  const sp = fs.readFileSync('web/js/speaking.js', 'utf8'), i0 = sp.indexOf('const BANK = [') + 13;
  const BANK = vm.runInNewContext(sp.slice(i0, sp.indexOf('\n  ];', i0) + 4), { t: s => s });
  const c = load(['speak/samples', 'speak/more', 'speak/more2', 'speak/more3']);
  for (const x of c.SPEAK_MORE || []) if (!BANK.some(b => b.title === x.title)) BANK.push(x);
  return { BANK, S: c.SPEAK_SAMPLES || {} };
}
// Bộ từ vựng + khóa file phát âm (Kokoro bf_emma, audio.lexkite.com) – chỉ gắn nút nghe khi file có trong LISTEN_AUDIO
export function loadVocab() {
  const c = load(['data', ...['topics-more', 'skills', 'awl', 'ngsl', 'tsl-a', 'tsl-b', 'domain-a', 'domain-b', 'exam-vocab', 'exam-vocab2', 'exam-vocab3'].map(f => 'lib/' + f), 'listen/kvoice', 'listen/audio-index']);
  const has = c.LISTEN_AUDIO || new Set(), K = c.KVoice;
  const audioKey = w => { if (!K) return ''; const k = K.lineKey('bf_emma', w); return has.has(k) ? k : ''; };
  return { TOPICS: c.IELTS_DATA.TOPICS.filter(x => x.words && x.words.length >= 8), audioKey };
}
const CEFR = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
// Chip cho bộ từ: trình độ (khoảng CEFR của các từ) + kỳ thi (theo nhóm hoặc tên bộ)
export function vocabMeta(x) {
  const lv = [...new Set(x.words.map(w => String(w.level || '').toUpperCase()).filter(l => CEFR.includes(l)))].sort((a, b) => CEFR.indexOf(a) - CEFR.indexOf(b));
  const level = lv.length ? (lv.length === 1 ? lv[0] : `${lv[0]}–${lv.at(-1)}`) : '';
  const byName = [...new Set((`${x.name} ${x.desc || ''}`.match(/IELTS|TOEIC|TOEFL/g) || []))];
  const byGroup = { topics: ['IELTS'], writing: ['IELTS'], speaking: ['IELTS'], awl: ['IELTS', 'TOEFL'], toeic: ['TOEIC'] }[x.group] || [];
  return { level, exams: byName.length ? byName : byGroup };
}
// Bộ cùng nhóm để gợi ý (lấy các bộ kế tiếp, xoay vòng → mỗi trang gợi ý khác nhau, ổn định giữa các lần build)
export function relatedOf(list, item, same, n = 6) {
  const pool = list.filter(x => x !== item && same(x));
  const i = list.indexOf(item), after = pool.filter(x => list.indexOf(x) > i), before = pool.filter(x => list.indexOf(x) < i);
  return [...after, ...before].slice(0, n);
}
// Ngữ pháp: bài + tên chủ điểm (UNITS trong web/js/grammar.js)
export function loadGrammar() {
  const c = load(['grammar/tenses', 'grammar/verbs', 'grammar/sentences', 'grammar/foundation', 'grammar/academic', 'grammar/chapters', 'grammar/book2']);
  const g = fs.readFileSync('web/js/grammar.js', 'utf8'), i0 = g.indexOf('const UNITS = [') + 14;
  let UNITS = []; try { UNITS = vm.runInNewContext(g.slice(i0, g.indexOf('];', i0) + 1)); } catch { /* thiếu tên chủ điểm → dùng id */ }
  return { G: c.GRAMMAR || [], UNITS };
}
// IELTS General Task 1: đề thư + thư mẫu
export function loadLetters() {
  const c = load(['write/gt-letters']);
  return { LT: c.GT_LETTERS || [], MD: c.MODELS || [] };
}
// IELTS Academic Task 1: đề (SETS trong task1.js + TASK1_MORE) + bài mẫu MODELS 't1-<id>'
export function loadTask1() {
  const c = load(['models', 'write/task1-more', 'write/task1-more2']);
  const w = fs.readFileSync('web/js/task1.js', 'utf8'), i0 = w.indexOf('const SETS = [') + 13;
  const SETS = vm.runInNewContext(w.slice(i0, w.indexOf('\n  ];', i0) + 4));
  for (const d of c.TASK1_MORE || []) if (!SETS.some(x => x.id === d.id)) SETS.push(d);
  return { SETS, MODELS: (c.MODELS || []).filter(m => m.task === 1) };
}
// Phát âm: 56 bài (44 âm IPA + kỹ năng) – web/js/pron/*.js
export function loadPron() { const c = load(['pron/sounds', 'pron/skills']); return c.PRON || []; }
