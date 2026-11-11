// Test MỘT nguồn phân loại Kho Drive (functions/api/_drive_state.js) + op inventory/cleanup_apply/tidy_run (Google giả, D1 giả node:sqlite).
// Ca bắt buộc: video đã đăng / đang lên lịch / đang tham chiếu / bản gốc footage KHÔNG BAO GIỜ bị dọn – kể cả khi trình duyệt gửi id giả. Chạy: node scripts/test/drive-state.mjs
import { DatabaseSync } from 'node:sqlite';
import { makeFileOps } from '../../functions/api/_drive_files.js';
import { buildSignals, fileStates, cleanTidy, clipHeld, autoPlan, tidyTripped } from '../../functions/api/_drive_state.js';
let fails = 0, n = 0; const ok = (c, m) => { n++; if (!c) { fails++; console.log('✗', m); } };
const NOW = Date.now(), DAY = 864e5, ago = d => new Date(NOW - d * DAY).toISOString(), sha = c => c.repeat(64), FOLDER = 'application/vnd.google-apps.folder';
const sql = new DatabaseSync(':memory:');
for (const q of ["CREATE TABLE drives (id INTEGER PRIMARY KEY, email TEXT, status TEXT, quota_used INTEGER, quota_total INTEGER)", "CREATE TABLE drive_files (id INTEGER PRIMARY KEY, drive_id INT, file_id TEXT, sha256 TEXT, name TEXT, folder TEXT, mime TEXT, size INT, status TEXT, created INT, cls TEXT)", "CREATE TABLE drive_folders (drive_id INT, path TEXT, folder_id TEXT)", "CREATE TABLE drive_refs (src TEXT, sha TEXT, file_id TEXT, name TEXT, status TEXT, at INT)", "CREATE TABLE drive_meta (k TEXT PRIMARY KEY, v TEXT)", "CREATE TABLE drive_alerts (kind TEXT PRIMARY KEY, level TEXT, drive_id INT, msg TEXT, since INT, seen INT, mailed INT)", "CREATE TABLE yt_queue (clip TEXT PRIMARY KEY, status TEXT, publish_at TEXT, video_id TEXT, updated INT)", "CREATE TABLE dist_social (clip TEXT, channel_id TEXT, platform TEXT, slot_ms INT, state TEXT, updated INT)", "CREATE TABLE soc_board (id TEXT, clip TEXT, state TEXT, want_at INT, links TEXT, updated INT)", "CREATE TABLE clip_review (clip TEXT PRIMARY KEY, state TEXT, slot_date TEXT, deleted INT)"]) sql.exec(q);
let breakMain = false;
const DB = { prepare(q) { const st = { args: [], bind(...a) { return { ...st, args: a }; }, async run() { sql.prepare(q).run(...this.args); return { meta: {} }; }, async all() { if (breakMain && /yt_queue/.test(q)) throw new Error('D1 down'); return { results: sql.prepare(q).all(...this.args) }; }, async first() { return sql.prepare(q).get(...this.args) || null; } }; return st; }, async batch(a) { for (const s of a) await s.run(); return []; } };
const one = (db, q, ...a) => db.prepare(q).bind(...a).first(), all = async (db, q, ...a) => (await db.prepare(q).bind(...a).all()).results, run = (db, q, ...a) => db.prepare(q).bind(...a).run();
class DriveErr extends Error { constructor(c, s = 502) { super(c); this.code = c; this.status = s; } }
const files = new Map(), patches = [], audit = []; let seq = 0;
const add = (name, parents, o = {}) => { const id = (o.id || 'file' + (++seq)).padEnd(12, 'x'); files.set(id, { id, name, parents: [parents], mimeType: o.mime || 'video/mp4', size: String(o.size ?? 1000), modifiedTime: o.mod || ago(200), createdTime: o.mod || ago(200), trashed: false, appProperties: o.sha ? { sha256: o.sha } : {}, md5Checksum: o.md5 }); return files.get(id); };
const dir = (name, parent) => { const id = ('dir' + (++seq)).padEnd(12, 'x'); files.set(id, { id, name, parents: parent ? [parent] : ['driveroot'], mimeType: FOLDER, trashed: false }); return id; };
const gfetch = async (url, init = {}) => {
  url = String(url); const J = o => new Response(JSON.stringify(o), { status: 200, headers: { 'Content-Type': 'application/json' } });
  if (init.method === 'PATCH') { const id = decodeURIComponent(url.split('/files/')[1].split('?')[0]), f = files.get(id); patches.push(id); if (!f) return new Response('', { status: 404 }); Object.assign(f, JSON.parse(init.body)); return J({ id, trashed: f.trashed }); }
  if (/\/files\?/.test(url)) return J({ files: [...files.values()] });
  const id = decodeURIComponent(url.split('/files/')[1].split('?')[0]); return files.has(id) ? J(files.get(id)) : new Response('', { status: 404 });
};
let MANI = { source: 'drive', items: [] };
const ops = makeFileOps({ warnPct: 0.8, manifest: async () => MANI, accessToken: async () => 'tok', gfetch, DriveErr, one, all, run, signLink: async () => 'x', signThumb: async () => 'x', limit: async () => 0, audit: async (db, e) => { audit.push(e); }, copiesFor: async () => new Map() });
const env = { DB }, who = { email: 'boss@lexkite.com' }, cli = { email: 'cli' };
const root = dir('Lexkite Library'), shorts = dir('shorts', root), scene = dir('scene', shorts), pack = dir('_ytpack', shorts), foot = dir('footage', root), bak = dir('backups', root), tmp = dir('tmp', root), misc = dir('misc', root), origs = dir('originals', root);
sql.prepare('INSERT INTO drives VALUES (1, ?, ?, ?, ?)').run('a@x.com', 'ok', 8e9, 10e9);
sql.prepare("INSERT INTO drive_folders VALUES (1, 'Lexkite Library', ?)").run(root);
const row = (f, folder, cls = 'render', s = null) => sql.prepare("INSERT INTO drive_files (drive_id, file_id, sha256, name, folder, mime, size, status, created, cls) VALUES (1,?,?,?,?,?,?, 'ok', 0, ?)").run(f.id, s || f.appProperties.sha256 || sha('0'), f.name, folder, f.mimeType, +f.size, cls);
const item = (id, f, o = {}) => ({ id, lesson: 'L' + id, title: id, qa: { status: 'pass' }, drive: { video: { fileId: f.id, sha256: f.appProperties.sha256, driveId: 1 } }, ...o });
// --- kho mẫu
const pub = add('pub.mp4', scene, { sha: sha('1'), size: 9e8 }), pubCopy = add('pub (1).mp4', scene, { sha: sha('1'), size: 9e8, mod: ago(300), md5: 'same' }); pub.md5Checksum = 'same'; row(pub, 'shorts/scene/x'); row(pubCopy, 'shorts/scene/x');
const sched = add('sched.mp4', scene, { sha: sha('2') }), queued = add('queued.mp4', scene, { sha: sha('3') }), draftV = add('draft.mp4', scene, { sha: sha('4') }), rej = add('rej.mp4', scene, { sha: sha('5'), size: 5000 }), rejNew = add('rej-new.mp4', scene, { sha: sha('6'), mod: ago(3) }), low = add('low.mp4', scene, { sha: sha('7') });
[sched, queued, draftV, rej, rejNew, low].forEach(f => row(f, 'shorts/scene/x'));
const packDone = add('pub.zip', pack, { mime: 'application/zip', sha: sha('8') }); row(packDone, 'shorts/_ytpack');
const footV = add('foot.mp4', foot, { sha: sha('9'), size: 7e8 }); row(footV, 'footage', 'original');
const backup = add('d1.enc', bak, { mime: 'application/octet-stream', sha: sha('a') }); row(backup, 'backups/d1', 'original');
const refd = add('ama.png', origs, { mime: 'image/png', sha: sha('b') }); row(refd, 'originals', 'original'); sql.prepare("INSERT INTO drive_refs VALUES ('library', ?, ?, NULL, 'approved', 0)").run(refd.appProperties.sha256, refd.id);
const temp = add('x.tmp', tmp, { size: 2000 }), zero = add('zero.mp4', misc, { size: 0 }), old = add('lost.webm', misc, { size: 3000 }), fresh = add('new.webm', misc, { size: 4000, mod: ago(5) });
MANI.items = [item('c-pub', pub), item('c-sched', sched), item('c-queued', queued), item('c-draft', draftV), item('c-rej', rej, { rejected: true }), item('c-rejnew', rejNew, { rejected: true }), item('c-low', low, { qa: { status: 'fail' } })];
sql.prepare("INSERT INTO yt_queue VALUES ('c-pub', 'done', NULL, 'YT123', ?)").run(NOW - DAY);
sql.prepare("INSERT INTO dist_social VALUES ('c-pub', 'gc-instagram-1', 'instagram', ?, 'published', ?)").run(NOW - DAY, NOW - DAY);
sql.prepare("INSERT INTO soc_board VALUES ('b1', 'c-pub', 'published', NULL, ?, ?)").run(JSON.stringify([{ p: 'instagram', u: 'https://instagram.com/p/abc' }]), NOW - DAY);
sql.prepare("INSERT INTO dist_social VALUES ('c-sched', 'gc-tiktok-1', 'tiktok', ?, 'planned', 0)").run(NOW + 40 * DAY);
sql.prepare("INSERT INTO yt_queue VALUES ('c-queued', 'social', NULL, NULL, 0)").run();
sql.prepare("INSERT INTO yt_queue VALUES ('pub', 'done', NULL, 'YTZIP', 0)").run();

let inv = await ops.inventory(DB, { drive_id: 1 }, who, env);
const of = f => inv.items.find(x => x.id === f.id) || {};
ok(of(pub).state === 'published' && of(pub).lock === 'published' && !of(pub).clean, 'master đã đăng: Đã đăng + khoá');
ok(of(pub).posts.some(p => p.p === 'youtube' && p.u === 'https://youtu.be/YT123') && of(pub).posts.some(p => p.p === 'instagram' && p.u === 'https://instagram.com/p/abc' && p.t), 'có nền tảng + link bài + ngày');
ok(of(pubCopy).clean === 'intermediate' && !of(pubCopy).lock, 'bản trùng của video đã đăng = bản trung gian, được đề xuất');
ok(of(packDone).clean === 'intermediate', 'gói đăng tay của clip đã đăng = bản trung gian');
ok(of(sched).state === 'draft' && of(sched).lock === 'scheduled' && of(sched).scheduled > NOW, 'đang lên lịch: chờ đăng + khoá + ngày lịch');
ok(of(queued).state === 'draft' && of(queued).lock === 'queued', 'trong hàng chờ: khoá');
ok(of(draftV).state === 'draft' && of(draftV).lock === 'clip' && !of(draftV).scheduled, 'nháp chưa lên lịch: giữ (từ 04/11 không tự xoá clip chưa duyệt)');
ok(of(rej).state === 'junk' && of(rej).clean === 'junk', 'clip bị loại > 30 ngày = Rác');
ok(of(rejNew).state === 'junk' && of(rejNew).lock === 'waiting' && !of(rejNew).clean, 'clip bị loại mới: chờ đủ 30 ngày');
ok(of(low).state === 'junk' && of(low).reason === 'qc-low', 'QC trượt = Rác');
ok(of(footV).lock === 'footage' && of(backup).lock === 'system' && of(refd).lock === 'referenced', 'footage / sao lưu / đang tham chiếu: khoá');
ok(of(temp).clean === 'junk' && of(zero).clean === 'junk', 'file tạm + hỏng = Rác');
ok(of(old).state === 'stale' && of(old).clean === 'stale', 'mồ côi quá N ngày = Lâu không dùng');
ok(of(fresh).state === 'active' && !of(fresh).clean, 'mồ côi còn mới: chưa vào nhóm dọn');
ok(inv.summary.published.files >= 3 && inv.summary.junk.bytes > 0 && inv.scheduled === 1 && inv.signals_ok, 'số lượng + dung lượng mỗi nhóm');
ok(inv.plan.junk.files === Object.values(inv.items).filter(x => x.clean === 'junk').length, 'kế hoạch dọn khớp danh sách');
ok(!('seen' in inv), 'không lộ dữ liệu thô Google');
// cleanup_scan cùng luật
{ const s = await ops.cleanup_scan(DB, { drive_id: 1 }, who, env), all_ = Object.values(s.groups).flat().map(x => x.id); ok(![pub, sched, queued, footV, refd].some(f => all_.includes(f.id)), 'cleanup_scan không còn đề xuất file bị khoá'); }
// CA BẮT BUỘC: trình duyệt gửi id giả
patches.length = 0;
{ const forged = [pub, sched, queued, footV, backup, refd, draftV].map(f => f.id), r = await ops.cleanup_apply(DB, { drive_id: 1, file_ids: [...forged, 'unknownfile12'] }, who, env);
  ok(r.done.length === 0 && r.blocked.length === 8 && patches.length === 0, 'cleanup_apply: id giả của file đã đăng/lên lịch/tham chiếu/footage bị chặn, 0 lượt PATCH');
  ok(r.blocked.find(x => x.id === pub.id).error === 'locked:published' && r.blocked.find(x => x.id === 'unknownfile12').error === 'not-scanned', 'lý do chặn rõ ràng'); }
{ const r = await ops.cleanup_apply(DB, { drive_id: 1, file_ids: [temp.id, pub.id] }, who, env); ok(r.done.length === 1 && r.done[0] === temp.id && r.undo[0] === temp.id && temp.trashed && !pub.trashed && r.blocked.length === 1, 'danh sách lẫn: chỉ file được dọn vào thùng rác, có undo');
  const u = await ops.restore(DB, { drive_id: 1, file_ids: r.undo }, who, env); ok(u.done.length === 1 && !temp.trashed, 'Undo = restore'); }
// tự dọn
{ let r = await ops.tidy_run(DB, {}, cli, env); ok(r.due.includes(1), 'Drive 80 % → tới hạn tự dọn');
  sql.exec("UPDATE drives SET quota_used = 1000000"); sql.prepare("INSERT OR REPLACE INTO drive_meta VALUES ('tidy_last:1', ?)").run(JSON.stringify({ at: NOW })); r = await ops.tidy_run(DB, {}, cli, env); ok(!r.due.includes(1), 'dưới ngưỡng + chưa tới lịch → không chạy');
  sql.prepare("INSERT OR REPLACE INTO drive_meta VALUES ('tidy_last:1', ?)").run(JSON.stringify({ at: NOW - 8 * DAY })); r = await ops.tidy_run(DB, {}, cli, env); ok(r.due.includes(1), 'tới lịch 7 ngày → chạy'); sql.exec("DELETE FROM drive_meta WHERE k = 'tidy_last:1'");
  patches.length = 0; audit.length = 0; breakMain = true; r = await ops.tidy_run(DB, { drive_id: 1 }, cli, env); breakMain = false;
  ok(r.stopped === 'signals' && patches.length === 0, 'thiếu tín hiệu đăng bài → tự dọn dừng, không chạm file');
  ok(JSON.parse(sql.prepare("SELECT msg FROM drive_alerts WHERE kind = 'tidy'").get().msg).t === 'tidy_stop', 'dừng → cảnh báo admin');
  sql.exec("DELETE FROM drive_meta WHERE k = 'tidy_last:1'");
  r = await ops.tidy_run(DB, { drive_id: 1 }, cli, env);
  const locked = [pub, sched, queued, footV, backup, refd, draftV, rejNew, pubCopy, packDone, old];
  ok(r.ok && r.trashed > 0 && !locked.some(f => f.trashed), 'tự dọn: chỉ Rác; đã đăng/lịch/footage/bản trung gian/Lâu không dùng còn nguyên');
  ok(temp.trashed && rej.trashed && zero.trashed && !files.has('x'), 'tự dọn: Rác vào thùng rác, không xoá vĩnh viễn');
  ok(audit.every(a => a.act === 'auto_tidy' && a.who === 'auto-tidy') && audit.length === r.trashed, 'mỗi file có nhật ký auto_tidy');
  const a = JSON.parse(sql.prepare("SELECT msg FROM drive_alerts WHERE kind = 'tidy'").get().msg); ok(a.t === 'tidy' && a.p.n === r.trashed, 'cảnh báo admin có số file');
  const last = JSON.parse(sql.prepare("SELECT v FROM drive_meta WHERE k = 'tidy_last:1'").get().v); ok(last.undo.length === r.trashed, 'nhớ danh sách để Hoàn tác');
  { const u = await ops.restore(DB, { drive_id: 1, file_ids: last.undo }, who, env); ok(u.done.length === last.undo.length && !temp.trashed, 'Hoàn tác lần tự dọn'); }
  sql.prepare("INSERT OR REPLACE INTO drive_meta VALUES ('tidy_cfg', ?)").run(JSON.stringify({ on: true, stale_on: true, stale_days: 90, every_days: 7 }));
  r = await ops.tidy_run(DB, { drive_id: 1 }, cli, env); ok(old.trashed && !fresh.trashed, 'bật công tắc → Lâu không dùng mới tự dọn, file mới vẫn giữ');
  await ops.tidy_cfg(DB, { set: { on: false } }, who, env); r = await ops.tidy_run(DB, {}, cli, env); ok(r.off && !r.due.length, 'tắt công tắc → không chạy'); await ops.tidy_cfg(DB, { set: { on: true } }, who, env); }
// thuần
{ ok(cleanTidy({ stale_days: 5, every_days: 999 }).stale_days === 30 && cleanTidy({ every_days: 999 }).every_days === 90 && !cleanTidy().stale_on && cleanTidy().on, 'cấu hình: kẹp giá trị, Lâu không dùng mặc định tắt');
  ok(clipHeld({ rejected: true }) && clipHeld({ drive: { video: { retired: '2026-01-01' } } }) && clipHeld({}, { deleted: 1 }) && clipHeld({}, { state: 'paused' }) && !clipHeld({}, {}), 'clipHeld (autopilot social dùng chung)');
  const big = Array.from({ length: 30 }, (_, i) => ({ id: 'i' + i, size: 100, clean: 'junk' })); ok(tidyTripped(big, big) && !tidyTripped(big.slice(0, 5), big) && !tidyTripped(big.slice(0, 21), [...big, { size: 1e6 }]), 'cầu dao > 25 % và > 20 file');
  ok(autoPlan([{ clean: 'intermediate', size: 9 }, { clean: 'stale', size: 5 }, { clean: 'junk', size: 1, lock: 'waiting' }, { clean: 'junk', size: 2 }], { stale_on: false }).length === 1, 'tự dọn không bao giờ lấy bản trung gian / file khoá');
  const scan = { groups: {}, seen: [{ f: { id: 'S1', name: 'c1.mp4', size: '5', mimeType: 'video/mp4', modifiedTime: ago(400) }, path: 'shorts/a/b', sha: null, row: null }] }, st = fileStates(scan, buildSignals({ ok: false }), {}); ok(st.items[0].lock === 'signals' && !st.items[0].clean, 'thiếu tín hiệu: mọi file shorts bị khoá'); }
if (fails) { console.log(`✗ drive-state: ${fails}/${n} kiểm thất bại`); process.exit(1); }
console.log(`✓ drive-state: ${n} kiểm (đã đăng/lên lịch/tham chiếu/footage không bao giờ bị dọn, dry-run, Undo, tự dọn, cầu dao)`);
