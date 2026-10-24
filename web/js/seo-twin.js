/* Trang tĩnh "song sinh" của route app (docs/SEO-ARCH.md §2b) – chỉ web lexkite.com/pages.dev, không chạy trong app gốc/add-on.
 * #/dict/<từ> · #/confidence/<bài> · #/topic/<bộ> · #/grammar/<bài> có bản tĩnh (dist/data/seo-twins.json, sinh bởi scripts/build-seo-pages.mjs)
 * → <link rel=canonical> trỏ bản tĩnh + liên kết nhỏ "🌐 Trang web" cuối trang (chia sẻ link index được). Nạp lười từ notices.js: khung app +0 byte. */
(function (g, d) {
  'use strict';
  if (g.__lkTwin) return; g.__lkTwin = 1;
  if (!/(^|\.)lexkite\.(com|pages\.dev)$|^localhost$|^127\.0\.0\.1$/.test(location.hostname) || (g.VBNative && g.VBNative.is)) return;
  var L = { vi: 'Trang web', en: 'Web page', es: 'Página web', pt: 'Página web', fr: 'Page web', de: 'Webseite', id: 'Halaman web', th: 'หน้าเว็บ', zh: '网页版', ja: 'ウェブ版', ko: '웹 페이지', hi: 'वेब पेज', ar: 'صفحة الويب', ru: 'Веб-страница', tr: 'Web sayfası' };
  var M = null, link = d.querySelector('link[rel="canonical"]'), def = link && link.getAttribute('href'), timer = 0;
  var lang = function () { try { return (g.I18N && g.I18N.lang()) || 'vi'; } catch (e) { return 'vi'; } };
  var twin = function () {
    if (!M) return null;
    var h = location.hash.replace(/^#\/?/, '').split('?')[0].split('#')[0], p = h.split('/'), r = p[0], l = lang(), id;
    try { id = decodeURIComponent(p.slice(1).join('/')); } catch (e) { return null; }
    if (!id) return null;
    if (r === 'dict') { var s = (M.w[l] || {})[id.toLowerCase()]; return s ? '/' + l + '/words/' + s : null; }
    if (r === 'confidence') return (M.c[l] || []).indexOf(id) >= 0 ? '/' + l + '/conversations/' + id : null;
    if (r === 'topic' || r === 'grammar') { var t = (M.t[l] || {})[r]; return t && t[1].indexOf(id) >= 0 ? t[0] + id : null; }
    return null;
  };
  var apply = function () {
    var p = twin(), view = d.getElementById('view'), old = d.getElementById('lk-twin');
    if (link) link.setAttribute('href', p ? 'https://lexkite.com' + p : def);
    if (old && (!p || old.getAttribute('data-p') !== p || !view || !view.contains(old))) { old.remove(); old = null; }
    if (!p || old || !view || !view.firstChild) return;
    var el = d.createElement('p'); el.id = 'lk-twin'; el.setAttribute('data-p', p); el.className = 'muted'; el.style.cssText = 'text-align:center;font-size:.85rem;margin:1.5rem 0 .5rem';
    var a = d.createElement('a'); a.href = p; a.textContent = '🌐 ' + (L[lang()] || L.en); el.appendChild(a); view.appendChild(el);
  };
  var later = function () { clearTimeout(timer); timer = setTimeout(apply, 700); };
  fetch('/data/seo-twins.json', { cache: 'no-cache' }).then(function (r) { return r.ok ? r.json() : null; }).then(function (j) { if (!j || j.v !== 1) return; M = j; apply(); g.addEventListener('hashchange', later); setTimeout(apply, 1800); }).catch(function () {});
})(window, document);
