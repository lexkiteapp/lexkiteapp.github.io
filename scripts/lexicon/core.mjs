// Lõi 3.000 từ#loại cho mô hình nghĩa v2 (P0.2, docs/CONTENT-WORLD-PLAN.md §4 · spec docs/specs/sense-v2.md).
// Tầng 0, tất định: mục duy nhất A1–B2 theo thứ tự ưu tiên kho (NGSL tần suất trước → data.js → chủ đề → kỹ năng → đề thi).
// Lô thử = mẫu phân tầng: mỗi 30 mục lấy 1 (100 mục, đủ cấp A1–B2 và từ loại) – tái lập được, không chọn tay.
import { fileURLToPath } from 'node:url';
import { loadAll, key } from './lib.mjs';

export const CORE_N = 3000, PILOT_STEP = 30;
export function coreList(all = loadAll()) {
  const seen = new Set(), out = [];
  for (const e of all) {
    const k = key(e.row); if (seen.has(k)) continue; seen.add(k);
    if (/^(A1|A2|B1|B2)$/.test(e.row[8])) out.push({ k, word: e.row[0], pos: e.row[2], lvl: e.row[8], def: e.row[4], ex: e.row[5], col: e.row[6] });
    if (out.length >= CORE_N) break;
  }
  return out;
}
export const pilotList = (core = coreList()) => core.filter((_, i) => i % PILOT_STEP === 0);

if (fileURLToPath(import.meta.url) === process.argv[1]) {
  const core = coreList(), p = pilotList(core);
  if (process.argv.includes('--pilot')) console.log(JSON.stringify(p, null, 1));
  else console.log(`lõi ${core.length} · lô thử ${p.length}`);
}
