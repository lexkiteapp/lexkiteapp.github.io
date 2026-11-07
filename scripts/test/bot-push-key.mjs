#!/usr/bin/env node
// Bot đẩy thẳng main phải đi SSH bằng khoá deploy BOT_DEPLOY_KEY (docs/CI-RUNNERS.md › required-gate).
// Ruleset main (cần status required-gate, cấm force-push/xoá) chỉ cho DeployKey + admin vượt – GITHUB_TOKEN bị chặn trên repo cá nhân.
// Push bằng khoá deploy LẠI kích workflow `on: push` (GITHUB_TOKEN thì không) → mọi commit bot lên main mang [skip ci] để giữ nguyên hành vi cũ
// (không thêm lượt chạy, không vòng lặp; deploy cần thì workflow tự gọi `gh workflow run pages-deploy.yml` như trước).
//   (khoá có điều kiện: `github.event_name != 'pull_request' && …` hoặc `github.ref == 'refs/heads/main' && …` – mã nhánh/PR không cầm khoá)
//   1) job có `git push` tới main (HEAD:main, bare push, HEAD:$BR / github.ref_name khi workflow chạy được trên main) hoặc gọi script đẩy main
//      → phải có actions/checkout repo chính (không path/repository, không persist-credentials: false) với ssh-key: ${{ secrets.BOT_DEPLOY_KEY }}
//   2) push main bằng URL https://x-access-token… → đỏ (token bị ruleset chặn)
//   3) GIT_SSH_COMMAND của khoá khác (export trong bước / ghi GITHUB_ENV) còn hiệu lực lúc push main → đỏ (đè core.sshCommand của checkout)
//   4) mọi `git commit -m` (trong repo chính) của job đó có [skip ci]; script đẩy main: mọi commit [CF-Pages-Skip] có [skip ci]
//   5) không ghi qua contents API / refs API (PUT/DELETE /contents, createOrUpdateFileContents, PATCH git/refs, /merges) – ruleset chặn như push
//   6) script mới có `HEAD:main`/`git push` phải được phân loại (SCRIPT_MAIN hoặc EXTERNAL)
// Chạy: node scripts/test/bot-push-key.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const KEY = '${{ secrets.BOT_DEPLOY_KEY }}', SKIP = '[skip ci]';
// script đẩy thẳng main của repo chính → regex nhận lời gọi có đẩy trong workflow
export const SCRIPT_MAIN = { 'scripts/ops/ledger-push.mjs': /scripts\/ops\/ledger-push\.mjs/, 'scripts/vocab-img/publish.mjs': /scripts\/vocab-img\/publish\.mjs[^\n]*--push/, 'scripts/vocab-img/publish-free.mjs': /scripts\/vocab-img\/publish-free\.mjs[^\n]*--push/, 'scripts/ci/commit-regen.sh': /scripts\/ci\/commit-regen\.sh/ };
// đẩy NHÁNH PR bot (refs/heads/bot/…) vào repo chính để mở PR – CẦN kích check (không [skip ci]), không bao giờ đẩy main; được kiểm bên dưới
export const PR_BRANCH = new Set(['scripts/factory/open-pr.sh']);
// gộp main vào nhánh PR CÓ SẴN (pr-unconflict): không bao giờ đẩy main, không force-push
export const PR_UPDATE = new Set(['scripts/pr-unconflict.mjs', 'scripts/ci/commit-regen-pr.sh']);
export function scanPrUpdate(f, s) {
  const e = [], pushes = s.split('\n').filter(l => /'push'|git push/.test(l) && !/^\s*(\/\/|#)/.test(l));
  if (/HEAD:main|refs\/heads\/main\b/.test(s)) e.push(`${f}: script cập nhật nhánh PR không được đẩy main`);
  if (!pushes.length || pushes.some(l => /--force|'-f'|\+HEAD/.test(l))) e.push(`${f}: phải có git push và không force-push`);
  return e;
}
export function scanPrBranch(f, s) {
  const e = [], pushes = s.split('\n').filter(l => /git push/.test(l) && !/^\s*#/.test(l));
  if (/HEAD:main|refs\/heads\/main\b/.test(s)) e.push(`${f}: script nhánh PR không được đẩy main`);
  if (!pushes.length || pushes.some(l => !/HEAD:refs\/heads\/\$\{?br\}?/.test(l))) e.push(`${f}: mọi git push phải là HEAD:refs/heads/$br`);
  if (!/br="bot\//.test(s)) e.push(`${f}: nhánh phải có tiền tố bot/`);
  return e;
}
// đẩy vào kho KHÁC (media/footage/shorts) hoặc chạy tay trên máy → không thuộc ruleset main
const EXTERNAL = new Set(['scripts/media/push.mjs', 'scripts/lib/media-store.mjs', 'scripts/blog-media.mjs', 'scripts/video/library.mjs',
  'scripts/video/bank3d/upload.sh', 'scripts/cine/shorts_migrate.py', 'scripts/mergecheck.sh' /* người chạy, gộp nhánh cục bộ */, 'scripts/deploy-github.sh' /* cũ */]);

const isComment = l => /^\s*#/.test(l);
const STEP = /^\s*- (?:name|uses|run|id|if|env|with|shell|timeout-minutes|continue-on-error|working-directory)\b/;
const SSHKEY = /ssh-key:\s*['"]?\$\{\{\s*(?:(?:github\.event_name\s*!=\s*'pull_request'|github\.ref\s*==\s*'refs\/heads\/main')\s*&&\s*)?secrets\.BOT_DEPLOY_KEY(?:\s*\|\|\s*'')?\s*\}\}['"]?/;
const MAINVAR =/\$\{?BR\}?\b|GITHUB_REF_NAME|github\.ref_name/;

/** Workflow có thể chạy trên main? (lịch/dispatch/workflow_run, hoặc push không giới hạn nhánh / có main) */
export function canRunOnMain(src) {
  const m = src.match(/^on:\s*\n((?:[ \t]+.*\n|\s*\n)*)/m); if (!m) return true;
  const on = m[1];
  if (/^\s{2}(schedule|workflow_dispatch|workflow_run|repository_dispatch|workflow_call):/m.test(on)) return true;
  const push = on.match(/^\s{2}push:\s*\n((?:\s{4,}.*\n)*)/m); if (!push) return false;
  const br = push[1].match(/branches:\s*\[([^\]]*)\]/); if (!br) return true;
  return br[1].split(',').map(s => s.trim().replace(/['"]/g, '')).some(b => b === 'main' || b === '**' || b === '*');
}

/** Phân tích 1 lệnh push trên dòng → null | { main, url } */
export function parsePush(line, onMain) {
  const m = line.match(/\bgit((?:\s+-[cC]\s+(?:\S*"[^"]*"\S*|\S*'[^']*'\S*|\S+))*)\s+push\b([^;&|)\n]*)/); if (!m) return null;
  if (/-C\s/.test(m[1])) return { main: false, external: true };
  const toks = m[2].trim().split(/\s+/).filter(Boolean).map(t => t.replace(/^["']|["']$/g, '')).filter(t => !t.startsWith('-'));
  const url = /^https?:\/\//.test(toks[0] || '');
  if (toks.length < 2) return { main: onMain, url, bare: true };
  const dest = toks[1].replace(/^\+/, '').replace(/^[^:]*:/, '').replace(/^refs\/heads\//, '');
  if (/^refs\/tags\//.test(dest) || /^refs\/tags\//.test(toks[1])) return { main: false, url };
  return { main: dest === 'main' || (onMain && MAINVAR.test(dest)), url };
}

/** Quét 1 workflow → danh sách lỗi + job đẩy main */
export function scanWorkflow(name, src) {
  const errs = [], pushers = [], onMain = canRunOnMain(src), lines = src.split('\n');
  const jStart = lines.findIndex(l => /^jobs:\s*$/.test(l));
  lines.forEach((l, i) => {   // 5) contents/refs API
    if (isComment(l)) return;
    if ((/\/contents\//.test(l) && /(-X|--method)\s*['"]?(PUT|DELETE)|method:\s*['"](PUT|DELETE)|-f\s+content=/.test(l)) || /createOrUpdateFileContents|deleteFile\(|updateRef\(|git\/refs\/heads\/main|\/merges\b/.test(l))
      errs.push(`${name}:${i + 1} ghi repo qua API (contents/refs/merges) – ruleset main chặn token; đổi sang git push qua SSH (checkout ssh-key BOT_DEPLOY_KEY)`);
  });
  if (jStart < 0) return { errs, pushers };
  const jobs = []; for (let i = jStart + 1; i < lines.length; i++) { const m = lines[i].match(/^ {2}([A-Za-z0-9_-]+):/); if (m) jobs.push({ name: m[1], from: i }); }
  jobs.forEach((j, k) => { j.to = k + 1 < jobs.length ? jobs[k + 1].from : lines.length; });
  for (const j of jobs) {
    const body = lines.slice(j.from, j.to), at = n => `${name}:${j.from + n + 1} (job ${j.name})`;
    // gom bước
    const steps = []; body.forEach((l, n) => { if (STEP.test(l) && /^\s*- /.test(l)) steps.push({ from: n, lines: [] }); if (steps.length) steps[steps.length - 1].lines.push([n, l]); });
    let envSsh = false; const mainPush = [], commits = [], sshBad = [];
    for (const s of steps) {
      let external = false, ssh = envSsh;
      for (const [n, l] of s.lines) {
        if (isComment(l)) continue;
        if (/\bcd\s+(?!"?\$GITHUB_WORKSPACE|"?\$\{\{\s*github\.workspace)(\S+)/.test(l)) external = true;
        if (/unset\s+GIT_SSH_COMMAND/.test(l)) ssh = false;
        if (/export\s+GIT_SSH_COMMAND=/.test(l)) ssh = true;
        if (/GIT_SSH_COMMAND=[^\n]*>>\s*"?\$GITHUB_ENV/.test(l)) envSsh = true;
        // script đẩy main
        for (const [f, re] of Object.entries(SCRIPT_MAIN)) if (re.test(l)) { mainPush.push(n); if (ssh && !/env\s+-u\s+GIT_SSH_COMMAND/.test(l)) sshBad.push(n); void f; }
        // lệnh push (có thể nhiều trên 1 dòng)
        for (const seg of l.split(/(?=(?<![\w./:@-])git\s)/)) {
          const p = parsePush(seg, onMain); if (!p || p.external) continue;
          if (external || !p.main) continue;
          if (p.url) errs.push(`${at(n)} push main bằng URL token – ruleset chặn; dùng origin SSH từ checkout ssh-key`);
          mainPush.push(n);
          if (ssh && !/env\s+-u\s+GIT_SSH_COMMAND/.test(l)) sshBad.push(n);
        }
        if (!external && /\bgit\b[^\n]*\bcommit\b[^\n]*\s-[a-zA-Z]*m\b/.test(l)) commits.push([n, l]);
      }
    }
    if (!mainPush.length) continue;
    pushers.push(j.name);
    // 1) checkout ssh-key
    const co = steps.filter(s => s.lines.some(([, l]) => /uses:\s*actions\/checkout@/.test(l))).map(s => s.lines.map(([, l]) => l).join('\n'));
    // khoá thẳng, hoặc có điều kiện "không phải PR" (job chạy cả pull_request: mã PR không được cầm khoá vượt ruleset)
    const good = co.filter(t => SSHKEY.test(t)).filter(t => !/\b(path|repository):/.test(t) && !/persist-credentials:\s*false/.test(t));
    if (!good.length) errs.push(`${at(mainPush[0])} đẩy main nhưng checkout thiếu ssh-key: ${KEY} (ruleset chặn GITHUB_TOKEN)`);
    for (const n of sshBad) errs.push(`${at(n)} GIT_SSH_COMMAND khoá khác còn hiệu lực lúc đẩy main – unset GIT_SSH_COMMAND trước khi push`);
    // 4) [skip ci]
    for (const [n, l] of commits) {
      const c = (l.match(/\bcommit\b[^\n]*?\s-[a-zA-Z]*m\b/g) || []).length, sk = l.split(SKIP).length - 1;
      if (sk < c) errs.push(`${at(n)} commit bot lên main thiếu ${SKIP} – push bằng khoá deploy sẽ kích workflow on: push`);
    }
  }
  return { errs, pushers };
}

/** Script đẩy main: mọi commit [CF-Pages-Skip] phải có [skip ci] */
export function scanScript(f, src) {
  return src.split('\n').flatMap((l, i) => /'commit'/.test(l) && l.includes('[CF-Pages-Skip]') && !l.includes(SKIP) ? [`${f}:${i + 1} commit lên main thiếu ${SKIP}`] : []);
}

const self = path.resolve(process.argv[1] || '') === fileURLToPath(import.meta.url);
if (self) {
  let fail = 0; const bad = m => { fail++; console.error('✗ bot-push-key: ' + m); };
  // --- tự kiểm bộ nhận diện (mẫu giả) ---
  const W = (on, job) => `on:\n${on}\njobs:\n  a:\n    runs-on: ubuntu-latest\n    steps:\n${job}`;
  const CO = `      - uses: actions/checkout@v4\n        with: { ssh-key: '${KEY}' }\n`, CO0 = '      - uses: actions/checkout@v4\n';
  const sched = "  schedule:\n    - cron: '0 0 * * *'";
  const run = s => `      - run: |\n${s.split('\n').map(x => '          ' + x).join('\n')}\n`;
  const cases = [
    ['thiếu ssh-key', W(sched, CO0 + run('git commit -qm "x [skip ci]"\ngit push -q origin HEAD:main')), 1],
    ['đủ', W(sched, CO + run('git commit -qm "x [skip ci]"\ngit push -q origin HEAD:main')), 0],
    ['thiếu [skip ci]', W(sched, CO + run('git commit -qm "x"\ngit push -q origin HEAD:main')), 1],
    ['bare push', W(sched, CO0 + run('git commit -m "x [skip ci]" && git push')), 1],
    ['HEAD:$BR khi chạy lịch', W(sched, CO0 + run('git push -q origin "HEAD:$BR"')), 1],
    ['nhánh brand-build* (không chạy trên main)', W("  push:\n    branches: ['brand-build*']", CO0 + run('git commit -q -m "x"; git push -q origin HEAD:${GITHUB_REF_NAME}')), 0],
    ['kho khác (cd /tmp)', W(sched, CO0 + run('cd /tmp/shorts; git commit -qm "x"\ngit push -q origin HEAD:main')), 0],
    ['git -c "có cách" push main', W(sched, CO0 + run('git -c user.name="Lexkite CI" -c user.email=a@b push -q origin HEAD:main')), 1],
    ['git stash push không phải push', W(sched, CO0 + run('git stash push -q -m x')), 0],
    ['git -C kho khác', W(sched, CO0 + run('git -C /tmp/x push -q origin HEAD:main')), 0],
    ['nhánh phụ bằng token', W(sched, CO0 + run('git push -qf "https://x-access-token:t@github.com/a/b.git" HEAD:screens')), 0],
    ['main bằng token', W(sched, CO + run('git commit -qm "x [skip ci]"\ngit push -qf "https://x-access-token:t@github.com/a/b.git" HEAD:main')), 1],
    ['tag', W(sched, CO0 + run('git push -q origin "refs/tags/$TAG"')), 0],
    ['GIT_SSH_COMMAND qua GITHUB_ENV', W(sched, CO + run('echo "GIT_SSH_COMMAND=ssh -i k" >> "$GITHUB_ENV"') + run('git commit -qm "x [skip ci]"\ngit push -q origin HEAD:main')), 1],
    ['… đã unset', W(sched, CO + run('echo "GIT_SSH_COMMAND=ssh -i k" >> "$GITHUB_ENV"') + run('unset GIT_SSH_COMMAND\ngit commit -qm "x [skip ci]"\ngit push -q origin HEAD:main')), 0],
    ['export trong bước', W(sched, CO + run('export GIT_SSH_COMMAND="ssh -i k"\ngit push -q origin HEAD:main')), 1],
    ['contents API PUT', W(sched, CO0 + run('gh api -X PUT repos/a/b/contents/x.json -f content=eA==')), 1],
    ['contents API GET', W(sched, CO0 + run('gh api "repos/a/b/contents/x.yml?ref=main"')), 0],
    ['script đẩy main thiếu khoá', W(sched, CO0 + run('node scripts/vocab-img/publish.mjs --result r.json --push')), 1],
    ['script đẩy main đủ khoá', W(sched, CO + run('node scripts/vocab-img/publish.mjs --result r.json --push')), 0],
    ['khoá có điều kiện không-PR', W(sched, `      - uses: actions/checkout@v4\n        with: { ssh-key: "\${{ github.event_name != 'pull_request' && secrets.BOT_DEPLOY_KEY || '' }}" }\n` + run('git commit -qm "x [skip ci]"\ngit push -q origin HEAD:main')), 0],
    ['khoá chỉ khi chạy trên main', W(sched, `      - uses: actions/checkout@v4\n        with: { ssh-key: "\${{ github.ref == 'refs/heads/main' && secrets.BOT_DEPLOY_KEY || '' }}" }\n` + run('git commit -qm "x [skip ci]"\ngit push -q origin HEAD:main')), 0],
    ['checkout path khác', W(sched, `      - uses: actions/checkout@v4\n        with: { path: x, ssh-key: '${KEY}' }\n` + run('git commit -qm "x [skip ci]"\ngit push -q origin HEAD:main')), 1],
    ['2 commit 1 dòng thiếu 1', W(sched, CO + run('git commit -qm "a [skip ci]"; git commit -qm "b"; git push -q origin HEAD:main')), 1],
  ];
  for (const [t, src, want] of cases) { const n = scanWorkflow('mẫu', src).errs.length; if ((n > 0) !== (want > 0)) bad(`tự kiểm "${t}": ${n} lỗi, cần ${want ? '≥1' : '0'}`); }
  if (scanScript('x', "m('commit', '-qm', `a [CF-Pages-Skip]`)").length !== 1) bad('tự kiểm script: thiếu [skip ci] phải đỏ');

  // --- repo thật ---
  const WF = '.github/workflows', found = [];
  for (const f of fs.readdirSync(WF).filter(f => /\.ya?ml$/.test(f)).sort()) {
    const { errs, pushers } = scanWorkflow(`${WF}/${f}`, fs.readFileSync(path.join(WF, f), 'utf8'));
    errs.forEach(bad); if (pushers.length) found.push(`${f}(${pushers.join(',')})`);
  }
  for (const f of Object.keys(SCRIPT_MAIN)) scanScript(f, fs.readFileSync(f, 'utf8')).forEach(bad);
  for (const f of PR_BRANCH) scanPrBranch(f, fs.readFileSync(f, 'utf8')).forEach(bad);
  for (const f of PR_UPDATE) scanPrUpdate(f, fs.readFileSync(f, 'utf8')).forEach(bad);
  const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.name === 'node_modules' ? [] : e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
  for (const f of walk('scripts').filter(f => /\.(m?js|sh|py)$/.test(f) && !f.startsWith('scripts/test/'))) {
    const s = fs.readFileSync(f, 'utf8');
    if (!/git push|'push',\s*'-q'|'push',\s*'origin'|HEAD:main/.test(s) || SCRIPT_MAIN[f] || EXTERNAL.has(f) || PR_BRANCH.has(f) || PR_UPDATE.has(f)) continue;
    bad(`${f} có git push/HEAD:main nhưng chưa phân loại – thêm vào SCRIPT_MAIN (đẩy repo chính: cần ssh-key + [skip ci]), PR_BRANCH (nhánh PR bot/…) PR_UPDATE (gộp main vào nhánh PR có sẵn) hoặc EXTERNAL (kho khác)`);
  }
  if (found.length < 30) bad(`chỉ nhận ra ${found.length} workflow đẩy main – bộ nhận diện hỏng?`);
  if (!fail) console.log(`✓ bot-push-key: ${found.length} workflow đẩy main đều qua SSH khoá deploy + [skip ci]`);
  process.exit(fail ? 1 : 0);
}
