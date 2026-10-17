// Ảnh RIÊNG từng bài blog: ảnh bìa (mẫu SVG thương hiệu + tiêu đề bản địa) + ảnh chụp app theo đặc tả `shots:` trong front matter.
// CHỈ chạy nặng trên GitHub Actions (.github/workflows/blog-images.yml) – máy anh chủ chỉ chạy `plan`/`status`/`suggest` (nhẹ).
//   node scripts/blog-images.mjs plan   [--mode changed|backfill|pilot] [--since <sha>] [--limit 40] [--lang xx] [--posts en/a,vi/b] [--out .media/plan.json]
//   node scripts/blog-images.mjs render [--plan .media/plan.json]      resvg (bìa) + Playwright (ảnh chụp) + sharp → .media/out/blog/p/, ghi content/blog/media/<lang>.json
//   node scripts/blog-images.mjs push                                   R2 (secret R2_*) hoặc dự phòng repo lexkite-media (GH_MEDIA_TOKEN); thiếu cả hai → exit 3, không ghi sổ
//   node scripts/blog-images.mjs gc [--apply] [--min-age-days 14] [--dir <thư mục blog/p>]   dọn file không còn bài nào dùng (mặc định CHỈ liệt kê)
//   node scripts/blog-images.mjs status | suggest <file.md> | sheet
// Công cụ (CI cài): LEXKITE_TOOLS/node_modules/{@resvg/resvg-js,sharp,playwright-core}; phông Noto (apt fonts-noto-core fonts-noto-cjk) + brand/social/src/fonts.
import fs from 'node:fs'; import path from 'node:path'; import { createRequire } from 'node:module'; import { execFileSync } from 'node:child_process';
import { loadPosts, loadMedia, config, ROOT, isLive, publishTime } from './lib/blog-content.mjs';
import { wantedItems, specOf, coverSvg, autoAlt, sha, overBudget, mediaId, appRoutes, routeName } from './lib/blog-images.mjs';
import { pushDir, r2Config, r2List, r2Delete } from './lib/media-store.mjs';

const args = process.argv.slice(2), cmd = args[0] || 'status';
const opt = (k, d) => { const i = args.indexOf('--' + k); return i < 0 ? d : args[i + 1] !== undefined && !args[i + 1].startsWith('--') ? args[i + 1] : true; }; // "--lang ''" = rỗng (không lọc)
const IMG = { covers: true, budgetKB: 60, widths: [480, 960, 1440], app: 'https://lexkite.com/app/?sandbox=1&demo=1', ...(config().images || {}) };
const OUT = '.media/out/blog/p', PNG = '.media/png', SHARD = l => path.join(ROOT, 'media', `${l}.json`);
const out = (k, v) => { if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `${k}=${v}\n`); };
const media = () => loadMedia(ROOT).items;

// ---------- plan: mục còn thiếu/đổi (so mã băm đầu vào `in`) – chạy lại luôn tiếp tục đúng chỗ ----------
function plan() {
  const mode = opt('mode', 'changed'), limit = +opt('limit', mode === 'pilot' ? 15 : 40), lang = opt('lang', ''), M = media(), now = Date.now();
  let posts = loadPosts().filter(p => p.status !== 'draft' && (!lang || p.lang === lang));
  const only = opt('posts', ''); if (typeof only === 'string' && only) { const s = new Set(only.split(',')); posts = posts.filter(p => s.has(`${p.lang}/${p.slug}`)); }
  let touched = new Set(); const since = opt('since', '');
  if (typeof since === 'string' && /^[0-9a-f]{7,40}$/.test(since) && !/^0+$/.test(since)) {
    try { touched = new Set(execFileSync('git', ['diff', '--name-only', since, 'HEAD', '--', ROOT]).toString().split('\n').filter(f => f.endsWith('.md')).map(f => path.resolve(f))); } catch { /* sha không có trong lịch sử nông → bỏ ưu tiên */ }
  }
  const todo = posts.map(p => ({ p, items: wantedItems(p, { covers: IMG.covers !== false }).filter(it => !M[it.id] || M[it.id].in !== it.in) })).filter(x => x.items.length);
  const due = x => { const t = publishTime(x.p); return Number.isNaN(t) ? now + 864e5 : t; }; // chưa xếp lịch ≈ sắp đăng
  todo.sort((a, b) => (touched.has(path.resolve(b.p.file)) - touched.has(path.resolve(a.p.file))) || (due(a) - due(b)) || a.p.file.localeCompare(b.p.file));
  let pick = todo;
  if (mode === 'changed') pick = todo.filter(x => touched.has(path.resolve(x.p.file)) || due(x) - now < 7 * 864e5); // bài vừa sửa + bài đăng trong 7 ngày
  if (mode === 'pilot') { const seen = new Set(); pick = todo.filter(x => (x.items.some(i => i.kind === 'shot') || !seen.has(x.p.lang)) && seen.add(x.p.lang)); }
  pick = pick.slice(0, limit);
  // Trên CI: chưa có nơi đẩy ảnh (R2_* hoặc LEXKITE_MEDIA_TOKEN) → không dựng (tránh tốn phút CI), trừ pilot (chỉ xuất bảng soi)
  if (process.env.CI && mode !== 'pilot' && !r2Config() && !process.env.GH_MEDIA_TOKEN) { console.log('::warning::Chưa có secret R2_ACCESS_KEY_ID/R2_SECRET_ACCESS_KEY hoặc LEXKITE_MEDIA_TOKEN – bỏ qua dựng ảnh (docs/BLOG-RUNBOOK.md § Ảnh riêng từng bài)'); pick = []; }
  const items = pick.flatMap(x => x.items.map(it => ({ ...it, live: isLive(x.p, now) })));
  fs.mkdirSync('.media', { recursive: true });
  const file = opt('out', '.media/plan.json'); fs.writeFileSync(file, JSON.stringify({ mode, items }, null, 1));
  console.log(`· plan ${mode}: ${pick.length} bài (${items.filter(i => i.kind === 'cover').length} bìa, ${items.filter(i => i.kind === 'shot').length} ảnh chụp) · còn thiếu tổng ${todo.length} bài → ${file}`);
  out('count', pick.length); out('items', items.length); out('remaining', todo.length - pick.length); out('live', new Set(items.filter(i => i.live).map(i => i.post)).size);
}

// ---------- render ----------
function tools() {
  const T = process.env.LEXKITE_TOOLS || `${process.cwd()}/.tools`; process.env.PLAYWRIGHT_BROWSERS_PATH ||= T + '/pw';
  return createRequire(T + '/');
}
async function encode(sharp, png, { og = false } = {}) {
  const meta = await sharp(png).metadata(), maxW = Math.min(meta.width, 1440), hash = sha(png, 16);
  const widths = [...new Set([...IMG.widths.filter(w => w < maxW), maxW])].sort((a, b) => a - b), bytes = {}, budget = IMG.budgetKB * 1024;
  fs.mkdirSync(OUT, { recursive: true });
  let q = 55, top;
  for (;;) { top = await sharp(png).resize({ width: maxW }).avif({ quality: q, effort: 6, chromaSubsampling: '4:2:0' }).toBuffer(); if (top.length <= budget || q <= 30) break; q -= 5; } // giảm chất lượng tới khi ≤ trần
  for (const w of widths) {
    const av = w === maxW ? top : await sharp(png).resize({ width: w }).avif({ quality: q, effort: 6 }).toBuffer();
    let wq = 78, wb; for (;;) { wb = await sharp(png).resize({ width: w }).webp({ quality: wq, effort: 5 }).toBuffer(); if (wb.length <= budget * 2.5 || wq <= 60) break; wq -= 8; }
    fs.writeFileSync(`${OUT}/${hash}-${w}.avif`, av); fs.writeFileSync(`${OUT}/${hash}-${w}.webp`, wb);
    bytes[`${w}.avif`] = av.length; bytes[`${w}.webp`] = wb.length;
  }
  if (og) { const j = await sharp(png).resize(1200, 630, { fit: 'cover', position: 'centre' }).jpeg({ quality: 82, mozjpeg: true }).toBuffer(); fs.writeFileSync(`${OUT}/${hash}-og.jpg`, j); bytes['og.jpg'] = j.length; }
  return { key: `p/${hash}`, hash, w: maxW, h: Math.round(meta.height * maxW / meta.width), widths, bytes, ...(og ? { og: true } : {}) };
}
// Chữ thấy được trong vùng chụp → bản ghi (alt tự sinh + blog-check soi alt dựa trên bản ghi này)
const EXTRACT = clip => {
  const vis = el => { const s = getComputedStyle(el); if (s.visibility === 'hidden' || s.display === 'none' || +s.opacity === 0) return null; const r = el.getBoundingClientRect(); if (r.width < 2 || r.height < 2) return null; const x = r.left + scrollX, y = r.top + scrollY, ix = Math.max(0, Math.min(x + r.width, clip.x + clip.width) - Math.max(x, clip.x)), iy = Math.max(0, Math.min(y + r.height, clip.y + clip.height) - Math.max(y, clip.y)); return ix * iy >= 0.6 * r.width * r.height ? r : null; };
  const txt = el => (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim();
  const headings = [], texts = [], seen = new Set(), add = (arr, t, n) => { if (t && t.length >= 2 && t.length <= n && !seen.has(t)) { seen.add(t); arr.push(t); } };
  for (const el of document.querySelectorAll('h1, h2, h3, [role=heading]')) if (vis(el)) add(headings, txt(el), 80);
  for (const el of document.querySelectorAll('button, a, label, th, td, li, strong, b, .chip, .tag, .badge, p, span, div, input[placeholder]')) {
    if (texts.length >= 40) break;
    if (el.tagName === 'INPUT') { if (vis(el)) add(texts, el.placeholder.trim(), 60); continue; }
    if ([...el.children].some(c => !/^(B|I|EM|STRONG|SPAN|SMALL|BR|SUP|SUB|CODE)$/.test(c.tagName))) continue; // chỉ phần tử lá (chữ trực tiếp)
    if (vis(el)) add(texts, txt(el), 60);
  }
  return { headings: headings.slice(0, 8), texts: texts.slice(0, 30), title: document.title, htmlLang: document.documentElement.lang || '' };
};
async function capture(page, s) {
  const url = `${IMG.app}${IMG.app.includes('?') ? '&' : '?'}hl=${s.lang}${s.route}`;
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(s.wait || 2500);
  if (s.scroll) await page.locator(s.scroll).first().scrollIntoViewIfNeeded({ timeout: 5000 });
  const vp = page.viewportSize(), sc = await page.evaluate(() => ({ x: scrollX, y: scrollY, h: document.documentElement.scrollHeight }));
  let clip = { x: sc.x, y: sc.y, width: vp.width, height: vp.height };
  if (s.crop === 'full') clip = { x: 0, y: 0, width: vp.width, height: Math.min(sc.h, vp.width * 2) };
  else if (s.crop === 'main' || (s.crop && s.crop.selector)) {
    const sel = s.crop === 'main' ? 'main, [role=main], #view, #app' : s.crop.selector, el = page.locator(sel).first();
    const b = await el.boundingBox({ timeout: 5000 }).catch(() => null); if (!b) throw new Error(`không thấy vùng cắt "${sel}"`);
    clip = { x: Math.max(0, b.x + sc.x - 12), y: Math.max(0, b.y + sc.y - 12), width: Math.min(vp.width, b.width + 24), height: Math.min(b.height + 24, vp.width * 1.5) };
  } else if (s.crop && typeof s.crop === 'object') clip = { x: s.crop.x, y: s.crop.y, width: s.crop.w, height: s.crop.h };
  // vùng cắt theo toạ độ tài liệu (fullPage + clip); viewport → chụp đúng khung đang cuộn tới
  const png = s.crop === 'viewport' ? await page.screenshot({ type: 'png', animations: 'disabled' }) : await page.screenshot({ clip, type: 'png', animations: 'disabled', fullPage: true });
  const cap = await page.evaluate(EXTRACT, clip);
  if (!cap.headings.length && !cap.texts.length) throw new Error('vùng chụp không có chữ nào (trang trắng/lỗi?) – kiểm route');
  if (cap.htmlLang && !cap.htmlLang.toLowerCase().startsWith(s.lang)) throw new Error(`giao diện đang "${cap.htmlLang}", cần "${s.lang}" (hl=)`);
  return { png, cap: { route: s.route, lang: s.lang, url: new URL(url).search + s.route, ...cap, at: new Date().toISOString().slice(0, 19) + 'Z' } };
}
function saveShards(updates) {
  const byLang = {}; for (const [id, rec] of Object.entries(updates)) (byLang[rec.post.split('/')[0]] ||= {})[id] = rec;
  fs.mkdirSync(path.join(ROOT, 'media'), { recursive: true });
  for (const [l, recs] of Object.entries(byLang)) {
    const f = SHARD(l), cur = fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : {};
    const items = Object.fromEntries(Object.entries({ ...(cur.items || {}), ...recs }).sort(([a], [b]) => a.localeCompare(b)));
    // 1 mục/dòng, không thụt lề: nhỏ (≈ 3 KB/bài) + diff/gộp git gọn khi có 100k bài
    const note = 'Ảnh riêng từng bài (ngôn ngữ ' + l + ') – CI blog-images ghi, không sửa tay. Ảnh: https://media.lexkite.com/blog/<key>-<w>.<avif|webp>';
    fs.writeFileSync(f, `{"_note":${JSON.stringify(note)},"items":{\n${Object.entries(items).map(([k, v]) => `${JSON.stringify(k)}:${JSON.stringify(v)}`).join(',\n')}\n}}\n`);
  }
}
async function render() {
  const P = JSON.parse(fs.readFileSync(opt('plan', '.media/plan.json'), 'utf8')), items = P.items || [];
  if (!items.length) return console.log('· không có ảnh cần render');
  const req = tools(), sharp = req('sharp'), updates = {}, errors = [], keep = P.mode === 'pilot';
  const fontDir = 'brand/social/src/fonts', fontFiles = fs.readdirSync(fontDir).filter(f => f.endsWith('.ttf')).map(f => path.join(fontDir, f));
  const posts = new Map(loadPosts().map(p => [`${p.lang}/${p.slug}`, p]));
  fs.mkdirSync(PNG, { recursive: true });
  const covers = items.filter(i => i.kind === 'cover');
  if (covers.length) {
    const { Resvg } = req('@resvg/resvg-js');
    for (const it of covers) {
      try {
        const png = new Resvg(coverSvg(it.spec), { fitTo: { mode: 'original' }, font: { fontFiles, loadSystemFonts: true, defaultFontFamily: 'Noto Sans' } }).render().asPng();
        if (keep) fs.writeFileSync(`${PNG}/${it.id}.png`, png);
        const rec = { kind: 'cover', ...(await encode(sharp, png, { og: true })), in: it.in, post: it.post, title: it.spec.title, chip: it.spec.chip, icon: it.spec.icon, mood: it.spec.mood };
        rec.alt = autoAlt(rec, it.spec.lang);
        const ob = overBudget(rec.bytes, IMG.budgetKB); if (ob.length) throw new Error(ob.join('; '));
        updates[it.id] = rec; console.log(`✓ bìa ${it.id} ${(rec.bytes['1440.avif'] / 1024).toFixed(1)} KB`);
      } catch (e) { errors.push(`${it.id}: ${e.message}`); }
    }
  }
  const shots = items.filter(i => i.kind === 'shot');
  if (shots.length) {
    const { chromium } = req('playwright-core'), routes = appRoutes();
    const b = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-gpu', '--hide-scrollbars'] });
    const groups = new Map(); for (const it of shots) { const k = `${it.spec.lang}|${it.spec.device}`; (groups.get(k) || groups.set(k, []).get(k)).push(it); }
    for (const [k, list] of groups) {
      const [lang, device] = k.split('|'), mobile = device === 'mobile';
      const ctx = await b.newContext({ locale: lang, reducedMotion: 'reduce', viewport: mobile ? { width: 390, height: 844 } : { width: 1280, height: 800 }, deviceScaleFactor: mobile ? 2 : 1.5, isMobile: mobile, hasTouch: mobile });
      const page = await ctx.newPage();
      await page.goto(`${IMG.app}&hl=${lang}#/home`, { waitUntil: 'load' }); await page.waitForTimeout(3000); // nạp dữ liệu mẫu (sandbox, không tài khoản thật)
      for (const it of list) {
        try {
          if (!routes.has(routeName(it.spec.route))) throw new Error(`route ${it.spec.route} không có trong app`);
          const { png, cap } = await capture(page, it.spec);
          if (keep) fs.writeFileSync(`${PNG}/${it.id}.png`, png);
          const rec = { kind: 'shot', ...(await encode(sharp, png)), in: it.in, post: it.post, cap };
          rec.alt = autoAlt(rec, it.spec.lang);
          const ob = overBudget(rec.bytes, IMG.budgetKB); if (ob.length) throw new Error(ob.join('; '));
          updates[it.id] = rec; console.log(`✓ chụp ${it.id} ${it.spec.route} · "${rec.alt.slice(0, 70)}…"`);
        } catch (e) { errors.push(`${it.id} ${it.spec.route}: ${e.message.split('\n')[0]}`); }
      }
      await ctx.close();
    }
    await b.close();
  }
  fs.writeFileSync('.media/updates.json', JSON.stringify(updates)); // push xong mới ghi sổ (ảnh chưa lên CDN → bài không trỏ tới)
  for (const e of errors) console.log(`::error::${e}`);
  console.log(`${errors.length ? '✗' : '✓'} render: ${Object.keys(updates).length} ảnh, ${errors.length} lỗi`);
  out('rendered', Object.keys(updates).length); out('errors', errors.length);
  if (!Object.keys(updates).length && errors.length) process.exit(1); // 0 ảnh → đỏ (bài học 17/10: không tin "xanh" khi kết quả = 0)
}
async function push() {
  const r = await pushDir(OUT);
  if (r.backend === 'missing') { console.log('::warning::Chưa có secret R2_ACCESS_KEY_ID/R2_SECRET_ACCESS_KEY (R2) hoặc LEXKITE_MEDIA_TOKEN (repo lexkite-media) – dừng, KHÔNG ghi sổ ảnh. Xem docs/BLOG-RUNBOOK.md § Ảnh riêng từng bài.'); process.exit(3); }
  const up = fs.existsSync('.media/updates.json') ? JSON.parse(fs.readFileSync('.media/updates.json', 'utf8')) : {};
  if (opt('no-record', false) !== true) { saveShards(up); console.log(`✓ sổ ảnh: ${Object.keys(up).length} mục → ${ROOT}/media/<lang>.json`); }
}

// ---------- gc: file trên kho không còn mục nào trỏ tới (mặc định chỉ liệt kê) ----------
async function gc() {
  const apply = opt('apply', false) === true, minAge = +opt('min-age-days', 14), cutoff = Date.now() - minAge * 864e5;
  const used = new Set(Object.values(media()).filter(m => m.key).map(m => m.hash));
  const dir = opt('dir', ''), cfg = r2Config();
  let list = [];
  if (typeof dir === 'string' && dir) list = fs.readdirSync(dir).map(f => { const st = fs.statSync(path.join(dir, f)); return { key: f, size: st.size, modified: st.mtime.toISOString() }; });
  else if (cfg) for await (const o of r2List(cfg, 'blog/p/')) list.push(o);
  else { console.log('· gc: cần R2_ACCESS_KEY_ID/R2_SECRET_ACCESS_KEY hoặc --dir <bản sao lexkite-media>/blog/p'); return; }
  const orphan = list.filter(o => !used.has(path.basename(o.key).split('-')[0])), old = orphan.filter(o => Date.parse(o.modified) < cutoff);
  const MB = n => (n / 1048576).toFixed(1) + ' MB';
  console.log(`· gc: ${list.length} file, đang dùng ${used.size} mã băm · mồ côi ${orphan.length} (${MB(orphan.reduce((a, o) => a + o.size, 0))}), cũ hơn ${minAge} ngày: ${old.length} (${MB(old.reduce((a, o) => a + o.size, 0))})`);
  for (const o of old.slice(0, 20)) console.log('  -', o.key);
  if (!apply) return console.log('· chạy thử (dry-run) – thêm --apply để xoá');
  for (const o of old) { if (dir) fs.unlinkSync(path.join(dir, o.key)); else await r2Delete(cfg, o.key); }
  console.log(`✓ đã xoá ${old.length} file`);
}

// ---------- status / suggest / sheet (nhẹ) ----------
function status() {
  const M = media(), posts = loadPosts().filter(p => p.status !== 'draft'), by = {};
  for (const p of posts) { const b = (by[p.lang] ||= { posts: 0, cover: 0, spec: 0, shots: 0, todo: 0 }); b.posts++; if (M[mediaId(p, 'cover')]) b.cover++; const s = specOf(p); if (s.shots.length) b.spec++; b.shots += s.shots.filter(o => M[mediaId(p, o.id)]).length; if (wantedItems(p).some(it => !M[it.id] || M[it.id].in !== it.in)) b.todo++; }
  for (const [l, b] of Object.entries(by).sort()) console.log(`${l}  ${String(b.posts).padStart(4)} bài · bìa riêng ${b.cover} · có shots: ${b.spec} · ảnh chụp đã có ${b.shots} · còn thiếu ${b.todo}`);
}
function suggest() {
  const f = args[1]; if (!f) { console.error('Dùng: node scripts/blog-images.mjs suggest content/blog/<lang>/<slug>.md'); process.exit(2); }
  const p = loadPosts().find(x => path.resolve(x.file) === path.resolve(f)); if (!p) { console.error('không thấy bài', f); process.exit(2); }
  const words = s => (s || '').toLowerCase().split(/[^a-z0-9]+/).filter(Boolean), have = new Set([...words(p.slug), ...(p.tags || []).flatMap(words), ...words(p.keyword)]);
  const gids = []; for (const g of fs.readdirSync('web/js/grammar').filter(f => f.endsWith('.js'))) for (const m of fs.readFileSync(`web/js/grammar/${g}`, 'utf8').matchAll(/id: ?'([a-z0-9-]+)'/g)) gids.push(m[1]);
  const shots = [], gram = gids.filter(id => id.split('-').every(w => have.has(w))).sort((a, b) => b.length - a.length)[0];
  if (gram) shots.push(`{route: '#/grammar/${gram}', crop: main}`);
  const ital = [...new Set([...p.body.matchAll(/(?<![*\w])\*([a-z]{4,18})\*(?!\*)/g)].map(m => m[1]))].slice(0, 2);
  for (const w of ital) shots.push(`{route: '#/dict/${w}', crop: main}`);
  const legacy = JSON.parse(fs.readFileSync(path.join(ROOT, 'shots.json'), 'utf8')).shots;
  for (const m of [...p.body.matchAll(/media:([\w-]+)/g)].map(m => m[1])) if (legacy[m] && shots.length < 4) shots.push(`{route: '${legacy[m].route}'}`);
  console.log(`shots: [${[...new Set(shots)].slice(0, 4).join(', ')}]`);
  console.log('# Gợi ý – mở từng route trong app (?sandbox=1&hl=' + p.lang + ') xem đúng nội dung bài bàn tới chưa rồi mới dùng; tham chiếu ![](media:@s1 "chú thích").');
}
async function sheet() {
  const sharp = tools()('sharp'), files = fs.existsSync(PNG) ? fs.readdirSync(PNG).filter(f => f.endsWith('.png')).sort() : [];
  if (!files.length) return console.log('· chưa có PNG để ghép');
  const cw = 480, tiles = await Promise.all(files.map(async f => ({ f, buf: await sharp(path.join(PNG, f)).resize({ width: cw, height: 300, fit: 'contain', background: '#ffffff' }).png().toBuffer() })));
  const cols = 3, rows = Math.ceil(tiles.length / cols);
  await sharp({ create: { width: cols * (cw + 10) + 10, height: rows * 340 + 10, channels: 3, background: '#e9eeee' } })
    .composite(tiles.flatMap((t, i) => [{ input: t.buf, left: 10 + (i % cols) * (cw + 10), top: 10 + Math.floor(i / cols) * 340 }, { input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${cw}" height="24"><text x="2" y="17" font-size="14" font-family="Noto Sans">${t.f.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</text></svg>`), left: 10 + (i % cols) * (cw + 10), top: 10 + Math.floor(i / cols) * 340 + 306 }]))
    .jpeg({ quality: 80 }).toFile('.media/pilot-sheet.jpg');
  console.log(`✓ .media/pilot-sheet.jpg (${tiles.length} ảnh) – soi tay trước khi chạy lô (docs/METHODS.md: thử trước – làm lô sau)`);
}

const CMDS = { plan, render, push, gc, status, suggest, sheet };
if (!CMDS[cmd]) { console.error(`lệnh "${cmd}" không có (${Object.keys(CMDS).join(' | ')})`); process.exit(2); }
await CMDS[cmd]();
