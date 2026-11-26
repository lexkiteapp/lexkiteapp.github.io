// Mọi lời gọi api.github.com trong scripts/ phải đi qua MỘT helper (scripts/lib/retry5xx.mjs › ghFetch/retry5xx: chờ 403/429 do hạn mức theo retry-after/reset, thử lại 5xx + lỗi socket,
// đếm quota) – 26/11: pr-unconflict / ci-autopilot / main-red-retry đỏ vì 403 và "other side closed" khi dùng fetch trần. Danh sách DƯỚI là nợ cũ (ratchet CHỈ GIẢM):
// tệp mới gọi fetch trần tới api.github.com → đỏ; tệp trong danh sách đã sửa xong mà chưa gỡ khỏi danh sách → đỏ (buộc gỡ). Tệp chạy bản chép lẻ (cheap, gate-retest, gate-impact, budget-comment)
// không import được lib (bẫy ERR_MODULE_NOT_FOUND #2137) nên tự chứa logic chờ hạn mức và nằm trong danh sách.
import fs from 'node:fs';
import path from 'node:path';
const LEGACY = new Set([
  'scripts/ci/budget-comment.mjs', 'scripts/ci/cheap.mjs', 'scripts/ci/gate-impact.mjs', 'scripts/ci/gate-retest.mjs', // chạy bản chép lẻ từ main: tự chứa logic chờ hạn mức
  'scripts/audio-cdn-check.mjs', 'scripts/footage/repo-size.mjs', 'scripts/vocab-img/media-repo.mjs', 'scripts/lexicon/expand/forecast.mjs', // đọc kho/media, có vòng thử lại riêng – nợ cũ
  'scripts/seo/gsc.mjs', 'scripts/social/alert.mjs', 'scripts/video/auto.mjs', 'scripts/video/library.mjs', // gọi API ít, ngoài đường CI chính – nợ cũ
]);
const SKIP = new Set(['scripts/lib/retry5xx.mjs']);
const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? (['node_modules', 'test', '.git'].includes(e.name) ? [] : walk(path.join(d, e.name))) : /\.(mjs|js)$/.test(e.name) ? [path.join(d, e.name)] : []);
const RAW = /(?<![\w.])fetch\(\s*(`|'|")https:\/\/api\.github\.com|(?<![\w.])fetch\(\s*[`'"]\$\{?(API|GH_API|API_URL)/;
const direct = walk('scripts').filter(f => !SKIP.has(f.split(path.sep).join('/'))).filter(f => RAW.test(fs.readFileSync(f, 'utf8')) ).map(f => f.split(path.sep).join('/')).sort();
let bad = 0; const err = m => { bad++; console.error('✗ ' + m); };
for (const f of direct) if (!LEGACY.has(f)) err(`${f}: fetch trần tới api.github.com – dùng ghFetch/retry5xx (scripts/lib/retry5xx.mjs)`);
for (const f of LEGACY) if (!direct.includes(f)) err(`${f}: đã hết fetch trần – gỡ khỏi LEGACY trong scripts/test/gh-direct-fetch.mjs (ratchet chỉ giảm)`);
const lib = fs.readFileSync('scripts/lib/retry5xx.mjs', 'utf8'); if (!/export const ghFetch/.test(lib) || !/rateWaitOf/.test(lib)) err('retry5xx.mjs thiếu ghFetch/rateWaitOf');
if (bad) process.exit(1);
console.log(`✓ gh-direct-fetch: ${direct.length} tệp còn fetch trần (đều trong danh sách nợ), tệp mới đều qua helper`);
