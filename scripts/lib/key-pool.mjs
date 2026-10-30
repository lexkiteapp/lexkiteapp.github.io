// Kho khoá API miễn phí nhiều tài khoản (secret GEMINI_POOL, GROQ_POOL – chủ nạp 30/10; mỗi dòng một khoá) – ai-pool tuyến 'gem' và 'groq'.
// Xoay vòng từng lần gọi; 429 theo phút → khoá đó nghỉ Retry-After; hết hạn mức NGÀY → nghỉ tới lượt đặt lại; 401/403 → bỏ 6 giờ.
// KHÔNG BAO GIỜ in khoá: nhật ký chỉ ghi nhãn k<số thứ tự>.
/** đọc kho → danh sách khoá (bỏ dòng trống/tiêu đề/khoá loại khác, bỏ trùng). kind: 'gemini' (AIza… / AQ.…) | 'groq' (gsk_…) */
export function parseKeys(raw, kind) {
  const re = kind === 'gemini' ? /^(AIza[\w-]{30,}|AQ\.[\w.-]{20,})$/ : kind === 'groq' ? /^gsk_[\w]{20,}$/ : /^\S{20,}$/;
  const seen = new Set(), out = [];
  for (const line of String(raw || '').split(/[\n,;\s]+/)) { const k = line.trim().replace(/^["']|["']$/g, ''); if (re.test(k) && !seen.has(k)) { seen.add(k); out.push(k); } }
  return out;
}
/** kho khoá xoay vòng: next() → { id, key } | null (mọi khoá đang nghỉ) · park(id, ms, why) · stats() (không chứa khoá) */
export function keyRing(keys, { now = Date.now, start = 0 } = {}) {
  const K = keys.map((key, i) => ({ id: 'k' + i, key, until: 0, why: '' })); let i = Math.floor(start * K.length) || 0;
  return {
    size: K.length,
    live: () => K.filter(k => k.until <= now()).length,
    next() { for (let n = 0; n < K.length; n++) { const k = K[i++ % K.length]; if (k.until <= now()) return k; } return null; },
    park(id, ms, why = '') { const k = K.find(x => x.id === id); if (k) { k.until = now() + ms; k.why = why; } },
    soonest: () => Math.max(5e3, Math.min(...K.map(k => k.until)) - now()),
    stats: () => ({ size: K.length, live: K.filter(k => k.until <= now()).length, parked: K.filter(k => k.until > now()).reduce((o, k) => (o[k.why || '?'] = (o[k.why || '?'] || 0) + 1, o), {}) }),
  };
}
