// Ngân sách thời gian lượt fill (03/11, run 41569456017): vẽ 564 ảnh trong 9,9 phút nhưng giám khảo CPU+thị giác chấm không kịp
// trong hạn job → bị huỷ, 0 ảnh nhận. Quy tắc: CHỈ VẼ số ảnh mà giám khảo chấm kịp trong thời gian còn lại của vòng lặp.
//   vẽ n ảnh mất n/drawPerMin phút, chấm n ảnh mất n/ratePerMin phút → n ≤ remain / (1/draw + 1/rate)
// ratePerMin lấy từ speed.judge.a*.json đo thật trong lượt này; chưa có số đo → mặc định THẬN TRỌNG.
// CLI (workflow): node judge-budget.mjs --out DIR --deadline EPOCH_S --pending N --left N [--now EPOCH_S] → in "CAP=<n> JMIN=<phút> RATE=<ảnh/phút>" (CAP=0: dừng)
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
export const DEFAULT_RATE = 3;      // ảnh/phút giám khảo (chưa đo) – thấp để không vẽ thừa; số đo thật thay thế ở biến thể kế
export const DRAW_PER_MIN = 40;     // đo 03/11: 56,8 ảnh/phút; lấy thấp hơn
export const RESERVE_MIN = 6;       // dành cho ảnh đang chấm dở + tải artifact + trả thuê
export const MIN_USEFUL_MIN = 8;    // còn ít hơn thế thì không bắt đầu vòng mới

export function measuredRate(dir) {
  let imgs = 0, mins = 0;
  try { for (const f of fs.readdirSync(dir)) if (/^speed\.judge\.a\d+\.json$/.test(f)) { const j = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); if (j.images > 0 && j.minutes > 0) { imgs += j.images; mins += j.minutes; } } } catch {}
  return mins > 0 && imgs >= 5 ? imgs / mins : 0;
}

export function plan({ now, deadline, pending, left, rate = 0, drawPerMin = DRAW_PER_MIN }) {
  const r = rate > 0 ? rate : DEFAULT_RATE, remain = (deadline - now) / 60 - RESERVE_MIN;
  if (remain < MIN_USEFUL_MIN || pending <= 0 || left <= 0) return { cap: 0, judgeMin: 0, rate: r };
  const fit = Math.floor(remain / (1 / drawPerMin + 1 / r)), cap = Math.max(0, Math.min(pending, left, fit));
  return { cap, judgeMin: cap ? Math.max(1, +(remain - cap / drawPerMin).toFixed(1)) : 0, rate: r };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const arg = k => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : undefined; };
  const p = plan({ now: Number(arg('now')) || Math.floor(Date.now() / 1000), deadline: Number(arg('deadline')), pending: Number(arg('pending')), left: Number(arg('left')), rate: measuredRate(arg('out') || '.') });
  console.log(`CAP=${p.cap} JMIN=${p.judgeMin} RATE=${p.rate.toFixed(2)}`);
}
