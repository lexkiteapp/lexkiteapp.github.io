// Phiên âm từ điển (lexicon row[1] Anh, row[10] Mỹ: "/fɑːm/", "/ˈfɑːrm/") → chuỗi âm vị kiểu espeak mà kokoro-js nhận (như STRONG trong
// scripts/word-audio-strong.mjs): bỏ "/", r → ɹ, g → ɡ, dấu nhấn đặt ngay trước nguyên âm của âm tiết (espeak), từ 1 âm tiết không dấu → thêm ˈ.
// Dùng làm phương án render thêm cho từ/cụm ngắn mà Kokoro tự phiên âm sai (cổng ASR vẫn quyết định – scripts/sentence-audio/render.mjs).
const V = /^(?:aɪ|aʊ|eɪ|əʊ|oʊ|ɔɪ|ɪə|eə|ʊə|ɑː|ɔː|ɜː|iː|uː|[aeiouæɑɒɔəɜɛɪʊʌɐ])/;
export function espeakOf(ipa) {
  let s = String(ipa || '').split(/[,;]/)[0].replace(/[/[\]().‿]/g, '').replace(/\s+/g, ' ').trim().replace(/r/g, 'ɹ').replace(/g/g, 'ɡ').replace(/'/g, 'ˈ');
  if (!s || /[^a-zæɑɒɔəɜɛɪʊʌɐθðʃʒŋɹɡjwːˈˌ ʤʧ]/.test(s.replace(/[dt][ʒʃ]/g, ''))) return ''; // ký hiệu lạ → bỏ phương án này
  let out = '', pend = '';
  for (let i = 0; i < s.length;) {
    if (s[i] === 'ˈ' || s[i] === 'ˌ') { pend = s[i]; i++; continue; }
    const m = V.exec(s.slice(i));
    if (m) { out += pend + m[0]; pend = ''; i += m[0].length; } else { out += s[i]; i++; }
  }
  if (!/[ˈˌ]/.test(out)) { const m = V.exec(out.slice(out.search(/[aeiouæɑɒɔəɜɛɪʊʌɐ]/))); if (m) { const j = out.search(/[aeiouæɑɒɔəɜɛɪʊʌɐ]/); out = out.slice(0, j) + 'ˈ' + out.slice(j); } }
  return out;
}
