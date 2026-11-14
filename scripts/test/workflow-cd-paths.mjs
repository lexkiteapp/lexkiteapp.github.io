// Máy gác (12/11, #1070 Blog images đỏ 6 lượt: `cd "$LEXKITE_TOOLS" && bash scripts/ci/npm-retry.sh` → 127 vì đường dẫn tương đối sau cd).
// Trong một khối `run:` sau khi `cd` ra khỏi thư mục repo (không nằm trong ngoặc con), cấm gọi `bash|node scripts/…` tương đối.
import fs from 'node:fs'; import assert from 'node:assert/strict';
export const findBad = text => {
  const bad = [], lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const h = lines[i].match(/^(\s*(?:-\s+)?)run:\s*[|>]/); if (!h) continue;
    const ind = h[1].length; let moved = false;
    for (let j = i + 1; j < lines.length && (!lines[j].trim() || lines[j].match(/^\s*/)[0].length >= ind); j++) {
      let l = lines[j].replace(/\\[()]/g, ''); for (let k = 0; k < 5; k++) l = l.replace(/\([^()]*\)/g, ''); // bỏ ngoặc con ( cd x && … ) – cd không rò ra ngoài
      const cd = l.match(/\bcd\s+("[^"]*"|\S+)/);
      const m = l.match(/\b(?:bash|node|sh)\s+(scripts\/\S+)/);
      if (m && moved && !(cd && l.indexOf(cd[0]) > l.indexOf(m[0]))) bad.push(`dòng ${j + 1}: ${m[0]}`);
      if (cd) moved = !/GITHUB_WORKSPACE|^"?-"?$/.test(cd[1]);
    }
  }
  return bad;
};
// tự thử: bản cũ phải đỏ, bản đúng xanh
assert.equal(findBad('    steps:\n      - run: |\n          cd "$T" && npm init -y\n          bash scripts/ci/x.sh\n').length, 1, 'bản lỗi phải bị bắt');
assert.equal(findBad('      - run: |\n          cd "$T" && npm i\n          bash "$GITHUB_WORKSPACE/scripts/ci/x.sh"\n').length, 0);
assert.equal(findBad('      - run: |\n          (cd ../base && npm ci)\n          bash scripts/x.sh\n').length, 0, 'cd trong ngoặc con không tính');
const dir = '.github/workflows', errs = [];
for (const f of fs.readdirSync(dir).filter(x => /\.ya?ml$/.test(x))) for (const b of findBad(fs.readFileSync(`${dir}/${f}`, 'utf8'))) errs.push(`${f} ${b}`);
assert.equal(errs.length, 0, 'đường dẫn tương đối sau cd:\n' + errs.join('\n'));
console.log('workflow-cd-paths OK');
