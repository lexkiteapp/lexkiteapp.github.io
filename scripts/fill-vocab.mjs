// Bổ sung phiên âm (IPA, ưu tiên giọng Anh–Anh) và câu ví dụ còn trống trong kho từ (web/js/lib/*.js, web/js/data.js).
//   node scripts/fill-vocab.mjs [--max N] [--no-net]   (mặc định 1500 từ tra mạng/lần, có lưu đệm content/wordlists/fill.cache.json)
// Nguồn theo thứ tự: mục cùng từ đã có trong app → bộ đệm wordlist → Wiktionary (CC BY-SA, giọng RP/UK) → Free Dictionary API (Wiktionary, CC BY-SA)
//   → ví dụ dự phòng Tatoeba (CC BY 2.0 FR). Kiểm tra: ví dụ phải chứa đúng từ, 5–18 từ, chỉ ký tự Latin, không tên riêng lạ, kết thúc bằng dấu câu.
// Ví dụ chỉ tự điền cho từ thông dụng (NGSL): từ chuyên ngành/chủ đề cần câu đúng ngữ cảnh → biên soạn tay. Chỉ sửa đúng ô trống trên dòng đó; mục không tìm được nguồn đạt chuẩn để trống (content-check báo cảnh báo).
import fs from 'node:fs'; import path from 'node:path';
import { loadContent, ROOT } from './lib/content-load.mjs';
const A = process.argv.slice(2), mi = A.indexOf('--max'), MAX = mi >= 0 ? +A[mi + 1] : 1500, NET = !A.includes('--no-net');
const CP = path.join(ROOT, 'content/wordlists/fill.cache.json');
const cache = fs.existsSync(CP) ? JSON.parse(fs.readFileSync(CP, 'utf8')) : {};
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function get(url) { for (let i = 0; i < 3; i++) { try { const r = await fetch(url, { headers: { 'User-Agent': 'lexkite-wordlist (support@lexkite.com)' } }); if (r.status === 404) return null; if (r.ok) return await r.json(); if (r.status === 429) await sleep(20000); } catch (e) { /* thử lại */ } await sleep(1500 * (i + 1)); } return undefined; }
// Chuẩn hóa về kiểu Oxford/Anh–Anh như phần còn lại của app
const fixIPA = s => ('/' + s.replace(/^[\/\[]|[\/\]]$/g, '') + '/').replace(/ɹ/g, 'r').replace(/ɫ/g, 'l').replace(/\.(?=\S)/g, '').replace(/ɛ(?!ə)/g, 'e').replace(/ɝ/g, 'ɜː').replace(/ɚ/g, 'ə').replace(/ɐ/g, 'ʌ').replace(/ɾ/g, 't').replace(/ɛə/g, 'eə').replace(/\(r\)/g, '').replace(/\(([^)]*)\)/g, '$1').replace(/([mn])\u0329/g, (m, c) => c === 'm' ? 'əm' : 'n').replace(/l\u0329/g, 'l').replace(/\u0329/g, '').replace(/[‿͡]/g, '').replace(/\s+/g, ' ');
// Từ đồng tự khác âm (danh từ/động từ đổi trọng âm…): không tự điền phiên âm, tránh sai
const HETERO = new Set('record present object project increase decrease produce permit conduct contract export import contest desert refuse minute live lead read wind tear close use content subject address estimate separate graduate appropriate associate alternate moderate approximate duplicate house excuse abuse perfect progress protest rebel suspect survey transfer upset insult conflict convert extract invalid compound combat digest attribute bass bow row sow wound polish entrance console refund reject research discount combine conflict contrast desert frequent increase'.split(' '));
const POSN = p => /^n/.test(p) ? 'noun' : /^v/.test(p) ? 'verb' : /^adj/.test(p) ? 'adjective' : /^adv/.test(p) ? 'adverb' : /^prep/.test(p) ? 'preposition' : /^conj/.test(p) ? 'conjunction' : /^(pron|det)/.test(p) ? 'pronoun' : '';
const esc = w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const hasWord = (w, s) => { const base = w.toLowerCase(), stem = base.replace(/e$/, '').replace(/y$/, 'i'); return new RegExp(`\\b(${esc(base)}(s|es|ed|d|ing|ly|er|est)?|${esc(stem)}(es|ed|ing|ies|ied))\\b`, 'i').test(s); };
const BAD = /\b(spit\w*|vomit\w*|blood\w*|prison\w*|war|weapon\w*|army|soldier\w*|police|crime\w*|steal\w*|thief|cigarette\w*|beer|wine|whisk(e)?y|algeria\w*|kabyle|berber|israel\w*|palestin\w*|islam\w*|muslim\w*|christian\w*|jews?|porn\w*|prostitut\w*|bomb\w*|terror\w*|murder\w*)\b|[":;()]|\bI am not your\b|\b(kill|die|dead|death|suicide|sex|naked|drunk|gun|shoot|hate|stupid|idiot|damn|hell|god|jesus|bible|church|Tom|Mary|John|Sami|Layla|Fadil|Dan|Linda)\b/i;
const exOK = (w, s) => !!s && /^[A-Z"'][\x20-\x7E’‘“”]+[.!?]["”]?$/.test(s) && hasWord(w, s) && !BAD.test(s) && s.split(/\s+/).length >= 6 && s.split(/\s+/).length <= 16 && !/\s{2}|\b(\w+) \1\b/i.test(s);

// 1) Đọc kho hiện có
const C = loadContent(), have = { ipa: new Map(), ex: new Map() };
for (const t of C.IELTS_DATA.TOPICS) for (const w of t.words) { const k = w.word.toLowerCase(); if (w.ipa && !have.ipa.has(k)) have.ipa.set(k, w.ipa); }
for (const f of ['nawl', 'bsl']) { const p = path.join(ROOT, `content/wordlists/${f}.cache.json`); if (fs.existsSync(p)) for (const [k, v] of Object.entries(JSON.parse(fs.readFileSync(p, 'utf8')))) if (v.ipa && !have.ipa.has(k)) have.ipa.set(k, fixIPA(v.ipa)); }
const FILES = ['web/js/data.js', ...fs.readdirSync(path.join(ROOT, 'web/js/lib')).filter(f => f.endsWith('.js') && !/^(notes|paraphrase|nawl|bsl)/.test(f)).map(f => 'web/js/lib/' + f)];
const parse = line => { try { return new Function('return ' + line.trim().replace(/,\s*$/, ''))(); } catch (e) { return null; } };
const q = s => "'" + String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'";
const ROW = /^(\s*)(\['.*\])(,?\s*)$/;
const todo = new Map(); // word → {pos, needIpa, needEx}
const EXF = f => /ngsl\.js$/.test(f);
for (const f of FILES) for (const line of fs.readFileSync(path.join(ROOT, f), 'utf8').split('\n')) { const m = line.match(ROW); if (!m) continue; const r = parse(m[2]); if (!Array.isArray(r) || r.length < 9 || typeof r[0] !== 'string') continue; if (!EXF(f)) r[5] = r[5] || '-'; if (!r[1] || !r[5]) { const k = r[0].toLowerCase(), x = todo.get(k) || { pos: r[2], ipa: false, ex: false }; x.ipa ||= !r[1]; x.ex ||= !r[5]; todo.set(k, x); } }
console.log(`cần bổ sung: ${[...todo.values()].filter(x => x.ipa).length} phiên âm, ${[...todo.values()].filter(x => x.ex).length} ví dụ`);

// 2) Tra nguồn (lưu đệm từng từ)
let net = 0, saveAt = Date.now();
for (const [k, x] of todo) {
  const c = cache[k] ||= {};
  if (HETERO.has(k)) x.ipa = false;
  if (x.ipa && !c.ipa && have.ipa.has(k)) c.ipa = have.ipa.get(k);
  if (x.ipa && !c.ipa && /\s/.test(k)) { const parts = k.split(/\s+/).map(p => have.ipa.get(p) || cache[p]?.ipa); if (parts.every(Boolean)) c.ipa = '/' + parts.map(p => p.replace(/^\/|\/$/g, '')).join(' ') + '/'; }
  if (!NET || net >= MAX || /\s/.test(k) && !x.ex) continue;
  const needIpa = x.ipa && !c.ipa && !c.ipaTried, needEx = x.ex && !c.exs && !c.exTried;
  if (!needIpa && !needEx) continue;
  net++;
  if (needIpa && !/\s/.test(k)) {
    const j = await get(`https://en.wiktionary.org/w/api.php?action=parse&page=${encodeURIComponent(k)}&prop=wikitext&format=json&formatversion=2`);
    const tx = (j?.parse?.wikitext || '').split(/\n==(?!=)/).find(s => /^\s*English\s*==/.test(s)) || '';
    const all = [...tx.matchAll(/\{\{IPA\|en\|([^}]*)\}\}/g)].map(m => m[1]);
    const pick = all.find(a => /\b(RP|UK|GB)\b/.test(a)) || all.find(a => !/\b(US|GA|CA|AU|NZ)\b/.test(a)) || all[0] || '';
    const ip = pick.split('|').find(s => /^\/.+\/$/.test(s)); if (ip) c.ipa = fixIPA(ip); if (j !== undefined) c.ipaTried = 1;
  }
  if ((needEx || (x.ipa && !c.ipa)) && !c.fd) {
    const fd = await get(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(k)}`); c.fd = fd === undefined ? 0 : 1;
    const want = POSN(x.pos || ''), exs = [];
    for (const en of Array.isArray(fd) ? fd : []) { if (!c.ipa) { const ip = (en.phonetics || []).map(p => p.text).find(s => s && /^\/.+\/$/.test(s)) || en.phonetic; if (ip) c.ipa = fixIPA(ip); } for (const m of en.meanings || []) for (const d of m.definitions || []) if (d.example) exs.push({ s: d.example.replace(/^[a-z]/, ch => ch.toUpperCase()).replace(/([^.!?])$/, '$1.'), p: m.partOfSpeech === want ? 0 : 1 }); }
    c.exs = exs.filter(e => exOK(k, e.s)).sort((a, b) => a.p - b.p || a.s.length - b.s.length).map(e => e.s).slice(0, 3);
  }
  if (needEx && !(c.exs || []).length) {
    const tt = await get(`https://api.tatoeba.org/unstable/sentences?lang=eng&q=${encodeURIComponent('="' + k + '"')}&sort=relevance&limit=20`);
    c.exs = ((tt && tt.data) || []).map(s => s.text).filter(s => exOK(k, s)).sort((a, b) => +!(a.split(' ').length >= 7 && a.split(' ').length <= 13) - +!(b.split(' ').length >= 7 && b.split(' ').length <= 13)).slice(0, 3); c.src = 'tatoeba';
    if (tt !== undefined) c.exTried = 1;
  }
  if (Date.now() - saveAt > 30000) { fs.writeFileSync(CP, JSON.stringify(cache)); saveAt = Date.now(); process.stdout.write(`… ${net}\n`); }
  await sleep(150);
}
fs.writeFileSync(CP, JSON.stringify(cache));

// 3) Ghi lại đúng các dòng còn trống
let fi = 0, fe = 0;
for (const f of FILES) {
  const p = path.join(ROOT, f), src = fs.readFileSync(p, 'utf8'); let ch = false;
  const out = src.split('\n').map(line => { const m = line.match(ROW); if (!m) return line; const r = parse(m[2]); if (!Array.isArray(r) || r.length < 9 || typeof r[0] !== 'string') return line; const c = cache[r[0].toLowerCase()]; if (!c) return line;
    let mod = false; if (!r[1] && c.ipa && !HETERO.has(r[0].toLowerCase())) { r[1] = c.ipa; fi++; mod = true; } if (!r[5] && EXF(f) && c.exs?.length) { r[5] = c.exs[0]; fe++; mod = true; }
    if (!mod) return line; ch = true; return m[1] + '[' + r.map(v => q(v)).join(', ') + ']' + m[3]; }).join('\n');
  if (ch) fs.writeFileSync(p, out);
}
console.log(`đã điền ${fi} phiên âm, ${fe} ví dụ (tra mạng ${net} từ)`);
