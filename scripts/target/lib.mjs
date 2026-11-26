// Ngôn ngữ đích (docs/specs/target-language.md): kiểm bộ từ content/target/<tl>/*.json theo schema.json + cổng nội dung,
// dựng bản sao cho app (web/js/target-<tl>-seed.json). Dùng chung: scripts/target/build.mjs, gen.mjs, scripts/test/target-lang.mjs.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { INFORMAL } from '../lib/i18n-rules.mjs'; // máy gác xưng hô dùng chung với #1324 (fr: tu/toi/ton… = thân mật)
import * as JA from './ja-kana.mjs'; // chữ viết tiếng Nhật (kana → romaji/IPA, mora, furigana) – chỉ dùng khi bảng có kana: true
import * as KO from './ko-hangul.mjs'; // chữ viết + ngữ pháp nền tiếng Hàn (biến âm chuẩn, RR, IPA, lớp chia) – chỉ dùng khi bảng có hangul: true

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
// 15 ngôn ngữ NGHĨA (vi + en + scripts/i18n-langs.txt) – thứ tự cố định
export const MEAN_LANGS = ['vi', 'en', ...fs.readFileSync(path.join(ROOT, 'scripts/i18n-langs.txt'), 'utf8').split('\n').map(s => s.trim()).filter(s => /^[a-z]{2}$/.test(s))];
const SCRIPT = { th: /\p{Script=Thai}/u, zh: /\p{Script=Han}/u, ja: /[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]/u, ko: /\p{Script=Hangul}/u, hi: /\p{Script=Devanagari}/u, ar: /\p{Script=Arabic}/u, ru: /\p{Script=Cyrillic}/u };
export const POS = ['n', 'v', 'adj', 'adv', 'pron', 'prep', 'conj', 'num', 'interj', 'det'];
const VI_ONLY = /[ăơưđạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]/i; // chữ chỉ tiếng Việt có (â/ê/ô có trong pt/fr → không tính)
const IPA_OK = /^[a-zɐɑɒæɓʙβɔɕçɗɖðʤəɘɚɛɜɝɞɟʄɡɠɢʛɦɧħɥʜɨɪʝɭɬɫɮʟɱɯɰŋɳɲɴøɵɸθœɶʘɹɺɾɻʀʁɽʂʃʈʧʉʊʋⱱʌɣɤʍχʎʏʑʐʒʔʡʕʢǀǁǂǃˈˌːˑ̃̊̍̚ʰʲʷ̥̩̯͈͡.\- ]+$/u;
export const seedPath = tl => path.join(ROOT, 'content/target', tl, 'seed.json');
// Lô lõi do gen.mjs sinh: content/target/<tl>/core-NN.json (mỗi lượt CI 1 tệp, ≤ 300 mục) – tệp .report.json đi kèm KHÔNG phải bộ từ
export const coreFiles = tl => { const d = path.join(ROOT, 'content/target', tl); return fs.existsSync(d) ? fs.readdirSync(d).filter(f => /^core(-\d{2,})?\.json$/.test(f)).sort().map(f => path.join(d, f)) : []; };
export const nextCoreFile = (tl, k = 0) => { const n = coreFiles(tl).map(f => +((/core-(\d+)\.json$/.exec(f) || [])[1] || 0)); return path.join(ROOT, 'content/target', tl, `core-${String(Math.max(0, ...n) + 1 + k).padStart(2, '0')}.json`); };
export const webSeedPath = tl => path.join(ROOT, 'web/js', `target-${tl}-seed.json`);
export const readJSON = f => JSON.parse(fs.readFileSync(f, 'utf8'));
export const imgKeys = () => new Set(Object.keys(readJSON(path.join(ROOT, 'content/lexicon/img.json')).items || {}));
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// từ (hoặc dạng chia exForm) xuất hiện nguyên vẹn trong câu ví dụ – ranh giới chữ Unicode
export const inSentence = (form, sent, sub) => (sub === true ? String(sent).includes(form) : new RegExp(`(^|[^\\p{L}])${esc(form)}${sub === 'lead' ? '' : '($|[^\\p{L}])'}`, 'iu').test(sent)); // sub: chữ viết không cách từ (ja) → chứa chuỗi; 'lead' (ko): từ đứng đầu một 어절, tiểu từ/đuôi dính sau (책을, 학교에서)

// Luật riêng theo ngôn ngữ đích (bảng, không nhánh code): es = danh từ bắt buộc số nhiều + IPA seseo (spanish-course.md §2, §8)
// lint = câu ví dụ chính không có vosotros (đại từ, sở hữu, clitic os, đuôi -áis/-éis), từ chỉ Tây Ban Nha hay từ tục ở Mỹ Latinh (coger) – §8 (ghi chú "Ở Tây Ban Nha" không nằm trong ex)
export const TL_RULES = { es: { plural: true, seseo: true, lint: [
  /(^|[^\p{L}])(vosotr[oa]s|vuestr[oa]s?|os|ordenador(es)?|zumos?|cog(er|e|es|en|emos|ió|í|iste|ido|iendo|ía|ían)|coj[oa]s?)(?=$|[^\p{L}])/iu,
  /\p{L}{2,}(áis|éis)(?=$|[^\p{L}])/iu,
] },
// fr (french-course.md §2, §5, §8): chuẩn Pháp trung tính; danh từ bắt buộc giống + số nhiều (cả bất quy tắc); từ bắt đầu bằng h bắt buộc cờ `h` (muet|aspire – quyết định liaison/elision);
// lint = không dạng Québec/Bỉ/Thụy Sĩ hay thông tục nặng trong câu chính; mix = một câu một xưng (tu ⟂ vous) – cùng INFORMAL.fr với máy gác UI #1324
fr: { plural: true, hFlag: true, mix: { informal: INFORMAL.fr, formal: /(?<!\p{L})(vous|votre|vos)(?!\p{L})/iu }, lint: [
  /(?<!\p{L})(bagnole|boulot|fric|bouffer?|bouffe|gamin|flic|mec|nana|pote|taf|truc|machin|ouais|char|dépanneur|magasiner|chum|septante|huitante|nonante)(?!\p{L})/iu,
] },
// ja (japanese-course.md §2, §5, §8): không giống/số nhiều (noGender); câu không cách từ (sub); kana bắt buộc + romaji/IPA phải đúng bằng ja-kana.mjs sinh từ kana (một quy ước, không gõ tay lệch);
// cao độ pitch = vị trí hạ 0…số mora; jlpt 5…1; động từ có vclass (ichidan|godan|irregular), tính từ có aclass (i|na) và khớp đuôi; câu ví dụ chính = thể lịch sự です/ます (end),
// chữ Nhật thuần (lint: không chữ Latin/số Ả Rập/khoảng trắng/katakana bán độ rộng), kết thúc 。 hoặc ？
ja: { noGender: true, sub: true, kana: true, derive: deriveJa, end: /(です|ます|ました|ません|でした|ましょう|ませんか|ください|でしょう)か?[。？]$/u, lint: [/[A-Za-z0-9\s]/u, /[\uff61-\uff9f]/u] } };
// ko (korean-course.md §2, §5, §8): không giống/số nhiều; từ đứng đầu 어절 (sub 'lead'); hangul: pron (표준 발음) + romaja (RR 2000) + IPA phải đúng bằng ko-hangul.mjs sinh từ chữ
// (ngoại lệ theo từ khai ở pronX, không gõ tay lệch); topik 1…6; vị từ (v/adj) dạng từ điển …다 + lớp chia conj khớp hình thức gốc; hanja (tuỳ chọn) đủ số âm tiết;
// câu ví dụ chính = 해요체 lịch sự (end …요. / …요?), chữ Hàn thuần (lint: không Latin, không Hán tự trong câu, không jamo rời/NFD)
TL_RULES.ko = { noGender: true, sub: 'lead', hangul: true, end: /요[.?]$/u, lint: [/[A-Za-z]/u, /\p{Script=Han}/u, /[\u1100-\u11ff\u3131-\u318e]/u] };
// gen.mjs (W1): cách đọc + cấp JLPT theo DANH SÁCH NGUỒN khi người soạn giữ đúng mục từ (hint = { kana, jlpt, en }); romaji + IPA SINH từ kana (không tin chữ AI gõ);
// cao độ AI trả chỉ là chỗ giữ – bước CI tl_ja_fill.py ghi đè bằng OpenJTalk (khớp NHK 30/30 trên seed), ngoài 0…mora → 0 + qa.pitchAi để cổng không loại oan trước bước đó.
function deriveJa(e, hint) {
  const o = { ...e }; delete o.gender; delete o.plural;
  if (hint && o.word === hint.form) { o.kana = hint.kana; o.jlpt = hint.jlpt; }
  if (JA.isKana(o.kana)) {
    try { o.romaji = JA.romaji(o.kana); o.ipa = JA.ipa(o.kana, { verb: o.pos === 'v' }); } catch { /* kana lạ → cổng báo */ }
    if (!Number.isInteger(o.pitch) || o.pitch < 0 || o.pitch > JA.morae(o.kana)) { o.qa = { ...(o.qa || {}), pitchAi: o.pitch ?? null }; o.pitch = 0; }
  }
  return o;
}
const VCLASS = { ichidan: /[いきしちにひみりぎじびぴえけせてねへめれげぜべぺ]る$/u, godan: /[うくぐすつぬぶむる]$/u, irregular: /^(する|くる)$|する$/u };

// trường hợp lệ của một mục (mọi tl; trường riêng bị chặn theo bảng trong validate) – gen.mjs lấy đúng các trường này từ người soạn
export const FIELDS = ['word', 'pos', 'gender', 'plural', 'h', 'kana', 'romaji', 'pitch', 'jlpt', 'vclass', 'aclass', 'pron', 'romaja', 'topik', 'conj', 'hanja', 'pronX', 'ipa', 'emoji', 'img', 'gl', 'ex', 'exForm', 'rank', 'qa'];
/** Trường SINH từ chữ theo bảng (một quy ước, không tin người soạn): hangul (ko) → pron/romaja/ipa bằng ko-hangul.mjs (giữ pronX hợp lệ của người soạn).
 *  Giá trị người soạn lệch → qa.<trường>Ai (gắn cờ, giám khảo/soát tay xem). Trả mục mới; chữ không hợp lệ → giữ nguyên để validate() báo lỗi. */
export function derive(e, tl) {
  const R = TL_RULES[tl] || {};
  if (!R.hangul || !KO.isHangul(e.word)) return e;
  const o = { verb: e.pos === 'v' || e.pos === 'adj', x: e.pronX }, out = { ...e }, qa = { ...(e.qa || {}) };
  try { for (const [k, f] of [['pron', KO.pron], ['romaja', KO.romaja], ['ipa', KO.ipa]]) { const v = f(e.word, o); if (e[k] !== undefined && e[k] !== v) qa[k + 'Ai'] = e[k]; out[k] = v; } } catch { return e; }
  if (Object.keys(qa).length) out.qa = qa;
  return out;
}

/** Kiểm một bộ từ → mảng lỗi (rỗng = đạt). o.img = Set khóa ảnh tiếng Anh hợp lệ (content/lexicon/img.json). */
export function validate(deck, o = {}) {
  const err = [], seen = new Set(), R = TL_RULES[deck && deck.tl] || {};
  if (!deck || deck.v !== 1) err.push('v phải = 1');
  if (!deck || !/^[a-z]{2}$/.test(deck.tl || '')) err.push('tl sai');
  const words = (deck && deck.words) || [];
  if (!Array.isArray(words) || !words.length) err.push('words rỗng');
  const ALLOWED = new Set(FIELDS);
  for (const w of words) {
    const id = (w && w.word) || '?', bad = m => err.push(`${id}: ${m}`);
    for (const k of Object.keys(w || {})) if (!ALLOWED.has(k)) bad('trường lạ ' + k);
    if (!/^\p{L}[\p{L}' -]*$/u.test(w.word || '')) bad('word sai');
    const key = String(w.word || '').toLowerCase() + '#' + w.pos;
    if (seen.has(key)) bad('trùng'); seen.add(key);
    if (!POS.includes(w.pos)) bad('pos sai');
    if (R.noGender) { if (w.gender !== undefined) bad('ngôn ngữ không có giống – bỏ gender'); }
    else if (w.pos === 'n' && !['m', 'f', 'mf'].includes(w.gender)) bad('danh từ thiếu giống (gender m/f/mf)');
    if (w.pos !== 'n' && w.gender !== undefined) bad('gender chỉ cho danh từ');
    // số nhiều (bảng TL_RULES): bắt buộc cho danh từ, chỉ cho danh từ
    if (R.plural && w.pos === 'n' && !/^\p{L}[\p{L}' -]*$/u.test(w.plural || '')) bad('danh từ es thiếu số nhiều (plural)');
    if (w.pos !== 'n' && w.plural !== undefined) bad('plural chỉ cho danh từ');
    // h muet / h aspiré (fr): từ mở đầu bằng h phải có cờ; từ khác không được có
    if (w.h !== undefined && !['muet', 'aspire'].includes(w.h)) bad('h phải là muet|aspire');
    if (R.hFlag) { const h = /^h/i.test(w.word || ''); if (h && w.h === undefined) bad('từ mở đầu bằng h thiếu cờ h (muet|aspire)'); if (!h && w.h !== undefined) bad('cờ h chỉ cho từ mở đầu bằng h'); } else if (w.h !== undefined) bad('cờ h chỉ cho ngôn ngữ có hFlag');
    // seseo (es-419, spanish-course.md §8): IPA không có /θ/
    if (R.seseo && /θ/.test(w.ipa || '')) bad('IPA có θ (ceceo) – chuẩn es-419 dùng seseo /s/');
    // kana (ja): cách đọc bắt buộc, furigana khớp chữ, romaji + IPA đúng bằng bản sinh từ kana, cao độ trong 0…mora, cấp JLPT, nhóm động/tính từ khớp đuôi
    const JF = ['kana', 'romaji', 'pitch', 'jlpt', 'vclass', 'aclass'];
    if (!R.kana) { for (const k of JF) if (w[k] !== undefined) bad(k + ' chỉ cho ngôn ngữ có kana'); }
    else if (!JA.isKana(w.kana)) bad('thiếu/sai kana (cách đọc hiragana/katakana): ' + w.kana);
    else {
      if (JA.hasKanji(w.word) ? !JA.ruby(w.word, w.kana) : JA.hira(w.word) !== JA.hira(w.kana)) bad(`kana ${w.kana} không khớp chữ ${w.word} (furigana)`);
      let r = '', p = ''; try { r = JA.romaji(w.kana); p = JA.ipa(w.kana, { verb: w.pos === 'v' }); } catch (e) { bad(e.message); }
      if (w.romaji !== r) bad(`romaji ${w.romaji} ≠ quy ước ${r}`);
      if (w.ipa !== p) bad(`IPA ${w.ipa} ≠ quy ước /${p}/ (ja-kana.mjs)`);
      if (!Number.isInteger(w.pitch) || w.pitch < 0 || w.pitch > JA.morae(w.kana)) bad(`pitch ${w.pitch} ngoài 0…${JA.morae(w.kana)} mora`);
      if (![1, 2, 3, 4, 5].includes(w.jlpt)) bad('jlpt phải là 5…1 (N5…N1)');
      if (w.pos === 'v' ? !VCLASS[w.vclass] || !VCLASS[w.vclass].test(JA.hira(w.kana)) : w.vclass !== undefined) bad('vclass (ichidan|godan|irregular) sai/thiếu: ' + w.vclass);
      if (w.pos === 'adj' ? !(w.aclass === 'na' || (w.aclass === 'i' && /い$/.test(w.kana))) : w.aclass !== undefined) bad('aclass (i|na) sai/thiếu: ' + w.aclass);
    }
    // hangul (ko): phát âm chuẩn + RR + IPA SINH từ chữ (ko-hangul.mjs), ngoại lệ theo từ ở pronX; TOPIK 1…6; vị từ có lớp chia; hanja đủ âm tiết
    const KF = ['pron', 'romaja', 'topik', 'conj', 'hanja', 'pronX'];
    if (!R.hangul) { for (const k of KF) if (w[k] !== undefined) bad(k + ' chỉ cho ngôn ngữ có hangul'); }
    else if (!KO.isHangul(w.word)) bad('từ phải là chữ Hangul trọn âm tiết (NFC, không jamo rời/khoảng trắng): ' + w.word);
    else {
      const vb = w.pos === 'v' || w.pos === 'adj', X = w.pronX, n = [...w.word].length;
      if (X !== undefined && (typeof X !== 'object' || !Object.keys(X).length || Object.entries(X).some(([k, a]) => !['tense', 'nIns', 'nn', 'noLiaison', 'lbP'].includes(k) || !Array.isArray(a) || !a.length || a.some(i => !Number.isInteger(i) || i < 0 || i >= n)))) bad('pronX sai (tense|nIns|nn|noLiaison|lbP: mảng vị trí âm tiết)');
      let p = '', r = '', q = ''; try { p = KO.pron(w.word, { verb: vb, x: X }); r = KO.romaja(w.word, { verb: vb, x: X }); q = KO.ipa(w.word, { verb: vb, x: X }); } catch (e) { bad(e.message); }
      if (w.pron !== p) bad(`pron ${w.pron} ≠ quy tắc [${p}] (ko-hangul.mjs; ngoại lệ theo từ → pronX)`);
      if (w.romaja !== r) bad(`romaja ${w.romaja} ≠ RR ${r}`);
      if (w.ipa !== q) bad(`IPA ${w.ipa} ≠ quy ước /${q}/ (ko-hangul.mjs)`);
      if (![1, 2, 3, 4, 5, 6].includes(w.topik)) bad('topik phải là 1…6');
      if (vb ? !KO.CONJ.includes(w.conj) || !KO.conjShape(w.word, w.conj) : w.conj !== undefined) bad('conj (lớp chia vị từ …다) sai/thiếu: ' + w.conj);
      if (w.hanja !== undefined && !(/^\p{Script=Han}+$/u.test(w.hanja) && [...w.hanja].length === n)) bad('hanja phải là Hán tự, đủ số âm tiết: ' + w.hanja);
    }
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
    else if (!inSentence(w.exForm || w.word, ex[tl], R.sub)) bad(`câu ví dụ không chứa "${w.exForm || w.word}"`);
    else if ((R.lint || []).some(re => re.test(ex[tl]))) bad('câu ví dụ lệch chuẩn ' + (deck.variant || tl) + ' (vosotros/leísmo/từ vùng): ' + ex[tl]);
    if (R.end && ex[tl] && !R.end.test(ex[tl])) bad('câu ví dụ chính phải ở thể lịch sự (ja です/ます + 。/？ · ko 해요체 …요./…요?): ' + ex[tl]);
    if (R.mix && ex[tl] && R.mix.informal.test(ex[tl]) && R.mix.formal.test(ex[tl])) bad('trộn thân mật/trang trọng (tu + vous) trong một câu: ' + ex[tl]);
    if (w.exForm !== undefined && (!w.exForm || w.exForm.toLowerCase() === String(w.word).toLowerCase())) bad('exForm thừa');
    if (w.img !== undefined) { if (!/^[a-z][a-z' -]*#[a-z]+$/.test(w.img)) bad('img sai dạng'); else if (o.img && !o.img.has(w.img)) bad('img không có trong content/lexicon/img.json: ' + w.img); }
  }
  return err;
}

/** Bản sao cho app: chỉ trường app dùng (settings.js addTlSeed) – dựng bởi scripts/target/build.mjs, test so khớp. */
export const webSeed = deck => ({ v: 1, tl: deck.tl, words: deck.words.map(w => ({ word: w.word, pos: w.pos, ...(w.gender ? { gender: w.gender } : {}), ...(w.plural ? { plural: w.plural } : {}), ...(w.h ? { h: w.h } : {}), ...(w.kana ? { kana: w.kana, romaji: w.romaji, pitch: w.pitch, jlpt: w.jlpt, ...(w.vclass ? { vclass: w.vclass } : {}), ...(w.aclass ? { aclass: w.aclass } : {}) } : {}), ...(w.pron ? { pron: w.pron, romaja: w.romaja, topik: w.topik, ...(w.conj ? { conj: w.conj } : {}), ...(w.hanja ? { hanja: w.hanja } : {}) } : {}), ipa: w.ipa, emoji: w.emoji, ...(w.img ? { img: w.img } : {}), gl: w.gl, ex: w.ex })) });
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

// espeak-ng in cờ đổi ngôn ngữ ((en)ʃəʊ(fr)) khi từ điển của nó coi từ là từ ngoại → IPA đó sai cho người học tl. wiktIpa: IPA đầu tiên hợp lệ của các mục Wiktionary
// (bỏ / [ ] dấu nhấn ‿ ngắt âm tiết như quy ước espeak không nhấn; bỏ biến thể có âm tuỳ chọn trong ngoặc) – '' khi không có
export const LANG_SWITCH = /\([a-z]{2,3}(-[a-z]+)?\)/;
export const wiktIpa = es => es.flatMap(e => (e.sounds || []).map(x => x.ipa)).filter(x => x && !/[()]/.test(x)).map(x => x.replace(/[/[\]ˈˌ‿.]/g, '').trim()).find(x => x && IPA_OK.test(x.normalize('NFD'))) || '';

// LanguageTool tự chạy trên runner (spanish-course.md §5.1; dựng bằng scripts/ci/lt-up.sh): mọi lỗi (kể cả chính tả/dấu câu) = loại; lỗi mạng = ném (dừng lượt, không bỏ cổng)
export async function ltErrors(url, lang, text) {
  const r = await fetch(url + '/v2/check', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ text, language: lang }) });
  if (!r.ok) throw new Error('LanguageTool ' + r.status);
  return (await r.json()).matches.map(m => `${m.rule.id}: ${text.slice(m.offset, m.offset + m.length)} – ${m.message}`);
}

/** Dạng → lemma từ mục Wiktionary của dạng đó (hàm thuần; gen.mjs quy dạng chia về lemma TRƯỚC khi tốn ai-pool). Trả { lemmas } (chính nó nếu dạng
 *  cũng là một mục từ thật, không thì các lemma theo form_of) hoặc { name: true } khi trang chỉ có tên riêng. Không có trang → [form]. */
export function lemmaFromEntries(form, E) {
  if (!E || !E.length) return { lemmas: [form] };
  const isForm = x => (x.form_of || []).length > 0 || (x.tags || []).includes('form-of');
  const self = E.some(e => e.pos !== 'name' && (e.senses || []).some(x => !isForm(x)));
  const of = E.flatMap(e => (e.senses || []).flatMap(x => (x.form_of || []).map(f => String(f.word || '').toLowerCase()))).filter(w => /^\p{L}+$/u.test(w));
  if (!self && !of.length) return E.every(e => e.pos === 'name') ? { name: true, lemmas: [] } : { lemmas: [form] };
  return { lemmas: self ? [form] : [...new Set(of)] }; // dạng là mục từ thật (casa, traje) → chỉ chính nó; lemma kia (casar, traer) tự đến từ dạng của nó, đúng thứ hạng
}
