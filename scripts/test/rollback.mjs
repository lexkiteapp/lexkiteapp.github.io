// Test sao lưu & khôi phục nhanh (docs/ROLLBACK.md): mã hoá/giải mã trang D1, diễn tập khôi phục, chọn bản rollback Pages, smoke, retention, tài liệu + workflow.
// Chạy: node scripts/test/rollback.mjs (không mạng; D1 giả bằng node:sqlite)
import fs from 'fs';
import os from 'os';
import path from 'path';
import { execFileSync } from 'child_process';
import { DatabaseSync } from 'node:sqlite';
let fails = 0, n = 0; const ok = (c, m) => { n++; if (!c) { fails++; console.log('✗', m); } };

const B = await import(new URL('../../functions/api/_backup.js', import.meta.url));
const KEY = Buffer.alloc(32, 9).toString('base64'), env = { DRIVE_ENC_KEY: KEY };
const sql = new DatabaseSync(':memory:');
sql.exec("CREATE TABLE users (uid TEXT PRIMARY KEY, email TEXT, created INTEGER NOT NULL) WITHOUT ROWID; CREATE TABLE docs (uid TEXT NOT NULL, k TEXT NOT NULL, h TEXT NOT NULL, body TEXT NOT NULL, updated INTEGER NOT NULL, PRIMARY KEY (uid, k)) WITHOUT ROWID; CREATE TABLE config (k TEXT PRIMARY KEY, v BLOB, at INTEGER) WITHOUT ROWID;");
for (let i = 0; i < 7; i++) sql.prepare('INSERT INTO users VALUES (?,?,?)').run('u' + i, i % 2 ? null : `ng'ười${i}@x.vn`, 1000 + i);
for (let i = 0; i < 7; i++) for (const k of ['a', 'b']) sql.prepare('INSERT INTO docs VALUES (?,?,?,?,?)').run('u' + i, k, 'h', `Tiếng Việt ${i}${k} "q" 'q'\n`, i);
sql.prepare('INSERT INTO config VALUES (?,?,?)').run('bin', new Uint8Array([0, 1, 255]), 5);
const db = { prepare: q => ({ args: [], bind(...a) { return { ...this, args: a }; }, async all() { return { results: sql.prepare(q).all(...this.args).map(r => ({ ...r })) }; }, async first() { const r = sql.prepare(q).get(...this.args); return r ? { ...r } : null; } }) };

// 1) xuất phân trang + giải mã
let after = null, pages = [], rows = 0;
for (let g = 0; g < 50; g++) { const r = await B.exportPage(env, db, 'docs', after, 5); pages.push(r); rows += r.n; after = r.last; if (r.done) break; }
ok(rows === 14 && pages.length === 3 && pages.at(-1).done, 'docs: 14 dòng / 3 trang (keyset theo (uid,k))');
ok(!JSON.stringify(pages).includes('Tiếng') && !('rows' in pages[0]), 'trang xuất KHÔNG chứa dữ liệu rõ');
const p0 = await B.open(env, 'docs', pages[0]);
ok(p0.rows.length === 5 && p0.cols.join() === 'uid,k,h,body,updated' && /CREATE TABLE docs/.test(p0.ddl), 'giải mã trang 1 đúng cột + DDL ở trang đầu');
ok((await B.open(env, 'docs', pages[1])).ddl === null, 'DDL chỉ ở trang đầu');
let threw = 0; try { await B.open(env, 'users', pages[0]); } catch { threw++; } try { await B.open({ DRIVE_ENC_KEY: Buffer.alloc(32, 1).toString('base64') }, 'docs', pages[0]); } catch { threw++; } try { await B.open(env, 'docs', { ...pages[0], ct: pages[0].ct.slice(0, -8) + 'AAAAAAAA' }); } catch { threw++; }
ok(threw === 3, 'sai bảng (AAD) / sai khoá / sửa bản mã → từ chối');
ok((await B.exportPage(env, db, 'nope', null, 5)).status === 400 && (await B.exportPage(env, db, 'drives', null, 5)).status === 400, 'bảng ngoài danh sách (kể cả drive*) → 400');
const miss = await B.exportPage(env, db, 'league_member', null, 5); ok(miss.ok && miss.done && miss.missing && miss.n === 0, 'bảng chưa tồn tại → bỏ qua (done, missing)');
let nk = ''; try { await B.exportPage({}, db, 'users', null, 5); } catch (e) { nk = e.code; } ok(nk === 'no-key', 'thiếu DRIVE_ENC_KEY → no-key');
ok(Object.keys(B.TABLES).every(t => !/^drive|^sessions|^pageviews/.test(t)) && B.TABLES.docs.join() === 'uid,k', 'danh sách bảng: không drive*/thống kê');

// 1b) trang quá lớn tự chia nhỏ (giới hạn thân yêu cầu backup_open)
{ const big = new DatabaseSync(':memory:'); big.exec('CREATE TABLE docs (uid TEXT NOT NULL, k TEXT NOT NULL, h TEXT NOT NULL, body TEXT NOT NULL, updated INTEGER NOT NULL, PRIMARY KEY (uid, k)) WITHOUT ROWID');
  for (let i = 0; i < 8; i++) big.prepare('INSERT INTO docs VALUES (?,?,?,?,?)').run('u' + i, 'k', 'h', Array.from({ length: 30000 }, () => Math.random().toString(36).slice(2)).join(''), i);
  const bdb = { prepare: q => ({ args: [], bind(...a) { return { ...this, args: a }; }, async all() { return { results: big.prepare(q).all(...this.args).map(r => ({ ...r })) }; }, async first() { const r = big.prepare(q).get(...this.args); return r ? { ...r } : null; } }) };
  let a2 = null, np = 0, nr = 0, maxct = 0; for (;;) { const r = await B.exportPage(env, bdb, 'docs', a2, 60); np++; nr += r.n; maxct = Math.max(maxct, r.ct.length); a2 = r.last; if (r.done || np > 40) break; }
  ok(nr === 8 && np > 1 && maxct <= 400000, `trang lớn tự chia nhỏ: ${np} trang, ct tối đa ${maxct}`); }
// 2) diễn tập khôi phục end-to-end (file .bak → giải mã ngoại tuyến → nạp SQLite → đối chiếu số dòng) + SQL cho wrangler
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'rb-')), file = path.join(tmp, 'x.bak.ndjson'), counts = {}, lines = [JSON.stringify({ 'lexkite-backup': 1, db: 'lexkite-sync' })];
for (const t of ['users', 'docs', 'config']) { let a = null; counts[t] = 0; for (;;) { const r = await B.exportPage(env, db, t, a, 4); lines.push(JSON.stringify({ t, n: r.n, iv: r.iv, ct: r.ct })); counts[t] += r.n; a = r.last; if (r.done) break; } }
lines.push(JSON.stringify({ end: true, tables: ['users', 'docs', 'config'], counts, rows: 28 })); fs.writeFileSync(file, lines.join('\n') + '\n');
const R = path.resolve('scripts/ops/d1-restore.mjs'), run = (a, e = {}) => { try { return { code: 0, out: execFileSync('node', [R, ...a], { encoding: 'utf8', env: { ...process.env, DRIVE_ENC_KEY: KEY, GITHUB_STEP_SUMMARY: '', ...e }, stdio: ['ignore', 'pipe', 'pipe'] }) }; } catch (e2) { return { code: e2.status, out: String(e2.stdout) + String(e2.stderr) }; } };
const d = run(['--file', file, '--drill', '--sql', path.join(tmp, 'r.sql')]);
ok(d.code === 0 && /diễn tập khôi phục[^\n]*21 dòng|diễn tập khôi phục[^\n]*dòng/.test(d.out), 'diễn tập khôi phục: ' + d.out.trim().slice(0, 160));
const S = fs.readFileSync(path.join(tmp, 'r.sql'), 'utf8');
ok(/CREATE TABLE IF NOT EXISTS users/.test(S) && /INSERT OR REPLACE INTO docs \(uid, k, h, body, updated\) VALUES \('u0', 'a', 'h', 'Tiếng Việt 0a "q" ''q''\n'/.test(S) && /X'0001ff'/.test(S) && /ng''ười0@x\.vn/.test(S), 'SQL khôi phục: DDL + INSERT OR REPLACE, thoát nháy, BLOB hex, Unicode');
const sql2 = new DatabaseSync(':memory:'); sql2.exec(S); ok(sql2.prepare('SELECT COUNT(*) n FROM docs').get().n === 14 && sql2.prepare("SELECT body FROM docs WHERE uid='u3' AND k='b'").get().body === 'Tiếng Việt 3b "q" \'q\'\n', 'chạy SQL vào SQLite mới: đủ 14 dòng, nội dung nguyên vẹn');
const bad = run(['--file', file, '--drill'], { DRIVE_ENC_KEY: Buffer.alloc(32, 2).toString('base64') }); ok(bad.code !== 0, 'sai khoá → diễn tập thất bại');
fs.writeFileSync(file + '2', lines.slice(0, -1).join('\n') + '\n'); ok(run(['--file', file + '2', '--drill']).code === 1, 'bản cụt (thiếu dòng kết thúc) → thất bại');

// 3) chọn bản rollback Pages
const P = await import(new URL('../ops/pages-rollback.mjs', import.meta.url)), mk = (id, sha, st = 'success', env2 = 'production') => ({ id, short_id: id.slice(0, 8), environment: env2, created_on: '2026-10-2' + id.length + 'T00:00:00Z', latest_stage: { name: 'deploy', status: st }, deployment_trigger: { metadata: { commit_hash: sha, commit_message: 'm ' + id } } });
const deps = [mk('d-new-0000', 'aaaaaaa1111'), mk('d-fail-000', 'bbbbbbb2222', 'failure'), mk('d-prev-000', 'ccccccc3333'), mk('d-old-0000', 'ddddddd4444'), mk('d-prev-pre', 'eeeeeee5555', 'success', 'preview')];
ok(P.pick(deps, undefined).target.id === 'd-prev-000' && P.pick(deps, 'previous').cur.id === 'd-new-0000', 'previous = bản thành công ngay trước (bỏ bản lỗi + preview)');
ok(P.pick(deps, 'ddddddd', () => null).target.id === 'd-old-0000', 'theo sha7');
ok(P.pick(deps, 'prod-20261023-1200-ddddddd', t => (t === 'prod-20261023-1200-ddddddd' ? 'ddddddd4444ffff' : null)).target.id === 'd-old-0000', 'theo tag prod-…');
ok(P.pick(deps, 'good', t => (t === 'prod-good' ? 'ccccccc3333' : null)).target.id === 'd-prev-000', 'good = tag prod-good');
ok(P.pick(deps, 'd-old-0000').target.id === 'd-old-0000' && P.pick(deps, 'd-fail-000').error && P.pick(deps, 'aaaaaaa').error && P.pick(deps, 'prod-nope', () => null).error && P.pick([], 'previous').error, 'theo id; từ chối bản lỗi / bản đang chạy / tag lạ / rỗng');

// 4) smoke
const S0 = await import(new URL('../ops/smoke.mjs', import.meta.url));
const resp = (st, body) => ({ ok: st < 400, status: st, text: async () => body, json: async () => JSON.parse(body) });
const good = async (u, o = {}) => { const p = new URL(u).pathname; if (p === '/api/sync') return resp(401, '{}'); if (p === '/api/config') return resp(200, '{}'); if (p === '/packs/ja.json') return resp(200, JSON.stringify(Object.fromEntries(Array.from({ length: 7100 }, (_, i) => ['k' + i, 1])))); if (p.startsWith('/api/')) return resp(400, '{}'); const must = Object.fromEntries(S0.PAGES); return resp(200, (must[p] || '') + ' lexkite-123'); };
const g1 = await S0.runSmoke('https://x.test', { getter: good }); ok(g1.bad.length === 0 && g1.ok.length === S0.PAGES.length + S0.APIS.length, 'smoke: bản tốt đạt hết ' + g1.bad.slice(0, 2));
const g2 = await S0.runSmoke('https://x.test', { getter: async (u, o) => (new URL(u).pathname === '/app/' ? resp(500, '') : new URL(u).pathname === '/api/sync' ? resp(200, '{}') : good(u, o)) }); ok(g2.bad.length === 2 && /\/app\//.test(g2.bad[0]) && /\/api\/sync/.test(g2.bad[1]), 'smoke: bắt 5xx trang + /api/sync nhận token giả');

// 5) retention (giữ N mới nhất, không retire sha còn dùng)
const L = await import(new URL('../ops/lib.mjs', import.meta.url));
const items = [{ sha256: 'a' }, { sha256: 'b' }, { sha256: 'b' }, { sha256: 'c' }]; const dropped = await L.pruneOld(items, 2, false); ok(dropped.length === 2 && dropped[1].sha256 === 'c', 'pruneOld giữ 2 mới nhất');
ok(L.isoWeek(new Date('2026-10-26T00:15:00Z')) === '2026-W44' && L.isoWeek(new Date('2026-01-01T00:00:00Z')) === '2026-W01', 'isoWeek');

// 6) server: op CLI + quyền retire + loại cảnh báo
const src = fs.readFileSync('functions/api/drive.js', 'utf8');
ok(/const CLI_OPS = new Set\([^)]*'backup_export'[^)]*'backup_open'/.test(src) && /async backup_export/.test(src) && /async backup_open/.test(src), 'drive.js: backup_export/backup_open là op CLI');
const D = await import(new URL('../../functions/api/drive.js', import.meta.url));
ok(D.isBackupRow({ cls: 'original', folder: 'backups/d1' }) && D.isBackupRow({ cls: 'original', folder: 'releases/ios-ipa' }) && !D.isBackupRow({ cls: 'original', folder: 'footage/cafe' }) && !D.isBackupRow({ cls: 'render', folder: 'backups/d1' }), 'retire chỉ chạm backups/·releases/ (không footage)');
ok(['deploy', 'backup_d1', 'backup_code', 'backup_rel'].every(k => D.EXT_KINDS.has(k)), 'EXT_KINDS có deploy + backup_*');

// 7) tài liệu + workflow + script
const doc = fs.readFileSync('docs/ROLLBACK.md', 'utf8'), rd = fs.readFileSync('docs/README.md', 'utf8');
for (const k of ['rollback-pages.sh', 'git revert', 'time-travel restore lexkite-sync', 'lexkite-internal', 'd1-restore.mjs', 'prod-good', 'Vì sao không tự rollback', 'Play', 'App Store', 'Chrome Web Store', 'git bundle', 'DRIVE_ENC_KEY']) ok(doc.includes(k), 'ROLLBACK.md có: ' + k);
ok(/Sổ tay khôi phục/.test(rd) && /ROLLBACK\.md/.test(rd), 'docs/README.md có mục "Sổ tay khôi phục" trỏ ROLLBACK.md');
const wf = f => fs.readFileSync('.github/workflows/' + f, 'utf8'), pr = wf('prod-release.yml');
ok(/prod-\$\(date -u \+%Y%m%d-%H%M\)-\$\{SHA::7\}/.test(pr) && /npm test/.test(pr) && /smoke\.mjs --wait/.test(pr) && /prod-good/.test(pr), 'prod-release.yml: tag prod-YYYYMMDD-HHMM-sha7 + npm test + smoke + prod-good');
ok(!/rollback-pages\.sh[^\n]*\n[^\n]*(run:|POST)/.test(pr) && !/pages-rollback/.test(pr), 'prod-release.yml KHÔNG tự rollback');
ok(fs.statSync('scripts/ops/rollback-pages.sh').mode & 0o111, 'rollback-pages.sh chạy được (+x)');
try { execFileSync('bash', ['-n', 'scripts/ops/rollback-pages.sh']); ok(true); } catch { ok(false, 'bash -n rollback-pages.sh'); }
const reg = JSON.parse(fs.readFileSync('infra/jobs.json', 'utf8')); ok(['d1-backup', 'code-bundle', 'release-archive'].every(id => reg.jobs.some(j => j.id === id && j.lease)), 'jobs.json có d1-backup, code-bundle, release-archive (lease)');
const back = wf('d1-backup.yml'); ok(/cron: '15 0 \* \* 1,2'/.test(back) && /d1-restore\.mjs --latest --api --drill/.test(back) && /actions\/cache\/save/.test(back), 'd1-backup.yml: 00:15 UTC sau mốc đặt lại, có diễn tập + cache tiếp tục');
fs.rmSync(tmp, { recursive: true, force: true });
console.log(fails ? `✗ rollback: ${fails}/${n} lỗi` : `✓ rollback: ${n} kiểm tra đạt`); process.exit(fails ? 1 : 0);
