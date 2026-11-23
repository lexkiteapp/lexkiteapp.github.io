/* 🏁 Màn kết chung của mini-game (docs/specs/game-system.md P3) trên khung Stitch 'lesson-complete' – cùng khung với màn kết bài học
   (lesson/ui.js finishV2) và Luyện tiếng Tây Ban Nha (espr.js App.esEnd). Gói lười 'gend'. Người gọi tự thưởng XP (App.reward) trước khi gọi.
   GameEnd.show(view, o) – o = {
     chip, head,            // nhãn chế độ (chip trên) · dòng tiêu đề (kỷ lục / thắng thách đấu…)
     acc, xp,               // % chính xác (vòng ngoài + nhãn) · XP đã thưởng
     tiles: [[giá trị, nhãn]…] ≤ 4 – ô nào không có số thật thì không truyền (ẩn, không vẽ số giả)
     ring2,                 // 0..1 vòng trong (bỏ trống → ẩn vòng trong)
     sub, more, words,      // câu khen · HTML phụ (từ cần ôn…) · từ chạm để nghe [{ word }]
     again: { label, fn }, rev: { label, href, icon }, share: { label, fn }, icon, close, good
   } → trả về gốc màn. Chấm tuần/chuỗi = Game.weekDots/runOf (một luật với bài học). */
(function (g) {
  const t = (s, v) => (g.t ? g.t(s, v) : s);
  const unit = (n, u) => { try { return new Intl.NumberFormat((g.I18N && I18N.lang && I18N.lang()) || undefined, { style: 'unit', unit: u, unitDisplay: 'long' }).format(n).replace(/^(?!.*\p{Nd})(.*)$/u, m => n + ' ' + m); } catch (e) { return n + ' ' + u; } }; // như lesson/ui.js unitFmt
  // Dòng phụ dưới danh sách từ ("Từ cần ôn lại: …") – đúng lớp màn kết bài học (lesson/ui.js finishV2 ROW, đã có trong st-v2-lesson-complete.css)
  const row = (icon, label, html) => `<span class="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-[15px] leading-5 font-bold lt:text-[#0F3D3E] dk:text-[#EEF6F7] font-medium"><span class="inline-flex items-start gap-1"><span class="material-symbols-outlined text-[16px]" aria-hidden="true">${icon}</span><span>${UI.esc(label)} ${html}</span></span></span>`;
  function paint(root, W) { // 7 chấm tuần (T2 → CN): lấy lớp "sáng/tắt" có sẵn của khung Stitch, không thêm CSS
    const wd = root.querySelectorAll('.lsn-week > div:nth-child(2) > div'), lang = document.documentElement.lang || 'en';
    if (wd.length !== 7) return;
    const onD = wd[0].firstElementChild, offD = wd[6].firstElementChild, onC = onD.className, onH = onD.innerHTML, offC = offD.className, offH = offD.innerHTML, onL = wd[0].lastElementChild.className, offL = wd[6].lastElementChild.className, todL = wd[5].lastElementChild.className;
    wd.forEach((el, i) => { const dot = el.firstElementChild, lab = el.lastElementChild; dot.className = W.on[i] ? onC : offC; dot.innerHTML = W.on[i] ? onH : offH; lab.className = i === W.today ? todL : W.on[i] ? onL : offL; try { lab.textContent = new Intl.DateTimeFormat(lang, { weekday: 'narrow' }).format(W.days[i]); } catch (e) { lab.textContent = ''; } if (i === W.today && W.on[i]) dot.classList.add('ring-2', 'ring-offset-1', 'ring-[#F2553B]'); });
  }
  function show(view, o) {
    const acc = Math.max(0, Math.min(100, Math.round(o.acc || 0))), tiles = (o.tiles || []).slice(0, 4), words = (o.words || []).map(w => ({ card: { word: w.word || w } }));
    const act = g.App && App.activeDays ? App.activeDays() : new Set(), now = new Date(), key = g.Core.todayKey, W = g.Game.weekDots(act, now, key), run = Math.max(g.App && App.streak ? App.streak() : 0, g.Game.runOf(act, now, key));
    const d = { close: o.close || '#/practice', chip: o.chip, acc: acc + '%', xpL: '+' + (o.xp | 0) + ' XP',
      combo: '', first: '', mins: '', nwords: '', streakT: t('Chuỗi hiện tại') + ': ' + unit(run, 'day'), weekN: t('Tuần này') + ': ' + unit(W.n, 'day'), streak: String(run), off1: Math.round(201.06 * (1 - acc / 100) * 100) / 100, off2: Math.round(144.51 * (1 - Math.max(0, Math.min(1, o.ring2 == null ? 1 : o.ring2))) * 100) / 100,
      sub: o.sub || (acc >= 80 ? t('Tuyệt vời!') : t('Làm tốt lắm, cứ tiếp tục nhé!')), learned: ' ', more: o.more || '', wl: words,
      rev: o.rev ? o.rev.label : t('Chế độ khác'), revHref: o.rev ? o.rev.href : '#/practice', revIcon: o.rev ? o.rev.icon || 'apps' : 'apps' };
    const root = ST2.mount(view, 'lesson-complete', d, null); root.id = 'lsn'; root.classList.add('lsn-v2', 'lsn-end', 'st-end', 'gend');
    try { window.scrollTo(0, 0); } catch (e) { /* bỏ qua */ }
    const h1 = root.querySelector('h1'); if (h1 && o.head) { h1.textContent = o.head; h1.setAttribute('dir', 'auto'); }
    root.querySelectorAll('.lsn-tiles > div').forEach((el, i) => { const x = tiles[i]; if (!x) { el.hidden = true; return; } el.children[0].textContent = String(x[0]); el.children[0].setAttribute('dir', 'ltr'); el.children[1].textContent = x[1]; });
    if (o.ring2 == null) root.querySelectorAll('.lsn-ring svg > circle:nth-child(n+3)').forEach(c => { c.style.display = 'none'; });
    paint(root, W);
    const tch = root.querySelector('#lsnTch'); if (tch) tch.innerHTML = `<span style="display:flex;height:100%;align-items:flex-end;justify-content:center;font-size:44px;line-height:1" aria-hidden="true">${o.icon || '🎮'}</span>`;
    root.querySelectorAll('.lsn-sub [data-say]').forEach(b => { b.onclick = () => { try { UI.speak(b.dataset.say); } catch (e) { /* bỏ qua */ } }; });
    const ag = root.querySelector('#lsnAgain'), cta = root.querySelector('.lsn-cta');
    if (cta) cta.insertAdjacentHTML('beforebegin', '<div class="celebrate gend-pr" style="text-align:start"></div>'); // khe cho path-reward.js (tiến độ bước trong bài Lộ trình, gắn vào .celebrate sau lexkite:practice-done)
    if (ag) { const sp = ag.querySelector('span'); if (sp && sp.firstChild && sp.firstChild.nodeType === 3) sp.firstChild.textContent = ' ' + ((o.again && o.again.label) || t('Chơi lại')) + ' '; ag.onclick = o.again && o.again.fn; }
    const sh = root.querySelector('#lsnShare'); if (sh) { if (o.share) { sh.setAttribute('aria-label', o.share.label); sh.title = o.share.label; sh.onclick = o.share.fn; } else sh.remove(); }
    try { if (g.Sfx) Sfx.finish({ pct: acc, xp: o.xp, good: o.good == null ? 80 : o.good }); } catch (e) { /* bỏ qua */ } // âm thắng + pháo giấy (một chỗ, game.js)
    if (g.Feel && Feel.on && Feel.count) { const x = root.querySelector('.lsn-xp > span'); if (x) Feel.count(x, o.xp | 0, { prefix: '+', suffix: ' XP', from: 0 }); }
    if (ag) ag.focus({ preventScroll: true });
    return root;
  }
  g.GameEnd = { show, row };
})(typeof self !== 'undefined' ? self : this);
