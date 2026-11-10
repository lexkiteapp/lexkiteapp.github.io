// Kiểm ci-triage (scripts/ci/triage.mjs), bỏ qua trung tính khi hạn mức D1 (scripts/ci/quota-skip.mjs), nhận lỗi D1 hết hạn mức (functions/api/_d1limit.js),
// và các lỗi CI thật đã sửa 23/10: youtube-* clone thiếu khoá khi checkout blob, i18n "cannot pull with rebase: unstaged changes".
// Mẫu log lấy từ các lượt đỏ thật 22–23/10.  Chạy: node scripts/test/ci-triage.mjs
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { digestDue, morning, mainRuns, classify, excerpt, digest, issueBody, issueTitle, redStreak, coreHealth, orphanIssueFile, CORE_TESTS, supersededWhy, scriptRefs, importRefs, pickFailures, scanSince } from '../ci/triage.mjs';
import { isQuota, run as quotaRun } from '../ci/quota-skip.mjs';
import { isD1Limit, D1_LIMIT_BODY } from '../../functions/api/_d1limit.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
let fail = 0; const ok = (c, m) => { if (!c) { fail++; console.error('✗ ' + m); } };

// sdkmanager tải hỏng ảnh máy ảo (native-auth android, run 41762808983): hạ tầng → chạy lại 1 lần, không mở issue; chạy lại vẫn đỏ mới là lỗi thật
ok(classify('Warning: An error occurred while preparing SDK package Google APIs: Error on ZipFile unknown archive.').kind === 'transient', 'sdkmanager tải hỏng = tạm thời');
ok(classify('Error on ZipFile unknown archive.', { attempt: 2 }).kind === 'real', 'chạy lại vẫn hỏng = thật');
// --- cổng lõi (4/11: ext-e2e đỏ 8 lượt từ 30/10, new-ui-qa chưa từng có lượt main, bản tin không nói vì chỉ kể lượt đỏ trong 24 h)
{ const Rn = (c, d) => ({ conclusion: c, status: 'completed', event: 'push', created_at: `2026-11-0${d}T00:00:00Z` }), now = +new Date('2026-11-04T00:00:00Z');
  const h = coreHealth({ a: [Rn('success', 3)], ext: [Rn('failure', 1), Rn('failure', 2)], ui: [], old: [Rn('failure', 3)], c: [Rn('cancelled', 3)] }, now);
  ok(h.bad.map(b => b.key).join() === 'ext,old,ui,c', 'cổng lõi: đỏ lâu nhất trước, chưa có lượt sau, xanh không liệt kê: ' + h.bad.map(b => b.key).join());
  ok(h.bad[0].days === 3 && h.bad[0].n === 2, 'cổng lõi: số ngày + số lượt đỏ');
  // không có lượt đỏ nào trong 24 h vẫn phải báo, và vẫn gửi thư (failed > 0)
  const d0 = digest([], {}, [], undefined, h);
  ok(d0.failed === 4 && d0.red === 2 && /ext 3 ngày/.test(d0.msg) && /ext: đỏ 2 lượt liền, 3 ngày/.test(d0.text) && /ui: chưa có lượt/.test(d0.md), 'bản tin nêu cổng lõi đỏ dù 24 h không có lượt');
  ok(digest([], {}, []).failed === 0, 'không truyền core → như cũ');
  ok(/ci\.yml/.test(CORE_TESTS['npm-test']) && fs.existsSync(path.join(ROOT, '.github/workflows', CORE_TESTS['ext-e2e'])), 'CORE_TESTS trỏ file thật (npm-test = ci.yml)');
  for (const [k, f] of Object.entries(CORE_TESTS)) if (k !== 'new-ui-qa') ok(fs.existsSync(path.join(ROOT, '.github/workflows', f)), `CORE_TESTS: ${k} → ${f} tồn tại`);
  ok(orphanIssueFile('<!-- ci-triage:wf=gone.yml -->', () => false) === 'gone.yml' && orphanIssueFile('<!-- ci-triage:wf=a.yml -->', () => true) === null && orphanIssueFile('x', () => false) === null, 'issue của workflow đã xóa'); }

// --- đỏ liên tiếp (3/11: quality-sweep đỏ 6 đêm 27/10–1/11, issue không nói "lặp lại")
const R = (c, d, e = 'schedule') => ({ conclusion: c, status: 'completed', event: e, created_at: `2026-11-0${d}T23:00:00Z` });
ok(redStreak([R('failure', 1), R('failure', 2), R('cancelled', 3), R('failure', 3), R('success', 0), R('failure', 4, 'pull_request')]).n === 3, 'đỏ liên tiếp: bỏ PR/huỷ, dừng ở lượt xanh');
ok(redStreak([R('success', 4), R('failure', 3)]).n === 0, 'lượt mới nhất xanh → 0');
ok(redStreak([R('failure', 2), R('failure', 1)]).since === '2026-11-01T23:00:00Z', 'mốc bắt đầu chuỗi đỏ');
ok(issueTitle('Quality sweep', 6) === 'CI đỏ: Quality sweep (đỏ 6 lượt liền)' && issueTitle('x', 2) === 'CI đỏ: x', 'tiêu đề báo khi ≥ 3 lượt liền');
ok(/Đỏ \*\*6 lượt liên tiếp\*\*.*cần người sửa gốc/.test(issueBody({ name: 'Q', file: 'q.yml', run: { html_url: 'u', head_branch: 'main' }, cls: { kind: 'real', why: 'x' }, log: '', streak: { n: 6, since: '2026-10-27T23:09:11Z' } })), 'thân issue có chuỗi đỏ');
// --- phân loại (log thật)
const LOG = {
  ytm500: "Error: youtube packs → 500 error\n    at ytApi (file:///scripts/video/yt-upload.mjs:19:31)\n  body: { error: 'error' }\n##[error]Process completed with exit code 1.",
  quota: 'Error: Drive list → 429 quota-guard\n##[error]Process completed with exit code 1.',
  drive500: '✗ anchor/bg/x.png: Drive upload_session → 500 error\n✗ dừng: 8 lỗi liên tiếp\n##[error]Process completed with exit code 1.',
  i18n: 'error: cannot pull with rebase: You have unstaged changes.\nerror: Please commit or stash them.\n##[error]Process completed with exit code 1.',
  ytu: 'git@github.com: Permission denied (publickey).\nfatal: Could not read from remote repository.\n##[error]Process completed with exit code 128.',
  probe: 'github models unavailable: URLError: <urlopen error [Errno -2] Name or service not known>\n##[error]Process completed with exit code 1.',
  nv: "ModuleNotFoundError: No module named 'requests'\n##[error]Process completed with exit code 1.",
  avu: '✗ web light mobile: horizontal overflow 28px ← td. w=96\n##[error]Process completed with exit code 1.',
  d1raw: 'Error: D1_ERROR: Exceeded daily rows read limit for this account\n##[error]Process completed with exit code 1.',
};
ok(classify(LOG.ytm500).kind === 'transient', 'youtube 500 = tạm thời');
ok(classify(LOG.drive500).kind === 'transient', 'Drive 500 = tạm thời');
ok(classify(LOG.probe).kind === 'transient', 'DNS = tạm thời');
ok(classify(LOG.quota).kind === 'quota', '429 quota-guard = hạn mức');
ok(classify(LOG.d1raw).kind === 'quota', 'D1 daily limit = hạn mức');
for (const k of ['i18n', 'ytu', 'nv', 'avu']) ok(classify(LOG[k]).kind === 'real', `${k} = lỗi thật`);
ok(classify(LOG.ytm500, { attempt: 2 }).kind === 'real', 'tạm thời nhưng chạy lại vẫn đỏ → lỗi thật (không lặp)');
ok(classify('judge unavailable: HTTP Error 500\nAssertionError: hook length').kind === 'real', 'lỗi thật thắng lỗi tạm thời');
const ex = excerpt('2026-10-23T05:34:30.8Z Error: x ghp_' + 'a'.repeat(36) + ' mail me@x.com\nok line\n```bad');
ok(!/ghp_a/.test(ex) && !/me@x\.com/.test(ex) && !/^2026-/.test(ex), 'trích log: che token/email, bỏ dấu giờ');
ok(issueBody({ name: 'i18n', file: 'i18n.yml', run: { html_url: 'u', run_attempt: 1, event: 'schedule' }, cls: classify(LOG.i18n), log: LOG.i18n }).includes('<!-- ci-triage:wf=i18n.yml -->'), 'issue có dấu workflow');
// Hồi quy 4/11: bản tin chỉ chạy đúng giờ 00 UTC mà lịch GitHub hay rớt giờ đó → cờ ci kẹt 8 ngày; lượt đỏ của PR tính vào "workflow đỏ" → cờ không bao giờ xanh.
{ const at = h => new Date(Date.UTC(2026, 10, 4, h, 30));
  const fired = [0, 1, 2.5, 4, 5.5, 7, 8.5, 10, 11.5, 13, 14.5, 16, 17.5, 19, 20.5, 22, 23.5].filter(h => digestDue(at(Math.floor(h))));
  ok(fired.length >= 4, 'lượt quét 1,5 giờ/lần: bản tin chạy ≥ 4 lần/ngày, không phụ thuộc đúng giờ 00');
  ok(digestDue(at(3), true) && !digestDue(at(3)), 'không tới giờ thì bỏ qua, force vẫn chạy');
  ok(morning(at(2)) && !morning(at(13)) && morning(at(13), true), 'thư + chạy lại hạn mức chỉ buổi sáng UTC');
  const got = mainRuns([{ id: 1, head_branch: 'main', event: 'push' }, { id: 2, head_branch: 'main', event: 'schedule' }, { id: 3, head_branch: 'fix/x', event: 'push' }, { id: 4, head_branch: 'main', event: 'pull_request' }, { id: 5, head_branch: 'main', event: 'push', name: 'ci-triage' }]).map(r => r.id);
  ok(got.join() === '1,2', 'cờ ci chỉ đếm lượt đỏ của main'); }
const d = digest([{ name: 'a' }, { name: 'a' }, { name: 'b' }], { a: 'failure', b: 'success' }, [{ number: 7, title: 'CI đỏ: a', html_url: 'h' }]);
ok(d.red === 1 && d.failed === 2 && /#7/.test(d.text) && /Only notify for failed workflows/.test(d.text), 'bản tin ngày');

// --- check đỏ chung trên nhiều PR (3/11: 5 PR đỏ size-budget, 5 PR đỏ before-after mà không ai báo)
{ const { commonRed } = await import('../ci/pr-common-red.mjs');
  const c = commonRed([{ number: 1, failed: ['npm test', 'bot'] }, { number: 2, failed: ['npm test'] }, { number: 3, failed: ['npm test', 'render (a, short)'] }, { number: 4, failed: ['render (b, wide)', 'render (b, short)'] }, { number: 5, failed: ['render (c, short)'] }, { number: 6, failed: [] }]);
  ok(c.groups.length === 2 && c.groups[0].check === 'npm test' && c.groups[0].prs.join() === '1,2,3', 'check đỏ chung: npm test ở 3 PR');
  ok(c.groups[1].check === 'render' && c.groups[1].prs.join() === '3,4,5', 'job ma trận "render (x, y)" gộp theo tên bước, 1 PR đếm 1 lần');
  ok(!c.groups.some(g => g.check === 'bot') && /#1 #2 #3/.test(c.text), 'đỏ ở < 3 PR không báo; tóm tắt có số PR');
  ok(commonRed([{ number: 1, failed: ['x'] }]).groups.length === 0 && /không có check đỏ chung/.test(commonRed([]).text), 'không có nhóm → báo không có');
  ok(/pr-common-red\.mjs/.test(fs.readFileSync(path.join(ROOT, 'scripts/ci/triage.mjs'), 'utf8')) && /pull-requests: read/.test(fs.readFileSync(path.join(ROOT, '.github/workflows/ci-triage.yml'), 'utf8')), 'sweep gọi pr-common-red + workflow có quyền đọc PR'); }

// --- D1 hết hạn mức → 429 quota-guard (không 500)
ok(isD1Limit(new Error('D1_ERROR: Exceeded daily rows read limit')), 'isD1Limit: hết dòng đọc');
ok(isD1Limit({ message: 'D1 DB: daily write limit exceeded' }), 'isD1Limit: hết dòng ghi');
ok(!isD1Limit(new Error('D1_ERROR: no such table: yt_queue')), 'isD1Limit: lỗi SQL thường ≠ hạn mức');
ok(!isD1Limit(new Error('UNIQUE constraint failed')), 'isD1Limit: ràng buộc ≠ hạn mức');
ok(D1_LIMIT_BODY.error === 'quota-guard' && isQuota(JSON.stringify(D1_LIMIT_BODY)), 'thân 429 dùng mã quota-guard');
for (const f of ['functions/api/youtube.js', 'functions/api/drive.js']) ok(/isD1Limit\(e\)\) return json\(request, 429, D1_LIMIT_BODY\)/.test(fs.readFileSync(path.join(ROOT, f), 'utf8')), `${f}: catch trả 429 khi D1 hết hạn mức`);
ok(!isQuota('YouTube quota 10,000 units/day') && !isQuota('Error: youtube packs → 500 error'), 'isQuota không bắt nhầm');

// --- quota-skip: bỏ qua trung tính
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ci-triage-'));
const sink = { write() {} }, envF = path.join(tmp, 'env'), sumF = path.join(tmp, 'sum');
const base = { ...process.env, GITHUB_ENV: envF, GITHUB_STEP_SUMMARY: sumF, QUOTA_SKIP: '' };
const node = process.execPath;
let rc = await quotaRun([node, '-e', "console.error('Error: Drive list → 429 quota-guard');process.exit(1)"], { env: base, out: sink, err: sink });
ok(rc === 0 && /QUOTA_SKIP=1/.test(fs.readFileSync(envF, 'utf8')) && /Bỏ qua do hạn mức/.test(fs.readFileSync(sumF, 'utf8')), 'quota-guard → thoát 0 + QUOTA_SKIP + tóm tắt');
rc = await quotaRun([node, '-e', "console.error('Error: youtube packs → 500 error');process.exit(3)"], { env: base, out: sink, err: sink });
ok(rc === 3, '500 vẫn đỏ (giữ mã thoát)');
rc = await quotaRun([node, '-e', 'process.exit(0)'], { env: base, out: sink, err: sink }); ok(rc === 0, 'thành công = 0');
const marker = path.join(tmp, 'ran');
rc = await quotaRun([node, '-e', `require('fs').writeFileSync(${JSON.stringify(marker)}, '1')`], { env: { ...base, QUOTA_SKIP: '1' }, out: sink, err: sink });
ok(rc === 0 && !fs.existsSync(marker), 'QUOTA_SKIP=1 → bước sau không chạy');

// --- workflow: ci-triage quét định kỳ, youtube-* bọc quota-skip + khoá SSH cho cả bước
const WF = path.join(ROOT, '.github/workflows'), files = fs.readdirSync(WF).filter(f => /\.ya?ml$/.test(f));
const nameOf = f => ((fs.readFileSync(path.join(WF, f), 'utf8').match(/^name:\s*(.+)$/m) || [])[1] || f).trim().replace(/^['"]|['"]$/g, '');
const tri = fs.readFileSync(path.join(WF, 'ci-triage.yml'), 'utf8');
// 2/11: quét định kỳ phủ MỌI workflow thay cho workflow_run (trước: ~3.400 lượt/ngày, 93 % bị bỏ qua; lượt đỏ giữ runner ngủ 5 phút)
ok(!/^\s*workflow_run:/m.test(tri) && /cron: '\*\/10 \* \* \* \*'/.test(tri) && /triage\.mjs scan/.test(tri), 'ci-triage: quét 10 phút (scan), không workflow_run – phủ cả workflow mới');
ok(/sweep[\s\S]*github\.event\.schedule == '12 \* \* \* \*'/.test(tri), 'ci-triage: sweep (đóng issue + bản tin 00 UTC) chỉ ở cron giờ, không lặp 6 lần/giờ');
ok(!/setTimeout\(r, d \* 1000\)/.test(fs.readFileSync(path.join(ROOT, 'scripts/ci/triage.mjs'), 'utf8')), 'triage: không ngủ giữ runner chờ chạy lại');
{ const R = (id, o) => ({ id, name: 'QA bot', event: 'schedule', conclusion: 'failure', created_at: '2026-11-02T06:00:00Z', updated_at: '2026-11-02T06:30:00Z', ...o });
  const got = pickFailures([R(1), R(2, { event: 'pull_request' }), R(3, { name: 'ci-triage' }), R(4, { conclusion: 'success' }), R(5, { updated_at: '2026-11-02T05:00:00Z' }), R(6, { updated_at: '2026-11-02T06:10:00Z' })], '2026-11-02T06:05:00Z').map(r => r.id);
  ok(got.join() === '6,1', `pickFailures: chỉ lượt đỏ không-PR, không phải ci-triage, kết thúc từ mốc, cũ → mới (được ${got})`);
  const now = Date.parse('2026-11-02T07:00:00Z');
  ok(scanSince('2026-11-02T06:50:00Z', now, 300) === '2026-11-02T06:42:00.000Z', 'scanSince: lượt trước − (trễ + 3 phút) chồng lấn');
  ok(scanSince(null, now, 300) === '2026-11-02T04:00:00.000Z' && scanSince('2026-10-30T00:00:00Z', now, 300) === '2026-11-02T04:00:00.000Z', 'scanSince: không có/quá cũ → 3 giờ'); }
ok(/run_attempt|rerun-failed-jobs/.test(fs.readFileSync(path.join(ROOT, 'scripts/ci/triage.mjs'), 'utf8')) && /attempt > 1/.test(fs.readFileSync(path.join(ROOT, 'scripts/ci/triage.mjs'), 'utf8')), 'triage: chỉ chạy lại khi attempt = 1');
for (const f of files) {
  const s = fs.readFileSync(path.join(WF, f), 'utf8');
  // clone --filter=blob:none tải blob lúc checkout → GIT_SSH_COMMAND chỉ gắn vào lệnh clone = "Permission denied (publickey)"
  ok(!/^\s*GIT_SSH_COMMAND="[^"]+" git clone [^\n]*--filter=blob:none[^\n]*\n[^\n]*checkout/m.test(s), `${f}: GIT_SSH_COMMAND chỉ cho clone mà checkout blob sau đó`);
}
for (const f of ['youtube-manual.yml', 'youtube-upload.yml', 'drive-shorts.yml']) {
  const s = fs.readFileSync(path.join(WF, f), 'utf8');
  ok(!/^\s*(run: )?node scripts\/video\//m.test(s), `${f}: lệnh gọi API lexkite.com phải bọc scripts/ci/quota-skip.mjs`);
}

// --- i18n: bước "Lưu kết quả" đẩy được khi gen-i18n sửa web/js/i18n/<lang>/<nhóm>.js (lỗi 22–23/10)
const y = fs.readFileSync(path.join(WF, 'i18n.yml'), 'utf8');
const blk = y.split('\n'), at = blk.findIndex(l => /name: Lưu kết quả vào repo/.test(l));
const ri = blk.findIndex((l, i) => i > at && /^\s+run: \|/.test(l)), ind = blk[ri + 1].match(/^\s*/)[0].length;
const script = []; for (let i = ri + 1; i < blk.length && (blk[i].trim() === '' || blk[i].match(/^\s*/)[0].length >= ind); i++) script.push(blk[i].slice(ind));
const git = (cwd, ...a) => execFileSync('git', a, { cwd, stdio: 'pipe' }).toString();
const origin = path.join(tmp, 'origin.git'), work = path.join(tmp, 'work'), other = path.join(tmp, 'other');
git(tmp, 'init', '-q', '--bare', '-b', 'main', origin);
git(tmp, 'clone', '-q', origin, work);
for (const [p, c] of [['web/js/i18n/vi.js', 'core 1\n'], ['web/js/i18n/vi/tools.js', 'tools 1\n'], ['web/app/index.html', 'x\n'], ['README', 'r\n']]) { fs.mkdirSync(path.dirname(path.join(work, p)), { recursive: true }); fs.writeFileSync(path.join(work, p), c); }
// đường dẫn bước lưu = tham số sau thông điệp của push-main.sh (helper đẩy main dùng chung) – mọi đường dẫn tồn tại như trên runner thật
const addLine = (script.find(l => /^bash scripts\/ci\/push-main\.sh "/.test(l)) || '').replace(/^bash \S+ "[^"]*"/, '');
ok(addLine.trim(), 'i18n: bước lưu đẩy qua scripts/ci/push-main.sh');
for (const t of addLine.trim().split(/\s+/)) { const p = t.replace(/\*/g, 'xx'), f = path.join(work, /\.[a-z]+$/.test(p) ? p : p + '/keep.txt'); if (!fs.existsSync(f)) { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, 'seed\n'); } }
// build-extension.sh giả (bản thật cần rsync/perl + cả web/): chép web/js/i18n → extension/app/js/i18n như bản thật
fs.mkdirSync(path.join(work, 'scripts/ci'), { recursive: true }); fs.copyFileSync(path.join(ROOT, 'scripts/ci/push-main.sh'), path.join(work, 'scripts/ci/push-main.sh')); fs.writeFileSync(path.join(work, 'scripts/build-extension.sh'), 'mkdir -p extension/app/js && rm -rf extension/app/js/i18n && cp -R web/js/i18n extension/app/js/i18n\n');
git(work, 'add', '-A'); git(work, '-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-qm', 'init'); git(work, 'push', '-q', 'origin', 'HEAD:main');
git(tmp, 'clone', '-q', origin, other); fs.writeFileSync(path.join(other, 'README'), 'r2\n'); git(other, '-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-qam', 'race'); git(other, 'push', '-q', 'origin', 'HEAD:main'); // lượt đẩy khác chen vào
fs.writeFileSync(path.join(work, 'web/js/i18n/vi.js'), 'core 2\n'); fs.writeFileSync(path.join(work, 'web/js/i18n/vi/tools.js'), 'tools 2\n'); fs.writeFileSync(path.join(work, 'web/app/index.html'), 'junk\n');
fs.writeFileSync(path.join(work, 'web/app/index.html'), 'x\n'); fs.writeFileSync(path.join(work, 'stray.txt'), 'junk\n');
git(work, 'config', 'user.name', 't'); git(work, 'config', 'user.email', 't@t');
const sh = spawnSync('bash', ['-e', '-c', script.join('\n')], { cwd: work, encoding: 'utf8', env: { ...process.env, PUSH_MAIN_SLEEP: '0' } });
ok(sh.status === 0, `i18n: bước lưu phải đẩy được (rc ${sh.status}) ${sh.stderr.slice(-300)}`);
const pushed = (p) => execFileSync('git', ['--git-dir', origin, 'show', 'main:' + p]).toString();
ok(sh.status === 0 && pushed('web/js/i18n/vi/tools.js') === 'tools 2\n' && pushed('web/js/i18n/vi.js') === 'core 2\n' && pushed('README') === 'r2\n', 'i18n: nhóm tải lười được commit + giữ lượt đẩy khác');
ok(sh.status === 0 && pushed('extension/app/js/i18n/vi/tools.js') === 'tools 2\n', 'i18n: bản dịch mới được chép sang add-on trong cùng commit (ext-sync)');
try { fs.rmSync(tmp, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); } catch { /* dọn dẹp tạm: bỏ qua */ }

// --- không chạy lại lượt đã bị thay thế (25/10: 2 lượt word-audio cũ bị "Re-run" với code cũ)
{
  const run = { id: 1, created_at: '2026-10-25T13:00:00Z', path: '.github/workflows/word-audio.yml' };
  ok(/mới hơn/.test(supersededWhy(run, { newer: [{ id: 2, run_number: 9, created_at: '2026-10-25T13:30:00Z' }] })), 'có lượt mới hơn → thay thế');
  ok(supersededWhy(run, { newer: [{ id: 1, created_at: run.created_at }, { id: 0, created_at: '2026-10-25T12:00:00Z' }] }) === '', 'chỉ lượt cũ hơn → không thay thế');
  const refs = scriptRefs('run: node scripts/gen-word-audio.mjs && python3 scripts/word-audio-asr.py');
  refs.push(...importRefs('scripts/gen-word-audio.mjs', "import { STRONG } from './word-audio-strong.mjs'; const k = await import('./word-audio/kokoro.mjs');"));
  ok(refs.includes('scripts/word-audio/kokoro.mjs') && refs.includes('scripts/word-audio-strong.mjs'), 'theo import trực tiếp của script');
  ok(/đã đổi/.test(supersededWhy(run, { changed: ['scripts/word-audio-strong.mjs'], refs })), 'module được import đã đổi → thay thế');
  ok(/đã đổi/.test(supersededWhy(run, { changed: ['.github/workflows/word-audio.yml'], refs })), 'file workflow đã đổi → thay thế');
  ok(supersededWhy(run, { changed: ['web/blog/x.html', 'scripts/other.mjs'], refs }) === '', 'đổi file không liên quan → vẫn được chạy lại');
}
if (fail) { console.error(`✗ ci-triage: ${fail} lỗi`); process.exit(1); }
console.log('✓ ci-triage: phân loại, bỏ qua hạn mức D1, issue/bản tin, sửa youtube-*/i18n – tất cả đạt');
