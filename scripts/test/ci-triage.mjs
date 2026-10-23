// Kiểm ci-triage (scripts/ci/triage.mjs), bỏ qua trung tính khi hạn mức D1 (scripts/ci/quota-skip.mjs), nhận lỗi D1 hết hạn mức (functions/api/_d1limit.js),
// và các lỗi CI thật đã sửa 23/10: youtube-* clone thiếu khoá khi checkout blob, i18n "cannot pull with rebase: unstaged changes".
// Mẫu log lấy từ các lượt đỏ thật 22–23/10.  Chạy: node scripts/test/ci-triage.mjs
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { classify, excerpt, digest, issueBody } from '../ci/triage.mjs';
import { isQuota, run as quotaRun } from '../ci/quota-skip.mjs';
import { isD1Limit, D1_LIMIT_BODY } from '../../functions/api/_d1limit.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
let fail = 0; const ok = (c, m) => { if (!c) { fail++; console.error('✗ ' + m); } };

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
const d = digest([{ name: 'a' }, { name: 'a' }, { name: 'b' }], { a: 'failure', b: 'success' }, [{ number: 7, title: 'CI đỏ: a', html_url: 'h' }]);
ok(d.red === 1 && d.failed === 2 && /#7/.test(d.text) && /Only notify for failed workflows/.test(d.text), 'bản tin ngày');

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

// --- workflow: danh sách ci-triage khớp, youtube-* bọc quota-skip + khoá SSH cho cả bước
const WF = path.join(ROOT, '.github/workflows'), files = fs.readdirSync(WF).filter(f => /\.ya?ml$/.test(f));
const nameOf = f => ((fs.readFileSync(path.join(WF, f), 'utf8').match(/^name:\s*(.+)$/m) || [])[1] || f).trim().replace(/^['"]|['"]$/g, '');
const tri = fs.readFileSync(path.join(WF, 'ci-triage.yml'), 'utf8');
for (const f of files) if (f !== 'ci-triage.yml') ok(tri.includes(`- '${nameOf(f)}'`), `ci-triage.yml thiếu workflow "${nameOf(f)}" (${f})`);
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
ok(/continue-on-error: true/.test(fs.readFileSync(path.join(WF, 'gh-models-probe.yml'), 'utf8')) && /on: \{ workflow_dispatch/.test(fs.readFileSync(path.join(WF, 'gh-models-probe.yml'), 'utf8')), 'gh-models-probe: chỉ bấm tay + không báo đỏ');

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
const addLine = script.find(l => /^git add /.test(l)) || ''; // mọi đường dẫn bước lưu tồn tại như trên runner thật
for (const t of addLine.split(/\s+/).slice(2)) { const p = t.replace(/\*/g, 'xx'), f = path.join(work, /\.[a-z]+$/.test(p) ? p : p + '/keep.txt'); if (!fs.existsSync(f)) { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, 'seed\n'); } }
git(work, 'add', '-A'); git(work, '-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-qm', 'init'); git(work, 'push', '-q', 'origin', 'HEAD:main');
git(tmp, 'clone', '-q', origin, other); fs.writeFileSync(path.join(other, 'README'), 'r2\n'); git(other, '-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-qam', 'race'); git(other, 'push', '-q', 'origin', 'HEAD:main'); // lượt đẩy khác chen vào
fs.writeFileSync(path.join(work, 'web/js/i18n/vi.js'), 'core 2\n'); fs.writeFileSync(path.join(work, 'web/js/i18n/vi/tools.js'), 'tools 2\n'); fs.writeFileSync(path.join(work, 'web/app/index.html'), 'junk\n');
fs.writeFileSync(path.join(work, 'web/app/index.html'), 'x\n'); fs.writeFileSync(path.join(work, 'stray.txt'), 'junk\n');
git(work, 'config', 'user.name', 't'); git(work, 'config', 'user.email', 't@t');
const sh = spawnSync('bash', ['-e', '-c', script.join('\n').replace(/sleep \$\(\(i \* 10\)\)/, 'sleep 0')], { cwd: work, encoding: 'utf8' });
ok(sh.status === 0, `i18n: bước lưu phải đẩy được (rc ${sh.status}) ${sh.stderr.slice(-300)}`);
const pushed = (p) => execFileSync('git', ['--git-dir', origin, 'show', 'main:' + p]).toString();
ok(sh.status === 0 && pushed('web/js/i18n/vi/tools.js') === 'tools 2\n' && pushed('web/js/i18n/vi.js') === 'core 2\n' && pushed('README') === 'r2\n', 'i18n: nhóm tải lười được commit + giữ lượt đẩy khác');
try { fs.rmSync(tmp, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); } catch { /* dọn dẹp tạm: bỏ qua */ }

if (fail) { console.error(`✗ ci-triage: ${fail} lỗi`); process.exit(1); }
console.log('✓ ci-triage: phân loại, bỏ qua hạn mức D1, issue/bản tin, sửa youtube-*/i18n – tất cả đạt');
