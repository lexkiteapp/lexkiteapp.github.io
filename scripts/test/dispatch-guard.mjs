// Workflow theo lịch gọi workflow khác phải kiểm workflow đích còn bật (2/11: video.yml tắt tay vì GrabCast → video-auto đỏ mỗi sáng vô ích, che lỗi thật).
import fs from 'node:fs';
const PAIRS = [['video-auto.yml', 'video.yml', 'Tạo job Studio']];   // [lịch, đích có thể bị tắt tay, bước gọi đích]
let fail = 0;
for (const [src, dst, step] of PAIRS) {
  const s = fs.readFileSync(`.github/workflows/${src}`, 'utf8'), i = s.indexOf(`name: ${step}`), g = s.indexOf(`actions/workflows/${dst}`);
  const guarded = g > 0 && g < i && /if: steps\.on\.outputs\.state == 'active'/.test(s.slice(i, i + 200));
  if (!guarded) { fail++; console.error(`✗ ${src}: bước "${step}" phải chỉ chạy khi ${dst} state == active`); }
}
console.log(fail ? `dispatch-guard: ${fail} FAIL` : `✓ dispatch-guard: ${PAIRS.length} cặp lịch → đích có kiểm trạng thái`); process.exit(fail ? 1 : 0);
