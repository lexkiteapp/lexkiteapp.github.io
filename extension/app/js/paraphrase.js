/* 🔁 Luyện paraphrase (#/paraphrase): kỹ năng quyết định band Reading – nhận ra cách bài đọc DIỄN ĐẠT LẠI từ khóa của câu hỏi.
 * Dữ liệu: cặp [cụm trong câu hỏi, cách diễn đạt trong bài] từ lời giải đề Reading (READ_EXPLAIN, tự biên soạn).
 * Chỉ lấy câu có đáp án khớp nghĩa (dữ liệu gọn ~50 KB, không tải cả bộ đề) (bỏ TRUE/FALSE/NOT GIVEN mang nghĩa mâu thuẫn/không có) để luyện đúng paraphrase đồng nghĩa. */
(function () {
  const { $, $$, esc } = UI;
  const App = window.App;
  const { routes } = App;
  const view = App.view;

  // Dữ liệu sinh sẵn: scripts/gen-paraphrase.mjs (lọc câu FALSE/NO/NOT GIVEN, bỏ trùng)
  // Lọc cặp không dùng để luyện được (soát 20/10): còn chỗ trống "___", ghép rời "… / …", hoặc gần như chép lại nguyên chữ câu hỏi (không phải paraphrase)
  const STOP = new Set('more less than that this with from their have been which about into over some such them they were will would'.split(' '));
  const keyw = s => (s.toLowerCase().match(/[a-z]+/g) || []).filter(w => w.length > 3 && !STOP.has(w));
  const usable = (q, p) => { if (/_{2,}|\.\.\.|…|\//.test(q + p) || p.length > 90) return false; const a = new Set(keyw(q)), b = keyw(p); return !b.length || b.filter(w => a.has(w)).length / Math.min(a.size || 1, b.length) < 0.6; };
  const pairs = () => (window.PARAPHRASE || []).filter(([q, p]) => usable(q, p)).map(([q, p]) => ({ q, p }));

  routes.paraphrase = function () {
    const all = pairs();
    if (all.length < 8) { view.innerHTML = `<div class="card empty">${t('Đang cập nhật dữ liệu…')}</div>`; return; }
    const round = UI.shuffle(all.slice()).slice(0, 10);
    let i = 0, right = 0;
    const draw = () => {
      if (i >= round.length) {
        const pct = Math.round(right / round.length * 100);
        App.reward({ quizzes: 1, readings: 0, xp: 5 + right * 2 }); if (pct >= 80) Sfx.win();
        view.innerHTML = `<div class="study-wrap"><div class="card celebrate empty"><div class="em">🔁</div><h2>${t('{right}/{total} đúng ({pct}%)', { right, total: round.length, pct })}</h2><p class="muted">${t('Nhận ra paraphrase nhanh là chìa khóa để làm Reading đúng và kịp giờ.')}</p><button class="btn primary" id="ppAgain">↻ ${t('Luyện tiếp')}</button> <a class="btn" href="#/skill/reading">${t('Về Reading')}</a></div></div>`;
        $('#ppAgain').onclick = () => routes.paraphrase();
        return;
      }
      const it = round[i], opts = UI.shuffle([it.p, ...UI.shuffle(all.filter(x => x.p !== it.p && x.q !== it.q && Math.abs(x.p.length - it.p.length) < 40)).slice(0, 3).map(x => x.p)]);
      view.innerHTML = `<div class="study-wrap"><div class="study-top"><a class="icon-btn" href="#/skill/reading">✕</a><div class="progress"><i style="width:${i / round.length * 100}%"></i></div><span class="small muted">${i + 1}/${round.length}</span></div>
        <div class="card q-card"><div class="tiny muted">🔁 ${t('Luyện paraphrase')}</div>
          <p style="margin:.6rem 0 .2rem">${t('Câu hỏi viết:')}</p><div class="pp-q" translate="no">“${esc(it.q)}”</div>
          <p style="margin:1rem 0 .4rem">${t('Bài đọc sẽ diễn đạt lại ý này là:')}</p>
          <div class="options">${opts.map(o => `<button class="option" data-o="${esc(o)}" translate="no">${esc(o)}</button>`).join('')}</div>
          <div id="ppFb" style="margin-top:.8rem"></div></div></div>`;
      $$('[data-o]').forEach(b => b.onclick = () => {
        const ok = b.dataset.o === it.p; if (ok) right++;
        $$('[data-o]').forEach(x => { x.disabled = true; if (x.dataset.o === it.p) x.classList.add('correct'); else if (x === b) x.classList.add('wrong'); });
        ok ? Sfx.correct() : Sfx.wrong();
        $('#ppFb').innerHTML = `<div class="feedback ${ok ? 'ok' : 'no'}" style="position:static"><i translate="no">${esc(it.q)}</i> ≈ <b translate="no">${esc(it.p)}</b> <button class="btn sm primary" id="ppNext" style="margin-left:.6rem">${t('Tiếp')} →</button></div>`;
        $('#ppNext').onclick = () => { i++; draw(); };
      });
    };
    draw();
  };
})();
