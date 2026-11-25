// Cache kết quả ĐẠT theo hash input của từng test (25/11, điều phối: npm test shard = 48 % phút-job). Độ phủ KHÔNG đổi: test chạy lại khi bất kỳ input nào đổi,
// khi nó không chứng minh được tập input (deny-list → luôn chạy), và MỌI đêm main chạy đầy đủ không cache (NO_TEST_CACHE=1) để bắt dò input sai.
// Nguyên tắc an toàn: chỉ test "thuần" – `node scripts/<…>.mjs [đối số đơn giản]`, mã (cùng mọi tệp import tương đối) KHÔNG đọc thời gian/mạng/tiến trình con/env/git,
// và mọi chuỗi trong mã (+ đối số) trỏ tới tệp/thư mục ĐÃ commit đều là input (thư mục = hash cây của nó). Chuỗi trỏ tới tệp CHƯA commit (sinh ra khi chạy) → không cache.
// Hash = sha1(phiên bản cache + node + lockfile + lệnh + input). Sổ: { pass: { hash: { cmd, t } }, bad: { cmd: t } } (xem scripts/test/run-suite.mjs, npm-test.yml).
// Test thuần: scripts/test/test-cache.mjs.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

export const VERSION = 1;
const sha1 = s => crypto.createHash('sha1').update(s).digest('hex');
/** Lệnh đơn giản chạy MỘT tệp node: `node scripts/x.mjs [--cờ] [đường/dẫn] …`, không shell (|, &&, >, $, `, ;, ngoặc). */
export const SIMPLE_CMD = /^node (scripts\/[\w./-]+\.m?js)((?: [\w./=:+@-]+)*)$/;
/** Mã có hành vi phụ thuộc ngoài input tệp → không bao giờ cache (thời gian, ngẫu nhiên, mạng, tiến trình con, env, git, native module). */
export const DENY = [
  [/\bfetch\(|\bXMLHttpRequest\b|node:https?\b|from ['"]https?['"]|require\(['"]https?['"]\)|\bWebSocket\b|node:net\b|node:dgram\b|node:dns\b/, 'mạng'],
  [/\bnew Date\(\s*\)|\bnew Date\b(?!\()|\bMath\.random\b|randomUUID|randomBytes/, 'ngày giờ hiện tại/ngẫu nhiên'],
  [/\bprocess\.env\b|\bos\.(hostname|cpus|homedir|userInfo)\b/, 'môi trường'],
  [/['"`]git['"` ]|\bgit (diff|log|ls-files|rev-parse|show|status|merge-base)\b/, 'trạng thái git'],
  [/\bplaywright\b|\bpuppeteer\b|\bchromium\b|\bsharp\b|\bffmpeg\b|\bwrangler\b|\bonnxruntime\b|\bkokoro\b/i, 'trình duyệt/binary ngoài'],
];
/** Ngoại lệ có điều kiện (kiểm trên mã đã bỏ chú thích): tiến trình con chỉ được chạy `node`/process.execPath; ghi tệp chỉ vào thư mục tạm. */
export function conditionalDeny(src) {
  for (const m of src.matchAll(/\b(?:execSync|execFileSync|spawnSync|spawn|exec|execFile|fork)\(\s*([^,)]*)/g)) {
    if (!/^(process\.execPath|['"`]node\b[^'"`]*['"`])\s*$/.test(m[1].trim()) && !/^['"`]node\b/.test(m[1].trim())) return 'tiến trình con không phải node: ' + m[1].trim().slice(0, 40);
  }
  if (/\bchild_process\b/.test(src) && /\b(exec|spawn)(Sync)?\(\s*[`'"](?!node)/.test(src)) return 'tiến trình con không phải node';
  if (/\b(writeFileSync|writeFile|appendFileSync|mkdirSync|rmSync|unlinkSync|copyFileSync|renameSync|createWriteStream)\b/.test(src)
    && (!/\btmpdir\b|\bmkdtemp(Sync)?\b/.test(src) || /\b(writeFileSync|appendFileSync|copyFileSync|renameSync|mkdirSync)\(\s*['"`](?!\/)/.test(src))) return 'ghi tệp ngoài thư mục tạm';
  return '';
}
const IMPORT_RE = /(?:^|[\s;(])(?:import\s+(?:[^'"()]*?\s+from\s+)?|export\s+[^'"()]*?\s+from\s+|import\(\s*|require\(\s*)['"]([^'"]+)['"]/g;
/** Chuỗi trong mã: nháy đơn/kép, và phần tĩnh đầu của template có ${}. */
export function stringsOf(src) {
  const out = new Set();
  for (const m of src.matchAll(/'((?:[^'\\\n]|\\.)*)'|"((?:[^"\\\n]|\\.)*)"/g)) out.add(m[1] ?? m[2]);
  for (const m of src.matchAll(/`((?:[^`\\]|\\.)*)`/g)) out.add(m[1].split('${')[0]);
  return [...out].filter(s => s && s.length < 300);
}
/** Ngữ cảnh git: map đường dẫn đã commit → blob sha, cache theo lần gọi. */
export function gitContext(root, run = a => execFileSync('git', a, { cwd: root, encoding: 'utf8', maxBuffer: 1 << 28 })) {
  const files = new Map();
  for (const l of run(['ls-files', '-s', '-z']).split('\0').filter(Boolean)) { const m = /^\d+ ([0-9a-f]{40}) \d\t(.*)$/s.exec(l); if (m) files.set(m[2], m[1]); }
  const sorted = [...files.keys()].sort();
  return { files, sorted };
}
/** Hash cây (mọi tệp đã commit dưới `dir/`), thuần theo bản đồ git. */
export function dirHash(ctx, dir) {
  const pre = dir.replace(/\/+$/, '') + '/', h = crypto.createHash('sha1');
  // nhị phân trên mảng đã sắp để lấy khoảng tiền tố
  let lo = 0, hi = ctx.sorted.length; while (lo < hi) { const mid = (lo + hi) >> 1; if (ctx.sorted[mid] < pre) lo = mid + 1; else hi = mid; }
  let n = 0; for (let i = lo; i < ctx.sorted.length && ctx.sorted[i].startsWith(pre); i++) { h.update(ctx.sorted[i] + '\0' + ctx.files.get(ctx.sorted[i]) + '\n'); n++; }
  return n ? h.digest('hex') : null;
}
/**
 * Phân loại + tập input của lệnh. ctx: gitContext; read(f) đọc tệp (mặc định đĩa); exists(p) cho "chuỗi trỏ tới tệp chưa commit".
 * → { cacheable, reason?, inputs: ['f:path:blob' | 'd:dir:hash'] }.
 */
export function analyze(cmd, ctx, { root = process.cwd(), read = f => fs.readFileSync(path.join(root, f), 'utf8'), exists = p => fs.existsSync(path.join(root, p)) } = {}) {
  const m = SIMPLE_CMD.exec(cmd);
  if (!m) return { cacheable: false, reason: 'lệnh không đơn giản (shell/đối số lạ)', inputs: [] };
  const inputs = new Set(), seen = new Set(), queue = [m[1]], data = new Set();
  const addFile = p => { const b = ctx.files.get(p); if (b) { inputs.add(`f:${p}:${b}`); return true; } return false; };
  const addDir = d => { const h = dirHash(ctx, d); if (h) { inputs.add(`d:${d.replace(/\/+$/, '')}:${h}`); return true; } return false; };
  const resolveToken = (s, fromDir) => {
    const t = s.replace(/^\.\//, '');
    if (!/[\w]/.test(t) || /^[a-z]+:\/\//i.test(t) || t.startsWith('node:')) return 'skip';
    for (const base of ['', fromDir ? fromDir + '/' : '']) {
      const p = path.posix.normalize(base + t).replace(/^\.\//, '');
      if (p.startsWith('..') || p.startsWith('/')) continue;
      if (ctx.files.has(p)) { addFile(p); return 'file'; }
      if (addDir(p)) return 'dir';
      // tiền tố tên tệp/thư mục chưa đầy đủ (vd 'web/js/i18n/' + lang): thư mục cha
      if (t.endsWith('/') === false && /\/[\w.-]*$/.test(p) && !path.posix.extname(p)) { const parent = path.posix.dirname(p); if (parent !== '.' && addDir(parent)) return 'dir'; }
      if (exists(p)) return 'untracked';   // có trên đĩa nhưng không commit → test đọc trạng thái sinh ra khi chạy
    }
    return 'skip';
  };
  for (const a of m[2].trim().split(/\s+/).filter(Boolean)) { const r = resolveToken(a.replace(/^--?[\w-]+=?/, ''), ''); if (r === 'untracked') return { cacheable: false, reason: `đối số trỏ tới tệp chưa commit: ${a}`, inputs: [] }; }
  while (queue.length) {
    const f = queue.shift(); if (seen.has(f)) continue; seen.add(f);
    let src; try { src = read(f); } catch { return { cacheable: false, reason: `không đọc được ${f}`, inputs: [] }; }
    if (!addFile(f)) return { cacheable: false, reason: `${f} chưa commit`, inputs: [] };
    const code = src.replace(/^\s*\/\/.*$/gm, '');
    for (const [re, why] of DENY) if (re.test(code)) return { cacheable: false, reason: `${f}: ${why}`, inputs: [] };
    { const cd = conditionalDeny(code); if (cd) return { cacheable: false, reason: `${f}: ${cd}`, inputs: [] }; }
    const fromDir = path.posix.dirname(f);
    for (const im of src.matchAll(IMPORT_RE)) {
      const spec = im[1];
      if (spec.startsWith('node:') || !/^[./]/.test(spec)) continue;   // gói npm: khóa theo lockfile
      const p = path.posix.normalize(path.posix.join(fromDir, spec));
      const cand = [p, p + '.mjs', p + '.js', p + '/index.mjs', p + '/index.js'].find(x => ctx.files.has(x));
      if (!cand) return { cacheable: false, reason: `import ${spec} không tìm thấy trong tệp đã commit (${f})`, inputs: [] };
      queue.push(cand);
    }
    for (const s of stringsOf(src)) {
      if (/\.(m?js|cjs)$/.test(s)) { const q = [s.replace(/^\.\//, ''), path.posix.normalize(path.posix.join(fromDir, s))].find(x => ctx.files.has(x) && !seen.has(x)); if (q && q.startsWith('scripts/')) queue.push(q); }
      const r = resolveToken(s, fromDir); if (r === 'untracked') return { cacheable: false, reason: `${f}: đọc tệp chưa commit '${s.slice(0, 60)}'`, inputs: [] }; }
  }
  return { cacheable: true, inputs: [...inputs].sort() };
}
/** Hash cuối của (lệnh, input); null nếu không cache được. */
export function hashOf(cmd, ctx, opts = {}) {
  const a = analyze(cmd, ctx, opts); if (!a.cacheable) return { hash: null, reason: a.reason };
  const lock = ctx.files.get('package-lock.json') || '';
  return { hash: sha1([VERSION, opts.node ?? process.versions.node.split('.')[0], lock, cmd, ...a.inputs].join('\n')), n: a.inputs.length };
}
export const emptyLedger = () => ({ v: VERSION, pass: {}, bad: {} });
export function loadLedger(file) { try { const j = JSON.parse(fs.readFileSync(file, 'utf8')); return j && j.v === VERSION ? { v: VERSION, pass: j.pass || {}, bad: j.bad || {} } : emptyLedger(); } catch { return emptyLedger(); } }
/** Hàm thuần: có được bỏ qua test này không (đạt cùng hash, lệnh không bị đánh dấu sai, không tắt cache). */
export const canSkip = (ledger, cmd, hash, { disabled = false } = {}) => !disabled && !!hash && !ledger.bad[cmd] && !!ledger.pass[hash];
/** Hàm thuần: ghi đạt (giữ tối đa `max` mục mới nhất để sổ không phình). */
export function recordPass(ledger, cmd, hash, now = new Date().toISOString(), max = 3000) {
  ledger.pass[hash] = { cmd, t: now };
  const keys = Object.keys(ledger.pass); if (keys.length > max) for (const k of keys.sort((a, b) => String(ledger.pass[a].t).localeCompare(String(ledger.pass[b].t))).slice(0, keys.length - max)) delete ledger.pass[k];
  return ledger;
}
/** Đêm (không cache): test ĐỎ mà sổ từng cho "đạt" cùng hash → dò input sai: đánh dấu bad (không cache nữa) và trả danh sách để báo issue. */
export function flagFalsePass(ledger, cmd, hash, now = new Date().toISOString()) {
  if (!hash || !ledger.pass[hash]) return false;
  delete ledger.pass[hash]; ledger.bad[cmd] = now; return true;
}
