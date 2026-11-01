/* Đồng bộ local-first qua Google Drive appDataFolder của CHÍNH người học (docs/SYNC-DRIVE.md) – tải lười từ sync.js.
 * IndexedDB là nguồn thật, KHÔNG BAO GIỜ bị thay: bản từ xa chỉ được GỘP vào (LWW từng thẻ + dấu xóa), không xóa/ghi đè dữ liệu máy.
 * Drive: tệp chính NAME = ảnh chụp gzip trong phong bì { kind, v (schema), sha (SHA-256 của data), data } = nhật ký đã nén sẵn
 *   (Drive tính theo LƯỢT gọi, không theo byte → 1 tệp rẻ hơn nhiều tệp delta). Mỗi lượt: get version (5 đv) → khác bản đã biết thì tải (200),
 *   kiểm SHA, gộp → ảnh chụp mới khác hash thì PATCH (50) và KIỂM SAU KHI GHI (size trả về = số byte gửi; lệch = ghi dở → coi như lỗi, thử lại).
 * Ghi lũy đẳng: nội dung = trạng thái (không phải thao tác) → gửi lại bao nhiêu lần cũng như 1; kết quả mất giữa chừng → lượt sau thấy
 *   version đổi, tải về, hash trùng → không ghi lại.
 * Sao lưu: NBAK bản xoay vòng theo ngày (bak0..2, 1 lượt ghi/ngày). Tệp chính hỏng/không đọc được → giữ nguyên tệp hỏng (đổi tên .corrupt),
 *   gộp MỌI bản sao lưu đọc được (gộp giao hoán, lũy đẳng → gộp hết là an toàn) rồi ghi tệp chính mới. Tệp schema MỚI hơn (bản app mới hơn)
 *   → không bao giờ ghi đè: báo 'newer', sync.js quay về D1.
 * 0 USD: Drive API miễn phí dưới 400 triệu đơn vị/ngày/dự án; dung lượng ở Drive của người học (15–100 KB).
 * Ngân sách mỗi máy/ngày (cfg.cap) + lùi cấp số nhân khi lỗi/429/5xx → không dội API; mọi lỗi đều im lặng, dữ liệu chờ trên máy.
 * Token: lấy ở popup đăng nhập Google (Firebase, scope drive.appdata – hỏi 1 lần). Hết hạn (1 giờ) → chỉ gia hạn trong 1 cú chạm
 * của người dùng khi thật sự cần đồng bộ (popup tự đóng, prompt=none), tối đa 1 lần/45 phút, 3 lần/ngày; không bao giờ hiện hộp hỏi khi đang học. */
(function (w) {
  const DRIVE = 'https://www.googleapis.com/drive/v3/files', UP = 'https://www.googleapis.com/upload/drive/v3/files';
  const SCOPE = 'https://www.googleapis.com/auth/drive.appdata', PREFIX = 'lexkite-sync', NAME = 'lexkite-sync.v2.json.gz', SCHEMA = 2, NBAK = 3;
  const BAK = i => `lexkite-sync.bak${i}.v2.json.gz`, CORRUPT = 'lexkite-sync.corrupt.json.gz';
  const COST = { list: 100, get: 5, download: 200, create: 50, update: 50, delete: 50 }; // developers.google.com/workspace/drive/api/guides/limits
  const cfg = () => Object.assign({ every: 600e3, cap: 1200, renewGap: 45 * 60e3, renewMax: 3, stale: 12 * 3600e3, bridgeDays: 30 }, w.LK_SYNC || {});
  const now = () => Date.now(), today = () => new Date().toISOString().slice(0, 10), dayNo = () => Math.floor(now() / 864e5);

  // ---------- Token (chỉ scope drive.appdata – chỉ chạm được tệp riêng của ứng dụng) ----------
  const TK = 'lk.dt';
  const tok = {
    get(uid) { try { const x = JSON.parse(localStorage.getItem(TK) || 'null'); return x && x.uid === uid && x.exp > now() + 60e3 ? x.t : ''; } catch (e) { return ''; } },
    set(uid, t, sec) { if (!t) return; try { localStorage.setItem(TK, JSON.stringify({ uid, t, exp: now() + (Math.max(300, +sec || 3600) - 120) * 1000 })); } catch (e) { /* bỏ qua */ } },
    clear() { try { localStorage.removeItem(TK); } catch (e) { /* bỏ qua */ } },
  };

  // ---------- Trạng thái theo tài khoản (IndexedDB qua Core.Store) ----------
  const ST = 'driveSync';
  const load = async uid => ({ fileId: '', ver: '', hash: '', day: '', units: 0, fail: 0, nextAt: 0, on: 0, bak: {}, ...((await Core.Store.get(ST, {}))[uid] || {}) });
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

  // ---------- Phong bì: gzip(JSON { kind, v, sha, data: chuỗi JSON ảnh chụp }) ----------
  const hex = b => [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
  const sha = async txt => hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(txt)));
  const gz = typeof CompressionStream !== 'undefined';
  async function pack(snap) {
    const data = JSON.stringify(snap), env = JSON.stringify({ kind: PREFIX, v: SCHEMA, sha: await sha(data), data });
    if (!gz) return new TextEncoder().encode(env);
    return new Uint8Array(await new Response(new Blob([env]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer());
  }
  const corrupt = why => Object.assign(new Error('corrupt ' + why), { code: 'corrupt' });
  // Bảng nâng schema (dry-run được: hàm thuần, không ghi gì). v2 = gốc; bản sau thêm MIGRATE[3] = s => …
  const MIGRATE = {};
  const migrate = (snap, v) => { let s = snap; for (let k = v + 1; k <= SCHEMA; k++) s = MIGRATE[k] ? MIGRATE[k](s) : s; return s; };
  async function unpack(u8) {
    let txt;
    try { txt = u8[0] === 0x1f && u8[1] === 0x8b ? await new Response(new Blob([u8]).stream().pipeThrough(new DecompressionStream('gzip'))).text() : new TextDecoder().decode(u8); } catch (e) { throw corrupt('gzip'); }
    let env; try { env = JSON.parse(txt); } catch (e) { throw corrupt('json'); }
    if (!env || env.kind !== PREFIX || typeof env.data !== 'string' || !(+env.v >= 1)) throw corrupt('envelope');
    if (+env.v > SCHEMA) throw Object.assign(new Error('newer schema ' + env.v), { code: 'newer', v: +env.v });
    if (await sha(env.data) !== env.sha) throw corrupt('sha');
    let snap; try { snap = JSON.parse(env.data); } catch (e) { throw corrupt('data'); }
    if (!snap || typeof snap !== 'object' || typeof snap.cards !== 'object') throw corrupt('shape');
    return migrate(snap, +env.v);
  }

  // ---------- Thao tác tệp ----------
  async function list(st, token) {
    spend(st, 'list');
    const q = encodeURIComponent(`name contains '${PREFIX}' and trashed=false`);
    const j = await (await call(`${DRIVE}?spaces=appDataFolder&q=${q}&fields=files(id,name,version)&pageSize=50`, {}, token)).json();
    const fs = j.files || [], main = fs.filter(f => f.name === NAME).sort((a, b) => +b.version - +a.version)[0];
    st.fileId = main ? main.id : ''; st.ver = ''; st.bak = {};
    for (let i = 0; i < NBAK; i++) { const f = fs.find(x => x.name === BAK(i)); if (f) st.bak[i] = f.id; }
    st.listed = 1;
  }
  const download = async (st, id, token) => { spend(st, 'download'); return new Uint8Array(await (await call(`${DRIVE}/${id}?alt=media`, {}, token)).arrayBuffer()); };
  // Ghi + kiểm sau khi ghi: Drive trả size đã lưu; khác số byte gửi = ghi dở → lỗi (không ghi nhận hash, lượt sau tự sửa)
  async function write(st, id, name, body, token, keepalive) {
    let j;
    if (id) {
      spend(st, 'update');
      j = await (await call(`${UP}/${id}?uploadType=media&fields=id,version,size`, { method: 'PATCH', headers: { 'Content-Type': 'application/gzip' }, body, keepalive }, token)).json();
    } else {
      spend(st, 'create');
      const b = 'lk' + Math.random().toString(36).slice(2), meta = JSON.stringify({ name, parents: ['appDataFolder'], mimeType: 'application/gzip' });
      const mp = new Blob([`--${b}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${meta}\r\n--${b}\r\nContent-Type: application/gzip\r\n\r\n`, body, `\r\n--${b}--`]);
      j = await (await call(`${UP}?uploadType=multipart&fields=id,version,size`, { method: 'POST', headers: { 'Content-Type': 'multipart/related; boundary=' + b }, body: mp }, token)).json();
    }
    if (!j || !j.id || (j.size != null && +j.size !== body.length)) throw Object.assign(new Error('partial write'), { status: 'partial', id: j && j.id });
    return j;
  }
  // Tệp chính hỏng: giữ lại (đổi tên, không xóa) rồi gộp mọi bản sao lưu đọc được vào máy
  async function recover(ctx, st, token) {
    if (st.fileId) { spend(st, 'update'); await call(`${DRIVE}/${st.fileId}?fields=id`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: CORRUPT }) }, token); }
    st.fileId = ''; st.ver = ''; st.pendingRestore = 1; st.restored = (st.restored || 0) + 1; st.restoredAt = now();
    await save(ctx.uid, st); // cờ được lưu TRƯỚC khi tải bản sao lưu: hết ngân sách/mất mạng giữa chừng → lượt sau khôi phục tiếp
    return restore(ctx, st, token);
  }
  async function restore(ctx, st, token) {
    let n = 0;
    for (const i of Object.keys(st.bak || {})) {
      try { await ctx.apply(await unpack(await download(st, st.bak[i], token))); n++; }
      catch (e) {
        if (e.status === 404) { delete st.bak[i]; continue; } // bản sao lưu đã mất → bỏ khe
        if (e.code === 'corrupt' || e.code === 'newer') continue; // bản này cũng hỏng / của bản app mới hơn → bỏ qua, không ghi đè
        throw e; // mất mạng, 401, 429, 5xx, hết ngân sách → giữ cờ, lượt sau khôi phục tiếp
      }
    }
    st.pendingRestore = 0;
    return n;
  }

  // ---------- Một lượt đồng bộ ----------
  // ctx (từ sync.js): { uid, build(): ảnh chụp cục bộ, apply(remote): GỘP vào máy, hash(snap), due(st), renew(interactive) }
  let running = null, again = false;
  function cycle(ctx, why) {
    if (running) { again = true; return running; }
    running = (async () => { let r; try { do { again = false; r = await once(ctx, why); } while (again); } finally { running = null; } return r; })();
    return running;
  }
  async function once(ctx, why) {
    const st = await load(ctx.uid);
    if (st.nextAt > now() && why !== 'manual') return 'wait';
    if (st.newer && why !== 'manual') return 'newer';
    const token = tok.get(ctx.uid);
    if (!token) { arm(ctx, st); return 'no-token'; }
    try {
      if (!st.listed) await list(st, token);
      let remoteVer = '', remoteHash = '', repair = false;
      if (st.pendingRestore) { await restore(ctx, st, token); repair = true; }
      if (st.fileId) {
        spend(st, 'get');
        try { remoteVer = String((await (await call(`${DRIVE}/${st.fileId}?fields=version`, {}, token)).json()).version); }
        catch (e) { if (e.status !== 404) throw e; st.fileId = ''; st.ver = ''; } // tệp bị xóa (Drive › Quản lý ứng dụng) → tạo lại từ máy
      }
      if (st.fileId && remoteVer !== st.ver) {
        try {
          const remote = await unpack(await download(st, st.fileId, token));
          await ctx.apply(remote); remoteHash = ctx.hash(remote); st.ver = remoteVer;
        } catch (e) {
          if (e.code === 'newer') { st.newer = e.v; await save(ctx.uid, st); return 'newer'; }
          if (e.code !== 'corrupt') throw e;
          await recover(ctx, st, token); repair = true;
        }
      }
      st.newer = 0;
      const snap = await ctx.build(), h = ctx.hash(snap);
      if (h === remoteHash) st.hash = h; // máy đã y hệt bản trên Drive → không ghi lại
      if (repair || !st.fileId || h !== st.hash) {
        const body = await pack(snap), keepalive = why === 'hide' && body.length < 60000; // fetch keepalive ≤ 64 KB: lượt đẩy khi rời trang vẫn tới nơi
        let j;
        try { j = await write(st, st.fileId, NAME, body, token, keepalive); }
        catch (e) { if (e.status === 'partial' && e.id) { st.fileId = e.id; st.ver = 'partial'; } throw e; } // ghi dở: lượt sau tải lại, phát hiện hỏng, khôi phục
        st.fileId = j.id; st.ver = String(j.version); st.hash = h;
        // Sao lưu xoay vòng: 1 lượt ghi/ngày vào khe (ngày % NBAK); lỗi/hết ngân sách sao lưu không làm hỏng lượt chính
        if (st.bakDay !== today()) {
          const slot = dayNo() % NBAK;
          try { const b = await write(st, st.bak[slot], BAK(slot), body, token); st.bak[slot] = b.id; st.bakDay = today(); } catch (e) { if (e.status === 401) throw e; }
        }
      }
      Object.assign(st, { fail: 0, nextAt: 0, okAt: now(), scope: 'ok' });
      await save(ctx.uid, st);
      return 'ok';
    } catch (e) {
      if (e.code === 'budget') { await save(ctx.uid, st); return 'budget'; }
      if (e.status === 401) { tok.clear(); await save(ctx.uid, st); arm(ctx, st); return 'no-token'; }
      if (e.status === 403 && /insufficient|PERMISSION_DENIED/i.test(e.reason || '')) { tok.clear(); st.scope = 'no'; await save(ctx.uid, st); return 'no-scope'; } // bỏ ô Drive / thu hồi quyền
      st.fail = (st.fail || 0) + 1; st.nextAt = now() + backoff(st.fail); // mất mạng, 429/403 rateLimit, 5xx, ghi dở
      await save(ctx.uid, st);
      return 'retry';
    }
  }

  // Dry-run: đọc bản trên Drive (kể cả khi hỏng → bản sao lưu), KHÔNG gộp, KHÔNG ghi – để kiểm di chuyển/khôi phục trước khi bật
  async function peek(uid) {
    const token = tok.get(uid); if (!token) return { ok: false, why: 'no-token' };
    const st = await load(uid), out = { ok: true, main: null, backups: [] };
    await list(st, token);
    const read = async id => { try { return { snap: await unpack(await download(st, id, token)) }; } catch (e) { return { error: e.code || e.message }; } };
    if (st.fileId) out.main = await read(st.fileId);
    for (const i of Object.keys(st.bak)) out.backups.push({ slot: +i, ...(await read(st.bak[i])) });
    return out;
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

  // Xóa mọi tệp đồng bộ trên Drive (xóa tài khoản) – cố gắng hết sức, không chặn việc xóa tài khoản
  async function wipe(uid) {
    const token = tok.get(uid);
    try {
      if (token) {
        const q = encodeURIComponent(`name contains '${PREFIX}'`);
        const j = await (await call(`${DRIVE}?spaces=appDataFolder&q=${q}&fields=files(id)&pageSize=50`, {}, token)).json();
        for (const f of j.files || []) await call(`${DRIVE}/${f.id}`, { method: 'DELETE' }, token).catch(() => {});
      }
    } catch (e) { /* tệp còn lại nằm trong Drive của chính người học (Drive › Cài đặt › Quản lý ứng dụng) */ }
    tok.clear();
    const all = await Core.Store.get(ST, {}); delete all[uid]; await Core.Store.set(ST, all);
    return !!token;
  }

  w.SyncDrive = { SCOPE, NAME, SCHEMA, NBAK, BAK, CORRUPT, COST, cfg, tok, load, save, cycle, wipe, peek, backoff, pack, unpack, migrate, reset: () => { tok.clear(); running = null; again = false; armed = false; } };
})(window);
