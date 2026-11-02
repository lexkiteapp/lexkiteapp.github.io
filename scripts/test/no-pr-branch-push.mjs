#!/usr/bin/env node
// Bot KHÔNG được commit/đẩy vào nhánh đang chạy khi nhánh đó không phải main (= nhánh PR) – docs/CI-RUNNERS.md › required-gate.
// Vì sao (2/11): say-native.yml đẩy commit report vào nhánh PR → đầu PR mới là commit của bot: đẩy bằng GITHUB_TOKEN thì không kích
// workflow nào (required-gate không bao giờ xanh, PR #402 treo "chờ duyệt"), đẩy bằng khoá deploy + [skip ci] cũng vậy; rebase thì dính
// commit lạc (PR #410). Kết quả của bot trên nhánh → artifact + job summary (+ comment PR); người làm PR lấy về bằng
// scripts/ci/bot-output.sh rồi tự commit (CI chạy bình thường). Ghi lên main chỉ trong lượt chạy trên main.
// Luật: workflow chạy được trên nhánh khác main (push nhánh ≠ main / branches-ignore, pull_request*, workflow_dispatch, workflow_call)
// mà có `git push` tới chính ref đang chạy (push trần, HEAD:${GITHUB_REF_NAME}, github.ref_name, github.head_ref, $BR = ref_name)
// → bước hoặc job đó phải có `if:` chứa github.ref == 'refs/heads/main' (hoặc github.ref_name == 'main'), không thì đỏ.
// (schedule / workflow_run luôn chạy trên nhánh mặc định → an toàn.) Chạy: node scripts/test/no-pr-branch-push.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SELF = /\$\{?BR\}?\b|\$\{?GITHUB_REF_NAME\}?|\$\{?GITHUB_HEAD_REF\}?|github\.ref_name|github\.head_ref|github\.ref\b/;
const MAIN_IF = /github\.ref\s*==\s*'refs\/heads\/main'|github\.ref_name\s*==\s*'main'/;

/** Workflow chạy được trên nhánh khác main? */
export function canRunOffMain(src) {
  const m = src.match(/^on:\s*\n((?:[ \t]+.*\n|\s*\n)*)/m); if (!m) return true;
  const on = m[1];
  if (/^\s{2}(pull_request|pull_request_target|workflow_dispatch|workflow_call|repository_dispatch):/m.test(on)) return true;
  const push = on.match(/^\s{2}push:\s*\n((?:\s{4,}.*\n)*)/m); if (!push && !/^\s{2}push:/m.test(on)) return false;
  const body = push ? push[1] : '';
  if (/branches-ignore:/.test(body)) return true;
  const br = body.match(/branches:\s*\[([^\]]*)\]/) || body.match(/branches:\s*\n((?:\s+- .*\n)+)/);
  if (!br) return !/tags:/.test(body);   // push không lọc nhánh = mọi nhánh
  return br[1].split(/[,\n]/).map(s => s.replace(/^\s*-\s*/, '').trim().replace(/['"]/g, '')).filter(Boolean).some(b => b !== 'main');
}

/** 1 lệnh push → true nếu đích là chính ref đang chạy (không phải main cố định, tag, nhánh cố định, kho khác) */
export function pushesSelf(seg) {
  const m = seg.match(/\bgit((?:\s+-[cC]\s+(?:\S*"[^"]*"\S*|\S*'[^']*'\S*|\S+))*)\s+push\b([^;&|)\n]*)/); if (!m) return false;
  if (/-C\s/.test(m[1])) return false;
  const toks = m[2].replace(/\$\{\{\s*([^}]*?)\s*\}\}/g, '${{$1}}').trim().split(/\s+/).filter(Boolean).map(t => t.replace(/^["']|["']$/g, '')).filter(t => !t.startsWith('-'));
  if (toks.length < 2) return true;   // push trần = nhánh đang checkout = ref đang chạy
  if (/^refs\/tags\//.test(toks[1])) return false;
  const dest = toks[1].replace(/^\+/, '').replace(/^[^:]*:/, '').replace(/^refs\/heads\//, '');
  return dest !== 'main' && SELF.test(dest);
}

/** Quét 1 workflow → lỗi */
export function scan(name, src) {
  if (!canRunOffMain(src)) return [];
  const errs = [], lines = src.split('\n'), jStart = lines.findIndex(l => /^jobs:\s*$/.test(l));
  if (jStart < 0) return errs;
  const jobs = []; for (let i = jStart + 1; i < lines.length; i++) { const m = lines[i].match(/^ {2}([A-Za-z0-9_-]+):/); if (m) jobs.push({ name: m[1], from: i }); }
  jobs.forEach((j, k) => { j.to = k + 1 < jobs.length ? jobs[k + 1].from : lines.length; });
  for (const j of jobs) {
    const body = lines.slice(j.from, j.to);
    const jobIf = body.find(l => /^ {4}if:/.test(l)) || '';
    let stepIf = '', ext = false;
    body.forEach((l, n) => {
      if (/^\s*#/.test(l)) return;
      if (/^ {6}- /.test(l)) { stepIf = ''; ext = false; }
      const im = l.match(/^ {6}(?:- | {2})if:\s*(.*)$/); if (im) stepIf = im[1];
      if (/\bcd\s+(?!"?\$GITHUB_WORKSPACE|"?\$\{\{\s*github\.workspace)(\S+)/.test(l)) ext = true;   // kho khác đã cd vào
      if (ext) return;
      for (const seg of l.split(/(?=(?<![\w./:@-])git\s)/)) {
        if (!pushesSelf(seg) || MAIN_IF.test(stepIf) || MAIN_IF.test(jobIf)) continue;
        errs.push(`${name}:${j.from + n + 1} (job ${j.name}) đẩy vào chính nhánh đang chạy mà không khoá main – trên nhánh PR commit bot làm CI/required-gate treo. Đưa kết quả ra artifact/summary (+ scripts/ci/bot-output.sh), hoặc thêm if: github.ref == 'refs/heads/main'`);
      }
    });
  }
  return errs;
}

const self = path.resolve(process.argv[1] || '') === fileURLToPath(import.meta.url);
if (self) {
  let fail = 0; const bad = m => { fail++; console.error('✗ no-pr-branch-push: ' + m); };
  const W = (on, job, jif = '') => `on:\n${on}\njobs:\n  a:\n    runs-on: ubuntu-latest\n${jif}    steps:\n      - uses: actions/checkout@v4\n${job}`;
  const run = (s, sif = '') => `      - name: c\n${sif ? `        if: ${sif}\n` : ''}        run: |\n${s.split('\n').map(x => '          ' + x).join('\n')}\n`;
  const MAINONLY = "github.ref == 'refs/heads/main'";
  const cases = [
    ['say-native cũ: push nhánh ≠ main, đẩy ref_name', W('  push:\n    branches-ignore: [main]', run('git commit -qm x; git push origin HEAD:${{ github.ref_name }}')), 1],
    ['brand-build cũ: push nhánh brand-build*', W("  push:\n    branches: ['brand-build*']", run('git push -q origin HEAD:${GITHUB_REF_NAME}')), 1],
    ['sent-packs cũ: dispatch, HEAD:$BR', W('  workflow_dispatch:', run('git push -q origin "HEAD:$BR"')), 1],
    ['dispatch, push trần', W('  workflow_dispatch:', run('git commit -m x && git pull --rebase -q && git push')), 1],
    ['pull_request, head_ref', W('  pull_request:', run('git push origin HEAD:${{ github.head_ref }}')), 1],
    ['bước khoá main', W('  workflow_dispatch:', run('git push', MAINONLY)), 0],
    ['job khoá main', W('  workflow_dispatch:', run('git push -q origin HEAD:${GITHUB_REF_NAME}'), `    if: ${MAINONLY}\n`), 0],
    ['chỉ lịch (luôn main)', W("  schedule:\n    - cron: '0 0 * * *'", run('git push')), 0],
    ['push chỉ main', W('  push:\n    branches: [main]', run('git push')), 0],
    ['HEAD:main cố định', W('  workflow_dispatch:', run('git push -q origin HEAD:main')), 0],
    ['nhánh cố định khác', W('  workflow_dispatch:', run('git push -qf origin HEAD:screens')), 0],
    ['nhánh mới $br (mở PR)', W('  workflow_dispatch:', run('git push -q origin "$br"')), 0],
    ['tag', W('  workflow_dispatch:', run('git push -q origin "refs/tags/$TAG"')), 0],
    ['kho khác (cd)', W('  workflow_dispatch:', run('cd /tmp/footage && git push')), 0],
    ['git -C kho khác', W('  workflow_dispatch:', run('git -C footage push')), 0],
    ['git stash push', W('  workflow_dispatch:', run('git stash push -q -m x')), 0],
  ];
  for (const [t, src, want] of cases) { const n = scan('mẫu', src).length; if ((n > 0) !== (want > 0)) bad(`tự kiểm "${t}": ${n} lỗi, cần ${want ? '≥1' : '0'}`); }
  const WF = '.github/workflows'; let n = 0;
  for (const f of fs.readdirSync(WF).filter(f => /\.ya?ml$/.test(f)).sort()) { n++; scan(`${WF}/${f}`, fs.readFileSync(path.join(WF, f), 'utf8')).forEach(bad); }
  if (n < 30) bad(`chỉ thấy ${n} workflow – sai thư mục?`);
  if (!fail) console.log(`✓ no-pr-branch-push: ${n} workflow, không cái nào đẩy commit bot vào nhánh PR`);
  process.exit(fail ? 1 : 0);
}
