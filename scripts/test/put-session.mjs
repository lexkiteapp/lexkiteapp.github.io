// Hồi quy 1/11: code-bundle (~950 MB, ~120 khúc) hỏng vì 1 lần Google trả 502 ở khúc PUT. putSession phải tiếp tục phiên resumable.
// Chạy: node scripts/test/put-session.mjs (không mạng)
import { putSession } from '../video/library.mjs';
let fails = 0, n = 0; const ok = (c, m) => { n++; if (!c) { fails++; console.log('✗', m); } };
const URL_ = 'https://www.googleapis.com/upload/drive/v3/files?upload_id=x', wait = async () => {};
const R = (status, headers = {}, body = {}) => ({ status, headers: { get: k => headers[k] ?? null }, json: async () => body });
const big = Buffer.alloc((64 << 20) + 10), CH = 8 << 20;

// 1) máy chủ giả: nhận tuần tự, lỗi theo kịch bản
function server(script) {
  let got = 0, call = 0;
  const f = async (u, init) => {
    call++; const cr = init.headers['Content-Range'] || '', ev = script(call, cr);
    if (ev === 'net') throw new Error('ECONNRESET');
    if (ev) return R(ev);
    if (cr.startsWith('bytes */')) return got >= big.length ? R(200, {}, { id: 'F1' }) : R(308, got ? { Range: `bytes=0-${got - 1}` } : {});
    const m = cr.match(/bytes (\d+)-(\d+)\/(\d+)/); const a = +m[1], b = +m[2];
    if (a !== got) return R(400);
    got = b + 1; return got >= big.length ? R(200, {}, { id: 'F1' }) : R(308, { Range: `bytes=0-${got - 1}` });
  };
  f.stats = () => ({ got, call }); return f;
}
let f = server(() => null);
ok(await putSession(f, URL_, big, 'application/x-git-bundle', CH, { wait }) === 'F1', 'đường xanh: ra id');
f = server(c => (c === 3 ? 502 : null));
ok(await putSession(f, URL_, big, 'x', CH, { wait }) === 'F1' && f.stats().got === big.length, '1 lần 502 giữa chừng → hỏi offset, gửi tiếp, vẫn xong');
f = server(c => (c === 2 ? 'net' : c === 4 ? 503 : c === 5 ? 429 : null));
ok(await putSession(f, URL_, big, 'x', CH, { wait }) === 'F1', 'lỗi mạng + 503 + 429 rải rác vẫn xong');
f = server(() => 500); let err = '';
try { await putSession(f, URL_, big, 'x', CH, { wait }); } catch (e) { err = e.message; }
ok(/PUT khúc 500/.test(err) && f.stats().call < 40, 'lỗi dai dẳng → dừng sau số lần giới hạn: ' + err);
f = server(c => (c === 1 ? 403 : null)); err = '';
try { await putSession(f, URL_, big, 'x', CH, { wait }); } catch (e) { err = e.message; }
ok(/PUT khúc 403/.test(err) && f.stats().call === 1, '403 (không tạm thời) KHÔNG thử lại');
// file nhỏ (≤ 64 MB): PUT một phát, 503 thì thử lại
let c2 = 0; const small = Buffer.alloc(1000);
ok(await putSession(async () => (++c2 < 3 ? R(503) : R(200, {}, { id: 'S' })), URL_, small, 'x', CH, { wait }) === 'S' && c2 === 3, 'file nhỏ: 503 thử lại');
ok(await putSession(async () => R(200, {}, { id: 'S' }), URL_, small, 'x', CH, { wait }) === 'S', 'file nhỏ xanh');
err = ''; try { await putSession(fetch, 'https://evil.example/x', small, 'x', CH); } catch (e) { err = e.message; }
ok(/phiên tải lên/.test(err), 'chặn URL lạ');
if (fails) { console.log(`✗ put-session: ${fails}/${n}`); process.exit(1); }
console.log(`✓ put-session: ${n} kiểm`);
