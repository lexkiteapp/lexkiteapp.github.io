/* Quiz TOEIC Part 5 (trang tĩnh /<lang>/<toeic-part-5-practice>/ – docs/SEO-TOOLS.md). Không backend: câu Part 5 tự soạn của app + lời giải đã dịch
 * (dist/data/tools/toeic5-<lang>.json do scripts/build-tools.mjs xuất) tải LƯỜI khi bấm Bắt đầu. Mỗi lượt 10 câu ngẫu nhiên, ưu tiên câu chưa gặp (localStorage). */
(function () {
  'use strict';
  var d = document, KS = 'lk-tool-toeic5-seen', SET = 10;
  var box = d.getElementById('qz'), dataEl = d.getElementById('tool-data');
  if (!box || !dataEl) return;
  var U = JSON.parse(dataEl.textContent), items = null, set = [], k = 0, right = 0;
  var get = function () { try { return JSON.parse(localStorage.getItem(KS) || '[]'); } catch (e) { return []; } };
  var put = function (v) { try { localStorage.setItem(KS, JSON.stringify(v.slice(-400))); } catch (e) { /* bỏ qua */ } };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var fill = function (s, o) { return String(s).replace(/\{(\w+)\}/g, function (m, x) { return o[x] != null ? o[x] : m; }); };
  var L = 'ABCD';
  function pick() {
    var seen = get(), fresh = items.filter(function (i) { return seen.indexOf(i.id) < 0; }), pool = fresh.length >= SET ? fresh : items.slice();
    for (var i = pool.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = pool[i]; pool[i] = pool[j]; pool[j] = t; }
    return pool.slice(0, SET);
  }
  function begin() {
    box.setAttribute('aria-busy', 'true');
    (items ? Promise.resolve() : fetch(U.data).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }).then(function (j) { items = j.items; }))
      .then(function () { box.removeAttribute('aria-busy'); set = pick(); k = 0; right = 0; ask(); })
      .catch(function () { box.removeAttribute('aria-busy'); box.insertAdjacentHTML('beforeend', '<p role="alert">' + esc(U.loadErr || 'Error') + '</p>'); });
  }
  function ask() {
    var it = set[k];
    box.innerHTML = '<div class="meta"><span>' + (k + 1) + ' / ' + set.length + '</span><span>' + right + ' ✓</span></div><div class="bar" aria-hidden="true"><i style="width:' + Math.round(k / set.length * 100) + '%"></i></div>' +
      '<p class="q" id="qz-q" tabindex="-1" lang="en" dir="ltr">' + esc(it.q) + '</p><div class="opts" role="group" aria-labelledby="qz-q" lang="en" dir="ltr">' +
      it.o.map(function (o, i) { return '<button type="button" data-k="' + i + '">(' + L[i] + ') ' + esc(o) + '</button>'; }).join('') + '</div><div id="qz-fb" role="status"></div>';
    var bs = box.querySelectorAll('.opts button');
    bs.forEach(function (b) {
      b.onclick = function () {
        var c = +b.getAttribute('data-k'), ok = c === it.a; if (ok) right++;
        bs.forEach(function (x, i) { x.disabled = true; if (i === it.a) x.className = 'ok'; else if (i === c) x.className = 'no'; });
        var seen = get(); seen.push(it.id); put(seen);
        var last = k === set.length - 1;
        d.getElementById('qz-fb').innerHTML = '<div class="fb"><p><strong>' + esc(ok ? U.correct : fill(U.wrong, { a: '(' + L[it.a] + ') ' + it.o[it.a] })) + '</strong></p><p><b>' + esc(U.explain) + ':</b> ' + esc(it.x) + '</p></div>' +
          '<div class="row"><button type="button" class="btn" id="qz-next">' + esc(last ? U.finish : U.next) + ' →</button></div>';
        var nb = d.getElementById('qz-next'); nb.onclick = function () { if (last) done(); else { k++; ask(); d.getElementById('qz-q').focus({ preventScroll: true }); } }; nb.focus({ preventScroll: true });
      };
    });
  }
  function done() {
    box.innerHTML = '<h2 id="qz-r" tabindex="-1">' + esc(fill(U.score, { r: right, n: set.length })) + '</h2><div class="bar" aria-hidden="true"><i style="width:' + Math.round(right / set.length * 100) + '%"></i></div>' +
      '<p>' + esc(U.full) + '</p><div class="row"><a class="btn" href="' + U.app + '" data-hit="tool_toeic_app">' + esc(U.openApp) + ' →</a><button type="button" class="idk" id="qz-again">' + esc(U.again) + '</button></div>';
    d.getElementById('qz-again').onclick = begin; d.getElementById('qz-r').focus();
  }
  var start = d.getElementById('qz-start'); start.onclick = begin; start.disabled = false;
})();
