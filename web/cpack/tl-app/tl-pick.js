/* 🚩 Chọn ngôn ngữ ĐANG HỌC (tl) ngay trên giao diện: nút cờ ở thanh trên (desktop #tlBtn · đầu Hôm nay trên điện thoại) → bảng dưới (UI.modal v:'sheet')
 * liệt kê khóa kèm tiến độ; thẻ "Khóa học khác" ở tab Tôi. Mẫu Stitch: brand/stitch/v2/tl-pick-light|dark.html (màn "Today & Chọn khóa học", ffec224c…).
 * Danh sách = Target.avail(); ngôn ngữ chưa bật có spec (SOON) hiện "Sắp ra mắt" + "Báo tôi khi có" (lưu lk.tlnotify, không popup). Đổi: Target.set → Target.homeOf / Hôm nay.
 * Tải lười (gói 'tlpick' = js + css/tl-pick.css). Docs: docs/specs/target-language.md §Chọn ngôn ngữ. */
(function (g) {
  'use strict';
  const T = () => g.Target, tr = (k, v) => (typeof g.t === 'function' ? g.t(k, v) : k), esc = s => (g.UI ? UI.esc(s) : String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])));
  const ORDER = ['en', 'es', 'fr', 'pt'], SOON = ['fr'], NKEY = 'lk.tlnotify', AKEY = 'lk.tlannounced';
  const ls = (k, v) => { try { if (v === undefined) return g.localStorage.getItem(k); g.localStorage.setItem(k, v); } catch (e) { /* riêng tư */ } return null; };
  const list = k => { try { const a = JSON.parse(ls(k) || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; } };
  const SUB = () => ({ en: tr('IELTS, TOEIC và giao tiếp hằng ngày'), pt: tr('Tiếng Bồ Đào Nha Brazil'), es: tr('Tiếng TBN Mỹ Latinh · DELE/SIELE A1–C2'), fr: tr('Tiếng Pháp chuẩn · A1–C2') });
  const show = () => !!T() && T().LANGS.length > 1;
  // các khóa hiển thị: bật = chọn được; chưa bật mà có spec = sắp ra mắt; còn lại ẩn
  const courses = () => { const on = T().avail(); return ORDER.filter(id => T().TABLE[id] && (on.includes(id) || SOON.includes(id))).map(id => ({ id, on: on.includes(id) })); };
  async function stats() { // {tl: {n, k}} n = số thẻ, k = số đã thuộc (khoảng ôn ≥ 21 ngày) – đo từ kho thẻ thật
    const out = {}; try { const all = g.Core ? Object.values(await Core.Cards.all()) : []; all.forEach(c => { const id = T().ofCard(c), o = out[id] || (out[id] = { n: 0, k: 0 }); o.n++; if (c.srs && c.srs.interval >= 21) o.k++; }); } catch (e) { /* kho thẻ chưa sẵn */ }
    return out;
  }
  const flag = id => `<span class="tlp-flag" aria-hidden="true">${T().table(id).em}</span>`;
  const row = (c, cur, st) => {
    const id = c.id, r = T().table(id), s = st[id] || { n: 0, k: 0 }, pct = s.n ? Math.round(100 * s.k / s.n) : 0, name = `<span class="tlp-name" translate="no" lang="${id}">${esc(r.name)}</span>`;
    if (!c.on) { const got = list(NKEY).includes(id);
      return `<li class="tlp-row soon" data-tl="${id}">${flag(id)}<div class="tlp-body">${name}<span class="tlp-pill">${esc(tr('Sắp ra mắt'))}</span><span class="tlp-sub">${esc(SUB()[id] || '')}</span></div>`
        + `<button type="button" class="tlp-notify" data-notify="${id}" aria-pressed="${got}"${got ? ' disabled' : ''}>${esc(got ? tr('Sẽ báo bạn khi có') : tr('Báo tôi khi có'))}</button></li>`; }
    const on = id === cur;
    return `<li class="tlp-li"><button type="button" class="tlp-row${on ? ' on' : ''}" role="radio" aria-checked="${on}" data-tl="${id}">${flag(id)}<span class="tlp-body"><span class="tlp-top">${name}<span class="tlp-lv" translate="no">A1–C2</span>${on ? `<span class="tlp-pill tlp-cur">${esc(tr('Đang học'))}</span>` : ''}</span><span class="tlp-sub">${esc(SUB()[id] || '')}</span>`
      + `<span class="tlp-bar" role="img" aria-label="${esc(tr('{n} từ đã học', { n: s.n }))}"><i style="width:${pct}%"></i></span><span class="tlp-cnt">${esc(tr('{n} từ đã học', { n: s.n }))}</span></span>`
      + `<span class="tlp-tick" aria-hidden="true">${on ? '✓' : ''}</span></button></li>`;
  };
  function choose(id) {
    const T0 = T(); if (!T0.avail().includes(id)) return;
    const was = T0.cur(); if (id !== was) T0.set(id);
    close(); const home = T0.homeOf(id) || '#/home'; if (id !== was) skel(id);
    if (location.hash === home) { try { g.dispatchEvent(new HashChangeEvent('hashchange')); } catch (e) { location.reload(); } } else location.hash = home;
    paint();
  }
  // Chuyển khóa: lớp khung xương (cờ + tên + thanh mờ) phủ vùng nội dung tới khi trang mới vẽ xong (gói tải lười) – không để màn trống/tối (tối đa 4 s)
  function skel(id) { const v = document.getElementById('view'); if (!v) return; const old = document.querySelector('.tlp-skel'); if (old) old.remove();
    const r = T().table(id), o = document.createElement('div'); o.className = 'tlp-skel'; o.setAttribute('role', 'status'); o.setAttribute('aria-live', 'polite'); o.setAttribute('aria-label', tr('Đang tải…'));
    o.innerHTML = `<div class="tlp-skel-head"><span class="tlp-flag" aria-hidden="true">${r.em}</span><span class="tlp-name" translate="no" lang="${id}">${esc(r.name)}</span></div><i></i><i></i><i></i>`;
    document.body.appendChild(o); const t0 = Date.now(); let done = 0;
    const end = () => { if (done) return; done = 1; mo.disconnect(); clearTimeout(tm); o.classList.add('out'); setTimeout(() => o.remove(), 200); };
    const mo = new MutationObserver(() => { if (Date.now() - t0 > 250 && v.firstElementChild) setTimeout(end, 150); }); mo.observe(v, { childList: true, subtree: true }); const tm = setTimeout(end, 4000); }
  function close() { const m = document.getElementById('modal'); if (m && !m.hidden && m.querySelector('.tlp-sheet')) { if (g.UI && UI.closeModal) UI.closeModal(); else m.hidden = true; } }
  async function open() {
    if (!show()) return; const cur = T().cur(), st = await stats();
    const box = UI.modal(`<div class="tlp-sheet"><div class="tlp-grab" aria-hidden="true"></div><div class="tlp-head"><h2 id="tlpT">${esc(tr('Bạn muốn học ngôn ngữ nào?'))}</h2><button type="button" class="tlp-x" data-close aria-label="${esc(tr('Đóng'))}"><svg class="i" aria-hidden="true"><use href="#i-x"/></svg></button></div>`
      + `<ul class="tlp-list" role="radiogroup" aria-labelledby="tlpT">${courses().map(c => row(c, cur, st)).join('')}</ul><p class="tlp-foot">${esc(tr('Chọn 1 ngôn ngữ – đổi được bất cứ lúc nào ở Cài đặt.'))}</p></div>`, { v: 'sheet' });
    box.setAttribute('aria-labelledby', 'tlpT');
    box.querySelectorAll('button.tlp-row').forEach((b, i, all) => { b.onclick = () => choose(b.dataset.tl);
      b.onkeydown = e => { const d = e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : e.key === 'ArrowUp' || e.key === 'ArrowLeft' ? -1 : 0; if (d) { e.preventDefault(); all[(i + d + all.length) % all.length].focus(); } }; });
    box.querySelectorAll('[data-notify]').forEach(b => b.onclick = () => notify(b.dataset.notify, b));
    addEventListener('hashchange', close, { once: true });
  }
  function notify(id, b) { const a = list(NKEY); if (!a.includes(id)) { a.push(id); ls(NKEY, JSON.stringify(a)); } if (b) { b.disabled = true; b.setAttribute('aria-pressed', 'true'); b.textContent = tr('Sẽ báo bạn khi có'); } }
  // nút cờ: cờ + tên rút gọn không cần – chỉ cờ + mũi tên (khung §5d: một icon/pill, ≥ 44 px, aria nêu ngôn ngữ hiện tại)
  const btnHtml = () => `${T().table(T().cur()).em}<span class="tlp-chev" aria-hidden="true">▾</span>`;
  const label = () => `${tr('Ngôn ngữ đang học')}: ${T().table(T().cur()).name}`;
  function mk(cls) { const b = document.createElement('button'); b.type = 'button'; b.className = cls; b.dataset.act = 'tl'; b.setAttribute('aria-haspopup', 'dialog'); b.innerHTML = btnHtml(); b.setAttribute('aria-label', label()); b.title = tr('Đổi ngôn ngữ học'); b.onclick = e => { e.preventDefault(); e.stopPropagation(); open(); }; return b; }
  function paint() { document.querySelectorAll('[data-act="tl"]').forEach(b => { b.innerHTML = btnHtml(); b.setAttribute('aria-label', label()); }); }
  // desktop: trước nút kỳ thi ở thanh trên (#examChip nằm trong .top-stats)
  function top() { if (!show() || document.getElementById('tlBtn')) return; const at = document.getElementById('examChip') || document.getElementById('streakPill'); if (!at) return; const b = mk('pill tlp-btn'); b.id = 'tlBtn'; at.before(b); }
  // điện thoại: đầu Hôm nay/Tôi (thanh trên của app ẩn): đặt cạnh nút ngôn ngữ giao diện của mẫu
  function head(root) { if (!show() || !root) return; root.querySelectorAll('[data-act="lang"]').forEach(l => { if (l.parentNode.querySelector('[data-act="tl"]')) return; const b = mk('tlp-btn tlp-mini'); l.before(b); }); }
  // thẻ "Khóa học khác" (tab Tôi/Khám phá): các khóa chưa chọn + Sắp ra mắt; bấm = mở bảng chọn
  function card(root) { if (!show() || !root || root.querySelector('.tlp-card')) return; const others = courses().filter(c => c.id !== T().cur()); if (!others.length) return;
    const s = document.createElement('section'); s.className = 'tlp-card'; s.setAttribute('aria-label', tr('Khóa học khác'));
    s.innerHTML = `<h3>${esc(tr('Khóa học khác'))}</h3><ul>${others.map(c => `<li><button type="button" class="tlp-open" data-tl="${c.id}">${flag(c.id)}<span class="tlp-body"><span class="tlp-name" translate="no" lang="${c.id}">${esc(T().table(c.id).name)}</span><span class="tlp-sub">${esc(c.on ? SUB()[c.id] : tr('Sắp ra mắt'))}</span></span><svg class="i i-dir" aria-hidden="true"><use href="#i-chevron-right"/></svg></button></li>`).join('')}</ul>`;
    s.querySelectorAll('.tlp-open').forEach(b => b.onclick = open);
    const m = root.querySelector('main') || root; m.appendChild(s); return s; }
  // người đã bấm "Báo tôi khi có" → một dòng thông báo nhẹ, đúng 1 lần, khi khóa bật (không popup)
  function announce() { if (!show()) return; const a = list(AKEY), on = T().avail(); list(NKEY).filter(id => on.includes(id) && !a.includes(id)).slice(0, 1).forEach(id => { a.push(id); ls(AKEY, JSON.stringify(a)); if (g.UI && UI.toast) UI.toast(tr('Khóa mới đã có: {name}', { name: T().table(id).name })); }); }
  // Trang của ngôn ngữ đích (vd. #/practice/esd): nhãn Target.chip() = nút cờ mở bảng chọn (một chỗ đổi về English ngay tại trang; chưa tải xong thì liên kết Cài đặt như cũ)
  const onChip = e => { const a = e.target.closest && e.target.closest('a.tl-chip[href]'); if (a) { e.preventDefault(); open(); } };
  // Explore (Khóa học / Kỹ năng): thẻ "Khóa học khác" ở cuối trang, chờ trang vẽ xong (tối đa 3 s)
  const EXPLORE = /^(courses|course|skills)$/;
  function explore(name) { if (!EXPLORE.test(name || '')) return; const v = document.getElementById('view'); if (!v) return; const go = () => { if (v.querySelector('.tlp-card') || !v.firstElementChild) return !!v.querySelector('.tlp-card'); card(v); return true; };
    if (go()) return; const mo = new MutationObserver(() => { if (go()) mo.disconnect(); }); mo.observe(v, { childList: true }); setTimeout(() => mo.disconnect(), 3000); }
  function boot() { top(); announce(); if (!boot.w) { boot.w = 1; addEventListener('lk:tl', paint); document.addEventListener('click', onChip);
    const A = g.App; if (A) { const prev = A.afterRoute; A.afterRoute = name => { if (prev) prev(name); try { explore(name); } catch (e) { /* bỏ qua */ } }; explore((location.hash.match(/^#\/?([a-z-]+)/) || [])[1]); } } }
  g.TLPick = { open, head, card, boot, top, paint, courses, notify, choose };
})(typeof self !== 'undefined' ? self : this);
