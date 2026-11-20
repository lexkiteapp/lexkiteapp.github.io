// Xưởng nội dung – mảng giao tiếp: kind `functions` = sổ mẫu câu theo chức năng (3 bậc trang trọng), docs/CONTENT-FACTORY.md §4.
// Hạt giống: content/factory/seeds/functions.json (100 chức năng, viết tay một lần). Kho: content/framework/functions.json.
import { rj, wj, ex, enLint, MAXW, words } from './lib.mjs';

const SEEDS = 'content/factory/seeds/functions.json', STORE = 'content/framework/functions.json';
const REGS = ['formal', 'neutral', 'informal'], LV = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const DOC = 'Sổ mẫu câu theo chức năng (xưởng nội dung, scripts/factory/comm.mjs – docs/CONTENT-FACTORY.md §4). Sinh tự động, đừng sửa tay; sửa → content/factory/review.jsonl.';
const norm = s => String(s || '').toLowerCase().replace(/[^a-z0-9' ]+/g, ' ').replace(/\s+/g, ' ').trim();
const stored = (root = '') => (rj(root + STORE, { functions: [] }).functions || []);
const isStr = s => typeof s === 'string' && s.trim() !== '';

export const KINDS = {
  functions: {
    area: 'comm', kind: 'functions', std: 100, touches: [],
    have: () => stored().length,
    seeds() {
      const done = new Set(stored().map(f => f.id));
      return (rj(SEEDS, { items: [] }).items || []).filter(s => !done.has(s.k));
    },
    prompt: s => ({ k: s.k, name: s.name, level: s.level, situations: s.situations }), // lo chỉ để lưu, không gửi mô hình
    sys: 'You write a functional phrase book entry for learners of English (British Council / Cambridge style: language function x situation x formality). ' +
      'For EACH input object {k, name, level, situations} return the entry under its key k. Output ONE JSON object {"<k>": item} and nothing else. item = ' +
      '{"phrases": {"formal": [3 strings], "neutral": [3 strings], "informal": [3 strings]}, "responses": [2-3 typical replies], ' +
      '"example": [{"who":"A","en":"..."},{"who":"B","en":"..."},{"who":"A","en":"..."},{"who":"B","en":"..."}] (exactly 4 turns, alternating A/B, using one of the phrases), ' +
      '"avoid": {"wrong": "<a common learner mistake>", "right": "<the correction>", "why": "<short plain English reason>"}, "note": "<one plain-English usage note, at most 30 words>"}. ' +
      'Rules: ORIGINAL wording; natural English that works in both British and American use; every phrase really performs the named function; the three registers must clearly differ ' +
      '(formal = polite, careful, distant; neutral = everyday; informal = friends/family) and no phrase may repeat across registers; keep each phrase short enough for the level ' +
      '(A1-A2: very short, simple grammar; B1: up to one clause; B2-C2: idiomatic, may be longer); no names of real brands or real people (use A and B, or generic first names in examples only if needed); ' +
      'no Vietnamese or other languages; no emoji; correct punctuation with no space before , . ! ?',
    rubric: 'Check: every phrase truly performs the NAMED function in the given situations; the formal, neutral and informal phrases really differ in register (formal is not just neutral with "please"); ' +
      'English is natural and idiomatic, with no calques; length and vocabulary suit the CEFR level; responses fit the function; the example dialogue is coherent and uses a listed phrase; ' +
      'avoid.wrong is a REAL, frequent learner error and avoid.right fixes exactly that error; note is accurate and plain.',
    view: (it, s) => ({ function: s.name, level: s.level, situations: s.situations, ...it }),
    rules(it, s) {
      const e = [], lv = s.level, maxw = MAXW[lv] || 30;
      if (!it || typeof it !== 'object' || Array.isArray(it)) return ['không phải object'];
      const P = it.phrases;
      if (!P || typeof P !== 'object' || Object.keys(P).sort().join() !== [...REGS].sort().join()) e.push('phrases cần đúng formal/neutral/informal');
      const seen = new Map(), have = new Set(stored().filter(f => f.id !== s.k).flatMap(f => REGS.flatMap(r => (f.phrases?.[r] || []).map(norm))));
      for (const r of REGS) {
        const a = P && P[r];
        if (!Array.isArray(a) || a.length !== 3 || !a.every(isStr)) { e.push(`phrases.${r}: cần đúng 3 chuỗi không rỗng`); continue; }
        a.forEach((p, i) => {
          e.push(...enLint(p, `phrases.${r}#${i + 1}`));
          if (words(p) > maxw) e.push(`phrases.${r}#${i + 1}: ${words(p)} từ > ${maxw} (${lv})`);
          const n = norm(p);
          if (seen.has(n)) e.push(`phrases.${r}#${i + 1}: trùng "${seen.get(n)}"`); else seen.set(n, r);
          if (have.has(n)) e.push(`phrases.${r}#${i + 1}: trùng mẫu câu đã có ở chức năng khác`);
        });
      }
      const R = it.responses;
      if (!Array.isArray(R) || R.length < 2 || R.length > 3 || !R.every(isStr)) e.push('responses: cần 2–3 chuỗi');
      else R.forEach((r, i) => e.push(...enLint(r, `responses#${i + 1}`)));
      const X = it.example;
      if (!Array.isArray(X) || X.length !== 4) e.push('example: cần đúng 4 lượt');
      else X.forEach((t, i) => {
        if (!t || t.who !== (i % 2 ? 'B' : 'A')) e.push(`example#${i + 1}: who phải xen kẽ A/B`);
        if (!t || !isStr(t.en)) e.push(`example#${i + 1}: thiếu en`); else e.push(...enLint(t.en, `example#${i + 1}`));
      });
      const A = it.avoid;
      if (!A || !isStr(A.wrong) || !isStr(A.right) || !isStr(A.why)) e.push('avoid: cần wrong/right/why');
      else {
        if (norm(A.wrong) === norm(A.right)) e.push('avoid: wrong trùng right');
        ['wrong', 'right', 'why'].forEach(k => e.push(...enLint(A[k], `avoid.${k}`)));
      }
      if (!isStr(it.note)) e.push('note: thiếu'); else { e.push(...enLint(it.note, 'note')); if (words(it.note) > 30) e.push(`note: ${words(it.note)} từ > 30`); }
      return e;
    },
    finalize: (it, s) => ({ id: s.k, name: s.name, level: s.level, lo: s.lo, situations: s.situations, ...it }),
    apply(list, { root = '' } = {}) {
      const F = rj(root + STORE, { _doc: DOC, functions: [] });
      F._doc = DOC;
      const ids = new Set(F.functions.map(f => f.id));
      for (const a of list) if (!ids.has(a.item.id)) { ids.add(a.item.id); F.functions.push({ ...a.item, qa: a.qa }); }
      F.functions.sort((x, y) => LV.indexOf(x.level) - LV.indexOf(y.level) || (x.id < y.id ? -1 : 1));
      wj(root + STORE, F);
    },
  },
};
