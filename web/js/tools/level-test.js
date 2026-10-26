/* Giao diện bài kiểm tra trình độ CEFR (trang tĩnh /<lang>/<english-level-test>/ + 6 trang cấp độ – docs/SEO-TOOLS.md). Không backend, 0 lượt D1:
 * lõi cefr-engine.js + ngân hàng câu tải LƯỜI khi bấm Bắt đầu (trang đầu chỉ có HTML + file này ≈ 3 KB → LCP/TBT tốt). Bài đang làm & kết quả
 * lưu localStorage (bọc try/catch – chế độ riêng tư vẫn làm bài được). Chuỗi giao diện: JSON #tool-data do scripts/build-tools.mjs nhúng theo ngôn ngữ trang. */
(function () {
  'use strict';
  var d = document, KR = 'lk-tool-cefr-run', KD = 'lk-tool-cefr';
  var get = function (k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } };
  var put = function (k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* bỏ qua */ } };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var fill = function (s, o) { return String(s).replace(/\{(\w+)\}/g, function (m, k) { return o[k] != null ? o[k] : m; }); };
  // Trang cấp độ: hiện "Kết quả của bạn: B2" nếu người xem vừa làm bài và được B2
  var you = d.getElementById('you');
  if (you) { var last = get(KD), m = location.pathname.match(/\/(a1|a2|b1|b2|c1|c2)\/?$/i); if (last && m && last.level === m[1].toUpperCase()) { you.textContent = fill(you.getAttribute('data-t'), { lv: last.level }); you.hidden = false; } }
  var box = d.getElementById('qz'), dataEl = d.getElementById('tool-data');
  if (!box || !dataEl) return;
  var U = JSON.parse(dataEl.textContent), engine = null, items = null, test = null, t0 = 0, tick = null;
  var start = d.getElementById('qz-start');
  var load = function () {
    if (items) return Promise.resolve();
    var js = new Promise(function (ok, no) { if (window.CEFRTest) return ok(); var s = d.createElement('script'); s.src = '/js/tools/cefr-engine.js'; s.onload = ok; s.onerror = no; d.head.appendChild(s); });
    return Promise.all([js, fetch(U.bank).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })]).then(function (a) { engine = window.CEFRTest; items = a[1].items; });
  };
  var mmss = function () { var s = Math.floor((Date.now() - t0) / 1000); return Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2); };
  var save = function () { put(KR, { seed: test.state.seed, resp: test.state.resp, t0: t0 }); };
  function begin(resume) {
    box.setAttribute('aria-busy', 'true');
    load().then(function () {
      var r = resume && get(KR);
      test = engine.create(items, r ? r.seed : (Math.random() * 4294967296) >>> 0);
      if (r) { test.load(r); t0 = r.t0 || Date.now(); } else { t0 = Date.now(); put(KR, null); }
      clearInterval(tick); tick = setInterval(function () { var e = d.getElementById('qz-t'); if (e) e.textContent = mmss(); }, 1000);
      box.removeAttribute('aria-busy'); ask();
    }).catch(function () { box.removeAttribute('aria-busy'); box.insertAdjacentHTML('beforeend', '<p role="alert">' + esc(U.loadErr) + '</p>'); });
  }
  function ask() {
    var it = test.next();
    if (!it) return finish();
    var i = test.state.resp.length + 1, est = Math.max(i, 26), sk = { g: U.skillG, v: U.skillV, r: U.skillR }[it.sk];
    box.innerHTML = '<div class="meta"><span>' + esc(fill(U.progress, { i: i, n: est })) + ' · ' + esc(sk) + '</span><span>' + esc(U.elapsed) + ' <span id="qz-t">' + mmss() + '</span></span></div>' +
      '<div class="bar" aria-hidden="true"><i style="width:' + Math.min(100, Math.round((i - 1) / est * 100)) + '%"></i></div>' +
      (it.p ? '<p class="psg" lang="en" dir="ltr">' + esc(it.p) + '</p>' : '') +
      '<p class="q" id="qz-q" tabindex="-1" lang="en" dir="ltr">' + esc(it.q).replace(/_{3}/g, '<span aria-label="blank">_____</span>') + '</p>' +
      '<div class="opts" role="group" aria-labelledby="qz-q" lang="en" dir="ltr">' + it.o.map(function (o, k) { return '<button type="button" data-k="' + k + '">' + esc(o) + '</button>'; }).join('') + '</div>' +
      '<p><button type="button" class="idk" data-k="-1">' + esc(U.idk) + '</button></p>' + (i === 1 ? '<p class="hint">' + esc(U.idkHint) + '</p>' : '');
    box.querySelectorAll('button[data-k]').forEach(function (b) {
      b.onclick = function () { var k = +b.getAttribute('data-k'); test.answer(it.id, k < 0 ? 'idk' : k === it.a ? 'right' : 'wrong'); save(); ask(); };
    });
    var q = d.getElementById('qz-q'); if (i > 1 && q) q.focus({ preventScroll: true });
  }
  function finish() {
    clearInterval(tick);
    var r = test.result(), lv = r.level, abs = location.origin + U.lvUrl[lv], dur = mmss();
    put(KD, { level: lv, lo: r.lo, hi: r.hi, at: Date.now() }); put(KR, null);
    var meter = function (k, name) { var x = r.by[k]; return x[1] ? '<span>' + esc(name) + '</span><meter min="0" max="' + x[1] + '" value="' + x[0] + '"></meter><span>' + x[0] + '/' + x[1] + '</span>' : ''; };
    box.innerHTML = '<h2 id="qz-r" tabindex="-1">' + esc(U.resultH) + '</h2><p><span class="big">' + lv + '</span> <strong>' + esc(U.levels[lv]) + '</strong></p>' +
      (r.lo !== r.hi ? '<p>' + esc(fill(U.range, { a: r.lo, b: r.hi })) + '</p>' : '') + '<p class="hint">' + esc(U.elapsed) + ' ' + dur + '</p>' +
      '<h3>' + esc(U.bySkill) + '</h3><div class="sk">' + meter('g', U.skillG) + meter('v', U.skillV) + meter('r', U.skillR) + '</div>' +
      '<h3>' + esc(U.examsH) + '</h3><table class="ex"><tbody><tr><th scope="row">IELTS</th><td>' + U.exams[lv][0] + '</td></tr><tr><th scope="row">TOEIC Listening &amp; Reading</th><td>' + U.exams[lv][1] + '</td></tr></tbody></table><p class="hint"><small>' + esc(U.examsNote) + '</small></p>' +
      '<h3>' + esc(U.planH) + '</h3><ol class="steps">' + U.plan[lv].map(function (k) { return '<li><a href="' + U.app + '#/' + k + '" data-hit="tool_plan_' + k + '"><b>' + esc(U.steps[k][0]) + ' →</b><small>' + esc(U.steps[k][1]) + '</small></a></li>'; }).join('') + '</ol>' +
      '<div class="row"><button type="button" class="btn" id="qz-share">' + esc(U.share) + '</button><a href="' + U.lvUrl[lv] + '">' + esc(fill(U.seeLevel, { lv: lv })) + '</a><button type="button" class="idk" id="qz-again">' + esc(U.retake) + '</button><span id="qz-msg" role="status"></span></div>';
    d.getElementById('qz-share').onclick = function () {
      var txt = U.resultH + ': ' + lv + ' (' + U.levels[lv] + ') – Lexkite';
      if (navigator.share) navigator.share({ title: txt, text: txt, url: abs }).catch(function () {});
      else if (navigator.clipboard) navigator.clipboard.writeText(abs).then(function () { d.getElementById('qz-msg').textContent = U.copied; });
    };
    d.getElementById('qz-again').onclick = function () { begin(false); };
    d.getElementById('qz-r').focus({ preventScroll: false });
  }
  // Bài đang dở → nút "Làm tiếp" + "Làm lại"; nút chỉ bật khi JS chạy (HTML tĩnh để disabled → không có nút chết khi tắt JS)
  var run = get(KR);
  if (run && run.resp && run.resp.length) {
    start.textContent = U.resume + ' (' + run.resp.length + ') →';
    start.insertAdjacentHTML('afterend', ' <button type="button" class="idk" id="qz-restart">' + esc(U.restart) + '</button>');
    d.getElementById('qz-restart').onclick = function () { begin(false); };
    start.onclick = function () { begin(true); };
  } else start.onclick = function () { begin(false); };
  start.disabled = false;
})();
