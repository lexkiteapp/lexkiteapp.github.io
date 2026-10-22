/**
 * Giao diện Giải đấu tuần (Weekly League) – nối API functions/api/league.js & Sync.league
 * Thi đua XP cùng 30 người học, 6 bậc thăng hạng: Đồng → Kim cương.
 */
(function () {
  // CSS Bảng xếp hạng (chuyển từ style.css – khung app ≤ 375 KB gz)
  if (!document.getElementById('lgCss')) { const st = document.createElement('style'); st.id = 'lgCss'; st.textContent = `.league-wrap { max-width: 760px; margin: 0 auto; display: flex; flex-direction: column; gap: 1rem; } .league-home-card { margin-top: .6rem; } .league-tier-ic { width: 44px; height: 44px; border-radius: 14px; display: grid; place-items: center; font-size: 1.5rem; flex: none; font-weight: 800; } .league-tier-ic.lg { width: 64px; height: 64px; font-size: 2.2rem; border-radius: 20px; } .league-tier-pill { display: inline-flex; align-items: center; gap: .35rem; padding: .35rem .75rem; border-radius: 999px; font-weight: 700; font-size: .88rem; } .league-rank-badge { display: inline-block; padding: 2px 7px; border-radius: 999px; font-size: .78rem; font-weight: 800; background: var(--surface-2); color: var(--text); } .league-result-banner { border-left: 4px solid var(--primary); padding: 1rem 1.2rem; } .league-result-banner.banner-up { border-left-color: var(--good); background: linear-gradient(135deg, var(--good-soft), var(--surface)); } .league-result-banner.banner-down { border-left-color: var(--again); background: linear-gradient(135deg, var(--again-soft), var(--surface)); } .league-hero-card { padding: 1.2rem 1.4rem; background: var(--surface); border: 1px solid var(--line); border-radius: var(--radius); } .league-stat-chip { display: flex; flex-direction: column; align-items: flex-end; padding: .35rem .75rem; border-radius: 12px; background: var(--surface-2); } .league-stat-chip b { font-size: 1.2rem; color: var(--text); } .league-board { display: flex; flex-direction: column; padding: .4rem; background: var(--surface); border-radius: var(--radius); border: 1px solid var(--line); overflow: hidden; } .league-row { display: grid; grid-template-columns: 2.8rem 1fr auto 2rem; align-items: center; gap: .6rem; padding: .65rem .85rem; border-radius: 12px; transition: background .12s ease; border-bottom: 1px solid color-mix(in srgb, var(--line) 40%, transparent); min-height: 48px; } .league-row:last-child { border-bottom: 0; } .league-row:hover { background: var(--surface-2); } .league-row.is-me { background: var(--primary-soft); outline: 2px solid var(--primary); outline-offset: -2px; font-weight: 700; z-index: 2; } .league-rank-col { text-align: center; font-weight: 800; font-size: .95rem; } .league-rank-num { display: inline-flex; align-items: center; justify-content: center; min-width: 1.8rem; } .league-rank-num.r1 { color: #f59e0b; font-size: 1.05rem; } .league-rank-num.r2 { color: #94a3b8; font-size: 1rem; } .league-rank-num.r3 { color: #cd7f32; font-size: 1rem; } .league-nick-col { display: flex; align-items: center; min-width: 0; } .league-nick { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: .95rem; } .league-xp-col { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; font-size: .92rem; } .league-zone-col { text-align: center; } .league-zone-arrow { font-size: .8rem; font-weight: 900; } .league-zone-arrow.up { color: var(--good-text); } .league-zone-arrow.down { color: var(--again-text); } .league-zone-arrow.safe { color: var(--muted); opacity: .5; } .league-zone-divider { display: flex; align-items: center; gap: .5rem; padding: .45rem .85rem; font-size: .75rem; font-weight: 700; letter-spacing: .03em; margin: .25rem 0; border-radius: 8px; } .league-zone-divider.divider-up { background: var(--good-soft); color: var(--good-text); } .league-zone-divider.divider-down { background: var(--again-soft); color: var(--again-text); } .league-zone-divider .lzd-ic { font-size: .8rem; } .league-rules-box ul { margin: .5rem 0; } .league-rules-box li { margin-bottom: .4rem; } @media (max-width: 480px) { .league-row { grid-template-columns: 2.4rem 1fr auto 1.5rem; gap: .4rem; padding: .6rem .65rem; } .league-hero-card { padding: 1rem; } .league-tier-ic.lg { width: 52px; height: 52px; font-size: 1.8rem; } }`; document.head.appendChild(st); }
  const { $, $$, esc, toast } = UI;
  const App = window.App;
  const { state, routes } = App;
  const view = App.view;

  const TIERS = [
    { id: 0, name: () => t('Hạng Đồng'), en: 'Bronze', ic: '🥉', color: '#cd7f32', bg: 'rgba(205,127,50,.14)' },
    { id: 1, name: () => t('Hạng Bạc'), en: 'Silver', ic: '🥈', color: '#94a3b8', bg: 'rgba(148,163,184,.14)' },
    { id: 2, name: () => t('Hạng Vàng'), en: 'Gold', ic: '🥇', color: '#f59e0b', bg: 'rgba(245,158,11,.16)' },
    { id: 3, name: () => t('Hạng Ngọc bích'), en: 'Emerald', ic: '❇️', color: '#10b981', bg: 'rgba(16,185,129,.16)' },
    { id: 4, name: () => t('Hạng Hồng ngọc'), en: 'Ruby', ic: '♦️', color: '#f43f5e', bg: 'rgba(244,63,94,.16)' },
    { id: 5, name: () => t('Hạng Kim cương'), en: 'Diamond', ic: '💎', color: '#06b6d4', bg: 'rgba(6,182,212,.18)' }
  ];

  function getTier(id) {
    const idx = Math.max(0, Math.min(TIERS.length - 1, Math.floor(+id || 0)));
    return TIERS[idx];
  }

  function cleanNick(s) {
    const n = String(s || '').normalize('NFC').replace(/\s+/g, ' ').trim();
    return /^[\p{L}\p{N} ._-]{2,20}$/u.test(n) && !/@|https?:|www\./i.test(n) ? n : '';
  }

  function timeRemaining(endMs) {
    if (!endMs) return '';
    const diff = endMs - Date.now();
    if (diff <= 0) return t('Đã kết thúc tuần');
    const d = Math.floor(diff / 864e5);
    const h = Math.floor((diff % 864e5) / 36e5);
    const m = Math.floor((diff % 36e5) / 6e4);
    if (d > 0) return t('còn {d} ngày {h} giờ', { d, h });
    if (h > 0) return t('còn {h} giờ {m} phút', { h, m });
    return t('còn {m} phút', { m: Math.max(1, m) });
  }

  const League = {
    TIERS,
    tier: getTier,
    cleanNick,
    timeRemaining
  };
  window.League = League;

  // ---------- Thẻ ở trang chủ (dưới Kế hoạch hôm nay) ----------
  League.renderHomeCard = async function (el) {
    if (!el) return;
    el.innerHTML = `<div class="card league-home-card"><div class="skel skel-l"></div></div>`;
    if (!window.Sync || !window.Sync.user) {
      el.innerHTML = `
        <div class="card league-home-card">
          <div class="row between wrap" style="gap:.6rem;align-items:center">
            <div class="row nowrap" style="gap:.75rem;align-items:center">
              <span class="league-tier-ic" style="background:rgba(245,158,11,.15);color:#f59e0b" aria-hidden="true">🏆</span>
              <div>
                <b>${t('Giải đấu tuần')}</b>
                <div class="muted small">${t('Thi đua XP cùng 30 người học, thăng hạng mỗi tuần')}</div>
              </div>
            </div>
            <a class="btn sm primary" href="#/league">${t('Khám phá')} →</a>
          </div>
        </div>`;
      return;
    }
    try {
      const res = await window.Sync.league('me');
      if (!res || !res.member) {
        el.innerHTML = `
          <div class="card league-home-card">
            <div class="row between wrap" style="gap:.6rem;align-items:center">
              <div class="row nowrap" style="gap:.75rem;align-items:center">
                <span class="league-tier-ic" style="background:rgba(205,127,50,.15);color:#cd7f32" aria-hidden="true">🥉</span>
                <div>
                  <b>${t('Giải đấu tuần')} · <span class="muted">${t('Chưa tham gia')}</span></b>
                  <div class="muted small">${t('Gia nhập nhóm 30 người tuần này để thi đua thăng hạng')}</div>
                </div>
              </div>
              <a class="btn sm primary" href="#/league">${t('Tham gia ngay')} →</a>
            </div>
          </div>`;
        return;
      }
      const tr = getTier(res.member.tier);
      const me = (res.board || []).find(x => x.me);
      const zoneChip = me && me.zone === 'up'
        ? `<span class="chip ok small">▲ ${t('Vùng thăng hạng')}</span>`
        : me && me.zone === 'down'
          ? `<span class="chip danger small">▼ ${t('Vùng xuống hạng')}</span>`
          : `<span class="chip small">● ${t('Vùng an toàn')}</span>`;

      el.innerHTML = `
        <a class="card hover league-home-card" href="#/league">
          <div class="row between wrap" style="gap:.6rem;align-items:center">
            <div class="row nowrap" style="gap:.75rem;align-items:center">
              <span class="league-tier-ic" style="background:${tr.bg};color:${tr.color}" aria-hidden="true">${tr.ic}</span>
              <div>
                <div class="row nowrap" style="gap:.45rem;align-items:center">
                  <b>${tr.name()}</b>
                  <span class="league-rank-badge">#${me ? me.rank : '–'}/${(res.board || []).length || 30}</span>
                  ${zoneChip}
                </div>
                <div class="muted small">${t('{xp} XP tuần này', { xp: (res.member.xp || 0).toLocaleString() })} · ${timeRemaining(res.week && res.week.end)}</div>
              </div>
            </div>
            <span class="btn sm ghost">${t('Bảng xếp hạng')} →</span>
          </div>
        </a>`;
    } catch (e) {
      el.innerHTML = '';
    }
  };

  // ---------- Modal Đổi biệt danh ----------
  League.promptChangeNick = function (currentNick) {
    UI.modal(`
      <div style="max-width:380px;margin:0 auto">
        <h2 style="margin-top:0">${t('Đổi biệt danh bảng xếp hạng')}</h2>
        <p class="muted small">${t('Biệt danh hiển thị trên bảng 30 người tuần này (2–20 ký tự).')}</p>
        <div style="margin:1rem 0">
          <input type="text" id="dlgNickInput" class="input lg" maxlength="20" value="${esc(currentNick || '')}" placeholder="${t('Nhập biệt danh…')}" autocomplete="off">
          <div id="dlgNickErr" class="danger small" style="margin-top:.4rem" hidden></div>
        </div>
        <div class="row right" style="gap:.5rem">
          <button type="button" class="btn" data-close>${t('Hủy')}</button>
          <button type="button" class="btn primary" id="dlgNickSave">${t('Lưu')}</button>
        </div>
      </div>`);
    const input = $('#dlgNickInput');
    const err = $('#dlgNickErr');
    const saveBtn = $('#dlgNickSave');
    if (input) input.focus();
    if (saveBtn) saveBtn.onclick = async () => {
      const nick = cleanNick(input.value);
      if (!nick) {
        err.textContent = t('Biệt danh phải từ 2–20 ký tự, không chứa ký tự lạ hoặc liên kết web.');
        err.hidden = false;
        return;
      }
      saveBtn.disabled = true;
      try {
        await window.Sync.league('join', { nick });
        UI.closeModal();
        toast(t('Đã đổi biệt danh thành {nick}', { nick }));
        App.route();
      } catch (e) {
        saveBtn.disabled = false;
        err.textContent = t('Không lưu được biệt danh: {msg}', { msg: e.message || e });
        err.hidden = false;
      }
    };
  };

  // ---------- Trang #/league ----------
  routes.league = async function () {
    view.innerHTML = `
      <div class="league-wrap">
        <div class="page-head">
          <div class="row between wrap" style="gap:.75rem;align-items:flex-start">
            <div>
              <h1>🏆 ${t('Giải đấu tuần')}</h1>
              <p class="muted">${t('Bảng xếp hạng 30 người học cùng hạng · Cập nhật theo tuần')}</p>
            </div>
            <div id="leagueHeaderMeta" class="row nowrap" style="gap:.5rem"></div>
          </div>
        </div>
        <div id="leagueBody" aria-busy="true">
          <div class="skel skel-l"></div><div class="skel skel-l"></div><div class="skel skel-l"></div>
        </div>
      </div>`;

    const body = $('#leagueBody');
    const meta = $('#leagueHeaderMeta');

    // Trường hợp 1: Chưa đăng nhập
    if (!window.Sync || !window.Sync.user) {
      body.removeAttribute('aria-busy');
      body.innerHTML = `
        <div class="card league-welcome-card" style="text-align:center;padding:2rem 1.2rem">
          <div style="font-size:3.2rem;margin-bottom:.5rem">🏆</div>
          <h2 style="margin:0 0 .5rem">${t('Đua top bảng xếp hạng cùng cộng đồng')}</h2>
          <p class="muted" style="max-width:520px;margin:0 auto 1.5rem">
            ${t('Đăng nhập với Google để tham gia giải đấu tuần. Mỗi tuần bạn sẽ được xếp vào một nhóm 30 người học có cùng trình độ để thi đua nhận XP, leo từ Hạng Đồng lên Hạng Kim Cương!')}
          </p>
          <div class="grid g3" style="max-width:620px;margin:0 auto 1.8rem;text-align:start;gap:.8rem">
            <div class="card sub-card">
              <div style="font-size:1.5rem">🥇</div>
              <b>${t('Thăng hạng')}</b>
              <div class="muted small">${t('Top 7 người dẫn đầu thăng hạng vào tuần tới')}</div>
            </div>
            <div class="card sub-card">
              <div style="font-size:1.5rem">🔒</div>
              <b>${t('Riêng tư')}</b>
              <div class="muted small">${t('Chỉ hiển thị biệt danh & XP tuần, an toàn tuyệt đối')}</div>
            </div>
            <div class="card sub-card">
              <div style="font-size:1.5rem">⚡</div>
              <b>${t('Tích lũy XP')}</b>
              <div class="muted small">${t('Học từ mới, ôn thẻ, đọc bài và luyện thi đều cộng XP')}</div>
            </div>
          </div>
          <button type="button" class="btn primary lg" id="leagueSignInBtn" style="min-width:240px">
            <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true" style="vertical-align:middle;margin-right:6px"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>
            ${t('Đăng nhập với Google')}
          </button>
        </div>`;
      const btn = $('#leagueSignInBtn');
      if (btn && window.Sync.can === false) btn.outerHTML = `<p class="muted">${t('Đăng nhập và đồng bộ có trên bản web {link}.', { link: '<a href="https://lexkite.com/app/" target="_blank" rel="noopener">lexkite.com</a>' })}</p>`; // app gốc chưa cấu hình đăng nhập
      else if (btn) btn.onclick = () => window.Sync.signIn();
      return;
    }

    // Lấy dữ liệu giải đấu
    let data;
    try {
      data = await window.Sync.league('me');
    } catch (e) {
      body.removeAttribute('aria-busy');
      body.innerHTML = `
        <div class="card" style="text-align:center;padding:2rem">
          <div style="font-size:2.5rem;margin-bottom:.5rem">⚠️</div>
          <h3>${t('Không tải được giải đấu')}</h3>
          <p class="muted">${t('Vui lòng kiểm tra kết nối mạng và thử lại.')}</p>
          <button type="button" class="btn primary" onclick="App.route()">${t('Thử lại')}</button>
        </div>`;
      return;
    }

    body.removeAttribute('aria-busy');

    // Trường hợp 2: Đã đăng nhập nhưng chưa tham gia
    if (!data.member) {
      const defaultNick = (window.Sync.user.displayName || '').split(' ')[0] || '';
      body.innerHTML = `
        <div class="card league-join-card" style="max-width:540px;margin:0 auto;padding:1.8rem 1.4rem">
          <div style="text-align:center;margin-bottom:1.2rem">
            <div class="league-tier-ic lg" style="background:${TIERS[0].bg};color:${TIERS[0].color};margin:0 auto .6rem">${TIERS[0].ic}</div>
            <h2 style="margin:0 0 .3rem">${t('Tham gia giải đấu tuần')}</h2>
            <div class="muted small">${t('Bắt đầu từ Hạng Đồng · Thi đua cùng 30 người học')}</div>
          </div>

          <form id="leagueJoinForm" onsubmit="return false">
            <label class="set-row col" style="margin-bottom:1rem">
              <span class="set-top">
                <span><b>${t('Đặt biệt danh của bạn')}</b></span>
                <small class="muted">${t('2–20 ký tự')}</small>
              </span>
              <input type="text" id="leagueJoinNick" class="input lg" maxlength="20" placeholder="${t('Ví dụ: Alex, Hải Nam, StarGazer…')}" value="${esc(defaultNick)}" required autocomplete="off">
              <div id="joinNickErr" class="danger small" style="margin-top:.4rem" hidden></div>
            </label>

            <div class="tip small" style="margin-bottom:1.4rem">
              🔒 <b>${t('Bảo vệ quyền riêng tư:')}</b> ${t('Chỉ hiển thị biệt danh và XP tuần trên bảng xếp hạng. Email và thông tin cá nhân của bạn hoàn toàn bảo mật.')}
            </div>

            <button type="submit" class="btn primary lg block" id="leagueJoinSubmit" style="width:100%">
              ${t('Gia nhập bảng đấu ngay')} 🚀
            </button>
          </form>
        </div>`;

      const form = $('#leagueJoinForm');
      const input = $('#leagueJoinNick');
      const errBox = $('#joinNickErr');
      const subBtn = $('#leagueJoinSubmit');

      if (form) form.onsubmit = async () => {
        const nick = cleanNick(input.value);
        if (!nick) {
          errBox.textContent = t('Biệt danh phải từ 2–20 ký tự, không chứa ký tự lạ hoặc liên kết web.');
          errBox.hidden = false;
          return;
        }
        subBtn.disabled = true;
        try {
          await window.Sync.league('join', { nick });
          toast(t('Đã tham gia giải đấu tuần! Chúc bạn thi đua vui vẻ 🎉'));
          App.route();
        } catch (e) {
          subBtn.disabled = false;
          errBox.textContent = t('Không tham gia được: {msg}', { msg: e.message || e });
          errBox.hidden = false;
        }
      };
      return;
    }

    // Trường hợp 3: Đã tham gia giải đấu
    const curTier = getTier(data.member.tier);
    const nextTier = getTier(data.member.tier + 1);
    const board = data.board || [];
    const me = board.find(x => x.me) || { rank: '–', xp: data.member.xp, nick: data.member.nick };
    const leftTime = timeRemaining(data.week && data.week.end);

    // Meta ở góc trên trang
    meta.innerHTML = `
      <span class="league-tier-pill" style="background:${curTier.bg};color:${curTier.color}">
        ${curTier.ic} ${curTier.name()}
      </span>
      <span class="pill muted" title="${t('Thời gian còn lại')}">⏳ ${leftTime}</span>
      <button type="button" class="btn sm ghost" id="leagueChangeNickBtn" title="${t('Đổi biệt danh')}">✏️ ${esc(data.member.nick)}</button>`;

    const changeNickBtn = $('#leagueChangeNickBtn');
    if (changeNickBtn) changeNickBtn.onclick = () => League.promptChangeNick(data.member.nick);

    // Thông báo kết quả tuần trước (nếu có và chưa bấm xem)
    let lastBanner = '';
    const last = data.last;
    const lastKey = last && last.week;
    const seenLast = lastKey && (localStorage.getItem('lk.leagueLastSeen') === lastKey);
    if (last && !seenLast) {
      const lastTierObj = getTier(last.tier);
      if (last.move > 0) {
        lastBanner = `
          <div class="card league-result-banner banner-up" id="leagueLastBanner">
            <div class="row between nowrap" style="align-items:flex-start;gap:.75rem">
              <div>
                <div style="font-size:1.15rem;font-weight:800;color:var(--good-text)">🎉 ${t('Chúc mừng! Bạn đã thăng hạng!')}</div>
                <div class="small" style="margin-top:.2rem">
                  ${t('Tuần trước bạn đứng hạng #{rank}/{of} với {xp} XP và đã thăng hạng lên {tier}!', { rank: last.rank, of: last.of, xp: (last.xp || 0).toLocaleString(), tier: lastTierObj.name() })}
                </div>
              </div>
              <button type="button" class="btn sm" id="btnDismissLast" style="flex:none">${t('Đã hiểu')}</button>
            </div>
          </div>`;
      } else if (last.move < 0) {
        lastBanner = `
          <div class="card league-result-banner banner-down" id="leagueLastBanner">
            <div class="row between nowrap" style="align-items:flex-start;gap:.75rem">
              <div>
                <div style="font-size:1.05rem;font-weight:700;color:var(--again-text)">📉 ${t('Kết quả tuần trước')}</div>
                <div class="small" style="margin-top:.2rem">
                  ${t('Tuần trước bạn đứng hạng #{rank}/{of} với {xp} XP và chuyển xuống {tier}. Tuần này hãy cố gắng hơn nhé!', { rank: last.rank, of: last.of, xp: (last.xp || 0).toLocaleString(), tier: lastTierObj.name() })}
                </div>
              </div>
              <button type="button" class="btn sm" id="btnDismissLast" style="flex:none">${t('Đã hiểu')}</button>
            </div>
          </div>`;
      } else {
        lastBanner = `
          <div class="card league-result-banner" id="leagueLastBanner">
            <div class="row between nowrap" style="align-items:flex-start;gap:.75rem">
              <div>
                <div style="font-size:1.05rem;font-weight:700">✓ ${t('Giữ vững thứ hạng!')}</div>
                <div class="small" style="margin-top:.2rem">
                  ${t('Tuần trước bạn đứng hạng #{rank}/{of} với {xp} XP và tiếp tục giữ vững {tier}.', { rank: last.rank, of: last.of, xp: (last.xp || 0).toLocaleString(), tier: lastTierObj.name() })}
                </div>
              </div>
              <button type="button" class="btn sm" id="btnDismissLast" style="flex:none">${t('Đã hiểu')}</button>
            </div>
          </div>`;
      }
    }

    // Hero tổng quan vị trí cá nhân
    const meZoneText = me.zone === 'up'
      ? `<span style="color:var(--good-text);font-weight:700">▲ ${t('Đang trong vùng thăng hạng')} (${t('Top 7')})</span>`
      : me.zone === 'down'
        ? `<span style="color:var(--again-text);font-weight:700">▼ ${t('Cần thêm XP để tránh xuống hạng')}</span>`
        : `<span style="color:var(--muted);font-weight:600">● ${t('Vị trí an toàn')}</span>`;

    const heroCard = `
      <div class="card league-hero-card">
        <div class="row between wrap" style="gap:1rem;align-items:center">
          <div class="row nowrap" style="gap:1rem;align-items:center">
            <div class="league-tier-ic lg" style="background:${curTier.bg};color:${curTier.color}">${curTier.ic}</div>
            <div>
              <div class="small muted" style="font-weight:600;text-transform:uppercase;letter-spacing:.05em">${curTier.name()} · ${t('Nhóm 30 người')}</div>
              <div style="font-size:1.55rem;font-weight:800;line-height:1.2;margin:.2rem 0">
                ${t('Hạng #{rank}', { rank: me.rank })} <small class="muted" style="font-size:1rem;font-weight:500">/ ${board.length}</small>
              </div>
              <div class="small">${meZoneText}</div>
            </div>
          </div>
          <div class="row wrap" style="gap:.6rem;align-items:center">
            <div class="league-stat-chip">
              <span class="muted small">${t('XP tuần')}</span>
              <b>${(data.member.xp || 0).toLocaleString()}</b>
            </div>
            <a class="btn primary" href="#/review">⚡ ${t('Học ngay')}</a>
          </div>
        </div>
      </div>`;

    // Render Bảng xếp hạng 30 người
    const upCut = (data.rules && data.rules.up) || 7;
    const downCut = (data.rules && data.rules.down) || 5;
    const canDown = data.member.tier > 0 && board.length > upCut + downCut;

    let boardHtml = '<div class="league-board card">';
    board.forEach((r, idx) => {
      // Dải phân cách thăng hạng (giữa hạng 7 và 8)
      if (idx === upCut && data.member.tier < ((data.rules && data.rules.maxTier) || 5)) {
        boardHtml += `
          <div class="league-zone-divider divider-up">
            <span class="lzd-ic">▲</span>
            <span>${t('Vùng thăng hạng lên {tier}', { tier: nextTier.name() })}</span>
          </div>`;
      }
      // Dải phân cách xuống hạng
      if (canDown && idx === board.length - downCut) {
        boardHtml += `
          <div class="league-zone-divider divider-down">
            <span class="lzd-ic">▼</span>
            <span>${t('Vùng xuống hạng')}</span>
          </div>`;
      }

      const rankBadge = r.rank === 1
        ? `<span class="league-rank-num r1" aria-label="${t('Hạng 1')}">🥇 1</span>`
        : r.rank === 2
          ? `<span class="league-rank-num r2" aria-label="${t('Hạng 2')}">🥈 2</span>`
          : r.rank === 3
            ? `<span class="league-rank-num r3" aria-label="${t('Hạng 3')}">🥉 3</span>`
            : `<span class="league-rank-num">${r.rank}</span>`;

      const isMe = r.me;
      const zoneSign = r.zone === 'up'
        ? `<span class="league-zone-arrow up" title="${t('Vùng thăng hạng')}">▲</span>`
        : r.zone === 'down'
          ? `<span class="league-zone-arrow down" title="${t('Vùng xuống hạng')}">▼</span>`
          : `<span class="league-zone-arrow safe" aria-hidden="true">•</span>`;

      boardHtml += `
        <div class="league-row ${isMe ? 'is-me' : ''} ${r.zone ? 'zone-' + r.zone : ''}">
          <div class="league-rank-col">${rankBadge}</div>
          <div class="league-nick-col">
            <span class="league-nick">${esc(r.nick)}</span>
            ${isMe ? `<span class="chip ok small" style="margin-left:.4rem">${t('Bạn')}</span>` : ''}
          </div>
          <div class="league-xp-col">
            <b>${r.xp.toLocaleString()}</b> <small class="muted">XP</small>
          </div>
          <div class="league-zone-col">${zoneSign}</div>
        </div>`;
    });
    boardHtml += '</div>';

    // Thẻ luật giải đấu (collapsible)
    const rulesBox = `
      <details class="card league-rules-box" style="margin-top:1.2rem">
        <summary style="cursor:pointer;font-weight:700;padding:.3rem 0">
          ℹ️ ${t('Quy tắc giải đấu tuần')}
        </summary>
        <div class="muted small" style="margin-top:.7rem;line-height:1.6">
          <ul style="padding-left:1.2rem;margin:0">
            <li><b>${t('Nhóm thi đấu:')}</b> ${t('Mỗi nhóm tối đa 30 người học có cùng bậc xếp hạng.')}</li>
            <li><b>${t('Chu kỳ tuần:')}</b> ${t('Bắt đầu lúc 00:00 UTC thứ Hai và chốt kết quả lúc 23:59 UTC Chủ nhật (giờ quốc tế công bằng cho mọi múi giờ).')}</li>
            <li><b>${t('Thăng hạng:')}</b> ${t('Top 7 người có XP cao nhất tuần sẽ được thăng lên bậc kế tiếp (tối đa Hạng Kim Cương).')}</li>
            <li><b>${t('Xuống hạng:')}</b> ${t('5 người cuối bảng sẽ xuống bậc trước (áp dụng từ Hạng Bạc trở lên khi nhóm đủ người).')}</li>
            <li><b>${t('Cách kiếm XP:')}</b> ${t('Tích lũy XP qua mọi hoạt động: ôn thẻ từ vựng FSRS (+10–15 XP), đọc bài (+10–20 XP), làm trắc nghiệm, luyện thi.')}</li>
            <li><b>${t('Quyền riêng tư:')}</b> ${t('Chỉ hiển thị biệt danh và XP tuần. Bạn có thể đổi biệt danh bất kỳ lúc nào hoặc rời giải đấu trong mục Cài đặt.')}</li>
          </ul>
        </div>
      </details>`;

    body.innerHTML = lastBanner + heroCard + boardHtml + rulesBox;

    // Gắn sự kiện nút bỏ thông báo tuần trước
    const dismissBtn = $('#btnDismissLast');
    if (dismissBtn && lastKey) {
      dismissBtn.onclick = () => {
        try { localStorage.setItem('lk.leagueLastSeen', lastKey); } catch (e) { /* bỏ qua */ }
        const banner = $('#leagueLastBanner');
        if (banner) banner.remove();
      };
    }
  };
})();
