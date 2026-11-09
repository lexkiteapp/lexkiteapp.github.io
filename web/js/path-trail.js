/* 🧭 Lộ trình MỘT component (khung Stitch path + path-sheet): thu gọn = chặng hiện tại, mở rộng = thêm chặng cùng hình, không có bản thứ hai.
 * Nội dung nút: cpack/lesson/path-nodes.js (tải lười). Chặng có ô truyện rỗng: ẩn nút và tự bỏ qua vị trí đó (bộ đếm đi theo số nút thấy được). */
(function () {
  const SLOTS = ['lesson', 'listen', 'speak', 'story', 'review', 'exam'], XS = [44, 66, 52, 66, 48, 60], H = 84, HC = 196, SPAN = 11, RING = 238.76;
  const unitC = id => ((self.LESSON_PATH_NODES || {}).units || {})[id] || null;
  const slotOf = (c, s) => c.nodes.find(x => x.slot === s) || null;
  const hidden = (u, i) => { const c = unitC(u.id); if (!c || SLOTS[i] !== 'story') return false; const s = slotOf(c, 'story'); return !!s && !s.story; };
  const cell = (u, i, kind) => { const c = unitC(u.id); return c ? slotOf(c, kind === 'review' ? 'review' : SLOTS[i]) : null; }; // nextKind đổi nút thành ôn → dùng nội dung ô ôn
  const skip = (n, unitAt) => { let m = n; for (let g = 0; g < SLOTS.length; g++) { if (!hidden(unitAt(m, SLOTS.length), m % SLOTS.length)) break; m++; } return m; };
  const wordsOf = (n, unitAt, kind) => { const u = unitAt(n, SLOTS.length), it = cell(u, n % SLOTS.length, kind); if (!it || !it.words.length) return null;
    return it.words.map(w => Object.assign({ word: w.w, pos: w.pos, vi: w.vi, def: w.def, ipa: w.ipa, ipaUS: w.ipaUS }, (u.words || []).find(x => x.word === w.w) || {}, { sentences: it.ex.filter(x => new RegExp('\\b' + w.w + '\\b', 'i').test(x.en)).map(x => ({ en: x.en, vi: x.vi })) })); };
  const storyOf = (n, unitAt) => (cell(unitAt(n, SLOTS.length), n % SLOTS.length, 'story') || {}).story || ''; // nút Truyện mở đúng truyện đã hứa ở tấm chi tiết
  // o: { P, at, n, Q, unitAt, check, can, kmin, tch } → hàng cho khung path + bảng tra cho tấm chi tiết
  function build(o, full) {
    const { P, at, n, Q } = o, L = P.length, cu = Math.floor(n / L), from = full ? (cu < SPAN ? 0 : cu - 5) : cu, to = full ? from + SPAN - 1 : cu, rows = [], by = {}; let before = '';
    for (let k = from; k <= to; k++) {
      const u = o.unitAt(k * L, L), c = unitC(u.id), vis = SLOTS.map((_, i) => i).filter(i => !hidden(u, i)), stOf = i => (k < cu || (k === cu && i < at) ? 'done' : k === cu && i === at ? 'cur' : 'lock');
      const dn = vis.filter(i => stOf(i) === 'done').length, stage = t('Chặng học {n}', { n: u.no }), unit = c ? t(c.theme) : u.name, xAt = j => XS[j % XS.length];
      rows.push({ v: 'head', stage, unit, can: c ? t(c.can) : o.can[u.id] || '', of: t('{a}/{b} bài', { a: dn, b: vis.length }), pct: Math.round(dn / vis.length * 100), guide: k === cu });
      vis.forEach((i, j) => { const st = stOf(i), kind = k === cu ? P[i].kind : SLOTS[i], it = cell(u, i, kind), x = xAt(j), a = j ? (xAt(j - 1) + x) / 2 : x, b = j < vis.length - 1 ? (xAt(j + 1) + x) / 2 : x, h = st === 'cur' ? HC : H, cy = h / 2, abs = k * L + i;
        const label = it ? t(it.title) : u.name, min = it ? it.min : o.kmin[kind] || 4, minT = t('{n} phút', { n: min }), id = 'n' + abs;
        const r = { v: st === 'done' ? 'done' : st === 'cur' ? 'cur' : SLOTS[i] === 'exam' ? 'chk' : 'lock', id, h, cy, x, pin: `M${a} 0 C${a} ${cy / 2} ${x} ${cy / 2} ${x} ${cy}`, pout: `M${x} ${cy} C${x} ${(cy + h) / 2} ${b} ${(cy + h) / 2} ${b} ${h}`, label, sub: it ? t(it.sub) : minT, aria: `${label} – ${t(st === 'done' ? 'Đã xong' : st === 'cur' ? 'Đang học' : 'Đã khóa')}` };
        if (st === 'cur') Object.assign(r, { href: `#/lesson/go${Q}`, start: t('Bắt đầu'), min: minT, off: (RING * (1 - dn / vis.length)).toFixed(1), tch: o.tch() });
        const redo = SLOTS[i] === 'exam' ? o.check(abs).href : it && it.story ? `#/lesson/go${Q ? Q + '&' : '?'}story=${encodeURIComponent(it.story)}` : `#/lesson/go${Q ? Q + '&' : '?'}redo=${abs}`;
        by[id] = { st, label, sub: r.sub, minT, over: `${stage} · ${unit}`, words: it ? it.words.map(w => w.w) : [], ex: it ? it.ex.map(x => { const tr = t(x.vi); return { en: x.en, tr: tr === x.en ? '' : tr }; }) : [], href: st === 'cur' ? r.href : st === 'done' ? redo : '', before };
        before = label; rows.push(r); });
    }
    return { rows, by, ph: { open: String(!!full), more: full ? t('Thu gọn lộ trình') : t('Xem toàn bộ lộ trình →') } };
  }
  const openSheet = async it => { await App.need('psheet'); const go = it.st === 'lock' ? t('Hoàn thành {x} để mở', { x: it.before }) : it.st === 'cur' ? t('Bắt đầu') : t('Ôn lại');
    const box = UI.modal(ST2['path-sheet']({ over: it.over, title: it.label, sub: it.sub, wordsL: t('Từ sẽ luyện'), exL: t('Ví dụ'), min: it.minT, go, href: it.href, close: t('Đóng'), words: it.words, ex: it.ex }).main.replace(/^<main[^>]*>/, '<div class="v2s-path-sheet"><div class="st v2 v2-path-sheet">').replace(/<\/main>$/, '</div></div>'), { v: 'sheet' });
    const panel = box.querySelector('.v2-path-sheet > div'), secs = [...panel.children], gone = (lst, el) => { if (!lst.length) { const lab = el.previousElementSibling; lab.remove(); el.remove(); } };
    gone(it.words, secs.find(x => x.classList.contains('flex-wrap'))); gone(it.ex, secs.find(x => x.classList.contains('rounded-2xl')));
    box.querySelector('[data-act="pclose"]').addEventListener('click', () => UI.closeModal());
    box.querySelectorAll('[data-say]').forEach(b => b.addEventListener('click', () => UI.tts(b.getAttribute('data-say'), 'en-US')));
    const g = box.querySelector('[data-act="pgo"]'); if (it.st === 'lock') { g.disabled = true; g.setAttribute('data-locked', ''); g.removeAttribute('data-href'); } else g.addEventListener('click', () => UI.closeModal()); };
  // Gắn vào khối đã vẽ: mở rộng tại chỗ (chỉ thêm hàng), bấm nút mở tấm chi tiết
  function wire(root, o, first) {
    const list = root.querySelector('[data-pv]'), px = root.querySelector('[data-act="pathx"]'); if (!list || !px) return null; let cur = first;
    const paint = full => { cur = build(o, full); const tpl = document.createElement('template'); tpl.innerHTML = o.render(cur); list.innerHTML = tpl.content.querySelector('[data-pv]').innerHTML; px.textContent = cur.ph.more; px.setAttribute('aria-expanded', cur.ph.open); o.guide(list); };
    list.addEventListener('click', e => { if (e.target.closest('[data-cur],[data-act="guide"]')) return; const r = e.target.closest('[data-pr]'); if (r && cur.by[r.getAttribute('data-pr')]) openSheet(cur.by[r.getAttribute('data-pr')]).catch(() => App.toast && App.toast(t('Không tải được – thử lại sau'))); });
    const set = (on, go) => { paint(on); if (on && go) o.toCur(list); else if (!on) { const top = list.getBoundingClientRect().top; if (top < 0) try { list.scrollIntoView({ block: 'start' }); } catch (e) { /* bỏ qua */ } } };
    px.addEventListener('click', e => { e.preventDefault(); set(px.getAttribute('aria-expanded') !== 'true', true); });
    if ('requestIdleCallback' in self) requestIdleCallback(() => App.need('psheet').catch(() => {})); // tấm chi tiết sẵn sàng trước khi bấm, không đội màn đầu
    return set;
  }
  self.PathTrail = { SLOTS, hidden, skip, wordsOf, storyOf, build, wire };
})();
