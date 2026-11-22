// DRY-RUN autopilot social không cần máy chủ: đọc manifest kho (lexkite-shorts shorts/index.json) → payload từng nền tảng đúng như autopilot sẽ gửi GrabCast.
// 0 lượt GrabCast/Meta, không tải video, không ghi gì. Kênh: chưa nối (định tuyến thật theo kênh D1 → `node scripts/social/auto.mjs preview`).
// Dùng: node scripts/social/dryrun.mjs --index /tmp/shorts/shorts/index.json [--clip <id>] [--lang vi] [--json out.json]
//       node scripts/social/dryrun.mjs --index <index.json> --carousel <id>-cards   → lệnh Graph (FB feed nhiều ảnh + IG CAROUSEL) mà autopilot sẽ gửi, qua Meta giả (đăng 0, không mạng)
import fs from 'node:fs';
import { previewClip, previewText } from '../../functions/api/_social_preview.js';
import { clipOf } from '../../functions/api/distribution.js';
import { pickPreviewClip } from '../../functions/api/social-auto.js';

const arg = k => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : ''; };
const idx = arg('index'); if (!idx || !fs.existsSync(idx)) { console.error('✗ thiếu --index <shorts/index.json>'); process.exit(2); }
const raw = JSON.parse(fs.readFileSync(idx, 'utf8')), items = Array.isArray(raw) ? raw : raw.items || [];
if (arg('carousel')) { // Carousel ảnh (Slang Card): chạy ĐÚNG fbCarousel/igCarouselContainer với fetcher ghi lại, cổng QC như autopilot (cards_ok + QA đạt)
  const { metaClient, fbCarousel, igCarouselContainer } = await import('../../functions/api/_meta.js'), { isCardClip } = await import('../../functions/api/_distribution.js');
  const c = items.find(x => x.id === arg('carousel'));
  if (!c || !isCardClip(c.id) || c.cards_ok !== true || !c.qa || c.qa.status !== 'pass' || !Array.isArray(c.cards) || c.cards.length < 2) { console.error(`✗ ${arg('carousel')}: không phải carousel đạt cổng QC (cards_ok=true, qa pass, ≥ 2 ảnh)`); process.exit(1); }
  const calls = []; let seq = 0, fetcher = async (url, init) => { const u = new URL(url); calls.push(`${init.method} ${u.host}${u.pathname.replace(/^\/v\d+\.\d/, '')} ${decodeURIComponent(String(init.body || '')).replace(/&/g, ' ')}`); return new Response(JSON.stringify({ id: String(1000000 + ++seq) + (u.pathname.endsWith('/feed') ? '_1' : '') }), { status: 200 }); };
  const urls = c.cards.map(p => 'https://lexkite.com/api/admin-shorts?p=' + encodeURIComponent(p) + '&e=0&s=dry');
  await fbCarousel(metaClient({}, { token: 'dry'.repeat(10), host: 'fb', fetcher }), '123456789', { image_urls: urls, message: [c.description, (c.hashtags || []).join(' ')].filter(Boolean).join('\n\n') });
  await igCarouselContainer(metaClient({}, { token: 'dry'.repeat(10), host: 'ig', fetcher }), '178000000001', { image_urls: urls, caption: c.description });
  console.log(`facebook_page + instagram · ${c.id} · ${c.cards.length} ảnh\n` + calls.map(x => '  ' + x).join('\n') + `\n\n(dry-run: carousel ${c.id} · đăng 0 · lượt Meta 0 · lượt GrabCast 0)`); process.exit(0);
}
const it = pickPreviewClip(items, arg('clip'));
if (!it) { console.error(`✗ không có clip ${arg('clip') ? arg('clip') : 'đạt QC'} trong kho (${items.length} mục)`); process.exit(1); }
const c = { ...clipOf(it), cover: clipOf(it).cover || it.cover || '' }; if (arg('lang')) c.lang = arg('lang').toLowerCase();
const pv = previewClip(c);
console.log(previewText(pv));
const bad = pv.posts.filter(x => x.issues.some(i => i.startsWith('error:')));
console.log(`\n(dry-run: ${pv.posts.length} nền tảng · đăng 0 · lượt GrabCast 0 · lỗi chặn ${bad.length}${bad.length ? ': ' + bad.map(x => x.platform + '=' + x.issues.join('+')).join(' ') : ''})`);
if (arg('json')) fs.writeFileSync(arg('json'), JSON.stringify(pv, null, 1));
if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, '## Dry-run autopilot social\n\n```\n' + previewText(pv).slice(0, 60000) + '\n```\n');
