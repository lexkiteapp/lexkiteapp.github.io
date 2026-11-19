// Bộ mã hóa và giải mã thủy ấn tàng hình (Zero-width watermark) cho Lexkite.
// Nhị phân: U+200B = 0, U+2063 (invisible separator) = 1; mở/đóng bằng U+2060 (word joiner) ×2.
// KHÔNG dùng ZWJ/ZWNJ (U+200D/U+200C): chúng đổi cách nối chữ Ả Rập/Hindi. Các ký tự Cf còn lại "trong suốt" khi ghép chữ.
// Hoàn toàn vô hình trên trình duyệt, không ảnh hưởng SEO, không hỏng layout.

const START = '\u2060\u2060';
const END = '\u2060\u2060';
const ZERO = '\u200B';
const ONE = '\u2063';

/**
 * Mã hóa chuỗi văn bản (ví dụ "LK:slug:20261017") thành chuỗi ký tự tàng hình.
 * @param {string} payload 
 * @returns {string}
 */
export function encodeWatermark(payload) {
  if (!payload) return '';
  const bytes = new TextEncoder().encode(String(payload));
  let bits = '';
  for (const b of bytes) {
    bits += b.toString(2).padStart(8, '0');
  }
  let zw = START;
  for (const bit of bits) {
    zw += bit === '1' ? ONE : ZERO;
  }
  zw += END;
  return zw;
}

/**
 * Tìm và giải mã chữ ký tàng hình trong đoạn văn bản bất kỳ.
 * @param {string} text 
 * @returns {string|null} payload đã giải mã, hoặc null nếu không có chữ ký
 */
export function decodeWatermark(text) {
  if (!text || typeof text !== 'string') return null;
  const startIdx = text.indexOf(START);
  if (startIdx === -1) return null;
  const endIdx = text.indexOf(END, startIdx + START.length);
  if (endIdx === -1) return null;

  const raw = text.slice(startIdx + START.length, endIdx);
  let bits = '';
  for (const ch of raw) {
    if (ch === ONE) bits += '1';
    else if (ch === ZERO) bits += '0';
  }
  if (bits.length === 0 || bits.length % 8 !== 0) return null;

  const bytes = [];
  for (let i = 0; i < bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8), 2));
  }
  try {
    return new TextDecoder().decode(new Uint8Array(bytes));
  } catch {
    return null;
  }
}

/**
 * Chèn chữ ký tàng hình vào đoạn văn đầu tiên trong HTML thân bài blog.
 * @param {string} html 
 * @param {string} payload (ví dụ "LK:slug:20261017")
 * @returns {string}
 */
export function embedWatermark(html, payload) {
  if (!html || !payload) return html;
  const wm = encodeWatermark(payload);
  // Tìm thẻ <p> đầu tiên có độ dài > 80 ký tự để chèn vào sau từ thứ 3 hoặc thứ 4
  let injected = false;
  return html.replace(/<p>([\s\S]*?)<\/p>/, (match, content) => {
    if (injected || content.length < 80 || content.startsWith('<')) return match;
    injected = true;
    // Chèn sau khoảng trắng đầu tiên sau 30 ký tự
    const spaceIdx = content.indexOf(' ', 30);
    if (spaceIdx !== -1) {
      return `<p>${content.slice(0, spaceIdx)}${wm}${content.slice(spaceIdx)}</p>`;
    }
    return `<p>${wm}${content}</p>`;
  });
}
