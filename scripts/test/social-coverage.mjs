// Máy gác lịch đăng (functions/api/_social_cover.js + scripts/social/coverage.mjs): kênh-ngày trống trong 30 ngày tới được bắt đúng, theo múi giờ kênh, bỏ kênh tắt/Grabcast/gone.
// Chạy: node scripts/test/social-coverage.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { gapsOf, coverage } from '../../functions/api/_social_cover.js';
import { report } from '../social/coverage.mjs';

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
const ytc = [{ channel_id: 'UCa', title: 'Lexkite English' }, { channel_id: 'UCh', title: 'Lexkite Hindi' }], plans = [{ channel_id: 'UCh', slot_ms: NOW + 3 * D }];
const db = { prepare: sql => ({ bind: (...p) => ({ all: async () => ({ results: /FROM yt_channel/.test(sql) ? ytc : /FROM yt_plan/.test(sql) ? plans.filter(r => r.slot_ms >= p[0] && r.slot_ms <= p[1]) : /FROM dist_ext/.test(sql) ? ext.filter(x => x.status === 'ok') : /FROM yt_chan_cfg/.test(sql) ? cfgs : /FROM dist_social/.test(sql) ? slots.filter(r => r.slot_ms >= p[0] && r.slot_ms <= p[1]) : [] }) }) }) };
const c = await coverage(db, NOW);
ok(c.channels === 3 && c.rows.map(r => r.channel_id).sort().join() === 'UCa,UCh,b', 'YouTube trực tiếp gộp với GrabCast cùng tên (không đếm đôi); chỉ kênh đang bật, không Grabcast, không gone');
const by = Object.fromEntries(c.rows.map(r => [r.channel_id, r]));
ok(by.UCa.have === 1 && by.UCh.have === 1, 'lịch của đường API trực tiếp (yt_plan) và GrabCast (dist_social) cộng chung 1 kênh');
ok(by.b.missing.length === 0 && by.UCa.missing.length === 29 && c.short === 2, 'đếm có/thiếu đúng');
const r = report(c);
ok(r.bad.length === 2 && /Lexkite English/.test(r.text) && /1\/3 kênh đủ/.test(r.text) && /17\.\.|2026-11-17/.test(r.text), 'báo cáo nêu kênh và khoảng trống');

const yt = c.platforms.find(p => p.platform === 'youtube'), fb = c.platforms.find(p => p.platform === 'facebook_page');
ok(yt.want === 15 && yt.channels === 2 && yt.unconnected === 13 && yt.total === 450 && fb.total === 450 && fb.unconnected === 15, 'mẫu số 15 kênh × 30 ngày = 450 trang-ngày mỗi nền tảng, kênh chưa nối được tính là thiếu');
ok(/youtube: mới nối 2\/15 kênh → thiếu 13/.test(r.text) && r.miss.length === 3 && /\| youtube \| 2\/15 \| 2\/450 \|/.test(r.table), 'báo cáo nêu kênh chưa nối + bảng tuần có mẫu số 450');
// nối dây: workflow + op + job đăng ký
const wf = fs.readFileSync('.github/workflows/social-coverage.yml', 'utf8'), api = fs.readFileSync('functions/api/social-auto.js', 'utf8'), jobs = JSON.parse(fs.readFileSync('infra/jobs.json', 'utf8')).jobs;
ok(/WEEKLY|getUTCDay/.test(fs.readFileSync('scripts/social/coverage.mjs', 'utf8')), 'bảng phủ theo trang gửi mỗi tuần (thứ Hai)');
ok(/cron: '41 3 \* \* \*'/.test(wf) && /scripts\/social\/coverage\.mjs/.test(wf) && /issues: write/.test(wf), 'workflow chạy hằng ngày và được mở issue');
ok(/b\.op === 'coverage'/.test(api) && /cliVerify/.test(api), 'op coverage đi sau chữ ký HMAC');
ok(jobs.some(j => j.id === 'social-coverage' && j.workflow === 'social-coverage.yml'), 'đã đăng ký infra/jobs.json');
console.log(`✓ social-coverage: ${n} kiểm`);
