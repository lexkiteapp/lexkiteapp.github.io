/* 🎨 Stitch – phần chung cho 4 màn port thẳng từ Google Stitch (out/stitch/v1/<màn>/code.html). Class Tailwind GIỮ NGUYÊN như mẫu;
 * CSS biên dịch sẵn theo nhóm (web/css/st-<nhóm>.css, scripts/build-stitch-css.mjs) → file này là "content" của Tailwind:
 * mọi class phải viết NGUYÊN VĂN trong chuỗi (không ghép động), nếu không sẽ bị lọc khỏi CSS.
 * Màu = token Stitch (brand/stitch/tokens.dtcg.json) qua biến CSS → cùng DOM cho sáng (B) / tối (A). `lt:` = chỉ ở giao diện sáng. */
(function () {
  if (window.ST) return;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  // Icon Material Symbols (font subset tự host web/fonts/msym.woff2 – tên phải nằm trong ms('…') hoặc chú thích @icons để build tải về)
  const ms = (n, cls, fill) => `<span class="material-symbols-outlined${fill ? ' fill' : ''}${cls ? ' ' + cls : ''}" aria-hidden="true">${n}</span>`;
  // @icons route layers bolt trophy person expand_more local_fire_department star search notifications
  // Thanh tab dưới (5 tab của Lexkite, kiểu thanh điều hướng Stitch). Lớp vỏ <nav id="bnav" class="bottom-nav"> giữ nguyên (ẩn/hiện theo khổ).
  const TABI = { learn: 'route', review: 'layers', train: 'bolt', league: 'trophy', me: 'person' };
  const nav = tabs => { const cap = tabs.every(x => String(x[3]).length <= 7); return navH(tabs, cap); }; // nhãn cùng một kiểu: viết hoa chỉ khi mọi nhãn đủ ngắn
  const navH = (tabs, cap) => `<div class="st flex justify-around items-center h-20 px-space-xs w-full">${tabs.map(([k, h, , l]) => `<a class="st-tab group relative flex flex-col items-center justify-center gap-1 min-w-0 flex-1 min-h-[48px] py-1 text-on-surface-variant hover:text-on-surface transition-colors" href="${h}" data-tab="${k}"><div class="st-tabi flex items-center justify-center w-10 h-7 rounded-full">${ms(TABI[k] || 'circle', 'text-[22px]')}</div><span class="font-label-badge text-[11px] leading-4 font-bold whitespace-nowrap ${cap ? 'uppercase tracking-wide' : 'normal-case tracking-normal'}"><bdi>${esc(l)}</bdi></span>${k === 'review' ? '<i class="badge absolute top-0 right-2" data-due hidden></i>' : ''}</a>`).join('')}</div>`;
  // Lớp vỏ thanh tab + đầu trang theo Stitch (class đặt lên phần tử có sẵn của index.html – không thêm DOM)
  const NAV_CLS = 'pb-safe bg-surface-container-low/95 backdrop-blur-xl rounded-t-2xl shadow-[0_-4px_20px_rgba(0,0,0,0.35)] lt:shadow-[0_-4px_20px_rgba(15,61,62,0.06)] lt:border-t lt:border-outline-variant';
  // Thẻ chung: bóng tối (A) ↔ viền mảnh + bóng mềm (B)
  const CARD = 'shadow-xl border border-outline-variant/60 lt:shadow-card-soft lt:border-outline-variant/80'; // tối: viền mảnh tách tầng (như app lớn) · sáng: viền kem + bóng mềm
  window.ST = { esc, ms, nav, NAV_CLS, CARD };
})();
