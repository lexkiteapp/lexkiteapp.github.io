/* 📲 Chuyển dữ liệu sang thiết bị khác bằng mã QR – không cần đăng nhập (functions/api/handoff.js).
 * Gửi: nén (gzip) + mã hóa AES-GCM 256 ngay trên máy → máy chủ giữ bản mã hóa ≤ 10 phút, dùng 1 lần.
 * Khóa nằm sau dấu # trong link QR (#/handoff/MÃ.KHÓA) – trình duyệt không bao giờ gửi phần # lên máy chủ.
 * Nhận: mở link (quét QR hoặc gõ mã) → giải mã → GỘP vào thẻ hiện có (giữ bản học gần nhất), không ghi đè. */
(function () {
  const { $, esc, toast } = UI;
  const { state, routes } = App;
  const view = document.getElementById('view');
  const API = /(^|\.)lexkite\.(com|pages\.dev)$/.test(location.hostname) ? '/api/handoff' : 'https://lexkite.com/api/handoff';
  const b64 = u8 => { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode(...u8.subarray(i, i + 0x8000)); return btoa(s); };
  const unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
  const b64url = u8 => b64(u8).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const unb64url = s => unb64(s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - s.length % 4) % 4));
  const pipe = async (u8, T) => new Uint8Array(await new Response(new Blob([u8]).stream().pipeThrough(new T('gzip'))).arrayBuffer());
  const post = body => fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Lexkite-Device': UI.dev() }, body: JSON.stringify(body) }).then(async r => { const j = await r.json().catch(() => ({})); if (r.status === 429 && j.error === 'quota') UI.quota(j); return { ok: r.ok, status: r.status, j }; }); // hạn mức: toast giờ mở lại
  const activity = c => Math.max((c.srs && c.srs.last) || 0, c.added || 0, c.mod || 0);
  let timer = 0;

  async function send() {
    const cards = await Core.Cards.all(), n = Object.keys(cards).length;
    if (!n) { view.innerHTML = `<div class="card center"><h1>📲 ${t('Chuyển sang thiết bị khác')}</h1><p class="muted">${t('Chưa có thẻ nào để chuyển – hãy lưu vài từ trước nhé.')}</p></div>`; return; }
    view.innerHTML = `<div class="card center"><h1>📲 ${t('Chuyển sang thiết bị khác')}</h1><p class="muted">⏳ ${t('Đang mã hóa dữ liệu trên máy của bạn…')}</p></div>`;
    try {
      const raw = new TextEncoder().encode(JSON.stringify({ v: 1, cards })), packed = await pipe(raw, CompressionStream);
      const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt']), iv = crypto.getRandomValues(new Uint8Array(12));
      const enc = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, packed));
      const blob = new Uint8Array(12 + enc.length); blob.set(iv); blob.set(enc, 12);
      const r = await post({ op: 'put', blob: b64(blob) });
      if (!r.ok) throw new Error(r.j.error || r.status);
      const k = b64url(new Uint8Array(await crypto.subtle.exportKey('raw', key))), link = `https://lexkite.com/app/#/handoff/${r.j.code}.${k}`;
      view.innerHTML = `<div class="card center ho-card">
        <h1>📲 ${t('Chuyển sang thiết bị khác')}</h1>
        <p>${t('Quét mã bằng camera điện thoại (hoặc mở link trên máy kia) để nạp {n} thẻ – không cần đăng nhập.', { n })}</p>
        <div class="ho-qr" aria-label="QR">${window.LKQR ? LKQR.svg(link) : ''}</div>
        <p class="small muted">${t('Mã dùng 1 lần, hết hạn sau')} <b id="hoLeft">10:00</b> · ${t('dữ liệu được mã hóa – máy chủ không đọc được.')}</p>
        <div class="row center" style="gap:.5rem"><button class="btn" id="hoCopy">🔗 ${t('Sao chép link')}</button><a class="btn ghost" href="#/settings">${t('Xong')}</a></div></div>`;
      $('#hoCopy').onclick = () => navigator.clipboard.writeText(link).then(() => toast(t('Đã sao chép link'))).catch(() => prompt('', link));
      clearInterval(timer); timer = setInterval(() => { const s = Math.max(0, Math.round((r.j.exp - Date.now()) / 1000)), el = $('#hoLeft'); if (!el) return clearInterval(timer); el.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; if (!s) { clearInterval(timer); el.textContent = t('đã hết hạn'); } }, 1000);
    } catch (e) {
      view.innerHTML = `<div class="card center"><h1>📲 ${t('Chuyển sang thiết bị khác')}</h1><p>⚠️ ${t('Chưa tạo được mã – kiểm tra kết nối mạng rồi thử lại.')}</p><button class="btn primary" id="hoRetry">${t('Thử lại')}</button></div>`;
      $('#hoRetry').onclick = send;
    }
  }

  async function receive(arg) {
    const [code, k] = String(arg).split('.');
    view.innerHTML = `<div class="card center"><h1>📥 ${t('Nhận dữ liệu')}</h1><p class="muted">⏳ ${t('Đang tải và giải mã…')}</p></div>`;
    try {
      const r = await post({ op: 'get', code });
      if (!r.ok) throw new Error(r.status === 404 ? 'expired' : 'net');
      const blob = unb64(r.j.blob), key = await crypto.subtle.importKey('raw', unb64url(k || ''), 'AES-GCM', false, ['decrypt']);
      const packed = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: blob.subarray(0, 12) }, key, blob.subarray(12)));
      const data = JSON.parse(new TextDecoder().decode(await pipe(packed, DecompressionStream)));
      const mine = await Core.Cards.all(); let added = 0, updated = 0;
      for (const [w, c] of Object.entries(data.cards || {})) { if (!mine[w]) { mine[w] = c; added++; } else if (activity(c) > activity(mine[w])) { mine[w] = c; updated++; } }
      await Core.Cards.save(mine); state.cards = await Core.Cards.all(); if (window.Sync && Sync.schedule) Sync.schedule();
      history.replaceState(null, '', location.pathname + location.search + '#/handoff/done'); // xóa khóa khỏi thanh địa chỉ
      view.innerHTML = `<div class="card center"><div style="font-size:2.4rem">✅</div><h1>${t('Đã nhận dữ liệu')}</h1><p>${t('{a} thẻ mới · {u} thẻ cập nhật tiến độ.', { a: added, u: updated })}</p><a class="btn primary" href="#/review">${t('Ôn ngay')} →</a></div>`;
    } catch (e) {
      view.innerHTML = `<div class="card center"><h1>📥 ${t('Nhận dữ liệu')}</h1><p>⚠️ ${e.message === 'expired' ? t('Mã đã hết hạn hoặc đã được dùng – tạo mã mới trên máy gửi.') : t('Không giải mã được – kiểm tra lại link/mã hoặc kết nối mạng.')}</p><a class="btn" href="#/handoff">${t('Tạo mã gửi từ máy này')}</a></div>`;
    }
  }

  routes.handoff = arg => { clearInterval(timer); App.cleanup = () => clearInterval(timer); return arg && arg !== 'done' ? receive(arg) : send(); };
})();
