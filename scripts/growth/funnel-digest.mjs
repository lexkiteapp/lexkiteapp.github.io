// Tóm tắt phễu hằng ngày → 1 comment vào issue "Phễu tăng trưởng – hằng ngày" (nhãn growth-funnel; chủ nhận qua thông báo GitHub như ci-queue-report).
// Mỗi ngày đúng 1 tin (dấu ngày <!-- fd:YYYY-MM-DD --> chống trùng khi chạy lại), gửi lúc 08:05 giờ VN (ngoài giờ yên lặng). Chỉ số đếm tổng hợp.
// node scripts/growth/funnel-digest.mjs [--dry]   (cần STUDIO_CALLBACK_SECRET, LEXKITE_CI_HEADER)
const arrow = (a, b) => (b > 0 ? (a >= b ? '▲' : '▼') + ' ' + Math.abs(Math.round(((a - b) / b) * 100)) + '%' : (a > 0 ? '▲ mới' : '–'));
const pct = (a, b) => (b > 0 ? Math.round((a / b) * 1000) / 10 + '%' : '–');
export function format(d) {
  const L = [`**Phễu ${d.day}** (người thật, so với hôm trước)`, '',
    `- Xem trang /go: **${d.views}** ${arrow(d.views, d.prevViews)} · bấm tải: **${d.ctas}** ${arrow(d.ctas, d.prevCtas)} (${pct(d.ctas, d.views)})`,
    `- Mở app từ link kênh: **${d.app}** ${arrow(d.app, d.prevApp)} · xong bài đầu: **${d.fl}** ${arrow(d.fl, d.prevFl)} (${pct(d.fl, d.app)})`];
  if (d.install && d.install.length) L.push('', '| Cài app | xem lời mời | bấm | tỷ lệ | nút Tải |', '|---|--:|--:|--:|--:|', ...d.install.map(r => `| ${r.plat} | ${r.seen} | ${r.click} | ${r.clickPct == null ? '–' : r.clickPct + '%'} | ${r.btn} |`));
  if (d.top && d.top.length) L.push('', 'Kênh/mã đứng đầu (7 ngày): ' + d.top.map(r => `${r.src || '?'}/${r.code || r.camp || '-'} (${r.views}→${r.app}→${r.fl})`).join(' · '));
  L.push('', '_Lượt cài thật xem ở App Store Connect / Play Console. Chi tiết: Admin › Kênh._', `<!-- fd:${d.day} -->`);
  return L.join('\n');
}
async function main() {
  const dry = process.argv.includes('--dry'), E = process.env;
  const r = await fetch(E.FUNNEL_API || 'https://lexkite.com/api/funnel-digest', { headers: { 'X-Studio-Secret': E.STUDIO_CALLBACK_SECRET || '', 'User-Agent': 'lexkite-ci', ...(E.LEXKITE_CI_HEADER ? { 'X-Lexkite-CI': E.LEXKITE_CI_HEADER } : {}) } });
  if (!r.ok) throw new Error('funnel-digest ' + r.status);
  const d = await r.json(), md = format(d);
  console.log(md);
  if (dry) return;
  const { ghApi } = await import('../ci/gh-api.mjs'), R = `/repos/${E.GITHUB_REPOSITORY || 'lexkiteapp/lexkiteapp.github.io'}`;
  const gh = async (m, p, data) => { const x = await ghApi(m, R + p, data ? { data: JSON.stringify(data) } : {}); if (x.status >= 400) throw new Error(`${m} ${p.slice(0, 50)} → ${x.status}`); return typeof x.body === 'string' ? JSON.parse(x.body || '{}') : x.body; };
  const LABEL = 'growth-funnel', MARK = '<!-- growth-funnel -->';
  let issue = ((await gh('GET', `/issues?state=open&labels=${LABEL}&per_page=20`)) || []).find(i => (i.body || '').includes(MARK));
  if (!issue) issue = await gh('POST', '/issues', { title: 'Phễu tăng trưởng – hằng ngày', labels: [LABEL], body: `${MARK}\nMỗi ngày 1 comment (funnel-digest.yml): xem /go → bấm tải → mở app → xong bài đầu, và bảng cài app theo nền tảng.` });
  const seen = ((await gh('GET', `/issues/${issue.number}/comments?per_page=100&sort=created&direction=desc`)) || []).some(c => (c.body || '').includes(`<!-- fd:${d.day} -->`));
  if (seen) return console.log('đã đăng ngày này');
  await gh('POST', `/issues/${issue.number}/comments`, { body: md });
}
if (import.meta.url === `file://${process.argv[1]}`) main().catch(e => { console.error(e.message); process.exit(1); });
