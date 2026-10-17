/* Kho Drive – trình duyệt file + dọn dẹp thông minh (docs/ASSET-LIBRARY.md §8.6.1). Gắn vào OPS của functions/api/drive.js (chỉ quản trị).
 *   browse · thumb · preview · rename · move · trash · restore · delete · empty_trash · storage_report · cleanup_scan · cleanup_apply
 * Scope drive.file: Google chỉ trả file do app tạo → mọi thao tác chỉ chạm file của Lexkite. Thêm hàng rào:
 *   - thư mục hệ thống (drive_folders: "Lexkite Library/…") không được đổi tên/chuyển/vứt/xoá;
 *   - xoá vĩnh viễn chỉ file ĐÃ ở thùng rác + confirm:'DELETE' + đăng nhập lại ≤ 15 phút (DANGER ở drive.js) + nhật ký;
 *   - cleanup_scan chỉ đọc (dry-run); cleanup_apply chỉ chuyển vào thùng rác (khôi phục được 30 ngày, có Undo = restore);
 *   - ảnh thu nhỏ đi qua /api/drive/thumb (link ký, proxy, cache) – thumbnailLink/token Google không bao giờ tới trình duyệt.
 * D1 drive_files luôn khớp: trash → 'trashed', restore → 'ok', delete → xoá dòng, rename/move → name/folder; quét toàn bộ (report/scan) đối chiếu lại. */
const API = 'https://www.googleapis.com/drive/v3/files';
const FOLDER = 'application/vnd.google-apps.folder';
const ROOT_FOLDER = 'Lexkite Library';
const ID = /^[A-Za-z0-9_-]{10,120}$/;
const LIST_F = 'id,name,mimeType,size,modifiedTime,createdTime,md5Checksum,parents,trashed,appProperties';
const BROWSE_F = LIST_F + ',thumbnailLink,webViewLink';
const DAY = 864e5, THUMB_TTL = 6 * 3600, MAX_IDS = 200, SCAN_PAGES = 20;
const ORDER = { name: 'folder,name', name_desc: 'folder,name desc', size: 'folder,quotaBytesUsed desc', size_asc: 'folder,quotaBytesUsed', date: 'folder,modifiedTime desc', date_asc: 'folder,modifiedTime' };
export const CATS = ['trashed', 'partial', 'duplicate', 'temp', 'old_reject', 'orphan'];
const TEMP_DIR = /^(tmp|temp|_tmp|cache|out|renders?|render-out|scratch)$/i, TEMP_NAME = /(\.tmp|\.part|\.crdownload|\.partial|~)$|^(tmp|temp)[_.-]/i;
const qstr = s => String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
const isDoc = m => String(m || '').startsWith('application/vnd.google-apps.');
const sz = f => +f.size || 0;
const tms = f => Date.parse(f.modifiedTime || f.createdTime || '') || 0;
const cleanName = s => String(s || '').replace(/[\u0000-\u001f/\\]/g, '_').trim().slice(0, 200);
const kind = m => (m === FOLDER ? 'folder' : /^image\//.test(m) ? 'image' : /^video\//.test(m) ? 'video' : /^audio\//.test(m) ? 'audio' : /json|text\//.test(m) ? 'data' : 'other');

/** Đường dẫn (so với "Lexkite Library") của mọi thư mục trong danh sách. Thư mục ngoài kho → không có trong map. */
export function folderPaths(files, rootId) {
  const byId = new Map(files.filter(f => f.mimeType === FOLDER).map(f => [f.id, f])), out = new Map();
  if (rootId) out.set(rootId, '');
  const walk = (id, depth = 0) => {
    if (out.has(id)) return out.get(id);
    const f = byId.get(id); if (!f || depth > 12) return null;
    const p = (f.parents || [])[0]; const pp = p ? walk(p, depth + 1) : null;
    const v = pp == null ? null : (pp ? pp + '/' : '') + f.name;
    out.set(id, v); return v;
  };
  for (const id of byId.keys()) walk(id);
  return out;
}
const pathOf = (paths, f) => { for (const p of f.parents || []) if (paths.has(p) && paths.get(p) != null) return paths.get(p); return null; };

/**
 * Phân loại ứng viên dọn dẹp (thuần, không gọi mạng). Mỗi file thuộc tối đa 1 nhóm theo thứ tự CATS.
 * files: kết quả files.list (cả thư mục, cả thùng rác) · db: drive_files của Drive này · refs: drive_refs (library.json + manifest dựng)
 * opt: reject_days (30) · reserve_days (90) · temp_days (7) · partial_hours (24) · now · root (id "Lexkite Library") · system (Set id thư mục hệ thống)
 */
export function classify(files, { db = [], refs = [], root = null, system = new Set(), now = Date.now(), reject_days = 30, reserve_days = 90, temp_days = 7, partial_hours = 24 } = {}) {
  const paths = folderPaths(files, root);
  const dbBy = new Map(), okSha = new Set(), pendSha = new Map();
  for (const r of db) { if (r.file_id) dbBy.set(r.file_id, r); if (r.status === 'ok') okSha.add(r.sha256); if (r.status === 'pending') pendSha.set(r.sha256, r); }
  const refFile = new Set(), refSha = new Map(), refName = new Set();
  for (const r of refs) { if (r.file_id) refFile.add(r.file_id); if (r.sha) refSha.set(r.sha, refSha.get(r.sha) === 'approved' ? 'approved' : r.status || 'ref'); if (r.name) refName.add(r.name); }
  const synced = refs.length > 0;
  const shaOf = f => ((f.appProperties || {}).sha256 || (dbBy.get(f.id) || {}).sha256 || null);
  const refBy = f => (refFile.has(f.id) ? 2 : (shaOf(f) && refSha.has(shaOf(f))) || refName.has(f.name) ? 1 : 0);
  const groups = Object.fromEntries(CATS.map(c => [c, []]));
  const taken = new Set();
  const add = (cat, f, reason, extra = {}) => { taken.add(f.id); groups[cat].push({ id: f.id, name: f.name, path: pathOf(paths, f), size: sz(f), mime: f.mimeType, modified: f.modifiedTime || null, created: f.createdTime || null, reason, ...extra }); };
  const ours = f => !isDoc(f.mimeType) && f.mimeType !== FOLDER && (pathOf(paths, f) != null || (f.appProperties || {}).lexkite || dbBy.has(f.id));
  const live = [];
  for (const f of files) {
    if (f.mimeType === FOLDER) { if (f.trashed && !system.has(f.id)) add('trashed', f, 'in-trash'); continue; }
    if (!ours(f)) continue;
    if (f.trashed) { add('trashed', f, 'in-trash'); continue; }
    const ageH = (now - (Date.parse(f.createdTime || f.modifiedTime || '') || now)) / 36e5, row = dbBy.get(f.id), sha = shaOf(f);
    if (sz(f) === 0) { add('partial', f, 'zero-byte'); continue; }
    if (row && row.size != null && +row.size !== sz(f)) { add('partial', f, 'size-mismatch', { expected: +row.size }); continue; }
    if (!row && sha && pendSha.has(sha) && !okSha.has(sha) && ageH > partial_hours) { add('partial', f, 'incomplete-upload'); continue; }
    live.push(f);
  }
  // Trùng: cùng md5 (Google) hoặc cùng sha256 (appProperties/drive_files). Giữ: manifest trỏ id > manifest trỏ sha > có trong drive_files > mới nhất.
  const dupKey = new Map();
  for (const f of live) { const k = f.md5Checksum ? 'm:' + f.md5Checksum : shaOf(f) ? 's:' + shaOf(f) : null; if (k) (dupKey.get(k) || dupKey.set(k, []).get(k)).push(f); }
  for (const g of dupKey.values()) {
    if (g.length < 2) continue;
    const score = f => [refBy(f), dbBy.get(f.id) && dbBy.get(f.id).status === 'ok' ? 1 : 0, tms(f)];
    g.sort((a, b) => { const x = score(a), y = score(b); for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return y[i] - x[i]; return a.id < b.id ? -1 : 1; });
    const keep = g[0];
    for (const f of g.slice(1)) add('duplicate', f, refBy(keep) ? 'dup-keep-referenced' : 'dup-keep-newest', { keep: { id: keep.id, name: keep.name, path: pathOf(paths, keep) } });
  }
  for (const f of live) {
    if (taken.has(f.id)) continue;
    const p = pathOf(paths, f) || '', ageD = (now - tms(f)) / DAY;
    if ((p.split('/').some(s => TEMP_DIR.test(s)) || TEMP_NAME.test(f.name)) && refBy(f) < 2 && ageD > temp_days) { add('temp', f, 'temp-older', { days: Math.floor(ageD) }); continue; }
    const st = refSha.get(shaOf(f));
    if (refBy(f) < 2 && !refName.has(f.name) && ((st === 'reject' && ageD > reject_days) || (st === 'reserve' && ageD > reserve_days))) { add('old_reject', f, st + '-older', { days: Math.floor(ageD), status: st }); continue; }
    if (!refBy(f)) {
      const known = dbBy.get(f.id) && dbBy.get(f.id).status === 'ok';
      if (!known) add('orphan', f, 'orphan-unknown'); // không có trong drive_files lẫn manifest
      else if (synced) add('orphan', f, 'orphan-unreferenced'); // có bản ghi nhưng manifest không còn trỏ tới
    }
  }
  const by = {}; let total = 0, count = 0;
  for (const c of CATS) { const b = groups[c].reduce((s, x) => s + x.size, 0); by[c] = { files: groups[c].length, bytes: b }; total += b; count += groups[c].length; }
  return { groups, by, total, count, refs_synced: synced };
}

/** Tổng hợp báo cáo dung lượng (thuần). */
export function report(files, root) {
  const paths = folderPaths(files, root), byFolder = {}, byType = {}, trash = { files: 0, bytes: 0 }, all = [];
  let bytes = 0, n = 0;
  for (const f of files) {
    if (f.mimeType === FOLDER || isDoc(f.mimeType)) continue;
    if (f.trashed) { trash.files++; trash.bytes += sz(f); continue; }
    const p = pathOf(paths, f), top = p == null ? '(ngoài kho)' : p.split('/')[0] || '(gốc)', t = kind(f.mimeType);
    (byFolder[top] = byFolder[top] || { files: 0, bytes: 0 }).files++; byFolder[top].bytes += sz(f);
    (byType[t] = byType[t] || { files: 0, bytes: 0 }).files++; byType[t].bytes += sz(f);
    bytes += sz(f); n++; all.push({ id: f.id, name: f.name, path: p, size: sz(f), mime: f.mimeType, created: f.createdTime || null });
  }
  return {
    total: { files: n, bytes }, trash, by_folder: byFolder, by_type: byType,
    largest: [...all].sort((a, b) => b.size - a.size).slice(0, 10),
    recent: [...all].sort((a, b) => (Date.parse(b.created || '') || 0) - (Date.parse(a.created || '') || 0)).slice(0, 10),
  };
}

/** h = { accessToken, gfetch, DriveErr, one, all, run, signLink, signThumb, limit } (tiêm từ drive.js để tránh vòng import). */
export function makeFileOps(h) {
  const { gfetch, DriveErr, one, all, run } = h;
  async function g(at, url, init = {}) {
    const r = await gfetch(url, { ...init, headers: { Authorization: 'Bearer ' + at, ...(init.body ? { 'Content-Type': 'application/json' } : {}), ...(init.headers || {}) } });
    if (r.status === 404) throw new DriveErr('not-found', 404);
    if (r.status === 403 || r.status === 401) throw new DriveErr('google-denied', 403);
    if (!r.ok && r.status !== 204) throw new DriveErr('google-files');
    return r.status === 204 ? {} : r.json().catch(() => ({}));
  }
  async function ctx(db, b, env) {
    const d = await one(db, 'SELECT * FROM drives WHERE id = ?', +b.drive_id);
    if (!d) throw new DriveErr('not-found', 404);
    if (d.status === 'revoked') throw new DriveErr('drive-revoked', 409);
    return { d, at: await h.accessToken(env, db, d) };
  }
  async function rootId(db, at, d) {
    const k = await one(db, 'SELECT folder_id FROM drive_folders WHERE drive_id = ? AND path = ?', d.id, ROOT_FOLDER);
    if (k) return k.folder_id;
    const q = `name = '${qstr(ROOT_FOLDER)}' and mimeType = '${FOLDER}' and 'root' in parents and trashed = false`;
    const j = await g(at, `${API}?fields=files(id)&pageSize=1&q=${encodeURIComponent(q)}`);
    const id = ((j.files || [])[0] || {}).id || null;
    if (id) await run(db, 'INSERT OR REPLACE INTO drive_folders (drive_id, path, folder_id) VALUES (?, ?, ?)', d.id, ROOT_FOLDER, id);
    return id;
  }
  const systemIds = async (db, d) => new Set((await all(db, 'SELECT folder_id FROM drive_folders WHERE drive_id = ?', d.id)).map(r => r.folder_id));
  async function listAll(at, q = '') {
    const files = []; let tok = '', pages = 0;
    do {
      const j = await g(at, `${API}?pageSize=1000&fields=${encodeURIComponent('nextPageToken,files(' + LIST_F + ')')}${q ? '&q=' + encodeURIComponent(q) : ''}${tok ? '&pageToken=' + encodeURIComponent(tok) : ''}`);
      files.push(...(j.files || [])); tok = j.nextPageToken || ''; pages++;
    } while (tok && pages < SCAN_PAGES);
    return { files, truncated: !!tok };
  }
  /** Đối chiếu D1 với danh sách đầy đủ trên Google: thùng rác ↔ 'trashed', mất hẳn → 'gone' (CLI sẽ tải lại khi cần). */
  async function reconcile(db, d, files, truncated) {
    const by = new Map(files.map(f => [f.id, f])), rows = await all(db, "SELECT id, file_id, status FROM drive_files WHERE drive_id = ? AND file_id IS NOT NULL AND status IN ('ok', 'trashed')", d.id);
    const st = [];
    for (const r of rows) {
      const f = by.get(r.file_id), want = f ? (f.trashed ? 'trashed' : 'ok') : truncated ? r.status : 'gone';
      if (want !== r.status) st.push(db.prepare('UPDATE drive_files SET status = ? WHERE id = ?').bind(want, r.id));
    }
    if (st.length) await db.batch(st);
    return st.length;
  }
  /** Đường dẫn của thư mục so với gốc kho ('' = gốc), null nếu nằm ngoài kho. */
  async function libPath(db, at, d, folderId) {
    const root = await rootId(db, at, d); if (!root) return null;
    const names = []; let id = folderId;
    for (let i = 0; i < 12; i++) {
      if (id === root) return names.reverse().join('/');
      const f = await g(at, `${API}/${encodeURIComponent(id)}?fields=id,name,mimeType,parents,trashed`);
      if (f.mimeType !== FOLDER) return null;
      names.push(f.name); id = (f.parents || [])[0]; if (!id) return null;
    }
    return null;
  }
  async function crumbs(db, at, d, folderId) {
    const root = await rootId(db, at, d), out = []; let id = folderId;
    for (let i = 0; i < 12 && id; i++) {
      if (id === root) { out.push({ id, name: ROOT_FOLDER }); break; }
      const f = await g(at, `${API}/${encodeURIComponent(id)}?fields=id,name,parents`);
      out.push({ id: f.id, name: f.name }); id = (f.parents || [])[0];
      if (!id) return null; // ra ngoài kho
    }
    return out.reverse();
  }
  const ids = b => { const a = Array.isArray(b.file_ids) ? b.file_ids : b.file_id ? [b.file_id] : []; const v = [...new Set(a.map(String))]; return v.length && v.length <= MAX_IDS && v.every(x => ID.test(x)) ? v : null; };
  async function pool(items, n, fn) { const out = []; let i = 0; await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => { while (i < items.length) { const k = i++; out[k] = await fn(items[k]); } })); return out; }
  const repath = (db, driveId, from, to) => run(db, "UPDATE drive_files SET folder = ? || substr(folder, ?) WHERE drive_id = ? AND (folder = ? OR folder LIKE ? ESCAPE '\\')", to, from.length + 1, driveId, from, from.replace(/[\\%_]/g, m => '\\' + m) + '/%');
  const folderRows = (db, driveId, p, status, where) => run(db, `UPDATE drive_files SET status = ? WHERE drive_id = ? AND status = ? AND (folder = ? OR folder LIKE ? ESCAPE '\\')`, status, driveId, where, p, p.replace(/[\\%_]/g, m => '\\' + m) + '/%');
  /** Chuyển/khôi phục thùng rác 1 lô. */
  const log = (db, who, act, d, x, extra = {}) => (h.audit ? h.audit(db, { who: who && who.email, act, d, file_id: x.id, name: x.name, size: x.size, ...extra }) : null);
  async function setTrash(db, env, b, on, who, act = on ? 'trash' : 'restore') {
    const list = ids(b); if (!list) return { status: 400, error: 'bad-input' };
    const { d, at } = await ctx(db, b, env), sys = await systemIds(db, d);
    const res = await pool(list, 6, async id => {
      if (sys.has(id)) return { id, error: 'system-folder' };
      try {
        const f = await g(at, `${API}/${encodeURIComponent(id)}?fields=id,name,mimeType,size,trashed`);
        let p = null; if (f.mimeType === FOLDER) p = await libPath(db, at, d, id).catch(() => null);
        await g(at, `${API}/${encodeURIComponent(id)}?fields=id,trashed`, { method: 'PATCH', body: JSON.stringify({ trashed: on }) });
        await run(db, 'UPDATE drive_files SET status = ? WHERE drive_id = ? AND file_id = ? AND status = ?', on ? 'trashed' : 'ok', d.id, id, on ? 'ok' : 'trashed');
        if (p) await folderRows(db, d.id, p, on ? 'trashed' : 'ok', on ? 'ok' : 'trashed');
        await log(db, who, act, d, { id, name: f.name, size: sz(f) });
        return { id, ok: true, size: sz(f) };
      } catch (e) { await log(db, who, act, d, { id }, { ok: 0, note: e.code || 'error' }); return { id, error: e.code || 'error' }; }
    });
    const done = res.filter(x => x.ok);
    return { ok: true, done: done.map(x => x.id), bytes: done.reduce((s, x) => s + x.size, 0), failed: res.filter(x => !x.ok).map(x => ({ id: x.id, error: x.error })) };
  }
  async function hardDelete(db, d, at, list, sys, who, act = 'delete') {
    const res = await pool(list, 6, async id => {
      if (sys.has(id)) return { id, error: 'system-folder' };
      try {
        const f = await g(at, `${API}/${encodeURIComponent(id)}?fields=id,name,trashed,size,mimeType`);
        if (!f.trashed) return { id, error: 'not-in-trash' }; // 2 bước: phải vào thùng rác trước
        await g(at, `${API}/${encodeURIComponent(id)}`, { method: 'DELETE' });
        await log(db, who, act, d, { id, name: f.name, size: sz(f) });
        return { id, ok: true, size: sz(f) };
      } catch (e) { return e.code === 'not-found' ? { id, ok: true, size: 0 } : { id, error: e.code || 'error' }; }
    });
    const done = res.filter(x => x.ok), bytes = done.reduce((s, x) => s + x.size, 0);
    for (let i = 0; i < done.length; i += 50) { const part = done.slice(i, i + 50).map(x => x.id); await run(db, `DELETE FROM drive_files WHERE drive_id = ? AND file_id IN (${part.map(() => '?').join(',')})`, d.id, ...part); }
    if (bytes) await run(db, 'UPDATE drives SET quota_used = MAX(0, COALESCE(quota_used, 0) - ?) WHERE id = ?', bytes, d.id);
    return { done: done.map(x => x.id), bytes, failed: res.filter(x => !x.ok).map(x => ({ id: x.id, error: x.error })) };
  }
  const heavy = async who => (h.limit ? await h.limit('drvscan:' + who.email, 20, 60) : 0);
  const refsOf = db => all(db, 'SELECT src, sha, file_id, name, status FROM drive_refs');
  const opt = (v, def, max) => { const n = Math.round(+v); return Number.isFinite(n) && n >= 0 && n <= max ? n : def; };

  return {
    async browse(db, b, who, env) {
      const order = ORDER[b.order] ? b.order : 'name', size = opt(b.page_size, 100, 200) || 100, q = String(b.q || '').trim().slice(0, 100);
      const pt = b.page_token ? String(b.page_token) : '';
      if ((b.folder_id && !ID.test(String(b.folder_id))) || pt.length > 1000 || /[^\w\-.~+/=]/.test(pt)) return { status: 400, error: 'bad-input' };
      const { d, at } = await ctx(db, b, env), root = await rootId(db, at, d), sys = await systemIds(db, d);
      const trash = b.trash === true;
      const folder = trash || q ? null : String(b.folder_id || root || '');
      if (!trash && !q && !folder) return { root: null, folder: null, crumbs: [], items: [], next: null };
      let cr = [];
      if (folder) { cr = await crumbs(db, at, d, folder); if (!cr) return { status: 403, error: 'outside-library' }; }
      const cond = trash ? 'trashed = true' : q ? `name contains '${qstr(q)}' and trashed = false` : `'${qstr(folder)}' in parents and trashed = false`;
      const j = await g(at, `${API}?pageSize=${size}&orderBy=${encodeURIComponent(ORDER[order])}&fields=${encodeURIComponent('nextPageToken,files(' + BROWSE_F + ')')}&q=${encodeURIComponent(cond)}${pt ? '&pageToken=' + encodeURIComponent(pt) : ''}`);
      const known = new Set();
      const fl = j.files || [];
      for (let i = 0; i < fl.length; i += 50) { const part = fl.slice(i, i + 50).map(f => f.id); if (part.length) for (const r of await all(db, `SELECT file_id FROM drive_files WHERE drive_id = ? AND status IN ('ok','trashed') AND file_id IN (${part.map(() => '?').join(',')})`, d.id, ...part)) known.add(r.file_id); }
      const cp = h.copiesFor ? await h.copiesFor(db, fl.filter(f => known.has(f.id)).map(f => f.id)) : new Map();
      const items = [];
      for (const f of fl) {
        const c = cp.get(f.id) || {};
        const v = Math.floor(tms(f) / 1000).toString(36);
        items.push({ id: f.id, name: f.name, mime: f.mimeType, kind: kind(f.mimeType), folder: f.mimeType === FOLDER, size: f.size != null ? +f.size : null, modified: f.modifiedTime || null, md5: f.md5Checksum || null, trashed: !!f.trashed, sys: sys.has(f.id), known: known.has(f.id), copies: c.copies ?? null, want: c.want ?? null, asset: c.asset || null,
          web: /^https:\/\/(drive|docs)\.google\.com\//.test(f.webViewLink || '') ? f.webViewLink : null, // webViewLink cần đăng nhập Google – không phải token
          thumb: f.thumbnailLink ? await h.signThumb(env, d.id, f.id, v) : null }); // thumbnailLink KHÔNG trả về – chỉ link proxy ký
      }
      return { root, folder: folder ? { id: folder, path: cr.slice(1).map(c => c.name).join('/') } : null, crumbs: cr, items, next: j.nextPageToken || null, order, trash, q };
    },
    async thumb(db, b, who, env) {
      if (!ID.test(String(b.file_id || ''))) return { status: 400, error: 'bad-input' };
      const { d, at } = await ctx(db, b, env);
      const f = await g(at, `${API}/${encodeURIComponent(b.file_id)}?fields=id,modifiedTime,thumbnailLink`);
      if (!f.thumbnailLink) return { status: 404, error: 'no-thumb' };
      return { url: await h.signThumb(env, d.id, f.id, Math.floor(tms(f) / 1000).toString(36)) };
    },
    async preview(db, b, who, env) {
      const fid = String(b.file_id || ''); if (!ID.test(fid)) return { status: 400, error: 'bad-input' };
      const { d, at } = await ctx(db, b, env);
      const f = await g(at, `${API}/${encodeURIComponent(fid)}?fields=id,name,mimeType,size,trashed`);
      if (f.mimeType === FOLDER || isDoc(f.mimeType)) return { status: 415, error: 'not-a-file' };
      const known = await one(db, "SELECT file_id FROM drive_files WHERE drive_id = ? AND file_id = ? AND status = 'ok'", d.id, fid);
      return { url: await h.signLink(env, fid, Date.now(), known ? null : d.id), ttl: 300, mime: f.mimeType, kind: kind(f.mimeType), name: f.name, size: sz(f) }; // = get_link (+ id Drive khi file chưa có trong drive_files)
    },
    async rename(db, b, who, env) {
      const fid = String(b.file_id || ''), name = cleanName(b.name);
      if (!ID.test(fid) || !name || name === '.' || name === '..') return { status: 400, error: 'bad-input' };
      const { d, at } = await ctx(db, b, env);
      if ((await systemIds(db, d)).has(fid)) return { status: 409, error: 'system-folder' };
      const f = await g(at, `${API}/${encodeURIComponent(fid)}?fields=id,name,mimeType,parents`);
      const p = f.mimeType === FOLDER ? await libPath(db, at, d, fid) : null;
      await g(at, `${API}/${encodeURIComponent(fid)}?fields=id,name`, { method: 'PATCH', body: JSON.stringify({ name }) });
      await run(db, 'UPDATE drive_files SET name = ? WHERE drive_id = ? AND file_id = ?', name, d.id, fid);
      if (p) await repath(db, d.id, p, p.replace(/[^/]+$/, name));
      await log(db, who, 'rename', d, { id: fid, name }, { note: 'từ ' + f.name });
      return { ok: true, id: fid, name };
    },
    async move(db, b, who, env) {
      const list = ids(b), to = String(b.folder_id || ''); if (!list || !ID.test(to)) return { status: 400, error: 'bad-input' };
      const { d, at } = await ctx(db, b, env), sys = await systemIds(db, d);
      const dest = await libPath(db, at, d, to).catch(() => null);
      if (dest == null) return { status: 403, error: 'outside-library' }; // chỉ chuyển giữa các thư mục của kho trên CÙNG Drive
      const root = await rootId(db, at, d), anc = new Set([to]); { let id = to; for (let i = 0; i < 12 && id !== root; i++) { const f = await g(at, `${API}/${encodeURIComponent(id)}?fields=parents`); id = (f.parents || [])[0]; if (!id) break; anc.add(id); } }
      const res = await pool(list, 4, async id => {
        if (sys.has(id)) return { id, error: 'system-folder' };
        if (anc.has(id)) return { id, error: 'into-itself' };
        try {
          const f = await g(at, `${API}/${encodeURIComponent(id)}?fields=id,name,mimeType,parents`);
          const old = f.mimeType === FOLDER ? await libPath(db, at, d, id).catch(() => null) : null;
          const rm = (f.parents || []).filter(p => p !== to).join(',');
          await g(at, `${API}/${encodeURIComponent(id)}?addParents=${encodeURIComponent(to)}${rm ? '&removeParents=' + encodeURIComponent(rm) : ''}&fields=id,parents`, { method: 'PATCH', body: '{}' });
          await run(db, 'UPDATE drive_files SET folder = ? WHERE drive_id = ? AND file_id = ?', dest, d.id, id);
          if (old != null) await repath(db, d.id, old, (dest ? dest + '/' : '') + f.name);
          await log(db, who, 'move', d, { id, name: f.name }, { note: '→ ' + (dest || '/') });
          return { id, ok: true };
        } catch (e) { return { id, error: e.code || 'error' }; }
      });
      return { ok: true, done: res.filter(x => x.ok).map(x => x.id), failed: res.filter(x => !x.ok), folder: dest };
    },
    trash: (db, b, who, env) => setTrash(db, env, b, true, who),
    restore: (db, b, who, env) => setTrash(db, env, b, false, who),
    async delete(db, b, who, env) {
      if (b.confirm !== 'DELETE') return { status: 400, error: 'confirm' };
      const list = ids(b); if (!list) return { status: 400, error: 'bad-input' };
      const { d, at } = await ctx(db, b, env);
      return { ok: true, ...(await hardDelete(db, d, at, list, await systemIds(db, d), who)) };
    },
    async empty_trash(db, b, who, env) {
      if (b.confirm !== 'DELETE') return { status: 400, error: 'confirm' };
      const { d, at } = await ctx(db, b, env);
      const [{ files }, root, sys] = await Promise.all([listAll(at), rootId(db, at, d), systemIds(db, d)]);
      const paths = folderPaths(files, root), dbIds = new Set((await all(db, 'SELECT file_id FROM drive_files WHERE drive_id = ?', d.id)).map(r => r.file_id));
      // KHÔNG dùng files.emptyTrash của Google (xoá cả thùng rác của chủ Drive) – chỉ file của kho Lexkite đã ở thùng rác
      const mine = files.filter(f => f.trashed && !sys.has(f.id) && (pathOf(paths, f) != null || (f.appProperties || {}).lexkite || dbIds.has(f.id)));
      const batch = mine.slice(0, MAX_IDS);
      const r = await hardDelete(db, d, at, batch.map(f => f.id), sys, who, 'empty_trash');
      return { ok: true, ...r, remaining: mine.length - batch.length };
    },
    async storage_report(db, b, who, env) {
      if (await heavy(who)) return { status: 429, error: 'too-fast' };
      const { d, at } = await ctx(db, b, env);
      const [{ files, truncated }, root] = await Promise.all([listAll(at), rootId(db, at, d)]);
      const synced = await reconcile(db, d, files, truncated);
      return { drive_id: d.id, quota_total: d.quota_total, quota_used: d.quota_used, truncated, synced, ...report(files, root) };
    },
    async cleanup_scan(db, b, who, env) {
      if (await heavy(who)) return { status: 429, error: 'too-fast' };
      const { d, at } = await ctx(db, b, env);
      const o = { reject_days: opt(b.reject_days, 30, 3650), reserve_days: opt(b.reserve_days, 90, 3650), temp_days: opt(b.temp_days, 7, 3650), partial_hours: opt(b.partial_hours, 24, 24 * 365) };
      const [{ files, truncated }, root, sys, dbRows, refs] = await Promise.all([listAll(at), rootId(db, at, d), systemIds(db, d), all(db, 'SELECT file_id, sha256, status, size, created FROM drive_files WHERE drive_id = ?', d.id), refsOf(db)]);
      const synced = await reconcile(db, d, files, truncated);
      const out = classify(files, { db: dbRows, refs, root, system: sys, ...o });
      return { dry_run: true, drive_id: d.id, options: o, truncated, synced, ...out }; // CHỈ ĐỌC – không xoá/không vứt gì
    },
    async cleanup_apply(db, b, who, env) {
      const r = await setTrash(db, env, b, true, who, 'cleanup'); // chỉ chuyển vào thùng rác (30 ngày) – Undo = restore {file_ids: undo}
      return r.status ? r : { ...r, undo: r.done };
    },
  };
}

/** Kiểm + phục vụ ảnh thu nhỏ (GET /api/drive/thumb). h = { verifyThumb, setupDb, one, accessToken, limit, gfetch }. */
export async function serveThumb(request, env, h) {
  const u = new URL(request.url), p = Object.fromEntries(['d', 'f', 'v', 'x', 's'].map(k => [k, u.searchParams.get(k) || '']));
  const ip = request.headers.get('CF-Connecting-IP') || '?';
  if (h.limit && await h.limit('drvth:' + ip, 600, 60)) return new Response('too fast', { status: 429 });
  if (!(await h.verifyThumb(env, p))) return new Response('link expired', { status: 403 });
  const key = new Request(`https://thumb.lexkite.internal/${p.d}/${encodeURIComponent(p.f)}/${p.v}`);
  const hdr = ct => ({ 'Content-Type': ct, 'Cache-Control': `private, max-age=${THUMB_TTL}`, 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "default-src 'none'" });
  let cache = null; try { cache = caches.default; } catch (e) { cache = null; }
  if (cache) { const hit = await cache.match(key).catch(() => null); if (hit) return new Response(hit.body, { status: 200, headers: hdr(hit.headers.get('Content-Type') || 'image/jpeg') }); }
  await h.setupDb(env.DB);
  const d = await h.one(env.DB, 'SELECT * FROM drives WHERE id = ?', +p.d);
  if (!d || d.status === 'revoked') return new Response('not found', { status: 404 });
  try {
    const at = await h.accessToken(env, env.DB, d);
    const m = await h.gfetch(`${API}/${encodeURIComponent(p.f)}?fields=thumbnailLink`, { headers: { Authorization: 'Bearer ' + at } });
    const link = m.ok ? ((await m.json().catch(() => ({}))).thumbnailLink || '') : '';
    if (!/^https:\/\/[a-z0-9.-]+\.(googleusercontent|google)\.com\//.test(link)) return new Response('no thumbnail', { status: 404 });
    const r = await h.gfetch(link.replace(/=s\d+$/, '=s320'), { headers: { Authorization: 'Bearer ' + at }, redirect: 'manual' });
    const ct = (r.headers.get('Content-Type') || '').split(';')[0];
    if (r.status !== 200 || !/^image\/(jpeg|png|webp|gif)$/.test(ct)) return new Response('no thumbnail', { status: 502 });
    const buf = await r.arrayBuffer(); if (buf.byteLength > 2 * 1048576) return new Response('too large', { status: 502 });
    if (cache) await cache.put(key, new Response(buf, { headers: { 'Content-Type': ct, 'Cache-Control': 'max-age=86400' } })).catch(() => {});
    return new Response(buf, { status: 200, headers: hdr(ct) }); // chỉ byte ảnh – không header/URL Google nào đi ra
  } catch (e) { return new Response('drive error', { status: e.status || 502 }); }
}
