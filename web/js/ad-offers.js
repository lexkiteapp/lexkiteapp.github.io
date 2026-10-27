/* 🎁 Lời mời có thưởng ở thẻ KẾT QUẢ cuối lượt luyện (tải lười – bundle 'adoffer', gọi từ study.js). Thiết kế: docs/ADS.md §1c.
 *   Cơ hội thứ 2: làm lại đúng các câu sai, đúng hết → điểm được tính lại (qua bài nếu đủ 80 %).
 *     Có video (app, cờ bật) → "▶ Xem video"; không có video → 1 lần MIỄN PHÍ mỗi ngày (web vẫn được lợi, không bao giờ chặn việc học).
 *   Nhân đôi XP: chỉ khi có video, điểm ≥ 60 %.
 * Luật: người dùng tự bấm, tối đa 1 lời mời mỗi loại / lượt, không hiện ở lượt "cơ hội 2", không mời khi sai quá nhiều (học lại mới đúng). */
(function (g) {
  const ls = (k, v) => { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } };
  const day = () => { const z = new Date(); return z.getFullYear() + '-' + String(z.getMonth() + 1).padStart(2, '0') + '-' + String(z.getDate()).padStart(2, '0'); };
  const freeRetry = () => ls('lk.retryFree') !== day();
  const can = r => (g.Ads ? g.Ads.rewarded(r, 1).catch(() => false) : Promise.resolve(false));
  // Ô quảng cáo ở CUỐI trang kết quả (web): chỉ khi chắc chắn được hiện – ≥ 24 giờ từ lần đầu, điểm ≥ 50 % – chèn dưới cùng nên không đẩy nội dung (0 CLS)
  const firstAt = () => { try { return JSON.parse(ls('lk.ads') || '{}').firstAt || 0; } catch (e) { return 0; } };
  function doneSlot(el, pct) {
    const f = firstAt(); if (!el || !g.Ads || pct < 50 || !f || Date.now() - f < 864e5) return;
    const html = g.Ads.slot('done', 1); if (!html) return;
    el.innerHTML = html; const a = el.firstElementChild; if (a) a.dataset.pct = pct;
  }
  // Sai quá nhiều thì không "cứu" – mời học lại (đúng phương pháp), chỉ cứu lỗi lẻ tẻ
  const rescuable = c => c.wrong > 0 && c.wrong <= Math.max(2, Math.ceil(c.total * 0.4));
  function css() {
    if (document.getElementById('aoCss')) return;
    const st = document.createElement('style'); st.id = 'aoCss';
    st.textContent = `.ad-offer{margin-top:1rem;display:grid;gap:.55rem}.ao-row{display:flex;gap:.6rem;align-items:center;flex-wrap:wrap;padding:.7rem .8rem;border:1px solid var(--line);border-radius:14px;background:var(--surface-2);text-align:start}
.ao-row p{margin:0;flex:1 1 200px}.ao-row .btn{min-height:44px}.ao-row small{display:block;color:var(--muted)}`;
    document.head.appendChild(st);
  }

  /** host: phần tử trống ở cuối thẻ kết quả. c: { wrong, total, score, pct, unit, xp, second, retry(), } */
  async function attach(host, c) {
    if (!host || !c) return;
    if (!c.second) doneSlot(c.done, c.pct);
    if (c.second) return;
    const [adR, adX] = await Promise.all([rescuable(c) ? can('retry') : false, c.pct >= 60 && c.xp > 0 ? can('xp2') : false]);
    if (!host.isConnected) return;
    const viaR = !rescuable(c) ? '' : adR ? 'ad' : freeRetry() ? 'free' : '';
    const pass = c.unit && c.pct < 80 && Math.round((c.score + c.wrong) / c.total * 100) >= 80;
    const rows = [];
    if (viaR) rows.push(`<div class="ao-row"><p>🎯 <b>${t('Cơ hội thứ 2')}</b><small>${pass ? t('Làm lại {n} câu sai – đúng hết là qua bài!', { n: c.wrong }) : t('Làm lại {n} câu sai – đúng hết thì điểm được tính lại.', { n: c.wrong })}</small></p>
      <button class="btn sm primary" type="button" data-ao="retry">${viaR === 'ad' ? '▶ ' + t('Xem video để làm lại') : '🎁 ' + t('Làm lại miễn phí')}</button></div>`);
    if (adX) rows.push(`<div class="ao-row"><p>⚡ <b>${t('Nhân đôi XP')}</b><small>${t('Xem 1 video ngắn để nhận thêm +{xp} XP.', { xp: c.xp })}</small></p>
      <button class="btn sm" type="button" data-ao="xp2">▶ ${t('Nhận x2 XP')}</button></div>`);
    if (!rows.length) return;
    css();
    host.innerHTML = `<div class="ad-offer">${rows.join('')}</div>`;
    const r = host.querySelector('[data-ao="retry"]'), x = host.querySelector('[data-ao="xp2"]');
    if (r) r.onclick = async () => {
      r.disabled = true;
      const ok = viaR === 'ad' ? await g.Ads.rewarded('retry').catch(() => false) : (ls('lk.retryFree', day()), true);
      if (!ok) { r.disabled = false; g.UI && g.UI.toast(t('Chưa xem hết video – thử lại nhé')); return; }
      c.retry();
    };
    if (x) x.onclick = async () => {
      x.disabled = true;
      const ok = await g.Ads.rewarded('xp2').catch(() => false);
      if (!ok) { x.disabled = false; g.UI && g.UI.toast(t('Chưa xem hết video – thử lại nhé')); return; }
      if (g.App && g.App.reward) g.App.reward({ xp: c.xp }, x);
      x.closest('.ao-row').remove();
      g.UI && g.UI.toast(t('+{xp} XP đã được cộng!', { xp: c.xp }));
    };
  }
  g.AdOffers = { attach, rescuable, freeRetry, doneSlot };
})(typeof self !== 'undefined' ? self : this);
