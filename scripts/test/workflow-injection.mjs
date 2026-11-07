// Tĩnh: không chèn dữ liệu do người dùng kiểm soát (inputs, github.event.*, tên nhánh/PR) thẳng vào `run:` / `script:` của workflow
// (tấn công chèn lệnh). Phải đưa qua `env:` rồi dùng "$VAR" có trích dẫn. Cho phép secrets, vars, steps/needs outputs, matrix, github.sha, run_id…
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const DIR = '.github/workflows';
const TAINT = /(^|[^\w.])(inputs\.|github\.event\.|github\.head_ref|github\.base_ref|github\.ref_name|github\.ref(?![\w.])|github\.event(?![\w]))/;

// Trả về các khối run:/script: dạng [{ line, text }]
export function scriptBlocks(src) {
  const L = src.split('\n'), out = [];
  for (let i = 0; i < L.length; i++) {
    const m = /^(\s*)(?:-\s+)?(run|script):\s*(.*)$/.exec(L[i]);
    if (!m) continue;
    const key = m[1].length + (L[i].includes('- ') && /^\s*-\s+(run|script):/.test(L[i]) ? 2 : 0);
    const rest = m[3].trim();
    // `run:` rỗng mà dòng kế là khóa YAML (vd job tên "run:") là khóa ánh xạ, không phải khối lệnh
    const nextKey = rest === '' && /^\s*[A-Za-z_][\w-]*:(\s|$)/.test(L.slice(i + 1).find(x => x.trim()) || '');
    if (nextKey) continue;
    if (/^[|>][+-]?\d*\s*(#.*)?$/.test(rest) || rest === '') { // khối nhiều dòng
      let j = i + 1, text = '';
      for (; j < L.length; j++) { const ind = L[j].match(/^(\s*)/)[1].length; if (L[j].trim() && ind <= key) break; text += L[j] + '\n'; }
      out.push({ line: i + 1, text }); i = j - 1;
    } else out.push({ line: i + 1, text: rest });
  }
  return out;
}
export function violations(src) {
  const bad = [];
  for (const b of scriptBlocks(src)) {
    b.text.split('\n').forEach((ln, k) => {
      for (const m of ln.matchAll(/\$\{\{([\s\S]*?)\}\}/g)) if (TAINT.test(m[1])) bad.push({ line: b.line + k + (b.text.includes('\n') ? 1 : 0), expr: m[1].trim() });
    });
  }
  return bad;
}

// Tự kiểm bộ quét
assert.equal(violations('steps:\n  - run: echo ${{ github.event.inputs.x }}\n').length, 1);
assert.equal(violations('steps:\n  - name: a\n    run: |\n      echo "${{ inputs.v }}"\n').length, 1);
assert.equal(violations('steps:\n  - run: echo ${{ github.head_ref }}\n').length, 1);
assert.equal(violations('steps:\n  - run: echo ${{ github.event.pull_request.title }}\n').length, 1);
assert.equal(violations('steps:\n  - uses: actions/github-script@v7\n    with:\n      script: |\n        const t = "${{ github.event.issue.title }}"\n').length, 1);
assert.equal(violations('steps:\n  - run: |\n      echo ${{ secrets.A }} ${{ vars.B }} ${{ steps.s.outputs.o }} ${{ matrix.l }} ${{ github.sha }} ${{ github.run_id }} ${{ github.event_name }} ${{ needs.a.outputs.b }}\n    env:\n      V: ${{ inputs.v }}\n').length, 0);

assert.equal(violations('jobs:\n  run:\n    runs-on: x\n    if: ${{ inputs.mode == 1 }}\n    steps:\n      - run: echo hi\n').length, 0, 'job tên run: không phải khối lệnh');
assert.equal(violations('jobs:\n  a:\n    steps:\n      - run:\n          echo ${{ inputs.v }}\n').length, 1);

let n = 0; const fails = [];
for (const f of fs.readdirSync(DIR).filter(x => /\.ya?ml$/.test(x))) {
  n++;
  for (const v of violations(fs.readFileSync(path.join(DIR, f), 'utf8'))) fails.push(`${f}:${v.line}  \${{ ${v.expr} }}`);
}
assert.equal(fails.length, 0, 'Chèn dữ liệu người dùng vào run:/script: (đưa qua env: rồi dùng "$VAR"):\n  ' + fails.join('\n  '));
console.log(`✓ workflow-injection: ${n} workflow, không có \${{ }} nguy hiểm trong run:/script:`);
