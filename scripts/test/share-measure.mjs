import assert from 'node:assert/strict';
import fs from 'node:fs';
import { shareData } from '../../functions/api/_funnel.js';
const s = shareData([{ kind: 'cta:share_open_result', n: 10 }, { kind: 'cta:share_send_result', n: 3 }, { kind: 'cta:share_dl_day', n: 1 }, { kind: 'cta:share_inv_streak', n: 1 }, { kind: 'cta:share_bad_x', n: 99 }, { kind: 'cta:ext_land', n: 5 }],
  [{ src: 'share', go_view: 8, app: 2, fl: 1 }, { src: 'qr', go_view: 2, app: 1, fl: 0 }, { src: 'tiktok', go_view: 50, app: 9, fl: 4 }]);
assert.equal(s.open, 10); assert.equal(s.send, 3); assert.equal(s.views, 10); assert.equal(s.app, 3); assert.equal(s.fl, 1);
assert.equal(s.sendPct, 50); assert.equal(s.backPct, 200); assert.equal(s.byKind.result.send, 3);
// mọi sự kiện beacon của share-card.js phải nằm trong danh sách cho phép của hit.js
const hit = fs.readFileSync('functions/api/hit.js', 'utf8'), card = fs.readFileSync('web/js/share-card.js', 'utf8');
assert.match(hit, /SHARE_EV\.includes\(b\.ev\)/);
for (const a of ['open', 'send', 'dl', 'inv']) assert.ok(card.includes(`ev('${a}', kindOf(S))`), a);
assert.match(fs.readFileSync('web/js/cbt.js', 'utf8'), /pct >= 80 \? `<button type="button" class="btn" data-share/);
console.log('share-measure ok');
