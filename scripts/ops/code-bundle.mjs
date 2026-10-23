// Sao lưu MÃ NGUỒN: git bundle đầy đủ (mọi nhánh + tag) mỗi tuần → Kho Drive 2 bản / 2 Drive, kèm diễn tập "bundle clone được".
//   node scripts/ops/code-bundle.mjs [--src https://github.com/lexkiteapp/lexkiteapp.github.io.git|<đường dẫn git>] [--out out/code-bundle] [--manifest infra/backups/code-bundle.json] [--keep 2] [--force] [--no-upload]
// Quy trình: clone --mirror → bundle create --branches --tags → verify → diễn tập cục bộ (clone từ bundle, so từng ref) → tải 2 bản → tải LẠI bản sao thứ 2 từ Drive, kiểm sha256 + verify (đường khôi phục thật).
// Chỉ tạo bundle của --branches/--tags (không refs/pull/*) để file không phình. Thoát 1 + cảnh báo 'backup' ở Quản trị khi lỗi.
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { arg, loadJson, saveJson, summary, isoWeek, stamp, sha256File, uploadTwoCopies, pruneOld, alert, downloadCopy, QUOTA } from './lib.mjs';

const git = (args, o = {}) => execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 1 << 28, ...o }).trim();
export const refMap = dir => Object.fromEntries(git(['-C', dir, 'for-each-ref', '--format=%(refname) %(objectname)', 'refs/heads', 'refs/tags']).split('\n').filter(Boolean).map(l => l.split(' ')));
export function diffRefs(a, b) { const bad = []; for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) if (a[k] !== b[k]) bad.push(`${k}: ${(a[k] || '-').slice(0, 7)} ≠ ${(b[k] || '-').slice(0, 7)}`); return bad; }
/** Diễn tập: tạo repo trống, lấy mọi ref từ bundle, kiểm kết nối đối tượng + clone thật 1 nhánh. → mảng lỗi. */
export function drill(bundle, expected, work) {
  const bad = [], d = path.join(work, 'drill');
  fs.rmSync(d, { recursive: true, force: true }); git(['init', '-q', '--bare', d]);
  try { git(['-C', d, 'fetch', '-q', path.resolve(bundle), '+refs/heads/*:refs/heads/*', '+refs/tags/*:refs/tags/*']); } catch (e) { return ['fetch từ bundle lỗi: ' + String(e.stderr || e.message).slice(0, 200)]; }
  bad.push(...diffRefs(expected, refMap(d)));
  try { git(['-C', d, 'fsck', '--connectivity-only', '--no-dangling']); } catch (e) { bad.push('fsck: ' + String(e.stderr || e.message).slice(0, 200)); }
  const br = Object.keys(expected).find(k => k === 'refs/heads/main') || Object.keys(expected).find(k => k.startsWith('refs/heads/'));
  if (br) { const c = path.join(work, 'clone'); fs.rmSync(c, { recursive: true, force: true }); try { git(['clone', '-q', '--branch', br.replace('refs/heads/', ''), path.resolve(bundle), c]); if (git(['-C', c, 'rev-parse', 'HEAD']) !== expected[br]) bad.push('clone: HEAD khác ' + br); } catch (e) { bad.push('git clone từ bundle lỗi: ' + String(e.stderr || e.message).slice(0, 200)); } fs.rmSync(c, { recursive: true, force: true }); }
  fs.rmSync(d, { recursive: true, force: true });
  return bad;
}

async function main() {
  const A = process.argv.slice(2), OUT = path.resolve(arg(A, 'out', 'out/code-bundle')), MAN = path.resolve(arg(A, 'manifest', 'infra/backups/code-bundle.json'));
  const SRC = arg(A, 'src', 'https://github.com/lexkiteapp/lexkiteapp.github.io.git'), KEEP = +arg(A, 'keep', 2), week = isoWeek();
  const man = loadJson(MAN, { version: 1, kind: 'code-bundle', repo: 'lexkiteapp/lexkiteapp.github.io', items: [] });
  if (!A.includes('--force') && man.items.some(x => x.week === week)) { summary(`✓ code-bundle: tuần ${week} đã có (${man.items.find(x => x.week === week).name}) – bỏ qua`); return 0; }
  fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(OUT, { recursive: true });
  const mirror = path.join(OUT, 'mirror.git'), name = `lexkite-repo-${stamp()}.bundle`, file = path.join(OUT, name);
  const fail = async m => { await alert('backup_code', false, 'Sao lưu mã nguồn: ' + m); summary('✗ code-bundle: ' + m); return 1; };
  git(['clone', '-q', '--mirror', SRC, mirror], { stdio: ['ignore', 'pipe', 'inherit'] });
  const refs = refMap(mirror), nb = Object.keys(refs).filter(k => k.startsWith('refs/heads/')).length, nt = Object.keys(refs).length - nb;
  if (!refs['refs/heads/main']) return fail('mirror không có nhánh main');
  git(['-C', mirror, 'bundle', 'create', file, '--branches', '--tags']); git(['-C', mirror, 'bundle', 'verify', file]);
  const bad = drill(file, refs, OUT); if (bad.length) return fail('diễn tập clone bundle lỗi – ' + bad.slice(0, 3).join('; '));
  fs.rmSync(mirror, { recursive: true, force: true });
  const sha = sha256File(file), size = fs.statSync(file).size, head = refs['refs/heads/main'];
  summary(`### code-bundle ${name}\n- ${nb} nhánh · ${nt} tag · main ${head.slice(0, 7)} · ${(size / 1e6).toFixed(0)} MB · sha256 ${sha.slice(0, 12)}…\n- ✓ diễn tập cục bộ: bundle verify + fetch mọi ref khớp + fsck + clone main`);
  if (A.includes('--no-upload')) return 0;
  try {
    const copies = await uploadTwoCopies(file, { name, folder: 'backups/code', sha, assetId: 'backup:code:' + week });
    // đường khôi phục thật: tải lại bản sao SAU CÙNG từ Drive, kiểm sha256 + verify
    const back = path.join(OUT, 'from-drive.bundle'), c = copies[copies.length - 1], r = await downloadCopy(c.fileId, back);
    if (r.sha256 !== sha || r.size !== size) return fail(`tải lại bản sao Drive ${c.driveId} sai sha256`);
    git(['bundle', 'verify', back], { cwd: OUT }); fs.rmSync(back, { force: true });
    man.items.unshift({ name, week, at: new Date().toISOString(), sha256: sha, size, main: head, branches: nb, tags: nt, copies, drill: 'ok' });
    const dropped = await pruneOld(man.items, KEEP); man.items = man.items.slice(0, KEEP); man.updated = man.items[0].at; saveJson(MAN, man);
    await alert('backup_code', true, 'ok');
    summary(`✓ code-bundle: ${copies.length} bản / ${new Set(copies.map(x => x.driveId)).size} Drive · tải lại + verify OK · giữ ${man.items.length} (bỏ ${dropped.length})`);
    return 0;
  } catch (e) {
    if (QUOTA.test(String(e.code))) { summary('⏸ code-bundle: cầu dao D1 – chạy lại tuần sau/chạy tay'); return 0; }
    if (e.code === 'pool-low' || e.code === 'few-drives') return fail(e.message + ' – nối thêm Drive hoặc giảm --keep');
    return fail(e.message);
  } finally { fs.rmSync(OUT, { recursive: true, force: true }); }
}
if (process.argv[1] && process.argv[1].endsWith('code-bundle.mjs')) main().then(c => process.exit(c)).catch(async e => { console.error('✗ ' + e.message); await alert('backup_code', false, 'Sao lưu mã nguồn: ' + e.message); process.exit(1); });
