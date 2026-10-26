#!/usr/bin/env node
import { fileURLToPath } from 'node:url';
// Đăng ảnh minh hoạ đã qua QC vào kho từ vựng MỘT NGUỒN (content/lexicon/img.json) + kho ảnh lexkite-media/vimg/ (media.lexkite.com/vimg/<h>.webp).
//   node scripts/vocab-img/publish.mjs --gaps N                     in {items:[…]} N nghĩa vẽ được (vimg-select.json) chưa có ảnh/đã bị gỡ, điểm cao trước
//   node scripts/vocab-img/publish.mjs --result r.json --review v.json [--push]
// Chặn: img.json style.approved phải = true và style.v = STYLE.v (chủ duyệt phong cách sau tờ ảnh thử) – chưa duyệt → thoát 1, không đăng gì.
// 5 % ảnh đạt (review.json, tất định) → content/lexicon/img-review.json (hàng chờ Quản trị). Không thêm file nào vào Cloudflare Pages.
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { STYLE } from './style.mjs';

const arg = n => { const i = process.argv.indexOf('--' + n); return i > 0 ? process.argv[i + 1] : undefined; };
const ROOT = new URL('../../', import.meta.url), P = p => fileURLToPath(new URL(p, ROOT));
const J = p => JSON.parse(fs.readFileSync(P(p), 'utf8'));
const IMG = 'content/lexicon/img.json', REV = 'content/lexicon/img-review.json';
const img = J(IMG);

if (arg('gaps')) {
  // chỉ nghĩa qua luật nghiêm (strict.mjs ruleCheck) và chưa bị thẻ đánh dấu skip; thẻ còn thiếu do cards.mjs viết ngay sau bước này
  const sel = J('content/lexicon/vimg-select.json').items, cards = J('content/lexicon/vimg-cards.json').items, lex = J('dist/lexicon.json');
  const { ruleCheck } = await import('./strict.mjs');
  const ks = Object.keys(sel).filter(k => !img.items[k] && !img.rejected[k] && !(cards[k] && cards[k].skip) && ruleCheck(k, lex[k], sel[k][1]).ok).sort((a, b) => sel[b][0] - sel[a][0] || (a < b ? -1 : 1)).slice(0, +arg('gaps'));
  process.stdout.write(JSON.stringify({ items: ks }));
  process.exit(0);
}
if (!(img.style && img.style.approved === true && img.style.v === STYLE.v)) { console.error(`✗ phong cách ${STYLE.v} chưa được chủ duyệt (img.json style.approved) – không đăng`); process.exit(1); }
const res = JSON.parse(fs.readFileSync(arg('result'), 'utf8')).items, outDir = path.dirname(arg('result'));
// thẻ vẽ mới do cards.mjs viết trong lượt CI (artifact out-cards.json) → gộp vào kho thẻ (chỉ THÊM, không đè thẻ đã có / thẻ chủ sửa)
const CARDS = 'content/lexicon/vimg-cards.json';
if (arg('cards') && fs.existsSync(arg('cards'))) {
  const cur = J(CARDS), add = JSON.parse(fs.readFileSync(arg('cards'), 'utf8')).items; let c = 0;
  for (const [k, v] of Object.entries(add)) if (!cur.items[k]) { cur.items[k] = v; c++; }
  fs.writeFileSync(P(CARDS), (await import('./cards.mjs')).fmtCards(cur)); console.log(`+ ${c} thẻ vẽ`);
}
const review = arg('review') && fs.existsSync(arg('review')) ? JSON.parse(fs.readFileSync(arg('review'), 'utf8')).items : [];
const media = process.env.MEDIA_DIR || path.join(process.env.RUNNER_TEMP || '/tmp', 'lexkite-media');
if (process.argv.includes('--push')) {
  const tok = process.env.LEXKITE_MEDIA_TOKEN; if (!tok) { console.error('✗ thiếu secret LEXKITE_MEDIA_TOKEN'); process.exit(1); }
  if (!fs.existsSync(media)) execFileSync('git', ['clone', '-q', '--depth', '1', `https://x-access-token:${tok}@github.com/lexkiteapp/lexkite-media.git`, media]);
}
fs.mkdirSync(path.join(media, 'vimg'), { recursive: true });
let n = 0; const now = new Date().toISOString().slice(0, 10), BATCH = process.env.GITHUB_RUN_ID || arg('batch') || now;   // b = lô (spot.mjs loại cả lô khi > 2 % sai)
for (const [k, r] of Object.entries(res)) {
  if (!r.pass || !r.h || img.rejected[k]) continue;
  // mọi biến thể: <h>.webp, <h>.avif, (<h>@2x.webp/.avif khi x2) – cùng tên băm, immutable
  for (const f of fs.readdirSync(path.join(outDir, 'final')).filter(f => f.startsWith(r.h))) fs.copyFileSync(path.join(outDir, 'final', f), path.join(media, 'vimg', f));
  if (!r.judge || !r.judge.hit) continue;   // KHÔNG BAO GIỜ đăng ảnh chưa được giám khảo gọi đúng tên (hàng chờ / CLIP-only)
  const src = r.src || { tier: 'ai', lic: 'own', by: 'Lexkite' };   // tầng + giấy phép (icon Noto Apache-2.0 | photo Pixabay/Pexels | ai)
  const it = { h: r.h, url: img.base + r.h + '.webp', alt: k.split('#')[0], sv: STYLE.v, fmt: r.fmt && r.fmt.length ? r.fmt : ['webp'], ...(r.x2 ? { x2: true } : {}),
    src, q: { score: +(r.p || 0).toFixed(3), rank: r.rank, vision: (r.vision || {}).provider || 'clip-only', named: (r.judge || {}).named || '' }, ph: r.ph, at: now, b: BATCH };
  if (src.tier === 'photo') img.items[k] = { ...(img.items[k] || {}), photo: { h: it.h, fmt: it.fmt, src } };   // ảnh chụp: trường riêng, chỉ trang /words/
  else img.items[k] = { ...it, ...(img.items[k] && img.items[k].photo ? { photo: img.items[k].photo } : {}) };
  n++;
}
const sorted = o => Object.fromEntries(Object.entries(o).sort(([a], [b]) => (a < b ? -1 : 1)));
img.items = sorted(img.items);
fs.writeFileSync(P(IMG), JSON.stringify(img, null, 1) + '\n');
const rq = fs.existsSync(P(REV)) ? J(REV) : { _note: 'Hàng chờ duyệt ảnh (5 % mẫu tất định mỗi lô) – Quản trị đánh dấu ok/bad; bad → img.json rejected', items: {} };
for (const k of review) if (img.items[k] && !rq.items[k]) rq.items[k] = { h: img.items[k].h, at: now, status: 'pending' };
fs.writeFileSync(P(REV), JSON.stringify(rq, null, 1) + '\n');
console.log(`✓ đăng ${n} ảnh · hàng chờ duyệt ${Object.values(rq.items).filter(x => x.status === 'pending').length}`);
if (process.argv.includes('--push') && n) {
  const g = (...a) => execFileSync('git', ['-C', media, ...a], { stdio: 'inherit' });
  g('-c', 'user.name=lexkite-bot', '-c', 'user.email=lexkite-bot@users.noreply.github.com', 'add', 'vimg'); g('-c', 'user.name=lexkite-bot', '-c', 'user.email=lexkite-bot@users.noreply.github.com', 'commit', '-qm', `vimg: +${n}`); g('push', '-q', 'origin', 'HEAD');
  execFileSync('node', [P('scripts/build-lexicon.mjs'), '--write'], { stdio: 'inherit' });
  const m = (...a) => execFileSync('git', ['-C', P('.'), ...a], { stdio: 'inherit' });
  m('-c', 'user.name=lexkite-bot', '-c', 'user.email=lexkite-bot@users.noreply.github.com', 'add', IMG, REV, CARDS, 'web/js/lexicon-img.json', 'extension/app/js/lexicon-img.json');
  m('-c', 'user.name=lexkite-bot', '-c', 'user.email=lexkite-bot@users.noreply.github.com', 'commit', '-qm', `Ảnh minh hoạ từ vựng: +${n}`);
  for (let i = 0; i < 5; i++) { try { m('pull', '-q', '--rebase', 'origin', 'main'); m('push', '-q', 'origin', 'HEAD:main'); break; } catch (e) { if (i === 4) throw e; } }
}
