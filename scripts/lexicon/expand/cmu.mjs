// CMUdict (BSD-2): MỌI biến thể phát âm của 1 từ + chọn biến thể THEO TỪ LOẠI (pilot 7: reuse#v nhận /riˈjuːs/ của danh từ).
// Cặp đổi trọng âm/hữu thanh danh–động (record, present, reuse, estimate…): động từ → trọng âm muộn hơn, -s/-se hữu thanh /z/, -ate đầy đủ /eɪt/;
// danh/tính từ → trọng âm sớm hơn, /s/, -ate rút gọn /ət/. Từ không có biến thể khác nhau ở các điểm này → giữ biến thể 1 (thứ tự CMUdict).
export function parseCmu(text) {
  const M = new Map();
  for (const l of text.split('\n')) { const i = l.indexOf(' '); if (i < 0 || l[0] === ';') continue; const w = l.slice(0, i).replace(/\(\d+\)$/, ''), p = l.slice(i + 1).replace(/\s*#.*$/, '').trim(); if (!p) continue; (M.get(w) || M.set(w, []).get(w)).push(p); }
  return M;
}
const vowels = p => p.split(' ').filter(x => /\d$/.test(x));
const stressIdx = p => { const v = vowels(p), i = v.findIndex(x => x.endsWith('1')); return i < 0 ? 0 : i; };
const finalZ = p => /\bZ$/.test(p.trim()) ? 1 : 0;
const lastFull = p => { const v = vowels(p); return v.length > 1 && /^EY/.test(v[v.length - 1]) ? 1 : 0; }; // -ate: EY2 (động từ) vs AH0/IH0
/** biến thể có khác nhau ở trọng âm / s–z cuối / -ate? (dùng cho cổng IPA Anh theo từ loại) */
export const heteronym = vs => vs.length > 1 && ['s', 'z', 'a'].some((_, k) => new Set(vs.map(p => [stressIdx, finalZ, lastFull][k](p))).size > 1);
export function pickPron(vs, pos) {
  if (!vs || !vs.length) return '';
  if (vs.length === 1 || !heteronym(vs) || !['n', 'v', 'adj'].includes(pos)) return vs[0];
  const sg = pos === 'v' ? 1 : -1, key = p => [sg * stressIdx(p), sg * finalZ(p), sg * lastFull(p)];
  return vs.map((p, i) => ({ p, i, k: key(p) })).sort((a, b) => { for (let j = 0; j < 3; j++) if (a.k[j] !== b.k[j]) return b.k[j] - a.k[j]; return a.i - b.i; })[0].p;
}
// IPA (Anh/Mỹ, Wiktionary/espeak) có khớp biến thể CMUdict đã chọn ở các điểm phân biệt danh–động không?
const ipaStress = ipa => { const s = String(ipa).replace(/[/\[\]]/g, ''), i = s.indexOf('ˈ'); return i < 0 ? 0 : (s.slice(0, i).match(/[aeiouæɑɒɔəɛɜɪʊʌɐɚɝ]+/g) || []).length; };
export function ipaAgrees(ipa, vs, chosen) {
  if (!ipa || !heteronym(vs)) return !!ipa;
  const s = String(ipa).replace(/[/\[\]\s]/g, '');
  if (new Set(vs.map(stressIdx)).size > 1 && ipaStress(s) !== stressIdx(chosen)) return false;
  if (new Set(vs.map(finalZ)).size > 1 && (/z$/.test(s) ? 1 : 0) !== finalZ(chosen)) return false;
  if (new Set(vs.map(lastFull)).size > 1 && (/eɪt$/.test(s) ? 1 : 0) !== lastFull(chosen)) return false;
  return true;
}
