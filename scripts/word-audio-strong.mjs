// Từ chức năng có dạng yếu (to /tə/, for /fə/, the /ðə/…): Kokoro đọc từ đơn dễ ra dạng yếu → tạo lại bằng dạng trích dẫn (mạnh)
// từ phiên âm viết tay (Anh bf_emma | Mỹ af_heart, ký hiệu espeak như kokoro-js), khóa mới fnv(giọng|từ|s2) vì audio.lexkite.com đệm 1 năm.
// Chỉ giữ từ có trong kho từ. Danh sách S2 phải trùng chuỗi trong web/js/ui.js + extension/newtab.js (scripts/test/word-audio-s2.mjs kiểm).
export const STRONG = {
  to: ['tˈuː', 'tˈuː'], for: ['fˈɔː', 'fˈɔːɹ'], of: ['ˈɒv', 'ˈʌv'], from: ['fɹˈɒm', 'fɹˈʌm'], and: ['ˈand', 'ˈænd'], but: ['bˈʌt', 'bˈʌt'],
  at: ['ˈat', 'ˈæt'], as: ['ˈaz', 'ˈæz'], a: ['ˈeɪ', 'ˈeɪ'], the: ['ðˈiː', 'ðˈiː'], can: ['kˈan', 'kˈæn'], could: ['kˈʊd', 'kˈʊd'],
  must: ['mˈʌst', 'mˈʌst'], shall: ['ʃˈal', 'ʃˈæl'], should: ['ʃˈʊd', 'ʃˈʊd'], would: ['wˈʊd', 'wˈʊd'], will: ['wˈɪl', 'wˈɪl'], do: ['dˈuː', 'dˈuː'],
  have: ['hˈav', 'hˈæv'], be: ['bˈiː', 'bˈiː'], some: ['sˈʌm', 'sˈʌm'], than: ['ðˈan', 'ðˈæn'], that: ['ðˈat', 'ðˈæt'], there: ['ðˈeə', 'ðˈɛɹ'],
  you: ['jˈuː', 'jˈuː'], we: ['wˈiː', 'wˈiː'], she: ['ʃˈiː', 'ʃˈiː'], he: ['hˈiː', 'hˈiː'], or: ['ˈɔː', 'ˈɔːɹ'], nor: ['nˈɔː', 'nˈɔːɹ'],
  so: ['sˈəʊ', 'sˈoʊ'], just: ['dʒˈʌst', 'dʒˈʌst'], into: ['ˈɪntuː', 'ˈɪntuː'], onto: ['ˈɒntuː', 'ˈɑːntuː'], upon: ['əpˈɒn', 'əpˈɑːn'],
};
export const S2 = ' ' + Object.keys(STRONG).join(' ') + ' ';
export const fnv = s => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(36); };
// khóa file audio/w: từ dạng mạnh → |s2 (chỉ khi đã tạo xong, s2Done = web/audio/w/s2.txt; app luôn dùng |s2)
export const wordKey = (v, w, s2Done) => fnv(v + '|' + w + (STRONG[w] && (!s2Done || s2Done.has(w)) ? '|s2' : ''));
