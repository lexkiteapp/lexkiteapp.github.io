// Test máy gác đúng page · ngôn ngữ · giờ (functions/api/_social_audit.js, chủ 23/11). Chạy: node scripts/test/social-audit.mjs
import assert from 'node:assert/strict';
import { auditPosts, postViolation, clipLang } from '../../functions/api/_social_audit.js';
import { peakOk, zonedToMs, LANG_TZ, schedule, capCfg, normCfg } from '../../functions/api/_distribution.js';
import { slotAt, YT_SLOTS, MAIN_SLOTS } from '../../functions/api/youtube.js';
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
// bộ xếp lịch YouTube trực tiếp: MỌI ngôn ngữ × MỌI vị trí xoay × 30 ngày đều rơi vào giờ cao điểm địa phương (kể cả đổi giờ mùa hè), kênh chính cách ≥ 4 giờ
const now0 = Date.parse('2026-03-20T00:00:00Z');
for (const lang of Object.keys(LANG_TZ)) for (let rot = 0; rot < YT_SLOTS.length; rot++) for (let i = 0; i < 30; i++) { const ms = Date.parse(slotAt(i, 1, lang, now0, rot)); if (!peakOk(ms, LANG_TZ[lang], 0)) assert.fail(`slotAt ${lang} rot ${rot} #${i} ngoài giờ cao điểm ${new Date(ms).toISOString()}`); }
n++;
for (let rot = 0; rot < 6; rot++) { const a = [0, 1, 2].map(i => Date.parse(slotAt(i, 3, 'en', now0, rot))); ok(a.every(ms => peakOk(ms, LANG_TZ.en, 0)) && a[1] - a[0] >= 4 * 36e5 && a[2] - a[1] >= 4 * 36e5, 'kênh chính 3 bài/ngày: đúng giờ cao điểm, cách ≥ 4 giờ (rot ' + rot + ')'); }
ok(YT_SLOTS.length >= 6 && MAIN_SLOTS.length === 3, 'bảng slot đủ');
ok(new Set(Object.keys(LANG_TZ).map(l => slotAt(0, 1, l, now0, 0).slice(11, 16))).size > 8, 'giờ UTC khác nhau theo múi giờ thật (id/th/es không còn rơi về UTC)');
// schedule() với cấu hình CŨ lệch (page tiếng Việt múi NY, cửa sổ 09–21 h) → capCfg ép múi giờ thị trường + giờ cao điểm: mọi bài rơi đúng giờ địa phương
{ const cfg = capCfg(normCfg({ lang: 'vi', tz: 'America/New_York', windows: [{ from: '09:00', to: '21:00' }] })), r = schedule({ clips: Array.from({ length: 20 }, (_, i) => ({ id: 'c' + i, title: 'T' + i })), cfg, now: now0 });
  ok(cfg.tz === 'Asia/Ho_Chi_Minh' && r.slots.length === 20 && r.slots.every(x => peakOk(x.ms, cfg.tz)), 'schedule: cấu hình cũ lệch vẫn ra 20 bài đúng giờ cao điểm giờ Việt Nam'); }
console.log(`✓ social-audit: ${n} kiểm`);
