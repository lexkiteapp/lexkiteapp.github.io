// Sinh bộ từ LÕI ngôn ngữ đích (pt-BR ~300 từ; es-419 3.000 lemma A1–B2 theo lô 300) – docs/specs/target-language.md, spanish-course.md W1.
// Mọi thứ riêng ngôn ngữ (biến thể, nguồn tần suất, quy ước IPA, trường thêm, tiêu chí giám khảo, LanguageTool) ở bảng scripts/target/tl-gen.mjs. CHỈ chạy trên CI (target-content.yml), AI qua ai-pool chung
// (scripts/lib/ai-pool.mjs – kho khóa miễn phí, cùng đường scripts/lexicon dùng). Không bao giờ ghi đè seed.json soát tay.
// Luồng: danh sách tần suất (FrequencyWords, OpenSubtitles 2018 theo bảng, CC BY-SA 4.0 – ghi nguồn) → AI soạn mục (lemma, loại, giống, IPA, nghĩa 15 ngôn ngữ, ví dụ)
// → 2 giám khảo khác họ (đúng pt-BR, nghĩa, IPA, giống, câu tự nhiên) → dịch ngược từng nghĩa về tiếng Anh (họ khác người soạn) → cổng validate() (scripts/target/lib.mjs)
// → mẫu soát tay ≥ 5 % (qa.spot). Ảnh (img) KHÔNG do AI gán – chỉ gán tay khi đúng nghĩa (milestone 2).
// → (bảng có lt) LanguageTool 0 lỗi trên câu ví dụ (spanish-course.md §5.1, LT_URL = máy chủ LT tự chạy trên runner; thiếu → dừng, không bỏ cổng).
// Mỗi lượt ghi MỘT tệp lô mới core-NN.json (≤ N mục, nối tiếp các lô trước – trùng lemma bị loại); pt giữ tên core.json cũ (lô 0).
// Chạy: node scripts/target/gen.mjs --tl es --n 300 [--dry]   (--dry: chỉ dựng danh sách ứng viên, không gọi AI)
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, MEAN_LANGS, validate, readJSON, seedPath, coreFiles, nextCoreFile, ltErrors as ltErr, kaikki, lemmaFromEntries, TL_RULES } from './lib.mjs';
import { TL_GEN } from './tl-gen.mjs';

const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const TL = arg('tl', 'pt'), N = +arg('n', 300), DRY = process.argv.includes('--dry'), BATCH = 10;
if (!process.env.CI && !DRY) { console.error('Chỉ chạy trên CI (target-content.yml)'); process.exit(75); }
const G = TL_GEN[TL]; if (!G) { console.error(`✗ tl "${TL}" chưa có dòng trong scripts/target/tl-gen.mjs`); process.exit(2); }
export const SOURCE = G.source;
// --shard k/K: nhiều job CI song song chia ứng viên theo thứ hạng (i % K = k), mỗi shard 1 tệp core-NN (NN = số lô kế + k); trùng lemma giữa shard → scripts/target/dedupe.mjs
const [SK, SN] = (arg('shard', '0/1')).split('/').map(Number);
const OUT = path.join(ROOT, 'content/target', TL), outFile = nextCoreFile(TL, SK), repFile = outFile.replace(/\.json$/, '.report.json');
const LT = G.lt && process.env.LT_URL; if (G.lt && !DRY && !LT) { console.error('✗ thiếu LT_URL – cổng LanguageTool bắt buộc cho ' + TL); process.exit(2); }
const ltErrors = text => ltErr(LT, G.lt, text); // LanguageTool: mọi lỗi = loại (lib.mjs)
const R = TL_RULES[TL] || {}; // R.derive(mục, gợi ý nguồn): trường SINH từ trường gốc (ja: romaji/IPA từ kana, cách đọc + cấp JLPT theo danh sách nguồn) – trước cổng

// ---------- 1) ứng viên theo tần suất ----------
// bảng có cands(): nguồn ứng viên riêng (ja: danh sách JLPT N5→N1 có cách đọc + cấp → gợi ý hint cho người soạn); không có = danh sách tần suất FrequencyWords
const fromList = G.cands ? await G.cands() : (await (await fetch(SOURCE.url)).text()).split('\n').map((l, i) => ({ form: l.split(' ')[0], rank: i + 1 }));
const seed = new Set(readJSON(seedPath(TL)).words.map(w => w.word.toLowerCase()));
const prev = coreFiles(TL).flatMap(f => readJSON(f).words); // lô trước: chỉ để chống trùng, KHÔNG ghi lại
const have = new Set([...seed, ...prev.map(w => w.word.toLowerCase())]);
// dạng đã từng bị loại/đã quy về lemma có trong report các lô trước → không gửi lại (tiết kiệm hạn mức ai-pool)
const tried = new Set(coreFiles(TL).flatMap(f => { const rf = f.replace(/\.json$/, '.report.json'); return fs.existsSync(rf) ? (readJSON(rf).tried || []) : []; }));
const cand = fromList.filter(x => /^\p{L}+$/u.test(x.form || '') && (x.form.length > 1 || G.one.test(x.form)) && !have.has(x.form.toLowerCase()) && !tried.has(x.form.toLowerCase())).filter((x, i) => i % SN === SK);
console.log(`ứng viên ${cand.length} (đã có ${have.size}) – nguồn ${SOURCE.name}`);
if (DRY) { console.log(cand.slice(0, 40).map(x => x.rank + ':' + x.form).join(' ')); process.exit(cand.length ? 0 : 1); }

// ---------- 1b) quy dạng → lemma TRƯỚC khi gọi AI (Wiktionary/kaikki, chỉ đọc kiểm trên CI – không ghi dữ liệu Wiktionary) ----------
// Lô 11–24 mất 40–90 % lượt soạn vì dạng chia (hacemos, podía…) quy về lemma đã có. Nay: dạng → lemma theo form_of; lemma đã có/đã thử → bỏ, không tốn ai-pool;
// trang chỉ có tên riêng → bỏ. Không có trang → vẫn gửi AI (AI tự quy lemma, cổng trùng lemma giữ nguyên). Ngưỡng/cổng phía sau KHÔNG đổi.
const lemmaQ = [], qSeen = new Set(); let ci = 0, skipped = { dup: 0, name: 0 };
const lemmaOf = async form => (G.lemma === false ? { lemmas: [form] } : lemmaFromEntries(form, G.kaikki ? await kaikki(G.kaikki, form) : [])); // lemma:false = danh sách nguồn đã là mục từ (JLPT)
async function fillQ(min) { // kéo dạng theo thứ hạng tới khi hàng lemma mới đủ min (6 yêu cầu kaikki song song)
  while (lemmaQ.length < min && ci < cand.length) {
    const part = cand.slice(ci, ci + 6); ci += 6;
    const res = await Promise.all(part.map(x => lemmaOf(x.form.toLowerCase())));
    part.forEach((x, j) => {
      const L = res[j].lemmas.find(l => !seen.has(l) && !qSeen.has(l) && !tried.has(l)); // lemma đã thử ở lô trước (bị loại) → không gửi lại
      tried.add(x.form.toLowerCase());
      if (res[j].name) { skipped.name++; rejected.push({ form: x.form, why: 'skip: tên riêng (Wiktionary)' }); return; }
      if (!L) { skipped.dup++; return; }
      qSeen.add(L); lemmaQ.push({ k: L, form: L, rank: x.rank, ...(x.hint ? { hint: x.hint } : {}), ...(L !== x.form.toLowerCase() ? { seenAs: x.form } : {}) });
    });
  }
  return lemmaQ.splice(0, min);
}

// ---------- 2) AI: soạn → 2 giám khảo → dịch ngược ----------
const { createPool } = await import('../lib/ai-pool.mjs');
const L15 = MEAN_LANGS.join(', ');
// Lời nhắc theo bảng TL_GEN (pt cho ra đúng chuỗi cũ của lát 1)
const SYS = {
  lxgen: `You are a ${G.lang} lexicographer building an ${G.level} core deck for learners. For each item (a frequent word FORM), return the dictionary headword (lemma) and its single most frequent sense. JSON object keyed by item k: {"word": lemma, "pos": one of n|v|adj|adv|pron|prep|conj|num|interj|det, "gender": "m"|"f"|"mf" ONLY for nouns${G.extra}, "ipa": ${G.ipa}, "gl": {${L15}} short glosses of THAT sense written natively in each language ("${TL}" = the headword itself), "ex": {"${TL}": natural short ${G.exLevel} sentence using the word, "en": faithful English translation}, "exForm": inflected form used in ex.${TL} ONLY if different from the lemma}. If the form is a proper name, interjection noise or not standard ${G.variant}, return {"skip": "reason"}. If an item has a "hint" (reading, level, English sense from the source list), keep exactly that headword, reading and sense.${G.rules ? ' ' + G.rules : ''}`,
  lxaudit: `You review a ${G.lang} learner deck. Return ONE JSON object keyed by each item's k: {"<k>": {"ok": true|false, "score": 1-5, "why": short reason}, …}. ok=false if ANY of: lemma or part of speech wrong; noun gender wrong; ${G.audit}; any gloss mistranslates the sense or is in the wrong language; example unnatural, not ${G.variant}, not using the word, or English translation unfaithful.`,
  lxfix: `You are the senior editor of a ${G.lang} learner deck. Each item k is a draft entry that FAILED review, with the reviewers' problems (and literal back-translations of glosses when they drifted). Fix ONLY what the problems point at, keeping the same headword and its single most frequent sense: correct pos/gender/plural/IPA (${G.ipa}), rewrite any gloss whose back-translation drifted so it means exactly the English gloss, written natively; rewrite the example if it is unnatural, not ${G.variant} or flagged by the grammar checker. Return ONE JSON object keyed by k with the FULL corrected entry in the same shape as the input (word, pos, gender/plural for nouns, ipa, gl, ex, exForm), or {"skip": "reason"} if the headword is not a good ${G.level} learner word.${G.rules ? ' ' + G.rules : ''}`,
  lxjudge: `Back-translation check. For each item k you get a ${G.short} word with its English gloss and glosses in other languages. Translate EACH non-English gloss back to English literally, then decide if it means the same as the English gloss for that sense. Return ONE JSON object keyed by each item's k: {"<k>": {"bt": {lang: english}, "same": {lang: true|false}}, …}.`,
};
// lexai: 0 – /api/lexai có chế độ CÙNG TÊN (lxgen/lxjudge/lxaudit) với lời nhắc kho tiếng Anh ở máy chủ → không bao giờ đi tuyến đó (như scripts/factory/lib.mjs)
const AI = createPool({ budget: { lexai: 0, cf2: 0 }, prompt: req => ({ sys: (req.sys || SYS[req.mode]) + '\nReply with ONE valid JSON object only, no markdown.', user: JSON.stringify(req.items), temp: 0.1 }) });
const accepted = [...prev], rejected = [], seen = new Set(have); let fixedN = 0;
const pick = (e, hint) => { const o = { word: e.word, pos: e.pos, ...(e.pos === 'n' && !R.noGender ? { gender: e.gender, ...(e.plural ? { plural: e.plural } : {}) } : {}), ...(e.h ? { h: e.h } : {}),
  ...(R.kana ? { kana: e.kana, romaji: e.romaji, pitch: e.pitch, jlpt: e.jlpt, ...(e.pos === 'v' ? { vclass: e.vclass } : {}), ...(e.pos === 'adj' ? { aclass: e.aclass } : {}) } : {}), ipa: e.ipa, gl: e.gl, ex: e.ex, ...(e.exForm ? { exForm: e.exForm } : {}) };
  return R.derive ? R.derive(o, hint) : o; };
for (let i = 0; accepted.length - prev.length < N; i += BATCH) {
  const items = await fillQ(BATCH); if (!items.length) { console.log('hết ứng viên'); break; }
  const g = await AI.gen({ mode: 'lxgen', items }); if (!g) { console.log('ai-pool: hết tuyến soạn → dừng (lượt sau làm tiếp)'); break; }
  const draft = items.map(it => ({ it, e: g.out[it.k] })).filter(({ it, e }) => { if (!e || e.skip) { rejected.push({ form: it.form, why: e ? 'skip: ' + e.skip : 'không trả' }); return false; } return true; })
    .map(({ it, e }) => ({ k: it.k, hint: it.hint, e: { ...pick(e, it.hint), rank: it.rank } }));
  for (const it of items) tried.add(it.form.toLowerCase());
  for (let x = draft.length - 1; x >= 0; x--) if (seen.has(String(draft[x].e.word || '').toLowerCase())) { rejected.push({ form: draft[x].k, word: draft[x].e.word, why: ['trùng lemma'] }); draft.splice(x, 1); } // trước giám khảo: không tốn lượt
  // Chấm ĐỦ cổng (LanguageTool 0 lỗi → 2 giám khảo khác họ → dịch ngược → validate). null = ai-pool thiếu giám khảo (dừng lượt, không xuất mục chưa chấm).
  const fams = [g.fam];
  async function grade(ds) {
    const bad = [], ok = [];
    if (LT) for (let x = ds.length - 1; x >= 0; x--) { // §5.1: LanguageTool 0 lỗi trước khi tốn lượt giám khảo
      const m = ds[x].e.ex && ds[x].e.ex[TL] ? await ltErrors(ds[x].e.ex[TL]) : ['không có câu ' + TL];
      if (m.length) { bad.push({ d: ds[x], why: ['LanguageTool: ' + m.join(' | ')] }); ds.splice(x, 1); }
    }
    if (!ds.length) return { ok, bad };
    const { a, b } = await AI.judgePair({ mode: 'lxaudit', items: ds.map(d => ({ k: d.k, entry: d.e })) }, { exclude: fams.filter(Boolean) });
    if (!a || !b) return null;
    const bt = await AI.judge({ mode: 'lxjudge', items: ds.map(d => ({ k: d.k, word: d.e.word, en: d.e.gl && d.e.gl.en, gl: d.e.gl })) }, { exclude: fams.filter(Boolean) });
    for (const d of ds) {
      const ja = a.out[d.k], jb = b.out[d.k], t = bt && bt.out[d.k], key = String(d.e.word || '').toLowerCase();
      const why = [];
      if (!ja || !ja.ok || ja.score < 4) why.push('giám khảo A: ' + (ja ? ja.why : 'không trả'));
      if (!jb || !jb.ok || jb.score < 4) why.push('giám khảo B: ' + (jb ? jb.why : 'không trả'));
      const notSame = t && t.same ? MEAN_LANGS.filter(L => L !== 'en' && L !== TL && t.same[L] !== true) : ['dịch ngược không trả'];
      if (notSame.length) why.push('dịch ngược lệch: ' + notSame.join(','));
      const gate = validate({ v: 1, tl: TL, words: [d.e] }); if (gate.length) why.push('cổng: ' + gate.join('; '));
      if (seen.has(key)) why.push('trùng lemma');
      if (why.length) bad.push({ d, why, bt: t && t.bt }); else ok.push({ d, qa: { judges: [a.model, b.model], bt: bt.model, scores: [ja.score, jb.score] } });
    }
    return { ok, bad };
  }
  const take = (list, qa) => { for (const { d, qa: q } of list) { const key = String(d.e.word || '').toLowerCase(); if (seen.has(key)) continue; seen.add(key); accepted.push({ ...d.e, qa: { gen: g.model, ...q, ...qa } }); } };
  const r1 = await grade(draft);
  if (!r1) { console.log('ai-pool: thiếu giám khảo khác họ → không xuất lô này (lượt sau chấm lại)'); break; }
  take(r1.ok);
  // Một vòng SỬA có lý do (như người biên tập đọc phiếu chấm): mục trượt vì nghĩa/IPA/ví dụ/LanguageTool → người soạn sửa đúng chỗ bị chê → chấm LẠI ĐỦ cổng
  // với giám khảo khác họ cả người soạn lẫn người sửa. Không nới ngưỡng; trượt lần 2 = loại. Trùng lemma / chưa chấm (không trả) không sửa.
  const fixable = r1.bad.filter(x => !x.why.some(w => /trùng lemma|không trả/.test(w)));
  for (const x of r1.bad) if (!fixable.includes(x)) { rejected.push({ form: x.d.k, word: x.d.e.word, why: x.why }); if (x.why.some(w => /không trả/.test(w))) tried.delete(x.d.k.toLowerCase()); } // không trả = chưa chấm → lượt sau thử lại
  if (fixable.length) {
    const f = await AI.gen({ mode: 'lxgen', sys: SYS.lxfix, items: fixable.map(x => ({ k: x.d.k, entry: x.d.e, problems: x.why, ...(x.bt ? { backTranslations: x.bt } : {}) })) });
    const fixed = f ? fixable.map(x => { const e = f.out[x.d.k]; return e && !e.skip && e.word ? { k: x.d.k, e: { ...pick(e, x.d.hint), rank: x.d.e.rank } } : null; }).filter(Boolean) : [];
    if (f) fams.push(f.fam);
    const r2 = fixed.length ? await grade(fixed.map(x => ({ k: x.k, e: x.e, hint: fixable.find(y => y.d.k === x.k).d.hint }))) : { ok: [], bad: [] };
    take((r2 || { ok: [] }).ok, { fixed: f && f.model });
    const okK = new Set(((r2 || { ok: [] }).ok).map(o => o.d.k));
    if (fixed.length && !r2) { for (const x of fixable) tried.delete(x.d.k.toLowerCase()); } // thiếu giám khảo khác họ cho bản sửa = chưa chấm → lượt sau làm lại
    else for (const x of fixable) if (!okK.has(x.d.k)) { const b2 = r2 && r2.bad.find(y => y.d.k === x.d.k); rejected.push({ form: x.d.k, word: x.d.e.word, why: [...x.why, ...(b2 ? ['sau sửa: ' + b2.why.join(' / ')] : ['sau sửa: ' + (f ? 'không trả/không chấm' : 'ai-pool hết tuyến sửa')])] }); }
    fixedN += okK.size;
  }
  console.log(`lô ${i / BATCH + 1}: nhận ${accepted.length - prev.length}/${N} · loại ${rejected.length}`);
}
// ---------- 3) mẫu soát tay ≥ 5 % (mục mới) + ghi ----------
const fresh = accepted.slice(prev.length), spotN = Math.max(1, Math.ceil(fresh.length * 0.05));
for (const w of [...fresh].sort(() => Math.random() - 0.5).slice(0, spotN)) w.qa.spot = true;
const deck = { v: 1, tl: TL, variant: G.variant, status: 'pending-review', source: SOURCE, words: fresh };
const err = validate(deck); if (err.length) { console.error('✗ cổng cả bộ:', err.slice(0, 10)); process.exit(1); }
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(outFile, JSON.stringify(deck, null, 1) + '\n');
fs.writeFileSync(repFile, JSON.stringify({ at: new Date().toISOString(), accepted: fresh.length, rejected, tried: [...tried], spot: fresh.filter(w => w.qa.spot).map(w => w.word), fixed: fixedN, skipped, stats: AI.stats ? AI.stats() : null }, null, 1) + '\n');
console.log(`✓ ${fresh.length} mục mới (tổng ${accepted.length}; ${fixedN} qua vòng sửa), loại ${rejected.length}, bỏ trước AI ${skipped.dup} dạng trùng lemma + ${skipped.name} tên riêng, mẫu soát ${spotN} → ${path.relative(ROOT, outFile)}`);
if (!fresh.length) process.exit(1); // việc nền phải tự đỏ khi ra 0
