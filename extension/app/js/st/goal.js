/* 🎯 Stitch v2 "Option A: Tactile Night – Exam Readiness" (03c2dcc3…, vẽ với ảnh tham khảo app lớn) → khối Sẵn sàng thi đầu trang #/goal.
 * Vòng điểm lớn (điểm ước tính / mục tiêu) · 4 ô kỹ năng nổi 3D chỉ số + biểu tượng · 1 CTA "luyện kỹ năng yếu nhất" cam→vàng · ô thi thử.
 * Chỉ số THẬT (thi thử / kiểm tra đầu vào) – chưa có thì trạng thái trống, không bịa số. Ít chữ: phần giải thích để cho trình đọc màn hình.
 * Móc: .rd-wrap .rd .rd-band .rd-t(.weak) .rd-drill .rd-mock .rd-empty. Màu = token (sáng/tối cùng DOM). */
(function () {
  const { esc, ms } = window.ST;
  // @icons headphones menu_book edit_note mic bolt timer event flag priority_high check_circle play_arrow
  const SKI = { listening: 'headphones', reading: 'menu_book', writing: 'edit_note', speaking: 'mic' };
  const TILE = 'rd-t group relative flex flex-col items-start p-space-md rounded-xl bg-surface-container lt:bg-surface text-start no-underline min-h-[44px] shadow-[0_6px_0_rgb(var(--st-surface-container-lowest))] lt:shadow-[0_6px_0_rgb(var(--st-outline-variant))] lt:border-2 lt:border-outline-variant active:translate-y-[4px] active:shadow-[0_2px_0_rgb(var(--st-surface-container-lowest))] transition-all';
  const HL = '<span class="absolute inset-x-0 top-0 h-px bg-white/10 rounded-t-xl" aria-hidden="true"></span>';
  const tile = s => `<a class="${TILE}${s.weak ? ' weak' : ''}" href="${s.href}">${HL}
<span class="w-10 h-10 rounded-lg ${s.weak ? 'bg-primary-container/15 text-primary' : 'bg-surface-container-high lt:bg-surface-container-highest text-secondary'} flex items-center justify-center mb-space-sm shadow-[0_2px_0_rgb(var(--st-surface-container-lowest))] lt:shadow-none">${ms(SKI[s.k], 'text-[24px]', true)}</span>
<b class="font-headline-sm text-headline-sm text-on-surface leading-none">${esc(s.band)}</b>
<span class="font-label-badge text-label-badge text-on-surface-variant uppercase mt-1 tracking-wide flex items-center gap-1">${esc(s.name)}${s.weak ? ms('priority_high', 'text-[14px] text-primary', true) : ''}</span>
<span class="sr-only">${esc(s.status)}${s.weak && s.focus ? ' · ' + esc(s.faLabel) + ' ' + esc(s.focus) : ''}</span></a>`;
  // Vòng điểm: rãnh lõm · vòng mục tiêu mờ (vàng) · vòng tiến độ teal; giữa = điểm ước tính + "MỤC TIÊU x"
  const gauge = d => { const C = 515, prog = d.real ? Math.max(0.04, Math.min(1, d.pct / 100)) : 0;
    return `<div class="rd-band relative w-64 h-64 max-w-full mx-auto flex items-center justify-center" role="img" aria-label="${esc(d.readyL)}: ${esc(d.pctL)}">
<span class="absolute inset-0 rounded-full bg-surface-container-lowest lt:bg-surface-container-highest shadow-[inset_0_4px_12px_rgba(0,0,0,0.8)] lt:shadow-[inset_0_3px_8px_rgba(15,61,62,0.18)]" aria-hidden="true"></span>
<span class="absolute inset-2 rounded-full bg-surface-container lt:bg-surface shadow-[0_6px_0_rgb(var(--st-surface-container-lowest))] lt:shadow-[0_6px_0_rgb(var(--st-outline-variant))]" aria-hidden="true"></span>
<svg class="w-56 h-56 -rotate-90 relative z-10" viewBox="0 0 200 200" aria-hidden="true"><circle cx="100" cy="100" r="82" fill="none" stroke="rgb(var(--st-surface-container-high))" stroke-width="14" stroke-linecap="round"/><circle cx="100" cy="100" r="82" fill="none" stroke="rgb(var(--st-star))" stroke-opacity="0.3" stroke-width="14" stroke-linecap="round"/>${prog ? `<circle cx="100" cy="100" r="82" fill="none" stroke="rgb(var(--st-secondary-container))" stroke-width="14" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${Math.round(C * (1 - prog))}"/>` : ''}</svg>
<div class="absolute inset-7 rounded-full bg-surface-container-low lt:bg-surface shadow-[inset_0_3px_8px_rgba(0,0,0,0.7)] lt:shadow-[inset_0_2px_6px_rgba(15,61,62,0.12)] flex flex-col items-center justify-center text-center z-20">
<b class="font-display-hero-mobile text-display-hero-mobile text-secondary tracking-tight leading-none">${esc(d.real ? d.cur : '–')}</b>
<span class="font-label-badge text-label-badge text-tertiary uppercase tracking-wider mt-1">${esc(d.tgL)} ${esc(d.target)}</span>
${d.real ? `<span class="rd-pct font-label-badge text-label-badge text-on-surface-variant mt-1" dir="ltr">${esc(d.pctL)}</span>` : ''}</div></div>`; };
  const CTA = 'w-full h-14 rounded-xl bg-gradient-to-r from-primary-container to-[#FFB054] text-on-primary-container font-title-pill text-title-pill font-extrabold uppercase tracking-wider flex items-center justify-center gap-space-xs no-underline shadow-[0_6px_0_rgb(var(--st-lip-primary))] active:translate-y-[4px] active:shadow-[0_2px_0_rgb(var(--st-lip-primary))] transition-all';
  window.ST.ready = d => `<div class="rd-wrap st st-fade flex flex-col w-full max-w-md mx-auto pb-6 gap-y-6 font-body-md text-on-surface antialiased">
<section class="rd relative flex flex-col items-center gap-space-md pt-space-xs" aria-label="${esc(d.aria)}">
<span class="sr-only">${esc(d.chip)} · ${esc(d.who.name)}${d.real ? ` · ${esc(d.curL)} ${esc(d.cur)}/${esc(d.of)} · ${esc(d.days)} · ${esc(d.hrs)}` : ''}</span>
${gauge(d)}
${d.real ? '' : `<div class="rd-empty flex flex-col items-center gap-space-sm text-center w-full"><b class="font-headline-sm text-headline-sm text-on-surface">${esc(d.empty.title)}</b><p class="sr-only">${esc(d.empty.body)}</p><a class="${CTA}" href="${d.empty.href}">${ms('play_arrow', 'text-[22px] ms-flip', true)}<span>${esc(d.empty.cta)}</span></a></div>`}</section>
${d.skills.length ? `<section class="rd-sec"><h2 class="rd-h sr-only">${esc(d.skH)}</h2><div class="rd-sk grid grid-cols-2 gap-3 w-full">${d.skills.map(tile).join('')}</div></section>` : ''}
${d.drill ? `<section class="rd-drill w-full"><span class="sr-only">${esc(d.drill.chip)}: ${esc(d.drill.body)}</span><a class="${CTA}" href="${d.drill.href}"><span>${esc(d.drill.title)}</span>${ms('bolt', 'text-[20px]', true)}</a></section>` : ''}
<a class="rd-mock ${TILE} !flex-row items-center justify-between gap-3" href="${d.mock.href}">${HL}<span class="flex items-center gap-3 min-w-0"><span class="w-10 h-10 rounded-lg bg-surface-container-high lt:bg-surface-container-highest text-secondary flex items-center justify-center shrink-0">${ms('timer', 'text-[24px]')}</span>
<span class="min-w-0"><b class="block font-title-pill text-title-pill text-on-surface truncate">${esc(d.mock.title)}</b><span class="sr-only">${esc(d.mock.chip)}${d.mock.sub ? ' · ' + esc(d.mock.sub) : ''}</span></span></span>
<span class="rd-mb shrink-0 w-10 h-10 rounded-lg bg-surface-container-high lt:bg-surface-container-highest text-secondary flex items-center justify-center" aria-hidden="true">${ms('event', 'text-[20px]')}</span><span class="sr-only">${esc(d.mock.cta)}</span></a></div>`;
})();
