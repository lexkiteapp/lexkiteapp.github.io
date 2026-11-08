#!/usr/bin/env node
// Phiên bản add-on tự tăng (scripts/ext-version.mjs): 08/11 – 206 commit đụng extension/ mà manifest vẫn 2.6.444 (không ai bump tay) → người dùng cửa hàng không nhận gì.
// Khoá: (1) hàm thuần; (2) manifest danh nghĩa có major.minor đủ lớn so với bản đã đăng (infra/backups/releases.json) → mọi số tự tăng đều > bản đã đăng;
// (3) cws-publish dùng fetch-depth: 0 + EXT_AUTOVERSION=1, build-extension.sh có móc; (4) dựng thử trên bản sao khi có đủ lịch sử git.
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { nextVersion, cmp } from '../ext-version.mjs';
let bad = 0; const ok = (c, m) => { if (!c) { bad++; console.error('✗ ' + m); } };
ok(nextVersion('2.7.0', 5) === '2.7.5' && nextVersion('2.7', 1) === '2.7.1' && nextVersion('3.0.0', 700) === '3.0.700', 'nextVersion: major.minor giữ, số vá = số commit');
ok(nextVersion('2.7.0', 0) === '2.7.1', 'nextVersion: tối thiểu 1 (không bao giờ ra .0 trùng số danh nghĩa)');
let e = ''; try { nextVersion('2.7.0', 70000); } catch (x) { e = x.message; } ok(/65535/.test(e), 'nextVersion: > 65535 → lỗi rõ ràng (không cắt âm thầm)');
e = ''; try { nextVersion('abc', 3); } catch (x) { e = x.message; } ok(/sai định dạng/.test(e), 'nextVersion: manifest sai định dạng → lỗi');
ok(cmp('2.7.1', '2.6.444') > 0 && cmp('2.6.445', '2.6.444') > 0 && cmp('2.6.444', '2.6.444') === 0, 'cmp so đúng từng số');
const mf = JSON.parse(fs.readFileSync('extension/manifest.json', 'utf8')), rel = JSON.parse(fs.readFileSync('infra/backups/releases.json', 'utf8')).kinds['addon-zip'] || [];
const last = rel.map(r => r.version).sort(cmp).pop() || '0.0.0';
ok(cmp(nextVersion(mf.version, 1), last) > 0, `manifest ${mf.version}: bản tự tăng nhỏ nhất ${nextVersion(mf.version, 1)} phải > bản đã đăng ${last} (tăng major/minor trong extension/manifest.json)`);
const wf = fs.readFileSync('.github/workflows/cws-publish.yml', 'utf8'), sh = fs.readFileSync('scripts/build-extension.sh', 'utf8');
ok(/fetch-depth:\s*0/.test(wf) && /EXT_AUTOVERSION:\s*'1'/.test(wf), 'cws-publish: checkout đủ lịch sử + EXT_AUTOVERSION=1');
ok(/EXT_AUTOVERSION[^\n]*==\s*"1"[^\n]*ext-version\.mjs[^\n]*--apply/.test(sh), 'build-extension.sh --zip: móc ext-version --apply khi EXT_AUTOVERSION=1');
// dựng thử trên bản sao manifest (chỉ khi clone đủ lịch sử – npm test trên CI có thể là clone nông)
let shallow = 'true'; try { shallow = execFileSync('git', ['rev-parse', '--is-shallow-repository'], { encoding: 'utf8' }).trim(); } catch { /* không phải git */ }
if (shallow === 'false') { const tmp = (process.env.TMPDIR || '/tmp') + '/ext-version-manifest.json'; fs.writeFileSync(tmp, JSON.stringify(mf));
  execFileSync('node', ['scripts/ext-version.mjs', '--apply', tmp], { stdio: 'pipe' }); const v = JSON.parse(fs.readFileSync(tmp, 'utf8')).version;
  ok(cmp(v, last) > 0 && v.startsWith(mf.version.split('.').slice(0, 2).join('.') + '.'), `dựng thử: ${v} > bản đã đăng ${last}`); fs.rmSync(tmp, { force: true }); }
if (bad) process.exit(1); console.log(`✓ ext-version: manifest ${mf.version} → bản đăng ${mf.version.split('.').slice(0, 2).join('.')}.<commit> (> đã đăng ${last}), cws-publish đủ lịch sử, build móc sẵn`);
