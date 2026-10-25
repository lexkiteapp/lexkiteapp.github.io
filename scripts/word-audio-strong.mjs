// Từ chức năng có dạng yếu (to /tə/, for /fə/, the /ðə/…): Kokoro đọc từ đơn dễ ra dạng yếu → tạo lại bằng dạng trích dẫn (mạnh)
// từ phiên âm viết tay (Anh bf_emma | Mỹ af_heart, ký hiệu espeak như kokoro-js). Chỉ giữ từ có trong kho từ (scripts/test/word-audio-s2.mjs kiểm).
export const STRONG = {
  to: ['tˈuː', 'tˈuː'], for: ['fˈɔː', 'fˈɔːɹ'], of: ['ˈɒv', 'ˈʌv'], from: ['fɹˈɒm', 'fɹˈʌm'], and: ['ˈand', 'ˈænd'], but: ['bˈʌt', 'bˈʌt'],
  at: ['ˈat', 'ˈæt'], as: ['ˈaz', 'ˈæz'], a: ['ˈeɪ', 'ˈeɪ'], the: ['ðˈiː', 'ðˈiː'], can: ['kˈan', 'kˈæn'], could: ['kˈʊd', 'kˈʊd'],
  must: ['mˈʌst', 'mˈʌst'], shall: ['ʃˈal', 'ʃˈæl'], should: ['ʃˈʊd', 'ʃˈʊd'], would: ['wˈʊd', 'wˈʊd'], will: ['wˈɪl', 'wˈɪl'], do: ['dˈuː', 'dˈuː'],
  have: ['hˈav', 'hˈæv'], be: ['bˈiː', 'bˈiː'], some: ['sˈʌm', 'sˈʌm'], than: ['ðˈan', 'ðˈæn'], that: ['ðˈat', 'ðˈæt'], there: ['ðˈeə', 'ðˈɛɹ'],
  you: ['jˈuː', 'jˈuː'], we: ['wˈiː', 'wˈiː'], she: ['ʃˈiː', 'ʃˈiː'], he: ['hˈiː', 'hˈiː'], or: ['ˈɔː', 'ˈɔːɹ'], nor: ['nˈɔː', 'nˈɔːɹ'],
  so: ['sˈəʊ', 'sˈoʊ'], just: ['dʒˈʌst', 'dʒˈʌst'], into: ['ˈɪntuː', 'ˈɪntuː'], onto: ['ˈɒntuː', 'ˈɑːntuː'], upon: ['əpˈɒn', 'əpˈɑːn'],
};
export const S2 = ' ' + Object.keys(STRONG).join(' ') + ' '; // khóa cũ |s2 trong app – bỏ khi app đổi sang WAV (s3)
export const fnv = s => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(36); };
// Phiên bản khóa file audio/w: MỌI từ dùng fnv(giọng|từ|s3) (bản s3 = câu mang + cắt, qua Whisper – gen-word-audio.mjs). audio.lexkite.com đệm 1 năm
// nên đổi cách tạo phải đổi hậu tố. Chuỗi WAV phải trùng web/js/ui.js + extension/newtab.js (scripts/test/word-audio-s2.mjs kiểm).
export const WAV = '|s3';
export const wordKey = (v, w) => fnv(v + '|' + w + WAV);
