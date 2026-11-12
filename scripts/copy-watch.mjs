// Dò bản sao chép: lấy 1 câu "đặc trưng" của vài bài mới nhất, tìm chính xác "…" qua Brave Search API (gói Free ~2.000 lượt/tháng,
// 1 lượt/giây; secret BRAVE_SEARCH_KEY). Không có khóa → in hướng dẫn tra tay rồi thoát 0 (không lỗi CI).
// + Canary (content/protection/canaries.json, mục có "q"): cụm tên riêng hư cấu cài trong kho đề/từ → tìm nguyên văn qua Brave (khi có khóa)
//   và GitHub code search (GITHUB_TOKEN của Actions, miễn phí, 10 lượt/phút) – bản chép kho đề/từ hay bị đẩy lên GitHub/bộ dữ liệu.
// Dùng: node scripts/copy-watch.mjs [--posts 6] [--dry]   → reports/copy-watch.json; thoát 3 khi có kết quả nghi chép (CI mở issue).
import fs from 'node:fs'; import { pathToFileURL } from 'node:url';
import { loadPosts, isLive, publishTime, plainText, postUrl } from './lib/blog-content.mjs';
import { request, sleep } from './lib/http.mjs';

const OWN = /(^|\.)lexkite\.com$|^lexkiteapp\.github\.io$/;
export const OWN_REPOS = /^(lexkiteapp|braydanamilio-spec)\//i; // repo của chính Lexkite (repo công khai chứa sẵn canary)
export const CANARIES = 'content/protection/canaries.json';
// Canary → probe: url giả trên lexkite.com (Quản trị chỉ nhận https) để biết canary nào bị lộ
export const canaryProbes = (list = JSON.parse(fs.readFileSync(CANARIES, 'utf8')).canaries) => list.filter(c => c.q).map(c => ({ url: `https://lexkite.com/#canary-${c.id}`, sentence: c.q, canary: c.id }));
export const ghSuspects = items => (items || []).filter(x => x && x.repository && !OWN_REPOS.test(x.repository.full_name || '')).map(x => ({ url: x.html_url, title: `GitHub: ${x.repository.full_name}/${x.path}` }));
// Câu đặc trưng: 60–220 ký tự, không link/số liệu/ngoặc, ưu tiên câu dài nhiều ký tự khác nhau (ít khả năng trùng ngẫu nhiên)
export function signature(body) {
  const txt = plainText(body.split('\n').filter(l => !/^\s*(#|[-*\d]+[.)]?\s|\|)/.test(l)).join('\n')).split(/\n\s*\n/).map(x => x.replace(/\s+/g, ' ').trim()).join('\n');
  const s = txt.split(/\n|(?<=[.!?])\s+|(?<=[。！？])/).map(x => x.trim()).filter(x => x.length >= (/[\u3040-\u9fff\u0e00-\u0e7f]/.test(x) ? 25 : 60) && x.length <= 220 && !/[\d()\[\]/:"“”]/.test(x));
  return s.sort((a, b) => new Set(b).size - new Set(a).size || b.length - a.length)[0] || null;
}
export const suspects = (results, own = OWN) => results.filter(r => { try { return !own.test(new URL(r.url).host); } catch { return false; } });

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const a = process.argv.slice(2), n = Number((a[a.indexOf('--posts') + 1]) || 6) || 6, dry = a.includes('--dry'), key = process.env.BRAVE_SEARCH_KEY, gh = process.env.GITHUB_TOKEN;
  const posts = loadPosts().filter(p => isLive(p)).sort((x, y) => publishTime(y) - publishTime(x)).slice(0, n);
  const probes = posts.map(p => ({ url: postUrl(p), sentence: signature(p.body) })).filter(p => p.sentence), cans = canaryProbes();
  if (dry || (!key && !gh)) {
    console.log(`· copy-watch: ${dry ? 'chạy thử' : 'chưa có BRAVE_SEARCH_KEY/GITHUB_TOKEN – bỏ qua tìm tự động'}. Tra tay (docs/CONTENT-PROTECTION.md §5): dán từng câu trong ngoặc kép vào Google/Bing:`);
    for (const p of [...probes, ...cans]) console.log(`  "${p.sentence}"  ← ${p.canary ? `canary ${p.canary}` : p.url}`);
    process.exit(0);
  }
  const report = { at: new Date().toISOString(), configured: !!key, probes: [] }; let hit = 0;
  const brave = q => { const r = request(`https://api.search.brave.com/res/v1/web/search?count=10&q=${encodeURIComponent(`"${q}"`)}`, { headers: { Accept: 'application/json', 'X-Subscription-Token': key } });
    let res = []; try { res = (JSON.parse(r.body).web?.results || []).map(x => ({ url: x.url, title: x.title })); } catch {} return { status: r.status, res }; };
  const ghCode = q => { const r = request(`https://api.github.com/search/code?per_page=20&q=${encodeURIComponent(`"${q}"`)}`, { headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${gh}`, 'X-GitHub-Api-Version': '2022-11-28' } });
    let items = []; try { items = JSON.parse(r.body).items || []; } catch {} return { status: r.status, sus: ghSuspects(items) }; };
  for (const p of [...(key ? probes : []), ...cans]) {
    let sus = [], st = 0, total = 0;
    if (key) { const b = brave(p.sentence); st = b.status; total += b.res.length; sus.push(...suspects(b.res)); await sleep(1200); }
    if (gh && p.canary) { const g = ghCode(p.sentence); st = st || g.status; sus.push(...g.sus); await sleep(7000); } // code search: 10 lượt/phút
    hit += sus.length; report.probes.push({ ...p, status: st, suspects: sus });
    console.log(`${sus.length ? '⚠' : '✓'} ${p.canary ? `canary ${p.canary}` : p.url}: ${st && st !== 200 ? `HTTP ${st}` : `${sus.length} trang ngoài`}${total ? ` / ${total} kết quả` : ''}`);
    for (const s of sus) console.log(`    → ${s.url}`);
  }
  fs.mkdirSync('reports', { recursive: true }); fs.writeFileSync('reports/copy-watch.json', JSON.stringify(report, null, 1));
  process.exit(hit ? 3 : 0);
}
