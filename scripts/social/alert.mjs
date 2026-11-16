// Cảnh báo social: 1 issue nhãn social-alert (GitHub gửi email người theo dõi repo); trùng tiêu đề issue đang mở → thêm bình luận. Dùng chung auto.mjs + coverage.mjs.
export async function alert(a) {
  const tok = process.env.GITHUB_TOKEN, repo = process.env.GITHUB_REPOSITORY;
  const title = '🛰️ Social autopilot: ' + String(a.k || 'alert').split(':')[0], body = `${a.text}\n\n- khóa: \`${a.k}\`\n- lúc: ${new Date(a.at || Date.now()).toISOString()}\n- Quản trị › Video & Social › Hàng đợi › Autopilot · docs/DISTRIBUTION.md §6b`;
  console.log('⚠️', a.k, '–', a.text);
  if (!tok || !repo) return;
  const gh = (path, init = {}) => fetch('https://api.github.com/repos/' + repo + path, { ...init, headers: { Authorization: 'Bearer ' + tok, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' } }).catch(() => null);
  const open = await gh('/issues?state=open&labels=social-alert&per_page=30'), list = open && open.ok ? await open.json() : [];
  const ex = list.find(i => i.title === title);
  const r = ex ? await gh(`/issues/${ex.number}/comments`, { method: 'POST', body: JSON.stringify({ body }) }) : await gh('/issues', { method: 'POST', body: JSON.stringify({ title, body, labels: ['social-alert'] }) });
  console.log(r && r.ok ? (ex ? '↳ bình luận issue #' + ex.number : '↳ đã mở issue') : '✗ không mở được issue ' + (r ? r.status : ''));
}
