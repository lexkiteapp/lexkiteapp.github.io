/* Firebase Crashlytics cho app gốc (@capacitor-firebase/crashlytics, bản store ≥ 1.0.2 – docs/STORE-READINESS.md › Crashlytics).
 * native.js bắt lỗi JS ngay từ đầu (hàng đợi __lkCrashQ) rồi nạp file này sau 'load' (không nằm trong khung app). Crash native do SDK tự gửi.
 * Lỗi JS → non-fatal, KHÔNG dữ liệu cá nhân: URL chỉ còn host (+ tên file .js), bỏ đường dẫn/query/hash (từ tra, mã lớp…); email, JWT,
 * mã dài, số ≥ 6 chữ số, chuỗi trích dẫn dài (nội dung người học gõ) → nhãn; stack chỉ tên hàm + tên file + dòng; trang = đoạn đầu hash.
 * Mã người dùng: SHA-256('lexkite-crash:' + uid) 16 hex, chỉ khi đã đăng nhập. ≤ 20 lỗi khác nhau mỗi phiên. Khóa: scripts/test/crashlytics.mjs */
(function (g) {
  const url = u => { const m = /^[a-z][\w+.-]*:\/\/([^/?#\s]*)([^?#\s]*)/i.exec(u); if (!m) return '[url]'; const f = m[2].split('/').pop() || ''; return (m[1] || 'app') + (/\.(m?js|css|html)$/i.test(f) ? '/' + f : ''); };
  const clean = msg => String(msg == null ? '' : msg).slice(0, 4000)
    .replace(/\b[a-z][\w+.-]*:\/\/[^\s'"<>)]+/gi, url)
    .replace(/[\w.+-]+@[\w-]+(\.[\w-]+)+/g, '[email]')
    .replace(/\beyJ[\w-]{8,}\.[\w-]{8,}\.[\w-]{4,}/g, '[token]')
    .replace(/\b(?=[A-Za-z0-9_-]*\d)[A-Za-z0-9_-]{24,}\b/g, '[id]')
    .replace(/\d{6,}/g, '#')
    .replace(/(["'“‘])([^"'“”‘’]{25,})(["'”’])/g, '$1…$3')
    .replace(/\s+/g, ' ').trim().slice(0, 300);
  const frames = stack => String(stack || '').split('\n')
    .map(l => /^\s*(?:at\s+)?(?:(.*?)\s*\(|(.*?)@)?([a-z][\w+.-]*:\/\/[^\s)]+?|[^\s()@]+?\.m?js[^\s:)]*):(\d+)(?::\d+)?\)?\s*$/i.exec(l)).filter(Boolean).slice(0, 15)
    .map(m => ({ functionName: String(m[1] || m[2] || '?').replace(/^async\s+/, '').slice(0, 80) || '?', fileName: url(/:\/\//.test(m[3]) ? m[3] : 'x://app/' + m[3]).replace(/^app\//, ''), lineNumber: +m[4] }));
  const route = h => (/^#\/([a-z0-9-]+)/i.exec(String(h || '')) || [, 'home'])[1].slice(0, 32);
  const C = g.LKCrash = { clean, frames, route, report: () => {} };
  const CR = g.Capacitor && g.Capacitor.Plugins && g.Capacitor.Plugins.FirebaseCrashlytics;
  if (!CR) return;
  const seen = new Set(); let n = 0, uidSet = '';
  const who = async () => {
    const u = g.Sync && g.Sync.user && g.Sync.user.uid; if (!u || u === uidSet || !(g.crypto && g.crypto.subtle)) return; uidSet = u;
    const b = await g.crypto.subtle.digest('SHA-256', new TextEncoder().encode('lexkite-crash:' + u));
    await CR.setUserId({ userId: [...new Uint8Array(b)].slice(0, 8).map(x => x.toString(16).padStart(2, '0')).join('') });
  };
  C.report = (kind, msg, stack) => {
    const m = clean(msg); if (!m || /ResizeObserver loop|^Script error\.?$/i.test(m)) return;
    if (seen.has(kind + m) || n >= 20) return; seen.add(kind + m); n++;
    who().catch(() => {}).then(() => CR.recordException({ message: '[' + kind + '] ' + m, stacktrace: frames(stack), keysAndValues: [{ key: 'route', value: route(g.location && g.location.hash), type: 'string' }] })).catch(() => {});
  };
  g.addEventListener('hashchange', () => { CR.log({ message: 'route ' + route(g.location.hash) }).catch(() => {}); });
  for (const [k, m, s] of (g.__lkCrashQ || []).splice(0)) C.report(k, m, s);
})(typeof self !== 'undefined' ? self : this);
