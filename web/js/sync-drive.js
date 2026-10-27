/* Đồng bộ local-first qua Google Drive appDataFolder của CHÍNH người học (docs/SYNC-DRIVE.md) – tải lười từ sync.js.
 * IndexedDB là nguồn thật. Drive giữ đúng 1 tệp ảnh chụp gzip (NAME) = nhật ký đã nén sẵn: mỗi lượt đọc phiên bản (5 đơn vị),
 * chỉ tải về khi máy khác đã ghi (200), gộp xác định (Sync._m – giao hoán, lũy đẳng, dấu xóa), rồi ghi lại nếu khác (50).
 * 0 USD: Drive API miễn phí dưới 400 triệu đơn vị/ngày/dự án; dung lượng nằm trong Drive của người học (15–100 KB).
 * Ngân sách mỗi máy/ngày (cfg.cap) + lùi theo cấp số nhân khi lỗi/429 → không bao giờ dội API; hết ngân sách = dữ liệu chờ trên máy.
 * Token: lấy ở popup đăng nhập Google (Firebase, scope drive.appdata – hỏi 1 lần). Hết hạn (1 giờ) → chỉ gia hạn trong 1 cú chạm
 * của người dùng khi thật sự cần đồng bộ (popup tự đóng, prompt=none), tối đa 1 lần/45 phút, 3 lần/ngày; không bao giờ hiện hộp hỏi khi đang học. */
(function (w) {
  const DRIVE = 'https://www.googleapis.com/drive/v3/files', UP = 'https://www.googleapis.com/upload/drive/v3/files';
  const SCOPE = 'https://www.googleapis.com/auth/drive.appdata', NAME = 'lexkite-sync.v2.json.gz';
  const COST = { list: 100, get: 5, download: 200, create: 50, update: 50, delete: 50 }; // developers.google.com/workspace/drive/api/guides/limits
  const cfg = () => Object.assign({ every: 600e3, cap: 1200, renewGap: 45 * 60e3, renewMax: 3, stale: 12 * 3600e3, bridgeDays: 30 }, w.LK_SYNC || {});
  const now = () => Date.now(), today = () => new Date().toISOString().slice(0, 10);

  // ---------- Token (chỉ scope drive.appdata – chỉ chạm được tệp riêng của ứng dụng) ----------
  const TK = 'lk.dt';
  const tok = {
    get(uid) { try { const x = JSON.parse(localStorage.getItem(TK) || 'null'); return x && x.uid === uid && x.exp > now() + 60e3 ? x.t : ''; } catch (e) { return ''; } },
    set(uid, t, sec) { if (!t) return; try { localStorage.setItem(TK, JSON.stringify({ uid, t, exp: now() + (Math.max(300, +sec || 3600) - 120) * 1000 })); } catch (e) { /* bỏ qua */ } },
    clear() { try { localStorage.removeItem(TK); } catch (e) { /* bỏ qua */ } },
  };

  // ---------- Trạng thái theo tài khoản (IndexedDB qua Core.Store) ----------
  const ST = 'driveSync';
  const load = async uid => ({ fileId: '', ver: '', hash: '', day: '', units: 0, fail: 0, nextAt: 0, on: 0, ...((await Core.Store.get(ST, {}))[uid] || {}) });
  const save = async (uid, st) => { const all = await Core.Store.get(ST, {}); all[uid] = st; await Core.Store.set(ST, all); };
  const spend = (st, op) => {
    if (st.day !== today()) { st.day = today(); st.units = 0; st.renews = 0; }
    if (st.units + COST[op] > cfg().cap) throw Object.assign(new Error('budget'), { code: 'budget' });
    st.units += COST[op];
  };
  // 30 s, 1 phút, 2 phút … tối đa 6 giờ, ±25 % ngẫu nhiên (nhiều máy cùng lỗi không dội lại cùng lúc)
  const backoff = n => Math.min(6 * 3600e3, 30e3 * 2 ** Math.max(0, n - 1)) * (0.75 + Math.random() * 0.5);

  // ---------- HTTP ----------
  async function call(url, init, token) {
    const r = await fetch(url, { ...init, headers: { ...(init.headers || {}), Authorization: 'Bearer ' + token } });
    if (r.ok) return r;
    let reason = ''; try { const j = await r.json(); reason = (j.error && ((j.error.errors && j.error.errors[0] && j.error.errors[0].reason) || j.error.status)) || ''; } catch (e) { /* thân không phải JSON */ }
    throw Object.assign(new Error('drive ' + r.status + ' ' + reason), { status: r.status, reason });
  }
  const gz = typeof CompressionStream !== 'undefined';
  async function encode(obj) {
    const txt = JSON.stringify(obj);
    if (!gz) return new TextEncoder().encode(txt);
    return new Uint8Array(await new Response(new Blob([txt]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer());
  }
  async function decode(u8) {
    const txt = u8[0] === 0x1f && u8[1] === 0x8b ? await new Response(new Blob([u8]).stream().pipeThrough(new DecompressionStream('gzip'))).text() : new TextDecoder().decode(u8);
    return JSON.parse(txt || 'null');
  }

  // ---------- Một lượt đồng bộ ----------
  // ctx (từ sync.js): { uid, email, build(): ảnh chụp cục bộ, apply(remote): gộp vào máy, hash(snap), due(): có gì cần gửi/kéo, gesture: bool }
  let running = null, again = false;
  function cycle(ctx, why) {
    if (running) { again = true; return running; }
    running = (async () => { let r; try { do { again = false; r = await once(ctx, why); } while (again); } finally { running = null; } return r; })();
    return running;
  }
  async function once(ctx, why) {
    const st = await load(ctx.uid);
    if (st.nextAt > now() && why !== 'manual') return 'wait';
    const token = tok.get(ctx.uid);
    if (!token) { arm(ctx, st); return 'no-token'; }
    const hide = why === 'hide';
    try {
      if (!st.fileId) {
        spend(st, 'list');
        const q = encodeURIComponent(`name='${NAME}' and trashed=false`);
        const j = await (await call(`${DRIVE}?spaces=appDataFolder&q=${q}&fields=files(id,version)&pageSize=10`, {}, token)).json();
        const f = (j.files || []).sort((a, b) => +b.version - +a.version)[0];
        if (f) { st.fileId = f.id; st.ver = ''; } // '' → buộc tải bản trên Drive về gộp
      }
      let remoteVer = '', remoteHash = '';
      if (st.fileId) {
        spend(st, 'get');
        try { remoteVer = String((await (await call(`${DRIVE}/${st.fileId}?fields=version`, {}, token)).json()).version); }
        catch (e) { if (e.status !== 404) throw e; st.fileId = ''; st.ver = ''; } // tệp bị xóa (Drive › Quản lý ứng dụng) → tạo lại từ máy
      }
      if (st.fileId && remoteVer !== st.ver) {
        spend(st, 'download');
        const remote = await decode(new Uint8Array(await (await call(`${DRIVE}/${st.fileId}?alt=media`, {}, token)).arrayBuffer()));
        if (remote && remote.v === 2) { await ctx.apply(remote); remoteHash = ctx.hash(remote); }
        st.ver = remoteVer;
      }
      const snap = await ctx.build(), h = ctx.hash(snap);
      if (h === remoteHash) st.hash = h; // máy đã y hệt bản trên Drive → không ghi lại
      if (!st.fileId || h !== st.hash) {
        const body = await encode(snap), keepalive = hide && body.length < 60000; // fetch keepalive ≤ 64 KB: lượt đẩy khi rời trang vẫn tới nơi
        let j;
        if (st.fileId) {
          spend(st, 'update');
          j = await (await call(`${UP}/${st.fileId}?uploadType=media&fields=id,version`, { method: 'PATCH', headers: { 'Content-Type': 'application/gzip' }, body, keepalive }, token)).json();
        } else {
          spend(st, 'create');
          const b = 'lk' + Math.random().toString(36).slice(2), meta = JSON.stringify({ name: NAME, parents: ['appDataFolder'], mimeType: 'application/gzip' });
          const mp = new Blob([`--${b}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${meta}\r\n--${b}\r\nContent-Type: application/gzip\r\n\r\n`, body, `\r\n--${b}--`]);
          j = await (await call(`${UP}?uploadType=multipart&fields=id,version`, { method: 'POST', headers: { 'Content-Type': 'multipart/related; boundary=' + b }, body: mp }, token)).json();
        }
        st.fileId = j.id; st.ver = String(j.version); st.hash = h;
      }
      Object.assign(st, { fail: 0, nextAt: 0, okAt: now(), scope: 'ok' });
      await save(ctx.uid, st);
      return 'ok';
    } catch (e) {
      if (e.code === 'budget') { await save(ctx.uid, st); return 'budget'; }
      if (e.status === 401) { tok.clear(); await save(ctx.uid, st); arm(ctx, st); return 'no-token'; }
      if (e.status === 403 && /insufficient|PERMISSION_DENIED/i.test(e.reason || '')) { tok.clear(); st.scope = 'no'; await save(ctx.uid, st); return 'no-scope'; } // người học bỏ ô Drive ở màn đồng ý
      st.fail = (st.fail || 0) + 1; st.nextAt = now() + backoff(st.fail); // mất mạng, 429/403 rateLimit, 5xx
      await save(ctx.uid, st);
      return 'retry';
    }
  }

  // ---------- Gia hạn token trong cú chạm kế tiếp (chỉ khi cần, có giới hạn) ----------
  let armed = false;
  function arm(ctx, st) {
    const c = cfg();
    if (armed || !ctx.renew || st.scope === 'no' || (st.renews || 0) >= c.renewMax && st.day === today() || now() - (st.renewAt || 0) < c.renewGap) return;
    if (!ctx.due(st)) return; // không có gì cần gửi và vừa kéo gần đây → không gia hạn (không popup)
    armed = true;
    const go = () => {
      w.removeEventListener('pointerdown', go, true); w.removeEventListener('keydown', go, true); armed = false;
      st.renewAt = now(); st.renews = (st.day === today() ? st.renews || 0 : 0) + 1; save(ctx.uid, st);
      // Gọi đồng bộ ngay trong sự kiện người dùng → trình duyệt cho mở popup; popup tự đóng (prompt=none) khi đã đồng ý trước đó
      ctx.renew(false).then(r => { if (r && r.token) { tok.set(ctx.uid, r.token, r.expiresIn); cycle(ctx, 'renew'); } }).catch(() => {});
    };
    w.addEventListener('pointerdown', go, true); w.addEventListener('keydown', go, true);
  }

  // Xóa tệp đồng bộ trên Drive (xóa tài khoản) – cố gắng hết sức, không chặn việc xóa tài khoản
  async function wipe(uid) {
    const token = tok.get(uid);
    try {
      if (token) {
        const q = encodeURIComponent(`name='${NAME}'`);
        const j = await (await call(`${DRIVE}?spaces=appDataFolder&q=${q}&fields=files(id)`, {}, token)).json();
        for (const f of j.files || []) await call(`${DRIVE}/${f.id}`, { method: 'DELETE' }, token).catch(() => {});
      }
    } catch (e) { /* tệp còn lại nằm trong Drive của chính người học (Drive › Cài đặt › Quản lý ứng dụng) */ }
    tok.clear();
    const all = await Core.Store.get(ST, {}); delete all[uid]; await Core.Store.set(ST, all);
    return !!token;
  }

  w.SyncDrive = { SCOPE, NAME, COST, cfg, tok, load, save, cycle, wipe, backoff, encode, decode, reset: () => { tok.clear(); running = null; again = false; armed = false; } };
})(window);
