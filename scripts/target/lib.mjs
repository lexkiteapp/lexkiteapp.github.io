// Ngôn ngữ đích (docs/specs/target-language.md): kiểm bộ từ content/target/<tl>/*.json theo schema.json + cổng nội dung,
// dựng bản sao cho app (web/js/target-<tl>-seed.json). Dùng chung: scripts/target/build.mjs, gen.mjs, scripts/test/target-lang.mjs.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
// 15 ngôn ngữ NGHĨA (vi + en + scripts/i18n-langs.txt) – thứ tự cố định
export const MEAN_LANGS = ['vi', 'en', ...fs.readFileSync(path.join(ROOT, 'scripts/i18n-langs.txt'), 'utf8').split('\n').map(s => s.trim()).filter(s => /^[a-z]{2}$/.test(s))];
export const POS = ['n', 'v', 'adj', 'adv', 'pron', 'prep', 'conj', 'num', 'interj', 'det'];
const VI_ONLY = /[ăơưđạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]/i; // chữ chỉ tiếng Việt có (â/ê/ô có trong pt/fr → không tính)
const IPA_OK = /^[a-zɐɑɒæɓʙβɔɕçɗɖðʤəɘɚɛɜɝɞɟʄɡɠɢʛɦɧħɥʜɨɪʝɭɬɫɮʟɱɯɰŋɳɲɴøɵɸθœɶʘɹɺɾɻʀʁɽʂʃʈʧʉʊʋⱱʌɣɤʍχʎʏʑʐʒʔʡʕʢǀǁǂǃˈˌːˑ̃̊̍̚ʰʲʷ̥̩̯͡.\- ]+$/u;
export const seedPath = tl => path.join(ROOT, 'content/target', tl, 'seed.json');
export const webSeedPath = tl => path.join(ROOT, 'web/js', `target-${tl}-seed.json`);
export const readJSON = f => JSON.parse(fs.readFileSync(f, 'utf8'));
export const imgKeys = () => new Set(Object.keys(readJSON(path.join(ROOT, 'content/lexicon/img.json')).items || {}));
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// từ (hoặc dạng chia exForm) xuất hiện nguyên vẹn trong câu ví dụ – ranh giới chữ Unicode
export const inSentence = (form, sent) => new RegExp(`(^|[^\\p{L}])${esc(form)}($|[^\\p{L}])`, 'iu').test(sent);

/** Kiểm một bộ từ → mảng lỗi (rỗng = đạt). o.img = Set khóa ảnh tiếng Anh hợp lệ (content/lexicon/img.json). */
export function validate(deck, o = {}) {
  const err = [], seen = new Set();
  if (!deck || deck.v !== 1) err.push('v phải = 1');
  if (!deck || !/^[a-z]{2}$/.test(deck.tl || '')) err.push('tl sai');
  const words = (deck && deck.words) || [];
  if (!Array.isArray(words) || !words.length) err.push('words rỗng');
  const ALLOWED = new Set(['word', 'pos', 'gender', 'ipa', 'emoji', 'img', 'gl', 'ex', 'exForm', 'rank', 'qa']);
  for (const w of words) {
    const id = (w && w.word) || '?', bad = m => err.push(`${id}: ${m}`);
    for (const k of Object.keys(w || {})) if (!ALLOWED.has(k)) bad('trường lạ ' + k);
    if (!/^\p{L}[\p{L}' -]*$/u.test(w.word || '')) bad('word sai');
    const key = String(w.word || '').toLowerCase() + '#' + w.pos;
    if (seen.has(key)) bad('trùng'); seen.add(key);
    if (!POS.includes(w.pos)) bad('pos sai');
    if (w.pos === 'n' && !['m', 'f', 'mf'].includes(w.gender)) bad('danh từ thiếu giống (gender m/f/mf)');
    if (w.pos !== 'n' && w.gender !== undefined) bad('gender chỉ cho danh từ');
    if (!IPA_OK.test(String(w.ipa || '').normalize('NFD')) || /[/[\]]/.test(w.ipa || '')) bad('IPA sai ký tự: ' + w.ipa);
    const gl = w.gl || {};
    for (const L of MEAN_LANGS) if (typeof gl[L] !== 'string' || !gl[L].trim()) bad('thiếu nghĩa ' + L);
    for (const L of Object.keys(gl)) { if (!MEAN_LANGS.includes(L)) bad('ngôn ngữ nghĩa lạ ' + L); else if (L !== 'vi' && (VI_ONLY.test(gl[L]) || (gl[L] === gl.vi && /[^\x20-\x7e]/.test(gl.vi)))) bad('lẫn tiếng Việt ở ' + L); }
    if (gl.en && /[^\x20-\x7e’]/.test(gl.en)) bad('nghĩa en có ký tự lạ');
    const ex = w.ex || {};
    if (!ex.pt || !ex.en) bad('thiếu câu ví dụ pt/en');
    else if (!inSentence(w.exForm || w.word, ex.pt)) bad(`câu ví dụ không chứa "${w.exForm || w.word}"`);
    if (w.exForm !== undefined && (!w.exForm || w.exForm.toLowerCase() === String(w.word).toLowerCase())) bad('exForm thừa');
    if (w.img !== undefined) { if (!/^[a-z][a-z' -]*#[a-z]+$/.test(w.img)) bad('img sai dạng'); else if (o.img && !o.img.has(w.img)) bad('img không có trong content/lexicon/img.json: ' + w.img); }
  }
  return err;
}

/** Bản sao cho app: chỉ trường app dùng (settings.js addTlSeed) – dựng bởi scripts/target/build.mjs, test so khớp. */
export const webSeed = deck => ({ v: 1, tl: deck.tl, words: deck.words.map(w => ({ word: w.word, pos: w.pos, ...(w.gender ? { gender: w.gender } : {}), ipa: w.ipa, emoji: w.emoji, ...(w.img ? { img: w.img } : {}), gl: w.gl, ex: w.ex })) });
export const webSeedText = deck => JSON.stringify(webSeed(deck)) + '\n';
