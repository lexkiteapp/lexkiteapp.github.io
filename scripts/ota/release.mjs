#!/usr/bin/env node
// OTA CI (docs/OTA.md). Cần: gh + GH_TOKEN (GITHUB_TOKEN của workflow), zip; secret OTA_SIGNING_KEY (khóa riêng, PEM hoặc PEM base64).
//   node scripts/ota/release.mjs publish [--sha <sha>] [--dry]   – zip mobile/www → ký → Release ota-<version> (bundle.zip + manifest.json) → trỏ ota-manifest/latest.json
//   node scripts/ota/release.mjs rollback [<version>]            – trỏ latest.json về manifest ĐÃ KÝ sẵn của bản <version> (mặc định: bản ngay trước bản hiện hành)
//   node scripts/ota/release.mjs list                            – các bản đang có + bản đang được phát
// Chữ ký nằm trong manifest từng bản → rollback không cần khóa riêng. Chỉ giữ 10 bản gần nhất (không xóa bản đang phát).
import fs from 'node:fs'; import path from 'node:path'; import os from 'node:os'; import crypto from 'node:crypto'; import { execFileSync } from 'node:child_process';
import { sign, decodeKey, releaseUrl } from './lib.mjs';
const REPO = process.env.OTA_REPO || 'lexkiteapp/lexkiteapp.github.io', KEEP = 10, POINTER = 'ota-manifest';
const sh = (c, a, o = {}) => execFileSync(c, a, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'], ...o });
const gh = (...a) => sh('gh', [...a, '--repo', REPO]);

export function makeManifest({ zip, version, minNative = '0', privatePem }) {
  const m = { version, url: releaseUrl(version, REPO), sha256: crypto.createHash('sha256').update(fs.readFileSync(zip)).digest('hex'), minNative };
  return { ...m, signature: sign(m, privatePem) };
}
const releases = () => JSON.parse(gh('release', 'list', '--limit', '100', '--json', 'tagName,createdAt')).filter(r => /^ota-(?!manifest$)/.test(r.tagName)).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map(r => r.tagName.slice(4));
const current = () => { try { return JSON.parse(sh('curl', ['-fsSL', `https://github.com/${REPO}/releases/download/${POINTER}/latest.json`])).version; } catch (e) { return ''; } };
function point(manifestFile) {
  try { gh('release', 'view', POINTER); } catch (e) { gh('release', 'create', POINTER, '--title', 'OTA manifest (bản web đang phát)', '--notes', 'latest.json = bản OTA đang phát; ghi bởi scripts/ota/release.mjs. docs/OTA.md', '--prerelease'); }
  const tmp = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'ota-')), 'latest.json'); fs.copyFileSync(manifestFile, tmp);
  gh('release', 'upload', POINTER, tmp, '--clobber');
}
function prune() {
  const live = current(), old = releases().slice(KEEP).filter(v => v !== live);
  for (const v of old) try { gh('release', 'delete', `ota-${v}`, '--yes', '--cleanup-tag'); } catch (e) { /* bỏ qua */ }
}
const [cmd, arg] = process.argv.slice(2).filter(a => !a.startsWith('--'));
if (import.meta.url === `file://${process.argv[1]}`) {
  if (cmd === 'publish') {
    const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..'), www = path.join(root, 'mobile/www');
    if (!fs.existsSync(path.join(www, 'index.html'))) { console.error('✗ thiếu mobile/www/index.html – chạy OTA_ONLY=1 ./scripts/build-mobile.sh trước'); process.exit(1); }
    const i = process.argv.indexOf('--sha'), sha = (i > 0 ? process.argv[i + 1] : sh('git', ['rev-parse', 'HEAD']).trim()).slice(0, 7);
    const pkg = JSON.parse(fs.readFileSync(path.join(root, 'mobile/package.json'), 'utf8')), d = new Date().toISOString().replace(/\D/g, '').slice(0, 12);
    const version = `${pkg.version}-ota.${d}.${sha}`, minNative = (pkg.ota && pkg.ota.minNative) || '0';
    const key = process.env.OTA_SIGNING_KEY; if (!key) { console.error('✗ thiếu secret OTA_SIGNING_KEY (chủ: node scripts/ota/keygen.mjs, docs/OTA.md)'); process.exit(1); }
    const out = fs.mkdtempSync(path.join(os.tmpdir(), 'ota-')), zip = path.join(out, 'bundle.zip');
    sh('zip', ['-qr9X', zip, '.'], { cwd: www });
    const m = makeManifest({ zip, version, minNative, privatePem: decodeKey(key) }), mf = path.join(out, 'manifest.json');
    fs.writeFileSync(mf, JSON.stringify(m, null, 1));
    console.log(`bundle ${version}: ${(fs.statSync(zip).size / 1048576).toFixed(1)} MB, sha256 ${m.sha256.slice(0, 12)}…, minNative ${minNative}`);
    if (process.argv.includes('--dry')) process.exit(0);
    gh('release', 'create', `ota-${version}`, zip, mf, '--title', `OTA ${version}`, '--notes', `Bản web OTA ${version} (commit ${sha}). docs/OTA.md`, '--prerelease');
    point(mf); prune(); console.log(`✓ đang phát ${version}`);
  } else if (cmd === 'rollback') {
    const all = releases(), cur = current(), target = arg || all[all.indexOf(cur) + 1];
    if (!target || !all.includes(target)) { console.error(`✗ không có bản đích (${target || 'trống'}). Các bản: ${all.join(', ')}`); process.exit(1); }
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ota-')); gh('release', 'download', `ota-${target}`, '-p', 'manifest.json', '-D', dir);
    point(path.join(dir, 'manifest.json')); console.log(`✓ rollback ${cur || '?'} → ${target} (máy đã nhận bản lỗi tự tải lại bản này ở lần kiểm kế tiếp, ≤ vài phút + chu kỳ 6 giờ)`);
  } else if (cmd === 'list') { console.log(`đang phát: ${current() || '(chưa có)'}\n` + releases().join('\n')); }
  else { console.error('dùng: publish | rollback [version] | list'); process.exit(2); }
}
