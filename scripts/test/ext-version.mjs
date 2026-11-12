#!/usr/bin/env node
// Phiên bản add-on tự tăng (scripts/ext-version.mjs): 08/11 – 206 commit đụng extension/ mà manifest vẫn 2.6.444 (không ai bump tay) → người dùng cửa hàng không nhận gì.
// Khoá: (1) hàm thuần; (2) manifest danh nghĩa có major.minor đủ lớn so với bản đã đăng (infra/backups/releases.json) → mọi số tự tăng đều > bản đã đăng;
// (3) cws-publish dùng fetch-depth: 0 + EXT_AUTOVERSION=1, build-extension.sh có móc; (4) dựng thử trên bản sao khi có đủ lịch sử git.
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { nextVersion, cmp, publishable, baseOk, countCommits } from '../ext-version.mjs';
let bad = 0; const ok = (c, m) => { if (!c) { bad++; console.error('✗ ' + m); } };
ok(nextVersion('2.7.0', 5) === '2.7.5' && nextVersion('2.7', 1) === '2.7.1' && nextVersion('3.0.0', 700) === '3.0.700', 'nextVersion: major.minor giữ, số vá = số commit');
ok(nextVersion('2.7.0', 0) === '2.7.1', 'nextVersion: tối thiểu 1 (không bao giờ ra .0 trùng số danh nghĩa)');
let e = ''; try { nextVersion('2.7.0', 70000); } catch (x) { e = x.message; } ok(/65535/.test(e), 'nextVersion: > 65535 → lỗi rõ ràng (không cắt âm thầm)');
e = ''; try { nextVersion('abc', 3); } catch (x) { e = x.message; } ok(/sai định dạng/.test(e), 'nextVersion: manifest sai định dạng → lỗi');
ok(cmp('2.7.1', '2.6.444') > 0 && cmp('2.6.445', '2.6.444') > 0 && cmp('2.6.444', '2.6.444') === 0, 'cmp so đúng từng số');
const mf = JSON.parse(fs.readFileSync('extension/manifest.json', 'utf8')), rel = JSON.parse(fs.readFileSync('infra/backups/releases.json', 'utf8')).kinds['addon-zip'] || [];
const last = rel.map(r => r.version).sort(cmp).pop() || '0.0.0';
// ca thật 08/11: đã đăng 2.7.760, manifest 2.7.0 → xanh khi số commit > 760, đỏ khi ≤ 760; không so với số vá tối thiểu (.1)
ok(publishable('2.7.0', '2.7.760', 761) && publishable('2.7.0', '2.7.760', 900), 'đã đăng 2.7.760, manifest 2.7.0, commit > 760 → lần đăng kế 2.7.(N>760) hợp lệ');
ok(!publishable('2.7.0', '2.7.760', 760) && !publishable('2.7.0', '2.7.760', 700), 'đã đăng 2.7.760, commit ≤ 760 → đỏ (lịch sử bị viết lại/clone thiếu)');
ok(publishable('2.7.0', '2.6.444', 1) && !publishable('2.6.0', '2.7.760', 5000), 'major.minor mới hơn bản đăng → luôn hợp lệ; manifest cũ hơn → đỏ dù nhiều commit');
ok(baseOk('2.7.0', '2.7.760') && baseOk('2.8.0', '2.7.760') && !baseOk('2.6.0', '2.7.760'), 'baseOk: major.minor manifest ≥ bản đã đăng');
ok(baseOk(mf.version, last), `manifest ${mf.version}: major.minor không được thấp hơn bản đã đăng ${last}`);
const wf = fs.readFileSync('.github/workflows/cws-publish.yml', 'utf8'), sh = fs.readFileSync('scripts/build-extension.sh', 'utf8');
ok(/fetch-depth:\s*0/.test(wf) && /EXT_AUTOVERSION:\s*'1'/.test(wf), 'cws-publish: checkout đủ lịch sử + EXT_AUTOVERSION=1');
ok(/EXT_AUTOVERSION[^\n]*==\s*"1"[^\n]*ext-version\.mjs[^\n]*--apply/.test(sh), 'build-extension.sh --zip: móc ext-version --apply khi EXT_AUTOVERSION=1');
// dựng thử trên bản sao manifest (chỉ khi clone đủ lịch sử – npm test trên CI có thể là clone nông)
let shallow = 'true'; try { shallow = execFileSync('git', ['rev-parse', '--is-shallow-repository'], { encoding: 'utf8' }).trim(); } catch { /* không phải git */ }
if (shallow === 'false') { const tmp = (process.env.TMPDIR || '/tmp') + '/ext-version-manifest.json'; fs.writeFileSync(tmp, JSON.stringify(mf));
  execFileSync('node', ['scripts/ext-version.mjs', '--apply', tmp], { stdio: 'pipe' }); const v = JSON.parse(fs.readFileSync(tmp, 'utf8')).version;
  ok(cmp(v, last) > 0 && v.startsWith(mf.version.split('.').slice(0, 2).join('.') + '.'), `dựng thử: ${v} > bản đã đăng ${last} (số commit thật ${countCommits()})`); fs.rmSync(tmp, { force: true }); }   // clone nông (npm test trên CI) không biết số commit → bỏ kiểm này, vẫn có baseOk
if (bad) process.exit(1); console.log(`✓ ext-version: manifest ${mf.version} → bản đăng ${mf.version.split('.').slice(0, 2).join('.')}.<commit> (> đã đăng ${last}), cws-publish đủ lịch sử, build móc sẵn`);
