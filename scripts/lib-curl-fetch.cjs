// Thay fetch bằng curl khi chạy pipeline tại máy cá nhân (node fetch có thể bị proxy chặn): node --require scripts/lib-curl-fetch.cjs script
// Luôn gửi User-Agent định danh (Wikimedia bắt buộc theo chính sách API) + header tùy chọn; ok = HTTP 2xx thật.
const { execFileSync } = require('child_process');
const UA = 'Lexkite/1.0 (https://lexkite.com; support@lexkite.com)';
globalThis.fetch = async (url, opts = {}) => {
  try {
    const hs = Object.entries(Object.assign({ 'User-Agent': UA }, (opts && opts.headers) || {})).flatMap(([k, v]) => ['-H', `${k}: ${v}`]);
    const out = execFileSync('curl', ['-s', '--max-time', '20', '-w', '\n%{http_code}', ...hs, String(url)], { maxBuffer: 50e6 }).toString();
    const i = out.lastIndexOf('\n'), body = out.slice(0, i), status = +out.slice(i + 1) || 0;
    return { ok: status >= 200 && status < 300, status, json: async () => JSON.parse(body), text: async () => body };
  } catch (e) { return { ok: false, status: 0, json: async () => ({}), text: async () => '' }; }
};
