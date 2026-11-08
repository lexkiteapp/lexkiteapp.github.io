// Chính sách cài gói trong CI (08/11): gói có postinstall tải nhị phân (sharp, onnxruntime-node/kokoro-js, mobile/ = Capacitor+sharp) từng làm main đỏ vì mạng
// chập chờn 1 lần (sharp 504 → iOS E2E + Android; onnxruntime-node → Kokoro rớt 2/6 shard). Mọi `npm ci|i|install` các gói đó trong workflow PHẢI qua
// `bash scripts/ci/npm-retry.sh <lệnh…>` (thử lại 3 lần, lùi 10/20 s). Chạy: node scripts/test/npm-retry-policy.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const BIN = /kokoro-js|sharp@|--prefix mobile|onnxruntime-node/;
/** Lỗi trong 1 workflow (thuần): dòng gọi npm trần cho gói tải nhị phân. */
export function scan(name, src) {
  const errs = [];
  String(src).replace(/\\\r?\n/g, ' ').split('\n').forEach((raw, i) => {
    const l = raw.replace(/(^|\s)#.*$/, '');
    if (/(^|[\s;&|(])npm (ci|i|install)\b/.test(l) && BIN.test(l)) errs.push(`${name}:${i + 1} npm trần cho gói tải nhị phân – dùng bash scripts/ci/npm-retry.sh`);
  });
  return errs;
}
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.error('✗ ' + m); } };
ok(scan('x.yml', '  run: npm i --prefix /tmp/kk kokoro-js@1').length === 1, 'bắt npm i kokoro-js trần');
ok(scan('x.yml', '  npm ci --prefix mobile --no-audit').length === 1, 'bắt npm ci --prefix mobile trần');
ok(scan('x.yml', '  bash scripts/ci/npm-retry.sh ci --prefix mobile').length === 0, 'cho qua npm-retry.sh');
ok(scan('x.yml', '  npm ci --no-audit').length === 0 && scan('x.yml', '  # npm i sharp@0.33.5').length === 0, 'không bắt npm thường / comment');
const dir = path.join(ROOT, '.github/workflows'), files = fs.readdirSync(dir).filter(f => /\.ya?ml$/.test(f));
for (const f of files) for (const e of scan('.github/workflows/' + f, fs.readFileSync(path.join(dir, f), 'utf8'))) ok(false, e);
const sh = fs.readFileSync(path.join(ROOT, 'scripts/ci/npm-retry.sh'), 'utf8');
ok(/for i in 1 2 3/.test(sh) && /npm "\$@" && exit 0/.test(sh) && /exit 1/.test(sh) && /sleep/.test(sh), 'npm-retry.sh: thử 3 lần, thoát 0 khi xong, 1 khi hết lần, có nghỉ');
ok(/export ONNXRUNTIME_NODE_INSTALL_CUDA=skip npm_config_onnxruntime_node_install_cuda=skip/.test(sh), 'npm-retry.sh bỏ tải bản CUDA của onnxruntime-node (504 mọi lần thử, runner không có GPU)');
{ // chạy thật với npm giả: lỗi 2 lần rồi thành công → exit 0; luôn lỗi → exit 1 (sleep giả để không chờ)
  const tmp = fs.mkdtempSync(path.join(process.env.TMPDIR || '/tmp', 'nr-')), cnt = path.join(tmp, 'n');
  fs.writeFileSync(path.join(tmp, 'npm'), `#!/bin/sh\nn=$(cat "${cnt}" 2>/dev/null || echo 0); n=$((n+1)); echo $n > "${cnt}"; [ "$n" -ge "$NEED" ]\n`, { mode: 0o755 });
  fs.writeFileSync(path.join(tmp, 'sleep'), '#!/bin/sh\nexit 0\n', { mode: 0o755 });
  const run = need => { fs.rmSync(cnt, { force: true }); return spawnSync('bash', [path.join(ROOT, 'scripts/ci/npm-retry.sh'), 'ci'], { env: { ...process.env, PATH: tmp + ':' + process.env.PATH, NEED: String(need) }, encoding: 'utf8' }).status; };
  ok(run(1) === 0 && run(3) === 0, 'thành công ở lần 1 hoặc lần 3 → exit 0');
  ok(run(4) === 1, 'lỗi cả 3 lần → exit 1');
  ok(run(3) === 0 && fs.readFileSync(cnt, 'utf8').trim() === '3', 'đúng 3 lần gọi npm');
  fs.rmSync(tmp, { recursive: true, force: true }); }
console.log(fails ? `npm-retry-policy: ${fails} lỗi` : `✓ npm-retry-policy: ${files.length} workflow, mọi cài gói tải nhị phân đều qua npm-retry.sh`);
process.exit(fails ? 1 : 0);
