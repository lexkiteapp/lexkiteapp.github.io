// Sinh bộ từ LÕI ngôn ngữ đích (~300 từ pt-BR) – docs/specs/target-language.md. CHỈ chạy trên CI (target-content.yml), AI qua ai-pool chung
// (scripts/lib/ai-pool.mjs – kho khóa miễn phí, cùng đường scripts/lexicon dùng). Không bao giờ ghi đè seed.json soát tay.
// Luồng: danh sách tần suất (FrequencyWords, OpenSubtitles 2018 pt_br, CC BY-SA 4.0 – ghi nguồn) → AI soạn mục (lemma, loại, giống, IPA, nghĩa 15 ngôn ngữ, ví dụ)
// → 2 giám khảo khác họ (đúng pt-BR, nghĩa, IPA, giống, câu tự nhiên) → dịch ngược từng nghĩa về tiếng Anh (họ khác người soạn) → cổng validate() (scripts/target/lib.mjs)
// → mẫu soát tay ≥ 5 % (qa.spot). Ảnh (img) KHÔNG do AI gán – chỉ gán tay khi đúng nghĩa (milestone 2).
// Chạy: node scripts/target/gen.mjs --n 300 [--dry]   (--dry: chỉ dựng danh sách ứng viên, không gọi AI)
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, MEAN_LANGS, validate, readJSON, seedPath } from './lib.mjs';

const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const TL = arg('tl', 'pt'), N = +arg('n', 300), DRY = process.argv.includes('--dry'), BATCH = 10;
if (!process.env.CI && !DRY) { console.error('Chỉ chạy trên CI (target-content.yml)'); process.exit(75); }
export const SOURCE = { name: 'FrequencyWords (hermitdave) – OpenSubtitles 2018 pt_br_50k', url: 'https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/pt_br/pt_br_50k.txt', license: 'CC BY-SA 4.0 (dữ liệu) – chỉ dùng thứ hạng để chọn từ; ghi công trong spec' };
const OUT = path.join(ROOT, 'content/target', TL), outFile = path.join(OUT, 'core.json'), repFile = path.join(OUT, 'core.report.json');

// ---------- 1) ứng viên theo tần suất ----------
const txt = await (await fetch(SOURCE.url)).text();
const seed = new Set(readJSON(seedPath(TL)).words.map(w => w.word.toLowerCase()));
const prev = fs.existsSync(outFile) ? readJSON(outFile).words : [];
const have = new Set([...seed, ...prev.map(w => w.word.toLowerCase())]);
const cand = txt.split('\n').map((l, i) => ({ form: l.split(' ')[0], rank: i + 1 })).filter(x => /^\p{L}+$/u.test(x.form || '') && (x.form.length > 1 || /^[aeéoà]$/.test(x.form)) && !have.has(x.form.toLowerCase())).slice(0, N * 3);
console.log(`ứng viên ${cand.length} (đã có ${have.size}) – nguồn ${SOURCE.name}`);
if (DRY) { console.log(cand.slice(0, 40).map(x => x.rank + ':' + x.form).join(' ')); process.exit(cand.length ? 0 : 1); }

// ---------- 2) AI: soạn → 2 giám khảo → dịch ngược ----------
const { createPool } = await import('../lib/ai-pool.mjs');
const L15 = MEAN_LANGS.join(', ');
const SYS = {
  lxgen: `You are a Brazilian Portuguese lexicographer building an A1–A2 core deck for learners. For each item (a frequent word FORM), return the dictionary headword (lemma) and its single most frequent sense. JSON object keyed by item k: {"word": lemma, "pos": one of n|v|adj|adv|pron|prep|conj|num|interj|det, "gender": "m"|"f"|"mf" ONLY for nouns, "ipa": Brazilian Portuguese IPA without slashes (São Paulo/Rio neutral: final r = ʁ, ti/di = tʃi/dʒi), "gl": {${L15}} short glosses of THAT sense written natively in each language ("pt" = the headword itself), "ex": {"pt": natural short A1 sentence using the word, "en": faithful English translation}, "exForm": inflected form used in ex.pt ONLY if different from the lemma}. If the form is a proper name, interjection noise or not standard pt-BR, return {"skip": "reason"}.`,
  lxaudit: `You review a Brazilian Portuguese learner deck. For each item k return {"ok": true|false, "score": 1-5, "why": short reason}. ok=false if ANY of: lemma or part of speech wrong; noun gender wrong; IPA not Brazilian or wrong stress; any gloss mistranslates the sense or is in the wrong language; example unnatural, not pt-BR, not using the word, or English translation unfaithful.`,
  lxjudge: `Back-translation check. For each item k you get a Portuguese word with its English gloss and glosses in other languages. Translate EACH non-English gloss back to English literally, then decide if it means the same as the English gloss for that sense. Return {"bt": {lang: english}, "same": {lang: true|false}}.`,
};
const AI = createPool({ prompt: req => ({ sys: SYS[req.mode], user: JSON.stringify(req.items), temp: 0.1 }) });
const accepted = [...prev], rejected = [], seen = new Set(have);
for (let i = 0; i < cand.length && accepted.length - prev.length < N; i += BATCH) {
  const items = cand.slice(i, i + BATCH).map(x => ({ k: x.form, form: x.form, rank: x.rank }));
  const g = await AI.gen({ mode: 'lxgen', items }); if (!g) { console.log('ai-pool: hết tuyến soạn → dừng (lượt sau làm tiếp)'); break; }
  const draft = items.map(it => ({ it, e: g.out[it.k] })).filter(({ it, e }) => { if (!e || e.skip) { rejected.push({ form: it.form, why: e ? 'skip: ' + e.skip : 'không trả' }); return false; } return true; })
    .map(({ it, e }) => ({ k: it.k, e: { word: e.word, pos: e.pos, ...(e.pos === 'n' ? { gender: e.gender } : {}), ipa: e.ipa, gl: e.gl, ex: e.ex, ...(e.exForm ? { exForm: e.exForm } : {}), rank: it.rank } }));
  if (!draft.length) continue;
  const { a, b } = await AI.judgePair({ mode: 'lxaudit', items: draft.map(d => ({ k: d.k, entry: d.e })) }, { exclude: [g.fam].filter(Boolean) });
  if (!a || !b) { console.log('ai-pool: thiếu giám khảo khác họ → không xuất lô này (lượt sau chấm lại)'); break; }
  const bt = await AI.judge({ mode: 'lxjudge', items: draft.map(d => ({ k: d.k, word: d.e.word, en: d.e.gl && d.e.gl.en, gl: d.e.gl })) }, { exclude: [g.fam].filter(Boolean) });
  for (const d of draft) {
    const ja = a.out[d.k], jb = b.out[d.k], t = bt && bt.out[d.k], key = String(d.e.word || '').toLowerCase();
    const why = [];
    if (!ja || !ja.ok || ja.score < 4) why.push('giám khảo A: ' + (ja ? ja.why : 'không trả'));
    if (!jb || !jb.ok || jb.score < 4) why.push('giám khảo B: ' + (jb ? jb.why : 'không trả'));
    const notSame = t && t.same ? MEAN_LANGS.filter(L => L !== 'en' && L !== TL && t.same[L] !== true) : ['dịch ngược không trả'];
    if (notSame.length) why.push('dịch ngược lệch: ' + notSame.join(','));
    const gate = validate({ v: 1, tl: TL, words: [d.e] }); if (gate.length) why.push('cổng: ' + gate.join('; '));
    if (seen.has(key)) why.push('trùng lemma');
    if (why.length) { rejected.push({ form: d.k, word: d.e.word, why }); continue; }
    seen.add(key);
    accepted.push({ ...d.e, qa: { gen: g.model, judges: [a.model, b.model], bt: bt.model, scores: [ja.score, jb.score] } });
  }
  console.log(`lô ${i / BATCH + 1}: nhận ${accepted.length - prev.length}/${N} · loại ${rejected.length}`);
}
// ---------- 3) mẫu soát tay ≥ 5 % (mục mới) + ghi ----------
const fresh = accepted.slice(prev.length), spotN = Math.max(1, Math.ceil(fresh.length * 0.05));
for (const w of [...fresh].sort(() => Math.random() - 0.5).slice(0, spotN)) w.qa.spot = true;
const deck = { v: 1, tl: TL, variant: 'pt-BR', status: 'pending-review', source: SOURCE, words: accepted };
const err = validate(deck); if (err.length) { console.error('✗ cổng cả bộ:', err.slice(0, 10)); process.exit(1); }
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(outFile, JSON.stringify(deck, null, 1) + '\n');
fs.writeFileSync(repFile, JSON.stringify({ at: new Date().toISOString(), accepted: fresh.length, rejected, spot: fresh.filter(w => w.qa.spot).map(w => w.word), stats: AI.stats ? AI.stats() : null }, null, 1) + '\n');
console.log(`✓ ${fresh.length} mục mới (tổng ${accepted.length}), loại ${rejected.length}, mẫu soát ${spotN} → ${path.relative(ROOT, outFile)}`);
if (!fresh.length) process.exit(1); // việc nền phải tự đỏ khi ra 0
