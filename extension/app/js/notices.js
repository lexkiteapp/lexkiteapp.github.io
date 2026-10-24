/* Giao diện Thông báo người học (web/js/notices.js – tải lười qua bundle 'notices')
 * Ngăn thông báo chuông 🔔, badge số chưa đọc, đánh dấu đã đọc/bấm CTA, popup nổi cho tin ⚠️ Quan trọng.
 */
(() => {
  'use strict';

  let initialized = false, loaded = false;
  let notices = [];
  let appState = null;

  const CSS = `
.notif-panel {
  position: fixed; top: 62px; right: 16px; z-index: 100;
  width: min(390px, calc(100vw - 32px)); max-height: min(520px, calc(100vh - 84px));
  background: var(--surface); border: 1px solid var(--line); border-radius: 16px;
  box-shadow: 0 16px 36px rgba(15, 61, 62, .18), 0 4px 14px rgba(0,0,0,.08);
  display: flex; flex-direction: column; overflow: hidden;
  animation: notifIn .18s cubic-bezier(0.16, 1, 0.3, 1);
}
@keyframes notifIn { from { opacity: 0; transform: translateY(-8px) scale(.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
.notif-head {
  padding: .75rem 1rem; border-bottom: 1px solid var(--line);
  display: flex; justify-content: space-between; align-items: center;
  background: color-mix(in srgb, var(--surface) 94%, var(--primary) 6%);
}
.notif-body {
  padding: .6rem; overflow-y: auto; flex: 1; display: flex; flex-direction: column; gap: .6rem;
}
.notif-item {
  border: 1px solid var(--line); border-radius: 12px; padding: .75rem .9rem;
  background: var(--surface); transition: all .15s ease; cursor: pointer; text-decoration: none; color: inherit; display: block;
}
.notif-item:hover { border-color: var(--primary); background: var(--surface-2, rgba(0,0,0,.02)); }
.notif-item.unread { border-left: 4px solid var(--primary); background: color-mix(in srgb, var(--surface) 95%, var(--primary) 5%); }
.notif-item-img {
  width: 100%; max-height: 120px; object-fit: cover; border-radius: 8px; margin-bottom: .5rem;
}
.notif-item-title { font-size: .92rem; font-weight: 700; margin: 0 0 .25rem; color: var(--text); }
.notif-item-body { font-size: .84rem; line-height: 1.5; color: var(--muted); margin: 0 0 .5rem; }
.notif-item-body p { margin: 0 0 .25rem; }
.notif-item-body p:last-child { margin-bottom: 0; }
.notif-item-meta { display: flex; justify-content: space-between; align-items: center; font-size: .76rem; color: var(--muted); }
.notif-empty { padding: 2rem 1rem; text-align: center; color: var(--muted); font-size: .9rem; }
`;

  function injectStyle() {
    if (document.getElementById('notifStyle')) return;
    const style = document.createElement('style');
    style.id = 'notifStyle';
    style.textContent = CSS;
    document.head.appendChild(style);
  }

  // Chữ do quản trị soạn: LUÔN thoát HTML; link chỉ cho #/… (trong app) hoặc https://
  const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const safeUrl = u => { u = String(u || '').trim(); if (/^\/#\//.test(u)) u = u.slice(1); return /^(#\/|https:\/\/)[^\s"'<>]*$/i.test(u) ? u : ''; };
  const ext = u => /^https:/i.test(u) ? ' target="_blank" rel="noopener noreferrer"' : '';
  const API = /(^|\.)lexkite\.(com|pages\.dev)$/.test(location.hostname) ? '/api/notices' : 'https://lexkite.com/api/notices';
  async function authHeader() { // người đã đăng nhập (Sync.user – Firebase) → gửi ID token để nhận tin theo đối tượng
    try { const u = window.Sync && Sync.user; return u && u.getIdToken ? { Authorization: 'Bearer ' + await u.getIdToken() } : {}; } catch (e) { return {}; }
  }

  function getLocalReads() {
    try { return new Set(JSON.parse(localStorage.getItem('lk.nreads') || '[]')); } catch (e) { return new Set(); }
  }

  function saveLocalRead(id) {
    try {
      const s = getLocalReads(); s.add(id);
      localStorage.setItem('lk.nreads', JSON.stringify([...s].slice(-300)));
    } catch (e) {}
  }

  function renderMarkdown(md) {
    if (!md) return '';
    let s = String(md).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    s = s.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/\*(.*?)\*/g, '<em>$1</em>');
    s = s.replace(/\[([^\]]+)\]\((#\/[^)\s]+|\/#\/[^)\s]+|https:\/\/[^)\s]+)\)/g, (m, txt, url) => { const u = safeUrl(url.replace(/&amp;/g, '&')); return u ? `<a href="${esc(u)}"${ext(u)}>${txt}</a>` : txt; });
    s = s.replace(/\n\n+/g, '</p><p>').replace(/\n/g, '<br>');
    return `<p>${s}</p>`;
  }

  function timeAgo(ts) {
    const d = Math.max(0, Math.floor((Date.now() - ts) / 1000));
    if (d < 60) return window.t ? t('Vừa xong') : 'Vừa xong';
    if (d < 3600) return window.t ? t('{n} phút trước', { n: Math.floor(d / 60) }) : `${Math.floor(d / 60)}m`;
    if (d < 86400) return window.t ? t('{n} giờ trước', { n: Math.floor(d / 3600) }) : `${Math.floor(d / 3600)}h`;
    return window.t ? t('{n} ngày trước', { n: Math.floor(d / 86400) }) : `${Math.floor(d / 86400)}d`;
  }

  function updateBadge() {
    const badge = document.getElementById('notifBadge');
    if (!badge) return;
    const lr = getLocalReads();
    const unread = notices.filter(n => !n.read && !lr.has(n.id)).length;
    const btn = document.getElementById('notifBtn'), lbl = window.t ? t('Thông báo') : 'Thông báo';
    if (btn) btn.setAttribute('aria-label', unread ? `${lbl} (${window.t ? t('{n} chưa đọc', { n: unread }) : unread})` : lbl);
    if (unread > 0) {
      badge.textContent = unread > 99 ? '99+' : String(unread);
      badge.hidden = false;
    } else {
      badge.hidden = true;
    }
  }

  function ensurePanel() {
    let panel = document.getElementById('notifPanel');
    if (panel) return panel;
    panel = document.createElement('div');
    panel.className = 'notif-panel';
    panel.id = 'notifPanel';
    panel.hidden = true;
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', window.t ? t('Thông báo') : 'Thông báo');
    panel.tabIndex = -1;
    panel.innerHTML = `
      <div class="notif-head">
        <div class="row" style="gap:.5rem;align-items:center">
          <span>🔔</span>
          <b>${window.t ? t('Thông báo') : 'Thông báo'}</b>
        </div>
        <div class="row" style="gap:.4rem">
          <button type="button" class="btn ghost sm" id="notifMarkAll">${window.t ? t('Đã đọc tất cả') : 'Đã đọc tất cả'}</button>
          <button type="button" class="icon-btn sm" id="notifClose" aria-label="${window.t ? t('Đóng') : 'Đóng'}" title="${window.t ? t('Đóng') : 'Đóng'}">✕</button>
        </div>
      </div>
      <div class="notif-body" id="notifList"></div>
    `;
    document.body.appendChild(panel);

    panel.querySelector('#notifClose').onclick = () => setOpen(false, true);
    panel.querySelector('#notifMarkAll').onclick = () => {
      const lr = getLocalReads();
      notices.filter(n => !n.read && !lr.has(n.id)).forEach(n => markNotice(n, 'read'));
    };
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && !panel.hidden) setOpen(false, true); });

    document.addEventListener('click', e => {
      const btn = document.getElementById('notifBtn');
      if (!panel.hidden && !panel.contains(e.target) && btn && !btn.contains(e.target)) {
        setOpen(false);
      }
    });

    return panel;
  }

  function setOpen(open, refocus) {
    const panel = ensurePanel(), btn = document.getElementById('notifBtn');
    panel.hidden = !open;
    if (btn) btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (open) { drawList(); panel.focus({ preventScroll: true }); } else if (refocus && btn) btn.focus();
  }

  async function markNotice(n, act = 'read') {
    saveLocalRead(n.id);
    n.read = true;
    if (act === 'click') n.clicked = true;
    updateBadge();
    drawList();

    try {
      const h = await authHeader();
      if (!h.Authorization) return; // khách: chỉ nhớ trên máy (localStorage)
      fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...h },
        body: JSON.stringify({ id: n.id, act })
      }).catch(() => {});
    } catch (e) {}
  }

  function drawList() {
    const list = document.getElementById('notifList');
    if (!list) return;
    const lr = getLocalReads();
    if (!notices.length) {
      list.innerHTML = `<div class="notif-empty"><div style="font-size:1.8rem;margin-bottom:.4rem">🎉</div><div>${window.t ? t('Chưa có thông báo mới') : 'Chưa có thông báo mới'}</div></div>`;
      return;
    }

    list.innerHTML = notices.map(n => {
      const isUnread = !n.read && !lr.has(n.id);
      const kIcon = n.kind === 'important' ? '⚠️' : n.kind === 'event' ? '🎉' : 'ℹ️';
      const img = safeUrl(n.img), cta = safeUrl(n.cta_url);
      return `<div class="notif-item ${isUnread ? 'unread' : ''}" data-nid="${esc(n.id)}" role="button" tabindex="0" aria-label="${esc(n.title)}">
        ${img && /^https:/.test(img) ? `<img class="notif-item-img" src="${esc(img)}" alt="" loading="lazy">` : ''}
        <div class="row between" style="gap:.4rem;margin-bottom:.2rem">
          <span class="small font-mono" aria-hidden="true">${kIcon}</span>
          <span class="small muted">${timeAgo(n.at)}</span>
        </div>
        <div class="notif-item-title">${isUnread ? `<span class="sr-only">${window.t ? t('Chưa đọc') : 'Chưa đọc'}: </span>` : ''}${esc(n.title)}</div>
        <div class="notif-item-body">${renderMarkdown(n.body)}</div>
        ${n.cta_label && cta ? `<div><a href="${esc(cta)}"${ext(cta)} class="btn primary sm" data-ncta="${esc(n.id)}" style="display:inline-block;padding:.35rem .75rem;font-size:.82rem">${esc(n.cta_label)}</a></div>` : ''}
      </div>`;
    }).join('');

    list.querySelectorAll('.notif-item').forEach(el => {
      el.onkeydown = e => { if ((e.key === 'Enter' || e.key === ' ') && e.target === el) { e.preventDefault(); el.click(); } };
      el.onclick = e => {
        if (e.target.closest('[data-ncta], a')) return;
        const nid = el.dataset.nid;
        const n = notices.find(x => x.id === nid);
        if (n) markNotice(n, 'read');
      };
    });

    list.querySelectorAll('[data-ncta]').forEach(a => {
      a.onclick = e => {
        const nid = a.dataset.ncta;
        const n = notices.find(x => x.id === nid);
        if (n) markNotice(n, 'click');
        setOpen(false);
      };
    });
  }

  function checkImportantPopup() {
    const lr = getLocalReads();
    const imp = notices.find(n => n.kind === 'important' && !n.read && !lr.has(n.id));
    if (!imp) return;
    const popKey = 'lk_pop_' + imp.id;
    try { if (localStorage.getItem(popKey)) return; localStorage.setItem(popKey, '1'); } catch (e) { return; }
    const img = safeUrl(imp.img), cta = safeUrl(imp.cta_url);

    if (window.modal) {
      modal(`<div class="center" style="padding:.5rem 0">
        <div style="font-size:2.4rem;margin-bottom:.5rem">⚠️</div>
        <span class="chip" style="background:#fee2e2;color:#991b1b;font-weight:700;margin-bottom:.6rem">${window.t ? t('Thông báo quan trọng') : 'Thông báo quan trọng'}</span>
        <h3 style="margin:.4rem 0 .8rem;font-size:1.25rem">${esc(imp.title)}</h3>
        ${img && /^https:/.test(img) ? `<img src="${esc(img)}" style="width:100%;max-height:180px;object-fit:cover;border-radius:12px;margin-bottom:.8rem" alt="">` : ''}
        <div style="text-align:left;line-height:1.6;font-size:.95rem;margin-bottom:1.4rem">${renderMarkdown(imp.body)}</div>
        <div class="row center" style="gap:.8rem">
          ${imp.cta_label && cta ? `<a href="${esc(cta)}"${ext(cta)} class="btn primary lg" data-close id="impCta">${esc(imp.cta_label)}</a>` : ''}
          <button type="button" class="btn lg" data-close>${window.t ? t('Đã hiểu') : 'Đã hiểu'}</button>
        </div>
      </div>`);

      markNotice(imp, 'read');
      const impCta = document.getElementById('impCta');
      if (impCta) impCta.onclick = () => markNotice(imp, 'click');
    }
  }

  async function fetchNotices() {
    try {
      const lang = window.I18N && I18N.lang ? I18N.lang() : 'vi';
      const res = await fetch(`${API}?lang=${encodeURIComponent(lang)}`, { headers: await authHeader() });
      if (!res.ok) return;
      const data = await res.json();
      if (data && data.ok && Array.isArray(data.notices)) {
        notices = data.notices; loaded = true;
        updateBadge();
        drawList();
        checkImportantPopup();
      }
    } catch (e) {}
  }

  window.NoticesUI = {
    async init(state) {
      injectStyle();
      appState = state;
      ensurePanel();

      const btn = document.getElementById('notifBtn');
      if (btn && !initialized) {
        btn.onclick = e => { e.stopPropagation(); setOpen(ensurePanel().hidden); };
        initialized = true;
      }

      await fetchNotices();
    },

    toggle() {
      injectStyle();
      if (!loaded) fetchNotices();
      setOpen(ensurePanel().hidden);
    },

    refresh() {
      return fetchNotices();
    }
  };
})();
// Trang tĩnh song sinh của route (web/js/seo-twin.js, docs/SEO-ARCH.md §2b): nạp lười tại đây để khung app +0 byte; chỉ web lexkite.com
(function () { if (window.__lkTwin || !/^https?:$/.test(location.protocol) || !/(^|\.)lexkite\.(com|pages\.dev)$/.test(location.hostname)) return; var s = document.createElement('script'); s.src = 'js/seo-twin.js'; s.async = true; document.head.appendChild(s); })();
