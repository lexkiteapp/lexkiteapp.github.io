// workflow-yaml: MỌI .github/workflows/*.yml phải đọc được (YAML hợp lệ, có `on` + `jobs`).
// Lý do: workflow lỗi cú pháp thì run của pull_request không hề sinh ra (PR vẫn xanh) còn run push thành "failure" không job → required-gate đỏ sau khi đã vào nhánh
// (vd teacher-rig.yml 05/11: `run: { echo …; } >> …` là flow-mapping sai). Chạy: node scripts/test/workflow-yaml.mjs
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
const DIR = '.github/workflows', files = fs.readdirSync(DIR).filter(f => /\.ya?ml$/.test(f)).sort();
const PY = `import sys,yaml
bad=0
for f in sys.argv[1:]:
    try:
        d=yaml.safe_load(open(f,encoding='utf-8'))
        if not isinstance(d,dict): raise ValueError('không phải mapping')
        if True not in d and 'on' not in d: raise ValueError('thiếu khóa on')
        if not isinstance(d.get('jobs'),dict) or not d['jobs']: raise ValueError('thiếu jobs')
    except Exception as e:
        bad+=1; print('✗ %s: %s' % (f, str(e).replace(chr(10),' | ')[:300]))
sys.exit(1 if bad else 0)`;
const r = spawnSync('python3', ['-c', PY, ...files.map(f => `${DIR}/${f}`)], { encoding: 'utf8' });
if (r.error || /No module named/.test(r.stderr || '')) { console.error('✗ workflow-yaml: cần python3 + PyYAML', r.stderr || r.error); process.exit(2); }
if (r.status !== 0) { console.error(r.stdout + `workflow-yaml: ${files.length} file, có file YAML không đọc được`); process.exit(1); }
console.log(`✓ workflow-yaml: ${files.length} workflow đều đọc được`);
