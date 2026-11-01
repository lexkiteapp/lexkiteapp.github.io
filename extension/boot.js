/* Mồi add-on (content script DUY NHẤT chạy trên mọi trang/khung, ~3 KB): không làm gì cho tới khi người dùng thao tác.
 * Bấm đúp / bôi đen (+ Alt) / chọn chữ trong ô nhập → nhờ service worker chèn content.js (+ structures.js) vào ĐÚNG khung này rồi phát lại thao tác.
 * Chèn sẵn lúc rảnh chỉ khi cần thật: lexkite.com (cầu nối dữ liệu + dấu đã cài), YouTube (phụ đề chạm được), khung chính đang bật
 * "đánh dấu từ đã lưu" và đã có thẻ. Soát lỗi viết (mặc định tắt) → chèn writecheck khi bật và người dùng bấm vào ô nhập.
 * Menu chuột phải: background.js tự chèn trước khi gửi lệnh (ensureCS). Đo: scripts/test/dict-perf.mjs (trang nặng). */
(() => {
  if (window.__lkBoot) return;
  const B = window.__lkBoot = { off: false };
  const alive = () => { try { return !B.off && !!chrome.runtime.id; } catch (e) { return false; } };
  const subs = [];
  const on = (t, ev, fn, o) => { t.addEventListener(ev, fn, o); subs.push(() => t.removeEventListener(ev, fn, o)); };
  const off = () => { B.off = true; subs.splice(0).forEach(f => { try { f(); } catch (e) { /* bỏ qua */ } }); };
  const ask = what => new Promise(res => { if (!alive()) { off(); return res(false); } try { chrome.runtime.sendMessage({ type: 'lkInject', what }, r => { void chrome.runtime.lastError; res(!!(r && r.ok)); }); } catch (e) { off(); res(false); } });
  let csP = null, wcP = null;
  const cs = () => (window.__lkCS ? Promise.resolve(true) : csP || (csP = ask('cs').then(ok => { if (!ok) csP = null; return ok; })));
  const wc = () => wcP || (wcP = ask('wc').then(ok => { if (!ok) wcP = null; return ok; }));
  // Bản mới của add-on thay bản cũ: content.js phát 'ielts-lexi-takeover' khi chạy → bản mồi cũ (mồ côi) tự gỡ
  on(document, 'ielts-lexi-takeover', () => { if (!alive()) off(); });
  const host = location.hostname, top = window.top === window;
  // Trang chính của tab (khung con dùng ancestorOrigins) – "Tắt trên trang này" áp cho cả khung nhúng của trang đó
  const site = (() => { let h = host; if (!top) try { const a = location.ancestorOrigins; if (a && a.length) h = new URL(a[a.length - 1]).hostname; } catch (e) { /* bỏ qua */ } return h.replace(/^www\./, ''); })();
  const OWN = /^(www\.)?lexkite\.com$|^lexkite\.pages\.dev$/.test(host);
  const idle = fn => ('requestIdleCallback' in window ? requestIdleCallback(fn, { timeout: 3000 }) : setTimeout(fn, 1200));
  let wcOn = false, offSites = [], siteOff = false, booted = false;
  // Người dùng tắt Lexkite trên trang này → gỡ ngay bản đang chạy (bảng tra, đánh dấu từ, soát lỗi viết); bật lại → chạy khi thao tác kế tiếp
  const stopAll = () => { for (const k of ['__lkCS', '__lkWC']) try { const x = window[k]; if (x && x.stop) x.stop(); } catch (e) { /* bỏ qua */ } csP = wcP = null; };
  const read = () => { try { chrome.storage.local.get(['settings', 'wcOffSites', 'lkOffSites'], r => { void chrome.runtime.lastError; const st = (r && r.settings) || {}; wcOn = st.wcOn === true; offSites = (r && r.wcOffSites) || []; siteOff = !OWN && ((r && r.lkOffSites) || []).includes(site); if (siteOff) return stopAll(); if (!booted) { booted = true; if (top && (OWN || /(^|\.)youtube\.com$/.test(host))) cs(); } const mark = st.markKnown !== false; if (!window.__lkCS && top && mark && !/^(docs|mail)\.google\.com$|(^|\.)lexkite\.com$|^lexkite\.pages\.dev$|(^|\.)(vocaband|ielts-lexi-2026)\.web\.app$|^localhost$/.test(host)) hasCards().then(y => { if (y && alive()) idle(() => alive() && cs()); }); }); } catch (e) { off(); } };
  // Có thẻ đã lưu? (getBytesInUse: không phải đọc/giải mã cả kho thẻ trên mọi trang)
  const hasCards = () => new Promise(res => { try { const s = chrome.storage.local; if (s.getBytesInUse) s.getBytesInUse('cards', n => { void chrome.runtime.lastError; res((n || 0) > 4); }); else s.get('cards', r => res(!!(r && r.cards && Object.keys(r.cards).length))); } catch (e) { res(false); } });
  read();
  try { chrome.storage.onChanged.addListener(ch => { if (!alive()) return; if (ch.settings || ch.wcOffSites || ch.lkOffSites) read(); }); } catch (e) { /* bỏ qua */ }
  const ev = e => ({ type: e.type, clientX: e.clientX, clientY: e.clientY, target: e.target, button: e.button, altKey: e.altKey, detail: e.detail, composedPath: () => (e.composedPath ? e.composedPath() : []) });
  const replay = (type, e) => (siteOff ? Promise.resolve(false) : cs()).then(ok => { if (ok && alive() && window.__lkCS && window.__lkCS.replay) window.__lkCS.replay(type, e); });
  const editable = el => !!(el && el.closest && el.closest('input, textarea, [contenteditable=""], [contenteditable="true"]'));
  on(document, 'dblclick', e => { if (!alive() || window.__lkCS) return; if (!editable(e.target)) replay('dblclick', ev(e)); }, true);
  on(document, 'mouseup', e => {
    if (!alive() || window.__lkCS || e.button !== 0) return;
    const x = ev(e);
    setTimeout(() => {
      const f = e.target && e.target.closest && e.target.closest('textarea, input');
      const txt = f ? String(f.value || '').slice(f.selectionStart || 0, f.selectionEnd || 0) : String(window.getSelection() || '');
      if (/[A-Za-z]{2}/.test(txt)) replay('mouseup', x);
    }, 0);
  }, true);
  on(document, 'focusin', e => { if (!alive() || siteOff || !wcOn || !editable(e.target) || offSites.includes(site)) return; wc(); }, true);
})();
