#!/usr/bin/env node
import { fileURLToPath } from 'node:url';
// Đăng tầng MIỄN PHÍ (free_tier.py) vào CÙNG chỉ mục một nguồn content/lexicon/img.json + kho lexkite-media/vimg/ (media.lexkite.com/vimg/<h>.*).
//   node scripts/vocab-img/publish-free.mjs --result out/free/result.json [--stage <dir>]
// icon → mục ảnh chính (h) – tất định, đã soát tay (vimg-icon-overrides.json), q.vision = 'deterministic' (KHÔNG cần giám khảo AI);
// wiki → trường photo (CHỈ trang từ điển + /words/, không thẻ học). Chỉ đăng nghĩa CÒN trong vimg-icons-lex.json / vimg-wiki.json (danh sách chặn mới nhất thắng).
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { STYLE } from './style.mjs';

const arg = n => { const i = process.argv.indexOf('--' + n); return i > 0 ? process.argv[i + 1] : undefined; };
const ROOT = new URL('../../', import.meta.url), P = p => fileURLToPath(new URL(p, ROOT)), J = p => JSON.parse(fs.readFileSync(P(p), 'utf8'));
const IMGF = 'content/lexicon/img.json', img = J(IMGF), ic = J('content/lexicon/vimg-icons-lex.json').items, wk = J('content/lexicon/vimg-wiki.json').items;
const rf = arg('result'), res = JSON.parse(fs.readFileSync(rf, 'utf8')).items, dir = path.join(path.dirname(rf), 'final');
// 12/11: kho ảnh đích nay là m4 (media.lexkite.com/vimg) – chép vào --stage <dir>/vimg, workflow đẩy bằng scripts/media/push.mjs --kind img (deploy key MEDIA4_DEPLOY_KEY);
// lexkite-media cũ (m1) đã đầy nên bước clone bằng LEXKITE_MEDIA_TOKEN bị bỏ.
const media = arg('stage') || process.env.MEDIA_DIR || path.join(process.env.RUNNER_TEMP || '/tmp', 'lexkite-media-stage');
fs.mkdirSync(path.join(media, 'vimg'), { recursive: true });
const now = new Date().toISOString().slice(0, 10), B = process.env.GITHUB_RUN_ID || now, n = { icon: 0, wiki: 0 };
for (const [k, r] of Object.entries(res)) {
  if (img.rejected[k]) continue;
  if (r.tier === 'icon' ? !ic[k] || (img.items[k] && img.items[k].h) : !wk[k]) continue;
  for (const e of r.fmt) fs.copyFileSync(path.join(dir, `${r.h}.${e}`), path.join(media, 'vimg', `${r.h}.${e}`));
  const cur = img.items[k] || {};
  if (r.tier === 'icon') img.items[k] = { h: r.h, url: img.base + r.h + '.webp', alt: k.split('#')[0], sv: STYLE.v, fmt: r.fmt, src: r.src, q: { score: 1, rank: 1, vision: 'deterministic', named: r.name }, at: now, b: B, ...(cur.photo ? { photo: cur.photo } : {}) };
  else img.items[k] = { alt: k.split('#')[0], ...cur, photo: { h: r.h, fmt: r.fmt, src: r.src } };
  n[r.tier]++;
}
img.items = Object.fromEntries(Object.entries(img.items).sort(([a], [b]) => (a < b ? -1 : 1)));
fs.writeFileSync(P(IMGF), JSON.stringify(img, null, 1) + '\n');
console.log(`✓ đăng icon ${n.icon} · wiki ${n.wiki} · img.json: ${Object.values(img.items).filter(x => x.h).length} ảnh chính, ${Object.values(img.items).filter(x => x.photo).length} ảnh từ điển`);
execFileSync('node', [P('scripts/build-lexicon.mjs'), '--write'], { stdio: 'inherit', env: { ...process.env, LEX_CDN_CHECK: '0' } });   // file mới chưa lên CDN – kiểm CDN ở bước sau (workflow)
