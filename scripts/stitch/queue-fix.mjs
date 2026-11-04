// Vòng sửa theo QC máy: mỗi màn còn lỗi (out/stitch/v3/qc.json từ qc-pick.mjs) → 1 việc edit_screens cho đúng chế độ lỗi,
// prompt liệt kê CHÍNH XÁC lỗi máy bắt (tương phản, chạm < 44px, tràn, icon sai tên, mảng sáng ở bản tối). Kết quả ghi đè cùng màn
// (batch.mjs lấy bản mới nhất), rồi CI chấm lại. Dùng: node scripts/stitch/queue-fix.mjs [round] >> hàng việc (nối vào queue.json)
import fs from 'node:fs';
const round = process.argv[2] || '1', qc = JSON.parse(fs.readFileSync('out/stitch/v3/qc.json', 'utf8')), out = [];
const RULE = 'Fix ONLY these machine-QC failures and keep layout, content, language and theme identical: every text at least 4.5:1 contrast (large text 3:1; no light-grey or low-opacity text, no text on saturated chips without enough contrast); every link, chip, icon button and text button has a tap area at least 44x44 px (min-height 44px, padding); nothing wider than the viewport; only valid Material Symbols Rounded icon names (no "sparkles", "waveform", "near_me" ligatures that fail – use auto_awesome, graphic_eq, navigation); dark theme has no large light panels.';
for (const [k, r] of Object.entries(qc)) {
  if (!r.fails.length) continue; const id = k.split('/')[1];
  for (const m of ['light', 'dark']) {
    const f = r.fails.filter(x => x.startsWith(m + ':') || (!/^(light|dark):/.test(x)));
    if (f.length) out.push({ id, mode: m, kind: 'edit', fix: round, from: `${id}/${m}`, prompt: `${RULE}\nFailures (${m}): ${f.join(' | ').slice(0, 900)}` });
  }
}
fs.writeSync(1, JSON.stringify(out, null, 1));
