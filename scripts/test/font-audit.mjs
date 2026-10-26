// 🔤 Rà font chữ trên Chromium thật, từng phần một (landing / legal / app / admin / blog / ext) + quét tĩnh mã nguồn.
// Bắt: chữ SVG bị kéo méo (preserveAspectRatio=none), lọt font mặc định (Times/serif), nút/ô nhập không kế thừa font,
// webfont khai báo mà không tải, in đậm/nghiêng giả (faux), chữ quá nhỏ, chữ bị cắt, font monospace lạc vào UI.
// Dùng: node scripts/test/font-audit.mjs <part|all|static> [--base URL] [--strict]   (CI: font-audit.yml)
// Mặc định phục vụ thư mục web/ tại máy (kiểm đúng mã của PR); blog lấy bản live vì blog được build lúc deploy.
import fs from 'fs';
import path from 'path';
import http from 'http';

const args = process.argv.slice(2);
const PART = args.find(a => !a.startsWith('--')) || 'all';
const STRICT = args.includes('--strict');
const BASE_ARG = (args[args.indexOf('--base') + 1] || '').replace(/\/$/, '');
const OUT = 'font-report';
fs.mkdirSync(OUT, { recursive: true });
let ROOT = path.resolve('web');

// ---------- Quét tĩnh (không cần trình duyệt) ----------
function staticScan() {
  const issues = [];
  const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => {
    const p = path.join(d, e.name);
    if (e.isDirectory()) return /node_modules|vendor|data|img|audio|packs|screenshots/.test(e.name) ? [] : walk(p);
    return /\.(js|css|html)$/.test(e.name) && !/\.min\./.test(e.name) ? [p] : [];
  });
  const files = [...walk('web'), ...(fs.existsSync('extension') ? walk('extension') : [])];
  for (const f of files) {
    const src = fs.readFileSync(f, 'utf8');
    if (src.length > 3e6) continue;
    src.split('\n').forEach((line, i) => {
      const at = `${f}:${i + 1}`;
      // SVG co giãn không giữ tỉ lệ mà lại chứa <text> → chữ bị kéo méo
      if (/preserveAspectRatio=\\?["']none/.test(line) && /<text[\s>]/.test(line)) issues.push({ type: 'svg-stretch', sev: 'error', at, msg: 'SVG preserveAspectRatio="none" chứa <text> – chữ bị kéo méo' });
      // Font cứng không qua biến --font (bỏ qua monospace/IPA/email template)
      for (const m of line.matchAll(/font(?:-family)?\s*:\s*([^;}"'`]*(?:["'][^"']+["'][^;}"'`]*)*)/g)) {
        const v = m[1];
        if (!v || /var\(--|inherit|monospace|initial|unset/.test(v)) continue;
        if (/templates\//.test(f) || /[-\w]$/.test(line.slice(0, m.index))) continue; // bỏ email template & chỗ định nghĩa biến font
        if (/-apple-system|system-ui|sans-serif|serif|Arial|Helvetica|Roboto|Segoe/.test(v)) issues.push({ type: 'hardcoded-stack', sev: 'warn', at, msg: `font cứng "${v.trim().slice(0, 70)}" – nên dùng var(--font)` });
      }
    });
  }
  return issues;
}

// ---------- Máy chủ tĩnh cho web/ ----------
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json', '.ico': 'image/x-icon', '.txt': 'text/plain' };
function serve() {
  return new Promise(res => {
    const srv = http.createServer((req, rsp) => {
      let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
      let f = path.join(ROOT, p);
      if (!f.startsWith(ROOT)) { rsp.writeHead(403).end(); return; }
      if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
      else if (!fs.existsSync(f) && fs.existsSync(f + '.html')) f += '.html';
      if (!fs.existsSync(f)) { rsp.writeHead(404, { 'content-type': 'text/plain' }).end('404'); return; }
      rsp.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' });
      fs.createReadStream(f).pipe(rsp);
    }).listen(0, '127.0.0.1', () => res({ srv, base: `http://127.0.0.1:${srv.address().port}` }));
  });
}

// ---------- Danh sách trang theo phần ----------
const LANGS = ['vi', 'en', 'ja', 'zh', 'ko', 'ar', 'hi', 'th', 'ru', 'es'];
const APP_ROUTES = ['home', 'library', 'review', 'practice', 'skills', 'tests', 'stats', 'settings', 'contact', 'verb/take', 'goal', 'placement', 'usage', 'dict', 'confidence', 'handsfree', 'practice/learn?src=topic:ngsl1', 'practice/mcq?src=topic:ngsl1'];
const PARTS = {
  landing: b => ['/', ...LANGS.filter(l => l !== 'vi').map(l => `/${l}/`)].map(p => b + p),
  legal: b => ['/privacy.html', '/terms.html', '/credits.html', '/schools.html', '/404.html', '/bye.html', '/en/privacy.html', '/ja/terms.html', '/ar/schools.html'].map(p => b + p),
  app: b => APP_ROUTES.flatMap(r => ['vi', 'en'].map(l => `${b}/app/?sandbox=1&hl=${l}#/${r}`)),
  admin: b => [b + '/admin.html'],
  // blog: nếu đã build tại chỗ (dist/, CI chạy build-blog trước) thì kiểm bản của PR, không thì bản live
  blog: b => ['en', 'vi', 'ja', 'ar'].map(l => `${fs.existsSync('dist/vi/blog/index.html') ? b : 'https://lexkite.com'}/${l}/blog/`),
  ext: () => ['popup.html', 'newtab.html'].map(f => 'file://' + path.resolve('extension', f)),
};

// ---------- Kiểm trong trang ----------
function inPage() {
  const issues = [], stacks = {};
  const MONO_TAGS = new Set(['CODE', 'KBD', 'PRE', 'SAMP', 'TT']);
  const CTRL = new Set(['BUTTON', 'INPUT', 'SELECT', 'TEXTAREA']);
  const sel = el => { const p = []; for (let e = el; e && e.nodeType === 1 && p.length < 4; e = e.parentElement) { let s = e.tagName.toLowerCase(); if (e.id) { s += '#' + e.id; p.unshift(s); break; } const c = [...e.classList].slice(0, 2).join('.'); if (c) s += '.' + c; p.unshift(s); } return p.join('>'); };
  const add = (type, sev, el, msg) => issues.push({ type, sev, sel: sel(el), text: (el.value || el.textContent || el.placeholder || '').trim().replace(/\s+/g, ' ').slice(0, 40), msg });
  const first = fam => fam.split(',')[0].replace(/["']/g, '').trim();
  const bodyFam = getComputedStyle(document.body).fontFamily;
  // Mặt font đã tải thật: family → {weights, italic}
  const faces = {};
  for (const f of document.fonts) if (f.status === 'loaded') { const k = f.family.replace(/["']/g, ''); const o = faces[k] || (faces[k] = { w: new Set(), it: false }); const [a, b] = String(f.weight).split(' ').map(Number); for (let w = a; w <= (b || a); w += 100) o.w.add(w); if (f.style !== 'normal') o.it = true; }
  const WEB = ['Be Vietnam Pro', 'Inter', 'Charis SIL'];
  const declared = new Set();
  const visible = (el, cs) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && +cs.opacity > 0; };
  for (const el of document.querySelectorAll('body *')) {
    const isSvgText = el instanceof SVGTextContentElement && el.tagName === 'text';
    const own = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
    const ctrl = CTRL.has(el.tagName) && !['hidden', 'checkbox', 'radio', 'range', 'color', 'file'].includes(el.type);
    if (!own && !ctrl && !isSvgText) continue;
    const cs = getComputedStyle(el);
    if (!visible(el, cs)) continue;
    const fam = cs.fontFamily, f1 = first(fam), fs = parseFloat(cs.fontSize), w = +cs.fontWeight;
    stacks[fam] = (stacks[fam] || 0) + 1;
    if (WEB.includes(f1)) declared.add(f1);
    const mono = /mono|Menlo|Consolas|Courier/i.test(f1);
    const inMonoCtx = el.closest('code,kbd,pre,samp,tt,.mono,.ipa');
    if (/^(serif|Times|Times New Roman)$/i.test(f1)) add('serif-fallback', 'error', el, `lọt font mặc định "${f1}"`);
    if (ctrl && fam !== bodyFam && !mono) add('control-font', 'error', el, `${el.tagName.toLowerCase()} dùng "${f1}" thay vì font trang`);
    if (mono && !inMonoCtx && !MONO_TAGS.has(el.tagName)) add('mono-in-ui', 'warn', el, `chữ UI dùng monospace "${f1}"`);
    if (isSvgText) {
      const m = el.getScreenCTM();
      if (m) {
        const sx = Math.hypot(m.a, m.b), sy = Math.hypot(m.c, m.d);
        if (Math.abs(sx / sy - 1) > 0.08) add('svg-stretch', 'error', el, `chữ SVG bị kéo ${(sx / sy).toFixed(2)}×`);
        if (fs * sy < 9) add('tiny', 'warn', el, `chữ SVG hiển thị ${(fs * sy).toFixed(1)}px`);
      }
    } else if (fs < 11 && el.textContent.trim().length > 1) add('tiny', 'warn', el, `cỡ chữ ${fs}px`);
    const face = faces[f1];
    if (face && face.w.size) {
      const max = Math.max(...face.w), min = Math.min(...face.w);
      if (w > max + 50 || w < min - 50) add('faux-weight', 'warn', el, `đậm ${w} nhưng "${f1}" chỉ tải ${min}–${max} → trình duyệt tô đậm giả`);
      if (cs.fontStyle !== 'normal' && !face.it) add('faux-italic', 'warn', el, `nghiêng giả – "${f1}" chưa tải bản italic`);
    }
    if (!ctrl && /hidden|clip/.test(cs.overflowX) && cs.textOverflow !== 'ellipsis' && el.scrollWidth > el.clientWidth + 2) add('clipped', 'warn', el, 'chữ bị cắt mất (tràn ngang, không có …)');
  }
  const missing = [...declared].filter(f => !faces[f]);
  for (const f of missing) issues.push({ type: 'webfont-missing', sev: 'warn', sel: 'document', text: '', msg: `CSS khai báo "${f}" nhưng trang không tải webfont → mỗi máy hiện font khác nhau` });
  return { issues, stacks, bodyFam, loaded: Object.keys(faces) };
}

async function browserScan(part, base) {
  const { chromium } = await import('playwright');
  const browser = await chromium.launch();
  const pages = PARTS[part](base);
  const results = [];
  const VPS = [{ name: 'mobile', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }, { name: 'desktop', viewport: { width: 1280, height: 860 } }];
  for (const vp of VPS) {
    const ctx = await browser.newContext({ ...vp, deviceScaleFactor: 1, locale: 'vi' });
    const page = await ctx.newPage();
    if (part === 'app') { // qua màn chào để vào thẳng app
      await page.goto(`${base}/app/?sandbox=1#/welcome/setup`, { waitUntil: 'networkidle', timeout: 30000 }).catch(() => {});
      const go = await page.$('#go'); if (go) { await go.click().catch(() => {}); await page.waitForTimeout(1500); }
    }
    for (const url of pages) {
      const r = { url, vp: vp.name };
      try {
        await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
        await page.waitForTimeout(part === 'app' ? 900 : 300);
        await page.evaluate(() => document.fonts.ready);
        Object.assign(r, await page.evaluate(inPage));
        const shot = `${OUT}/${part}-${vp.name}-${url.replace(/^\w+:\/\/[^/]+/, '').replace(/[^\w]+/g, '_').slice(0, 60) || 'root'}.jpg`;
        await page.screenshot({ path: shot, type: 'jpeg', quality: 55 });
      } catch (e) { r.error = String(e.message || e).slice(0, 160); }
      results.push(r);
    }
    await ctx.close();
  }
  await browser.close();
  return results;
}

// ---------- Báo cáo ----------
function report(part, results, staticIssues) {
  const all = [];
  for (const r of results) for (const i of r.issues || []) all.push({ ...i, at: `${r.url.replace(/^\w+:\/\/[^/]+/, '') || '/'} [${r.vp}]` });
  all.push(...staticIssues);
  const byType = {};
  for (const i of all) (byType[i.type] ||= { sev: i.sev, n: 0, ex: new Map() }).n++, byType[i.type].ex.size < 8 && byType[i.type].ex.set(i.sel ? `${i.sel} "${i.text}"` : i.at, i);
  const stacks = {};
  for (const r of results) for (const [k, v] of Object.entries(r.stacks || {})) stacks[k] = (stacks[k] || 0) + v;
  const errors = all.filter(i => i.sev === 'error').length;
  let md = `## 🔤 Font audit – ${part}\n\n${results.length ? `${results.length} lượt trang · ` : ''}**${errors} lỗi**, ${all.length - errors} cảnh báo\n\n`;
  const broken = results.filter(r => r.error);
  if (broken.length) md += `⚠️ Không mở được: ${broken.map(r => r.url).join(', ')}\n\n`;
  for (const [t, o] of Object.entries(byType).sort((a, b) => (a[1].sev === 'error' ? -1 : 1) - (b[1].sev === 'error' ? -1 : 1) || b[1].n - a[1].n)) {
    md += `### ${o.sev === 'error' ? '❌' : '⚠️'} ${t} (${o.n})\n`;
    for (const [, i] of o.ex) md += `- \`${i.at}\` ${i.sel ? `\`${i.sel}\` ` : ''}${i.text ? `“${i.text}” ` : ''}– ${i.msg}\n`;
    md += '\n';
  }
  if (Object.keys(stacks).length) md += `### Các bộ font đang hiển thị\n${Object.entries(stacks).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([k, v]) => `- ${v}× \`${k.slice(0, 110)}\``).join('\n')}\n`;
  const loaded = [...new Set(results.flatMap(r => r.loaded || []))];
  if (results.length) md += `\nWebfont đã tải: ${loaded.join(', ') || '(không)'}\n`;
  fs.writeFileSync(`${OUT}/${part}.json`, JSON.stringify({ part, errors, issues: all, stacks, results: results.map(({ issues, stacks, ...r }) => r) }, null, 1));
  fs.writeFileSync(`${OUT}/${part}.md`, md);
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, md + '\n');
  console.log(md);
  return errors;
}

let errors = 0, srv;
const parts = PART === 'all' ? ['static', ...Object.keys(PARTS)] : [PART];
const needLocal = parts.some(p => ['landing', 'legal', 'app', 'admin'].includes(p) || (p === 'blog' && fs.existsSync('dist/vi/blog/index.html'))) && !BASE_ARG;
if (PART === 'blog' && fs.existsSync('dist/vi/blog/index.html')) ROOT = path.resolve('dist');
let base = BASE_ARG;
if (needLocal) ({ srv, base } = await serve());
for (const p of parts) {
  if (p === 'static') errors += report('static', [], staticScan());
  else if (PARTS[p]) errors += report(p, await browserScan(p, base), []);
  else { console.error('Phần không hợp lệ:', p, '– chọn:', ['static', ...Object.keys(PARTS), 'all'].join(' ')); process.exit(2); }
}
srv?.close();
if (STRICT && errors) { console.error(`❌ ${errors} lỗi font`); process.exit(1); }
