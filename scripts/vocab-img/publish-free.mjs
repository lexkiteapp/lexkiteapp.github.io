#!/usr/bin/env node
// Đăng tầng MIỄN PHÍ (free_tier.py) vào CÙNG chỉ mục một nguồn content/lexicon/img.json + kho lexkite-media/vimg/ (media.lexkite.com/vimg/<h>.*).
//   node scripts/vocab-img/publish-free.mjs --result out/free/result.json [--push]
// icon → mục ảnh chính (h) – tất định, đã soát tay (vimg-icon-overrides.json), q.vision = 'deterministic' (KHÔNG cần giám khảo AI);
// wiki → trường photo (CHỈ trang từ điển + /words/, không thẻ học). Chỉ đăng nghĩa CÒN trong vimg-icons-lex.json / vimg-wiki.json (danh sách chặn mới nhất thắng).
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { STYLE } from './style.mjs';

const arg = n => { const i = process.argv.indexOf('--' + n); return i > 0 ? process.argv[i + 1] : undefined; };
const ROOT = new URL('../../', import.meta.url), P = p => new URL(p, ROOT).pathname, J = p => JSON.parse(fs.readFileSync(P(p), 'utf8'));
const IMGF = 'content/lexicon/img.json', img = J(IMGF), ic = J('content/lexicon/vimg-icons-lex.json').items, wk = J('content/lexicon/vimg-wiki.json').items;
const rf = arg('result'), res = JSON.parse(fs.readFileSync(rf, 'utf8')).items, dir = path.join(path.dirname(rf), 'final');
const media = process.env.MEDIA_DIR || path.join(process.env.RUNNER_TEMP || '/tmp', 'lexkite-media'), PUSH = process.argv.includes('--push');
const bot = ['-c', 'user.name=lexkite-bot', '-c', 'user.email=lexkite-bot@users.noreply.github.com'];
if (PUSH) {
  const tok = process.env.LEXKITE_MEDIA_TOKEN; if (!tok) { console.error('✗ thiếu secret LEXKITE_MEDIA_TOKEN'); process.exit(1); }
  if (!fs.existsSync(media)) execFileSync('git', ['clone', '-q', '--depth', '1', `https://x-access-token:${tok}@github.com/lexkiteapp/lexkite-media.git`, media]);
}
fs.mkdirSync(path.join(media, 'vimg'), { recursive: true });
const now = new Date().toISOString().slice(0, 10), B = process.env.GITHUB_RUN_ID || now, n = { icon: 0, wiki: 0 };
for (const [k, r] of Object.entries(res)) {
  if (img.rejected[k]) continue;
  if (r.tier === 'icon' ? !ic[k] || (img.items[k] && img.items[k].h) : !wk[k]) continue;
  for (const e of r.fmt) fs.copyFileSync(path.join(dir, `${r.h}.${e}`), path.join(media, 'vimg', `${r.h}.${e}`));
  const cur = img.items[k] || {};
  if (r.tier === 'icon') img.items[k] = { h: r.h, url: img.base + r.h + '.webp', alt: k.split('#')[0], sv: STYLE.v, fmt: r.fmt, src: r.src, q: { score: 1, rank: 1, vision: 'deterministic', named: r.name }, at: now, b: B, ...(cur.photo ? { photo: cur.photo } : {}) };
  else img.items[k] = { ...cur, photo: { h: r.h, fmt: r.fmt, src: r.src } };
  n[r.tier]++;
}
img.items = Object.fromEntries(Object.entries(img.items).sort(([a], [b]) => (a < b ? -1 : 1)));
fs.writeFileSync(P(IMGF), JSON.stringify(img, null, 1) + '\n');
console.log(`✓ đăng icon ${n.icon} · wiki ${n.wiki} · img.json: ${Object.values(img.items).filter(x => x.h).length} ảnh chính, ${Object.values(img.items).filter(x => x.photo).length} ảnh từ điển`);
execFileSync('node', [P('scripts/build-lexicon.mjs'), '--write'], { stdio: 'inherit' });
if (PUSH && (n.icon || n.wiki)) {
  const g = (...a) => execFileSync('git', ['-C', media, ...a], { stdio: 'inherit' });
  g(...bot, 'add', 'vimg'); g(...bot, 'commit', '-qm', `vimg: +${n.icon} icon, +${n.wiki} wiki`); g('push', '-q', 'origin', 'HEAD');
  const m = (...a) => execFileSync('git', ['-C', P('.'), ...a], { stdio: 'inherit' });
  m(...bot, 'add', IMGF, 'web/js/lexicon-img.json', 'extension/app/js/lexicon-img.json');
  m(...bot, 'commit', '-qm', `Ảnh từ vựng tầng miễn phí: +${n.icon} icon, +${n.wiki} Wikimedia`);
  for (let i = 0; i < 5; i++) { try { m('pull', '-q', '--rebase', 'origin', 'main'); m('push', '-q', 'origin', 'HEAD:main'); break; } catch (e) { if (i === 4) throw e; } }
}
