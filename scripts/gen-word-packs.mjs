// Gói nghĩa từ vựng dịch sẵn cho người học không dùng tiếng Việt/Anh: web/packs/<lang>.json = { "word": ["nghĩa", refined?] }
// Nguồn từ: web/js/data.js + mọi web/js/lib/*.js (trừ notes-*). Không cần khóa API (Google Translate gtx, chạy trong GitHub Action).
//   node scripts/gen-word-packs.mjs <lang|all> [--refine N]
//   - mặc định: dịch nhanh theo lô mọi từ còn thiếu (1 dòng/từ)
//   - --refine N: tinh chỉnh N từ chưa tinh chỉnh bằng dữ liệu từ điển (dt=bd) – chọn nghĩa ĐÚNG TỪ LOẠI của mục từ (book v. → đặt chỗ)
//   - --gloss-only: chỉ áp bảng nghĩa viết tay content/wordlists/*.gloss.json (không cần mạng)
// Bảng nghĩa *.gloss.json = { lang: { word: nghĩa } } luôn thắng: ghi đè [nghĩa, 1] sau dịch máy/--refine.
// App đọc gói khi giao diện không phải vi/en (App.nativeGloss) → nghĩa hiện tức thì, offline; thiếu thì mới dịch lúc chạy.
import fs from 'fs';
const R = new URL('../', import.meta.url);
const LANGS = fs.readFileSync(new URL('scripts/i18n-langs.txt', R), 'utf8').split('\n').map(s => s.trim()).filter(s => s && !s.startsWith('#'));
const arg = process.argv[2] || 'all', ri = process.argv.indexOf('--refine'), REFINE = ri > 0 ? +process.argv[ri + 1] || 300 : 0;
const GLOSS_ONLY = process.argv.includes('--gloss-only');
const GLOSS = fs.readdirSync(new URL('content/wordlists/', R)).filter(f => f.endsWith('.gloss.json')).map(f => JSON.parse(fs.readFileSync(new URL('content/wordlists/' + f, R), 'utf8')));
const sleep = ms => new Promise(r => setTimeout(r, ms));

// 1) Gom từ (word → pos) từ dữ liệu app
globalThis.t = s => s;
const g = {};
new Function('self', fs.readFileSync(new URL('web/js/data.js', R), 'utf8'))(g);
for (const f of fs.readdirSync(new URL('web/js/lib/', R)).sort()) if (/\.js$/.test(f) && !/^notes/.test(f)) { try { new Function('self', fs.readFileSync(new URL('web/js/lib/' + f, R), 'utf8'))(g); } catch (e) { console.warn('bỏ qua', f, e.message); } }
const WORDS = new Map();
for (const tp of g.IELTS_DATA.TOPICS) for (const w of tp.words || []) { const k = String(w.word || '').toLowerCase().trim(); if (k && !WORDS.has(k) && k.length < 60) WORDS.set(k, String(w.pos || '').toLowerCase()); }
console.log(`${WORDS.size} từ`);

const POS = p => /^(n|noun)\b/.test(p) ? 'noun' : /^(v|verb|phr ?v)/.test(p) ? 'verb' : /^adj/.test(p) ? 'adjective' : /^adv/.test(p) ? 'adverb' : /^prep/.test(p) ? 'preposition' : /^conj/.test(p) ? 'conjunction' : /^pron/.test(p) ? 'pronoun' : '';
const tl = l => (l === 'zh' ? 'zh-CN' : l);
async function get(url) { for (let i = 0; i < 3; i++) { try { const r = await fetch(url); if (r.ok) return await r.json(); if (r.status === 429) await sleep(20000); } catch (e) { /* thử lại */ } await sleep(2000 * (i + 1)); } return null; }

for (const lang of arg === 'all' ? LANGS : [arg]) {
  const p = new URL(`web/packs/${lang}.json`, R);
  const pack = fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : {};
  for (const k of Object.keys(pack)) if (!WORDS.has(k)) delete pack[k]; // từ đã bỏ khỏi app
  // dịch nhanh theo lô
  const miss = GLOSS_ONLY ? [] : [...WORDS.keys()].filter(k => !pack[k]);
  for (let i = 0; i < miss.length; i += 80) {
    const batch = miss.slice(i, i + 80);
    const j = await get(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${tl(lang)}&dt=t&q=${encodeURIComponent(batch.join('\n'))}`);
    if (!j) { console.warn(lang, 'dừng lô (mạng/giới hạn) – lần sau chạy tiếp'); break; }
    const out = j[0].map(x => x[0]).join('').split('\n').map(s => s.trim());
    if (out.length === batch.length) batch.forEach((k, n) => { if (out[n]) pack[k] = [out[n], 0]; });
    await sleep(1500); // nhịp chậm: tránh bị Google chặn
  }
  // tinh chỉnh theo từ loại
  let done = 0;
  for (const [k, pos] of WORDS) {
    if (done >= REFINE || GLOSS_ONLY) break;
    if (pack[k] && pack[k][1]) continue;
    const j = await get(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${tl(lang)}&dt=t&dt=bd&q=${encodeURIComponent(k)}`);
    if (!j) break;
    done++;
    const want = POS(pos), dict = Array.isArray(j[1]) ? j[1] : [];
    const e = dict.find(d => d[0] === want) || (want ? null : dict[0]);
    const terms = e && Array.isArray(e[1]) ? e[1].slice(0, 2) : null;
    const base = j[0] ? j[0].map(x => x[0]).join('').trim() : '';
    pack[k] = [terms && terms.length ? terms.join(', ') : (pack[k] ? pack[k][0] : base), 1];
    await sleep(1200);
  }
  // bảng nghĩa viết tay luôn thắng
  for (const gl of GLOSS) for (const [k, v] of Object.entries(gl[lang] || {})) if (WORDS.has(k) && v) pack[k] = [v, 1];
  const sorted = Object.fromEntries(Object.keys(pack).sort().map(k => [k, pack[k]]));
  fs.writeFileSync(p, JSON.stringify(sorted));
  const ref = Object.values(sorted).filter(x => x[1]).length;
  console.log(`✓ ${lang}: ${Object.keys(sorted).length}/${WORDS.size} từ · đã tinh chỉnh ${ref}`);
}
