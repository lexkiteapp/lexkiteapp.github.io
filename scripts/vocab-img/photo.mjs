#!/usr/bin/env node
// Tầng ẢNH CHỤP (tuỳ chọn, CHỈ cho trang /words/ SEO – thẻ app không bao giờ dùng ảnh chụp, xem docs/LEXICON.md § Chính sách hình theo bề mặt).
// Nguồn miễn phí: Pixabay API (giấy phép Pixabay: được tải & tự lưu trữ, không cần ghi công nhưng ta vẫn ghi) → Pexels API (ghi công khuyến nghị).
// KHÔNG hotlink: tải về out/<dir>/raw/<slug>.a1.jpg → cùng cổng QC (giám khảo gọi tên…) → nén ≤ 6 KB AVIF/WebP → lexkite-media/vimg/ (trường `photo` của mục img.json).
// Chỉ khi ảnh chụp THẮNG hình vẽ cho nghĩa đó: thẻ vimg-cards.json có "photo": true (vd địa điểm/cảnh thật: lighthouse, castle, bridge).
// Khoá: env PIXABAY_KEY / PEXELS_KEY (secret GitHub). Không có khoá → bỏ qua, thoát 0. Tôn trọng hạn mức: Pixabay 100 yêu cầu/60 s, Pexels 200/giờ – ta ≤ 1 yêu cầu/2 s.
//   node scripts/vocab-img/photo.mjs --keys keys.json --out out/vocab-photo
import fs from 'fs';
import path from 'path';
import { slug } from './gen.mjs';

const env = process.env, arg = n => { const i = process.argv.indexOf('--' + n); return i > 0 ? process.argv[i + 1] : undefined; };
const ROOT = new URL('../../', import.meta.url), rd = p => JSON.parse(fs.readFileSync(new URL(p, ROOT), 'utf8'));
/** truy vấn tìm ảnh từ thẻ: đồng nghĩa chính + vật chuẩn rút gọn (không bối cảnh) */
export const queryFor = (card) => String(card.q || card.s[0]).toLowerCase().slice(0, 80);
export const SOURCES = [
  { id: 'pixabay', ok: () => !!env.PIXABAY_KEY, lic: 'Pixabay',
    search: async q => { const j = await (await fetch(`https://pixabay.com/api/?key=${env.PIXABAY_KEY}&q=${encodeURIComponent(q)}&image_type=photo&safesearch=true&per_page=5&orientation=horizontal`)).json();
      const h = (j.hits || [])[0]; return h && { url: h.webformatURL, by: h.user, ref: h.pageURL }; } },
  { id: 'pexels', ok: () => !!env.PEXELS_KEY, lic: 'Pexels',
    search: async q => { const j = await (await fetch(`https://api.pexels.com/v1/search?query=${encodeURIComponent(q)}&per_page=5`, { headers: { Authorization: env.PEXELS_KEY } })).json();
      const p = (j.photos || [])[0]; return p && { url: p.src.medium, by: p.photographer, ref: p.url }; } },
];
async function main() {
  const live = SOURCES.filter(s => s.ok()); if (!live.length) { console.log('tầng ảnh chụp: chưa có PIXABAY_KEY/PEXELS_KEY – bỏ qua'); return; }
  const OUT = arg('out') || 'out/vocab-photo', cards = rd('content/lexicon/vimg-cards.json').items;
  const keys = JSON.parse(fs.readFileSync(arg('keys'), 'utf8')).items.filter(k => cards[k] && cards[k].photo === true);
  fs.mkdirSync(path.join(OUT, 'raw'), { recursive: true });
  const sf = path.join(OUT, 'src.json'), src = fs.existsSync(sf) ? JSON.parse(fs.readFileSync(sf, 'utf8')) : {};
  for (const k of keys) {
    for (const s of live) {
      try {
        const hit = await s.search(queryFor(cards[k])); await new Promise(r => setTimeout(r, 2000)); if (!hit) continue;
        const b = Buffer.from(await (await fetch(hit.url)).arrayBuffer()); if (b.length < 2000) continue;
        fs.writeFileSync(path.join(OUT, 'raw', `${slug(k)}.a1.jpg`), b); src[k] = { tier: 'photo', lic: s.lic, by: `${hit.by} / ${s.lic}`, ref: hit.ref }; console.log(k, '→', s.id, hit.ref); break;
      } catch (e) { console.warn(s.id, k, String(e.message).slice(0, 80)); }
    }
  }
  fs.writeFileSync(sf, JSON.stringify(src, null, 1));
}
if (path.resolve(process.argv[1] || '') === path.resolve(new URL(import.meta.url).pathname)) main();
