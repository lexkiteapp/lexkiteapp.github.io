// Chữ bản địa của clip L1 (docs/specs/social-l1-clips.md): tiêu đề native.hook (khung 0–1,5 s) + chú thích bài đăng native.caption + hashtag.
// Nguồn theo docs/I18N-PIPELINE.md: bản tiếng Anh en.* là gốc, native.* là bản tay (tầng i18n-fixed, luôn thắng dịch máy).
// {m:từ[#n]} = nghĩa lấy từ kho (vi: cột nghĩa kho từ; ngôn ngữ khác: web/packs/<lang>.json – gói nghĩa app dùng), nghĩa thứ n tách theo ; rồi lấy cụm đầu.
// Cổng (giống scripts/i18n-qa.mjs + dịch ngược như scripts/i18n-backcheck.mjs): không lẫn tiếng Việt, không lỗi dịch máy đã biết (BAD), giữ nguyên câu tiếng Anh mẫu
// (missingSegments), đúng chữ viết của ngôn ngữ, hashtag 3–8 có #lexkite, độ dài, dịch ngược gtx gần nghĩa bản tiếng Anh, nghĩa {m:} dịch ngược ra đúng từ.
// Ra: <out>/<id>/native-qa.json. Dùng: node scripts/rig/native-qa.mjs content/video/rig/l1/vi/final-s.json qa/rig [--offline]
import fs from 'node:fs';
import { VI, BAD } from '../lib/i18n-rules.mjs';
import { has } from '../i18n-english.mjs';
import { loadAll } from '../lexicon/lib.mjs';

const spec = JSON.parse(fs.readFileSync(process.argv[2], 'utf8')), OUT = `${process.argv[3]}/${spec.id}`, OFFLINE = process.argv.includes('--offline');
fs.mkdirSync(OUT, { recursive: true });
const L = spec.lang, PACK = { pt_BR: 'pt', zh_CN: 'zh' }[L] || L, GTX = { pt_BR: 'pt', zh_CN: 'zh-CN' }[L] || L;
const SCRIPT = { ja: /[\u3040-\u30ff\u4e00-\u9fff]/g, zh_CN: /[\u4e00-\u9fff]/g, ko: /[\uac00-\ud7af]/g, hi: /[\u0900-\u097f]/g, th: /[\u0e00-\u0e7f]/g, ar: /[\u0600-\u06ff]/g, ru: /[\u0400-\u04ff]/g };
const WN = JSON.parse(fs.readFileSync('content/dict/wordnet.json', 'utf8')).words;
let lex = null;
const senses = s => String(s).split(/[;；]/).map(x => x.split(/[,、，]/)[0].trim()).filter(Boolean);
function gloss(w, n) {
  if (L === 'en') return w;
  if (L === 'vi') { lex = lex || loadAll(); const e = lex.find(x => x.row[0].toLowerCase() === w); return e ? senses(e.row[3])[n - 1] || null : null; }
  const p = JSON.parse(fs.readFileSync(`web/packs/${PACK}.json`, 'utf8')), e = p[w];
  return e ? senses(e[0])[n - 1] || null : null;
}
const used = [];
const fill = (s, native) => s.replace(/\{m:([a-z' -]+)(?:#(\d))?\}/g, (_, w, n) => { if (!native) return w; const g = gloss(w, +(n || 1)); used.push({ word: w, sense: +(n || 1), gloss: g }); return g || `{m:${w}}`; });
const hook = fill(spec.native.hook, true), caption = fill(spec.native.caption, true), enHook = fill(spec.en.hook, false), enCap = fill(spec.en.caption, false), tags = spec.native.hashtags;
const post = `${caption}\n\n${tags.join(' ')}\n\nlexkite.com`;

// dịch ngược miễn phí (gtx), như i18n-backcheck.mjs
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function back(lines) {
  if (OFFLINE || L === 'en') return lines;
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${GTX}&tl=en&dt=t&q=${encodeURIComponent(lines.join('\n'))}`;
  for (let k = 0; k < 4; k++) { try { const r = await fetch(url); if (r.ok) { const j = await r.json(); return j[0].map(x => x[0]).join('').split('\n'); } if (r.status === 429) await sleep(20000); } catch (e) { /* thử lại */ } await sleep(1500 * (k + 1)); }
  return null;
}
const words = s => String(s).toLowerCase().replace(/[^a-z0-9' ]+/g, ' ').split(/\s+/).filter(w => w.length > 2).map(w => w.replace(/(ing|ed|es|s)$/, ''));
const sim = (a, b) => { const A = new Set(words(a)), B = new Set(words(b)); if (!A.size || !B.size) return 1; let k = 0; for (const w of A) if (B.has(w)) k++; return k / Math.max(A.size, B.size); };
const okGloss = (w, bt) => { const b = ` ${String(bt).toLowerCase().replace(/[^a-z' ]+/g, ' ')} `, e = WN[w] || {}, syn = Object.values(e).flatMap(x => x.syn || []);
  return [w, ...syn].some(x => b.includes(` ${x.toLowerCase()} `) || b.includes(` ${x.toLowerCase()}s `)); };

const nativeOnly = s => s.replace(/[“"«]([^”"»]+)[”"»]/g, ' ').replace(/#\S+|Lexkite|lexkite|Ama|Carlos|-ing|-s|\/t\//g, ' ');
const sc = SCRIPT[L], letters = s => (s.match(/\p{L}/gu) || []).length;
const scriptShare = s => !sc ? 1 : (nativeOnly(s).match(sc) || []).length / Math.max(1, letters(nativeOnly(s)));
// câu tiếng Anh mẫu (trong ngoặc ở bản tiếng Anh VÀ có trong lời giáo viên/thẻ hook) phải còn nguyên văn ở bản địa (như i18n-qa: missingSegments)
const spoken = [spec.segments.map(x => x.text).join(' '), ...Object.values(spec.hook).flat().filter(x => typeof x === 'string')].join(' ').toLowerCase();
const examples = [...enCap.matchAll(/“([^”]+)”/g)].map(m => m[1]).filter(x => spoken.includes(x.toLowerCase().replace(/[.?!]$/, '')));
const lost = examples.filter(x => !has(caption, x));
const [bh, bc, ...bg] = (await back([hook, caption.replace(/\n/g, ' '), ...used.map(u => u.gloss || '')])) || [];
const g = {
  i18n_no_vi_leak: L === 'vi' || !(VI.test(hook) || VI.test(caption)),
  i18n_no_known_bad: !BAD.test(hook) && !BAD.test(caption),
  i18n_english_kept: lost.length === 0,
  i18n_script: scriptShare(hook) >= 0.6 && scriptShare(caption) >= 0.6,
  glosses_from_lexicon: used.every(u => u.gloss) && !/\{m:/.test(hook + caption),
  hashtags: tags.length >= 3 && tags.length <= 8 && tags.every(t => /^#[\p{L}\p{M}\p{N}_]+$/u.test(t)) && tags.includes('#lexkite'),
  lengths: [...hook].length <= 34 && [...caption].length <= 400 && [...post].length <= 2200,
  backcheck_meaning: OFFLINE || L === 'en' ? true : !!bc && sim(bc, enCap) >= 0.3 && sim(bh, enHook) >= 0.2,
  gloss_backcheck: OFFLINE || L === 'en' ? true : used.every((u, i) => u.gloss && okGloss(u.word, bg[i] || '')),
};
const qa = { ok: Object.values(g).every(Boolean), gates: g, lang: L, hook, caption, hashtags: tags, post, en: { hook: enHook, caption: enCap },
  examples, lost, back: { hook: bh, caption: bc, glosses: used.map((u, i) => ({ ...u, back: bg[i] })) }, sim: { hook: bh ? +sim(bh, enHook).toFixed(2) : null, caption: bc ? +sim(bc, enCap).toFixed(2) : null }, offline: OFFLINE };
fs.writeFileSync(`${OUT}/native-qa.json`, JSON.stringify(qa, null, 1));
console.log(spec.id, qa.ok ? '✓' : '✗', JSON.stringify(g), qa.sim);
