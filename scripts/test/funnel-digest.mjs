import assert from 'node:assert/strict';
import { format } from '../growth/funnel-digest.mjs';
import { digest } from '../../functions/api/funnel-digest.js';
const d = { day: '2026-11-13', views: 120, prevViews: 100, ctas: 30, prevCtas: 30, app: 12, prevApp: 0, fl: 6, prevFl: 8,
  install: [{ plat: 'play', seen: 50, click: 10, later: 5, btn: 3, clickPct: 20 }, { plat: 'ext', seen: 0, click: 0, later: 0, btn: 2, clickPct: null }],
  top: [{ src: 'tiktok', camp: 'bio', code: '', views: 40, app: 5, fl: 2 }] };
const md = format(d);
assert.match(md, /▲ 20%/); assert.match(md, /▲ mới/); assert.match(md, /▼ 25%/); assert.match(md, /\| play \| 50 \| 10 \| 20% \| 3 \|/);
assert.match(md, /tiktok\/bio \(40→5→2\)/); assert.match(md, /<!-- fd:2026-11-13 -->/); assert.doesNotMatch(md, /NaN|undefined/);
// digest(): trừ máy tự động khỏi số app; lỗi bảng sessions → 0
const mk = fail => ({ prepare: q => ({ bind: (...a) => { const o = { all: async () => ({ results: [] }), first: async () => { if (fail) throw new Error('x'); return { n: a[0] === '2026-11-13' ? 4 : 1 }; } }; return o; } }) });
const day = Date.parse('2026-11-14T05:00:00Z');
const a = await digest(mk(false), day); assert.equal(a.day, '2026-11-13'); assert.equal(a.app, 0); assert.equal(a.views, 0);
console.log('funnel-digest ok');
