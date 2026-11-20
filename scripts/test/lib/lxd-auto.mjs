// Playwright: hộp thoại LXDialog (web/js/dialog.js) là DOM, không phải hộp gốc → page.on('dialog') không thấy. Hàm này tự bấm thay (mặc định "đồng ý"), ghi lại nội dung.
// autoLXD(page, { mode: () => 'accept' | 'dismiss', onMsg: msg => … })  – gọi TRƯỚC khi mở trang (addInitScript).
export async function autoLXD(page, { mode = () => 'accept', onMsg = () => {} } = {}) {
  await page.exposeFunction('__lxdDecide', msg => { onMsg(msg); return mode(); });
  await page.addInitScript(() => {
    const seen = new WeakSet(), tick = () => document.querySelectorAll('.lxd').forEach(el => {
      if (seen.has(el)) return; seen.add(el);
      const msg = (el.querySelector('.lxd-msg') || {}).textContent || '';
      window.__lxdDecide(msg).then(m => { const b = el.querySelector(m === 'dismiss' ? '.lxd-btn.ghost' : '.lxd-btn.primary, .lxd-btn.danger') || el.querySelector('.lxd-btn'); if (b) b.click(); });
    });
    new MutationObserver(tick).observe(document, { childList: true, subtree: true });
  });
}
