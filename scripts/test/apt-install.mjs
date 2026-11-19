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
} catch (e) { fs.rmSync(T, { recursive: true, force: true }); throw e; }   // T dọn ở cuối tệp (khối fonts-install dùng lại BIN)

// máy gác: workflow không tự gọi apt-get/apt install (trần, thử lại, cache nằm ở MỘT chỗ)
const WF = '.github/workflows', naked = [];
// 18/11: gác cả composite action (video9-setup từng gọi apt-get trần) – không chỉ workflow
const AC = '.github/actions', files = [...fs.readdirSync(WF).filter(f => /\.ya?ml$/.test(f)).map(f => path.join(WF, f)), ...fs.readdirSync(AC).map(d => path.join(AC, d, 'action.yml')).filter(f => fs.existsSync(f))];
for (const f of files) fs.readFileSync(f, 'utf8').split('\n').forEach((l, i) => {
  if (!/^\s*#/.test(l) && /\bapt(-get)?\b[^\n#]*\sinstall\b/.test(l)) naked.push(`${path.basename(path.dirname(f)) === 'workflows' ? path.basename(f) : f}:${i + 1}`);
});
ok(!naked.length, 'workflow không tự gọi `apt-get install` (dùng ./.github/actions/apt hoặc scripts/ci/apt-install.sh)' + (naked.length ? ': ' + naked.join(', ') : ''));
const act = fs.readFileSync('.github/actions/apt/action.yml', 'utf8');
ok(/actions\/cache@/.test(act) && /ImageVersion/.test(act) && /sort -u/.test(act) && /apt-install\.sh/.test(act), 'action apt: cache theo ảnh runner + danh sách gói đã sắp xếp, gọi apt-install.sh');
// fonts-install.sh (19/11): fonts-noto-* tải thẳng .deb có ghim SHA, nhiều mirror, mirror treo/SHA sai → mirror kế, hết mirror → trả gói cho apt
{
  const FI = path.join(ROOT, 'scripts/ci/fonts-install.sh'), body = 'deb-gia', want = require_sha(body), TSV = path.join(T, 'fonts.tsv'), FC = path.join(T, 'fcache'), LOG = path.join(T, 'fcalls');
  fs.writeFileSync(TSV, `fonts-noto-gia\tpool/x/fonts-noto-gia_1_all.deb\t${want}\n`);
  // curl giả: URL chứa "treo" → thoát 28; "sai" → ghi nội dung khác; còn lại ghi body. dpkg giả chỉ ghi lời gọi.
  X('curl', `o=""; u=""; while [ $# -gt 0 ]; do case "$1" in -o) o=$2; shift;; http*) u=$1;; esac; shift; done; echo "curl $u" >> "${LOG}"
case "$u" in *treo*) exit 28;; *sai*) printf sai > "$o";; *) printf '${body}' > "$o";; esac`);
  X('dpkg', `echo "dpkg $*" >> "${LOG}"`);
  const fr = (args, env = {}) => { fs.rmSync(LOG, { force: true }); const r = spawnSync('bash', [FI, ...args], { encoding: 'utf8', env: { ...process.env, PATH: `${BIN}:${process.env.PATH}`, APT_SUDO: '', FONTS_TSV: TSV, FONTS_CACHE_DIR: FC, FONTS_MAX_TIME: '5', ...env } }); return { ...r, calls: fs.existsSync(LOG) ? fs.readFileSync(LOG, 'utf8').trim().split('\n') : [] }; };
  let r = fr(['fonts-noto-gia', 'imagemagick'], { FONTS_MIRRORS: 'http://treo.example http://sai.example http://ok.example' });
  ok(r.status === 0 && r.stdout.trim() === 'imagemagick', 'chỉ trả ra gói không phải font cho apt (imagemagick)');
  ok(r.calls.filter(c => c.startsWith('curl')).length === 3 && r.calls.some(c => c.startsWith('dpkg -i')), 'mirror treo → SHA sai → mirror thứ 3 xong → dpkg -i');
  r = fr(['fonts-noto-gia'], { FONTS_MIRRORS: 'http://treo.example' });
  ok(r.stdout.trim() === '' && !r.calls.some(c => c.startsWith('curl')) && r.calls.some(c => c.startsWith('dpkg -i')), 'đã có trong cache (SHA khớp) → không tải lại, vẫn dpkg -i');
  fs.rmSync(FC, { recursive: true, force: true });
  r = fr(['fonts-noto-gia'], { FONTS_MIRRORS: 'http://treo.example http://sai.example' });
  ok(r.status === 0 && r.stdout.trim() === 'fonts-noto-gia' && !r.calls.some(c => c.startsWith('dpkg')), 'mọi mirror lỗi → trả gói về cho apt (không im lặng, không cài tệp sai SHA)');
  // fonts-noto-core cần fonts-noto-mono: mono phải được dpkg -i TRƯỚC core (nếu không → "dependency problems", đỏ mọi job 19/11)
  fs.writeFileSync(TSV, `fonts-noto-mono\tpool/x/fonts-noto-mono_1_all.deb\t${want}\nfonts-noto-core\tpool/x/fonts-noto-core_1_all.deb\t${want}\n`);
  fs.rmSync(FC, { recursive: true, force: true });
  r = fr(['fonts-noto-core'], { FONTS_MIRRORS: 'http://ok.example' });
  const dp = r.calls.filter(c => c.startsWith('dpkg -i'));
  ok(r.status === 0 && dp.length === 2 && /mono/.test(dp[0]) && /core/.test(dp[1]), 'fonts-noto-core → cài fonts-noto-mono trước core (phụ thuộc)');
  fs.writeFileSync(TSV, `fonts-noto-gia\tpool/x/fonts-noto-gia_1_all.deb\t${want}\n`);
  // apt-install.sh: font đi đường .deb, không gọi apt; gói khác vẫn qua apt
  fs.rmSync(FC, { recursive: true, force: true });
  const aptRun = run(['fonts-noto-gia', 'goi-a'], { FONTS_TSV: TSV, FONTS_CACHE_DIR: FC, FONTS_MIRRORS: 'http://ok.example', FONTS_DPKG: path.join(BIN, 'dpkg') });
  ok(aptRun.status === 0 && aptRun.calls.length === 1 && / goi-a$/.test(aptRun.calls[0]) && !/fonts-noto-gia/.test(aptRun.calls[0]), 'apt-install.sh: fonts-noto-* qua .deb trực tiếp, apt chỉ còn gói khác');
  const tsv = fs.readFileSync('scripts/ci/fonts-debs.tsv', 'utf8').trim().split('\n').map(l => l.split('\t'));
  ok(['fonts-noto-core', 'fonts-noto-mono', 'fonts-noto-cjk', 'fonts-noto-color-emoji'].every(p => tsv.some(c => c[0] === p && /^[0-9a-f]{64}$/.test(c[2]))), 'bảng ghim có core/cjk/color-emoji với SHA-256');
  ok(/fonts-debs\.tsv/.test(act) && /lk-fonts/.test(act) && /cache\/save@/.test(act), 'action apt: cache ~/.cache/lk-fonts theo băm bảng ghim');
}
function require_sha(s) { return spawnSync('bash', ['-c', `printf '%s' "$1" | (sha256sum 2>/dev/null || shasum -a 256) | cut -d' ' -f1`, '_', s], { encoding: 'utf8' }).stdout.trim(); }
fs.rmSync(T, { recursive: true, force: true });
if (bad) { console.error(`✗ apt-install: ${bad} lỗi`); process.exit(1); }
console.log('✓ apt-install: bỏ qua gói có sẵn, trần + update + thử lại + đổi mirror, đỏ rõ khi hết lượt; workflow không tự gọi apt-get install');
