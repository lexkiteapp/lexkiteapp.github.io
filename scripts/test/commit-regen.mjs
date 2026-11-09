// scripts/ci/commit-regen.sh: 2 workflow cùng ghi chỉ mục 1 dòng (audio.yml + sentence-audio-asr.yml) – lượt đẩy sau phải SINH LẠI trên main mới
// thay vì rebase rồi kẹt xung đột (1/11: sentence-audio-asr mất lượt gộp 825 câu). Repo git tạm, không mạng.
import { execFileSync as x } from 'node:child_process'; import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import assert from 'node:assert/strict';
const d = fs.mkdtempSync(path.join(os.tmpdir(), 'cregen-')), sh = (cwd, ...a) => x('git', a, { cwd, stdio: 'pipe' }).toString();
const script = path.resolve('scripts/ci/commit-regen.sh');
try {
  x('git', ['init', '-q', '--bare', '-b', 'main', `${d}/o.git`]);
  for (const c of ['a', 'b']) { x('git', ['clone', '-q', `${d}/o.git`, `${d}/${c}`], { stdio: 'pipe' }); sh(`${d}/${c}`, 'config', 'user.email', 't@t'); sh(`${d}/${c}`, 'config', 'user.name', 't'); }
  fs.mkdirSync(`${d}/a/scripts`); fs.writeFileSync(`${d}/a/scripts/build-extension.sh`, 'exit 0\n'); fs.writeFileSync(`${d}/a/idx.txt`, 'k1 k2\n'); fs.mkdirSync(`${d}/a/ots`); fs.writeFileSync(`${d}/a/ots/ok.ots`, 'ok'); // thư mục bằng chứng đã track (như content/protection/ots)
  sh(`${d}/a`, 'add', '.'); sh(`${d}/a`, 'commit', '-qm', 'init'); sh(`${d}/a`, 'push', '-q', 'origin', 'HEAD:main'); sh(`${d}/b`, 'pull', '-q', 'origin', 'main');
  // workflow B đẩy trước (thêm k3), workflow A đang giữ main cũ và có kết quả riêng (k9) trên đĩa
  fs.writeFileSync(`${d}/b/idx.txt`, 'k1 k2 k3\n'); sh(`${d}/b`, 'commit', '-qam', 'B'); sh(`${d}/b`, 'push', '-q', 'origin', 'HEAD:main');
  fs.writeFileSync(`${d}/a/res.txt`, 'k9'); // chưa track – còn sau reset --hard
  const regen = `node -e "const fs=require('fs');const s=new Set(fs.readFileSync('idx.txt','utf8').trim().split(' '));s.add(fs.readFileSync('res.txt','utf8'));fs.writeFileSync('idx.txt',[...s].sort().join(' ')+'\\n')"`;
  fs.writeFileSync(`${d}/a/ots/stale.ots`, 'x'); // bằng chứng mồ côi từ lượt thử trước (untracked, nằm trong đường dẫn sinh)
  x('bash', [script, 'A', regen, 'idx.txt', 'ots'], { cwd: `${d}/a`, stdio: 'pipe' });
  sh(`${d}/b`, 'pull', '-q', 'origin', 'main');
  assert.equal(fs.readFileSync(`${d}/b/idx.txt`, 'utf8'), 'k1 k2 k3 k9\n', 'giữ cả thay đổi của workflow kia lẫn kết quả lượt này');
  assert.ok(!fs.existsSync(`${d}/b/ots/stale.ots`), 'tệp untracked cũ trong đường dẫn sinh không bị đẩy');
  console.log('✓ commit-regen: workflow đẩy sau sinh lại trên main mới, không xung đột');
} finally { fs.rmSync(d, { recursive: true, force: true }); }
