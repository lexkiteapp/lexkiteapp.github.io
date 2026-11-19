/* Proxy Gemini nội bộ: Google chặn Gemini API ở một số vùng (vd. Hồng Kông) nơi Cloudflare có thể xử lý yêu cầu
 * → Worker này được ghim chạy tại Mỹ (placement) và chỉ nhận lệnh qua service binding GEM từ Pages Functions (không có URL công khai).
 * Body: { path: "models/gemini-2.5-flash:generateContent", method?, key, body? } → trả nguyên phản hồi của Google. */
export default {
  async fetch(req) {
    if (req.method !== 'POST') return new Response('no', { status: 405 });
    const { path, method = 'POST', key, body } = await req.json();
    if (!/^models\/[\w.-]+(:\w+)?(\?[\w=&-]*)?$/.test(String(path || '')) || !key) return new Response('{"error":"bad"}', { status: 400 });
    const r = await fetch('https://generativelanguage.googleapis.com/v1beta/' + path, { method, headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key }, body: method === 'GET' ? undefined : JSON.stringify(body || {}) });
    return new Response(await r.text(), { status: r.status, headers: { 'Content-Type': 'application/json' } });
  },
};
