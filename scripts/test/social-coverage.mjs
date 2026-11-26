// Máy gác lịch đăng (functions/api/_social_cover.js + scripts/social/coverage.mjs): kênh-ngày trống trong 30 ngày tới được bắt đúng, theo múi giờ kênh, bỏ kênh tắt/Grabcast/gone.
// Chạy: node scripts/test/social-coverage.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { gapsOf, coverage } from '../../functions/api/_social_cover.js';
import { report, near, NEAR_DAYS, runway, WARN_DAYS } from '../social/coverage.mjs';
import { langOfChannel, LANG_TZ, SOCIAL_LANGS, validTz } from '../../functions/api/_distribution.js';

const D = 864e5, NOW = Date.UTC(2026, 10, 16, 5, 0, 0); // 16/11/2026 05:00 UTC
let n = 0; const ok = (c, m) => { assert.ok(c, m); n++; };

// gapsOf: từ NGÀY MAI, 30 ngày; hôm nay không tính; đủ ngày → rỗng
const full = Array.from({ length: 30 }, (_, i) => NOW + (i + 1) * D);
ok(gapsOf(full, 'UTC', NOW).length === 0, 'đủ 30 ngày → không trống');
ok(gapsOf([], 'UTC', NOW).length === 30 && gapsOf([], 'UTC', NOW)[0] === '2026-11-17', 'không có bài → 30 ngày trống từ ngày mai');
ok(!gapsOf(full.filter((_, i) => i !== 4), 'UTC', NOW).includes('2026-11-17') && gapsOf(full.filter((_, i) => i !== 4), 'UTC', NOW).join() === '2026-11-21', 'thiếu đúng 1 ngày thì chỉ báo ngày đó');
ok(gapsOf([NOW + 3 * 36e5], 'UTC', NOW).length === 30, 'bài hôm nay không lấp ngày mai');
// múi giờ: 20:00 UTC ngày 17 = 03:00 ngày 18 ở Hồ Chí Minh
const t = Date.UTC(2026, 10, 17, 20, 0, 0);
ok(!gapsOf([t], 'Asia/Ho_Chi_Minh', NOW).includes('2026-11-18') && gapsOf([t], 'Asia/Ho_Chi_Minh', NOW).includes('2026-11-17'), 'ngày tính theo múi giờ kênh');
ok(new Set(gapsOf([], 'America/New_York', Date.UTC(2026, 10, 1, 5, 0, 0))).size === 30, 'qua ngày đổi giờ mùa hè vẫn đủ 30 ngày khác nhau');

// coverage(): D1 giả (prepare/bind/all)
const ext = [
  { channel_id: 'a', platform: 'youtube', title: 'Lexkite English', status: 'ok' }, { channel_id: 'b', platform: 'tiktok', title: 'lexkitecom', status: 'ok' },
  { channel_id: 'c', platform: 'facebook_page', title: 'Grabcast.click', status: 'ok' }, { channel_id: 'd', platform: 'instagram', title: 'gone', status: 'gone' }, { channel_id: 'e', platform: 'facebook_page', title: 'Tắt', status: 'ok' },
];
const cfgs = [{ channel_id: 'e', cfg: JSON.stringify({ active: 0 }) }, { channel_id: 'b', cfg: JSON.stringify({ tz: 'UTC' }) }];
const slots = [...full.map(ms => ({ channel_id: 'b', slot_ms: ms })), { channel_id: 'a', slot_ms: NOW + 2 * D }];
const ytc = [{ channel_id: 'UCa', title: 'Lexkite English' }, { channel_id: 'UCh', title: 'Lexkite Hindi' }], plans = [{ channel_id: 'UCh', slot_ms: NOW + 3 * D }], ytq = [{ channel_id: 'UCa', publish_at: new Date(NOW + 5 * D).toISOString() }]; // ytq = bài xếp hàng tải trực tiếp (op fill)
const db = { prepare: sql => ({ bind: (...p) => ({ all: async () => ({ results: /FROM yt_channel/.test(sql) ? ytc : /SELECT channel_id, publish_at FROM yt_queue/.test(sql) ? ytq : /FROM yt_plan/.test(sql) ? plans.filter(r => r.slot_ms >= p[0] && r.slot_ms <= p[1]) : /FROM dist_ext/.test(sql) ? ext.filter(x => x.status === 'ok') : /FROM yt_chan_cfg/.test(sql) ? cfgs : /FROM dist_social/.test(sql) ? slots.filter(r => r.slot_ms >= p[0] && r.slot_ms <= p[1]) : [] }) }) }) };
const c = await coverage(db, NOW);
ok(c.channels === 3 && c.rows.map(r => r.channel_id).sort().join() === 'UCa,UCh,b', 'YouTube trực tiếp gộp với GrabCast cùng tên (không đếm đôi); chỉ kênh đang bật, không Grabcast, không gone');
const by = Object.fromEntries(c.rows.map(r => [r.channel_id, r]));
ok(by.UCa.have === 2 && by.UCh.have === 1, 'lịch của đường API trực tiếp (yt_plan + yt_queue.publish_at) và GrabCast (dist_social) cộng chung 1 kênh');
ok(by.b.missing.length === 0 && by.UCa.missing.length === 28 && c.short === 2, 'đếm có/thiếu đúng');
const r = report(c);
ok(r.bad.length === 2 && /Lexkite English/.test(r.text) && /1\/3 kênh đủ/.test(r.text) && /17\.\.|2026-11-17/.test(r.text), 'báo cáo nêu kênh và khoảng trống');

const yt = c.platforms.find(p => p.platform === 'youtube'), fb = c.platforms.find(p => p.platform === 'facebook_page');
ok(yt.want === 15 && yt.channels === 2 && yt.unconnected === 13 && yt.total === 450 && fb.total === 450 && fb.unconnected === 15, 'mẫu số 15 kênh × 30 ngày = 450 trang-ngày mỗi nền tảng, kênh chưa nối được tính là thiếu');
ok(/youtube: mới nối 2\/15 kênh → thiếu 13/.test(r.text) && r.miss.length === 3 && /\| youtube \| 2\/15 \| 3\/450 \|/.test(r.table), 'báo cáo nêu kênh chưa nối + bảng tuần có mẫu số 450');
ok(c.idle24 === 3 && c.rows.every(x => x.last24h === 0) && /KHÔNG có bài nào/.test(r.text) && r.idle.length === 3, 'kênh 24 giờ không có bài đẩy/đăng → báo (đỏ)');
ok(/channel-idle-24h/.test(fs.readFileSync('scripts/social/coverage.mjs', 'utf8')) && /process\.exit\(1\)/.test(fs.readFileSync('scripts/social/coverage.mjs', 'utf8')), 'máy gác mở issue + làm đỏ CI khi có kênh 24 giờ im lặng');
// ngôn ngữ + múi giờ kênh (16/11): tên bản ngữ nhận đúng ngôn ngữ, mỗi ngôn ngữ có múi giờ bản địa hợp lệ (kênh chưa lưu cfg.tz không còn theo New York)
for (const [t, l] of [['Lexkite – เรียนภาษาอังกฤษ', 'th'], ['Lexkite – 学英语', 'zh'], ['Lexkite – 英語学習', 'ja'], ['Lexkite – 영어 공부', 'ko'], ['Lexkite – Belajar Bahasa Inggris', 'id'], ['Lexkite – Học Tiếng Anh', 'vi'], ['Lexkite – Learn English', 'en']]) ok(langOfChannel(t) === l, `${t} → ${l}`);
ok(LANG_TZ.th === 'Asia/Bangkok' && LANG_TZ.ko === 'Asia/Seoul' && LANG_TZ.ja === 'Asia/Tokyo' && SOCIAL_LANGS.every(l => validTz(LANG_TZ[l])), 'mỗi ngôn ngữ có múi giờ bản địa hợp lệ (th → Asia/Bangkok)');
// nối dây: workflow + op + job đăng ký
const wf = fs.readFileSync('.github/workflows/social-coverage.yml', 'utf8'), api = fs.readFileSync('functions/api/social-auto.js', 'utf8'), jobs = JSON.parse(fs.readFileSync('infra/jobs.json', 'utf8')).jobs;
ok(/WEEKLY|getUTCDay/.test(fs.readFileSync('scripts/social/coverage.mjs', 'utf8')), 'bảng phủ theo trang gửi mỗi tuần (thứ Hai)');
ok(/cron: '41 3 \* \* \*'/.test(wf) && /scripts\/social\/coverage\.mjs/.test(wf) && /issues: write/.test(wf), 'workflow chạy hằng ngày và được mở issue');
ok(/b\.op === 'coverage'/.test(api) && /cliVerify/.test(api), 'op coverage đi sau chữ ký HMAC');
ok(jobs.some(j => j.id === 'social-coverage' && j.workflow === 'social-coverage.yml'), 'đã đăng ký infra/jobs.json');
// máy gác ĐỎ khi có ngày trống trong NEAR_DAYS ngày tới (luật 1 video/kênh/ngày, 17/11)
{ const at = Date.UTC(2026, 10, 17), d = k => new Date(at + k * 864e5).toISOString().slice(0, 10);
  const j = { at, days: 30, rows: [{ title: 'A', platform: 'youtube', missing: [d(2)] }, { title: 'B', platform: 'facebook_page', missing: [d(NEAR_DAYS + 3)] }, { title: 'C', platform: 'tiktok', missing: [] }] };
  const nr = near(j); ok(NEAR_DAYS === 7 && nr.length === 1 && nr[0].title === 'A', 'trống ≤ 7 ngày → đỏ; trống xa hơn chỉ cảnh báo; đủ lịch → xanh'); }
{ const at = Date.parse('2026-11-23T10:00:00Z'), j = { days: 30, at, rows: [{ title: 'A', platform: 'youtube', missing: ['2026-12-03'] }, { title: 'B', platform: 'youtube', missing: ['2026-12-20'] }, { title: 'C', platform: 'youtube', missing: [] }, { title: 'D', platform: 'facebook_page', missing: ['2026-11-25', '2026-12-01'] }] };
  const rw = runway(j); ok(WARN_DAYS === 14 && rw.map(r => r.title + r.left).join() === 'D2,A10', 'runway: kênh còn lịch ≤ 14 ngày được cảnh báo sớm (D còn 2, A còn 10), B/C chưa'); }
ok(/runway\(jj\)/.test(fs.readFileSync('scripts/social/coverage.mjs', 'utf8')) && /coverage-runway/.test(fs.readFileSync('scripts/social/coverage.mjs', 'utf8')), 'coverage.mjs mở issue cảnh báo sớm 14 ngày')
ok(/near\(j\)/.test(fs.readFileSync('scripts/social/coverage.mjs', 'utf8')) && /coverage-near/.test(fs.readFileSync('scripts/social/coverage.mjs', 'utf8')), 'coverage.mjs thoát 1 + mở issue khi gần trống');
{ const { breakerStuck } = await import('../social/coverage.mjs'), now = 1e12;
  ok(breakerStuck({ breaker: { until: now + 1, code: 'db_budget_guard', status: 503 }, gc_err_runs: 3 }, now) && !breakerStuck({ breaker: { until: now + 1 }, gc_err_runs: 2 }, now) && !breakerStuck({ breaker: { until: now - 1 }, gc_err_runs: 9 }, now) && !breakerStuck(null, now), 'breakerStuck: bật + ≥ 3 lượt lỗi liền mới báo; hết hạn / ít lượt / không có → không');
  const cv = fs.readFileSync('scripts/social/coverage.mjs', 'utf8'); ok(/post-breaker-stuck/.test(cv) && /\|\| stuck\) process\.exit\(1\)/.test(cv), 'coverage.mjs: cầu dao kẹt → issue + thoát 1'); }
{ const { platformZero } = await import('../social/coverage.mjs'); ok(/platform-zero-24h/.test(fs.readFileSync('scripts/social/coverage.mjs', 'utf8')) && /pz\.length \|\| stuck\) process\.exit\(1\)/.test(fs.readFileSync('scripts/social/coverage.mjs', 'utf8')), 'coverage.mjs: nền tảng 0 bài/24h → issue platform-zero-24h + thoát 1');
  const rows = [{ platform: 'facebook_page', last24h: 0 }, { platform: 'facebook_page', last24h: 0 }, { platform: 'youtube', last24h: 1 }, { platform: 'youtube', last24h: 0 }, { platform: 'tiktok', last24h: 0 }];
  const z = platformZero({ rows });
  ok(z.length === 2 && z[0].platform === 'facebook_page' && z[0].channels === 2 && z[1].platform === 'tiktok', 'platformZero: nền tảng mà mọi kênh 0 bài/24h → báo; youtube có 1 kênh đăng → không báo');
  ok(platformZero({ rows: [] }).length === 0 && platformZero(null).length === 0, 'platformZero: không có kênh → không báo'); }
console.log(`✓ social-coverage: ${n} kiểm`);
