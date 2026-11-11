// Máy gác main-red-sweep (hàm thuần) + hồi quy workflow đỏ 06/11. Thoát 1 nếu sai.
import assert from 'node:assert/strict'; import fs from 'node:fs';
import { autoTriggers, latestAuto, redList, issueBody, blindHead } from '../ci/main-red-sweep.mjs';
let n = 0; const ok = (c, m) => { assert.ok(c, m); n++; };
ok(autoTriggers('name: x\non:\n  schedule:\n    - cron: "1 * * * *"\n  workflow_dispatch:\n').join() === 'schedule', 'schedule');
ok(autoTriggers('on:\n  push:\n    branches: [main]\n').join() === 'push', 'push');
ok(autoTriggers('on:\n  workflow_dispatch:\n  pull_request:\n').length === 0, 'chỉ tay/PR → không canh');
ok(autoTriggers('on: { push: {}, workflow_dispatch: {} }\n').join() === 'push', 'dạng flow');
const R = (conclusion, event = 'schedule', extra = {}) => ({ id: 1, status: 'completed', conclusion, event, created_at: '2026-11-05T00:00:00Z', html_url: 'u', ...extra });
ok(latestAuto([R('failure'), R('success')]).red === true, 'mới nhất đỏ');
ok(latestAuto([R('success'), R('failure')]).red === false, 'xanh lại → không đỏ');
ok(latestAuto([R('cancelled'), R('failure')]).red === true, 'bỏ lượt huỷ, xét lượt trước');
ok(latestAuto([R('failure', 'workflow_dispatch'), R('success')]).red === false, 'lượt tay đỏ không tính');
ok(latestAuto([R('failure', 'pull_request')]) === null, 'PR không tính');
ok(latestAuto([]) === null && latestAuto(undefined) === null, 'chưa có lượt');
const wf = (file, yml, state = 'active') => ({ file, name: file, state, yml });
const S = 'on:\n  schedule:\n    - cron: "1 * * * *"\n';
const red = redList([wf('a.yml', S), wf('b.yml', S), wf('c.yml', S, 'disabled_manually'), wf('d.yml', 'on:\n  workflow_dispatch:\n')], f => (f === 'a.yml' ? [R('failure')] : [R('success')]));
ok(red.length === 1 && red[0].file === 'a.yml', 'chỉ a đỏ; tắt/chỉ-tay bị bỏ');
ok(issueBody(red).includes('<!-- main-red-sweep -->') && issueBody(red).includes('a.yml'), 'thân issue có marker + tên');
// ---- mù main: Prod release bị huỷ/bỏ đói thì npm test sau-push không đánh giá commit đầu main
{ const now = Date.parse('2026-11-07T16:00:00Z'), at = m => new Date(now - m * 60000).toISOString();
  const C = [{ sha: 'bot', date: at(2), message: 'sổ [skip ci]' }, { sha: 'h1', date: at(40), message: 'PR gộp' }, { sha: 'h0', date: at(300), message: 'cũ' }];
  const run = (o) => ({ status: 'completed', conclusion: 'success', head_sha: 'x', created_at: at(500), ...o });
  ok(blindHead(C, [run({ conclusion: 'cancelled', head_sha: 'h1', created_at: at(35) }), run({ created_at: at(290), head_sha: 'h0' })], now).sha === 'h1', 'lượt của h1 bị huỷ, lượt xong cũ hơn h1 → mù, gọi tay h1');
  ok(blindHead(C, [run({ head_sha: 'h1', created_at: at(30) })], now) === null, 'đã có lượt xong (không huỷ) đánh giá h1');
  ok(blindHead(C, [run({ head_sha: 'h1', created_at: at(35), status: 'queued', conclusion: null })], now) === null, 'đang xếp hàng < 60 phút → chờ');
  ok(blindHead([{ ...C[1], date: at(100) }, C[2]], [run({ head_sha: 'h1', created_at: at(90), status: 'queued', conclusion: null })], now).ageMin === 100, 'xếp hàng quá 60 phút = bị bỏ đói → mù');
  ok(blindHead([{ ...C[1], date: at(10) }], [], now) === null, 'commit mới < 25 phút → chưa tính');
  ok(blindHead([C[0]], [], now) === null && blindHead([], [], now) === null, 'chỉ commit [skip ci] / không commit → không mù');
  ok(blindHead(C, [run({ head_sha: 'later', created_at: at(20) })], now) === null, 'có lượt xong tạo SAU commit đầu → đã đánh giá'); }
// ---- hồi quy sửa đỏ 06/11 (mỗi dòng FAIL trên mã cũ)
const rd = f => fs.readFileSync(f, 'utf8');
const ds = rd('.github/workflows/drive-shorts.yml');
ok(/Ghi vị trí Drive[^\n]*\n\s+if: \$\{\{ always\(\) && steps\.lease\.outputs\.skip != '1' \}\}/.test(ds), 'drive-shorts: bước ghi vị trí tôn trọng lease skip (không có /tmp/shorts khi bỏ qua)');
const ex = rd('scripts/test/exit-sweep.mjs');
ok(/const goLearn = /.test(ex) && (ex.match(/await goLearn\(page, hash\)/g) || []).length === 2, 'exit-sweep: chờ ExitGuard + nút thoát (đỏ giả trên lexkite.com live)');
ok(/vi-lint\.mjs --fix/.test(rd('.github/workflows/content-factory.yml')) && /--fix/.test(rd('scripts/vi-lint.mjs')), 'content-factory: tự chuẩn hóa chính tả Việt AI sinh trước npm test');
const lc = rd('scripts/test/live-check.mjs');
ok(/deployLagMin/.test(lc) && /SW_GRACE_MIN/.test(lc) && /GITHUB_TOKEN/.test(rd('.github/workflows/health.yml')), 'health: sw.js lệch live trong khung gom deploy 180′ chỉ cảnh báo');
ok(/on:[\s\S]*push:\s*\n\s+branches: \[main, stitch-quality\]/.test(rd('.github/workflows/stitch-quality-qc.yml')), 'stitch-quality-qc canh main');
ok(/console\.error\(`✗ \$\{x\.f\.rel\}: \$\{String\(e\.code/.test(rd('scripts/footage/archive.mjs')), 'footage-archive: lỗi tải không còn im lặng');
ok(/build-extension\.sh\s*\n\s+- name: npm test/.test(rd('.github/workflows/content-factory.yml')) && /git add -A content web extension/.test(rd('scripts/factory/open-pr.sh')), 'content-factory: dựng lại extension/app trước npm test và đưa vào PR bot (ext-sync đỏ ở collect)');
// vi-lint --fix chạy THẬT trong thư mục tạm: "constructor"/"toString" (khóa Object.prototype) không được bị thay bằng mã nguồn hàm (06/11: engine.js hỏng ở Xưởng nội dung); "hoá" → "hóa"
{ const { execFileSync } = await import('node:child_process'), os = await import('node:os'), path = await import('node:path'); const abs = path.resolve('scripts/vi-lint.mjs'), d = fs.mkdtempSync(path.join(os.tmpdir(), 'vilint-'));
  fs.mkdirSync(d + '/web/js', { recursive: true }); fs.copyFileSync('web/js/dictionary.js', d + '/web/js/dictionary.js');
  fs.writeFileSync(d + '/web/js/x.js', "class A { constructor(a) {} toString() {} valueOf() {} }\n// hoá đơn, khoẻ\n");
  try { execFileSync('node', [abs, '--fix'], { cwd: d, stdio: 'pipe' }); } catch (e) { /* còn lỗi khác thì thôi – chỉ kiểm nội dung */ }
  const out = fs.readFileSync(d + '/web/js/x.js', 'utf8');
  ok(out.includes('constructor(a)') && out.includes('toString()') && !out.includes('native code'), 'vi-lint --fix không phá constructor/toString'); ok(out.includes('hóa đơn') && out.includes('khỏe'), 'vi-lint --fix sửa hoá→hóa, khoẻ→khỏe'); }
console.log(`main-red-sweep: ${n} kiểm tra PASS`);
