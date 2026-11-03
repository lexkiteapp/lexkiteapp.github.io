// Vòng sửa theo QC máy: mỗi màn còn lỗi (out/stitch/v3/qc.json từ qc-pick.mjs) → 1 việc edit_screens cho đúng chế độ lỗi,
// prompt liệt kê CHÍNH XÁC lỗi máy bắt (tương phản, chạm < 44px, tràn, icon sai tên, mảng sáng ở bản tối). Kết quả ghi đè cùng màn
// (batch.mjs lấy bản mới nhất), rồi CI chấm lại. Dùng: node scripts/stitch/queue-fix.mjs [round] >> hàng việc (nối vào queue.json)
import fs from 'node:fs';
const round = process.argv[2] || '1', qc = JSON.parse(fs.readFileSync('out/stitch/v3/qc.json', 'utf8')), out = [];
const RULE = 'Fix ONLY these machine-QC failures and keep layout, content, language and theme identical: every text at least 4.5:1 contrast (large text 3:1; no light-grey or low-opacity text, no text on saturated chips without enough contrast); every link, chip, icon button and text button has a tap area at least 44x44 px (min-height 44px, padding); nothing wider than the viewport; only valid Material Symbols Rounded icon names (no "sparkles", "waveform", "near_me" ligatures that fail – use auto_awesome, graphic_eq, navigation); dark theme has no large light panels.';
// Liệt kê đủ phần tử lỗi (qc-pick.mjs ghi detail) – vòng 4 chỉ nêu 1 ví dụ/lỗi nên Stitch sửa sót phần còn lại.
const list = d => !d ? '' : [d.contrast.length && `\nRaise contrast of EXACTLY these texts (now → need ≥4.5:1, use the main ink colour or a darker/lighter shade of the same hue): ${d.contrast.join('; ')}`,
  d.taps.length && `\nMake EXACTLY these controls at least 44x44 px (min-height:44px; min-width:44px; padding; a visually hidden 1x1 checkbox/radio must become a visible 44px switch or be wrapped so the whole 44px label is the control): ${d.taps.join('; ')}`,
  d.overflowPx > 1 && `\nPage is ${d.overflowPx}px wider than the viewport: make tables scroll inside their own card (overflow-x:auto) and use flexible widths, no fixed widths over 100%.`].filter(Boolean).join('');
for (const [k, r] of Object.entries(qc)) {
  if (!r.fails.length) continue; const id = k.split('/')[1];
  for (const m of ['light', 'dark']) {
    const f = r.fails.filter(x => x.startsWith(m + ':') || (!/^(light|dark):/.test(x)));
    if (f.length) out.push({ id, mode: m, kind: 'edit', fix: round, from: `${id}/${m}`, prompt: `${RULE}\nFailures (${m}): ${f.join(' | ').replace(/\s+/g, ' ').slice(0, 900)}${list(r.detail?.[m])}` });
  }
}
fs.writeSync(1, JSON.stringify(out, null, 1));
