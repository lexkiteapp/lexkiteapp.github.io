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
import { normSrc } from './lib/i18n-src.mjs';

export const TAKE_MAIN = ['docs/CODEMAP.md', 'docs/codemap.json'];
export const UNION = ['scripts/test/suite.txt', 'docs/INDEX.md']; // danh sách chỉ thêm dòng: gộp union + khử trùng (docs-budget vẫn kiểm INDEX)
export const ACTIVE_H = 24, MAX = 4;
// i18n (10/11 #934/#983 xung đột liên tục): nguồn i18n/ui mỗi khóa một dòng → hợp dòng + chuẩn hóa (scripts/lib/i18n-src.mjs);
// gói SINH (khóa băm web/js/i18n/<lang> ngoài en, bản chép extension/app/js/i18n) → lấy main rồi SINH LẠI từ nguồn đã gộp (i18n-pack + build-extension).
export const I18N_SRC = /^i18n\/ui\/[a-z]{2}(\/[^/]+)?\.js$/;
export const I18N_GEN = /^(web\/js\/i18n\/(?!en[./])[a-z]{2}(\.js|\/[^/]+\.js)|extension\/app\/js\/i18n\/.+\.js)$/;

/** Kế hoạch gỡ cho danh sách tệp xung đột: null nếu có tệp ngoài danh sách tự gỡ. */
export function plan(conflicted) {
  if (!conflicted.length) return null;
  const out = [];
  for (const f of conflicted) {
    if (TAKE_MAIN.includes(f)) out.push({ f, how: 'main' });
    else if (UNION.includes(f)) out.push({ f, how: 'union' });
    else if (I18N_SRC.test(f)) out.push({ f, how: 'i18n-src' });
    else if (I18N_GEN.test(f)) out.push({ f, how: 'regen' });
    else return null;
  }
  return out;
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

/** Chọn PR cần thử: dirty, không draft, cùng repo, còn hoạt động, mới nhất trước, tối đa MAX. */
export function pick(prs, now = Date.now(), repo = '') {
  return prs
    .filter(p => !p.draft && p.mergeable_state === 'dirty' && (!repo || p.head?.repo?.full_name === repo)
      && now - Date.parse(p.updated_at) <= ACTIVE_H * 3600e3)
    .sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at))
    .slice(0, MAX);
}

const git = (...a) => execFileSync('git', a, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const tryGit = (...a) => { try { return { ok: true, out: git(...a) }; } catch (e) { return { ok: false, out: String(e.stdout || '') + String(e.stderr || '') }; } };

async function gh(path) {
  const r = await fetch(`https://api.github.com/repos/${process.env.GITHUB_REPOSITORY}${path}`, {
    headers: { authorization: `Bearer ${process.env.GITHUB_TOKEN}`, accept: 'application/vnd.github+json' } });
  if (!r.ok) throw new Error(`GitHub ${path} → HTTP ${r.status}`);
  return r.json();
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

export function fix(p, dry) {
  const br = p.head.ref;
  git('fetch', '-q', 'origin', 'main', `${br}:refs/remotes/origin/${br}`);
  git('checkout', '-q', '-B', 'unconflict', `origin/${br}`);
  const m = tryGit('merge', '--no-edit', '-m', `Gộp main vào ${br} (pr-unconflict: tự gỡ tệp tự sinh)`, 'origin/main');
  const conflicted = git('diff', '--name-only', '--diff-filter=U').split('\n').filter(Boolean);
  const steps = m.ok ? [] : plan(conflicted);   // gộp sạch cục bộ (GitHub tính cũ) → vẫn đẩy bản gộp để PR hết dirty
  if (!steps) { tryGit('merge', '--abort'); console.log(`#${p.number}: xung đột ở tệp người viết (${conflicted.join(', ')}) – để phiên phụ trách`); return 'manual'; }
  for (const { f, how } of steps) {
    if (how === 'main' || how === 'regen') git('checkout', '--theirs', '--', f);
    else {
      const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'unc-')), side = k => { const out = tryGit('show', `:${k}:${f}`); fs.writeFileSync(`${tmp}/${k}`, out.ok ? out.out + '\n' : ''); return `${tmp}/${k}`; };
      const o = side(2), b = side(1), t = side(3);
      tryGit('merge-file', '--union', o, b, t);             // mã thoát = số xung đột, union không để lại dấu xung đột
      const u = fs.readFileSync(o, 'utf8');
      fs.writeFileSync(f, how === 'i18n-src' ? normSrc(u) : dedupeLines(u));
    }
    git('add', '--', f);
  }
  if (steps.some(s => s.how === 'regen' || s.how === 'i18n-src')) {   // gói sinh khớp nguồn đã gộp (i18n-pack --check trong npm test)
    execFileSync('bash', ['scripts/build-extension.sh'], { stdio: 'ignore' });   // chạy i18n-pack rồi chép sang add-on
    git('add', '-A', '--', 'web/js/i18n', 'extension/app/js/i18n');
  }
  // merge=union (.gitattributes) có thể gộp "sạch" mà nhân đôi dòng (06/11: #757 trùng voice-source.mjs) → luôn khử trùng tệp UNION
  for (const f of UNION) if (fs.existsSync(f)) { const a = fs.readFileSync(f, 'utf8'), b = dedupeLines(a); if (a !== b) { fs.writeFileSync(f, b); git('add', '--', f); } }
  if (!m.ok) git('commit', '-q', '--no-edit');
  else if (tryGit('diff', '--cached', '--quiet').ok === false) git('commit', '-q', '--amend', '--no-edit');
  if (dry) { console.log(`#${p.number}: [dry] gỡ được ${(steps.map(s => `${s.f}=${s.how}`).join(', ') || 'gộp sạch')}`); return 'dry'; }
  const push = tryGit('push', '-q', 'origin', `HEAD:refs/heads/${br}`);   // không force: nhánh vừa đổi thì bỏ qua, lượt sau thử lại
  console.log(push.ok ? `#${p.number}: ✓ đã gỡ ${steps.map(s => s.f).join(', ') || '(gộp sạch)'} và đẩy ${br}` : `#${p.number}: nhánh vừa đổi, không đẩy (${push.out.split('\n')[0]})`);
  return push.ok ? 'fixed' : 'raced';
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
    for (const p of open) withState.push(await full(p.number));
    list = pick(withState, Date.now(), process.env.GITHUB_REPOSITORY);
  }
  const res = {};
  for (const p of list) { const r = fix(p, dry); res[r] = (res[r] || 0) + 1; }
  console.log(`pr-unconflict: ${list.length} PR dirty đang hoạt động →`, JSON.stringify(res));
}
