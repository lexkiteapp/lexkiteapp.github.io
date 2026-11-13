// Analytics YouTube (chỉ đọc, youtube.readonly): gọi /api/youtube op `stats` (server giữ token, CI không thấy) → bảng ngắn: tổng view, top/bottom 5, kênh 0 view, thiếu quyền.
//   node scripts/social/yt-stats.mjs [--json out.json]   env LEXKITE_DRIVE_CLI_KEY · ghi cả vào $GITHUB_STEP_SUMMARY
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import { ytApi } from '../video/yt-upload.mjs';

/** Gộp kết quả `stats` thành số liệu báo cáo (hàm thuần, có test). Không suy đoán: thiếu số → null. */
export function summarize(res, n = 5) {
  const vids = (res.videos || []).filter(v => !v.missing), gone = (res.videos || []).filter(v => v.missing);
  const sum = (a, k) => a.reduce((s, v) => s + (+v[k] || 0), 0);
  const byViews = [...vids].sort((a, b) => b.views - a.views || String(a.video_id).localeCompare(b.video_id));
  const known = k => vids.filter(v => v[k] != null);
  const channels = (res.channels || []).map(c => {
    const vs = vids.filter(v => v.channel_id === c.channel_id);
    return { ...c, n: vs.length, views_total: sum(vs, 'views'), likes: sum(vs, 'likes'), comments: sum(vs, 'comments'), d7: known('d7').length ? sum(vs.filter(v => v.d7 != null), 'd7') : null, zero: vs.length > 0 && sum(vs, 'views') === 0 };
  });
  return {
    day: res.day, videos: vids.length, views: sum(vids, 'views'), likes: sum(vids, 'likes'), comments: sum(vids, 'comments'),
    d7: known('d7').length ? sum(known('d7'), 'd7') : null, d30: known('d30').length ? sum(known('d30'), 'd30') : null,
    top: byViews.slice(0, n), bottom: byViews.slice(-n).reverse(), channels, zero_channels: channels.filter(c => c.zero).map(c => c.channel_id),
    gone: gone.map(v => v.video_id), errors: res.errors || [], quota: res.quota || null,
    gaps: [...(res.analytics ? [] : ['YouTube Analytics (watch time, CTR, retention, giờ xem): thiếu scope yt-analytics.readonly — cần chủ kết nối lại']), ...(res.errors || []).map(e => `${e.channel_id}: ${e.error}`)],
  };
}
export function table(s) {
  const L = [`YouTube ${s.day}: ${s.videos} video · ${s.views} view · ${s.likes} like · ${s.comments} comment · 7 ngày ${s.d7 ?? 'n/a (chưa đủ snapshot)'} · 30 ngày ${s.d30 ?? 'n/a'}`, '', '| kênh | video | view | 7d | subs | ghi chú |', '|---|---|---|---|---|---|'];
  for (const c of s.channels) L.push(`| ${c.title || c.channel_id} | ${c.n} | ${c.views_total} | ${c.d7 ?? 'n/a'} | ${c.subs ?? 'ẩn'} | ${c.zero ? '0 VIEW' : ''} |`);
  L.push('', 'Top: ' + s.top.map(v => `${v.clip || v.video_id}=${v.views}`).join(', '), 'Bottom: ' + s.bottom.map(v => `${v.clip || v.video_id}=${v.views}`).join(', '));
  if (s.gone.length) L.push('Bị gỡ/hạn chế: ' + s.gone.join(', '));
  if (s.gaps.length) L.push('Thiếu: ' + s.gaps.join(' · '));
  return L.join('\n');
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const s = summarize(await ytApi('stats')), t = table(s); console.log(t);
    const j = process.argv.indexOf('--json'); if (j > 0) fs.writeFileSync(process.argv[j + 1], JSON.stringify(s, null, 1));
    if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, t + '\n');
  } catch (e) { console.error('yt-stats:', e.code || e.message); process.exit(e.status === 429 ? 0 : 1); } // breaker/quota → trung tính, mai chạy tiếp
}
