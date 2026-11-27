/* 🌱 Bài đầu 60 giây (tải lười – gói 'firstlesson'): người dùng mới nếm 1 bài NGAY, trước màn thiết lập (mục tiêu/trình độ).
 * 5 câu chọn hình (3 đọc chữ → hình, 2 nghe → hình) – KHÔNG cần dịch nghĩa nên chạy đúng ở cả 15 ngôn ngữ giao diện.
 * Phản hồi tức thì (âm + màu + hiện đáp án), chạm lại không đếm, không phạt; xong → Kit chúc mừng → màn thiết lập.
 * Kill switch: localStorage 'vb.noFirstLesson' = '1' hoặc ?nofl=1. Bỏ qua được bất cứ lúc nào. Sự kiện đo: App.habTrack('onb_fl_start|done|skip').
 * Không gọi t() lúc nạp module. Hiệu ứng tắt khi prefers-reduced-motion. Thiết kế riêng của Lexkite (Kit là nhân vật của mình). */
(function (g) {
  'use strict';
  const d = g.document;
  const T = (k, v) => (g.t ? g.t(k, v) : k);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ls = (k, v) => { try { if (v === undefined) return g.localStorage.getItem('vb.' + k); if (v === null) g.localStorage.removeItem('vb.' + k); else g.localStorage.setItem('vb.' + k, v); } catch (e) { return null; } };
  const ITEMS = [['apple', '🍎'], ['book', '📖'], ['water', '💧'], ['house', '🏠'], ['dog', '🐶'], ['sun', '☀️'], ['tree', '🌳'], ['car', '🚗'], ['cat', '🐱'], ['moon', '🌙']];
  const N = 5, CHOICES = 3;
  function enabled() {
    if (ls('noFirstLesson') === '1' || /[?&]nofl=1/.test(g.location.search + g.location.hash)) return false;
    if (/jsdom/i.test(g.navigator.userAgent) || /[?&](sandbox|demo)=/.test(g.location.search)) return false; // test jsdom/sandbox đi thẳng thiết lập
    return !ls('firstLessonDone');
  }
  const ev = (name) => { try { if (g.App && g.App.habTrack) g.App.habTrack('onb_' + name); } catch (e) { /* bỏ qua */ } }; // phễu hit.js (ONB_EV phải có onb_fl_start/onb_fl_done/onb_fl_skip)
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const css = `.fl{max-width:560px;margin:0 auto}.fl-bar{height:10px;border-radius:99px;background:var(--border,#e5e7eb);overflow:hidden}.fl-bar i{display:block;height:100%;width:0;background:linear-gradient(90deg,#1F7A72,#F5B83D);transition:width .35s}
.fl-word{font-size:2.2rem;font-weight:800;text-align:center;margin:1rem 0}.fl-ch{display:grid;grid-template-columns:repeat(3,1fr);gap:.7rem}.fl-ch button{font-size:2.6rem;padding:.9rem .2rem;min-height:84px;border-radius:16px;border:2px solid var(--border,#e5e7eb);background:var(--card,#fff);cursor:pointer}
.fl-ch button.right{border-color:#1F7A72;background:#E3F4EF}.fl-ch button.wrong{border-color:#D9534F;background:#FBE9E8}.fl-ch button:disabled{cursor:default}
@media (prefers-reduced-motion: reduce){.fl-bar i{transition:none}}`;
  /** run(view, done) – vẽ vào view; done() khi xong/bỏ qua (gọi đúng 1 lần). */
  function run(view, done) {
    let i = 0, hits = 0, finished = false;
    const t0 = Date.now();
    const qs = shuffle(ITEMS).slice(0, N).map((it, k) => ({ it, listen: k >= 3, opts: shuffle([it].concat(shuffle(ITEMS.filter(x => x !== it)).slice(0, CHOICES - 1))) }));
    const end = (how) => { if (finished) return; finished = true; ls('firstLessonDone', '1'); if (how === 'skip') ev('fl_skip'); done(); };
    const head = () => `<style>${css}</style><div class="row between"><div class="fl-bar" style="flex:1;margin-right:.8rem" role="progressbar" aria-valuemin="0" aria-valuemax="${N}" aria-valuenow="${i}"><i style="width:${i / N * 100}%"></i></div><button type="button" class="btn ghost sm" id="flSkip">${T('Bỏ qua')}</button></div>`;
    const say = w => { try { g.UI && g.UI.speak && g.UI.speak(w, 'en'); } catch (e) { /* bỏ qua */ } };
    const draw = () => {
      if (i >= N) return fin();
      const q = qs[i], w = q.it[0];
      view.innerHTML = `<div class="fl stack">${head()}
        <div class="kit-say center" style="margin-top:.6rem">${q.listen ? '🔊 ' + T('Nghe và chọn hình đúng') : T('Chọn hình đúng với từ')}</div>
        ${q.listen ? `<div class="center"><button type="button" class="btn lg" id="flPlay" aria-label="${T('Nghe')}">🔊</button></div>` : `<div class="fl-word">${esc(w)}</div>`}
        <div class="fl-ch" id="flCh">${q.opts.map((o, k) => `<button type="button" data-k="${k}" aria-label="${esc(o[1])}">${o[1]}</button>`).join('')}</div></div>`;
      d.getElementById('flSkip').onclick = () => end('skip');
      if (q.listen) { const p = d.getElementById('flPlay'); p.onclick = () => say(w); say(w); }
      let first = true;
      d.querySelectorAll('#flCh button').forEach(b => b.onclick = () => {
        const o = q.opts[+b.dataset.k], ok = o === q.it;
        if (ok) { if (first) hits++; g.Sfx && g.Sfx.correct && g.Sfx.correct(); d.querySelectorAll('#flCh button').forEach(x => { x.disabled = true; }); b.classList.add('right'); if (!q.listen) say(w); i++; setTimeout(draw, 650); }
        else { first = false; g.Sfx && g.Sfx.wrong && g.Sfx.wrong(); b.classList.add('wrong'); b.disabled = true; }
      });
    };
    const fin = () => {
      view.innerHTML = `<style>${css}</style><div class="fl stack center"><div class="kit-cele">${g.Kit ? g.Kit.svg('cheer', 96) : ''}</div>
        <div class="kit-say">${T('Tuyệt vời! Đó chính là cách Lexkite giúp bạn nhớ lâu.')}</div>
        <div class="small muted">${hits}/${N} ✓</div>
        <button type="button" class="btn primary lg block" id="flGo">${T('Tiếp tục học lộ trình của bạn →')}</button></div>`;
      g.Sfx && g.Sfx.win && g.Sfx.win(); ev('fl_done');
      d.getElementById('flGo').onclick = () => end('done');
    };
    ev('fl_start'); draw();
  }
  g.FirstLesson = { run, enabled };
})(window);
