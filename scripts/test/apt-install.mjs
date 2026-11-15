#!/usr/bin/env node
// apt-install.sh: cài gói apt trên runner không bao giờ treo cả job (10/11 #983 ux1: apt-get install imagemagick fonts-noto-* treo mirror
// > 10 phút → bước "Cài" hết 14 phút). Kiểm bằng apt-get giả: treo → trần → update → thử lại → lượt cuối đổi mirror; gói có sẵn bỏ qua;
// hết lượt → mã 1 + ::error::. Máy gác: KHÔNG workflow nào tự gọi `apt-get install` (dùng .github/actions/apt hoặc scripts/ci/apt-install.sh).
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { spawnSync } from 'node:child_process';
const ROOT = process.cwd(), SH = path.join(ROOT, 'scripts/ci/apt-install.sh');
let bad = 0; const ok = (c, m) => { if (!c) { bad++; console.error('✗', m); } else console.log('  ✓', m); };
const T = fs.mkdtempSync(path.join(process.env.TMPDIR || os.tmpdir(), 'aptinst-')), BIN = path.join(T, 'bin'), CALLS = path.join(T, 'calls');
fs.mkdirSync(BIN);
const X = (n, s) => { fs.writeFileSync(path.join(BIN, n), '#!/usr/bin/env bash\n' + s + '\n'); fs.chmodSync(path.join(BIN, n), 0o755); };
// apt-get giả: ghi lời gọi; HANG=n → n lượt install đầu treo; FAIL=1 → install luôn lỗi
X('apt-get', `echo "$*" >> "${CALLS}"; [ "$1" = install ] || exit 0
n=$(grep -c '^install' "${CALLS}"); [ "\${FAIL:-0}" = 1 ] && exit 100; [ "$n" -le "\${HANG:-0}" ] && sleep 30; exit 0`);
X('apt-cache', 'exit 0');   // chỉ mục có sẵn (lời gọi update đầu chỉ khi apt-cache show lỗi)
X('dpkg-query', `[ "\${@: -1}" = co-san ] && printf 'install ok installed' || exit 1`);   // "co-san" = gói đã cài
if (spawnSync('bash', ['-c', 'command -v timeout']).status !== 0) X('timeout', 'exec perl -e \'alarm shift; exec @ARGV\' "$@"');   // macOS
const run = (args, env = {}) => { fs.rmSync(CALLS, { force: true });
  const r = spawnSync('bash', [SH, ...args], { encoding: 'utf8', env: { ...process.env, PATH: `${BIN}:${process.env.PATH}`, APT_SUDO: '', APT_GET: path.join(BIN, 'apt-get'), APT_INSTALL_TIMEOUT: '2', ...env } });
  return { ...r, out: r.stdout + r.stderr, calls: fs.existsSync(CALLS) ? fs.readFileSync(CALLS, 'utf8').trim().split('\n') : [] }; };
try {
  let r = run(['co-san']);
  ok(r.status === 0 && !r.calls.length && /đã có sẵn/.test(r.out), 'gói đã cài → bỏ qua, không gọi apt');
  r = run(['co-san', 'goi-a', 'goi-b']);
  ok(r.status === 0 && r.calls.length === 1 && /^install /.test(r.calls[0]) && / goi-a goi-b$/.test(r.calls[0]) && !/co-san/.test(r.calls[0]), 'chỉ cài gói còn thiếu, 1 lượt');
  ok(/--no-install-recommends/.test(r.calls[0]) && /DPkg::Lock::Timeout/.test(r.calls[0]) && /Acquire::Retries/.test(r.calls[0]), 'cờ: --no-install-recommends + khoá dpkg + thử lại tải');
  r = run(['goi-a'], { HANG: '1' });
  ok(r.status === 0 && r.calls.map(c => c.split(' ')[0]).join() === 'install,update,install', 'lượt 1 treo → trần cắt → update → lượt 2 xong: ' + r.calls.map(c => c.split(' ')[0]).join());
  r = run(['goi-a'], { HANG: '2' });
  ok(r.status === 0 && /đổi mirror/.test(r.out) && r.calls.filter(c => c.startsWith('install')).length === 3, 'lượt cuối đổi mirror rồi mới thử');
  r = run(['goi-a'], { FAIL: '1' });
  ok(r.status === 1 && /::error::apt: không cài được goi-a sau 3 lượt/.test(r.out), 'hết lượt → mã 1 + ::error:: (không im lặng `|| true`)');
  const C = path.join(T, 'cache'); r = run(['goi-a'], { APT_CACHE_DIR: C });
  ok(r.status === 0 && fs.existsSync(path.join(C, 'partial')) && r.calls[0].includes(`Dir::Cache::Archives=${C}`), 'APT_CACHE_DIR → .deb vào thư mục cache (actions/cache)');
  ok(spawnSync('bash', [SH]).status === 2, 'không có gói → mã 2');
} finally { fs.rmSync(T, { recursive: true, force: true }); }

// máy gác: workflow không tự gọi apt-get/apt install (trần, thử lại, cache nằm ở MỘT chỗ)
const WF = '.github/workflows', naked = [];
for (const f of fs.readdirSync(WF).filter(f => /\.ya?ml$/.test(f))) fs.readFileSync(path.join(WF, f), 'utf8').split('\n').forEach((l, i) => {
  if (!/^\s*#/.test(l) && /\bapt(-get)?\b[^\n#]*\sinstall\b/.test(l)) naked.push(`${f}:${i + 1}`);
});
ok(!naked.length, 'workflow không tự gọi `apt-get install` (dùng ./.github/actions/apt hoặc scripts/ci/apt-install.sh)' + (naked.length ? ': ' + naked.join(', ') : ''));
const act = fs.readFileSync('.github/actions/apt/action.yml', 'utf8');
ok(/actions\/cache@/.test(act) && /ImageVersion/.test(act) && /sort -u/.test(act) && /apt-install\.sh/.test(act), 'action apt: cache theo ảnh runner + danh sách gói đã sắp xếp, gọi apt-install.sh');
if (bad) { console.error(`✗ apt-install: ${bad} lỗi`); process.exit(1); }
console.log('✓ apt-install: bỏ qua gói có sẵn, trần + update + thử lại + đổi mirror, đỏ rõ khi hết lượt; workflow không tự gọi apt-get install');
