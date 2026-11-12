/* Quản trị → đồng bộ giữa các admin (functions/api/admin-shared.js). Tải lười bởi admin-keys.js / admin-drive.js / admin-clips.js / admin-video.js / admin-social.js.
 *   AdminSync.watch(areas, onChange, { box, S }) → dừng()   hỏi dấu thay đổi mỗi 45 s KHI TAB ĐANG HIỆN (+ ngay khi tab hiện lại); khu vực nào đổi bởi admin
 *      KHÁC (email đã che ≠ của mình) → onChange(area, {by, at}) + thẻ "Vừa cập nhật bởi a***@…". Không tải lại khi đang gõ trong ô nhập của box (đợi lượt sau).
 *   AdminSync.store(ns) → { get(), set(v), patch(k, v) }     trạng thái dùng chung (thay localStorage theo trình duyệt)
 * Không giữ bí mật nào; mọi lệnh qua Firebase ID token + adminGate. Thất bại mạng → im lặng, thử lại lượt sau. */
(function () {
  const POLL = 45000;
  async function call(op, body) {
    const u = window.firebase && firebase.auth().currentUser; if (!u) throw new Error('auth');
    const r = await fetch('/api/admin-shared', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + await u.getIdToken() }, body: JSON.stringify({ op, ...body }) });
    const j = await r.json().catch(() => ({})); if (!r.ok) { const e = new Error(j.error || 'HTTP ' + r.status); e.code = j.error; throw e; } return j;
  }
  const store = ns => ({ get: () => call('get', { ns }), set: v => call('set', { ns, v }), patch: (k, v) => call('patch', { ns, k, v }) });

  let pill = null, pillT = 0;
  function badge(text) {
    if (!document.body) return;
    if (!pill) { pill = document.createElement('div'); pill.setAttribute('role', 'status'); pill.setAttribute('aria-live', 'polite'); pill.className = 'adm-sync-pill';
      pill.style.cssText = 'position:fixed;left:16px;bottom:16px;z-index:9999;max-width:calc(100vw - 32px);padding:.5rem .8rem;border-radius:999px;font:500 .82rem/1.3 system-ui,sans-serif;background:var(--card,#fff);color:var(--ink,#1c1b1f);border:1px solid var(--line,#d0d4dc);box-shadow:0 4px 14px rgba(0,0,0,.18);transition:opacity .3s;pointer-events:none';
      document.body.appendChild(pill); }
    pill.textContent = '🔄 ' + text; pill.style.opacity = '1'; clearTimeout(pillT); pillT = setTimeout(() => { if (pill) pill.style.opacity = '0'; }, 12000);
  }
  const typing = box => { const a = document.activeElement; return !!(box && a && box.contains(a) && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)); };

  function watch(areas, onChange, o = {}) {
    const S = o.S || (s => s), seen = {}; let stopped = false, timer = 0, pend = {}, busy = false;
    async function tick() {
      if (stopped || busy || document.hidden || (o.box && !o.box.isConnected)) { if (o.box && !o.box.isConnected) stop(); return; }
      busy = true;
      try {
        const r = await call('stamp', {}), me = r.me;
        for (const a of areas) {
          const s = (r.areas || {})[a]; if (!s) continue;
          if (seen[a] == null) { seen[a] = s.at; continue; }            // lần đầu: chỉ ghi mốc
          if (s.at > seen[a] || pend[a]) {
            if (s.by && s.by !== me && !pend[a]) pend[a] = s;
            else if (!pend[a]) { seen[a] = s.at; continue; }            // chính mình vừa sửa → không báo
            if (typing(o.box)) continue;                                // đang gõ → đợi lượt sau
            const p = pend[a]; delete pend[a]; seen[a] = Math.max(seen[a], p.at, s.at);
            try { await onChange(a, p); } catch (e) { /* tải lại lỗi → lượt sau */ }
            badge(S('Vừa cập nhật bởi {who}', { who: p.by || '?' }));
          }
        }
      } catch (e) { /* mạng/đăng nhập tạm lỗi */ } finally { busy = false; }
    }
    const vis = () => { if (!document.hidden) tick(); };
    function stop() { stopped = true; clearInterval(timer); document.removeEventListener('visibilitychange', vis); }
    timer = setInterval(tick, POLL); document.addEventListener('visibilitychange', vis); tick();
    return stop;
  }
  window.AdminSync = { watch, store, call, badge, POLL };
})();
