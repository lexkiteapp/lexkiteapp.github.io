// Test scripts/social/yt-stats.mjs: tổng hợp số liệu, kênh 0 view, video bị gỡ, thiếu quyền Analytics, không suy đoán số thiếu.
import { summarize, table, raise } from '../social/yt-stats.mjs';
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('✗', m); } };
const v = (id, ch, views, extra = {}) => ({ video_id: id, clip: 'c-' + id, channel_id: ch, views, likes: 1, comments: 0, ...extra });
const res = { day: '2026-11-13', analytics: false, channels: [{ channel_id: 'A', title: 'A', subs: 10 }, { channel_id: 'B', title: 'B', subs: null }],
  videos: [v('1', 'A', 100, { d7: 40, d30: 90 }), v('2', 'A', 5, { d7: 5, d30: 5 }), v('3', 'B', 0), v('4', 'B', 0), v('5', 'A', 7), v('6', 'A', 9), v('7', 'A', 50), { video_id: '8', channel_id: 'A', missing: true, views: 0 }] };
const s = summarize(res);
ok(s.videos === 7 && s.views === 171, 'tổng video/view không tính video bị gỡ');
ok(s.top[0].video_id === '1' && s.top.length === 5 && s.bottom.length === 5, 'top/bottom 5');
ok(s.bottom[0].views === 0, 'bottom bắt đầu từ thấp nhất');
ok(s.zero_channels.join() === 'B', 'kênh 0 view');
ok(s.gone.join() === '8', 'video bị gỡ/hạn chế');
ok(s.d7 === 45 && s.d30 === 95, 'tăng trưởng chỉ cộng video có snapshot');
ok(summarize({ videos: [v('1', 'A', 3)], channels: [] }).d7 === null, 'thiếu snapshot → null, không đoán');
ok(s.gaps.some(g => /yt-analytics/.test(g)), 'báo thiếu scope Analytics');
ok(summarize({ ...res, analytics: true }).gaps.length === 0, 'có scope → không báo thiếu');
ok(/0 VIEW/.test(table(s)) && /Bị gỡ/.test(table(s)), 'bảng nêu 0 view + bị gỡ');
const calls = []; const fx = async (u, i = {}) => { calls.push([String(u), i.method || 'GET', i.body]); return { ok: true, json: async () => (String(u).includes('state=open') ? [{ number: 7, title: '📉 Social analytics: video bị gỡ/hạn chế' }] : {}) }; };
await raise({ k: 'yt-gone', title: 'video bị gỡ/hạn chế', text: 'x' }, { GITHUB_TOKEN: 't', GITHUB_REPOSITORY: 'o/r' }, fx);
ok(calls.some(c => c[0].endsWith('/issues/7/comments') && c[1] === 'POST'), 'trùng issue đang mở → bình luận, không tạo mới');
await raise({ k: 'yt-zero3:B', title: 'kênh 0 view mới 3 ngày', text: 'x' }, { GITHUB_TOKEN: 't', GITHUB_REPOSITORY: 'o/r' }, fx);
ok(calls.some(c => c[0].endsWith('/issues') && c[1] === 'POST' && /social-alert/.test(c[2])), 'issue mới nhãn social-alert');
if (fails) process.exit(1); console.log('yt-stats ok');
