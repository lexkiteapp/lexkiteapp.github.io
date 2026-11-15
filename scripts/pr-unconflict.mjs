// Tự gỡ xung đột ở tệp TỰ SINH cho PR đang dirty (anh 06/11: "sao xung đột hoài, có cơ chế nào thông minh hơn").
// Gốc: bot trên main sinh lại docs/CODEMAP.md + docs/codemap.json sau mỗi lần gộp (workflow codemap), còn PR cũng
// commit hai tệp đó → mỗi lần main đổi là mọi PR có sửa chúng thành dirty, GitHub không chạy check, phiên phải gỡ tay
// rồi chạy lại cả CI. scripts/test/suite.txt có merge=union trong .gitattributes nhưng GitHub không dùng driver đó.
//
// Cách gỡ (không mất nội dung, không hạ ngưỡng):
//   - docs/CODEMAP.md, docs/codemap.json: lấy bản của main. Đây là tệp tự sinh, bot main sinh lại sau khi PR gộp,
//     nên PR không cần giữ bản riêng; lấy bản main còn làm PR hết đụng hai tệp này → lần sau không xung đột nữa.
//   - scripts/test/suite.txt: gộp union 3 bên (giữ dòng của cả hai phía, bỏ dòng trùng y hệt) – đúng ý merge=union.
//   Xung đột ở BẤT KỲ tệp nào khác → bỏ qua PR đó (người phụ trách gỡ), không đẩy gì.
//
// Chống phí CI: chỉ PR không draft, cùng repo, cập nhật trong ACTIVE_H giờ (PR đang có người làm), tối đa MAX PR mỗi lượt.
// PR dirty vốn không chạy được check nào, nên đẩy bản gộp không làm phí lượt CI nào đang chạy.
//
// Chạy: node scripts/pr-unconflict.mjs [--pr=N] [--dry]   (cần GITHUB_TOKEN, GITHUB_REPOSITORY; git remote origin đẩy được)
// Test thuần (không mạng): node scripts/test/pr-unconflict.mjs
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { REGISTRIES } from './lib/fmt-registry.mjs';
import { loadDictFile, writeSrc } from './lib/i18n-pack.mjs';
import { writeFixed } from './lib/fixed-json.mjs';
import { GEN_DIRS, isGenerated } from './lib/generated.mjs';

const REGISTRY_FILES = [...new Set(REGISTRIES.map(r => r.file))];

// Báo cáo/bảng điểm do bot TRÊN MAIN sinh lại sau mỗi lần gộp (codemap, content:score đêm, world-scorecard, qa-backlog) và không có cổng "khớp nguồn" trên PR
// → lấy bản main, PR không cần giữ bản riêng (10/11: #985 xung đột LEARN.md sau content:score). Danh sách đầy đủ: docs/specs/merge-queue.md › Tệp sinh.
export const TAKE_MAIN = ['docs/CODEMAP.md', 'docs/codemap.json', 'content/pipeline/SCORE.md', 'content/pipeline/LEARN.md', 'content/pipeline/WORLD.md', 'docs/QA-BACKLOG.md',
  'reports/content-score.json', 'reports/learnability.json'];
export const LEGAL_PAGE = /^web\/(?:[a-z]{2}\/)?(?:privacy|terms|schools|credits)\.html$/; // scripts/build-legal.mjs
// Tệp sinh CÓ cổng khớp nguồn trên PR → lấy main rồi chạy lại đúng lệnh sinh trên nguồn đã gộp (regenCmds).
export const REGEN = [
  { re: /^(docs\/JOBS\.md|infra\/jobs\.json|infra\/lexicon-consumers\.json)$/, cmd: ['node', 'scripts/jobs/gen.mjs', '--write'] },
  { re: /^docs\/DESIGN-SYSTEM\.md$/, cmd: ['node', 'scripts/build-tokens.mjs'] },
  { re: LEGAL_PAGE, cmd: ['node', 'scripts/build-legal.mjs'] }, // 15/11: web/<lang>/{privacy,terms,schools,credits}.html (15 ngôn ngữ × 4) xung đột mỗi lần đổi chân trang
];
export const UNION = ['scripts/test/suite.txt', 'docs/INDEX.md']; // danh sách chỉ thêm dòng: gộp union + khử trùng (docs-budget vẫn kiểm INDEX)
// 10/11 (#934 dirty 3 lần/ngày): tệp SINH từ nguồn trong repo → lấy bản main rồi DỰNG LẠI từ nguồn đã gộp (regen), không bao giờ giữ bản sửa tay.
//   web/js/i18n/<lang> trừ en (en là nguồn), gói pathn web/cpack/lesson/pn-*, bản sao add-on extension/app, CSS Stitch biên dịch web/css/st-*.css.
export const GENERATED = /^(web\/js\/i18n\/(?!en[./])[a-z]{2,3}(\.js|\/)|web\/cpack\/lesson\/pn-[a-z]{2,3}\.js$|extension\/app\/|web\/css\/st-[\w-]+\.css$)/;
// Danh sách "mỗi mục một dòng" (scripts/fmt-stable.mjs): nguồn dịch i18n/ui + tệp có registry. Gỡ = giữ mục của CẢ HAI phía trong từng khối xung đột,
// chỉ khi khối toàn dòng mục `khóa: giá trị,` / chú thích; fmt-stable sắp lại và NÉM LỖI nếu trùng khóa (hai PR sửa cùng mục → người gỡ).
export const ENTRY_FILES = f => REGISTRY_FILES.includes(f);
export const DICT_FILES = f => /^i18n\/ui\/.+\.js$/.test(f); // nguồn dịch: gộp 3 bên THEO KHÓA (không theo dòng) – đúng cả khi hai phía khác định dạng
export const ENTRY_LINE = /^\s*(\/\/.*|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|[A-Za-z_$][\w$]*)\s*:.*,(\s*\/\/.*)?)$/;
export const FIXED_JSON = 'scripts/i18n-fixed.json'; // bản dịch tay: gộp 3 bên theo khóa/ngôn ngữ (scripts/lib/fixed-json.mjs)
export const ACTIVE_H = 24, MAX = 4;

/** Kế hoạch gỡ cho danh sách tệp xung đột: null nếu có tệp ngoài danh sách tự gỡ. */
export function plan(conflicted) {
  if (!conflicted.length) return null;
  const out = [];
  for (const f of conflicted) {
    if (TAKE_MAIN.includes(f) || GENERATED.test(f) || REGEN.some(r => r.re.test(f))) out.push({ f, how: 'main' });
    else if (UNION.includes(f)) out.push({ f, how: 'union' });
    else if (DICT_FILES(f)) out.push({ f, how: 'dict3' });
    else if (f === FIXED_JSON) out.push({ f, how: 'json3' });
    else if (ENTRY_FILES(f)) out.push({ f, how: 'entries' });
    else return null;
  }
  return out;
}

/** Gộp 3 bên một từ điển (thuần): lấy main (theirs), áp thay đổi của PR so với gốc (thêm/sửa/xoá khóa). Hai phía sửa cùng khóa khác giá trị → null (người gỡ). */
export function merge3(base, ours, theirs) {
  const out = { ...theirs };
  for (const k of new Set([...Object.keys(base), ...Object.keys(ours)])) {
    if (base[k] === ours[k]) continue;                       // PR không đổi khóa này → giữ bản main
    if (k in theirs && theirs[k] !== base[k] && theirs[k] !== ours[k]) return null; // cả hai cùng sửa khác nhau
    if (k in ours) out[k] = ours[k]; else delete out[k];
  }
  return out;
}

/** Gộp 3 bên i18n-fixed.json: theo khóa, rồi theo ngôn ngữ trong khóa (hai PR thêm bản dịch khác ngôn ngữ cho cùng chữ gốc vẫn gộp được). null nếu cùng sửa một ô khác nhau. */
export function merge3Fixed(base, ours, theirs) {
  const out = {};
  for (const k of new Set([...Object.keys(base), ...Object.keys(ours), ...Object.keys(theirs)])) {
    const [b, o, t] = [base[k], ours[k], theirs[k]], same = (x, y) => JSON.stringify(x) === JSON.stringify(y);
    let v;
    if (same(o, t)) v = o;                      // hai phía giống nhau (kể cả cùng xoá)
    else if (same(b, o)) v = t;                 // PR không đổi → bản main
    else if (same(b, t)) v = o;                 // main không đổi → bản PR
    else if (o && t && typeof o === 'object' && typeof t === 'object') { v = merge3(b && typeof b === 'object' ? b : {}, o, t); if (!v) return null; }
    else return null;
    if (v !== undefined) out[k] = v;
  }
  return out;
}

/** Gỡ khối xung đột của tệp "mỗi mục một dòng": giữ dòng của cả hai phía (bỏ dòng trùng y hệt). null nếu có khối chứa dòng không phải mục. Thuần. */
export function mergeEntries(text) {
  const lines = text.split('\n'), out = [];
  for (let i = 0; i < lines.length; i++) {
    if (!lines[i].startsWith('<<<<<<< ')) { out.push(lines[i]); continue; }
    const block = []; let side = 'o';
    for (i++; i < lines.length && !lines[i].startsWith('>>>>>>> '); i++) {
      if (lines[i].startsWith('||||||| ')) side = 'b'; else if (lines[i] === '=======') side = 't'; else if (side !== 'b') block.push(lines[i]);
    }
    if (i >= lines.length || block.some(l => l.trim() && !ENTRY_LINE.test(l))) return null;
    const seen = new Set(); for (const l of block) if (!l.trim() || !seen.has(l)) { seen.add(l); out.push(l); }
  }
  return out.join('\n');
}

/** Bỏ dòng lệnh trùng y hệt sau union, giữ thứ tự lần xuất hiện đầu; dòng trống/chú thích giữ nguyên. */
export function dedupeLines(text) {
  const seen = new Set();
  return text.split('\n').filter(l => {
    const k = l.trim();
    if (!k || k.startsWith('#')) return true;
    if (seen.has(k)) return false;
    seen.add(k); return true;
  }).join('\n');
}

/** Hàng đợi CI dài (> QUEUE_PAUSE lượt): chỉ xử lý PR dirty ĐÃ xanh (thuần) – đẩy nhánh PR chưa xanh/đang chạy làm CI chạy lại từ đầu và kéo dài hàng đợi. */
export const QUEUE_PAUSE = 60;
export const holdForQueue = (list, queued, gateOf) => queued > QUEUE_PAUSE ? list.filter(p => gateOf(p) === 'success') : list;

/** Chọn PR cần thử: dirty, không draft, cùng repo, còn hoạt động, mới nhất trước, tối đa MAX. */
export function pick(prs, now = Date.now(), repo = '') {
  return prs
    .filter(p => !p.draft && p.mergeable_state === 'dirty' && (!repo || p.head?.repo?.full_name === repo)
      && now - Date.parse(p.updated_at) <= ACTIVE_H * 3600e3)
    .sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at))
    .slice(0, MAX);
}

const git = (...a) => execFileSync('git', a, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 1 << 28 }).trim(); // maxBuffer: mặc định 1 MiB, i18n-fixed.json > 1 MiB → ENOBUFS → đọc thành {} → ghi đè {} (15/11)
const tryGit = (...a) => { try { return { ok: true, out: git(...a) }; } catch (e) { return { ok: false, out: String(e.stdout || '') + String(e.stderr || '') }; } };

/** Lỗi tạm của GitHub (5xx/429) → thử lại có giãn cách; lỗi khác ném ngay. */
export const retryable = s => s === 429 || s >= 500;
async function gh(path, tries = 4) {
  for (let i = 0; ; i++) {
    const r = await fetch(`https://api.github.com/repos/${process.env.GITHUB_REPOSITORY}${path}`, {
      headers: { authorization: `Bearer ${process.env.GITHUB_TOKEN}`, accept: 'application/vnd.github+json' } });
    if (r.ok) return r.json();
    if (i + 1 >= tries || !retryable(r.status)) throw new Error(`GitHub ${path} → HTTP ${r.status}`);
    await new Promise(res => setTimeout(res, 3000 * 2 ** i));
  }
}

/** Lấy trạng thái mergeable (GitHub tính lười: lần đầu có thể null → hỏi lại tối đa 3 lần). */
async function full(n) {
  for (let i = 0; i < 3; i++) {
    const p = await gh(`/pulls/${n}`);
    if (p.mergeable_state && p.mergeable_state !== 'unknown') return p;
    await new Promise(r => setTimeout(r, 4000));
  }
  return gh(`/pulls/${n}`);
}

/** Áp kế hoạch gỡ (plan) lên cuộc gộp đang dở: '' = xong, chuỗi = lý do phải để người gỡ. Dùng chung cho bot pr-unconflict và scripts/ci/regen-conflicts.mjs. */
export function applySteps(steps) {
  for (const { f, how } of steps) {
    if (how === 'main') git('checkout', '--theirs', '--', f);
    else if (how === 'dict3') {
      const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'unc-')), side = k => { const o = tryGit('show', `:${k}:${f}`); fs.writeFileSync(`${tmp}/${k}.js`, o.ok ? o.out : ''); try { return loadDictFile(`${tmp}/${k}.js`); } catch { return null; } };
      const [b, o, t] = [side(1), side(2), side(3)], d = b && o && t ? merge3(b, o, t) : null;
      const m3 = /^i18n\/ui\/([a-z]{2,3})(?:\/([\w-]+))?\.js$/.exec(f);
      if (!d || !m3) return `${f} hai phía cùng sửa một khóa dịch`;
      writeSrc(m3[1], m3[2] || '', d);
    } else if (how === 'json3') { // i18n-fixed.json: gộp 3 bên THEO KHÓA (cả khóa con theo ngôn ngữ), ghi lại đúng định dạng chuẩn
      const side = k => { const o = tryGit('show', `:${k}:${f}`); if (!o.ok && !/exist|not in|not at stage/i.test(o.out)) return null; /* lỗi đọc thật (không phải 'phía này không có tệp') → người gỡ, KHÔNG coi là {} */ try { return o.ok ? JSON.parse(o.out) : {}; } catch { return null; } };
      const [b, o, t] = [side(1), side(2), side(3)], d = b && o && t ? merge3Fixed(b, o, t) : null;
      if (!d) return `${f} hai phía cùng sửa một khóa/ngôn ngữ`;
      const nk = x => Object.keys(x).length; // chặn ghi: kết quả gộp không được ít khóa hơn rõ rệt so với phía lớn hơn (đọc lỗi/rỗng bất thường → ghi đè mất bản dịch, 15/11)
      if (nk(d) < 0.9 * Math.max(nk(o), nk(t))) return `${f} kết quả gộp mất khóa bất thường (${nk(d)} < 90% của ${Math.max(nk(o), nk(t))}) – người gỡ`;
      writeFixed(f, d);
    } else if (how === 'entries') {
      const t = mergeEntries(fs.readFileSync(f, 'utf8'));
      if (t === null) return `${f} xung đột ngoài dòng mục (sửa cùng chỗ)`;
      fs.writeFileSync(f, t);
    } else {
      const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'unc-')), side = k => { const out = tryGit('show', `:${k}:${f}`); fs.writeFileSync(`${tmp}/${k}`, out.ok ? out.out + '\n' : ''); return `${tmp}/${k}`; };
      const o = side(2), b = side(1), t = side(3);
      tryGit('merge-file', '--union', o, b, t);             // mã thoát = số xung đột, union không để lại dấu xung đột
      fs.writeFileSync(f, dedupeLines(fs.readFileSync(o, 'utf8')));
    }
    git('add', '--', f);
  }
  return '';
}

/** Đưa mọi tệp sinh không-commit-trong-PR (scripts/lib/generated.mjs) về đúng bản của `ref`: PR chỉ giữ NGUỒN, hết xung đột ở đó mãi mãi. Trả số tệp đã đưa về. */
export function stripGenerated(ref) {
  const inRef = new Set(git('ls-tree', '-r', '--name-only', ref, '--', ...GEN_DIRS).split('\n').filter(isGenerated));
  const cur = git('ls-files', '--', ...GEN_DIRS).split('\n').filter(isGenerated);
  const changed = git('diff', '--name-only', '--no-renames', ref, '--', ...GEN_DIRS).split('\n').filter(isGenerated);
  const put = changed.filter(f => inRef.has(f)), del = [...new Set([...cur, ...changed])].filter(f => !inRef.has(f) && fs.existsSync(f));
  for (let i = 0; i < put.length; i += 200) git('checkout', ref, '--', ...put.slice(i, i + 200));
  for (let i = 0; i < del.length; i += 200) git('rm', '-qf', '--', ...del.slice(i, i + 200));
  return put.length + del.length;
}

/** Tệp xung đột của lần fix() gần nhất (ci-autopilot dùng để báo tên tệp). */
export let lastConflicts = [];
export function fix(p, dry) {
  const br = p.head.ref;
  git('fetch', '-q', 'origin', 'main', `${br}:refs/remotes/origin/${br}`);
  git('checkout', '-q', '-f', '-B', 'unconflict', `origin/${br}`); // -f: bỏ phần dựng lại còn sót của PR trước trong cùng lượt
  const m = tryGit('merge', '--no-edit', '-m', `Gộp main vào ${br} (pr-unconflict: tự gỡ tệp tự sinh)`, 'origin/main');
  const conflicted = git('diff', '--name-only', '--diff-filter=U').split('\n').filter(Boolean);
  lastConflicts = conflicted;
  const steps = m.ok ? [] : plan(conflicted);   // gộp sạch cục bộ (GitHub tính dirty vì không dùng merge=union) → vẫn đẩy bản gộp (đã khử trùng) để PR hết dirty. fix() chỉ được gọi cho PR GitHub báo dirty (pick / conflict)
  if (!steps) { tryGit('merge', '--abort'); console.log(`#${p.number}: xung đột ở tệp người viết (${conflicted.join(', ')}) – để phiên phụ trách`); return 'manual'; }
  const bad = applySteps(steps);
  if (bad) { tryGit('merge', '--abort'); console.log(`#${p.number}: ${bad} – để phiên phụ trách`); return 'manual'; }
  // merge=union (.gitattributes) có thể gộp "sạch" mà nhân đôi dòng (06/11: #757 trùng voice-source.mjs) → luôn khử trùng tệp UNION
  for (const f of UNION) if (fs.existsSync(f)) { const a = fs.readFileSync(f, 'utf8'), b = dedupeLines(a); if (a !== b) { fs.writeFileSync(f, b); git('add', '--', f); } }
  // Dựng lại tệp sinh từ nguồn ĐÃ GỘP (định dạng + gói dịch + add-on + CSS Stitch); lỗi (vd. hai phía cùng sửa một khóa → fmt-stable báo trùng) → để người gỡ
  stripGenerated('origin/main'); // PR không giữ bản sinh (gói dịch + extension/app): CI dựng lại, bot gen-sync commit sau gộp
  const rg = regen(git('diff', '--name-only', `origin/${br}`).split('\n').filter(Boolean).map(f => ({ f }))); // mọi tệp main mang vào, kể cả phần gộp sạch
  if (rg) { tryGit('merge', '--abort'); tryGit('reset', '-q', '--hard', `origin/${br}`); console.log(`#${p.number}: dựng lại lỗi (${rg}) – để phiên phụ trách`); return 'manual'; }
  if (!m.ok) git('commit', '-q', '--no-edit');
  else if (tryGit('diff', '--cached', '--quiet').ok === false) git('commit', '-q', '--amend', '--no-edit');
  if (dry) { console.log(`#${p.number}: [dry] gỡ được ${(steps.map(s => `${s.f}=${s.how}`).join(', ') || 'gộp sạch')}`); return 'dry'; }
  const push = tryGit('push', '-q', 'origin', `HEAD:refs/heads/${br}`);   // không force: nhánh vừa đổi thì bỏ qua, lượt sau thử lại
  console.log(push.ok ? `#${p.number}: ✓ đã gỡ ${steps.map(s => s.f).join(', ') || '(gộp sạch)'} và đẩy ${br}` : `#${p.number}: nhánh vừa đổi, không đẩy (${push.out.split('\n')[0]})`);
  return push.ok ? 'fixed' : 'raced';
}

/** Lệnh dựng lại sau khi gộp (thuần, để test): theo loại tệp đã gỡ. */
export function regenCmds(steps) { // steps: [{ f }] tệp đổi so với nhánh PR
  const fs_ = steps.map(s => s.f), any = re => fs_.some(f => re.test(f)), cmds = [];
  if (any(/^(i18n\/ui\/|web\/js\/i18n\/|web\/cpack\/lesson\/pn-|extension\/app\/)/) || fs_.some(f => REGISTRY_FILES.includes(f))) cmds.push(['node', 'scripts/fmt-stable.mjs']); // gói dịch + extension/app KHÔNG dựng/commit trong PR (scripts/lib/generated.mjs)
  for (const r of REGEN) if (any(r.re)) cmds.push(r.cmd);
  if (any(/^web\/css\/st-/) || fs_.includes('scripts/build-stitch-css.mjs')) cmds.push(['node', 'scripts/build-stitch-css.mjs']);
  return cmds;
}
const REGEN_PATHS = ['docs/JOBS.md', 'infra/jobs.json', 'infra/lexicon-consumers.json', 'docs/DESIGN-SYSTEM.md', 'i18n/ui', 'web/css', ...REGISTRY_FILES];
export function regen(steps) {
  if (!steps.length) return '';
  for (const c of regenCmds(steps)) { try { execFileSync(c[0], c.slice(1), { stdio: ['ignore', 'ignore', 'pipe'], encoding: 'utf8' }); } catch (e) { return `${c.join(' ')}: ${String(e.stderr || e.message).trim().split('\n').pop()}`; } }
  if (fs.existsSync('scripts/fmt-stable.mjs')) { try { execFileSync('node', ['scripts/fmt-stable.mjs', '--check'], { stdio: 'ignore' }); } catch { return 'fmt-stable --check'; } }
  const ps = REGEN_PATHS.filter(f => fs.existsSync(f)); if (ps.length) git('add', '-A', '--', ...ps);
  if (steps.some(s => LEGAL_PAGE.test(s.f))) { const pg = git('ls-files', 'web').split('\n').filter(p => LEGAL_PAGE.test(p)); if (pg.length) git('add', '-A', '--', ...pg); }
  return '';
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const arg = k => (process.argv.find(a => a.startsWith(`--${k}=`)) || '').split('=')[1];
  const dry = process.argv.includes('--dry');
  git('config', 'user.name', 'Lexkite CI'); git('config', 'user.email', 'lexkiteapp@users.noreply.github.com');
  let list;
  if (arg('pr')) list = [await full(arg('pr'))].filter(p => p.mergeable_state === 'dirty');
  else {
    const open = (await gh('/pulls?state=open&per_page=100')).filter(p => !p.draft && Date.now() - Date.parse(p.updated_at) <= ACTIVE_H * 3600e3);
    const withState = [];
    // Một PR lỗi API không được làm chết cả lượt: bỏ qua PR đó, xử lý các PR còn lại.
    for (const p of open) { try { withState.push(await full(p.number)); } catch (e) { console.warn(`bỏ qua #${p.number}: ${e.message}`); } }
    list = pick(withState, Date.now(), process.env.GITHUB_REPOSITORY);
  }
  if (!arg('pr') && !dry) try {
    const queued = (await gh('/actions/runs?status=queued&per_page=1')).total_count || 0, gates = new Map();
    for (const p of list) { const st = (await gh(`/commits/${p.head.sha}/status?per_page=100`)).statuses || []; gates.set(p.number, st.find(x => x.context === 'required-gate')?.state); }
    const kept = holdForQueue(list, queued, p => gates.get(p.number));
    if (kept.length !== list.length) console.log(`pr-unconflict: hàng đợi ${queued} > ${QUEUE_PAUSE} → hoãn ${list.length - kept.length} PR chưa xanh`);
    list = kept;
  } catch (e) { console.warn('không đo được hàng đợi (xử lý như thường): ' + e.message); }
  const res = {};
  for (const p of list) { const r = fix(p, dry); res[r] = (res[r] || 0) + 1; }
  console.log(`pr-unconflict: ${list.length} PR dirty đang hoạt động →`, JSON.stringify(res));
}
