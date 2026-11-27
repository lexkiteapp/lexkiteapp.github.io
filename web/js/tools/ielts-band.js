/* Máy tính band IELTS (trang tĩnh /<lang>/<ielts-band…>/ – docs/specs/ielts-band-calculator.md). Không backend: bảng quy đổi nằm trong #tool-data
* (content/tools/ielts-band.json do scripts/build-tools.mjs nhúng). Công thức = scripts/lib/ielts-band.mjs (test so khớp). */
(function () {
'use strict';
var d = document, f = d.getElementById('band-form'), dataEl = d.getElementById('tool-data');
if (!f || !dataEl) return;
var U = JSON.parse(dataEl.textContent), T = U.tables, KS = 'lk-tool-band', out = d.getElementById('band-out');
var rawToBand = function (tbl, raw) { raw = Math.max(0, Math.min(40, Math.floor(+raw) || 0)); for (var i = 0; i < tbl.length; i++) if (raw >= tbl[i][0]) return tbl[i][1]; return raw >= 1 ? 2 : 0; };
var overall = function (a, b, c, e) { return Math.round(((+a + +b + +c + +e) / 4) * 2) / 2; };
var fmt = function (n) { return Number(n).toFixed(1); };
var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
var val = function (n) { return f.elements[n].value; };
try { var s = JSON.parse(localStorage.getItem(KS) || 'null'); if (s) Object.keys(s).forEach(function (k) { if (f.elements[k]) f.elements[k].value = s[k]; }); } catch (e) { /* bỏ qua */ }
f.addEventListener('submit', function (ev) {
ev.preventDefault();
var l = val('l'), r = val('r'), w = val('w'), sp = val('s'), g = val('type') === 'g';
if (l === '' || r === '' || w === '' || sp === '') { out.innerHTML = '<p role="alert">' + esc(U.need) + '</p>'; return; }
var bl = rawToBand(T.listening, l), br = rawToBand(g ? T.reading_general : T.reading_academic, r), o = overall(bl, br, w, sp);
try { localStorage.setItem(KS, JSON.stringify({ l: l, r: r, w: w, s: sp, type: val('type') })); } catch (e) { /* bỏ qua */ }
out.innerHTML = '<div class="fb"><p>' + esc(U.resultH) + '</p><p class="big" aria-live="polite">' + fmt(o) + '</p><ul class="facts"><li>' + esc(U.listenH) + ': ' + fmt(bl) + '</li><li>' + esc(U.readH) + ': ' + fmt(br) + '</li><li>' + esc(U.writeH) + ': ' + fmt(w) + '</li><li>' + esc(U.speakH) + ': ' + fmt(sp) + '</li></ul><p class="hint">' + esc(U.approx) + '</p><p><a class="btn" href="' + esc(U.app) + '" data-hit="tool_band_app">' + esc(U.openApp) + ' →</a></p></div>';
out.focus({ preventScroll: true });
});
})();
