/* 🎨 Stitch – phần chung cho 4 màn port thẳng từ Google Stitch (out/stitch/v1/<màn>/code.html). Class Tailwind GIỮ NGUYÊN như mẫu;
 * CSS biên dịch sẵn theo nhóm (web/css/st-<nhóm>.css, scripts/build-stitch-css.mjs) → file này là "content" của Tailwind:
 * mọi class phải viết NGUYÊN VĂN trong chuỗi (không ghép động), nếu không sẽ bị lọc khỏi CSS.
 * Màu = token Stitch (brand/stitch/tokens.dtcg.json) qua biến CSS → cùng DOM cho sáng (B) / tối (A). `lt:` = chỉ ở giao diện sáng. */
(function () {
  if (window.ST) return;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  // Icon Material Symbols (font subset tự host web/fonts/msym.woff2 – tên phải nằm trong ms('…') hoặc chú thích @icons để build tải về)
  const ms = (n, cls, fill) => `<span class="material-symbols-outlined${fill ? ' fill' : ''}${cls ? ' ' + cls : ''}" aria-hidden="true">${n}</span>`;
  // @icons history route layers bolt trophy person expand_more local_fire_department star search notifications
  // Thanh tab dưới (5 tab của Lexkite, kiểu thanh điều hướng Stitch). Lớp vỏ <nav id="bnav" class="bottom-nav"> giữ nguyên (ẩn/hiện theo khổ).
  const TABI = { learn: 'route', review: 'history', train: 'bolt', league: 'trophy', me: 'person' };
  const nav = tabs => { const cap = tabs.every(x => String(x[3]).length <= 7); return navH(tabs, cap); }; // nhãn cùng một kiểu: viết hoa chỉ khi mọi nhãn đủ ngắn
  const navH = (tabs, cap) => `<div class="st flex justify-around items-center h-20 px-space-xs w-full">${tabs.map(([k, h, , l]) => `<a class="st-tab group relative flex flex-col items-center justify-center gap-0.5 min-w-0 flex-1 min-h-[56px] mx-0.5 py-1 rounded-xl border-2 border-transparent text-on-surface-variant hover:text-on-surface transition-colors" href="${h}" data-tab="${k}"><div class="st-tabi flex items-center justify-center h-7">${ms(TABI[k] || 'circle', 'text-[20px]')}</div><span class="font-label-badge leading-4 font-bold whitespace-nowrap max-w-full ${String(l).length > 9 ? 'text-[10px] tracking-tight' : 'text-[11px]'} ${cap ? 'uppercase tracking-wide' : 'normal-case'}"><bdi>${esc(l)}</bdi></span>${k === 'review' ? '<i class="badge absolute top-0 right-2" data-due hidden></i>' : ''}</a>`).join('')}</div>`;
  // Lớp vỏ thanh tab + đầu trang theo Stitch (class đặt lên phần tử có sẵn của index.html – không thêm DOM)
  const NAV_CLS = 'pb-safe bg-surface-container-low/95 backdrop-blur-xl rounded-t-2xl shadow-[0_-4px_20px_rgba(0,0,0,0.35)] lt:shadow-[0_-4px_20px_rgba(15,61,62,0.06)] lt:border-t lt:border-outline-variant';
  // Giáo viên: qua registry nhân vật (Chars, web/js/characters.js) khi có; chưa có → ảnh 2D hiện tại. Tư thế: happy encourage thinking…
  const tImg = w => (window.Chars ? Chars.poster(w) : window.App && App.teacherImg ? App.teacherImg(w) : '');
  const tClip = (w, p) => (window.Chars && Chars.clip && !(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) ? Chars.clip(w, p) : '');
  // Khung giáo viên có biểu cảm: clip tư thế (phát 1 lần, tắt tiếng) trên nền ảnh tĩnh; giảm chuyển động / chưa có clip → ảnh tĩnh
  // Ảnh tĩnh theo tư thế (Chars.still khi registry có – teacher-pose-map: đúng = cheer, sai = concern); không khung/viền/nền quanh giáo viên
  const tStill = (w, pose, cls) => `<img class="${cls || ''}" src="${window.Chars && Chars.still ? Chars.still(w, pose) : tImg(w)}" alt="" decoding="async">`;
  const tFace = (w, pose, cls) => { const c = tClip(w, pose), i = tImg(w); return c ? `<video class="${cls}" src="${c}" poster="${i}" muted playsinline autoplay preload="metadata" aria-hidden="true"></video>` : `<img class="${cls}" src="${i}" alt="" decoding="async">`; };
  // Thẻ chung: bóng tối (A) ↔ viền mảnh + bóng mềm (B)
  const CARD = 'shadow-lg border-2 border-b-[5px] border-outline-variant/80 lt:shadow-card-soft lt:border-outline-variant'; // tối: viền mảnh tách tầng (như app lớn) · sáng: viền kem + bóng mềm
  // Bộ linh kiện (tờ mẫu Stitch): nút chính cam gờ #B53A22 · nút phụ màu thẻ gờ 5 px chữ teal · viên số header (lửa / XP)
  const BTN1 = 'flex items-center justify-center gap-2 h-16 rounded-2xl bg-gradient-to-r from-primary-container to-[#FFB054] text-[#2A0700] font-title-pill text-title-pill font-extrabold uppercase no-underline shadow-[0_6px_0_#B53A22] active:translate-y-[4px] active:shadow-[0_2px_0_#B53A22]';
  const BTN2 = 'flex items-center justify-center gap-2 h-14 rounded-2xl bg-surface-container lt:bg-surface border-2 border-b-[5px] border-outline-variant text-secondary font-title-pill text-title-pill font-extrabold uppercase no-underline active:translate-y-[3px] active:border-b-2';
  const PILL = 'inline-flex items-center gap-1 px-3 h-9 rounded-full border-2 border-star/45 bg-star/10 text-star lt:text-tertiary font-label-badge text-label-badge font-extrabold';
  window.ST = { esc, ms, nav, NAV_CLS, CARD, BTN1, BTN2, PILL, tImg, tClip, tFace, tStill };
})();
