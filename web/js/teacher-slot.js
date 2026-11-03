/* 🧍 Chỗ giáo viên dùng chung (teacher slot) – docs/CHARACTERS.md §Chỗ giáo viên. Ảnh tĩnh Ama/Carlos là NỬA NGƯỜI (đầu → hông, đáy mờ dần + quần xám),
 * nên không bao giờ đặt trần lên màn. Hai cách tiếp đất (option ground), không còn bệ xám lơ lửng (chủ 3/11: khối .tslot-ledge giữa nền trang trông như lỗi):
 *  · 'fade' (mặc định – giáo viên đứng trên nền trống/modal/chip): nửa thân dưới mờ dần mượt vào nền (mask-image trên khung .tslot-fig → ảnh tĩnh LẪN canvas clip)
 *    + bóng tiếp đất elip mềm .tslot-shadow → không khối, không đường cắt cứng, đúng mọi màu nền (sáng/tối/thẻ).
 *  · 'card' (giáo viên đứng ngay SAU mép trên một thẻ đục): không vẽ bệ – chính thẻ là bệ: slot lùi xuống 0,16 khung sau mép thẻ (người gọi đặt lề âm + thẻ z cao hơn),
 *    đường cắt hông khuất sau mặt thẻ thật (liền màu tuyệt đối). Cổng runtime teacher-native-shots kiểm có thẻ đục che dải đáy, không thì đỏ.
 * Cỡ chuẩn s/m/l/xl theo chiều cao khung (đồng bộ cổng scripts/test/teacher-native.mjs). Ảnh chỉ qua Chars (registry). */
(function (g) {
  const SIZES = { xs: 48, s: 72, m: 112, l: 152, xl: 208 }; // px chiều cao khung (đầu → mặt bệ) – thêm cỡ = sửa docs/CHARACTERS.md + cổng
  // Hình học (ảnh 1108×960, người chiếm y 8 %→100 %): ảnh cao 1,2 khung, đáy ảnh lùi 0,18 khung dưới đáy khung (phần mờ + quần bị khung cắt),
  // dải đáy 0,16 khung (72 %→86 % ảnh, vạt áo) là vùng tiếp đất: 'fade' mờ dần từ 0,34 khung → trong suốt hẳn 0,03 khung trên đáy (trước vết cắt khung),
  // 'card' để mép thẻ che dải này; đầu cách đỉnh khung ~7 %.
  // Khung cắt .tslot-fig chỉ rộng vừa ảnh (ảnh rộng 1,2×1108/960 = 1,385 khung-cao, khung rộng 0,9 → mỗi bên lố 0,243 → lề 0,25) và cao hơn đỉnh 0,1.
  // overflow:clip (không phải hidden): khung hidden là KHUNG CUỘN – scrollIntoView/focus/tìm trong trang cuộn ảnh lên 0,18 khung → thân mờ lộ trên bệ
  // (final-qc streak: ảnh đáy = đáy khung dù bottom -20 px); clip không cuộn được. hidden đứng trước làm dự phòng cho trình duyệt cũ:
  // khung thừa (±60 % cũ) làm tràn ngang màn 360 px khi chỗ giáo viên sát mép thẻ (stitch-diff/final-qc 'tràn ngang tslot-fig').
  const CSS = `.tslot{--h:112px;position:relative;display:inline-block;flex:none;width:calc(var(--h)*.9);height:var(--h);vertical-align:bottom;pointer-events:none;user-select:none;-webkit-user-select:none}
.tslot-xs{--h:48px}.tslot-s{--h:72px}.tslot-m{--h:112px}.tslot-l{--h:152px}.tslot-xl{--h:208px}
.tslot-fig{position:absolute;top:calc(var(--h)*-.1);left:calc(var(--h)*-.25);right:calc(var(--h)*-.25);bottom:0;overflow:hidden;overflow:clip}
.tslot-img{position:absolute;left:50%;bottom:calc(var(--h)*-.18);height:calc(var(--h)*1.2);width:auto;max-width:none;transform:translateX(-50%);transform-origin:50% 100%}
.tslot-flip .tslot-img{transform:translateX(-50%) scaleX(-1)}
:is(canvas,video).tslot-img{opacity:0;transition:opacity .18s}.tslot.live :is(canvas,video).tslot-img{opacity:1}.tslot.live img.tslot-img{visibility:hidden}
.tslot-fade .tslot-fig{-webkit-mask-image:linear-gradient(to top,transparent calc(var(--h)*.03),rgb(0 0 0/.55) calc(var(--h)*.15),#000 calc(var(--h)*.34));mask-image:linear-gradient(to top,transparent calc(var(--h)*.03),rgb(0 0 0/.55) calc(var(--h)*.15),#000 calc(var(--h)*.34))}
.tslot-shadow{position:absolute;left:16%;right:16%;bottom:calc(var(--h)*-.04);height:calc(var(--h)*.1);border-radius:50%;background:radial-gradient(closest-side,rgb(15 40 42/.22),rgb(15 40 42/.09) 55%,rgb(15 40 42/0))}
:root[data-theme="dark"] .tslot-shadow{background:radial-gradient(closest-side,rgb(0 0 0/.5),rgb(0 0 0/.2) 55%,rgb(0 0 0/0))}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]) .tslot-shadow{background:radial-gradient(closest-side,rgb(0 0 0/.5),rgb(0 0 0/.2) 55%,rgb(0 0 0/0))}}
@supports not ((-webkit-mask-image:linear-gradient(#000,#000)) or (mask-image:linear-gradient(#000,#000))){.tslot-fade .tslot-fig::after{content:"";position:absolute;left:0;right:0;bottom:0;height:calc(var(--h)*.34);background:linear-gradient(to top,var(--bg) calc(var(--h)*.03),transparent)}}
:root[data-theme="dark"] .tslot-img{filter:brightness(.95) saturate(.96)}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]) .tslot-img{filter:brightness(.95) saturate(.96)}}
@media (prefers-reduced-motion:no-preference){img.tslot-img{animation:tslot-in .18s ease-out both,tslot-breathe 4.2s ease-in-out .2s infinite}.tslot-flip .tslot-img{animation:tslot-in .18s ease-out both}}
@keyframes tslot-in{from{opacity:0}}
@keyframes tslot-breathe{50%{transform:translateX(-50%) scaleY(1.012)}}`;
  // Phần phát clip (WebGL/video, ~2 KB gz) ở js/teacher-live.js – chỉ tải khi trang có chỗ giáo viên động (khung app giữ ảnh tĩnh)
  const base = ((g.document && document.currentScript) || {}).src || '';
  let lp = null;
  const lib = () => lp || (lp = g.TeacherLive ? Promise.resolve() : new Promise(r => { const s = document.createElement('script'); s.src = base ? new URL('teacher-live.js', base).href : 'js/teacher-live.js'; s.onload = s.onerror = () => r(); document.head.appendChild(s); }));
  let pend = 0;
  const hydrate = () => { pend = 0; if (document.querySelector('.tslot[data-clip]')) lib().then(() => { if (g.TeacherLive) document.querySelectorAll('.tslot[data-clip]').forEach(g.TeacherLive); }); };
  let on = 0;
  const css = () => { if (on || !g.document || !document.head) return; on = 1; const s = document.createElement('style'); s.id = 'tslot-css'; s.textContent = CSS; document.head.appendChild(s); };
  g.TeacherSlot = { SIZES, css };
  const C = g.Chars; if (!C) return;
  // Chars.slot(who, {pose, size:'xs'|'s'|'m'|'l'|'xl', cls, flip, lazy, alt, clip:true = clip tư thế phát 1 lần (ảnh tĩnh dưới đến khung đầu; giảm chuyển động/tiết kiệm dữ liệu → ảnh tĩnh), loop:true|ms = lặp cử chỉ, nghỉ 6 s, idle:true = vòng nghỉ mắt mở (Chars.idle, happy, lặp liền), ground:'fade' (mặc định – nền trống) | 'card' (đứng sau mép thẻ đục: người gọi cho thẻ đè dải đáy 0,16 khung, cổng runtime kiểm), ground:false cũ = 'fade', style = CSS nội dòng (vd. lề), không đổi hình học})
  C.slot = (w, o = {}) => {
    css();
    const idle = !!(o.idle && C.idle), sz = SIZES[o.size] ? o.size : 'm', pose = C.poses.includes(o.pose) ? o.pose : idle ? 'happy' : 'talk';
    const I = idle ? C.idle(w) : null, clip = I ? I.mp4 : o.clip ? C.clip(w, pose, { hd: SIZES[sz] >= 152 && (g.devicePixelRatio || 1) >= 2 }) : '';
    const im = C.img(w, { kind: 'still', pose, cls: 'tslot-img', alt: o.alt || '', size: SIZES[sz], lazy: o.lazy !== false });
    const gr = o.ground === 'card' ? 'card' : 'fade'; // không có chế độ bệ rời: bệ không thẻ phía sau = khối lơ lửng (chủ 3/11)
    if (clip && !pend && g.document) pend = setTimeout(hydrate, 0); // HTML chèn xong mới gắn clip
    return `<span class="tslot tslot-${sz} tslot-${gr}${o.flip ? ' tslot-flip' : ''}${o.cls ? ' ' + o.cls : ''}" data-teacher="${C.id(w)}" data-pose="${pose}" data-ground="${gr}"${clip ? ` data-clip="${clip}"` : ''}${I ? ` data-webm="${I.webm}" data-loop="0"` : o.clip && o.loop ? ` data-loop="${o.loop === true ? 6000 : +o.loop}"` : ''}${o.style ? ` style="${o.style}"` : ''}${o.alt ? '' : ' aria-hidden="true"'}>${gr === 'fade' ? '<i class="tslot-shadow"></i>' : ''}<span class="tslot-fig">${im}</span></span>`;
  };
})(self);
