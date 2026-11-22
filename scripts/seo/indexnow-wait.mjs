// Chờ tới khi NỘI DUNG MỚI thật sự lên lexkite.com rồi mới báo IndexNow (seo-indexnow.yml). 22/11: bước cũ chỉ chờ URL trả 200 – trang đã có
// từ trước nên luôn 200 ngay, trong khi Pages deploy theo lô ≥ 3 giờ (PAGES_DEPLOY=hook) → Bing được mời đọc bản CŨ.
// Cách kiểm: lấy tối đa 3 URL đổi (ưu tiên /en/, /vi/ – không nằm sau cache biên 1 ngày của 13 ngôn ngữ), tải live, so mainHash(<main>) với băm
// trong danh sách vừa dựng (scripts/lib/lastmod.mjs – cùng hàm build-seo-pages dùng). Khớp ≥ 1 → mã 0 (báo). Hết giờ → mã 3: KHÔNG báo,
// KHÔNG lưu danh sách → lượt lịch sau mỗi lượt deploy (cron) thử lại cùng tập URL.
//   node scripts/seo/indexnow-wait.mjs <changed.txt> <now.txt> [phút=12]     (env X_LEXKITE_CI: header vượt WAF cho CI)
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { mainHash } from '../lib/lastmod.mjs';

export function probes(changed, now, n = 3) {
  const h = new Map(now.map(l => l.split(' ')).filter(x => x[1]).map(([u, x]) => [u, x]));
  const c = changed.filter(u => h.has(u)), pri = u => (/\/\/[^/]+\/(en|vi)\//.test(u) ? 0 : 1);
  return [...c].sort((a, b) => pri(a) - pri(b)).slice(0, n).map(u => [u, h.get(u)]);
}

export async function live(u, want, fetchImpl = fetch, hdr = process.env.X_LEXKITE_CI) {
  try {
    const r = await fetchImpl(`${u}${u.includes('?') ? '&' : '?'}inw=${Date.now()}`, { headers: { 'user-agent': 'lexkite-indexnow-wait', ...(hdr ? { 'X-Lexkite-CI': hdr } : {}) } });
    return r.status === 200 && mainHash(await r.text()) === want;
  } catch { return false; }
}

async function main([cf, nf, min = '12']) {
  const changed = fs.readFileSync(cf, 'utf8').split('\n').filter(Boolean), now = fs.readFileSync(nf, 'utf8').split('\n').filter(Boolean);
  const ps = probes(changed, now);
  if (!ps.length) { console.log('indexnow-wait: không có URL để kiểm (chỉ URL ngoài trang từ/giao tiếp) → báo luôn'); return 0; }
  const end = Date.now() + Number(min) * 60e3;
  for (;;) {
    for (const [u, h] of ps) if (await live(u, h)) { console.log(`✓ nội dung mới đã live: ${u}`); return 0; }
    if (Date.now() > end) { console.log(`::notice title=IndexNow::Bản mới chưa lên site sau ${min} phút (${ps.map(p => p[0]).join(', ')}) – để lượt sau mỗi deploy báo`); return 3; }
    await new Promise(r => setTimeout(r, 60e3));
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) process.exit(await main(process.argv.slice(2)));
