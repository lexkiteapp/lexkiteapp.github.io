/**
 * 🧊 Giao diện Đóng băng chuỗi (Streak Freeze UI)
 * Nối với Core.Stats.freezeInfo(game) – nguồn duy nhất là dữ liệu game (freezes/frozen/freezeSaved)
 */
(function (g) {
  'use strict';

  const t = (k, p) => (g.t ? g.t(k, p) : k);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

  // Micro-audio thêm cho Sfx (tách khỏi khung app: game.js chỉ giữ API rỗng cho tới khi gói này nạp xong)
  if (g.Sfx && g.Sfx.extend) g.Sfx.extend((tone, buzz) => ({
    tap: () => { tone([480], 0.04, 'sine', 0.03); buzz(8); },
    streak: () => tone([523, 659, 784, 1047], 0.08, 'triangle', 0.06),
    shimmer: () => tone([1175, 1318, 1568, 2093], 0.06, 'sine', 0.04),
    combo: n => {
      const scale = [440, 494, 554, 659, 740, 880, 988, 1108];
      const f = scale[Math.min(Math.max(0, (n || 1) - 1), scale.length - 1)];
      tone([f, Math.round(f * 1.25)], 0.08, 'triangle', 0.05); buzz(10);
    },
  }));

  const FLAME_CSS = `
.streak-freeze-badge{display:inline-flex;align-items:center;justify-content:center;font-size:.82rem;font-weight:700;padding:.15rem .45rem;border-radius:999px;background:rgba(56,189,248,.15);color:#0284c7;border:1px solid rgba(56,189,248,.35);cursor:pointer;transition:transform .15s ease,background .15s;margin-left:.25rem}
.streak-freeze-badge:hover{transform:scale(1.06);background:rgba(56,189,248,.25)}
.pill.fire.flaming,.streak-flame.on{display:inline-flex;align-items:center;gap:.25rem;position:relative}
.pill.fire.flaming i.flame-icon,.streak-flame i.flame-icon{display:inline-block;font-style:normal;will-change:transform,filter;animation:streakFlameBurn 1.6s ease-in-out infinite alternate}
@keyframes streakFlameBurn{0%{transform:scale(1) rotate(-1deg);filter:drop-shadow(0 0 2px rgba(249,115,22,.4))}50%{transform:scale(1.12) rotate(2deg);filter:drop-shadow(0 0 7px rgba(234,88,12,.7))}100%{transform:scale(.96) rotate(-2deg);filter:drop-shadow(0 0 3px rgba(245,158,11,.5))}}
.shimmer-fx,.pill-shimmer{position:relative;overflow:hidden}
.shimmer-fx::after,.pill-shimmer::after{content:'';position:absolute;top:0;left:-150%;width:100%;height:100%;background:linear-gradient(90deg,transparent 0%,rgba(255,255,255,.32) 50%,transparent 100%);animation:shimmerSweep 3s infinite ease-in-out;pointer-events:none}
@keyframes shimmerSweep{0%{left:-150%}35%,100%{left:150%}}
@media (prefers-reduced-motion: reduce){.pill.fire.flaming i.flame-icon,.streak-flame i.flame-icon{animation:none!important;transform:none!important;filter:none!important}.shimmer-fx::after,.pill-shimmer::after{animation:none!important;display:none!important}}`;

  const StreakUI = {
    ensureCss() {
      if (typeof document === 'undefined' || document.getElementById('streakFlameCss')) return;
      const s = document.createElement('style'); s.id = 'streakFlameCss'; s.textContent = FLAME_CSS;
      document.head.appendChild(s);
    },
    decorate() {
      StreakUI.ensureCss();
      if (typeof document === 'undefined') return;
      const pill = document.getElementById('streakPill');
      if (pill) {
        const text = pill.textContent || '';
        const m = text.match(/🔥\s*(\d+)/);
        const count = m ? parseInt(m[1], 10) : 0;
        if (count >= 1 && !pill.classList.contains('flaming')) {
          pill.classList.add('flaming');
          if (!pill.querySelector('i.flame-icon')) {
            const rest = text.replace('🔥', '').trim();
            pill.innerHTML = `<i class="flame-icon" aria-hidden="true">🔥</i> <span>${esc(rest)}</span>`;
          }
        }
      }
      const xpPill = document.getElementById('xpPill');
      if (xpPill && !xpPill.classList.contains('pill-shimmer')) {
        xpPill.classList.add('pill-shimmer');
      }
    },
    /**
     * Lấy thông tin đóng băng chuỗi từ stats
     * @param {Object} stats
     * @returns {{ left: number, max: number, used: string[], lastSave: string }}
     */
    freezeInfo(stats) {
      if (g.Core && g.Core.Stats && typeof g.Core.Stats.freezeInfo === 'function') {
        return g.Core.Stats.freezeInfo(stats);
      }
      const f = stats || {}; // dữ liệu game: freezes / frozen / freezeSaved
      return { left: +f.freezes || 0, max: 2, used: Object.keys(f.frozen || {}).sort().slice(-7), lastSave: f.freezeSaved || '' };
    },

    /**
     * Kiểm tra một ngày cụ thể (YYYY-MM-DD) có phải ngày đóng băng không
     * @param {string} dateKey
     * @param {Object} stats
     * @returns {boolean}
     */
    isFrozen(dateKey, stats) {
      if (!dateKey) return false;
      const fi = StreakUI.freezeInfo(stats);
      return Array.isArray(fi.used) && fi.used.includes(dateKey);
    },

    /**
     * Tạo chuỗi HTML huy hiệu 🧊×N cạnh số chuỗi có aria-label chuẩn a11y
     * @param {Object} stats
     * @returns {string}
     */
    badgeHtml(stats) {
      const fi = StreakUI.freezeInfo(stats);
      const left = fi.left;
      const max = fi.max;
      const aria = t('{n} lượt đóng băng chuỗi', { n: left });
      const tip = t('Đóng băng chuỗi: còn {n}/{max} lượt. Bấm để xem chi tiết.', { n: left, max });
      return `<button type="button" class="streak-freeze-badge" data-streak-freeze aria-label="${esc(aria)}" title="${esc(tip)}">🧊×${left}</button>`;
    },

    /**
     * Mở hộp thoại giải thích cơ chế đóng băng chuỗi khi người dùng bấm vào huy hiệu
     * @param {Object} [stats]
     */
    openExplainer(stats) {
      const curStats = stats || (g.App && g.App.state && g.App.state.stats) || {};
      const fi = StreakUI.freezeInfo(curStats);
      const kitSvg = (g.Kit && typeof g.Kit.svg === 'function') ? g.Kit.svg('happy', 72, true) : '🧊';
      const UI = g.UI;
      if (!UI || typeof UI.modal !== 'function') return;

      UI.modal(`
        <div class="streak-explainer-dialog center" style="text-align:center;padding:.4rem 0">
          <div style="margin-bottom:.6rem">${kitSvg}</div>
          <h2 style="margin:0 0 .8rem;font-size:1.5rem">${t('Đóng băng chuỗi 🧊')}</h2>
          <div class="streak-explainer-list card" style="text-align:left;line-height:1.6;margin-bottom:1.2rem;background:var(--surface-2);padding:1rem;border-radius:12px">
            <div style="margin-bottom:.6rem">🛡️ <b>${t('Tự động bảo vệ:')}</b> ${t('Nếu bạn lỡ quên học 1 ngày, hệ thống sẽ tự động dùng 1 lượt đóng băng để giữ chuỗi ngày liên tiếp.')}</div>
            <div style="margin-bottom:.6rem">🎁 <b>${t('Nhận thêm lượt:')}</b> ${t('Cứ 7 ngày học liên tiếp bạn được thêm 1 lượt (tối đa {max} lượt).', { max: fi.max })}</div>
            <div style="margin-bottom:.6rem">🧊 <b>${t('Hiện có:')}</b> <span class="chip ok" style="background:rgba(56,189,248,.18);color:#0284c7;font-weight:700">${t('{n}/{max} lượt khả dụng', { n: fi.left, max: fi.max })}</span></div>
            <div class="tiny muted">ℹ️ ${t('Ngày đóng băng vẫn được tính vào chuỗi nên chuỗi không bị đứt.')}</div>
          </div>
          <button class="btn primary block" data-close style="min-height:44px">${t('Đã hiểu')}</button>
        </div>
      `);
    },

    /**
     * Hiển thị màn hình chúc mừng "Chuỗi đã được cứu 🧊" có mascot Kit
     * @param {Object} stats
     * @param {Object} [fi]
     */
    showSavedModal(stats, fi) {
      const curFi = fi || StreakUI.freezeInfo(stats);
      const streakN = (g.App && typeof g.App.streak === 'function')
        ? g.App.streak()
        : (g.Core && g.Core.Stats ? g.Core.Stats.streak(stats) : 1);
      const kitSvg = (g.Kit && typeof g.Kit.svg === 'function') ? g.Kit.svg('happy', 84, true) : '🎉';
      const UI = g.UI;
      if (!UI || typeof UI.modal !== 'function') return;

      const box = UI.modal(`
        <div class="streak-saved-dialog center" style="text-align:center;padding:.5rem 0">
          <div class="streak-saved-kit" style="margin-bottom:.8rem">${kitSvg}</div>
          <span class="chip ok" style="background:rgba(56,189,248,.18);color:#0284c7;font-weight:700;margin-bottom:.5rem">🧊 ${t('Đóng băng chuỗi')}</span>
          <h2 style="margin:.4rem 0 .6rem;font-size:1.6rem">${t('Chuỗi đã được cứu 🧊')}</h2>
          <p class="muted" style="line-height:1.55;max-width:360px;margin:0 auto 1.2rem">${t('Hôm qua bạn lỡ học, nhưng Lexkite đã tự động dùng 1 lượt đóng băng để giữ chuỗi 🔥{n} ngày của bạn!', { n: streakN })}</p>
          
          <div class="streak-saved-status card" style="background:var(--surface-2);border-radius:12px;padding:.8rem 1rem;margin-bottom:1.2rem;text-align:left">
            <div class="row between" style="margin-bottom:.3rem">
              <span style="font-weight:600">🧊 ${t('Lượt đóng băng còn lại:')}</span>
              <b>${t('{n}/{max} lượt', { n: curFi.left, max: curFi.max })}</b>
            </div>
            <div class="tiny muted">${t('Cứ 7 ngày học liên tiếp bạn được thêm 1 lượt (tối đa {max} lượt).', { max: curFi.max })}</div>
          </div>

          <div class="row center" style="gap:.8rem;flex-wrap:wrap">
            <button class="btn primary lg" id="streakSavedStudy" style="min-width:180px;min-height:44px">${t('Học ngay hôm nay')} →</button>
            <button class="btn ghost" data-close style="min-height:44px">${t('Đóng')}</button>
          </div>
        </div>
      `);

      const studyBtn = document.getElementById('streakSavedStudy');
      if (studyBtn) {
        studyBtn.onclick = () => {
          if (UI.closeModal) UI.closeModal();
          location.hash = '#/review';
        };
      }
      if (g.Sfx && typeof g.Sfx.streak === 'function') g.Sfx.streak();
      else if (g.Sfx && typeof g.Sfx.win === 'function') g.Sfx.win();
      if (typeof g.confetti === 'function') g.confetti(100);
      return box;
    },

    /**
     * Kiểm tra xem giao diện có đang mở modal hay màn thưởng không để tránh đè lớp
     * @returns {boolean}
     */
    canShowModal() {
      if (typeof document === 'undefined') return false;
      const hasModal = document.querySelector('.modal-wrap, .modal-backdrop, #rewardModal, .reward-modal, .path-reward, #reviewDone');
      return !hasModal;
    },

    /**
     * Kiểm tra khi mở app: nếu lastSave === hôm nay thì hiện 1 lần màn cứu chuỗi, lưu cờ đã xem vào Core.Store
     * Xếp hàng hiện sau nếu đang có modal hoặc màn thưởng khác
     * @param {Object} stats
     */
    async checkSavedNotice(stats) {
      if (!stats) return;
      const fi = StreakUI.freezeInfo(stats);
      const today = (g.Core && g.Core.todayKey) ? g.Core.todayKey() : new Date().toISOString().slice(0, 10);
      if (!fi.lastSave || fi.lastSave !== today) return;

      const Store = g.Core && g.Core.Store;
      const seenKey = 'streak_saved_seen';
      let seen = '';
      if (Store && typeof Store.get === 'function') {
        seen = await Store.get(seenKey, '');
      } else {
        try { seen = localStorage.getItem('lk.' + seenKey) || ''; } catch (e) { /* bỏ qua */ }
      }
      if (seen === today) return;

      if (Store && typeof Store.set === 'function') {
        await Store.set(seenKey, today);
      } else {
        try { localStorage.setItem('lk.' + seenKey, today); } catch (e) { /* bỏ qua */ }
      }

      // Xếp hàng: nếu đang có modal hoặc màn thưởng thì chờ tối đa 30s
      const tryShow = (retries = 30) => {
        if (StreakUI.canShowModal()) {
          StreakUI.showSavedModal(stats, fi);
        } else if (retries > 0) {
          setTimeout(() => tryShow(retries - 1), 1000);
        }
      };

      setTimeout(() => tryShow(30), 800);
    },
  };

  // Gắn sự kiện click toàn cục cho huy hiệu [data-streak-freeze] & tự trang trí ngọn lửa/shimmer
  if (typeof document !== 'undefined') {
    StreakUI.ensureCss();
    setTimeout(() => StreakUI.decorate(), 120);
    document.addEventListener('click', e => {
      const btn = e.target && e.target.closest && e.target.closest('[data-streak-freeze]');
      if (btn) {
        e.preventDefault();
        StreakUI.openExplainer();
      }
    });
  }

  g.StreakUI = StreakUI;
})(typeof self !== 'undefined' ? self : this);
