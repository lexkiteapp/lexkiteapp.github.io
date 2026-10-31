/* 🎨 Stitch v2.1 "Sổ lỗi sai" (#/mistakes, cờ ux1): khung tự sinh web/js/st/v2/mistakes.js · brand/stitch/v2/bind/mistakes.json. Tải trong gói ux1 (lười, không vào khung app).
 * Bao routes.mistakes của plan.js: cờ ux1 bật → khung Stitch; tắt → trang cũ nguyên vẹn. Dữ liệu + thao tác dùng CHUNG với trang cũ (App.mistakesOpen / mistakeView /
 * mistakeSettle / mistakeClearFixed / mistakeCheck). Giữ MỌI ý trang cũ: tiêu đề + mô tả (lời cô Ama, tư thế thinking qua Chars) · Làm lại lỗi sai ⇄ Xem danh sách ·
 * Ôn từ sắp quên · #clearFixed (toast Đã dọn) · #mTabs (data-k, .on) Tất cả + 4 loại có đếm · #mList: loại, sai n lần · ngày, câu hỏi (+IPA, 1 loa), Câu trả lời của bạn ✗ /
 * Đáp án ✓ (+IPA, loa), giải thích, [data-fix] Đã hiểu (+2 XP), Xem lại bài / Tra lại từ / [data-add-seed] Flashcard / Đọc lại bài / Nghe lại phần này ·
 * ?retry=1: sai nhiều nhất lên trước, [data-rt] ô gõ [data-in] + [data-chk] (đáp án ≤ 4 chữ) hoặc [data-show], đáp án [data-ans] ẩn tới khi trả lời,
 * [data-self] Mình làm đúng [data-ok] / Vẫn sai [data-no] (đúng: +3 XP, gỡ khỏi sổ; sai: +1 lần sai) · trống → thẻ "Không có lỗi sai nào cần xem lại."
 * @icons arrow_back local_fire_department bolt smart_toy list arrow_forward replay done_all spellcheck auto_stories menu_book headphones record_voice_over volume_up close check lightbulb psychology verified add celebration */
(function () {
  const App = window.App; if (!App || !App.routes || !App.routes.mistakes || !App.mistakesOpen) return;
  const { routes } = App, old = routes.mistakes, esc = UI.esc, $$ = (s, r) => [...r.querySelectorAll(s)];
  const on = () => !!(self.ST2 && ST2.mistakes && App.ux1On && App.ux1On());
  // icon Material + tên loại + khuôn thẻ Stitch (g = thẻ 1 teal, v = thẻ 2 amber, o = thẻ 3)
  const KIND = () => ({ vocab: ['auto_stories', t('Từ vựng'), 'v'], grammar: ['spellcheck', t('Ngữ pháp'), 'g'], reading: ['menu_book', t('Đọc hiểu'), 'o'], listening: ['headphones', t('Nghe'), 'o'] });
  // class viết tay (biên dịch nhờ V2DATA trong scripts/build-stitch-css.mjs) – màu lấy đúng từ mẫu Stitch sáng/tối
  const BLANK = 'inline-block px-3 py-0.5 mx-1 border-b-2 border-dashed rounded font-semibold lt:border-[#0D6964] lt:bg-white/70 lt:text-[#0D6964] dk:[background-color:rgba(43,163,154,0.15)] dk:[border-color:#2BA39A] dk:[color:#2BA39A]';
  const TIPB = 'font-bold lt:text-[#613f00] dk:[color:#FFDF9E]';
  const IPAW = 'ms-1 text-[11px] leading-[14px] tracking-[0.04em] font-[700] whitespace-nowrap lt:text-[#4E5F62] dk:[color:#A9BFC1] [&_.ipa]:[color:inherit]';
  const SMALL = "relative after:absolute after:-inset-3 after:content-[''] px-2.5 py-1 rounded-[0.5rem] text-[11px] leading-[14px] tracking-[0.04em] font-[700] inline-flex items-center gap-1 transition-colors lt:bg-[#f2f4f3] lt:border lt:border-[#E2E8E7] lt:text-[#4E5F62] lt:hover:text-[#0D6964] dk:[background-color:#1A2C33] dk:[border:1px_solid_#2A434D] dk:[color:#EEF6F7]";
  const PRIMARY = 'shrink-0 min-h-[44px] px-3.5 rounded-[0.75rem] text-white text-[13px] font-[700] flex items-center gap-1 shadow-xs tactile-btn lt:bg-[#0D6964] lt:border-b-[3px] lt:border-b-[#084744] dk:[background-color:#12514D] dk:[border:1px_solid_#2BA39A] dk:[border-bottom:3px_solid_#084744]';
  const INPUT = 'flex-1 min-w-0 h-11 px-3 rounded-[0.75rem] text-[16px] font-bold outline-none lt:bg-[#FFFFFF] lt:border lt:border-[#E2E8E7] lt:border-b-[3px] lt:border-b-[#D5DEDC] lt:text-[#10191B] lt:placeholder:text-[#4E5F62] dk:[background-color:#142328] dk:[border:1px_solid_#233942] dk:[border-bottom:3px_solid_#0c181c] dk:[color:#EEF6F7] dk:placeholder:[color:#A9BFC1]';
  const EMPTY = 'rounded-2xl p-6 flex flex-col items-center gap-2 text-center lt:bg-[#FFFFFF] lt:border lt:border-[#E2E8E7] lt:border-b-[5px] lt:border-b-[#D5DEDC] dk:[background-color:#142328] dk:[border:1px_solid_#233942] dk:[border-bottom:5px_solid_#0c181c]';
  const isEn = s => /[a-z]{2}/i.test(s) && /^[\x20-\x7E‘’“”–—…]+$/.test(s);
  const hide = el => { if (el.hidden) return; el.dataset.d = el.style.display || ''; el.style.display = 'none'; el.hidden = true; };
  const show = el => { if (!el.hidden) return; el.style.display = el.dataset.d || ''; el.hidden = false; };
  // 1 loa / thẻ như UI.sayBtn: từ/cụm ngắn → data-speak, câu → data-speak-text; rỗng → gỡ nút (không để móc rỗng)
  const say = (b, a) => { const s = String(b.getAttribute(a) || '').trim(); b.removeAttribute(a); if (!s) { b.remove(); return; } b.setAttribute(s.split(/\s+/).length > 3 || /[.!?]$/.test(s) ? 'data-speak-text' : 'data-speak', s); };

  routes.mistakes = App.guard(async function (arg, query) {
    if (!on()) return old.apply(this, arguments);
    const w = App.W, retry = !!(query && query.get && query.get('retry'));
    const open = await App.mistakesOpen(w), view = App.view, K = KIND();
    let k = '';
    const row = x => {
      const v = App.mistakeView(x), kd = K[x.kind], ref = x.ref ? String(x.ref) : '', ansEn = !!(v.ans && isEn(v.ans)), short = String(x.answer || '').split(/\s+/).length <= 4;
      const src = !ref ? null : x.kind === 'grammar' ? ['#/grammar/' + ref, t('Xem lại bài')] : x.kind === 'vocab' ? ['#/dict/' + encodeURIComponent(ref), t('Tra lại từ')] : x.kind === 'reading' ? ['#/read/' + ref, t('Đọc lại bài')] : x.kind === 'listening' ? ['#/listen/' + ref, t('Nghe lại phần này')] : null;
      const qH = esc(v.q).replace(/_{2,}/g, u => `<span class="${BLANK}">${u}</span>`) + (v.qIpa ? `<span class="${IPAW}" lang="en" dir="ltr">${UI.ipaTag(v.qIpa)}</span>` : '');
      const key = esc(x.key);
      return { key: x.key, kind: x.kind, v: kd ? kd[2] : 'o', icon: kd ? kd[0] : 'record_voice_over', kindL: kd ? kd[1] : String(x.kind || ''),
        meta: `${t('sai {n} lần', { n: x.n || 1 })} • ${new Date(x.at).toLocaleDateString(I18N.lang())}`,
        qSay: v.qSay, qH, given: v.given, ans: v.ans, ansLang: ansEn ? 'en' : I18N.lang(), ansDir: ansEn ? 'ltr' : 'auto', ansIpaH: v.ansIpa ? UI.ipaTag(v.ansIpa) : '', ansSay: v.ansSay,
        tip: v.tip, tipH: `<strong class="${TIPB}">${esc(t('Mẹo:'))}</strong> ${esc(v.tip)}`,
        srcHref: src ? src[0] : '', srcL: src ? src[1] : '', seed: x.kind === 'vocab' && ref && !App.inDeck(ref) ? ref : '',
        rtH: !retry ? '' : `<div class="flex items-center gap-2" data-rt="${key}">${short ? `<input class="${INPUT}" data-in placeholder="${esc(t('Gõ đáp án của bạn'))}" aria-label="${esc(t('Gõ đáp án của bạn'))}" autocomplete="off" autocapitalize="off" spellcheck="false"><button type="button" class="${PRIMARY}" data-chk><span class="material-symbols-outlined text-[16px]" aria-hidden="true">check</span><span>${esc(t('Kiểm tra'))}</span></button>` : `<button type="button" class="${PRIMARY}" data-show><span>${esc(t('Hiện đáp án'))}</span></button>`}</div>`,
        selfH: !retry ? '' : `<div class="flex flex-wrap items-center gap-2" data-ans data-self><button type="button" class="${SMALL}" data-ok><span class="material-symbols-outlined text-[14px]" aria-hidden="true">check</span>${esc(t('Mình làm đúng'))}</button><button type="button" class="${SMALL}" data-no><span class="material-symbols-outlined text-[14px]" aria-hidden="true">close</span>${esc(t('Vẫn sai'))}</button></div>` };
    };
    const data = () => {
      const rows = open.filter(x => !k || x.kind === k);
      if (retry) rows.sort((a, b) => (b.n || 1) - (a.n || 1)); // làm lại: câu sai nhiều lần nhất lên trước
      return {
        backL: t('Trở về trang trước'), title: t('Sổ lỗi sai'), countL: t('{n} lỗi cần xem lại', { n: open.length }), open: open.length,
        tch: Chars.img('ama', { kind: 'still', pose: 'thinking', cls: 'absolute inset-0 w-full h-full object-cover object-bottom pointer-events-none select-none', alt: '', size: 88 }), // teacher-pose-map: Ama "thinking" – cùng xem lại lỗi
        desc: t('Mọi câu bạn làm sai đều được ghi lại tự động. Ôn lại lỗi sai là cách tăng điểm nhanh nhất – xem lại vì sao sai rồi đánh dấu “Đã hiểu”.'), who: t('Cô {name} • Lexkite', { name: Chars.name('ama') }),
        ctaHref: retry ? '#/mistakes' : '#/mistakes?retry=1', ctaIcon: retry ? 'list' : 'smart_toy', ctaL: retry ? t('Xem danh sách') : t('Làm lại lỗi sai'),
        forgetL: t('Ôn từ sắp quên'), clearL: t('Dọn lỗi đã sửa'), tabsL: t('Loại lỗi'), sayL: t('Phát âm'),
        kinds: [{ k: '', label: t('Tất cả'), n: open.length, on: !k }].concat(Object.entries(K).map(([kk, [, n]]) => ({ k: kk, label: n, n: open.filter(x => x.kind === kk).length, on: kk === k }))),
        rows: rows.map(row),
        emptyH: rows.length ? '' : `<div class="${EMPTY}" data-m-empty><span class="material-symbols-outlined text-[32px] lt:text-[#0D6964] dk:[color:#2BA39A]" aria-hidden="true">celebration</span><p class="text-[16px] leading-[24px] font-medium lt:text-[#10191B] dk:[color:#EEF6F7]">${esc(t('Không có lỗi sai nào cần xem lại.'))}</p></div>`,
      };
    };
    const draw = () => {
      if (w.stale()) return;
      const root = ST2.mount(view, 'mistakes', data(), 'me'), $r = s => root.querySelector(s);
      { const sh = root.querySelector(':scope > header'); if (sh && root.querySelector(':scope > div > header')) sh.remove(); } // mẫu có đầu trang riêng (quay lại + tiêu đề + chuỗi/XP) → bỏ đầu trang shell cố định đang che nó; thanh tab dưới giữ
      $$('[data-qsay]', root).forEach(b => say(b, 'data-qsay'));
      $$('[data-asay]', root).forEach(b => say(b, 'data-asay'));
      $$('#mTabs [data-k]', root).forEach(b => b.onclick = () => { k = b.dataset.k; draw(); });
      $r('#clearFixed').onclick = async () => { await App.mistakeClearFixed(); UI.toast(t('Đã dọn')); };
      App.bindCommon(); UI.fillIpa($r('#mList'));
      const settle = async (card, key, ok) => {
        await App.mistakeSettle(key, ok);
        if (ok) { App.reward({ xp: 3 }, card); Sfx.correct(); card.style.opacity = '.5'; setTimeout(() => card.remove(), 600); } else Sfx.wrong();
      };
      $$('#mList [data-mk]', root).forEach(card => {
        const key = card.dataset.mk, it = open.find(x => x.key === key), box = card.querySelector('[data-rt]');
        if (box) { // làm lại: tự nhớ đáp án trước khi xem (active recall)
          const ans = $$('[data-ans]', card), self = card.querySelector('[data-self]');
          ans.forEach(hide);
          const reveal = () => { ans.forEach(a => { if (a !== self || !a.dataset.done) show(a); }); hide(box); };
          const sh = box.querySelector('[data-show]'); if (sh) sh.onclick = reveal;
          const chk = box.querySelector('[data-chk]'), inp = box.querySelector('[data-in]');
          if (chk) { const go = () => { const ok = App.mistakeCheck(inp.value, it.answer); if (self) self.dataset.done = '1'; reveal(); if (self) hide(self); settle(card, key, ok); }; chk.onclick = go; inp.onkeydown = e => { if (e.key === 'Enter') go(); }; }
          const okB = card.querySelector('[data-ok]'), noB = card.querySelector('[data-no]');
          if (okB) okB.onclick = () => settle(card, key, true);
          if (noB) noB.onclick = () => { settle(card, key, false); hide(self); };
        }
        const fx = card.querySelector('[data-fix]');
        fx.onclick = async () => { await App.mistakeSettle(key, true); App.reward({ xp: 2 }, fx); card.remove(); };
      });
    };
    draw();
  });
})();
