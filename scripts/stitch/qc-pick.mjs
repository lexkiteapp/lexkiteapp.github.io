// Đọc báo cáo QC máy (report.json của CI Stitch quality QC, bước kho v3) → out/stitch/v3/qc.json cho import-v3.mjs:
//   mỗi màn: danh sách lỗi; nhóm phương án (<màn>, <màn>-v1..v3) → chọn bản thắng bằng điểm máy, KHÔNG chấm cảm tính:
//   điểm = 1000·số lỗi + chữ thiếu tương phản + vùng chạm < 44px + px tràn ngang (thấp hơn = tốt hơn; hoà → bản gốc).
// Dùng: node scripts/stitch/qc-pick.mjs <report.json> [out/stitch/v3/qc.json]
import fs from 'node:fs';
const [REP, OUT = 'out/stitch/v3/qc.json'] = process.argv.slice(2);
const rep = JSON.parse(fs.readFileSync(REP, 'utf8')), qc = {};
const score = r => 1000 * r.fails.length + ['light', 'dark'].reduce((a, m) => a + (r.info[m]?.contrastMiss?.length || 0) + (r.info[m + 'Layout']?.smallTapCount || 0) + Math.max(0, r.info[m + 'Layout']?.overflowPx || 0), 0);
// detail: từng phần tử máy bắt (≤ 12 chữ thiếu tương phản + ≤ 12 vùng chạm nhỏ mỗi chế độ) → queue-fix.mjs liệt kê đủ cho Stitch, không chỉ 1 ví dụ.
const detail = r => Object.fromEntries(['light', 'dark'].map(m => [m, { contrast: (r.info[m]?.contrastMiss || []).map(c => `"${c.t.replace(/\s+/g, ' ').slice(0, 40)}" ${c.r}:1`), taps: (r.info[m + 'Layout']?.smallTaps || []).map(t => t.replace(/\s+/g, ' ')), overflowPx: r.info[m + 'Layout']?.overflowPx || 0 }]));
for (const r of rep) qc[`${r.surface}/${r.page}`] = { fails: r.fails, score: score(r), detail: detail(r) };
const groups = {};
for (const r of rep) { const m = r.page.match(/^(.*)-v[1-9]$/); if (m) (groups[`${r.surface}/${m[1]}`] ??= []).push(`${r.surface}/${r.page}`); }
for (const [base, vs] of Object.entries(groups)) {
  const cands = [base, ...vs].filter(k => qc[k]).sort((a, b) => qc[a].score - qc[b].score || (a === base ? -1 : b === base ? 1 : 0));
  const win = cands[0]; if (!qc[win].fails.length) qc[win].pick = true;
  console.log(`${base}: ${cands.map(k => `${k.split('/')[1]}=${qc[k].score}`).join(' ')} → ${win}${qc[win].fails.length ? ' (còn lỗi, cần sửa)' : ''}`);
}
fs.writeFileSync(OUT, JSON.stringify(qc, null, 1));
console.log(`${Object.values(qc).filter(r => !r.fails.length).length}/${rep.length} đạt`);
