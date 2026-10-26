/* 🔥 Nhịp buổi học (tải lười – gói 'lfx', nạp cùng route #/practice; study.js gọi khi có window.LessonFx):
 * (a) chuỗi đúng liền + trạng thái hoàn hảo trên thanh tiến độ · (b) chấp nhận lỗi chính tả nhỏ (≤ 1 sửa/từ ≥ 4 chữ cái,
 * không áp cho dạng từ đang được kiểm, không nhận khi gõ thành một từ có thật khác) · (c) nút Giải thích = ghi chú "Hiểu sâu"
 * (js/notes/<chữ>.json + wordcard.js) chỉ hiện khi có dữ liệu · (d) 3 thẻ số liệu cuối lượt + lời chào theo độ chính xác
 * · (e) tạm tắt bài nghe / bài nói 15 phút · (f) mời chế độ khó sau 8 câu đúng liền (Kit từ web/js/kit.js – nguồn duy nhất).
 * Không gọi t() lúc nạp module. Hiệu ứng tắt khi prefers-reduced-motion. Thiết kế riêng của Lexkite (không chép tài sản app khác). */
(function (g) {
  'use strict';
  const d = g.document;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const T = (k, v) => (g.t ? g.t(k, v) : k);
  const ls = (k, v) => { try { if (v === undefined) return g.localStorage.getItem('vb.' + k); if (v === null) g.localStorage.removeItem('vb.' + k); else g.localStorage.setItem('vb.' + k, v); } catch (e) { return null; } return null; };
  const HARD_AT = 8, PAUSE = 15 * 60e3;

  // ---------- (b) Lỗi chính tả nhỏ ----------
  const norm = s => String(s == null ? '' : s).toLowerCase().replace(/[’‘`]/g, "'").replace(/\s+/g, ' ').trim().replace(/[.!?,;:]+$/, '');
  // Khoảng cách sửa: dùng Levenshtein sẵn có trong ui.js (UI.similarity → tỉ lệ 0..1, chỉ tính chữ a-z)
  function dist(a, b) {
    const S = g.UI && g.UI.similarity; if (!S) return a === b ? 0 : 99;
    const n = Math.max(a.replace(/[^a-z ]/g, '').length, b.replace(/[^a-z ]/g, '').length);
    return Math.round((1 - S(a, b)) * n);
  }
  /** typo(given, target, { strict, protect: [từ phải đúng tuyệt đối], isWord: w => bool })
   *  → { ok, typo, marks: [{ w, fix }] } – ok = chấp nhận; typo = có từ được sửa (marks.fix = từ cần gạch chân). */
  function typo(given, target, o) {
    o = o || {};
    const a = norm(given), b = norm(target);
    if (!a || !b) return { ok: false, typo: false, marks: [] };
    const shown = String(target).trim().replace(/[.!?,;:]+$/, '').split(/\s+/);
    if (a === b) return { ok: true, typo: false, marks: shown.map(w => ({ w })) };
    if (o.strict) return { ok: false, typo: false, marks: [] };
    const A = a.split(' '), B = b.split(' ');
    if (A.length !== B.length || shown.length !== B.length) return { ok: false, typo: false, marks: [] };
    const keep = new Set((o.protect || []).map(norm));
    const marks = [];
    for (let i = 0; i < B.length; i++) {
      if (A[i] === B[i]) { marks.push({ w: shown[i] }); continue; }
      const letters = (B[i].match(/[a-z]/g) || []).length;
      if (keep.has(B[i]) || letters < 4 || dist(A[i], B[i]) > 1 || (o.isWord && o.isWord(A[i]))) return { ok: false, typo: false, marks: [] };
      marks.push({ w: shown[i], fix: true });
    }
    return { ok: true, typo: true, marks };
  }
  const typoHtml = marks => marks.map(m => m.fix ? `<u class="lfx-fix">${esc(m.w)}</u>` : esc(m.w)).join(' ');
  // Dòng đầu bảng phản hồi khi nhận đáp án có lỗi chính tả nhỏ (vẫn tính đúng, không mất chuỗi)
  const typoHead = marks => { css(); return `✅ ${esc(T('Đúng rồi – chỉ sai chính tả nhỏ'))}<div class="lfx-sub small">${T('Viết đúng là: {a}', { a: typoHtml(marks) })}</div>`; };

  // ---------- CSS (nạp 1 lần) ----------
  function css() {
    if (!d || d.getElementById('lfxCss')) return;
    const st = d.createElement('style'); st.id = 'lfxCss';
    st.textContent = `.lfx-combo{display:flex;justify-content:center;min-height:1.75rem;margin:-.4rem 0 .3rem}
.lfx-combo span{display:inline-flex;align-items:center;gap:.3rem;padding:.15rem .75rem;border-radius:999px;font-weight:800;font-size:.85rem;background:var(--surface-2);color:var(--text)}
.lfx-combo.perfect span{background:linear-gradient(90deg,#0F3D3E,#17595A);color:#FFD36A}
.lfx-combo.bump span{animation:lfxBump .35s ease-out}
@keyframes lfxBump{0%{transform:scale(.85)}60%{transform:scale(1.08)}100%{transform:scale(1)}}
.study-top .progress.lfx-glow i{background:linear-gradient(90deg,#17595A,#2FBF71 55%,#FFB054);box-shadow:0 0 10px rgba(255,176,84,.55)}
.study-top .progress.lfx-perfect i{background:linear-gradient(90deg,#E5502F,#FFB054 60%,#FFC94A);box-shadow:0 0 12px rgba(255,201,74,.6)}
.lfx-hard{display:inline-block;margin:0 0 .5rem;padding:.2rem .65rem;border-radius:8px;background:#B7472A;color:#fff;font-weight:800;font-size:.78rem}
.lfx-fix{text-decoration:underline wavy;text-decoration-thickness:2px;text-underline-offset:4px}
.lfx-sub{margin-top:.2rem;opacity:.95}
.sheet .lfx-why{margin-top:.7rem;min-height:44px;background:rgba(255,255,255,.16)!important;color:#fff!important;border:1px solid rgba(255,255,255,.55)!important}
.lfx-whybox{margin-top:.6rem;background:var(--surface);color:var(--text);border-radius:14px;padding:.5rem .7rem;max-height:38vh;overflow:auto;text-align:start}
.lfx-head{font-weight:800;font-size:1.05rem;margin:.4rem 0 0}
.lfx-stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:.5rem;margin:1rem auto;max-width:420px}
.lfx-stat{border:2px solid var(--c);border-radius:14px;overflow:hidden;text-align:center;background:var(--surface)}
.lfx-stat small{display:block;background:var(--c);color:#fff;font-weight:800;font-size:.75rem;padding:.3rem .25rem;overflow-wrap:anywhere}
.lfx-stat b{display:block;padding:.5rem .2rem;font-size:1.2rem;font-variant-numeric:tabular-nums}
.lfx-note{display:flex;gap:.5rem;align-items:center;justify-content:center;flex-wrap:wrap;margin:0 0 .7rem;padding:.45rem .7rem;border-radius:12px;background:var(--surface-2);font-size:.85rem}
.lfx-note .btn{min-height: var(--tap, 36px)}.lfx-skip{min-height:44px}
.lfx-cb{position:fixed;z-index:9998;pointer-events:none;transform:translate(-50%,0);padding:.3rem .8rem;border-radius:999px;font-weight:800;font-size:.9rem;background:linear-gradient(90deg,#E5502F,#FFB054);color:#fff;box-shadow:0 4px 14px rgba(229,80,47,.35);white-space:nowrap;animation:lfxCb 1.4s ease-out forwards}
@keyframes lfxCb{0%{opacity:0;transform:translate(-50%,8px) scale(.8)}15%{opacity:1;transform:translate(-50%,0) scale(1.08)}30%{transform:translate(-50%,0) scale(1)}80%{opacity:1}100%{opacity:0;transform:translate(-50%,-14px)}}
.lfx-stats.lfx-s4{grid-template-columns:repeat(4,minmax(0,1fr));max-width:520px}
@media (max-width:420px){.lfx-stats.lfx-s4{grid-template-columns:repeat(2,minmax(0,1fr))}}
.lfx-s4 .lfx-stat{animation:lfxBump .4s ease-out backwards}.lfx-s4 .lfx-stat:nth-child(2){animation-delay:.08s}.lfx-s4 .lfx-stat:nth-child(3){animation-delay:.16s}.lfx-s4 .lfx-stat:nth-child(4){animation-delay:.24s}
@media (prefers-reduced-motion: reduce){.lfx-cb,.lfx-s4 .lfx-stat{animation:none!important}.lfx-combo span,.lfx-combo.bump span{animation:none!important}.study-top .progress i{transition:none!important}}`;
    d.head.appendChild(st);
  }

  // ---------- (a) Chuỗi đúng liền ----------
  const combo = () => ({ cur: 0, best: 0, miss: 0, n: 0, t0: Date.now(), hard: false, offered: false });
  function hit(c, ok) { c.n++; if (ok) { c.cur++; if (c.cur > c.best) c.best = c.cur; } else { c.cur = 0; c.miss++; } }
  // Gắn chip chuỗi phía trên thanh tiến độ (.study-top được vẽ lại mỗi câu) + nhãn "Câu khó"
  function decorate(top, c, q) {
    css(); if (!top || !c) return;
    const bar = top.querySelector('.progress'), on = c.cur >= 2, perfect = c.miss === 0 && c.cur >= 3;
    if (bar) { bar.classList.toggle('lfx-glow', c.cur >= 3 && !perfect); bar.classList.toggle('lfx-perfect', perfect); }
    const el = d.createElement('div');
    el.className = 'lfx-combo' + (perfect ? ' perfect' : '') + (on ? ' bump' : '');
    el.setAttribute('role', 'status');
    if (on) el.innerHTML = `<span>${perfect ? '✨ ' + esc(T('Hoàn hảo')) + ' · ' : '🔥 '}${esc(T('{n} đúng liền', { n: c.cur }))}</span>`;
    top.before(el);
    if (q && q.hard) { const qc = d.querySelector('#qbox .q-card'); if (qc) qc.insertAdjacentHTML('afterbegin', `<div class="lfx-hard">💪 ${esc(T('Câu khó · +{n} XP', { n: 6 }))}</div>`); }
  }

  // ---------- (f) Mời chế độ khó ----------
  const wantsHard = (c, left, mode) => !!c && !c.offered && !c.hard && mode !== 'test' && c.cur >= HARD_AT && left >= 2;
  // Vẽ màn mời vào box; cb(true) = vào chế độ khó
  function offerHard(box, c, cb) {
    css(); c.offered = true;
    box.innerHTML = `<div class="card empty celebrate lfx-hardin" role="dialog" aria-labelledby="lfxHardH">
      <div class="em kit-cele">${g.Kit ? g.Kit.svg('cheer', 110) : '💪'}</div>
      <h2 id="lfxHardH">${esc(T('{n} câu đúng liền!', { n: c.cur }))}</h2>
      <p class="muted">${esc(T('Bài này có vẻ quá dễ với bạn. Thử câu khó hơn (gõ thay vì chọn) để nhận thêm XP nhé?'))}</p>
      <div class="row center"><button class="btn primary lg" id="lfxHardYes">💪 ${esc(T('Thử mức khó'))}</button><button class="btn lg" id="lfxHardNo">${esc(T('Giữ mức này'))}</button></div></div>`;
    const yes = box.querySelector('#lfxHardYes'), no = box.querySelector('#lfxHardNo');
    yes.onclick = () => { c.hard = true; cb(true); };
    no.onclick = () => cb(false);
    try { yes.focus({ preventScroll: true }); } catch (e) { /* bỏ qua */ }
  }
  // Câu còn lại khó hơn: chọn → gõ; bỏ gợi ý chữ cái đầu/độ dài
  const harden = qs => qs.forEach(q => { q.hard = true; if (q.type === 'mcq-vi' || q.type === 'mcq-en') q.type = 'type-vi'; });

  // ---------- (c) Giải thích ----------
  const notesP = {};
  const notesOf = word => {
    const w = String(word || '').toLowerCase(), c = /^[a-z]/.test(w) ? w[0] : '_';
    const p = notesP[c] || (notesP[c] = (g.fetch ? fetch(`js/notes/${c}.json`).then(r => r.ok ? r.json() : {}) : Promise.resolve({})).catch(() => { delete notesP[c]; return {}; }));
    return p.then(m => (m && Object.prototype.hasOwnProperty.call(m, w) ? m[w] : null));
  };
  // Thêm nút 💡 Giải thích vào bảng phản hồi – chỉ khi từ có ghi chú; resize() cập nhật chiều cao chừa đáy
  function explain(fb, word, resize) {
    return notesOf(word).then(n => {
      if (!n || !fb.isConnected) return false;
      return (g.App && g.App.need ? (g.App.lazy || g.App.need)('wordcard') : Promise.resolve()).then(() => g.WordCard && g.WordCard.ready).then(() => {
        const html = g.WordCard && g.WordCard.notes(n, String(word).toLowerCase()), host = fb.querySelector('.sheet-in'), nx = fb.querySelector('.sheet-next');
        if (!html || !host || !nx || !fb.isConnected || fb.querySelector('.lfx-why')) return false;
        css();
        const b = d.createElement('button'), box = d.createElement('div');
        b.type = 'button'; b.className = 'btn sm block lfx-why'; b.setAttribute('aria-expanded', 'false'); b.setAttribute('aria-controls', 'lfxWhy');
        const label = () => { b.textContent = box.hidden ? '💡 ' + T('Giải thích') : '🙈 ' + T('Ẩn giải thích'); };
        box.className = 'lfx-whybox'; box.id = 'lfxWhy'; box.hidden = true; box.innerHTML = html;
        b.onclick = () => { box.hidden = !box.hidden; b.setAttribute('aria-expanded', String(!box.hidden)); label(); if (resize) resize(); };
        label(); host.insertBefore(b, nx); host.insertBefore(box, nx); if (resize) resize();
        return true;
      });
    }).catch(() => false);
  }

  // ---------- (d) Màn cuối lượt ----------
  const mmss = ms => { const s = Math.max(0, Math.round(ms / 1000)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
  const HEAD = () => ({
    100: [T('Không trượt câu nào – Kit phải ngả mũ!'), T('Tuyệt đối 100%! Bộ não bạn đang chạy hết công suất.')],
    80: [T('Phong độ rất cao hôm nay!'), T('Gần như hoàn hảo – chỉ còn chút xíu nữa!')],
    50: [T('Đang lên tay rồi đấy!')],
    0: [T('Câu sai hôm nay là điểm cộng ngày mai.')],
  });
  function headline(pct, seed) { const h = HEAD(), arr = h[pct >= 100 ? 100 : pct >= 80 ? 80 : pct >= 50 ? 50 : 0]; return arr[Math.abs(seed | 0) % arr.length]; }
  function summary(c, xp, pct) {
    css();
    const card = (col, label, val) => `<div class="lfx-stat" style="--c:${col}"><small>${esc(label)}</small><b>${esc(val)}</b></div>`;
    return `<p class="lfx-head">${esc(headline(pct, c.t0))}</p>
      <div class="lfx-stats" role="group" aria-label="${esc(T('Kết quả lượt học'))}">${card('#9A5B00', T('Tổng XP'), '+' + xp)}${card('#B7472A', T('Chuỗi dài nhất'), '🔥 ' + c.best)}${card('#17595A', T('Thời gian'), '⏱ ' + mmss(Date.now() - c.t0))}</div>`;
  }
  // Huy hiệu chuỗi đúng liền nổi nhỏ cạnh đáp án (Sfx.answer gọi ở mốc 3/5/10/15…) – dùng chung mọi bề mặt luyện tập
  function comboBadge(n, el) {
    css(); if (!d || !d.body) return;
    const r = el && el.getBoundingClientRect ? el.getBoundingClientRect() : null;
    const b = d.createElement('div'); b.className = 'lfx-cb'; b.setAttribute('role', 'status');
    b.textContent = '🔥 ' + T('{n} câu đúng liền!', { n });
    const top = r && r.height ? Math.max(8, r.top - 40) : 72;
    b.style.left = (r && r.width ? r.left + r.width / 2 : g.innerWidth / 2) + 'px'; b.style.top = top + 'px';
    d.body.appendChild(b); setTimeout(() => b.remove(), 1500);
  }
  // Màn hoàn thành dùng chung (Sfx.finish): 4 thẻ số liệu – độ chính xác · XP · thời gian · chuỗi ngày – chèn 1 lần vào el
  function stats(el, o) {
    css(); if (!el || !el.insertAdjacentHTML || el.querySelector('.lfx-s4')) return;
    const A = g.App, sk = A && A.streak ? A.streak() : 0, pct = Math.max(0, Math.min(100, Math.round(+o.pct || 0)));
    const card = (col, label, val) => `<div class="lfx-stat" style="--c:${col}"><small>${esc(label)}</small><b>${esc(val)}</b></div>`;
    el.insertAdjacentHTML('beforeend', `<div class="lfx-stats lfx-s4" role="group" aria-label="${esc(T('Kết quả lượt học'))}">${card('var(--good)', T('Tỉ lệ đúng'), pct + '%')}${card('#9A5B00', T('Tổng XP'), '+' + (Math.round(+o.xp) || 0))}${card('#17595A', T('Thời gian'), '⏱ ' + mmss(o.ms || 0))}${card('#B7472A', T('Chuỗi ngày'), '🔥 ' + sk)}</div>`);
    if (pct >= 80 && g.Sfx && g.Sfx.shimmer) g.Sfx.shimmer();
  }
  const shareBtn = pct => `<button class="btn" data-share="${+pct || 0}">📤 ${esc(T('Khoe kết quả'))}</button>`;

  // ---------- (e) Tạm tắt bài nghe / nói 15 phút ----------
  const until = k => +(ls(k) || 0) > Date.now();
  const audioOff = () => until('noAudioUntil'), micOff = () => until('noMicUntil');
  const say = k => { if (g.UI && g.UI.toast) g.UI.toast(T(k), 4000); };
  const pauseAudio = () => { ls('noAudioUntil', String(Date.now() + PAUSE)); if (g.UI && g.UI.stopSpeak) try { g.UI.stopSpeak(); } catch (e) { /* bỏ qua */ } say('Đã tạm tắt bài nghe 15 phút – câu nghe đổi sang dạng gõ nghĩa.'); };
  const pauseMic = () => { ls('noMicUntil', String(Date.now() + PAUSE)); if (g.UI && g.UI.stopRecognize) try { g.UI.stopRecognize(); } catch (e) { /* bỏ qua */ } };
  const resume = () => { ls('noAudioUntil', null); ls('noMicUntil', null); };
  const skipAudioBtn = () => `<button type="button" class="btn sm ghost lfx-skip" id="lfxNoAudio">🔇 ${esc(T('Tắt âm thanh 15 phút'))}</button>`;
  const skipMicBtn = () => `<button type="button" class="btn lfx-skip" id="lfxNoMic">🎙️ ${esc(T('Tắt micro 15 phút'))}</button>`;
  // Dải thông báo đầu lượt + nút Bật lại (onOn chạy lại lượt)
  function note(kind, onOn) {
    css();
    const el = d.createElement('div'); el.className = 'lfx-note'; el.setAttribute('role', 'status');
    el.innerHTML = `<span>${esc(kind === 'mic' ? T('Đã tạm tắt bài nói 15 phút – làm trắc nghiệm nghĩa thay thế.') : T('Đã tạm tắt bài nghe 15 phút – câu nghe đổi sang dạng gõ nghĩa.'))}</span><button type="button" class="btn sm">${esc(T('Bật lại'))}</button>`;
    el.querySelector('button').onclick = () => { resume(); if (onOn) onOn(); };
    return el;
  }

  g.LessonFx = { comboBadge, stats, typo, typoHtml, typoHead, norm, combo, hit, decorate, wantsHard, offerHard, harden, explain, notesOf, summary, headline, shareBtn, audioOff, micOff, pauseAudio, pauseMic, resume, skipAudioBtn, skipMicBtn, note, HARD_AT };
})(typeof self !== 'undefined' ? self : this);
