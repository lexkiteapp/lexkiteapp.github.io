/* Lọc lời tục tĩu / quấy rối / đe dọa – 15 ngôn ngữ, dùng chung cho báo cáo sự cố, liên hệ, tên hiển thị.
 * Nguyên tắc: người dùng bực vì lỗi hay buột miệng chửi 1 từ ("app đéo chạy") → VẪN là báo lỗi thật, chỉ che từ khi hiển thị/gửi thư.
 * Chỉ ẩn (spam) khi: đe dọa / thù ghét, hoặc ≥ 2 từ tục khác nhau (chửi bới chứ không mô tả lỗi).
 * abuse(text) → { score, hits, threat }  ·  mask(text) → che từ tục bằng •••  ·  isAbusive(text) → nên ẩn? */

// Gốc từ (so khớp sau khi chuẩn hóa: chữ thường, NFKC, bỏ ký tự chèn giữa "f.u.c.k", leet 0→o 1→i 3→e 4→a @→a $→s)
const WORDS = [
  // vi (có dấu + teencode rõ nghĩa; không dùng bản bỏ dấu dễ trùng từ thường như "deo"=đeo)
  'địt', 'đụ', 'đéo', 'lồn', 'cặc', 'buồi', 'đĩ', 'đmm', 'đm', 'dmm', 'đcm', 'dcm', 'vcl', 'vkl', 'clgt', 'mẹ mày', 'má mày', 'thằng chó', 'con chó', 'óc chó', 'ngu như chó', 'ngu như bò', 'súc vật', 'mất dạy', 'khốn nạn', 'đồ ngu', 'đồ điên', 'cút đi',
  // en
  'fuck', 'fucking', 'motherfucker', 'shit', 'bitch', 'asshole', 'cunt', 'dickhead', 'bastard', 'retard', 'whore', 'slut', 'stupid devs', 'idiot devs',
  // es / pt
  'puta', 'mierda', 'pendejo', 'gilipollas', 'cabrón', 'cabron', 'hijo de puta', 'coño', 'porra', 'caralho', 'filho da puta', 'merda', 'vai se foder', 'otário',
  // fr / de
  'putain', 'connard', 'connasse', 'salope', 'enculé', 'nique ta', 'ta gueule', 'scheiße', 'scheisse', 'arschloch', 'fotze', 'wichser', 'hurensohn', 'fick dich',
  // id / tr
  'anjing', 'bangsat', 'kontol', 'memek', 'goblok', 'bajingan', 'ngentot', 'amk', 'siktir', 'orospu', 'piç', 'yarrak', 'amına',
  // ru
  'сука', 'блядь', 'бля', 'хуй', 'хуё', 'пизд', 'ебат', 'ёбан', 'мудак', 'долбоёб', 'пидор',
  // ar / hi
  'كس امك', 'شرموط', 'منيوك', 'يلعن', 'ابن الكلب', 'خرا', 'madarchod', 'bhenchod', 'behenchod', 'chutiya', 'bhosdi', 'मादरचोद', 'भेनचोद', 'चूतिया', 'भोसड़ी', 'हरामी',
  // zh / ja / ko / th
  '操你', '肏', '傻逼', '傻b', '他妈的', '草泥马', '贱人', '死ね', 'くたばれ', 'くそ野郎', 'クソ野郎', 'ちんこ', 'まんこ', '씨발', '시발', '병신', '개새끼', '좆', '썅', 'เหี้ย', 'ควย', 'สัส', 'เย็ด', 'อีดอก',
];
// Đe dọa / kêu gọi tự hại / thù ghét → ẩn ngay
const THREATS = [
  /\b(i\s*(will|'ll|am going to|gonna)\s*(kill|hurt|find)\s*(you|u)\b)/i, /\bkill\s*(yo)?urself\b/i, /\bkys\b/i, /\bgo\s+die\b/i, /\bbomb\b.*\b(office|you|team)\b/i,
  /(giết|chém|đâm)\s+(mày|chết\s+mày|cả\s+nhà)/i, /(mày|chúng\s*mày)\s+(chết\s+đi|đi\s+chết)/i, /tự\s+tử\s+đi/i,
  /te\s+voy\s+a\s+matar/i, /vou\s+te\s+matar/i, /je\s+vais\s+te\s+tuer/i, /ich\s+(werde|bring)\s+dich\s+(um|töten)/i, /seni\s+öldür/i, /aku\s+bunuh\s+kamu/i,
  /убью\s+тебя/i, /сдохни/i, /سأقتلك/, /मार\s+डालूँगा/, /杀了你/, /去死/, /殺す/, /죽여\s*버/, /죽어라/, /ฆ่ามึง/,
];
const LEET = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '@': 'a', '$': 's', '5': 's', '7': 't' };
const norm = s => String(s || '').normalize('NFKC').toLowerCase()
  .replace(/(?<=\p{L})[.*_\-·•]+(?=\p{L})/gu, '')         // f.u.c.k / f*ck nửa chừng
  .replace(/[0134@$57]/g, c => LEET[c]);
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// Chữ Latin/Cyrillic/Thai… cần ranh giới từ (tránh "class" chứa "ass"); CJK/Hangul/Kana không có khoảng trắng → khớp chuỗi con
const CJK = /[぀-ヿ㐀-鿿가-힯]/;
const RX = WORDS.map(w => ({ w, re: CJK.test(w) || /[؀-ۿऀ-ॿ฀-๿]/.test(w) ? new RegExp(esc(w), 'u') : new RegExp(`(?<![\\p{L}\\p{M}])${esc(w)}(?![\\p{L}\\p{M}])`, 'u') }));
// Gốc tiếng Nga/Ấn hay biến tố → cho khớp đầu từ
for (const r of RX) if (/^(хуй|хуё|пизд|ебат|ёбан|бля)$/.test(r.w)) r.re = new RegExp(`(?<![\\p{L}])${esc(r.w)}`, 'u');

export function abuse(text) {
  const t = norm(text);
  const hits = [...new Set(RX.filter(r => r.re.test(t)).map(r => r.w))];
  const threat = THREATS.some(re => re.test(t) || re.test(String(text || '')));
  return { score: hits.length + (threat ? 3 : 0), hits, threat };
}
export const isAbusive = text => { const a = abuse(text); return a.threat || a.hits.length >= 2; };
// Che từ tục để hiển thị/gửi thư (giữ chữ cái đầu cho người quản trị hiểu ngữ cảnh)
export function mask(text) {
  let s = String(text || '');
  for (const r of RX) {
    const g = new RegExp(r.re.source, 'giu');
    s = s.replace(g, m => m[0] + '•'.repeat(Math.max(2, [...m].length - 1)));
  }
  return s;
}

// ── Link lạ / link độc: rút gọn, IP trần, punycode giả mạo, file chạy/nén, đuôi tên miền hay bị lạm dụng, có user@ trong URL, javascript:/data:
const SHORT = /^(bit\.ly|tinyurl\.com|t\.co|goo\.gl|is\.gd|cutt\.ly|rb\.gy|shorturl\.at|tiny\.cc|ow\.ly|buff\.ly|s\.id|v\.gd|t\.ly|rebrand\.ly|shorte\.st|adf\.ly|linktr\.ee|bom\.so|tiny\.one)$/i;
const BAD_TLD = /\.(zip|mov|xyz|top|click|tk|ml|ga|cf|gq|buzz|work|rest|country|kim|loan|men|cam|icu|monster)$/i;
const BAD_EXT = /\.(exe|apk|msi|scr|bat|cmd|com|vbs|jar|dmg|pkg|ps1|sh|zip|rar|7z|iso|hta|lnk)(\?|#|$)/i;
const SAFE_HOST = /(^|\.)(lexkite\.com|lexkiteapp\.github\.io|google\.com|youtube\.com|youtu\.be|apple\.com|github\.com|wikipedia\.org|cambridge\.org|oxfordlearnersdictionaries\.com|merriam-webster\.com|ielts\.org|ets\.org)$/i;
export function links(text) {
  const s = String(text || ''), out = [];
  for (const m of s.matchAll(/\b((?:https?|hxxps?|ftp):\/\/[^\s<>"']+|(?:javascript|data|vbscript):[^\s<>"']+|www\.[^\s<>"']+|(?:[a-z0-9-]+\.)+(?:com|net|org|io|ly|gl|gd|at|cc|co|xyz|top|click|tk|ml|ga|cf|gq|ru|cn|me|info|biz|site|online|link|zip|mov|vn|id|in|br)\/[^\s<>"']*)/gi)) {
    const raw = m[1]; let host = '', why = [];
    if (/^(javascript|data|vbscript):/i.test(raw)) why.push('script');
    else {
      try { const u = new URL(/^[a-z]+:\/\//i.test(raw) ? raw.replace(/^hxxp/i, 'http') : 'http://' + raw); host = u.hostname.toLowerCase();
        if (u.username || u.password) why.push('userinfo');
        if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.includes(':')) why.push('ip');
        if (host.split('.').some(p => p.startsWith('xn--'))) why.push('punycode');
        if (SHORT.test(host)) why.push('shortener');
        if (BAD_TLD.test(host)) why.push('tld');
        if (BAD_EXT.test(u.pathname)) why.push('file');
      } catch { why.push('malformed'); }
    }
    out.push({ url: raw.slice(0, 300), host, safe: !why.length && SAFE_HOST.test(host), risk: why });
  }
  return out;
}
export const riskyLinks = text => links(text).filter(l => l.risk.length);
// "Vô hiệu" link khi hiển thị/gửi thư/đưa lên GitHub: không bấm được, không tự thành link (trừ tên miền an toàn)
export const defang = text => String(text || '').replace(/\b(?:https?|ftp):\/\/[^\s<>"']+|\bwww\.[^\s<>"']+/gi, u => { try { const h = new URL(/^www\./i.test(u) ? 'http://' + u : u).hostname; if (SAFE_HOST.test(h)) return u; } catch {} return u.replace(/^http/i, 'hxxp').replace(/^ftp/i, 'fxp').replace(/\./g, '[.]'); });
// Tổng hợp cho 1 tin nhắn người dùng: ẩn (spam) khi chửi bới/đe dọa hoặc có link độc; trả lý do để ghi sự kiện
export function moderate(text) {
  const a = abuse(text), bad = riskyLinks(text);
  const why = [...(a.threat ? ['threat'] : []), ...(a.hits.length >= 2 ? ['abuse'] : []), ...(bad.length ? ['link:' + [...new Set(bad.flatMap(b => b.risk))].join('+')] : [])];
  return { hide: why.length > 0, why, abuse: a, links: bad };
}
// Tên công khai (biệt danh…): khắt khe hơn – khớp cả chuỗi con với từ ≥ 4 ký tự ("fuckboy", "xxsucaxx")
export const profaneName = s => { const t = norm(s).replace(/[\s._-]+/g, ''); const a = abuse(s); return a.hits.length > 0 || a.threat || WORDS.some(w => [...w].length >= 4 && t.includes(w.replace(/\s+/g, ''))); };
