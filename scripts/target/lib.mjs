// Ngôn ngữ đích (docs/specs/target-language.md): kiểm bộ từ content/target/<tl>/*.json theo schema.json + cổng nội dung,
// dựng bản sao cho app (web/js/target-<tl>-seed.json). Dùng chung: scripts/target/build.mjs, gen.mjs, scripts/test/target-lang.mjs.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
// 15 ngôn ngữ NGHĨA (vi + en + scripts/i18n-langs.txt) – thứ tự cố định
export const MEAN_LANGS = ['vi', 'en', ...fs.readFileSync(path.join(ROOT, 'scripts/i18n-langs.txt'), 'utf8').split('\n').map(s => s.trim()).filter(s => /^[a-z]{2}$/.test(s))];
const SCRIPT = { th: /\p{Script=Thai}/u, zh: /\p{Script=Han}/u, ja: /[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]/u, ko: /\p{Script=Hangul}/u, hi: /\p{Script=Devanagari}/u, ar: /\p{Script=Arabic}/u, ru: /\p{Script=Cyrillic}/u };
export const POS = ['n', 'v', 'adj', 'adv', 'pron', 'prep', 'conj', 'num', 'interj', 'det'];
const VI_ONLY = /[ăơưđạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]/i; // chữ chỉ tiếng Việt có (â/ê/ô có trong pt/fr → không tính)
const IPA_OK = /^[a-zɐɑɒæɓʙβɔɕçɗɖðʤəɘɚɛɜɝɞɟʄɡɠɢʛɦɧħɥʜɨɪʝɭɬɫɮʟɱɯɰŋɳɲɴøɵɸθœɶʘɹɺɾɻʀʁɽʂʃʈʧʉʊʋⱱʌɣɤʍχʎʏʑʐʒʔʡʕʢǀǁǂǃˈˌːˑ̃̊̍̚ʰʲʷ̥̩̯͡.\- ]+$/u;
export const seedPath = tl => path.join(ROOT, 'content/target', tl, 'seed.json');
// Lô lõi do gen.mjs sinh: content/target/<tl>/core-NN.json (mỗi lượt CI 1 tệp, ≤ 300 mục) – tệp .report.json đi kèm KHÔNG phải bộ từ
export const coreFiles = tl => { const d = path.join(ROOT, 'content/target', tl); return fs.existsSync(d) ? fs.readdirSync(d).filter(f => /^core(-\d{2,})?\.json$/.test(f)).sort().map(f => path.join(d, f)) : []; };
export const nextCoreFile = (tl, k = 0) => { const n = coreFiles(tl).map(f => +((/core-(\d+)\.json$/.exec(f) || [])[1] || 0)); return path.join(ROOT, 'content/target', tl, `core-${String(Math.max(0, ...n) + 1 + k).padStart(2, '0')}.json`); };
export const webSeedPath = tl => path.join(ROOT, 'web/js', `target-${tl}-seed.json`);
export const readJSON = f => JSON.parse(fs.readFileSync(f, 'utf8'));
export const imgKeys = () => new Set(Object.keys(readJSON(path.join(ROOT, 'content/lexicon/img.json')).items || {}));
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// từ (hoặc dạng chia exForm) xuất hiện nguyên vẹn trong câu ví dụ – ranh giới chữ Unicode
export const inSentence = (form, sent) => new RegExp(`(^|[^\\p{L}])${esc(form)}($|[^\\p{L}])`, 'iu').test(sent);

// Luật riêng theo ngôn ngữ đích (bảng, không nhánh code): es = danh từ bắt buộc số nhiều + IPA seseo (spanish-course.md §2, §8)
// lint = câu ví dụ chính không có vosotros (đại từ, sở hữu, clitic os, đuôi -áis/-éis), từ chỉ Tây Ban Nha hay từ tục ở Mỹ Latinh (coger) – §8 (ghi chú "Ở Tây Ban Nha" không nằm trong ex)
export const TL_RULES = { es: { plural: true, seseo: true, lint: [
  /(^|[^\p{L}])(vosotr[oa]s|vuestr[oa]s?|os|ordenador(es)?|zumos?|cog(er|e|es|en|emos|ió|í|iste|ido|iendo|ía|ían)|coj[oa]s?)(?=$|[^\p{L}])/iu,
  /\p{L}{2,}(áis|éis)(?=$|[^\p{L}])/iu,
] } };

/** Kiểm một bộ từ → mảng lỗi (rỗng = đạt). o.img = Set khóa ảnh tiếng Anh hợp lệ (content/lexicon/img.json). */
export function validate(deck, o = {}) {
  const err = [], seen = new Set(), R = TL_RULES[deck && deck.tl] || {};
  if (!deck || deck.v !== 1) err.push('v phải = 1');
  if (!deck || !/^[a-z]{2}$/.test(deck.tl || '')) err.push('tl sai');
  const words = (deck && deck.words) || [];
  if (!Array.isArray(words) || !words.length) err.push('words rỗng');
  const ALLOWED = new Set(['word', 'pos', 'gender', 'plural', 'ipa', 'emoji', 'img', 'gl', 'ex', 'exForm', 'rank', 'qa']);
  for (const w of words) {
    const id = (w && w.word) || '?', bad = m => err.push(`${id}: ${m}`);
    for (const k of Object.keys(w || {})) if (!ALLOWED.has(k)) bad('trường lạ ' + k);
    if (!/^\p{L}[\p{L}' -]*$/u.test(w.word || '')) bad('word sai');
    const key = String(w.word || '').toLowerCase() + '#' + w.pos;
    if (seen.has(key)) bad('trùng'); seen.add(key);
    if (!POS.includes(w.pos)) bad('pos sai');
    if (w.pos === 'n' && !['m', 'f', 'mf'].includes(w.gender)) bad('danh từ thiếu giống (gender m/f/mf)');
    if (w.pos !== 'n' && w.gender !== undefined) bad('gender chỉ cho danh từ');
    // số nhiều (bảng TL_RULES): bắt buộc cho danh từ, chỉ cho danh từ
    if (R.plural && w.pos === 'n' && !/^\p{L}[\p{L}' -]*$/u.test(w.plural || '')) bad('danh từ es thiếu số nhiều (plural)');
    if (w.pos !== 'n' && w.plural !== undefined) bad('plural chỉ cho danh từ');
    // seseo (es-419, spanish-course.md §8): IPA không có /θ/
    if (R.seseo && /θ/.test(w.ipa || '')) bad('IPA có θ (ceceo) – chuẩn es-419 dùng seseo /s/');
    if (!IPA_OK.test(String(w.ipa || '').normalize('NFD')) || /[/[\]]/.test(w.ipa || '')) bad('IPA sai ký tự: ' + w.ipa);
    const gl = w.gl || {};
    for (const L of MEAN_LANGS) if (typeof gl[L] !== 'string' || !gl[L].trim()) bad('thiếu nghĩa ' + L);
    for (const L of Object.keys(gl)) { if (!MEAN_LANGS.includes(L)) bad('ngôn ngữ nghĩa lạ ' + L); else if (L !== 'vi' && (VI_ONLY.test(gl[L]) || (gl[L] === gl.vi && /[^\x20-\x7e]/.test(gl.vi)))) bad('lẫn tiếng Việt ở ' + L); }
    if (gl.en && /[^\x20-\x7e’]/.test(gl.en)) bad('nghĩa en có ký tự lạ');
    // chữ viết đúng ngôn ngữ (lượt thử W1: nghĩa vi/ja… bị trả nguyên từ gốc) + nghĩa vi không được là chính từ đích
    for (const [L, re] of Object.entries(SCRIPT)) if (gl[L] && !re.test(gl[L])) bad(`nghĩa ${L} sai chữ viết: ${gl[L]}`);
    if (gl.vi && deck && deck.tl && deck.tl !== 'vi' && gl.vi.trim().toLowerCase() === String(w.word).toLowerCase()) bad('nghĩa vi = nguyên từ ' + deck.tl);
    const ex = w.ex || {};
    const tl = (deck && deck.tl) || 'pt';
    if (!ex[tl] || !ex.en) bad(`thiếu câu ví dụ ${tl}/en`);
    else if (Object.keys(ex).some(k => k !== tl && k !== 'en')) bad('câu ví dụ có ngôn ngữ lạ');
    else if (!inSentence(w.exForm || w.word, ex[tl])) bad(`câu ví dụ không chứa "${w.exForm || w.word}"`);
    else if ((R.lint || []).some(re => re.test(ex[tl]))) bad('câu ví dụ lệch chuẩn ' + (deck.variant || tl) + ' (vosotros/leísmo/từ vùng): ' + ex[tl]);
    if (w.exForm !== undefined && (!w.exForm || w.exForm.toLowerCase() === String(w.word).toLowerCase())) bad('exForm thừa');
    if (w.img !== undefined) { if (!/^[a-z][a-z' -]*#[a-z]+$/.test(w.img)) bad('img sai dạng'); else if (o.img && !o.img.has(w.img)) bad('img không có trong content/lexicon/img.json: ' + w.img); }
  }
  return err;
}

/** Bản sao cho app: chỉ trường app dùng (settings.js addTlSeed) – dựng bởi scripts/target/build.mjs, test so khớp. */
export const webSeed = deck => ({ v: 1, tl: deck.tl, words: deck.words.map(w => ({ word: w.word, pos: w.pos, ...(w.gender ? { gender: w.gender } : {}), ...(w.plural ? { plural: w.plural } : {}), ipa: w.ipa, emoji: w.emoji, ...(w.img ? { img: w.img } : {}), gl: w.gl, ex: w.ex })) });
export const webSeedText = deck => JSON.stringify(webSeed(deck)) + '\n';

// Mục Wiktionary (kaikki.org, CC BY-SA) của 1 từ – tệp nhỏ /meaning/… (không tải bản 1,1 GB). CHỈ dùng để kiểm chéo trên CI (wikt-check, conj-check),
// không ghi dữ liệu Wiktionary vào repo. 404 → []; lỗi mạng/5xx sau 3 lần → thoát 3 (dừng lượt, không bỏ cổng).
export async function kaikki(lang, w) {
  const l = w.toLowerCase(), c = [...l], u = `https://kaikki.org/dictionary/${lang}/meaning/${encodeURIComponent(c[0])}/${encodeURIComponent(c.slice(0, 2).join(''))}/${encodeURIComponent(l)}.jsonl`;
  for (let t = 1; t <= 3; t++) {
    try {
      const r = await fetch(u); if (r.status === 404) return [];
      if (r.ok) return (await r.text()).split('\n').filter(Boolean).map(x => JSON.parse(x));
    } catch {}
    await new Promise(z => setTimeout(z, 1500 * t));
  }
  console.error('✗ kaikki.org không trả lời (' + w + ') – dừng lượt'); process.exit(3);
}

// LanguageTool tự chạy trên runner (spanish-course.md §5.1; dựng bằng scripts/ci/lt-up.sh): mọi lỗi (kể cả chính tả/dấu câu) = loại; lỗi mạng = ném (dừng lượt, không bỏ cổng)
export async function ltErrors(url, lang, text) {
  const r = await fetch(url + '/v2/check', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ text, language: lang }) });
  if (!r.ok) throw new Error('LanguageTool ' + r.status);
  return (await r.json()).matches.map(m => `${m.rule.id}: ${text.slice(m.offset, m.offset + m.length)} – ${m.message}`);
}
