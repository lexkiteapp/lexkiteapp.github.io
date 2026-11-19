// Hồi quy 4/11: file ~1 GB kẹt "1 bản sao" vì Worker không chép nổi (copy-mismatch). CI phải chép bù, và không tải lên bản sai sha256.
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
const { largePlan, ciRepair, LARGE } = await import('../ops/drive-repair.mjs');
let fails = 0; const ok = (c, m) => { if (c) return; fails++; console.error('✗ ' + m); };
const G = 1024 ** 3, big = (sha, x = {}) => ({ sha, name: sha + '.bundle', size: G, copies: 1, want: 2, to: 9, asset: 'a', ...x });
ok(largePlan([{ ...big('s'), size: LARGE }, big('nodrive', { to: null }), big('full', { copies: 2 }), big('a')]).map(g => g.sha).join() === 'a', 'chỉ file lớn, còn Drive nhận, còn thiếu bản');
ok(largePlan([big('a'), big('b'), big('c'), big('d')]).length === 3, 'tối đa 3 file/lượt');
ok(largePlan([big('a', { size: 3 * G }), big('b', { size: 3 * G })]).length === 1, 'tối đa 4 GB/lượt');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dr-'));
const mk = (shaOf, plan) => { const ups = []; return { ups, deps: { dir, api: async (op, b) => (op === 'repair' ? (ok(b.dry_run, 'kế hoạch dùng dry_run'), { plan }) : { copies: [{ sha256: b.q, file_id: 'F' + b.q, folder: 'backups/code', mime: 'application/x', cls: 'original', asset_id: 'z' }] }), download: async (id, f) => { fs.writeFileSync(f, 'x'); return { sha256: shaOf(id), size: G }; }, upload: async (f, o) => { ok(fs.existsSync(f), 'tải lên từ file đã kiểm'); ups.push(o); } } }; };
{ const t = mk(id => id.slice(1), [big('a')]), r = await ciRepair(t.deps);
  ok(r.done === 1 && r.failed === 0 && t.ups[0].folder === 'backups/code' && t.ups[0].replicas === 2 && t.ups[0].sha === 'a' && t.ups[0].cls === 'original', 'giữ thư mục, loại file, số bản, sha');
  ok(!fs.existsSync(path.join(dir, 'a')), 'xoá bản tạm sau khi xong'); }
{ const t = mk(() => 'sai', [big('b')]), r = await ciRepair(t.deps); ok(r.failed === 1 && !t.ups.length, 'sai sha256 thì không tải lên'); }
ok(/g\.size > \+b\.max_file/.test(fs.readFileSync('functions/api/drive.js', 'utf8')), 'máy chủ bỏ qua file lớn khi có max_file');
if (fails) { console.error(fails + ' lỗi'); process.exit(1); } console.log('✓ drive-repair: chép bù file lớn qua CI, kiểm sha256'); process.exit(0);
