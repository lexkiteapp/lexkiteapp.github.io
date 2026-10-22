/* 🎬 Video bài học (tải lười – gói 'lvideo': js/i18n/en/lvideo.js + js/lib/video-rank.js + file này). docs/VIDEO-SCALE-PLAN.md §10.
 * Chỗ đặt chỉ chèn <div class="lv-slot" hidden data-lv='{ctx}'> rồi gọi LessonVideo.scan(): khớp thẻ → hiện thẻ nhỏ (bìa trước),
 * bấm mới tải video + phát có tiếng; nội dung dạy CHỈ tiếng Anh (phụ đề EN, câu đố EN với ✓/✗) – chỉ nút/nhãn theo ngôn ngữ giao diện; xem xong → 1 câu đố nhanh
 * (đáp án vào thẻ ôn SRS qua App.addWord) → gợi ý video tiếp theo (đa dạng template/series). Đo: /api/hit { t:'v', ev, id }.
 * Manifest: /data/videos.json (scripts/video/web-rendition.mjs). Clip mẫu thử (test: true) chỉ hiện khi bật ?vtest=1. */
(function (g) {
  const R = () => g.LkVideoRank;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const T = (k, o) => (typeof g.t === 'function' ? g.t(k, o) : k.replace(/\{(\w+)\}/g, (_, x) => (o && o[x] != null ? o[x] : '')));
  const ls = (k, v) => { try { if (v === undefined) return localStorage.getItem('vb.' + k); localStorage.setItem('vb.' + k, v); } catch (e) { return null; } return null; };
  const web = /^https?:$/.test(location.protocol) && /(^|\.)lexkite\.com$|^localhost$|^127\.0\.0\.1$|\.pages\.dev$/.test(location.hostname);
  const BASE = web ? '' : 'https://lexkite.com';
  try { if (/[?&#]vtest=1\b/.test(location.href)) ls('lvTest', '1'); } catch (e) { /* bỏ qua */ }
  let MAN = null;
  const manifest = () => MAN || (MAN = fetch(BASE + '/data/videos.json', { cache: 'no-cache' }).then(r => (r.ok ? r.json() : { items: [] }))
    .then(m => (Array.isArray(m.items) ? m.items : []).filter(it => !it.test || ls('lvTest') === '1')).catch(() => { MAN = null; return []; }));
  const seen = () => { try { return JSON.parse(ls('lvSeen') || '{}') || {}; } catch (e) { return {}; } };
  const last = () => { try { return JSON.parse(ls('lvLast') || 'null'); } catch (e) { return null; } };
  const sent = {};
  const hit = (ev, id) => {
    if (ev === 'view' && sent[id]) return; if (ev === 'view') sent[id] = 1;
    try { const b = JSON.stringify({ t: 'v', ev, id }); if (navigator.sendBeacon && web) navigator.sendBeacon('/api/hit', b); else fetch(BASE + '/api/hit', { method: 'POST', body: b, keepalive: true }).catch(() => {}); } catch (e) { /* bỏ qua */ }
  };

  function css() {
    if (document.getElementById('lv-css')) return;
    const s = document.createElement('style'); s.id = 'lv-css';
    s.textContent = `.lv-slot{margin:1rem 0}.lv-card{display:flex;gap:.8rem;align-items:center;width:100%;text-align:start;border:1px solid var(--line);border-radius:14px;padding:.6rem;background:var(--card,var(--surface));color:inherit;font:inherit;cursor:pointer}
.lv-card:focus-visible,.lv-x:focus-visible,.lv-q button:focus-visible{outline:3px solid var(--primary);outline-offset:2px}.lv-card img{width:54px;height:96px;object-fit:cover;border-radius:10px;flex:none;background:#111}
.lv-card .lv-k{font-size:.78rem;font-weight:700;color:var(--muted)}.lv-card b{display:block;margin:.15rem 0}.lv-play{margin-inline-start:auto;flex:none;width:44px;height:44px;border-radius:50%;display:grid;place-items:center;background:var(--primary);color:#fff;font-size:1.1rem}
.lv-pl{position:relative;border-radius:16px;overflow:hidden;background:#000;max-width:360px;margin:0 auto}.lv-pl video{display:block;width:100%;aspect-ratio:9/16;max-height:72vh;background:#000}
.lv-bar{display:flex;gap:.5rem;justify-content:center;flex-wrap:wrap;margin:.5rem 0}.lv-x{min-height:40px}.lv-q{border:1px solid var(--line);border-radius:14px;padding:.8rem;margin-top:.6rem;max-width:520px;margin-inline:auto}
.lv-q .lv-opts{display:grid;gap:.4rem;margin:.5rem 0}.lv-q button.lv-o{text-align:start;min-height:44px}.lv-q .ok{border-color:var(--ok,#1a7f37)}.lv-q .no{border-color:var(--bad,#b42318)}.lv-q button.lv-o:disabled{opacity:1}.lv-q button.lv-o:disabled:not(.ok):not(.no){opacity:.6}.lv-q .ok .lv-mk{color:var(--ok,#1a7f37)}.lv-q .no .lv-mk{color:var(--bad,#b42318)}
@media (prefers-reduced-motion:no-preference){.lv-card{transition:transform .15s}.lv-card:hover{transform:translateY(-1px)}}`;
    document.head.appendChild(s);
  }

  function pick(items, ctx, extra) {
    const c = Object.assign({ seen: seen(), prev: last() }, ctx || {}, extra || {});
    const r = R().rank(items, c);
    if (ctx && ctx.mode === 'day' && r.length) { const top = r.filter(x => x.s >= r[0].s * 0.6); return top[(+ctx.seed || 0) % top.length].it; } // "video của ngày": xoay trong nhóm tốt nhất theo ngày học
    return r.length ? r[0].it : null;
  }

  function card(slot, it, ctx) {
    const lab = ctx.mode === 'day' ? T('Video của ngày') : ctx.mode === 'word' ? T('Xem 20 giây') : T('Video bài học');
    slot.innerHTML = `<button type="button" class="lv-card" aria-label="${esc(T('Phát video: {t}', { t: it.title }))}"><img src="${esc(it.poster)}" alt="" width="54" height="96" loading="lazy" decoding="async">
      <span><span class="lv-k">🎬 ${esc(lab)} · ${Math.round(it.duration || 20)}s</span><b lang="en">${esc(it.title)}</b></span><span class="lv-play" aria-hidden="true">▶</span></button>`;
    slot.hidden = false;
    slot.querySelector('.lv-card').onclick = () => play(slot, it, ctx);
  }

  function play(slot, it, ctx) {
    const tracks = it.vtt_en ? `<track kind="captions" srclang="en" label="English" src="${esc(it.vtt_en)}" default>` : '';
    slot.innerHTML = `<div class="lv-pl"><video controls playsinline preload="metadata" crossorigin="anonymous" poster="${esc(it.poster)}" aria-label="${esc(it.title)}">
      <source src="${esc(it.src)}" type="video/mp4">${tracks}</video></div>
      <div class="lv-bar"><button type="button" class="btn sm lv-x" data-lv-close>${esc(T('Đóng video'))}</button></div><div class="lv-after" aria-live="polite"></div>`;
    const v = slot.querySelector('video'), after = slot.querySelector('.lv-after');
    v.addEventListener('loadedmetadata', () => { for (const tr of v.textTracks) tr.mode = 'showing'; }, { once: true });
    slot.querySelector('[data-lv-close]').onclick = () => { v.pause(); card(slot, it, ctx); slot.querySelector('.lv-card').focus(); };
    v.addEventListener('play', () => hit('view', it.id), { once: true });
    v.addEventListener('error', () => { after.innerHTML = `<p class="small muted">${esc(T('Không phát được video – thử lại sau.'))}</p>`; }, true);
    v.addEventListener('ended', () => {
      hit('done', it.id);
      const s = seen(); s[it.id] = Date.now(); ls('lvSeen', JSON.stringify(s)); ls('lvLast', JSON.stringify({ id: it.id, template: it.template, series: it.series }));
      quiz(after, it, () => next(slot, it, ctx));
    }, { once: true });
    const p = v.play(); if (p && p.catch) p.catch(() => {}); // bấm của người dùng = được phát có tiếng (iOS/Android WebView)
  }

  function quiz(box, it, onNext) {
    const q = it.quiz;
    const nextBtn = `<div class="lv-bar"><button type="button" class="btn primary lv-x" data-lv-next>${esc(T('Video tiếp theo'))} ${document.documentElement.dir === 'rtl' ? '←' : '→'}</button></div>`;
    if (!q) { box.innerHTML = nextBtn; box.querySelector('[data-lv-next]').onclick = onNext; return; }
    box.innerHTML = `<div class="lv-q" role="group" aria-labelledby="lvq-${esc(it.id)}"><div class="small muted">❓ ${esc(T('Câu hỏi nhanh'))}</div><p id="lvq-${esc(it.id)}" lang="en" dir="ltr"><b>${esc(q.q)}</b></p>
      <div class="lv-opts">${q.options.map((o, i) => `<button type="button" class="btn lv-o" data-i="${i}" lang="en" dir="ltr"><span class="lv-mk" aria-hidden="true">${'ABC'[i]}</span> ${esc(o)}</button>`).join('')}</div><p class="lv-fb small" role="status"></p></div>`;
    const bs = [...box.querySelectorAll('.lv-o')];
    bs[0].focus({ preventScroll: true });
    bs.forEach(b => { b.onclick = async () => {
      const i = +b.dataset.i, ok = i === q.answer, ans = q.options[q.answer];
      bs.forEach((x, j) => { x.disabled = true; const mk = x.querySelector('.lv-mk'); if (j === q.answer) { x.classList.add('ok'); mk.textContent = '✓'; } else if (j === i) { x.classList.add('no'); mk.textContent = '✗'; } });
      hit(ok ? 'quiz_ok' : 'quiz_no', it.id);
      box.querySelector('.lv-fb').innerHTML = ok ? esc(T('Đúng rồi! Đã thêm vào thẻ ôn.')) : esc(T('Chưa đúng. Đáp án: {a} – đã thêm vào thẻ ôn.', { a: '\u0000' })).replace('\u0000', `<bdi lang="en">${esc(ans)}</bdi>`);
      box.querySelector('.lv-q').insertAdjacentHTML('beforeend', nextBtn); const n = box.querySelector('[data-lv-next]'); n.onclick = onNext; n.focus({ preventScroll: true });
      try { if (g.App && App.addWord && ans.split(' ').length <= 12) Promise.resolve(App.addWord({ word: ans, pos: 'phrase', ex: ans, emoji: '🎬', topic: 'video' }, { text: ans, title: '🎬 ' + it.title }, { silent: true })).catch(() => {}); } catch (e) { /* SRS chạy nền, không chặn phản hồi */ }
    }; });
  }

  async function next(slot, it, ctx) {
    const items = await manifest(), nx = pick(items, Object.assign({}, ctx, { strict: false, mode: '' }), { exclude: it.id, prev: it });
    if (!nx) { card(slot, it, ctx); return; }
    play(slot, nx, ctx);
  }

  async function scan(root) {
    const slots = [...(root || document).querySelectorAll('.lv-slot:not([data-lv-on])')]; if (!slots.length || !R()) return;
    slots.forEach(s => s.setAttribute('data-lv-on', '1'));
    const items = await manifest(); if (!items.length) return;
    css();
    for (const s of slots) {
      let ctx = {}; try { ctx = JSON.parse(s.getAttribute('data-lv') || '{}'); } catch (e) { /* ctx rỗng */ }
      if (ctx.mode === 'word' || ctx.mode === 'grammar') ctx.strict = true;
      const it = pick(items, ctx); if (it && s.isConnected) card(s, it, ctx);
    }
  }
  g.LessonVideo = { scan, pick, manifest };
})(typeof self !== 'undefined' ? self : this);
