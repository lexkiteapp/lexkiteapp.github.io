// Chính sách ffmpeg trong CI (5/11): `apt-get install ffmpeg` treo 12+ phút, job bị huỷ 2 lần (theme-qa, teacher-bubble).
// ffmpeg CHỈ qua `./.github/actions/setup-ffmpeg` (bản tĩnh BtbN, cache khoá `ffmpeg-n8.1-linux64-gpl-v1`, có timeout):
//  1) không workflow/action nào (ngoài chính action đó) cài ffmpeg bằng apt/apt-get, npm `ffmpeg-static`, hay tự curl BtbN FFmpeg-Builds;
//  2) workflow dùng action phải có actions/checkout (action nằm trong repo, phải checkout trước);
//  3) action giữ khoá cache, đường dẫn ~/ffbin, `timeout` + `--max-time` cho curl, kiểm `ffmpeg -version`, symlink ffmpeg + ffprobe.
// Quy ước CI chung: docs/CI-RUNNERS.md. Chạy: node scripts/test/ffmpeg-setup-policy.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const ACTION = '.github/actions/setup-ffmpeg/action.yml';

/** Lỗi trong 1 file workflow/action (thuần): dòng logic (nối `\`), bỏ comment. */
export function scan(name, src) {
  const errs = [];
  const logical = String(src).replace(/\\\r?\n/g, ' ').split('\n');
  logical.forEach((raw, i) => {
    const l = raw.replace(/(^|\s)#.*$/, '');
    if (/\bapt(-get)?\b[^\n&;|]*\bffmpeg\b/.test(l)) errs.push(`${name}:${i + 1} cài ffmpeg bằng apt – dùng ./.github/actions/setup-ffmpeg`);
    if (/ffmpeg-static/.test(l)) errs.push(`${name}:${i + 1} npm ffmpeg-static – dùng ./.github/actions/setup-ffmpeg`);
    if (/FFmpeg-Builds/.test(l)) errs.push(`${name}:${i + 1} tự tải BtbN FFmpeg-Builds – dùng ./.github/actions/setup-ffmpeg`);
  });
  // action nằm trong repo: trong CÙNG job phải có actions/checkout trước nó (checkout thưa thì danh sách phải gồm .github/actions)
  if (/\/workflows\//.test(name)) {
    let seen = false;
    String(src).split('\n').forEach((l, i) => {
      if (/^  [\w-]+:\s*(#.*)?$/.test(l)) seen = false;
      if (/actions\/checkout@/.test(l)) seen = true;
      if (/uses:\s*\.\/\.github\/actions\/setup-ffmpeg/.test(l) && !seen) errs.push(`${name}:${i + 1} setup-ffmpeg trước actions/checkout của job – action chưa có trên đĩa`);
    });
  }
  return errs;
}

/** Lỗi của chính action (thuần). */
export function checkAction(src) {
  const e = [];
  if (!/key:\s*ffmpeg-n8\.1-linux64-gpl-v1/.test(src)) e.push('action mất khoá cache ffmpeg-n8.1-linux64-gpl-v1');
  if (!/path:\s*~\/ffbin/.test(src)) e.push('action mất đường dẫn cache ~/ffbin');
  if (!/\btimeout \d+ curl\b/.test(src)) e.push('action thiếu `timeout N curl`');
  if (!/--max-time \d+/.test(src)) e.push('action thiếu curl --max-time');
  if (!/--retry \d+/.test(src)) e.push('action thiếu curl --retry');
  if (!/ffmpeg -version/.test(src)) e.push('action thiếu kiểm `ffmpeg -version`');
  if (!/ln -sf ~\/ffbin\/ffmpeg \/usr\/local\/bin\/ffmpeg/.test(src) || !/ln -sf ~\/ffbin\/ffprobe \/usr\/local\/bin\/ffprobe/.test(src)) e.push('action thiếu symlink ffmpeg + ffprobe vào /usr/local/bin');
  return e;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  let fail = 0; const bad = m => { console.error('✗ ' + m); fail = 1; };
  const W = (run, extra = '') => `jobs:\n  a:\n    steps:\n      - uses: actions/checkout@v4\n${extra}      - run: ${run}\n`;
  const cases = [
    ['apt ffmpeg', W('sudo apt-get update -qq && sudo apt-get install -y -qq ffmpeg >/dev/null'), 1],
    ['apt ffmpeg + espeak', W('sudo apt-get install -y -qq espeak-ng ffmpeg'), 1],
    ['apt trần', W('sudo apt install ffmpeg'), 1],
    ['npm ffmpeg-static', W('npm i ffmpeg-static'), 1],
    ['curl BtbN', W('curl -fsSL https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/x.tar.xz'), 1],
    ['apt chỉ font', W('sudo apt-get install -y -qq fonts-dejavu-core unzip'), 0],
    ['comment nhắc apt ffmpeg', W('echo ok   # apt-get install ffmpeg treo 12 phút'), 0],
    ['dùng action', W('ffmpeg -version', '      - uses: ./.github/actions/setup-ffmpeg\n'), 0],
    ['action thiếu checkout', 'jobs:\n  a:\n    steps:\n      - uses: ./.github/actions/setup-ffmpeg\n', 1],
  ];
  for (const [t, src, want] of cases) { const n = scan('.github/workflows/mẫu.yml', src).length; if ((n > 0) !== (want > 0)) bad(`tự kiểm "${t}": ${n} lỗi, cần ${want ? '≥1' : '0'}`); }
  const okAct = fs.readFileSync(path.join(ROOT, ACTION), 'utf8');
  if (checkAction(okAct.replace('ffmpeg-n8.1-linux64-gpl-v1', 'x')).length !== 1) bad('tự kiểm: bỏ khoá cache phải bị bắt');
  if (!checkAction(okAct.replace(/timeout 240 /, '')).length) bad('tự kiểm: bỏ timeout phải bị bắt');
  checkAction(okAct).forEach(bad);
  let n = 0;
  for (const d of ['.github/workflows', '.github/actions']) {
    const files = d.endsWith('workflows') ? fs.readdirSync(path.join(ROOT, d)).filter(f => /\.ya?ml$/.test(f)).map(f => `${d}/${f}`)
      : fs.readdirSync(path.join(ROOT, d)).map(a => `${d}/${a}/action.yml`).filter(f => fs.existsSync(path.join(ROOT, f)));
    for (const f of files.sort()) { if (f === ACTION) continue; n++; scan(f, fs.readFileSync(path.join(ROOT, f), 'utf8')).forEach(bad); }
  }
  if (n < 30) bad(`chỉ thấy ${n} workflow/action – sai thư mục?`);
  if (!fail) console.log(`✓ ffmpeg-setup-policy: ${n} workflow/action, ffmpeg chỉ qua ./.github/actions/setup-ffmpeg`);
  process.exit(fail ? 1 : 0);
}
