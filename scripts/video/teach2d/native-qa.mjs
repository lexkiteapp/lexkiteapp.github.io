// Chữ bản địa của clip L1 (docs/VIDEO-TEACH2D.md): hook (khung 0–1,5 s) + mẹo trên khung + chú thích bài đăng + bình luận đầu + hashtag, theo docs/I18N-PIPELINE.md.
// en.* là gốc, native.* là bản tay (tầng i18n-fixed, luôn thắng dịch máy). {m:từ[#n]} = nghĩa lấy từ kho: vi = cột nghĩa kho từ, ngôn ngữ khác = web/packs/<lang>.json (gói nghĩa app dùng).
// Cổng giống scripts/i18n-qa.mjs (luật chung scripts/lib/i18n-rules.mjs) + dịch ngược gtx như i18n-backcheck.mjs (bật bằng --online; CI preqc luôn chạy --online).
// Dùng: node scripts/video/teach2d/native-qa.mjs [--online] [--write] [id…]   → exit 1 nếu có clip đỏ; --write ghi content/video/teach2d/l1-qa.json (cổng tự duyệt đọc file này)
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { VI, BAD } from '../../lib/i18n-rules.mjs';
import { has } from '../../i18n-english.mjs';

const ROOT = fileURLToPath(new URL('../../../', import.meta.url)), J = f => JSON.parse(fs.readFileSync(ROOT + f, 'utf8'));
const A = process.argv.slice(2), ONLINE = A.includes('--online'), WRITE = A.includes('--write'), ONLY = A.filter(x => !x.startsWith('--'));
const rows = J('content/video/teach2d/l1.json').rows.filter(r => !ONLY.length || ONLY.includes(r.id));
const WN = J('content/dict/wordnet.json').words, senses = s => String(s).split(/[;；]/).map(x => x.split(/[,、，]/)[0].trim()).filter(Boolean);
let lex = null;
async function gloss(L, w, n) {
  if (L === 'vi') { lex ||= await (await import('../../lexicon/lib.mjs')).loadAllPlus(); const e = lex.find(x => x.row[0].toLowerCase() === w); return e ? senses(e.row[3])[n - 1] || null : null; }
  const e = J(`web/packs/${L}.json`)[w]; return e ? senses(e[0])[n - 1] || null : null;
}
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function back(L, lines) {   // dịch ngược miễn phí (gtx)
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${L}&tl=en&dt=t&q=${encodeURIComponent(lines.join('\n'))}`;
  for (let k = 0; k < 3; k++) { try { const r = await fetch(url); if (r.ok) { const j = await r.json(); return j[0].map(x => x[0]).join('').split('\n'); } if (r.status === 429) await sleep(6000); } catch (e) { /* thử lại */ } await sleep(1500 * (k + 1)); }
  return null;
}
const words = s => String(s).toLowerCase().replace(/[^a-z0-9' ]+/g, ' ').split(/\s+/).filter(w => w.length > 2).map(w => w.replace(/(ing|ed|es|s)$/, ''));
const sim = (a, b) => { const X = new Set(words(a)), Y = new Set(words(b)); if (!X.size || !Y.size) return 1; let k = 0; for (const w of X) if (Y.has(w)) k++; return k / Math.max(X.size, Y.size); };
const okGloss = (w, bt) => { const b = ` ${String(bt).toLowerCase().replace(/[^a-z' ]+/g, ' ')} `, syn = Object.values(WN[w] || {}).flatMap(x => x.syn || []); return [w, ...syn].some(x => b.includes(` ${x.toLowerCase()} `) || b.includes(` ${x.toLowerCase()}s `)); };

const out = {}; let red = 0;
for (const r of rows) {
  const L = r.lang, N = r.in.native, E = r.in.en, used = [];
  const fill = async s => { let t = s; for (const m of [...s.matchAll(/\{m:([a-z' -]+)(?:#(\d))?\}/g)]) { const g = await gloss(L, m[1], +(m[2] || 1)); used.push({ word: m[1], gloss: g }); t = t.replace(m[0], g || m[0]); } return t; };
  const hook = N.hook, tip = await fill(N.tip), caption = await fill(N.caption), comment = N.comment, tags = N.hashtags;
  const enCap = E.caption, post = `${caption}\n\n${tags.join(' ')}\n\nlexkite.com`;
  const spoken = [r.in.hook_say, r.in.wrong, r.in.right, r.in.why, r.in.answer_say].join(' ').toLowerCase();   // lời giáo viên (tiếng Anh)
  const examples = [...enCap.matchAll(/“([^”]+)”/g)].map(m => m[1]).filter(x => spoken.includes(x.toLowerCase().replace(/[.?!]$/, '')));
  const g = {
    i18n_no_vi_leak: L === 'vi' || ![hook, tip, caption, comment].some(x => VI.test(x)),
    i18n_no_known_bad: ![hook, tip, caption, comment].some(x => BAD.test(x)),
    i18n_english_kept: examples.length > 0 && examples.every(x => has(caption, x)),   // câu tiếng Anh mẫu còn nguyên văn ở bản địa (như i18n-qa missingSegments)
    glosses_from_lexicon: used.every(u => u.gloss) && !/\{m:/.test(hook + tip + caption),
    hashtags: tags.length >= 3 && tags.length <= 5 && tags.every(t => /^#[\p{L}\p{N}\p{M}_]+$/u.test(t)) && tags.includes('#lexkite'),
    lengths: [...hook].length <= 34 && [...tip].length <= 140 && [...caption].length <= 400 && [...post].length <= 2200,
    comment: (comment.match(/\{link\}/g) || []).length === 1 && !/https?:\/\/|#\w/.test(comment),
    not_english: L !== 'en' && sim(caption, enCap) < 0.6,   // bản địa phải thật sự khác bản tiếng Anh gốc
  };
  let bt = null;
  if (ONLINE) {
    bt = await back(L, [hook, tip, caption, ...used.map(u => u.gloss || '')]); const [bh, btip, bc] = bt || [], bg = (bt || []).slice(3);
    if (!bt) console.log(`  (${r.id}: gtx không trả lời – bỏ qua dịch ngược, các cổng tĩnh vẫn áp dụng)`);
    else g.backcheck_meaning = !!bc && sim(bc, enCap) >= 0.3 && sim(bh, E.hook) >= 0.2 && sim(btip, E.tip) >= 0.2;
    if (bt) g.gloss_backcheck = used.every((u, i) => u.gloss && okGloss(u.word, bg[i] || ''));
  }
  const ok = Object.values(g).every(Boolean); if (!ok) red++;
  out[r.id] = { ok, lang: L, online: ONLINE, gates: g, ...(bt ? { back: bt } : {}), glosses: used };
  console.log(r.id, ok ? '✓' : '✗', ok ? '' : Object.entries(g).filter(([, v]) => !v).map(([k]) => k).join(','));
}
if (WRITE) { const f = ROOT + 'content/video/teach2d/l1-qa.json', old = fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : {}; fs.writeFileSync(f, JSON.stringify({ ...old, ...out }, null, 1) + '\n'); }
process.exit(red ? 1 : 0);
