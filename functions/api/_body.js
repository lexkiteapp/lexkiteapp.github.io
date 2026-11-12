/* Đọc thân request có GIỚI HẠN BYTE CỨNG – dùng cho MỌI endpoint functions/api/* đọc body (không phải route).
 * Không tin Content-Length: header khai lớn hơn trần → 413 ngay; thiếu/giả/chunked → vẫn đếm từng khúc của request.body,
 * vượt trần thì hủy luồng (reader.cancel) và ném BodyError(413) – không bao giờ đệm quá max byte vào bộ nhớ.
 *   readText(request, max)  → chuỗi UTF-8                     · lỗi: BodyError { status: 413, code: 'too-large' }
 *   readJSON(request, max)  → giá trị JSON (có thể là null)    · lỗi: 413 như trên hoặc { status: 400, code: 'json' }
 * Test: scripts/test/body-limit.mjs (Content-Length giả, chunked, thiếu header, UTF-8 nhiều byte). */
export class BodyError extends Error {
  constructor(status, code) { super(code); this.status = status; this.code = code; }
}

export async function readBytes(request, max) {
  if (!Number.isFinite(max) || max <= 0) throw new Error('readBytes: max');
  const cl = request.headers.get('Content-Length');
  if (cl != null && cl !== '' && !(+cl <= max)) throw new BodyError(413, 'too-large'); // khai lớn hơn trần (hoặc không phải số) → khỏi đọc
  if (!request.body) return new Uint8Array(0);
  const reader = request.body.getReader(), parts = []; let total = 0;
  for (;;) {
    let r; try { r = await reader.read(); } catch (e) { throw new BodyError(400, 'json'); }
    if (r.done) break;
    const chunk = r.value instanceof Uint8Array ? r.value : new Uint8Array(r.value || []);
    total += chunk.byteLength;
    if (total > max) { try { await reader.cancel(); } catch (e) { /* bỏ qua */ } throw new BodyError(413, 'too-large'); }
    parts.push(chunk);
  }
  if (parts.length === 1) return parts[0];
  const out = new Uint8Array(total); let o = 0; for (const p of parts) { out.set(p, o); o += p.byteLength; }
  return out;
}

export async function readText(request, max) { return new TextDecoder().decode(await readBytes(request, max)); }

export async function readJSON(request, max) {
  const text = await readText(request, max);
  try { return JSON.parse(text); } catch (e) { throw new BodyError(400, 'json'); }
}

/** Lỗi đọc body → { status, error } để endpoint trả bằng hàm json() có CORS của nó. big = mã lỗi 413 riêng của endpoint (giữ tương thích). */
export const bodyFail = (e, big = 'too-large') => (e instanceof BodyError ? { status: e.status, error: e.status === 413 ? big : 'json' } : { status: 400, error: 'json' });
