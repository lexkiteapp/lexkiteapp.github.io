/* 🧍 Chỗ giáo viên dùng chung (teacher slot) – docs/CHARACTERS.md §Chỗ giáo viên. Ảnh tĩnh Ama/Carlos là NỬA NGƯỜI (đầu → hông, đáy mờ dần + quần xám),
 * nên không bao giờ đặt trần lên màn: giáo viên luôn đứng SAU một bệ (cùng màu mặt thẻ, có gờ đáy như nút Tactile) che đường cắt ngang hông → không vệt cắt,
 * không khối xám, không lơ lửng. Cỡ chuẩn s/m/l/xl theo chiều cao khung (đồng bộ cổng scripts/test/teacher-native.mjs). Ảnh chỉ qua Chars (registry). */
(function (g) {
  const SIZES = { s: 72, m: 112, l: 152, xl: 208 }; // px chiều cao khung (đầu → mặt bệ) – thêm cỡ = sửa docs/CHARACTERS.md + cổng
  // Hình học (ảnh 1108×960, người chiếm y 8 %→100 %): ảnh cao 1,2 khung, đáy ảnh lùi 0,18 khung dưới đáy khung (phần mờ + quần bị khung cắt),
  // bệ cao 0,16 khung che dải 72 %→86 % ảnh (vạt áo) → mép nhìn thấy duy nhất là mặt bệ bo tròn; đầu cách đỉnh khung ~7 %.
  const CSS = `.tslot{--h:112px;position:relative;display:inline-block;flex:none;width:calc(var(--h)*.9);height:var(--h);vertical-align:bottom;pointer-events:none;user-select:none;-webkit-user-select:none}
.tslot-s{--h:72px}.tslot-m{--h:112px}.tslot-l{--h:152px}.tslot-xl{--h:208px}
.tslot-fig{position:absolute;inset:0;clip-path:inset(-60% -60% 0 -60%)}
.tslot-img{position:absolute;left:50%;bottom:calc(var(--h)*-.18);height:calc(var(--h)*1.2);width:auto;max-width:none;transform:translateX(-50%);transform-origin:50% 100%}
.tslot-flip .tslot-img{transform:translateX(-50%) scaleX(-1)}
.tslot-ledge{position:absolute;left:2%;right:2%;bottom:0;height:calc(var(--h)*.16);border-radius:999px 999px calc(var(--h)*.06) calc(var(--h)*.06);background:var(--surface-2);box-shadow:inset 0 1px 0 rgb(255 255 255/.10),inset 0 calc(var(--h)*.02) calc(var(--h)*.03) rgb(0 0 0/.10),0 calc(var(--h)*.03) 0 var(--ledge)}
[data-ground="0"] .tslot-ledge{background:var(--bg);box-shadow:none}
:root[data-theme="dark"] .tslot-img{filter:brightness(.95) saturate(.96)}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]) .tslot-img{filter:brightness(.95) saturate(.96)}}
@media (prefers-reduced-motion:no-preference){.tslot-img{animation:tslot-in .18s ease-out both,tslot-breathe 4.2s ease-in-out .2s infinite}.tslot-flip .tslot-img{animation:tslot-in .18s ease-out both}}
@keyframes tslot-in{from{opacity:0}}
@keyframes tslot-breathe{50%{transform:translateX(-50%) scaleY(1.012)}}`;
  let on = 0;
  const css = () => { if (on || !g.document || !document.head) return; on = 1; const s = document.createElement('style'); s.id = 'tslot-css'; s.textContent = CSS; document.head.appendChild(s); };
  g.TeacherSlot = { SIZES, css };
  const C = g.Chars; if (!C) return;
  // Chars.slot(who, {pose, size:'s'|'m'|'l'|'xl', cls, flip, lazy, alt, ground:false = bệ cùng màu nền trang khi giáo viên đứng trên mặt thẻ})
  C.slot = (w, o = {}) => {
    css();
    const sz = SIZES[o.size] ? o.size : 'm', pose = C.poses.includes(o.pose) ? o.pose : 'talk';
    const im = C.img(w, { kind: 'still', pose, cls: 'tslot-img', alt: o.alt || '', size: SIZES[sz], lazy: o.lazy !== false });
    return `<span class="tslot tslot-${sz}${o.flip ? ' tslot-flip' : ''}${o.cls ? ' ' + o.cls : ''}" data-teacher="${C.id(w)}" data-pose="${pose}"${o.ground === false ? ' data-ground="0"' : ''}${o.alt ? '' : ' aria-hidden="true"'}><span class="tslot-fig">${im}</span><i class="tslot-ledge"></i></span>`;
  };
})(self);
