// Analytics YouTube (chỉ đọc, youtube.readonly): gọi /api/youtube op `stats` (server giữ token, CI không thấy) → bảng ngắn: tổng view, top/bottom 5, kênh 0 view, thiếu quyền.
//   node scripts/social/yt-stats.mjs [--json out.json]   env LEXKITE_DRIVE_CLI_KEY · ghi cả vào $GITHUB_STEP_SUMMARY
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import { ytApi } from '../video/yt-upload.mjs';

/** Cảnh báo (hàm thuần, có test): kênh 0 view ≥ 3 ngày, video bị gỡ/hạn chế, quota sắp cạn (≥ 80 % nhóm mặc định). */
export function alertsOf(s) {
  const A = [];
  for (const c of s.zero3 || []) A.push({ k: 'yt-zero3:' + c, title: 'kênh 0 view mới 3 ngày', text: `Kênh ${((s.channels || []).find(x => x.channel_id === c) || {}).title || c} không có view mới trong ≥ 3 ngày dù có video đã đăng.` });
  if ((s.gone || []).length) A.push({ k: 'yt-gone', title: 'video bị gỡ/hạn chế', text: 'Video không còn đọc được trên YouTube (gỡ, riêng tư hoặc bị hạn chế): ' + s.gone.slice(0, 10).join(', ') });
  const q = s.quota; if (q && q.limit && q.used >= q.limit * 0.8) A.push({ k: 'yt-quota', title: 'quota sắp cạn', text: `Quota YouTube hôm nay ${q.used}/${q.limit} (≥ 80 %).` });
  return A;
}
/** Mở 1 issue nhãn social-alert (GitHub gửi email); trùng tiêu đề đang mở → thêm bình luận – cùng cơ chế scripts/social/auto.mjs. */
export async function raise(a, env = process.env, fetcher = fetch) {
  console.log('⚠️', a.k, '–', a.text);
  const tok = env.GITHUB_TOKEN, repo = env.GITHUB_REPOSITORY; if (!tok || !repo) return false;
  const gh = (path, init = {}) => fetcher('https://api.github.com/repos/' + repo + path, { ...init, headers: { Authorization: 'Bearer ' + tok, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' } }).catch(() => null);
  const title = '📉 Social analytics: ' + a.title + (a.k.includes(':') ? ' (' + a.k.split(':')[1] + ')' : ''), body = `${a.text}\n\n- khóa: \`${a.k}\`\n- Quản trị › Video & Social › Phân tích`;
  const open = await gh('/issues?state=open&labels=social-alert&per_page=50'), list = open && open.ok ? await open.json() : [], ex = list.find(i => i.title === title);
  const r = ex ? await gh(`/issues/${ex.number}/comments`, { method: 'POST', body: JSON.stringify({ body }) }) : await gh('/issues', { method: 'POST', body: JSON.stringify({ title, body, labels: ['social-alert'] }) });
  return !!(r && r.ok);
}

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
    gone: gone.map(v => v.video_id), zero3: res.zero3 || [], errors: res.errors || [], quota: res.quota || null,
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
    for (const a of alertsOf(s)) await raise(a);
    const j = process.argv.indexOf('--json'); if (j > 0) fs.writeFileSync(process.argv[j + 1], JSON.stringify(s, null, 1));
    if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, t + '\n');
  } catch (e) { console.error('yt-stats:', e.code || e.message); if (e.code === 'quota-breaker') await raise({ k: 'yt-quota', title: 'quota sắp cạn', text: 'Cầu dao stats: quota mặc định YouTube đã dùng ≥ 80 %, bỏ qua lượt đo.' }); process.exit(e.status === 429 ? 0 : 1); } // breaker/quota → trung tính, mai chạy tiếp
}
