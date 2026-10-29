// IPA: bảng ký hiệu cho phép, sửa ký hiệu hỏng, r kiểu Mỹ trong ô giọng Anh, ˈ thừa ở từ 1 âm tiết, CMUdict (ARPAbet) → IPA Mỹ kiểu Oxford.
const V = 'ɪeæʌɒʊəiuɑɔɜaoɐɛ';
const CONS = 'pbtdkɡfvθðszʃʒhmnŋlrjw';
// Mọi ký tự hợp lệ trong một chuỗi IPA (kể cả dấu gạch chéo, khoảng trắng, (r) kiểu Oxford, … trong cụm mẫu, - và , trong cụm)
export const ALLOWED = new Set([...(CONS + V + 'ːˈˌ()/ …,-‿.')]);
export const badChars = s => [...String(s || '')].filter(c => !ALLOWED.has(c));

// 37 ký hiệu hỏng (kiểm định 10/2026): Wiktionary/khẩu âm lạ → ký hiệu chuẩn từ điển
const BROKEN = [[/t͡ʃ/g, 'tʃ'], [/d͡ʒ/g, 'dʒ'], [/͡/g, ''], [/ä/g, 'a'], [/̞/g, ''], [/ʍ/g, 'w'], [/ᵿ/g, 'ʊ'], [/ᵻ/g, 'ɪ'], [/ʔ/g, 't'], [/ʈ/g, 't'],
  [/ɒ̃/g, 'ɒn'], [/ɔ̃/g, 'ɒn'], [/ɑ̃/g, 'ɒn'], [/̃/g, ''], [/oɪ/g, 'ɔɪ'], [/ɛ/g, 'e'], [/g/g, 'ɡ']];
// Kiểu ô giọng Anh của kho (pilot 20261028: brad /brad/, armchair /ˈɑː(r)mtʃeə(r)/, ointment /ˈɔɪntm(ə)nt/):
// a đơn (TRAP kiểu Cruttenden) → æ; (ə) tuỳ chọn → ə; (r) giữa từ → bỏ. (r) cuối từ kiểu Oxford giữ nguyên.
export function ukStyle(s) {
  return String(s || '').replace(/a(?![ɪʊː])/g, 'æ').replace(/\(ə\)/g, 'ə').replace(/\(r\)(?=[^\s\/,…‿-])/g, '');
}
export const ukStyleBad = s => /a(?![ɪʊː])|\((?!r\)(?:[\s\/,…‿-]|$))|əː/.test(String(s || '')); // əː = ký hiệu cũ của Wiktionary (pilot 20261028@13:31Z: vinegar /ˈvɪnəɡəː/), kho dùng ɜː/ə
export function fixBroken(s) { let o = s; for (const [a, b] of BROKEN) o = o.replace(a, b); return o; }

// r kiểu Mỹ (r cuối âm tiết, không đứng trước nguyên âm) trong ô giọng Anh → RP không-r
export function fixUKr(s) {
  const ch = [...s]; let out = '';
  for (let i = 0; i < ch.length; i++) {
    if (ch[i] !== 'r' || ch[i - 1] === '(') { out += ch[i]; continue; }
    let j = i + 1; while (ch[j] === 'ˈ' || ch[j] === 'ˌ' || ch[j] === ' ') j++;
    const prevV = V.includes(ch[i - 1]) || ch[i - 1] === 'ː';
    if (!prevV || (ch[j] && V.includes(ch[j]))) { out += ch[i]; continue; }
    // r cuối âm tiết: đổi nguyên âm đứng trước
    const m = /(ɑː|ɑ|ɔː|ɔ|oʊ|o|ɜː|ɜ|ʌ|ə|ɪə|iː|ɪ|i|eə|e|ʊə|uː|ʊ|u|aɪə|aʊə|aɪ|aʊ|ː)$/.exec(out);
    const v = m ? m[1] : '';
    const rep = { 'ɑː': 'ɑː', 'ɑ': 'ɑː', 'ɔː': 'ɔː', 'ɔ': 'ɔː', 'oʊ': 'ɔː', 'o': 'ɔː', 'ɜː': 'ɜː', 'ɜ': 'ɜː', 'ʌ': 'ɜː', 'ə': 'ə', 'ɪə': 'ɪə', 'iː': 'ɪə', 'ɪ': 'ɪə', 'i': 'ɪə',
      'eə': 'eə', 'e': 'eə', 'ʊə': 'ʊə', 'uː': 'ʊə', 'ʊ': 'ʊə', 'u': 'ʊə', 'aɪə': 'aɪə', 'aʊə': 'aʊə', 'aɪ': 'aɪə', 'aʊ': 'aʊə', 'ː': 'ː' }[v];
    if (rep == null) { out += ch[i]; continue; }
    out = out.slice(0, out.length - v.length) + rep;
  }
  return out;
}
export const hasUKr = s => fixUKr(s) !== s;

// Đếm âm tiết (bảo thủ: nghi ngờ → tính nhiều hơn để KHÔNG xoá nhầm ˈ)
const DIPH = ['eɪ', 'aɪ', 'ɔɪ', 'əʊ', 'aʊ', 'oʊ', 'ɪə', 'eə', 'ʊə'];
export function syllables(word) {
  const s = word.replace(/[ˈˌ/ː()]/g, '');
  let n = 0;
  for (const run of s.match(new RegExp(`[${V}]+`, 'g')) || []) {
    let i = 0; while (i < run.length) { if (DIPH.includes(run.slice(i, i + 2))) i += 2; else i += 1; n++; }
  }
  // phụ âm thành âm tiết: ˈbɒtl, ˈlɪsn, ˈrɪðəm…
  n += (s.match(new RegExp(`[${CONS}][lnm](?![${V}])`, 'g')) || []).filter(x => !/^l[mn]$/.test(x)).length;
  if (/\(ə\)/.test(word)) n++;
  return n;
}
// ˈ thừa ở từ 1 âm tiết (Oxford không ghi trọng âm cho từ 1 âm tiết). Chỉ áp cho mục 1 từ.
export function stripMonoStress(s) {
  const inner = s.replace(/^\/|\/$/g, '');
  if (/[\s…,-]/.test(inner) || !/[ˈˌ]/.test(inner)) return s;
  return syllables(inner) === 1 ? s.replace(/[ˈˌ]/g, '') : s;
}

// ---- CMUdict → IPA Mỹ (kiểu Oxford: ɑː ɔː iː uː oʊ ɜːr ər, t không đổi thành flap)
const ARPA = { AA: 'ɑː', AE: 'æ', AH: 'ʌ', AO: 'ɔː', AW: 'aʊ', AY: 'aɪ', EH: 'e', ER: 'ɜːr', EY: 'eɪ', IH: 'ɪ', IY: 'iː', OW: 'oʊ', OY: 'ɔɪ', UH: 'ʊ', UW: 'uː',
  B: 'b', CH: 'tʃ', D: 'd', DH: 'ð', F: 'f', G: 'ɡ', HH: 'h', JH: 'dʒ', K: 'k', L: 'l', M: 'm', N: 'n', NG: 'ŋ', P: 'p', R: 'r', S: 's', SH: 'ʃ', T: 't', TH: 'θ', V: 'v', W: 'w', Y: 'j', Z: 'z', ZH: 'ʒ' };
const UNSTR = { AH: 'ə', ER: 'ər', IY: 'i', UW: 'u' };
const ONSETS = new Set(['pl', 'bl', 'kl', 'ɡl', 'fl', 'sl', 'pr', 'br', 'tr', 'dr', 'kr', 'ɡr', 'fr', 'θr', 'ʃr', 'tw', 'dw', 'kw', 'ɡw', 'sw', 'θw',
  'pj', 'bj', 'kj', 'ɡj', 'mj', 'fj', 'vj', 'hj', 'sp', 'st', 'sk', 'sm', 'sn', 'sf', 'spl', 'spr', 'str', 'skr', 'skw', 'spj', 'skj']);
const isVowel = p => /\d$/.test(p);
// si = vị trí âm tiết trọng âm chính theo ô giọng Anh (nếu có): CMU hay ghi HAI trọng âm chính cho từ ghép (halfway HH AE1 F W EY1,
// somewhat S AH1 M W AH1 T) → chỉ giữ 1 ˈ (trùng si, không có thì cái cuối), các ˈ khác hạ thành ˌ (kiểm định nội dung 25/10/2026)
export function arpaToIpa(phones, si) {
  let ph = phones.trim().split(/\s+/);
  { const pv = ph.map((p, i) => [p, i]).filter(([p]) => /\d$/.test(p)); const prim = pv.map(([p, i], n) => (p.endsWith('1') ? n : -1)).filter(n => n >= 0);
    if (prim.length > 1) { const keep = prim.includes(si) ? si : prim[prim.length - 1]; ph = ph.slice(); for (const n of prim) if (n !== keep) ph[pv[n][1]] = pv[n][0].replace(/1$/, '2'); } }
  const nV = ph.filter(isVowel).length;
  const seg = ph.map(p => {
    const m = /^([A-Z]+)(\d)?$/.exec(p); if (!m) return { s: '' };
    if (m[2] == null) return { s: ARPA[m[1]] || '', c: true };
    return { s: m[2] === '0' ? (UNSTR[m[1]] || ARPA[m[1]]) : ARPA[m[1]], v: true, st: +m[2], a: m[1] };
  });
  // Trọng âm phụ kiểu Oxford: chỉ giữ ˌ đứng trước ˈ cách ≥ 1 âm tiết (ˌkɑːmbɪˈneɪʃn); ˌ sau ˈ hoặc sát ˈ → bỏ (ˈæktʃuəli, ɪnˈkɔːrpəreɪt)
  const vi = seg.map((x, i) => (x.v ? i : -1)).filter(i => i >= 0);
  const pi = vi.findIndex(i => seg[i].st === 1);
  vi.forEach((i, n) => { const x = seg[i]; if (x.st === 2 && (pi < 0 || n > pi - 2)) { x.st = 0; if (x.a === 'IY') x.s = 'i'; } });
  // EH0 đầu từ (enable, essential, erroneous) là nguyên âm yếu /ɪ/ như Oxford, không phải /e/
  if (seg[0] && seg[0].a === 'EH' && seg[0].st === 0) seg[0].s = 'ɪ';
  // IY0 ở âm tiết đầu tiền tố re-/de-/be-/pre- trước phụ âm (report, prepare, review) là /ɪ/ như Oxford, không phải /i/ (rà soát từ vựng lượt 1, 26/10/2026)
  { const f = seg.findIndex(x => x.v); if (f > 0 && f <= 2 && seg[f].a === 'IY' && seg[f].st === 0 && seg[f + 1] && seg[f + 1].c && seg.slice(0, f).every(x => x.c)) seg[f].s = 'ɪ'; }
  const marks = new Array(seg.length).fill('');
  if (nV > 1) {
    let prevV = -1;
    seg.forEach((x, i) => {
      if (!x.v) return;
      if (x.st === 1 || x.st === 2) {
        const cl = seg.slice(prevV + 1, i).map(y => y.s);
        let k = cl.length; // số phụ âm làm âm đầu
        if (prevV >= 0) { k = 0; for (let n = Math.min(3, cl.length); n >= 1; n--) { const on = cl.slice(cl.length - n); if (n === 1 ? on[0] !== 'ŋ' : ONSETS.has(on.join(''))) { k = n; break; } } }
        marks[i - k] = x.st === 1 ? 'ˈ' : 'ˌ';
      }
      prevV = i;
    });
  }
  // u ngắn chỉ khi đứng trước nguyên âm (ˈæktʃuəli); còn lại uː (ˈvæljuː, ˈkloʊkruːm)
  seg.forEach((x, i) => { if (x.a === 'UW' && x.st === 0) x.s = seg[i + 1] && seg[i + 1].v ? 'u' : 'uː'; });
  let out = seg.map((x, i) => marks[i] + x.s).join('');
  // ER không nhấn đứng NGAY trước nguyên âm nhấn: /r/ là phụ âm đầu của âm tiết nhấn (soát pilot 29/10: liberation /ˌlɪbəˈreɪʃn/, arithmetic /əˈrɪθmətɪk/,
  // không phải /ˌlɪbɜːrˈeɪʃn/, /ərˈɪθmətɪk/)
  out = out.replace(/(ɜː|ə)r([ˈˌ])(?=[aeiouæɑɒɔəɛɪʊʌɜ])/g, 'ə$2r');
  // phụ âm thành âm tiết cuối từ: ˈbɑːtl, ˈlɪsn
  out = out.replace(new RegExp(`([${CONS}])əl$`), '$1l').replace(/([tdszʃʒ])ən$/, '$1n');
  return out;
}

// Vị trí âm tiết mang trọng âm chính (để chọn biến thể CMU đúng từ loại: record n ˈrek… / v rɪˈkɔːd)
export function stressIndex(ipa) {
  const s = ipa.replace(/[/()]/g, ''); const i = s.indexOf('ˈ'); if (i < 0) return 0;
  return syllables(s.slice(0, i).replace(/ˌ/g, '') || '') || 0;
}
export const arpaStressIndex = phones => { const v = phones.trim().split(/\s+/).filter(isVowel); const i = v.findIndex(p => p.endsWith('1')); return i < 0 ? 0 : i; };
export const arpaHasStressAt = (phones, si) => phones.trim().split(/\s+/).filter(isVowel).some((p, n) => n === si && p.endsWith('1'));

// Biến thể chính tả Anh → Mỹ để tra CMUdict (analyse → analyze, colour → color…)
export function usSpellings(w) {
  const c = [w];
  const R = [[/our$/, 'or'], [/our(s|ed|ing|ful|ite)$/, 'or$1'], [/yse$/, 'yze'], [/ys(ed|ing|es)$/, 'yz$1'], [/is(e|ed|es|ing|ation|ations|er)$/, 'iz$1'], [/tre$/, 'ter'], [/tres$/, 'ters'],
    [/ogue$/, 'og'], [/ence$/, 'ense'], [/lled$/, 'led'], [/lling$/, 'ling'], [/ller$/, 'ler'], [/mme$/, 'm'], [/ae/, 'e'], [/oe/, 'e'], [/^grey/, 'gray'], [/ium$/, 'um'], [/eable$/, 'able'], [/ement$/, 'ment'], [/ce$/, 'se']];
  for (const [a, b] of R) if (a.test(w)) c.push(w.replace(a, b));
  return c;
}

// ---- Chuẩn hoá ô giọng Anh theo lối từ điển (Oxford/Cambridge) – kiểm định nội dung 25/10/2026, lớp lỗi "IPA kiểu Wiktionary":
// t chen (sɪnts → sɪns), p chen (ˈkʌmpftəbl), k chen (streŋkθ), hw cổ (ˈhwɪspə), ŋ đồng hoá ở tiền tố (ɪŋˈkredɪbl), ký hiệu 'a'/'ʌɪ' kiểu mới
// lẫn với hệ æ/aɪ của cả kho, và dạng MẠNH của hư từ giữa cụm (/eɪ stəʊnz θrəʊ/ → /ə …/). word = mục từ (để biết chính tả).
const WEAKUK = { a: [/^eɪ$/, 'ə'], an: [/^æn$/, 'ən'], and: [/^ænd$/, 'ənd'], of: [/^ɒv$/, 'əv'], to: [/^tuː$/, 'tə'], from: [/^frɒm$/, 'frəm'], for: [/^fɔː$/, 'fə'], at: [/^æt$/, 'ət'], the: [/^ðiː$/, 'ðə'] };
export function normUK(s, word = '') {
  if (!s) return s;
  const w = String(word).toLowerCase();
  let o = s.replace(/\(r\)/g, '').replace(/\(h\)w/g, 'w').replace(/hw/g, 'w').replace(/ʌɪ/g, 'aɪ').replace(/a(?![ɪʊː])/g, 'æ')
    .replace(/n\(t\)([sʃ])/g, 'n$1');
  if (!/nts|ntz/.test(w)) o = o.replace(/nts/g, 'ns');
  if (!/mpf|mph/.test(w)) o = o.replace(/mpf/g, 'mf');
  if (/ngth/.test(w)) o = o.replace(/ŋkθ/g, 'ŋθ');
  // ink/inkjet: ŋ thuộc gốc từ, không phải tiền tố in- (ipa-audit 28/10)
  if (/^(in|en|con|syn)[cgkq]/.test(w) && !/^ink/.test(w)) o = o.replace(/^(\/?[ˈˌ]?(?:ɪ|e|ə|kə|kɒ|sɪ))ŋ([ˈˌ]?[kɡ])/, '$1n$2');
  // hư từ dạng mạnh giữa cụm (chỉ khi số tiếng = số khúc IPA, khúc đó không mang trọng âm)
  const ts = w.split(/\s+/).filter(Boolean), inner = o.replace(/^\/|\/$/g, ''), ch = inner.split(/\s+/);
  if (ts.length > 1 && ts.length === ch.length) {
    const out = ch.map((c, i) => { const r = WEAKUK[ts[i]]; return r && r[0].test(c) ? r[1] : c; });
    if (out.join(' ') !== ch.join(' ')) o = (o.startsWith('/') ? '/' : '') + out.join(' ') + (o.endsWith('/') ? '/' : '');
  }
  return o;
}

// IPA Mỹ suy từ IPA Anh khi CMUdict không có từ (ecotourism, postcode, flatmate…) – quy tắc RP → GA, tất định:
// əʊ→oʊ, ɒ→ɑː, BATH ɑː→æ (chính tả a không kèm r/l/h), r sau nguyên âm theo số "r cuối âm tiết" trong chính tả (ɜː ɪə eə ʊə ưu tiên, rồi ɑː ɔː ə),
// ɪə→ɪr, eə→er, ʊə→ʊr, ɜː→ɜːr, ə+r→ər. Chỉ là dự phòng (ipa-audit đếm "usRule"); có CMU luôn dùng CMU.
export function ukToUs(uk, word = '') {
  const w = String(word).toLowerCase(); if (!uk) return '';
  let budget = (w.match(/[aeiouy]r+(?:e(?=[^aeiouy]|$)|(?=[^aeiouyr]|s?$))/g) || []).length + (/[^aeiou]re$/.test(w) ? 1 : 0);
  const hasAr = /ar(?![aeiouy])|are/.test(w); // ɑː có r (car, garden) hay BATH (dance)
  const s = uk.replace(/^\/|\/$/g, '').replace(/əʊ/g, 'oʊ');
  const out = [];
  for (let i = 0; i < s.length;) {
    const u = ['aɪə', 'aʊə', 'ɪə', 'eə', 'ʊə', 'ɜː', 'ɑː', 'ɔː'].find(x => s.startsWith(x, i));
    if (u) {
      const strongR = ['ɪə', 'eə', 'ʊə', 'ɜː', 'aɪə', 'aʊə'].includes(u);
      const rNext = s[i + u.length] === 'r'; // r nối đã có (ˈjʊərəp, sɪˈkjʊərɪti) → không thêm, không đổi thành ɪə/uːə
      const takeR = !rNext && budget > 0 && (strongR || (u === 'ɑː' && hasAr) || u === 'ɔː') && !/^[aeiouɑɒɔəɜɪʊʌæ]/.test(s.slice(i + u.length));
      if (takeR) budget--;
      const base = takeR || rNext || !['ɪə', 'eə', 'ʊə'].includes(u) ? null : { 'ɪə': 'iːə', 'eə': 'eɪə', 'ʊə': 'uːə' }[u]; // không r (idea aɪˈdiːə)
      const base2 = base || { 'ɪə': 'ɪ', 'eə': 'e', 'ʊə': 'ʊ', 'ɜː': 'ɜː', 'ɑː': u === 'ɑː' && !takeR && !/al|ah|alm|ath|father/.test(w) && !hasAr ? 'æ' : 'ɑː', 'ɔː': 'ɔː', 'aɪə': 'aɪə', 'aʊə': 'aʊə' }[u];
      out.push(base2 + (takeR ? 'r' : ''));
      i += u.length; continue;
    }
    if (s[i] === 'ɒ') { out.push('ɑː'); i++; continue; }
    if (s[i] === 'ə' && budget > 0 && (i === s.length - 1 || /[^aeiouɑɒɔəɜɪʊʌæːˈˌ]/.test(s[i + 1] || '') && !/^[aeiouɑɒɔəɜɪʊʌæ]/.test(s.slice(i + 1)))) {
      // ə cuối hoặc trước phụ âm: thành ər nếu chính tả còn r ở vị trí tương ứng (teacher, sugar, motor) – chỉ cho ə cuối từ/khúc để tránh ə thường
      if (i === s.length - 1 || s[i + 1] === ' ') { out.push('ər'); budget--; i++; continue; }
    }
    out.push(s[i]); i++;
  }
  return out.join('');
}
