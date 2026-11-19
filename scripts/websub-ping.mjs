// Báo hub WebSub/PubSubHubbub (Google) rằng RSS vừa có bài mới → hub kéo feed ngay, các dịch vụ đăng ký (gồm Google) thấy bài sớm.
// Feed khai báo hub bằng <atom:link rel="hub"> (scripts/build-blog.mjs). Không dùng Google Indexing API (chỉ cho JobPosting/BroadcastEvent).
// Dùng: node scripts/blog-due.mjs --since 70 | node scripts/websub-ping.mjs [--dry]   hoặc   node scripts/websub-ping.mjs --all
import fs from 'node:fs'; import { pathToFileURL } from 'node:url'; import { config } from './lib/blog-content.mjs'; import { stdinText, request } from './lib/http.mjs';
export const HUB = 'https://pubsubhubbub.appspot.com/';
// URL bài → danh sách feed ngôn ngữ tương ứng (không trùng)
export const feedsFor = (urls, site = 'https://lexkite.com') => [...new Set(urls.map(u => { try { const m = new URL(u).pathname.match(/^\/([a-z]{2})\/blog\//); return m && `${site}/${m[1]}/blog/rss.xml`; } catch { return null; } }).filter(Boolean))].sort();
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const a = process.argv.slice(2), dry = a.includes('--dry'), site = (config().site || 'https://lexkite.com').replace(/\/$/, '');
  let urls = a.filter(x => !x.startsWith('--'));
  if (a.includes('--all')) urls = fs.readdirSync('content/blog').filter(l => /^[a-z]{2}$/.test(l)).map(l => `${site}/${l}/blog/`);
  else if (!urls.length && !process.stdin.isTTY) urls = (await stdinText()).split(/\s+/).filter(Boolean);
  const feeds = feedsFor(urls, site); let bad = 0;
  for (const f of feeds) {
    if (dry) { console.log(`· (dry) ${HUB} hub.url=${f}`); continue; }
    const r = request(HUB, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: `hub.mode=publish&hub.url=${encodeURIComponent(f)}` });
    const ok = r.status === 204 || r.status === 200; if (!ok) bad++;
    console.log(`${ok ? '✓' : '✗'} websub ${f}: HTTP ${r.status}${ok ? '' : ' ' + r.body.slice(0, 200)}`);
  }
  if (!feeds.length) console.log('· websub: không có feed cần báo');
  process.exit(bad ? 1 : 0);
}
