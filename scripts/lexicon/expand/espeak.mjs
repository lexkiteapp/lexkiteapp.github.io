import { fileURLToPath } from 'node:url';
// IPA Anh dự phòng từ espeak-ng en-gb (miễn phí, tất định) khi Wiktionary thiếu – docs/LEXICON.md §Mở rộng 20k.
// espeak_uk.py trả IPA thô (ˈ đặt trước nguyên âm, ɹ, a…) → normEspeak() đưa về quy ước kho (ˈ ở đầu âm tiết, r, æ, e, không ˈ ở từ 1 âm tiết).
// Hiệu chuẩn (calibrate): so với IPA Anh Wiktionary của ~300 từ – chỉ dùng khi khớp gần ≥ 90 % (ACCEPT); mục ghi src.ipaUK = 'espeak'.
import { execFileSync } from 'child_process';
import { fixBroken, stripMonoStress, badChars } from '../ipa.mjs';
export const ACCEPT = 0.9;
const VOW = ['aɪə', 'aʊə', 'eɪ', 'aɪ', 'ɔɪ', 'əʊ', 'aʊ', 'ɪə', 'eə', 'ʊə', 'iː', 'uː', 'ɑː', 'ɔː', 'ɜː', 'ɪ', 'e', 'æ', 'ʌ', 'ɒ', 'ʊ', 'ə', 'i', 'u', 'ɛ', 'a', 'o', 'ɐ', 'ɑ', 'ɔ', 'ɜ'];
const CON = ['tʃ', 'dʒ', 'p', 'b', 't', 'd', 'k', 'ɡ', 'f', 'v', 'θ', 'ð', 's', 'z', 'ʃ', 'ʒ', 'h', 'm', 'n', 'ŋ', 'l', 'r', 'j', 'w'];
const ONSETS = new Set(['pl', 'bl', 'kl', 'ɡl', 'fl', 'sl', 'pr', 'br', 'tr', 'dr', 'kr', 'ɡr', 'fr', 'θr', 'ʃr', 'tw', 'dw', 'kw', 'ɡw', 'sw', 'θw',
  'pj', 'bj', 'tj', 'dj', 'kj', 'ɡj', 'mj', 'nj', 'fj', 'vj', 'hj', 'lj', 'sj', 'sp', 'st', 'sk', 'sm', 'sn', 'sf', 'spl', 'spr', 'str', 'skr', 'skw', 'spj', 'stj', 'skj']);
/** chuỗi IPA → token (âm vị nhiều ký tự, ˈ ˌ, khoảng trắng) */
export function tokens(s) {
  const out = []; let i = 0; s = String(s || '');
  while (i < s.length) {
    if ('ˈˌ '.includes(s[i])) { out.push(s[i++]); continue; }
    const m = VOW.find(v => s.startsWith(v, i)) || CON.find(c => s.startsWith(c, i)) || s[i];
    out.push(m); i += m.length;
  }
  return out;
}
const isV = t => VOW.includes(t);
/** IPA thô espeak en-gb → quy ước kho, dạng /…/ ('' nếu còn ký hiệu ngoài bảng) */
export function normEspeak(raw) {
  let s = String(raw || '').trim().replace(/[ɹɻ]/g, 'r').replace(/ɾ/g, 't').replace(/ʔ/g, 't').replace(/ɬ/g, 'l').replace(/x/g, 'k').replace(/g/g, 'ɡ').replace(/ᵻ/g, 'ɪ').replace(/ɐ/g, 'ə')
    .replace(/iə/g, 'ɪə').replace(/oː/g, 'ɔː').replace(/ɛ/g, 'e').replace(/ɔ(?!ː|ɪ)/g, 'ɒ').replace(/a(?![ɪʊ])/g, 'æ').replace(/ːː/g, 'ː').replace(/[-_|]/g, '');
  s = fixBroken(s);
  // ˈ/ˌ trước nguyên âm → đầu âm tiết (âm đầu tối đa hợp lệ)
  const t = tokens(s), o = [];
  for (let i = 0; i < t.length; i++) {
    if (t[i] !== 'ˈ' && t[i] !== 'ˌ') { o.push(t[i]); continue; }
    let j = o.length; while (j > 0 && CON.includes(o[j - 1])) j--;
    const cl = o.slice(j), atStart = j === 0 || o[j - 1] === ' ';
    let k = cl.length;
    if (!atStart) { k = 0; for (let n = Math.min(3, cl.length); n >= 1; n--) { const on = cl.slice(cl.length - n); if (n === 1 ? on[0] !== 'ŋ' : ONSETS.has(on.join(''))) { k = n; break; } } }
    o.splice(o.length - k, 0, t[i]);
  }
  // ɪə không mang trọng âm sau nguyên âm khác = i + ə (ˈeəriə, ˈlɪniə; Wiktionary/Oxford), không phải nguyên âm đôi
  for (let i = 1; i < o.length; i++) if (o[i] === 'ɪə') { let j = i - 1; while (j >= 0 && CON.includes(o[j])) j--; if (j >= 0 && isV(o[j]) && !'ˈˌ'.includes(o[j + 1] || '') && !'ˈˌ'.includes(o[i - 1])) o[i] = 'iə'; }
  // từ 1 âm tiết: bỏ trọng âm (kiểu Oxford); ˌ đứng đầu từ 2 âm tiết không có ˈ → ˈ
  const out = stripMonoStress('/' + o.join('').replace(/^ˌ/, o.includes('ˈ') ? 'ˌ' : 'ˈ') + '/');
  return badChars(out).length ? '' : out;
}
/** khóa so sánh chung cho 2 nguồn (khác biệt kiểu ghi, không phải phát âm) */
export const cmpKey = s => stripMonoStress('/' + fixBroken(String(s || '').replace(/^\/|\/$/g, '')).replace(/[ɹ]/g, 'r').replace(/ɛ/g, 'e').replace(/a(?![ɪʊ])/g, 'æ').replace(/\(r\)/g, '').replace(/ˌ/g, '')
  .replace(/ɐ/g, 'ʌ').replace(/ɪ$/, 'i').replace(/i$/, 'i').replace(/([^aeiouæɑɒɔəɜʊɪʌː])ə([ln])$/, '$1$2').replace(/ʃən/g, 'ʃn').replace(/ʒən/g, 'ʒn').replace(/[.‿]/g, '') + '/').replace(/^\/|\/$/g, '');
export function dist(a, b) {
  const x = tokens(a), y = tokens(b), d = Array.from({ length: x.length + 1 }, (_, i) => [i, ...Array(y.length).fill(0)]);
  for (let j = 1; j <= y.length; j++) d[0][j] = j;
  for (let i = 1; i <= x.length; i++) for (let j = 1; j <= y.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (x[i - 1] === y[j - 1] ? 0 : 1));
  return d[x.length][y.length];
}
// Wiktionary ghi âm tuỳ chọn trong ngoặc: /ˈkʌlɪn(ə)ri/, /pəˈl(j)uːtənt/ → so cả 2 dạng
const variants = s => { const m = /\(([^()]*)\)/.exec(s); return m ? [...variants(s.slice(0, m.index) + m[1] + s.slice(m.index + m[0].length)), ...variants(s.slice(0, m.index) + s.slice(m.index + m[0].length))] : [s]; };
// trọng âm so ở mức nguyên âm (dɪsˈtɔːt ≈ dɪˈstɔːt chỉ khác cách chia âm tiết): khoảng cách = lệch âm vị + (nguyên âm mang ˈ khác ? 1 : 0)
const stressV = s => { let n = 0, st = -1; for (const t of tokens(s)) { if (t === 'ˈ') st = n; else if (isV(t)) n++; } return st; };
function d2(a, b) { return dist(a.replace(/ˈ/g, ''), b.replace(/ˈ/g, '')) + (stressV(a) === stressV(b) ? 0 : 1); }
/** exact: trùng khóa; near: lệch ≤ 1 (âm vị hoặc vị trí trọng âm) */
export const compare = (es, wk) => { const a = cmpKey(es); const dd = a ? Math.min(99, ...variants(String(wk || '').replace(/\(\)/g, '')).map(v => cmpKey(v)).filter(Boolean).map(b => a === b ? 0 : Math.max(1, d2(a, b)))) : 99; return { exact: dd === 0, near: dd <= 1, d: dd }; };
/** gọi espeak_uk.py cho danh sách từ → { w: '/ipa/' } (rỗng nếu không chạy được) */
export function espeakUK(words, py = process.env.ESPEAK_PY || 'python3') {
  if (!words.length) return {};
  try { const raw = JSON.parse(execFileSync(py, ['-I', fileURLToPath(new URL('./espeak_uk.py', import.meta.url))], { input: words.join('\n'), maxBuffer: 64 << 20 }).toString());
    return Object.fromEntries(Object.entries(raw).map(([w, v]) => [w, normEspeak(v)])); } catch (e) { console.error('espeak: ' + String(e.message).slice(0, 200)); return {}; }
}
