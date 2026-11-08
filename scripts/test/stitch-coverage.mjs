// 🧩 Bản đồ phủ Stitch (docs/STITCH-COVERAGE.md ← docs/stitch-coverage.json, chạy trong npm test).
//   Nguồn duy nhất = docs/stitch-coverage.json (mỗi bề mặt: trạng thái, id Stitch sáng/tối, cổng SSIM, lô port).
//   Kiểm: (1) mọi route hash của app (`routes.x =` trong web/js) đã được phân loại; (2) dòng 'stitch' có id có thật trong brand/stitch/v2/.index.txt
//   và cổng 'diff:<khóa>' có trong SCREENS (stitch-screens.mjs); (3) md khớp JSON; (4) báo số màn chưa có Stitch theo lô.
//   Hiện CHỈ CẢNH BÁO (::warning::, exit 0). Khi danh sách về 0 → đặt "enforce": true trong JSON → vấn đề thành lỗi (exit 1).
//   Dùng: node scripts/test/stitch-coverage.mjs [--write]  (--write sinh lại md)
import fs from 'node:fs'; import path from 'node:path';
const J = 'docs/stitch-coverage.json', MD = 'docs/STITCH-COVERAGE.md', write = process.argv.includes('--write');
const cov = JSON.parse(fs.readFileSync(J, 'utf8')), S = cov.surfaces, warns = [];
const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : e.name.endsWith('.js') ? [path.join(d, e.name)] : []);
// 1) route chưa phân loại
const found = new Set(); for (const f of walk('web/js')) { const t = fs.readFileSync(f, 'utf8'); for (const m of t.matchAll(/\broutes\.([A-Za-z_]\w*)\s*=|\broutes\[['"]([\w-]+)['"]\]\s*=/g)) found.add(m[1] || m[2]); }
const known = new Set(S.flatMap(s => s.routes || []));
for (const r of [...found].sort()) if (!known.has(r)) warns.push(`route #/${r} chưa có trong docs/stitch-coverage.json — thêm vào một bề mặt (status + lô)`);
for (const r of [...known].sort()) if (!found.has(r)) warns.push(`stitch-coverage.json liệt kê route #/${r} nhưng web/js không còn định nghĩa — xóa/sửa`);
// 2) id + cổng của dòng 'stitch'
const idx = fs.readFileSync('brand/stitch/v2/.index.txt', 'utf8'), screens = fs.readFileSync('scripts/test/stitch-screens.mjs', 'utf8');
const gateKeys = new Set([...(screens.match(/export const SCREENS = \{([^}]*)\}/)?.[1] || '').matchAll(/(?:^|[,\s])'?([\w-]+)'?\s*:/g)].map(m => m[1]));
for (const s of S) if (s.status === 'stitch') {
  if (!s.stitch?.length) warns.push(`${s.id}: đã port nhưng chưa ghi id Stitch (sáng/tối) — thêm vào brand/stitch/v2/.index.txt và JSON`);
  for (const p of s.stitch || []) if (!idx.includes(p)) warns.push(`${s.id}: id ${p} không có trong brand/stitch/v2/.index.txt`);
  const g = (s.gate || '').match(/^diff:(.+)$/); if (!g || !gateKeys.has(g[1])) warns.push(`${s.id}: thiếu cổng SSIM hợp lệ (diff:<khóa trong SCREENS>)`);
}
// 3) md sinh từ JSON
const OK = new Set(['stitch', 'skip', 'derived']), miss = S.filter(s => !OK.has(s.status));
const L = { stitch: 'xong', pr: 'PR chờ duyệt', wip: 'đang làm', ref: 'có screen Kit, chưa port', hand: 'viết tay', derived: 'chụp từ màn khác', skip: '-' };
const done = S.filter(s => s.status === 'stitch'), batches = [...new Set(miss.map(s => s.batch))];
const BN = { A1: 'Học: biến thể + vào học', A2: 'Hub', A3: 'Từ điển & tra', A4: 'Luyện kỹ năng', A5: 'Game · thống kê · ngữ pháp · lớp', A6: 'Thi + trang thông tin', A7: 'Cài đặt & tài khoản', A8: 'Popup/sheet chung', V: 'Video', W1: 'Web nhóm 1', W2a: 'Web nhóm 2a', W2b: 'Web nhóm 2b', W3a: 'Web nhóm 3a', W3b: 'Web nhóm 3b', W4: 'Admin', X1: 'Add-on', E1: 'Email · OG' };
const md = `# Phủ Stitch – màn nào đã port, màn nào còn viết tay

> TL;DR: ${done.length} bề mặt đã port từ Stitch (id + cổng SSIM); còn ${miss.length} chia ${batches.length} lô ≤5 màn. Nguồn: \`docs/stitch-coverage.json\` (sinh bằng \`node scripts/test/stitch-coverage.mjs --write\`); CI cảnh báo route/màn thiếu id (chưa fail).
> Đọc khi: chọn lô port Stitch kế tiếp, thêm route/màn mới (phải thêm vào JSON), hoặc kiểm cổng.

Chuẩn: Lexkite Kit (assets/1b7a8a3d3d52404bb332d9ba3f783547), cách port [STITCH-V2-PORT.md](STITCH-V2-PORT.md), trang web [WEB-PAGES.md](WEB-PAGES.md). Cổng \`diff:k\` = khóa trong \`scripts/test/stitch-screens.mjs\` (SSIM + tương phản + a11y).

## Đã port (theo lượt thấy, màn học và Hôm nay trước)
| Màn | Route | Stitch id sáng / tối | Cổng |
|---|---|---|---|
${done.map(s => `| ${s.name} | ${(s.routes || []).map(r => '#/' + r).join(' ') || '-'} | ${s.stitch?.length ? s.stitch.join(' / ') + '…' : '⚠ chưa ghi id'} | ${s.gate} |`).join('\n')}

## Còn thiếu – theo lô (thứ tự = lượt người dùng thấy)
| Lô | Màn | Trạng thái |
|---|---|---|
${batches.map(b => { const r = miss.filter(s => s.batch === b); return `| ${b} ${BN[b] || ''} | ${r.map(s => s.name).join(' · ')} | ${[...new Set(r.map(s => L[s.status]))].join(', ')} |`; }).join('\n')}

Không cần Stitch: ${S.filter(s => s.status === 'skip' || s.status === 'derived').map(s => s.name + (s.status === 'derived' ? ' (chụp từ màn khác)' : '')).join('; ')}. Sitemap/rss/robots không hiển thị.
Brief từng lô (≤15 dòng): side-session-notes \`stitch-batches.md\`. Mỗi lô cần chủ duyệt ảnh; tối đa 2 phiên port cùng lúc.
`;
if (write) { fs.writeFileSync(MD, md); console.log('✓ ghi ' + MD); }
else if (!fs.existsSync(MD) || fs.readFileSync(MD, 'utf8') !== md) warns.push(`${MD} lệch docs/stitch-coverage.json — chạy: node scripts/test/stitch-coverage.mjs --write`);
// 4) báo cáo
const sum = `Stitch coverage: ${done.length}/${done.length + miss.length} bề mặt đã port; còn ${miss.length} (${batches.map(b => `${b}:${miss.filter(s => s.batch === b).length}`).join(' ')})`;
console.log(sum); for (const w of warns) console.log(`::warning title=stitch-coverage::${w}`);
if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### ${sum}\n${warns.map(w => '- ' + w).join('\n')}\n`);
// QC khổ máy của stitch-diff phải chờ phông icon (Material Symbols) trước khi đo "chữ bị cắt": chưa nạp thì chữ ligature (arrow_back…) rộng hơn ô 1em → cắt GIẢ (07/11)
{ const sd = fs.readFileSync('scripts/test/stitch-diff.mjs', 'utf8'), i = sd.indexOf('qc[`${k}-${scheme}-${QW}`]'); if (!(i > 0 && /document\.fonts\.load\('24px "Material Symbols '/.test(sd.slice(Math.max(0, i - 900), i)))) { console.error('✗ stitch-diff.mjs: QC khổ máy phải chờ document.fonts.load(Material Symbols) trước khi đo chữ bị cắt'); process.exit(1); }
  if (!/CANARY clipped text/.test(sd) || !/KHÔNG bắt chữ bị cắt giả lập/.test(sd)) { console.error('✗ stitch-diff.mjs: thiếu ca đối chứng dương (CANARY) – chữ thường bị cắt thật phải vẫn bị báo, gác không được yếu đi'); process.exit(1); } }
const bad = warns.length + miss.length;
if (cov.enforce && bad) { console.error(`✗ stitch-coverage: ${bad} vấn đề (enforce=true)`); process.exit(1); }
console.log(cov.enforce ? '✓ stitch-coverage (enforce)' : `ℹ stitch-coverage: chỉ cảnh báo (${warns.length} cảnh báo, ${miss.length} màn chưa Stitch); đặt enforce=true khi về 0`);
