/* Câu ngữ cảnh của thẻ (P2-1.1): trường `ctx` (≤200 ký tự) + `src` (tên miền ≤64) nằm TRONG thẻ, tức trong gói đồng bộ 1 dòng/người (không thêm dòng ghi D1).
 * Máy khách đã làm sạch lúc lưu (web/js/core.js Core.Ctx – cùng luật, có test so khớp); đây là lớp phòng thủ phía máy chủ cho máy khách bị sửa/lỗi.
 * Chi phí CPU: chỉ giải nén khi tài liệu đẩy lên có cờ `x: 1` (máy khách đặt khi có thẻ mang ctx); máy khách cũ không đặt cờ → đi thẳng như trước (CPU ≈ 0). */
export const CTX_MAX = 200, SRC_MAX = 64, DOC_RAW_MAX = 4_000_000;
const CTRL = /[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u2028-\u202e\u2066-\u2069\ufeff]/g;
const EMAIL = /[^\s@<>]+@[^\s@<>]+\.[a-z]{2,}/i;
const PHONE = /\+?\d[\d\s().-]{7,}\d/g;
const digits = s => s.replace(/\D/g, '').length;
/** Chuỗi bẩn → câu sạch, hoặc '' nếu rỗng/giống email/số điện thoại (PII → bỏ cả câu, không cắt nửa chừng). */
export function cleanCtx(s) {
  if (typeof s !== 'string') return '';
  let t = s.replace(/<[^>]*>/g, ' ').replace(/[<>]/g, ' ').replace(CTRL, ' ').replace(/\s+/g, ' ').trim();
  if (!t || EMAIL.test(t) || (t.match(PHONE) || []).some(m => digits(m) >= 9)) return '';
  if (t.length > CTX_MAX) { t = t.slice(0, CTX_MAX); if (/[\ud800-\udbff]$/.test(t)) t = t.slice(0, -1); t = t.trim(); }
  return t;
}
/** Tên miền (không URL/đường dẫn/truy vấn) hoặc ''. Nhận cả URL đầy đủ và rút còn hostname. */
export function cleanSrc(s) {
  if (typeof s !== 'string') return '';
  let h = s.trim().toLowerCase();
  const m = /^(?:[a-z][a-z0-9+.-]*:\/\/)?(?:[^\/?#@]*@)?([^\/?#:]+)(?=$|[\/?#]|:\d)/.exec(h);
  h = m ? m[1].replace(/^www\./, '').replace(/\.$/, '') : '';
  return h.length <= SRC_MAX && /^[a-z0-9-]+(\.[a-z0-9-]+)*$/.test(h) && !/^\d+(\.\d+){3}$/.test(h) ? h : '';
}
/** Làm sạch tại chỗ ctx/src của mọi thẻ trong 1 nhóm; trả số thẻ bị đổi. */
export function cleanCards(map) {
  let n = 0;
  if (!map || typeof map !== 'object') return 0;
  for (const c of Object.values(map)) {
    if (!c || typeof c !== 'object') continue;
    if (c.ctx === undefined && c.src === undefined) continue;
    const ctx = cleanCtx(c.ctx), src = ctx ? cleanSrc(c.src) : '';
    if (ctx !== c.ctx || (src || undefined) !== (c.src || undefined)) {
      n++;
      if (ctx) c.ctx = ctx; else delete c.ctx;
      if (src) c.src = src; else delete c.src;
    }
  }
  return n;
}
const b2u = b64 => Uint8Array.from(atob(b64), c => c.charCodeAt(0));
async function pipe(bytes, stream, cap) {
  const r = new Blob([bytes]).stream().pipeThrough(stream).getReader(), out = []; let len = 0;
  for (;;) { const { done, value } = await r.read(); if (done) break; len += value.length; if (cap && len > cap) throw new Error('too-big'); out.push(value); }
  const all = new Uint8Array(len); let o = 0; for (const p of out) { all.set(p, o); o += p.length; }
  return all;
}
/** Thân tài liệu thẻ `{z: base64 gzip}` | `{json}` → làm sạch ctx/src → thân mới (hoặc nguyên bản nếu không đổi). Lỗi định dạng → ném. */
export async function cleanDocBody(body) {
  const d = JSON.parse(body);
  let json;
  if (d && typeof d.z === 'string') json = new TextDecoder().decode(await pipe(b2u(d.z), new DecompressionStream('gzip'), DOC_RAW_MAX));
  else if (d && typeof d.json === 'string') json = d.json;
  else throw new Error('shape');
  const map = JSON.parse(json);
  if (!cleanCards(map)) return body;
  const out = JSON.stringify(map);
  if (d.z === undefined) return JSON.stringify({ json: out });
  const z = await pipe(new TextEncoder().encode(out), new CompressionStream('gzip'));
  let bin = ''; for (let i = 0; i < z.length; i += 0x8000) bin += String.fromCharCode.apply(null, z.subarray(i, i + 0x8000));
  return JSON.stringify({ z: btoa(bin) });
}
