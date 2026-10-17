// Dò bản sao chép: lấy 1 câu "đặc trưng" của vài bài mới nhất, tìm chính xác "…" qua Brave Search API (gói Free ~2.000 lượt/tháng,
// 1 lượt/giây; secret BRAVE_SEARCH_KEY). Không có khóa → in hướng dẫn tra tay rồi thoát 0 (không lỗi CI).
// Dùng: node scripts/copy-watch.mjs [--posts 6] [--dry]   → reports/copy-watch.json; thoát 3 khi có kết quả nghi chép (CI mở issue).
import fs from 'node:fs'; import { pathToFileURL } from 'node:url';
import { loadPosts, isLive, publishTime, plainText, postUrl } from './lib/blog-content.mjs';
import { request, sleep } from './lib/http.mjs';

const OWN = /(^|\.)lexkite\.com$|^lexkiteapp\.github\.io$/;
// Câu đặc trưng: 60–220 ký tự, không link/số liệu/ngoặc, ưu tiên câu dài nhiều ký tự khác nhau (ít khả năng trùng ngẫu nhiên)
export function signature(body) {
  const txt = plainText(body.split('\n').filter(l => !/^\s*(#|[-*\d]+[.)]?\s|\|)/.test(l)).join('\n')).split(/\n\s*\n/).map(x => x.replace(/\s+/g, ' ').trim()).join('\n');
  const s = txt.split(/\n|(?<=[.!?])\s+|(?<=[。！？])/).map(x => x.trim()).filter(x => x.length >= (/[\u3040-\u9fff\u0e00-\u0e7f]/.test(x) ? 25 : 60) && x.length <= 220 && !/[\d()\[\]/:"“”]/.test(x));
  return s.sort((a, b) => new Set(b).size - new Set(a).size || b.length - a.length)[0] || null;
}
export const suspects = (results, own = OWN) => results.filter(r => { try { return !own.test(new URL(r.url).host); } catch { return false; } });

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const a = process.argv.slice(2), n = Number((a[a.indexOf('--posts') + 1]) || 6) || 6, dry = a.includes('--dry'), key = process.env.BRAVE_SEARCH_KEY;
  const posts = loadPosts().filter(p => isLive(p)).sort((x, y) => publishTime(y) - publishTime(x)).slice(0, n);
  const probes = posts.map(p => ({ url: postUrl(p), sentence: signature(p.body) })).filter(p => p.sentence);
  if (!key || dry) {
    console.log(`· copy-watch: ${key ? 'chạy thử' : 'chưa có BRAVE_SEARCH_KEY – bỏ qua tìm tự động'}. Tra tay (docs/CONTENT-PROTECTION.md §Giám sát): dán từng câu trong ngoặc kép vào Google/Bing:`);
    for (const p of probes) console.log(`  "${p.sentence}"  ← ${p.url}`);
    process.exit(0);
  }
  const report = { at: new Date().toISOString(), probes: [] }; let hit = 0;
  for (const p of probes) {
    const r = request(`https://api.search.brave.com/res/v1/web/search?count=10&q=${encodeURIComponent(`"${p.sentence}"`)}`, { headers: { Accept: 'application/json', 'X-Subscription-Token': key } });
    let res = []; try { res = (JSON.parse(r.body).web?.results || []).map(x => ({ url: x.url, title: x.title })); } catch {}
    const sus = suspects(res); hit += sus.length;
    report.probes.push({ ...p, status: r.status, suspects: sus });
    console.log(`${sus.length ? '⚠' : '✓'} ${p.url}: ${r.status !== 200 ? `HTTP ${r.status}` : `${res.length} kết quả, ${sus.length} trang ngoài`}`);
    for (const s of sus) console.log(`    → ${s.url}`);
    await sleep(1200);
  }
  fs.mkdirSync('reports', { recursive: true }); fs.writeFileSync('reports/copy-watch.json', JSON.stringify(report, null, 1));
  process.exit(hit ? 3 : 0);
}
