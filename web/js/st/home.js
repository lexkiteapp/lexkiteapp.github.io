/* 🗺️ Stitch "IELTS Learning Path" → màn Học (Ux1.map). DOM + class Tailwind theo out/stitch/v1/…/ielts_learning_path/code.html (tối A)
 * + Option B (sáng, Stitch screen 07cb2d7c…: viền mảnh, bóng mềm → lớp lt:). Chữ = dữ liệu + t(); ảnh = bộ giáo viên 2D; không tim/kim cương;
 * chuyển động chỉ mờ dần (bỏ bounce/ping/pulse của mẫu). Móc test giữ nguyên: .ux1-home .ux1-unit .ux1-path .ux1-n.{done,next,lock} .lsn-dot .ux1-cta [data-ux1-cta]. */
(function () {
  const { esc, ms, CARD } = window.ST;
  // 🎨 Bộ linh kiện (gallery = nguồn duy nhất): nút bản đồ = BÓNG NHIỀU MÀU theo loại bài (Stitch "Study Deck"), giống nhau ở tối/sáng:
  // gradient + viền 2 px + gờ đậm 6 px + vệt bóng trắng; đã xong = huy hiệu ✓ trắng; đang khóa = giữ màu, phủ tối + ổ khóa giữa; hiện tại = vòng nét đứt + viên START.
  const XS = ['translate-x-0', 'translate-x-20', '-translate-x-20', 'translate-x-1', 'translate-x-20', '-translate-x-20']; // S-curve như mẫu
  const BALL = { // màu theo loại bài (class viết nguyên văn để Tailwind giữ)
    star: 'bg-gradient-to-b from-[#FFE082] to-[#FFC94A] border-[#D99B16] shadow-[0_6px_0_#A87105,0_10px_14px_rgba(217,155,22,0.3)]',
    headphones: 'bg-gradient-to-b from-[#51C6BD] to-[#2BA39A] border-[#176B65] shadow-[0_6px_0_#0F4945,0_10px_14px_rgba(23,107,101,0.25)]',
    mic: 'bg-gradient-to-b from-[#FF7B66] to-[#F2553B] border-[#B3311B] shadow-[0_6px_0_#7A1F0F,0_10px_14px_rgba(179,49,27,0.25)]',
    edit: 'bg-gradient-to-b from-[#FFC47D] to-[#FFB054] border-[#BA6F14] shadow-[0_6px_0_#7A3F00,0_10px_14px_rgba(186,111,20,0.3)]',
    call: 'bg-gradient-to-b from-[#74C5E4] to-[#3AAED8] border-[#206E8B] shadow-[0_6px_0_#154E63,0_10px_14px_rgba(58,174,216,0.2)]',
    radio: 'bg-gradient-to-b from-[#74C5E4] to-[#3AAED8] border-[#206E8B] shadow-[0_6px_0_#154E63,0_10px_14px_rgba(58,174,216,0.2)]',
    auto_stories: 'bg-gradient-to-b from-[#B992E7] to-[#9C6BD6] border-[#673E96] shadow-[0_6px_0_#4B2B70,0_10px_14px_rgba(156,107,214,0.2)]',
    replay: 'bg-gradient-to-b from-[#5EE099] to-[#2FBF71] border-[#1E7D4A] shadow-[0_6px_0_#125430,0_10px_14px_rgba(47,191,113,0.2)]',
    menu_book: 'bg-gradient-to-b from-[#51C6BD] to-[#2BA39A] border-[#176B65] shadow-[0_6px_0_#0F4945,0_10px_14px_rgba(23,107,101,0.25)]',
  };
  const ball = ic => BALL[ic] || BALL.star;
  const GLOSS = '<span class="absolute top-1 inset-x-3 h-4 rounded-full bg-white/40 pointer-events-none" aria-hidden="true"></span>';
  const stars = k => `<div class="flex items-center gap-1 mt-2" role="img" aria-label="${esc(t('{n}/3 sao', { n: k }))}">${[1, 2, 3].map(i => ms('star', 'text-[14px] ' + (i <= k ? 'text-[#FFC94A]' : 'text-outline-variant'), true)).join('')}</div>`;
  const LOCK = `<span class="absolute inset-0 rounded-[inherit] bg-black/25 flex items-center justify-center" aria-hidden="true"><span class="w-7 h-7 rounded-full bg-[#E9EFEB] border-2 border-[#94A3B8] shadow-[0_2px_0_#64748B] flex items-center justify-center">${ms('lock', 'ux1-lk text-[16px] text-[#475569]', true)}</span></span>`;
  function node(o, i) {
    const x = XS[i % 6], ic = o.icon || 'star';
    if (o.st === 'done') return `<li class="ux1-n done lsn-node relative z-10 mt-6 first:mt-2 flex flex-col items-center ${x}">
<span class="lsn-dot relative w-20 h-20 rounded-full border-2 flex items-center justify-center ${ball(ic)}" role="img" aria-label="${esc(o.label)} ✓">${GLOSS}${ms(ic, 'text-[36px] text-white drop-shadow-sm', true)}
<span class="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-[#FFC94A] border-2 border-surface flex items-center justify-center">${ms('check', 'text-[15px] text-[#3D2A00] font-bold')}</span></span>
${o.stars ? stars(o.stars) : ''}<span class="ux1-lbl sr-only">${esc(o.label)}</span></li>`;
    if (o.st === 'next') return `<li class="ux1-n next lsn-node relative z-20 mt-7 flex flex-col items-center ${x}">
<a class="lsn-start ux1-go relative -mb-3 z-30 min-h-[44px] min-w-[44px] flex flex-col items-center no-underline" href="${o.href}"><span class="px-5 h-9 rounded-full flex items-center gap-1.5 bg-gradient-to-br from-[#F2553B] to-[#FFB054] border-2 border-[#BA6F14] shadow-[0_4px_0_#8C4700,0_6px_16px_rgba(242,85,59,0.4)]">${ms('play_arrow', 'text-[18px] text-white', true)}<span class="font-title-pill text-title-pill font-extrabold tracking-wider text-white uppercase">${esc(o.start)}</span></span><span class="w-0 h-0 border-x-[6px] border-x-transparent border-t-[8px] border-t-[#BA6F14]" aria-hidden="true"></span></a>
<div class="relative p-2.5 rounded-full border-[3px] border-dashed border-[#FFB054] bg-[#FFB054]/10">${o.tch ? `<span class="absolute right-full mr-2 -bottom-1 w-[104px] h-[104px] rounded-full bg-secondary/20 lt:bg-secondary-container/15" aria-hidden="true"></span><img class="ux1-tch absolute right-full mr-4 -bottom-2 w-[92px] h-[124px] max-w-none object-contain object-bottom drop-shadow-md pointer-events-none" src="${esc(o.tch)}" alt="" width="92" height="124" decoding="async">` : ''}
<a class="lsn-dot relative w-24 h-24 rounded-full border-2 flex items-center justify-center active:translate-y-[3px] transition-transform ${ball(ic)}" href="${o.href}" aria-label="${esc(o.label)}"><span class="absolute top-1.5 inset-x-4 h-5 rounded-full bg-white/50 pointer-events-none" aria-hidden="true"></span>${ms(ic, 'text-[44px] text-white drop-shadow-md', true)}</a></div>
<span class="ux1-lbl sr-only">${esc(o.label)} · ${esc(o.sub)}</span></li>`;
    if (o.cp) return `<li class="ux1-n lock cp lsn-node relative z-10 mt-7 flex flex-col items-center ${x}">
<span class="lsn-dot relative w-24 h-24 rounded-2xl flex items-center justify-center bg-surface-container lt:bg-[#EDE6D8] border-2 border-outline-variant lt:border-[#D8CFBC] shadow-[0_7px_0_rgb(var(--st-lip-lock))] lt:shadow-[0_7px_0_#CBBFA6]" role="img" aria-label="${esc(o.label)}">${ms('trophy', 'text-[40px] text-outline lt:text-[#9A8F7A]', true)}<span class="absolute -top-1.5 -right-1.5 w-7 h-7 rounded-full bg-surface-container-highest lt:bg-white border-2 border-outline-variant flex items-center justify-center">${ms('lock', 'ux1-lk text-[15px] text-outline', true)}</span></span>
<b class="ux1-ms mt-2 px-3 py-0.5 rounded-full bg-[#FFE6A8] text-[#805500] border border-[#D99B16] font-label-badge text-label-badge font-extrabold uppercase tracking-wide">${esc(o.ms)}</b><span class="ux1-lbl sr-only">${esc(o.label)}</span></li>`;
    return `<li class="ux1-n lock lsn-node relative z-10 mt-6 flex flex-col items-center ${x}">
<span class="lsn-dot relative w-20 h-20 rounded-full flex items-center justify-center bg-surface-container lt:bg-[#EDE6D8] border-2 border-outline-variant lt:border-[#D8CFBC] shadow-[0_6px_0_rgb(var(--st-lip-lock))] lt:shadow-[0_6px_0_#CBBFA6]" role="img" aria-label="${esc(o.label)}">${ms('lock', 'ux1-lk text-[28px] text-outline lt:text-[#9A8F7A]', true)}</span>
<span class="ux1-lbl sr-only">${esc(o.label)} (${o.no})</span></li>`;
  }
  // d: { demoNote, exam, ucls, badge, meta, title, img, step, xpTo, pct, aria:{now,max}, coach:{name,tip}, chips, nodes, cta:{href,text} }
  window.ST.home = d => `<div class="st ux1-home st-fade bg-surface font-body-md text-on-surface antialiased"><div class="flex flex-col w-full px-margin max-w-md mx-auto relative select-none pt-4 pb-12">
${d.demoNote ? `<p class="text-center font-body-sm text-body-sm text-on-surface-variant m-0 mb-2">${esc(d.demoNote)}</p>` : ''}
${d.exam ? `<div class="mb-space-md">${d.exam}</div>` : ''}
<section class="ux1-unit ${d.ucls || ''} w-full rounded-2xl p-space-md mb-space-lg relative overflow-hidden bg-banner lt:bg-[#0F3D3E] border-2 border-secondary-container shadow-[0_5px_0_rgb(var(--st-banner-2))] lt:shadow-[0_5px_0_#082526]">
<div class="flex items-center justify-between gap-space-sm mb-3"><h1 class="min-w-0 font-headline-sm text-headline-sm text-white font-bold tracking-tight m-0 truncate"><span class="ux1-badge sr-only">${esc(d.badge)} · ${esc(d.meta)}: </span>${esc(d.title)}</h1>
<span class="shrink-0 px-2.5 py-0.5 rounded-full bg-black/25 text-[#FFC94A] font-label-badge text-label-badge font-extrabold" dir="ltr">${d.pct}%</span></div>
<div class="ux1-ubar w-full h-3 rounded-full bg-black/30 overflow-hidden" role="progressbar" aria-label="${esc(d.step)}" aria-valuemin="0" aria-valuemax="${d.aria.max}" aria-valuenow="${d.aria.now}"><div class="h-full rounded-full bg-gradient-to-r from-[#FFC94A] to-[#FFB054]" style="width:${Math.max(d.pct, 4)}%"></div></div>
<p class="ux1-hint sr-only">${esc(d.coach.name)}: ${esc(d.coach.tip)}${d.xpTo ? ' · ' + esc(d.xpTo) : ''}</p>
${d.chips && d.chips.length ? `<div class="ux1-uside mt-space-sm flex flex-wrap gap-2">${d.chips.map(c => c.href ? `<a class="ux1-chip inline-flex items-center gap-1 min-h-[44px] px-3 rounded-lg bg-black/20 text-white font-label-badge text-label-badge font-extrabold no-underline active:translate-y-[2px]" href="${c.href}">${ms(c.icon, 'text-[16px]')}${esc(c.text)}</a>` : `<span class="ux1-chip sr-only" title="${esc(c.title || '')}">${esc(c.title || '')} ${esc(c.text)}</span>`).join('')}</div>` : ''}</section>
<section class="relative w-full flex flex-col items-center py-4"><ol class="ux1-path lsn-path relative w-full flex flex-col items-center list-none m-0 p-0">${d.nodes.map(node).join('')}</ol></section>
<div class="ux1-cta sticky bottom-4 z-40 w-full pt-2"><a class="w-full h-16 rounded-2xl bg-gradient-to-r from-primary-container to-[#FFB054] text-on-primary-container flex items-center justify-center gap-2 no-underline shadow-[0_6px_0_rgb(var(--st-lip-primary)),0_12px_24px_rgba(242,85,59,0.3)] active:translate-y-1 active:shadow-[0_2px_0_rgb(var(--st-lip-primary))] transition-all" href="${d.cta.href}" data-ux1-cta>${ms('play_arrow', 'text-[26px] ms-flip', true)}<span class="font-headline-sm text-headline-sm font-extrabold uppercase tracking-wider">${esc(d.cta.text)}</span></a></div>
</div></div>`;
  // Thẻ kỳ thi (giữ từ bản cũ – không cắt): vòng % mục tiêu · kỳ thi + điểm · nút Thi thử (kiểu nút "Schedule" của Stitch)
  // @icons military_tech trophy play_arrow local_library explore school work star headphones mic replay auto_stories radio menu_book edit call emoji_events check account_balance forum flag
  window.ST.exam = e => `<section class="ux1-exam ${e.cls || ''} flex items-center gap-3 bg-surface-container-low lt:bg-surface-container rounded-2xl p-2 pl-3 ${CARD}" data-ux1-exam>
${e.p != null ? `<svg class="ux1-ring w-11 h-11 shrink-0 -rotate-90" viewBox="0 0 48 48" role="img" aria-label="${e.p}%"><circle cx="24" cy="24" r="20" fill="none" stroke="rgb(var(--st-surface-container-highest))" stroke-width="5"/><circle cx="24" cy="24" r="20" fill="none" stroke="rgb(var(--st-secondary))" stroke-width="5" stroke-linecap="round" style="stroke-dasharray:${e.C};stroke-dashoffset:${e.off}"/></svg>` : `<span class="w-11 h-11 rounded-full bg-secondary/15 text-secondary flex items-center justify-center shrink-0">${ms(e.icon || 'school', 'text-[22px]')}</span>`}
<a class="ux1-exam-tx flex-1 min-w-0 flex flex-col justify-center min-h-[44px] no-underline" href="#/goal"><b class="font-title-pill text-title-pill text-on-surface">${esc(e.title)}</b><small class="font-body-sm text-body-sm text-on-surface-variant truncate">${esc(e.sub)}</small></a>
<a class="ux1-mock shrink-0 px-4 h-11 rounded-full bg-surface-container-high lt:bg-surface border-2 border-b-4 border-outline-variant active:border-b-2 text-on-surface font-label-badge text-label-badge uppercase tracking-wider font-bold shadow-sm active:translate-y-0.5 transition-transform flex items-center gap-1 no-underline" href="${e.href}">${ms('flag', 'text-[16px] text-secondary', true)}<span>${esc(e.mock)}</span></a></section>`;
  // Đường mòn chữ S (mẫu Stitch: vệt nền dày 12 + vệt teal gạch 8/8 dày 5 tới nút hiện tại), tọa độ đo từ tâm các nút thật
  window.ST.trail = (ol, at) => {
    const b = ol.getBoundingClientRect(), P = [...ol.querySelectorAll('.lsn-dot')].map(d => { const r = d.getBoundingClientRect(); return [Math.round(r.left + r.width / 2 - b.left), Math.round(r.top + r.height / 2 - b.top)]; });
    if (P.length < 2) return; let all = `M${P[0][0]} ${P[0][1]}`, dn = all;
    for (let i = 1; i < P.length; i++) { const [x0, y0] = P[i - 1], [x1, y1] = P[i], m = (y0 + y1) / 2, c = `C${x0} ${m} ${x1} ${m} ${x1} ${y1}`; all += c; if (i <= at) dn += c; }
    const old = ol.querySelector('.ux1-trail'); if (old) old.remove();
    ol.insertAdjacentHTML('afterbegin', `<svg class="ux1-trail absolute top-0 left-0 w-full pointer-events-none z-0" style="height:${Math.ceil(b.height)}px" fill="none" aria-hidden="true" focusable="false"><path d="${all}" stroke="rgb(var(--st-lip-lock))" stroke-linecap="round" stroke-width="20" transform="translate(0,6)"/><path d="${all}" stroke="rgb(var(--st-trail))" stroke-linecap="round" stroke-width="16"/>${at ? `<path d="${dn}" stroke="#2BA39A" stroke-dasharray="8 6" stroke-linecap="round" stroke-width="12"/>` : ''}</svg>`); // mẫu Study Deck: rãnh dày có gờ + vệt teal gạch đã học
  };
})();
