// Test máy gác đúng page · ngôn ngữ · giờ (functions/api/_social_audit.js, chủ 23/11). Chạy: node scripts/test/social-audit.mjs
import assert from 'node:assert/strict';
import { auditPosts, postViolation, clipLang } from '../../functions/api/_social_audit.js';
import { peakOk, zonedToMs } from '../../functions/api/_distribution.js';
let n = 0; const ok = (c, m) => { assert.ok(c, m); n++; };
const T = 'Asia/Ho_Chi_Minh', at = (d, hm, tz = T) => zonedToMs(d, hm, tz);
ok(clipLang({ id: 't2_l1_ar_x' }) === 'ar' && clipLang({ id: 'x', lang: 'VI' }) === 'vi' && clipLang({ id: 'reel1' }) === 'en', 'clipLang: manifest > id t2_l1_<lang> > en');
ok(peakOk(at('2026-12-01', '12:10'), T) && peakOk(at('2026-12-01', '20:30'), T) && !peakOk(at('2026-12-01', '03:00'), T) && !peakOk(at('2026-12-01', '15:30'), T), 'peakOk: trưa + tối địa phương, 03:00 và 15:30 sai giờ');
ok(!peakOk(at('2026-12-01', '10:00', 'Europe/Berlin'), 'Europe/Berlin') && peakOk(at('2026-07-01', '19:40', 'Europe/Berlin'), 'Europe/Berlin'), 'peakOk theo giờ địa phương có DST (Berlin mùa hè)');
ok(postViolation({ lang: 'vi', tz: T }, { id: 't2_l1_de_a' }, at('2026-12-01', '19:40')).code === 'wrong-lang', 'clip de lên kênh vi → wrong-lang');
ok(postViolation({ lang: 'vi', tz: T }, { id: 't2_l1_vi_a' }, at('2026-12-01', '04:00')).code === 'off-peak', 'giờ 04:00 → off-peak');
ok(postViolation({ lang: 'vi', tz: T }, { id: 't2_l1_vi_a' }, at('2026-12-01', '19:40')) === null, 'đúng ngôn ngữ + giờ → sạch');
const now = at('2026-12-01', '00:00'), chans = new Map([['ch-vi', { platform: 'facebook_page', title: 'Lexkite - Học Tiếng Anh', cfg: { lang: 'vi', tz: T } }], ['ch-ja', { platform: 'youtube', title: 'Lexkite - 英語学習', cfg: { lang: 'ja', tz: 'Asia/Tokyo' } }]]);
const clips = new Map([['t2_l1_vi_a', { id: 't2_l1_vi_a', title: 'Nghĩa A' }], ['t2_l1_vi_b', { id: 't2_l1_vi_b', title: 'Nghĩa A' }], ['t2_l1_ja_a', { id: 't2_l1_ja_a' }]]);
const r = auditPosts({ now, chans, clips, posts: [
  { channel_id: 'ch-vi', clip: 't2_l1_vi_a', ms: at('2026-12-02', '19:40') }, { channel_id: 'ch-vi', clip: 't2_l1_vi_b', ms: at('2026-12-03', '19:40') },   // trùng tiêu đề
  { channel_id: 'ch-vi', clip: 't2_l1_ja_a', ms: at('2026-12-04', '19:40') },                                                                       // sai ngôn ngữ
  { channel_id: 'ch-ja', clip: 't2_l1_ja_a', ms: at('2026-12-02', '03:00', 'Asia/Tokyo') },                                                         // sai giờ
  { channel_id: 'ch-ja', clip: 't2_l1_ja_a', ms: at('2026-12-05', '12:00', 'Asia/Tokyo') }, { channel_id: 'ch-ja', clip: 't2_l1_ja_a', ms: at('2026-12-05', '19:00', 'Asia/Tokyo') }]  // 2 bài/ngày + cùng clip
});
ok(r.summary['dup-title'] === 1 && r.summary['wrong-lang'] === 1 && r.summary['off-peak'] === 1 && r.summary['over-day'] === 1 && r.summary['dup-clip'] >= 1, 'auditPosts bắt: trùng tiêu đề, sai ngôn ngữ, sai giờ, quá bài/ngày, trùng clip – ' + JSON.stringify(r.summary));
const bad = auditPosts({ now, chans: new Map([['x', { platform: 'facebook_page', title: 'Lexkite - 英語学習', cfg: { lang: 'vi', tz: 'America/New_York' } }]]), clips, posts: [] });
ok(bad.summary['map-lang'] === 1 && bad.summary['map-tz'] === 1, 'bảng map: tên kênh Nhật nhưng cấu hình vi + múi giờ NY → map-lang + map-tz');
ok(auditPosts({ now, chans, clips, posts: [{ channel_id: 'ch-vi', clip: 't2_l1_vi_a', ms: at('2026-12-02', '19:40') }] }).n_bad === 0, 'bài đúng → 0 lệch');
console.log(`✓ social-audit: ${n} kiểm`);
