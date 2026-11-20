// Xưởng nội dung – mảng ngữ pháp: kind `mcq` = thêm câu trắc nghiệm cho bài ngữ pháp có sẵn (std 3000 câu, mỗi bài ≥ 39), docs/CONTENT-FACTORY.md §4.
// Kho: content/factory/grammar-quiz.json → web/js/grammar/bank-gen.js (build-grammar-bank.mjs). Luật cứng phản chiếu scripts/test/content-check.mjs (mcq/checkExplain/lintEn).
import { rj, wj, enLint, MAXW, words } from './lib.mjs';
import { loadContent } from '../lib/content-load.mjs';
import { norm as qaNorm } from '../content-qa/lib.mjs';
import { build } from './build-grammar-bank.mjs';

const DATA = 'content/factory/grammar-quiz.json', PER_LESSON = 39, PER_SEED = 5;
const DOC = 'Câu trắc nghiệm ngữ pháp do xưởng nội dung sinh (scripts/factory/grammar.mjs – docs/CONTENT-FACTORY.md §4). Sinh tự động, đừng sửa tay; sửa → content/factory/review.jsonl. web/js/grammar/bank-gen.js được dựng từ tệp này.';
const norm = s => String(s ?? '').toLowerCase().replace(/<[^>]+>/g, '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
const VIA = /[àáâãèéêìíòóôõùúýăđĩũơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]/i;
const FOREIGN = /[Ѐ-ӿ؀-ۿऀ-ॿ฀-๿぀-ヿ㐀-鿿가-힯]/;
const AN_OK = /^(hour|honest|honou?r|heir|herb(?!al)|mba|mp|mri|fbi|faq|sms|x-?ray|nhs|ma\b|msc|f\b|h\b|l\b|m\b|n\b|r\b|s\b|x\b|8|11|18|80)/i;
const A_OK = /^(uni|use|usu|usa|uk\b|ufo|ur[aeiou]|eu|ewe|one\b|one-|once|eur|uti|uto|ubiq|u-|u\b|ute|uv|ukr|ura|uro|uri(?!n))/i;
const L = i => 'ABCDEFGHIJ'[i];

let _C; // nạp nội dung một lần cho mỗi tiến trình (ngữ cảnh vm nặng)
const lessons = () => (_C ||= loadContent()).GRAMMAR || [];
let _Q; const known = () => (_Q ||= new Set(lessons().flatMap(l => (l.quiz || []).map(q => norm(q.q)))));
const genCount = id => ((rj(DATA, { items: {} }).items || {})[id] || []).length;

/** a/an theo âm đầu – phản chiếu content-check lintEn (chỉ phần lỗi cứng) */
function anErrs(where, s) {
  const e = [];
  for (const m of String(s).matchAll(/\b(a|an|A|An)\s+([A-Za-z][\w-]*)/g)) {
    const w = m[2], an = /^an$/i.test(m[1]), vowel = /^[aeiou]/i.test(w);
    if (/^[A-Z]{2,}$/.test(w) || /^[A-Z]$/.test(w)) continue;
    if (an && !vowel && !AN_OK.test(w)) e.push(`${where}: "${m[0]}" → a`);
    else if (!an && vowel && !A_OK.test(w)) e.push(`${where}: "${m[0]}" → an`);
    else if (!an && /^h/i.test(w) && AN_OK.test(w)) e.push(`${where}: "${m[0]}" → an`);
  }
  return e;
}
/** lời giải: không nói đáp án là chữ cái, không chỉ tới phương án sai (phản chiếu checkExplain) */
function explainErrs(where, ex, opts, ai) {
  const e = [];
  if (/[Đđ]áp án(?: đúng)?(?: là)?:?\s*\(?[A-J]\b(?![a-zà-ỹ'’])/.test(ex) || /\b(?:phương án|lựa chọn|đáp án)\s*\(?[A-D]\b(?![a-zà-ỹ'’])/i.test(ex)) e.push(`${where}: lời giải nhắc chữ cái phương án`);
  const right = norm(opts[ai]);
  for (const mm of ex.matchAll(/(?:→|=>|[Đđ]áp án(?: đúng)?(?: là)?:?|[Cc]họn)\s*["“]([^"”]{1,60})["”]/g)) {
    const x = norm(mm[1]); if (!x || x === right || right.includes(x)) continue;
    if (opts.some((o, i) => i !== ai && norm(o) === x)) e.push(`${where}: lời giải chỉ tới phương án sai "${mm[1]}"`);
  }
  if (FOREIGN.test(ex)) e.push(`${where}: lời giải lẫn ký tự ngôn ngữ khác`);
  if (!VIA.test(ex)) e.push(`${where}: lời giải không có tiếng Việt`);
  return e;
}

export const KINDS = {
  mcq: {
    area: 'grammar', kind: 'mcq', std: 3000, touches: [], genChunk: 3, judgeChunk: 4,
    have: () => lessons().reduce((a, l) => a + (l.quiz || []).length, 0),
    seeds() {
      const per = lessons().map(l => ({ l, need: Math.max(0, PER_LESSON - (l.quiz || []).length) })).filter(x => x.need > 0)
        .map(x => ({ ...x, off: Math.floor(genCount(x.l.id) / PER_SEED), cnt: Math.ceil(x.need / PER_SEED) }))
        .sort((a, b) => b.need - a.need || (a.l.id < b.l.id ? -1 : 1));
      const out = [], rounds = Math.max(0, ...per.map(x => x.cnt));
      for (let n = 0; n < rounds; n++) for (const x of per) if (n < x.cnt) {
        out.push({ k: `${x.l.id}#${x.off + n}`, lesson: x.l.id, level: x.l.level, en: x.l.en, summary: String(x.l.summary || '').slice(0, 300),
          avoid: (x.l.quiz || []).map(q => q.q).slice(-8) });
      }
      return out;
    },
    sys: 'You write multiple-choice grammar questions for a Vietnamese-speaking learner app (British Council / Cambridge style). For EACH input object {k, lesson, level, en, summary, avoid} ' +
      'return under key k an object {"qs": [5 questions]}. Output ONE JSON object {"<k>": {"qs": [...]}} and nothing else. Each question = ' +
      '{"q": "<English sentence containing exactly one ___ blank>", "options": [4 different strings], "answer": <index 0-3 of the correct option>, ' +
      '"explain": "<Vietnamese, 1-2 sentences: why the right option is right (the rule); never mention option letters; never present a wrong option as correct>"}. ' +
      'Rules: test ONLY the grammar point named by "en" (summary explains it) at the CEFR level "level"; exactly ONE defensible answer (the wrong options must be clearly wrong, not alternative correct forms); ' +
      'vary the answer position across the 5 questions; original sentences, natural English, realistic everyday or academic contexts; keep sentences short for the level; ' +
      'do not repeat or paraphrase the questions in "avoid"; no names of real brands/people; no emoji; explanations in Vietnamese with full diacritics.',
    rubric: 'If ANY wrong option would also be grammatical in the sentence, the question has more than one answer: score it at most 2. A register/style question must state the required register in the stem, e.g. "(formal)". Check each of the 5 questions: it tests the lesson grammar point (not something else); exactly one option is correct and the key (answer index) is right; ' +
      'distractors are plausible but definitely wrong; the English is natural; the explanation is correct, in Vietnamese, and explains the rule without contradiction; the difficulty suits the CEFR level.',
    view: (it, s) => ({ lesson: s.en, level: s.level, qs: it.qs }),
    rules(it, s) {
      const e = [], K = known(), maxw = (MAXW[s.level] || 30) + 6;
      if (!it || !Array.isArray(it.qs) || it.qs.length !== PER_SEED) return [`cần đúng ${PER_SEED} câu (qs)`];
      const seen = new Set(), pos = new Set();
      it.qs.forEach((q, i) => {
        const w = `q${i + 1}`;
        if (!q || typeof q !== 'object') { e.push(`${w}: không phải object`); return; }
        const t = String(q.q ?? '');
        if ((t.match(/___/g) || []).length !== 1) e.push(`${w}: cần đúng một ___`);
        e.push(...enLint(t, w), ...anErrs(w, t));
        if (words(t) > maxw) e.push(`${w}: ${words(t)} từ > ${maxw}`);
        const o = q.options;
        if (!Array.isArray(o) || o.length !== 4 || !o.every(x => typeof x === 'string' && x.trim() && x === x.trim())) { e.push(`${w}: cần 4 phương án chuỗi không rỗng, đã cắt khoảng trắng`); return; }
        if (new Set(o.map(qaNorm)).size !== 4) e.push(`${w}: trùng phương án (chuẩn hoá như cổng content-qa)`); // lô thử 02/11: 'twenty minutes' ≡ 'twenty-minutes' lọt luật cũ, đỏ gate grammar/schema
        if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer > 3) { e.push(`${w}: answer phải là số nguyên 0–3`); return; }
        pos.add(q.answer);
        e.push(...enLint(o[q.answer], `${w} đáp án`), ...anErrs(w + ' đáp án', o[q.answer]));
        const ex = typeof q.explain === 'string' ? q.explain.trim() : '';
        if (!ex) e.push(`${w}: thiếu lời giải`); else e.push(...explainErrs(w, ex, o, q.answer));
        const n = norm(t);
        if (K.has(n)) e.push(`${w}: trùng câu hỏi đã có`);
        if (seen.has(n)) e.push(`${w}: trùng câu trong lô`); seen.add(n);
      });
      if (pos.size < 2) e.push('mọi đáp án cùng một vị trí');
      return e;
    },
    finalize: it => ({ qs: it.qs.map(({ q, options, answer, explain }) => ({ q, options, answer, explain })) }),
    apply(list, { root = '' } = {}) {
      const D = rj(root + DATA, { _doc: DOC, items: {} });
      D._doc = DOC;
      for (const a of list) {
        const id = a.seed.lesson, cur = (D.items[id] ||= []), have = new Set(cur.map(q => norm(q.q)));
        for (const q of a.item.qs) if (!have.has(norm(q.q))) { have.add(norm(q.q)); cur.push({ ...q, qa: a.qa }); }
      }
      D.items = Object.fromEntries(Object.keys(D.items).sort().map(k => [k, D.items[k]]));
      wj(root + DATA, D);
      build({ root });
    },
  },
};
