// Bot: ghi mốc web/cpack đo được vào scripts/test/cpack-floor.json (cpack-floor.yml, sau mỗi lần gộp vào main) và xoá cpack-notes đã được mốc mới bao phủ.
import fs from 'node:fs';
import { FLOOR, cpackBytes, readFloor, noteFiles } from '../lib/cpack-floor.mjs';
const m = cpackBytes();
if (m !== readFloor()) fs.writeFileSync(FLOOR, JSON.stringify({ note: 'Mốc web/cpack do bot ghi (scripts/ci/cpack-ratchet.mjs). KHÔNG sửa tay – docs/CI-RUNNERS.md › Trần web/cpack.', measured: m, updated: new Date().toISOString().slice(0, 10) }, null, 1) + '\n');
for (const f of noteFiles()) fs.rmSync(f);
console.log(`cpack-ratchet: mốc ${m} B`);
