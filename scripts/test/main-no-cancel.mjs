// 21/11 (điều phối, luật 18): việc nặng chạy SAU gộp trên push main nên KHÔNG workflow nào có `push: branches: [main]` được huỷ lượt đang chạy trên main –
// concurrency cancel-in-progress vô điều kiện làm lượt main bị huỷ mỗi lần gộp (stitch-diff shard 1 luôn 'cancelled', drift không ai thấy). GitHub giữ 1 chạy + 1 chờ
// (lượt chờ mới thay lượt chờ cũ) → tải không nhân đôi và commit mới nhất luôn được kiểm trọn. Cho phép: false, hoặc biểu thức loại trừ push (== 'pull_request', != 'push', ref != main…).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const WF = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '.github/workflows');
const onBlock = t => (t.match(/^on:\n([\s\S]*?)(?=^\S)/m) || [, ''])[1];
export const pushesMain = t => /^  push:/m.test(onBlock(t)) && /branches:.*main/.test(onBlock(t));
/** Biểu thức cancel-in-progress có huỷ lượt push main không (thuần). */
export function cancelsPush(expr) {
  const e = String(expr || '').trim().replace(/\s+#.*$/, '');
  if (!e || /^false\b/.test(e)) return false;
  if (/^true\b/.test(e)) return true;
  if (/!=\s*'push'/.test(e) || /ref\s*!=\s*'refs\/heads\/main'/.test(e)) return false;
  if (/event_name\s*==\s*'pull_request'/.test(e) && !/'push'/.test(e)) return false;
  return true;   // không chứng minh được là loại trừ push → coi là huỷ
}
export function problems(text) {
  if (!pushesMain(text)) return [];
  const m = text.match(/^concurrency:\n((?:[ \t]+.*\n)+)/m); if (!m) return [];
  const c = (m[1].match(/^\s+cancel-in-progress:\s*(.+)$/m) || [])[1];
  return cancelsPush(c ? c.replace(/^\$\{\{\s*|\s*\}\}$/g, '') : '') ? [`cancel-in-progress (${c}) huỷ lượt push main – dùng \`\${{ github.event_name != 'push' }}\``] : [];
}
let bad = 0, n = 0; const fail = m => { bad++; console.log('✗ ' + m); };
const t = (name, text, want) => { n++; if (!!problems(text).length !== want) fail('bộ bắt lỗi sai: ' + name); };
const w = c => `on:\n  push:\n    branches: [main]\nconcurrency:\n  group: g\n  cancel-in-progress: ${c}\njobs: {}\n`;
t('true', w('true'), true); t('pr+push', w("${{ github.event_name == 'pull_request' || github.event_name == 'push' }}"), true);
t('dispatch', w("${{ github.event_name != 'workflow_dispatch' }}"), true);
t('false', w('false'), false); t('!= push', w("${{ github.event_name != 'push' }}"), false); t('pr', w("${{ github.event_name == 'pull_request' }}"), false);
t('ref main', w("${{ github.ref != 'refs/heads/main' }}"), false);
t('không push', 'on:\n  pull_request:\nconcurrency:\n  group: g\n  cancel-in-progress: true\njobs: {}\n', false);
for (const f of fs.readdirSync(WF).filter(f => /\.ya?ml$/.test(f))) { n++; for (const p of problems(fs.readFileSync(path.join(WF, f), 'utf8'))) fail(`${f}: ${p}`); }
const sd = fs.readFileSync(path.join(WF, 'stitch-diff.yml'), 'utf8');
n++; if (!/- uses: \.\/\.github\/actions\/playwright-cache\n\s+if: always\(\)/.test(sd)) fail('stitch-diff.yml: bước playwright-cache phải `if: always()` (bước trước đỏ không được làm mất cache)');
if (bad) { console.log(`✗ main-no-cancel: ${bad}/${n} lỗi`); process.exit(1); }
console.log(`✓ main-no-cancel: ${n} kiểm tra – không workflow push main nào huỷ lượt main`);
