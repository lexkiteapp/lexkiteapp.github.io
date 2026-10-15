// Ảnh blog: .media/src/<id>.png → AVIF + WebP ở 480/960/1440 px (tên có mã băm → cache vĩnh viễn) trong .media/out/blog/,
// ghi sổ content/blog/media.json (nhỏ, có trong git). Ảnh KHÔNG vào repo chính: --push đẩy lên repo lexkiteapp/lexkite-media (GitHub Pages).
// Cần sharp: bash scripts/setup-media-tools.sh. Dùng: node scripts/blog-media.mjs [--push] [--local]
import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto'; import { createRequire } from 'node:module'; import { execFileSync } from 'node:child_process';
const TOOLS = process.env.LEXKITE_TOOLS || `${process.cwd()}/.tools`;
const sharp = createRequire(TOOLS + '/')('sharp');
const SRC = '.media/src', OUT = '.media/out', MAN = 'content/blog/media.json', WIDTHS = [480, 960, 1440];
const REPO = process.env.MEDIA_REPO || 'lexkiteapp/lexkite-media';
const man = fs.existsSync(MAN) ? JSON.parse(fs.readFileSync(MAN, 'utf8')) : { items: {} };
fs.mkdirSync(`${OUT}/blog`, { recursive: true });
let made = 0;
for (const f of fs.readdirSync(SRC).filter(f => /\.(png|jpe?g|webp)$/i.test(f)).sort()) {
  const id = f.replace(/\.[^.]+$/, ''), buf = fs.readFileSync(path.join(SRC, f));
  const hash = crypto.createHash('sha256').update(buf).digest('hex').slice(0, 10);
  const meta = await sharp(buf).metadata();
  const widths = WIDTHS.filter(w => w < meta.width).concat(meta.width < WIDTHS.at(-1) ? [meta.width] : []).slice(0, 3);
  if (!widths.length || widths.at(-1) !== Math.min(meta.width, WIDTHS.at(-1))) widths.push(Math.min(meta.width, WIDTHS.at(-1)));
  const ws = [...new Set(widths)].sort((a, b) => a - b);
  const old = man.items[id];
  if (old && old.hash === hash && ws.every(w => fs.existsSync(`${OUT}/blog/${id}-${hash}-${w}.webp`))) continue;
  for (const w of ws) {
    const r = sharp(buf).resize({ width: w });
    await r.clone().webp({ quality: 78, effort: 5 }).toFile(`${OUT}/blog/${id}-${hash}-${w}.webp`);
    await r.clone().avif({ quality: 52, effort: 5 }).toFile(`${OUT}/blog/${id}-${hash}-${w}.avif`);
  }
  man.items[id] = { hash, w: meta.width, h: meta.height, widths: ws, ...(old && old.base ? { base: old.base } : {}) };
  made++; console.log(`✓ ${id} ${meta.width}×${meta.height} → ${ws.join('/')} px`);
}
man.items = Object.fromEntries(Object.entries(man.items).sort());
fs.writeFileSync(MAN, JSON.stringify(man, null, 1) + '\n');
const size = fs.readdirSync(`${OUT}/blog`).reduce((s, f) => s + fs.statSync(`${OUT}/blog/${f}`).size, 0);
console.log(`✓ media.json: ${Object.keys(man.items).length} ảnh (${made} mới) · .media/out ${(size / 1048576).toFixed(1)} MB`);
if (process.argv.includes('--push')) { // bản sao repo ảnh trong .media/repo → chép file mới → commit → push
  const dir = '.media/repo', git = (...a) => execFileSync('git', ['-C', dir, ...a], { stdio: 'inherit' });
  if (!fs.existsSync(dir)) execFileSync('git', ['clone', '--depth', '1', `https://github.com/${REPO}.git`, dir], { stdio: 'inherit' }); else git('pull', '--ff-only');
  fs.mkdirSync(`${dir}/blog`, { recursive: true });
  let n = 0; for (const f of fs.readdirSync(`${OUT}/blog`)) if (!fs.existsSync(`${dir}/blog/${f}`)) { fs.copyFileSync(`${OUT}/blog/${f}`, `${dir}/blog/${f}`); n++; }
  if (!fs.existsSync(`${dir}/.nojekyll`)) fs.writeFileSync(`${dir}/.nojekyll`, '');
  if (n) { git('add', '-A'); git('commit', '-qm', `Ảnh blog: ${n} file`); git('push', '-q'); }
  console.log(n ? `✓ Đã đẩy ${n} file lên ${REPO}` : '· Repo ảnh đã đủ file');
}
