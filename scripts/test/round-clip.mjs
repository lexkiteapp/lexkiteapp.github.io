// Đo tương phản bỏ góc bo: huy hiệu tròn 24 px – tâm trong, bốn góc ngoài; hộp vuông không bị bỏ điểm nào.
import { outsideRound } from './lib/round-clip.mjs';
let bad = 0; const ok = (c, m) => { if (!c) { console.error('✗ ' + m); bad++; } };
ok(!outsideRound(12, 12, 0, 0, 24, 24, 9999), 'tâm huy hiệu tròn nằm trong');
ok(outsideRound(0.5, 0.5, 0, 0, 24, 24, 9999), 'góc huy hiệu tròn nằm ngoài');
ok(outsideRound(23.5, 0.5, 0, 0, 24, 24, 12) && outsideRound(0.5, 23.5, 0, 0, 24, 24, 12) && outsideRound(23.5, 23.5, 0, 0, 24, 24, 12), 'cả 4 góc ngoài');
ok(!outsideRound(12, 1, 0, 0, 24, 24, 12) && !outsideRound(1, 12, 0, 0, 24, 24, 12), 'giữa cạnh vẫn trong (bán kính = nửa cạnh)');
ok(!outsideRound(0.5, 0.5, 0, 0, 24, 24, 0), 'không bo (r=0) → không bỏ điểm nào');
ok(outsideRound(0.3, 0.3, 0, 0, 40, 20, 4) && !outsideRound(2, 2, 0, 0, 40, 20, 4), 'bo 4 px: sát góc ngoài, (2,2) trong');
if (bad) process.exit(1); console.log('round-clip: ok');
