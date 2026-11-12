/* Thẻ trang chủ "Chào mừng quay lại" (3/7/14 ngày nghỉ) + "Tuần qua của bạn" (1 lần/tuần): tách khỏi retention.js để gói nền nhẹ hơn;
 * nạp qua App.need('retcards') chỉ khi cần (retention.js Ret.home). Logic/chuỗi giữ nguyên, không cắt tính năng. */
(function (g) {
  'use strict';
  const keyOf = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  /** Tổng kết tuần T2→CN vừa qua (so tuần trước) từ game.days; phút = ƯỚC TÍNH theo số việc */
  const recap = (gameDays, now) => {
    const d0 = new Date(now || Date.now()); d0.setHours(12, 0, 0, 0);
    const end = new Date(d0); end.setDate(d0.getDate() - ((d0.getDay() + 6) % 7) - 1);
    const sum = e => { const o = { newWords: 0, reviews: 0, quizzes: 0, spoken: 0, xp: 0, active: 0 }; for (let i = 0; i < 7; i++) { const d = new Date(e); d.setDate(e.getDate() - i); const x = (gameDays || {})[keyOf(d)]; if (!x) continue; o.newWords += x.newWords || 0; o.reviews += x.reviews || 0; o.quizzes += x.quizzes || 0; o.spoken += x.spoken || 0; o.xp += x.xp || 0; if (x.xp > 0) o.active++; } o.mins = Math.round(o.reviews * 0.3 + o.newWords * 0.5 + o.quizzes * 2 + o.spoken * 0.3); return o; };
    const prevEnd = new Date(end), start = new Date(end); prevEnd.setDate(end.getDate() - 7); start.setDate(end.getDate() - 6);
    return { week: keyOf(start), cur: sum(end), prev: sum(prevEnd) };
  };
  g.RetCards = (anchor, { Core, state, App, days, esc, t }) => {
    if (!document.getElementById('retCardCss')) { const s = document.createElement('style'); s.id = 'retCardCss'; s.textContent = `.ret-recap{margin:0 0 .8rem;padding:.9rem}.ret-recap-g{display:grid;grid-template-columns:repeat(4,1fr);gap:.4rem;margin:.6rem 0;text-align:center}.ret-recap-g b{display:block;font-size:1.25rem}.ret-recap-g small{display:block;line-height:1.2}
.ret-back{display:flex;flex-direction:column;gap:.7rem;padding:.9rem;margin:0 0 .8rem}.ret-back-h{display:flex;align-items:center;gap:.75rem}.ret-back-h p{margin:.15rem 0 0}.ret-back-a{display:flex;flex-wrap:wrap;gap:.5rem}.ret-back-a .btn{min-height:44px}`; document.head.appendChild(s); }
  const BACK_KEY = 'lk.back';
  const backCard = anchor => {
    const v = anchor.parentNode; if (!v || v.querySelector('.ret-back')) return;
    const ds = days(), gap = Core.gap(ds, Date.now()), tier = Core.backTier(gap); if (!tier) return;
    const ep = (() => { const d = new Date(); d.setDate(d.getDate() - gap); return keyOf(d); })(); // đợt nghỉ = ngày học cuối cùng
    try { if (localStorage.getItem(BACK_KEY) === ep) return; localStorage.setItem(BACK_KEY, ep); } catch (e) { /* không lưu được → vẫn hiện, lần sau lặp lại – vô hại */ }
    const msg = tier === 3 ? t('Rất vui được gặp lại bạn! Ôn nhanh vài từ để lấy lại nhịp nhé.') : tier === 7 ? t('Bạn đã nghỉ {n} ngày – không sao cả! Mình ôn lại vài từ dễ trước nhé.', { n: gap }) : t('Lâu quá mới gặp! Mình bắt đầu lại thật nhẹ nhàng, chỉ vài phút thôi.');
    anchor.insertAdjacentHTML('beforebegin', `<section class="card ret-back" aria-label="${esc(t('Chào mừng bạn quay lại!'))}"><div class="ret-back-h">${g.Kit ? g.Kit.svg('happy', 56) : ''}<div><b>${t('Chào mừng bạn quay lại!')}</b><p class="muted small">${esc(msg)}</p></div></div>
      <div class="ret-back-a"><a class="btn primary" href="#/review" data-back="go">${t('Ôn nhanh vài từ')}</a><button type="button" class="btn" data-back="later">${t('Để sau')}</button></div></section>`);
    const box = v.querySelector('.ret-back'), hab = App.habTrack || (() => {});
    hab('back_seen');
    box.querySelector('[data-back=go]').addEventListener('click', () => hab('back_go'));
    box.querySelector('[data-back=later]').addEventListener('click', () => box.remove());
  };
  // ---------- Tổng kết tuần: thẻ trang chủ 1 lần mỗi tuần (sau tuần có học), không so sánh áp lực ----------
  const RECAP_KEY = 'lk.recap';
  const recapCard = anchor => {
    const v = anchor.parentNode; if (!v || v.querySelector('.ret-recap, .ret-back')) return;
    const r = recap((state.game || {}).days, Date.now()); if (!r.cur.xp) return;
    try { if (localStorage.getItem(RECAP_KEY) === r.week) return; localStorage.setItem(RECAP_KEY, r.week); } catch (e) { /* vẫn hiện */ }
    const c = r.cur, cell = (n, l) => `<div><b>${n}</b><small class="muted">${esc(l)}</small></div>`;
    anchor.insertAdjacentHTML('beforebegin', `<section class="card ret-recap" aria-label="${esc(t('Tuần qua của bạn'))}"><div class="row between"><b>${t('Tuần qua của bạn')}</b><button type="button" class="btn sm" data-recap="x" aria-label="${esc(t('Đóng'))}">✕</button></div>
      <div class="ret-recap-g">${cell(c.newWords, t('Từ mới học'))}${cell('≈' + c.mins, t('Phút học (ước tính)'))}${cell(c.spoken, t('Từ đã nói to'))}${cell(c.active + '/7', t('Số ngày có học'))}</div>
      <p class="muted small" style="margin:0 0 .5rem">${c.xp >= r.prev.xp && r.prev.xp ? t('Tuần qua bạn học nhiều hơn tuần trước đó – tuyệt vời!') : t('Mỗi tuần một chút là đủ. Mình cùng đi tiếp nhé!')}</p>
      <a class="btn" href="#/stats" data-recap="go">${t('Xem tiến bộ')}</a></section>`);
    const box = v.querySelector('.ret-recap'), hab = App.habTrack || (() => {});
    hab('recap_seen'); box.querySelector('[data-recap=go]').addEventListener('click', () => hab('recap_go')); box.querySelector('[data-recap=x]').addEventListener('click', () => box.remove());
  }
    try { localStorage.setItem('lk.cd', keyOf(new Date())); } catch (e) { /* vẫn chạy */ }
    backCard(anchor); recapCard(anchor);
  };
  g.RetCards.recap = recap;
})(typeof window !== 'undefined' ? window : globalThis);
