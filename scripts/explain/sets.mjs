import { fileURLToPath } from 'node:url';
// Bộ câu hỏi cần lời giải (docs/EXPLAIN.md). Mỗi bộ → items(): [{ id, sub, type, s, ans, alts, ctx }]
//   id ổn định (không phụ thuộc thứ tự câu), sub = tệp con tải lười web/js/explain/<sub>/<lang>.json, alts = MỌI phương án nhiễu có thể hiện.
import fs from 'fs';
import { createRequire } from 'module';
const ROOT = new URL('../../', import.meta.url), R = p => fileURLToPath(new URL(p, ROOT));
const require = createRequire(import.meta.url);
export const LANGS = ['vi', 'ko', 'th', 'hi', 'zh', 'ja', 'ar', 'es', 'pt', 'fr', 'de', 'id', 'ru', 'tr']; // + en (nguồn)

let U = null;
export function usage() {
  if (U) return U;
  globalThis.self = globalThis.self || globalThis;
  require(R('web/js/usage-core.js'));
  for (const f of fs.readdirSync(R('web/js/usage')).sort()) require(R('web/js/usage/' + f));
  return (U = self.LK_USAGE);
}
const TYPES = { p: 'dependent preposition / collocation', v: 'verb pattern (to-V / V-ing …)', a: 'adverb form / position', s: 'sentence structure', c: 'confusable word pair' };

let XC = null, G = null;
const card = () => { if (!XC) { globalThis.self = globalThis.self || globalThis; require(R('web/js/explain-card.js')); XC = self.ExplainCard; } return XC; };
function grammar() {
  if (G) return G;
  globalThis.self = globalThis.self || globalThis;
  for (const f of ['tenses', 'verbs', 'sentences', 'foundation', 'academic', 'chapters', 'book2', 'drills-a', 'drills-b', 'drills-c', 'check']) require(R(`web/js/grammar/${f}.js`));
  return (G = self.GRAMMAR);
}
export const SETS = {
  // Ngữ pháp (bài trắc nghiệm cuối bài): giữ lời giải vi sẵn có làm ngữ cảnh, bổ sung mẫu + vì sao sai TỪNG phương án + ví dụ + mẹo
  grammar() {
    const X = card(), out = {};
    for (const x of grammar()) for (const q of x.quiz || []) {
      if (!Array.isArray(q.options) || q.options[q.answer] == null) continue;
      const id = X.gid(x.id, q.q), ans = q.options[q.answer];
      out[id] = { id, sub: X.gsub(x.id), type: 'grammar multiple choice (lesson: ' + x.id + ')', s: q.q, ans, alts: [...new Set(q.options.filter((o, i) => i !== q.answer && o !== ans))], ctx: String(q.explain || '').slice(0, 600) };
    }
    return Object.values(out);
  },
  usage() {
    const U = usage(), by = {};
    for (const kind of U.KINDS) for (const e of U.load(kind)) for (const q of U.quizItems(e)) {
      const id = U.xid(q); // <kind>|<khóa mục>|<đầu dòng hoặc @đáp án> – cùng công thức với web/js/usage.js
      const x = by[id] || (by[id] = { id, sub: 'usage-' + kind, type: TYPES[kind], s: q.pre + '___' + q.post, ans: q.ans, alts: new Set(), ctx: '' });
      q.choices.forEach(c => c !== q.ans && x.alts.add(c));
      if (!x.ctx) {
        const it = q.item, mis = e.mis.filter(m => it && m.r.includes(' ' + it.h)).map(m => `${m.w} => ${m.r}: ${m.en}`);
        x.ctx = [e.key + (it ? ' ' + it.h : ''), it && it.en ? 'meaning: ' + it.en : '', ...e.notes.map(n => n.en).filter(Boolean), ...mis].filter(Boolean).join(' · ').slice(0, 600);
      }
    }
    return Object.values(by).map(x => ({ ...x, alts: [...x.alts] }));
  }
};
export const items = set => SETS[set]();
