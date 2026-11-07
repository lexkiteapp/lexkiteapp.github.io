/* 🧍 Chỗ giáo viên dùng chung (teacher slot) – docs/CHARACTERS.md §Chỗ giáo viên. Ảnh tĩnh Ama/Carlos là NỬA NGƯỜI (đầu → hông, đáy mờ dần + quần xám),
 * nên không bao giờ đặt trần lên màn: giáo viên luôn đứng SAU một bệ (cùng màu mặt thẻ, có gờ đáy như nút Tactile) che đường cắt ngang hông → không vệt cắt,
 * không khối xám, không lơ lửng. Cỡ chuẩn s/m/l/xl theo chiều cao khung (đồng bộ cổng scripts/test/teacher-native.mjs). Ảnh chỉ qua Chars (registry). */
(function (g) {
  const SIZES = { xs: 48, s: 72, m: 112, l: 152, xl: 208 }; // px chiều cao khung (đầu → mặt bệ) – thêm cỡ = sửa docs/CHARACTERS.md + cổng
  // Hình học (--fh/--fb, aspect-ratio, hip/HIP): một nguồn cho ảnh, clip, rig – số đo + lý do ở docs/CHARACTERS.md §Hình học chỗ giáo viên; cổng teacher-bubble.mjs
  const CSS = `.tslot{--h:112px;--fh:calc(var(--h)*1.2);--fb:calc(var(--h)*-.18);position:relative;display:inline-block;flex:none;width:calc(var(--h)*.9);height:var(--h);vertical-align:bottom;pointer-events:none;user-select:none;-webkit-user-select:none}
.tslot-xs{--h:48px}.tslot-s{--h:72px}.tslot-m{--h:112px}.tslot-l{--h:152px}.tslot-xl{--h:208px}
.tslot-fig{position:absolute;top:calc(var(--h)*-.1);left:calc(var(--h)*-.25);right:calc(var(--h)*-.25);bottom:0;overflow:hidden;overflow:clip}
.tslot-img{position:absolute;left:50%;bottom:var(--fb);height:var(--fh);width:auto;max-width:none;transform:translateX(-50%);transform-origin:50% 100%}
img.tslot-img{aspect-ratio:1108/960}
.tslot-flip .tslot-img{transform:translateX(-50%) scaleX(-1)}
:is(canvas,video).tslot-img{opacity:0;transition:opacity .18s}.tslot.live :is(canvas,video).tslot-img{opacity:1}.tslot.live img.tslot-img{visibility:hidden}
.tslot-ledge{position:absolute;left:2%;right:2%;bottom:0;height:calc(var(--h)*.16);border-radius:999px 999px calc(var(--h)*.06) calc(var(--h)*.06);background:var(--surface-2);box-shadow:inset 0 1px 0 rgb(255 255 255/.10),inset 0 calc(var(--h)*.02) calc(var(--h)*.03) rgb(0 0 0/.10),0 calc(var(--h)*.03) 0 var(--ledge)}
[data-ground="0"] .tslot-ledge{background:var(--bg);box-shadow:none}
.tslot-hip{--fb:calc(var(--h)*-.125)}.tslot-hip .tslot-ledge{height:calc(var(--h)*.1)}
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
  // HIP = hàng ảnh (/960) của hông, hip:true đặt mép bệ đúng hàng này (docs/CHARACTERS.md §Hình học)
  g.TeacherSlot = { SIZES, css, HIP: 780 };
  const C = g.Chars; if (!C) return;
  // Chars.slot(who, {pose, size:'xs'|'s'|'m'|'l'|'xl', hip:true = lộ tới hông (bệ mỏng, xem HIP), cls, flip, lazy, alt, clip:true = clip tư thế phát 1 lần (ảnh tĩnh dưới đến khung đầu; giảm chuyển động/tiết kiệm dữ liệu → ảnh tĩnh), loop:true|ms = lặp cử chỉ, nghỉ 6 s, idle:true = vòng nghỉ mắt mở (Chars.idle, happy, lặp liền), ground:false = bệ cùng màu nền trang, style = CSS nội dòng (vd. lề), không đổi hình học})
  C.slot = (w, o = {}) => {
    css();
    const idle = !!(o.idle && C.idle), sz = SIZES[o.size] ? o.size : 'm', pose = C.poses.includes(o.pose) ? o.pose : idle ? 'happy' : 'talk';
    const I = idle ? C.idle(w) : null, clip = I ? I.mp4 : o.clip ? C.clip(w, pose) : '';
    const im = C.img(w, { kind: 'still', pose, cls: 'tslot-img', alt: o.alt || '', size: SIZES[sz], lazy: o.lazy !== false });
    if (clip && !pend && g.document) pend = setTimeout(hydrate, 0); // HTML chèn xong mới gắn clip
    return `<span class="tslot tslot-${sz}${o.hip ? ' tslot-hip' : ''}${o.flip ? ' tslot-flip' : ''}${o.cls ? ' ' + o.cls : ''}" data-teacher="${C.id(w)}" data-pose="${pose}"${o.ground === false ? ' data-ground="0"' : ''}${clip ? ` data-clip="${clip}"` : ''}${I ? ` data-webm="${I.webm}" data-loop="0"` : o.clip && o.loop ? ` data-loop="${o.loop === true ? 6000 : +o.loop}"` : ''}${o.style ? ` style="${o.style}"` : ''}${o.alt ? '' : ' aria-hidden="true"'}><span class="tslot-fig">${im}</span><i class="tslot-ledge"></i></span>`;
  };
})(self);
