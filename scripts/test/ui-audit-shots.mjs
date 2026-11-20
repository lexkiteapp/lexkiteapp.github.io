// Chụp MỌI màn chính (trừ luồng bài học) để soát giao diện: 375 & 1440 × sáng/tối. Chạy trên CI (ui-audit-shots.yml: mỗi đêm + chạy tay), không chạy trên Mac.
// Dùng: node scripts/test/ui-audit-shots.mjs <base> <out> [vi|en]
// Ra: <out>/sheets/<vp>-<theme>-<khu vực>-NN.jpg (tờ lưới ≤12 ô, nhãn "màn · rộng×cao · theme", JPEG ≤300 KB, ô lỗi có khung đỏ) · <out>/flagged/ (chỉ tờ có ô đỏ)
//     <out>/report.md (lỗi xếp theo mức) · <out>/summary.txt (1 dòng cho Health board) · <out>/metrics.json (số liệu thô)
// Máy chấm mỗi ô (hàm audit() — thuần, có test ở scripts/test/ui-audit-rules.mjs): tràn ngang, chữ bị che, tương phản <4.5, vùng chạm <44, ô trống/placeholder, nút chính ngoài màn đầu, lỗi JS.
import { chromium } from 'playwright';
import { noProd } from './lib/no-prod.mjs';
import { audit, SEV_ORDER } from './lib/ui-audit-rules.mjs';
import fs from 'fs';
const BASE = (process.argv[2] || 'http://localhost:8080').replace(/\/$/, '');
const OUT = process.argv[3] || 'uiaudit-out', LANG = process.argv[4] || 'en';
for (const d of ['shots', 'sheets', 'flagged']) fs.mkdirSync(`${OUT}/${d}`, { recursive: true });
// lỗi chỉ có vì CI chạy offline (noProd chặn lexkite.com): không phải lỗi người dùng
const OFFLINE_RE = /Turnstile|sitekey|net::ERR|Failed to load resource|Failed to fetch|NetworkError|lexkite\.com|ERR_BLOCKED/i;
const SKIP_RE = /sandbox|toast/i;
const ROUTES = ['welcome/setup', 'home', 'vocab', 'skills', 'tests', 'me', 'path', 'day/1', 'review', 'practice', 'dict/hello', 'dict/zzqxv', 'deck', 'library', 'grammar', 'grammar/ed-s-endings', 'courses', 'course', 'speaking', 'call', 'roleplay', 'say', 'speak', 'pron', 'listening', 'dictation', 'reading', 'write', 'paraphrase', 'cbt', 'qstats', 'quick', 'stats', 'streak', 'league', 'goal', 'settings', 'mistakes', 'toeic', 'toefl', 'resources', 'placement', 'contact', 'zzz-not-found'];
const STATES = [['home', 'toast'], ['home', 'modal'], ['me', 'signed']];
const AREA = { 'welcome': 'chao', 'home': 'hoc', 'path': 'hoc', 'day/1': 'hoc', 'review': 'hoc', 'practice': 'hoc', 'courses': 'hoc', 'course': 'hoc', 'deck': 'hoc', 'library': 'hoc', 'mistakes': 'hoc', 'placement': 'hoc',
  'vocab': 'tu', 'dict/hello': 'tu', 'dict/zzqxv': 'tu', 'skills': 'ky-nang', 'grammar': 'ky-nang', 'grammar/ed-s-endings': 'ky-nang', 'speaking': 'ky-nang', 'call': 'ky-nang', 'roleplay': 'ky-nang', 'say': 'ky-nang', 'speak': 'ky-nang', 'pron': 'ky-nang', 'listening': 'ky-nang', 'dictation': 'ky-nang', 'reading': 'ky-nang', 'write': 'ky-nang', 'paraphrase': 'ky-nang',
  'tests': 'thi', 'cbt': 'thi', 'quick': 'thi', 'toeic': 'thi', 'toefl': 'thi', 'qstats': 'thi' };
const areaOf = name => name.startsWith('welcome') ? 'chao' : AREA[name.split('+')[0]] || 'toi-he-thong';
const VPS = { m: { width: 375, height: 812, isMobile: true, hasTouch: true }, d: { width: 1440, height: 900 } };
const metrics = [], shots = [];
const still = '*,*::before,*::after{animation:none!important;transition:none!important}';
const safe = s => s.replace(/[^a-z0-9]+/gi, '_');
// Đo trong trang: chỉ thu số liệu thô; mọi phán xét (ngưỡng, mức) nằm ở audit() để test được không cần trình duyệt.
async function measure(page, modal) {
  return page.evaluate(modal => {
    const H = innerHeight, W = innerWidth;
    const vis = e => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width > 2 && r.height > 2 && cs.visibility !== 'hidden' && +cs.opacity > 0 ? r : null; };
    const sel = e => (e.tagName + (e.id ? '#' + e.id : '') + (typeof e.className === 'string' && e.className ? '.' + e.className.trim().split(/\s+/)[0] : '')).toLowerCase();
    const txt = e => (e.innerText || e.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40);
    const rgba = c => { const m = c && c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const a = m[1].split(/[,\s/]+/).filter(Boolean).map(Number); return { r: a[0], g: a[1], b: a[2], a: a.length > 3 ? a[3] : 1 }; };
    const view = document.getElementById('view'), vr = view && view.getBoundingClientRect();
    const prim = [...document.querySelectorAll('#view .btn.primary, #view .btn.pri, #view button.primary, #view .cta')].filter(vis);
    const first = prim[0], fr = first && first.getBoundingClientRect(), fixed = first && ['fixed', 'sticky'].includes(getComputedStyle(first).position);
    const small = [...document.querySelectorAll('button,a[href],[role=button]')].filter(e => vis(e) && !e.closest('[aria-hidden=true]') && e.getBoundingClientRect().top < H).map(e => ({ e, q: e.getBoundingClientRect() })).filter(x => Math.min(x.q.width, x.q.height) < 44).map(x => ({ el: sel(x.e), text: txt(x.e), w: Math.round(x.q.width), h: Math.round(x.q.height) }));
    const leaf = [...document.querySelectorAll('body *')].filter(e => [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim().length > 2) && !e.closest('script,style,[aria-hidden=true]'));
    const inView = leaf.filter(e => { const r = vis(e); return r && r.bottom > 0 && r.top < H && r.right > 0 && r.left < W; }).slice(0, 400);
    // chữ bị che: điểm giữa ô chữ (trong màn) rơi vào phần tử khác không cùng nhánh
    const barOf = t => { for (let n = t; n && n !== document.body; n = n.parentElement) { const ps = getComputedStyle(n).position; if (ps === 'fixed' || ps === 'sticky') { const b = n.getBoundingClientRect(); return b.top + b.height / 2 < H / 2 ? 'top' : 'bottom'; } } return null; };
    const inV = () => leaf.filter(e => { const r = vis(e); return r && r.bottom > 0 && r.top < H && r.right > 0 && r.left < W; }).slice(0, 400);
    const clipped = (e, x, y) => { for (let n = e.parentElement; n && n !== document.body; n = n.parentElement) { const o = getComputedStyle(n); if (o.overflowX === 'visible' && o.overflowY === 'visible') continue; const q = n.getBoundingClientRect(); if (x < q.left || x > q.right || y < q.top || y > q.bottom) return true; } return false; };
    const coverNow = pos => inV().map(e => { const r = e.getBoundingClientRect(); const t0 = Math.max(0, r.top), b0 = Math.min(H - 1, r.bottom), l0 = Math.max(0, r.left), r0 = Math.min(W - 1, r.right); if (b0 - t0 < 4 || r0 - l0 < 4) return null; /* điểm mẫu phải NẰM TRONG phần ô còn thấy (ô chỉ lộ mép màn hình từng bị kẹp ra ngoài → báo nhầm) */ const x = (l0 + r0) / 2, y = t0 + Math.min((b0 - t0) / 2, 12); const t = document.elementFromPoint(x, y); return t && t !== e && !e.contains(t) && !t.contains(e) && !clipped(e, x, y) && !(/^(input|textarea|select)$/i.test(t.tagName) && /material-symbols/.test(String(e.className))) ? { el: sel(e), text: txt(e), by: sel(t), side: barOf(t), pos } : null; }).filter(Boolean).filter(c => !/sandbox|toast/i.test(c.by + ' ' + c.el + ' ' + c.text));
    // chữ bị che: đo ở ĐẦU trang và ở CUỐI trang; thanh dính che chữ đang trượt qua (cuộn tới được) thì lib bỏ, che lúc nghỉ thì giữ (lib/ui-audit-rules.mjs coverReal)
    const covered = modal ? [] : (() => { const y0 = scrollY, a = coverNow('top'); scrollTo(0, 1e6); const b = coverNow('bottom'); scrollTo(0, y0); return [...a, ...b].slice(0, 12); })();
    // tương phản chữ/nền (chỉ nền đặc; nền ảnh/gradient/trong suốt một phần thì bỏ qua)
    const lum = c => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
    const contrast = [];
    for (const e of inView.slice(0, 160)) {
      const cs = getComputedStyle(e), fg = rgba(cs.color); if (!fg || fg.a < 0.95) continue;
      let bg = null, n = e, skip = false;
      while (n && n.nodeType === 1) { const s = getComputedStyle(n); if (s.backgroundImage !== 'none') { skip = true; break; } const c = rgba(s.backgroundColor); if (c && c.a >= 0.95) { bg = c; break; } if (c && c.a > 0.05) { skip = true; break; } n = n.parentElement; }
      if (skip || !bg) continue;
      const l1 = lum(fg), l2 = lum(bg), ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05), fs = parseFloat(cs.fontSize), big = fs >= 24 || (fs >= 18.66 && +cs.fontWeight >= 700);
      contrast.push({ el: sel(e), text: txt(e), ratio: Math.round(ratio * 100) / 100, big });
    }
    const placeholders = [...(view ? view.innerText.match(/\b(undefined|null|NaN|TODO|lorem ipsum)\b|\[object [A-Za-z]+\]|\{\{[^}]*\}\}|%[sd]\b/gi) || [] : [])].slice(0, 4);
    const emptyBoxes = [...document.querySelectorAll('#view [class*=bubble], #view [class*=placeholder], #view [class*=empty]')].filter(e => vis(e) && !e.innerText.trim() && !e.querySelector('img,svg,canvas,input,textarea,video,picture')).slice(0, 4).map(sel);
    const brokenImgs = [...document.querySelectorAll('#view img')].filter(i => vis(i) && i.complete && i.naturalWidth === 0).slice(0, 4).map(i => (i.getAttribute('src') || '').slice(0, 60));
    return { vw: W, vh: H, docH: document.documentElement.scrollHeight, docW: document.documentElement.scrollWidth, primary: prim.length, primaryInFold: first ? fr.bottom <= H || fixed : null, small, covered, contrast, placeholders, emptyBoxes, brokenImgs, contentW: vr ? Math.round(vr.width) : null, textLen: view ? view.innerText.trim().length : 0 };
  }, modal).catch(e => ({ measureFail: String(e.message).slice(0, 80) }));
}
const browser = await chromium.launch();
for (const [vn, vp] of Object.entries(VPS)) for (const scheme of ['light', 'dark']) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, isMobile: !!vp.isMobile, hasTouch: !!vp.hasTouch, colorScheme: scheme, locale: LANG, reducedMotion: 'reduce' });
  await noProd(ctx);
  const page = await ctx.newPage(); const errs = [];
  page.on('pageerror', e => errs.push(String(e.message).slice(0, 100)));
  page.on('console', m => { if (m.type() === 'error' && !OFFLINE_RE.test(m.text())) errs.push('console: ' + m.text().slice(0, 100)); });
  await page.goto(`${BASE}/app/?sandbox=1&hl=${LANG}#/welcome/setup`, { waitUntil: 'networkidle' }).catch(() => {});
  await page.waitForSelector('#obNext, #go', { timeout: 8000 }).catch(() => {});
  // chụp từng bước Welcome rồi hoàn tất
  for (let i = 0; i < 8; i++) {
    const f = `${OUT}/shots/${vn}-${scheme}-welcome_step${i}.jpg`; await page.addStyleTag({ content: still }).catch(() => {});
    await page.screenshot({ path: f, type: 'jpeg', quality: 70 }).catch(() => {}); shots.push({ vn, scheme, name: 'welcome step ' + i, f });
    const mm = await measure(page);
    // chữ bị nút dính (CTA) che khi đã cuộn tới đáy: mỗi bước Welcome không được có chữ bị che
    const cov = await page.evaluate(() => { scrollTo(0, 1e6); const out = []; for (const e of document.querySelectorAll('body *')) { if (![...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim().length > 3)) continue; const r = e.getBoundingClientRect(); if (r.width < 4 || r.height < 4 || r.bottom < 0 || r.top > innerHeight) continue; const x = Math.min(Math.max(r.left + r.width / 2, 1), innerWidth - 2), y = Math.min(Math.max(r.top + r.height / 2, 1), innerHeight - 2), t = document.elementFromPoint(x, y); if (t && !t.closest('header,[class*=topbar]') && !e.contains(t) && !t.contains(e) && !/toast|sandbox/i.test(t.className + ' ' + (t.closest('[class*=toast]') ? 'toast' : ''))) out.push((e.textContent || '').trim().slice(0, 40) + ' ← ' + t.tagName.toLowerCase() + '.' + String(t.className).slice(0, 30)); } scrollTo(0, 0); return out; }).catch(() => []);
    metrics.push({ vn, scheme, route: 'welcome step ' + i, f, ...mm, covered: [...(mm.covered || []), ...cov.filter(c => !SKIP_RE.test(c)).map(t => ({ el: 'đáy trang', text: String(t).slice(0, 40), by: 'nút dính' }))].slice(0, 6), errs: [] });
    if ((await page.$('#go')) || !(await page.$('#obNext'))) break; await page.click('#obNext').catch(() => {}); await page.waitForTimeout(200);
  }
  const go = await page.$('#go'); if (go) { await go.click().catch(() => {}); await page.waitForTimeout(1800); }
  const list = [...ROUTES.slice(1).map(r => [r, null]), ...STATES];
  for (const [r, st] of list) {
    errs.length = 0;
    try {
      await page.keyboard.press('Shift').catch(() => {});
      await page.evaluate(h => { location.hash = h; scrollTo(0, 0); }, '#/' + r); await page.waitForTimeout(1100);
      await page.addStyleTag({ content: still }).catch(() => {});
      if (st) await page.evaluate(async k => { const U = window.UI || {}; if (k === 'toast' && U.toast) U.toast('Saved to your deck — a longer notification text to check wrapping', 15000); if (k === 'modal' && U.modal) U.modal('<h3>Locked day</h3><p>Complete the previous day first to unlock this day.</p><button class="btn primary">OK</button>'); if (k === 'signed' && window.Sync) { window.Sync.user = window.Sync.user || { uid: 'ua', displayName: 'Audit Learner', email: 'audit@example.com' }; const h = location.hash; location.hash = '#/home'; await new Promise(q => setTimeout(q, 300)); location.hash = h; await new Promise(q => setTimeout(q, 1000)); } }, st).catch(() => {});
      if (st) await page.waitForTimeout(600);
      const name = r + (st ? '+' + st : ''), f = `${OUT}/shots/${vn}-${scheme}-${safe(name)}.jpg`;
      await page.screenshot({ path: f, type: 'jpeg', quality: 70 }); shots.push({ vn, scheme, name, f });
      metrics.push({ vn, scheme, route: name, st, f, ...(await measure(page, !!st && st === 'modal')), errs: [...errs] });
    } catch (e) { metrics.push({ vn, scheme, route: r, fail: String(e.message).slice(0, 80) }); }
  }
  await ctx.close();
}
// ── chấm từng ô, ghi số liệu thô ──
for (const m of metrics) { m.issues = m.fail ? [{ sev: 'high', rule: 'js', msg: 'không chụp/đo được: ' + m.fail }] : audit(m); m.area = areaOf(m.route); }
fs.writeFileSync(OUT + '/metrics.json', JSON.stringify(metrics.map(({ f, ...m }) => m), null, 1));
// ── tờ lưới theo khu vực, ≤12 ô/tờ, khung đỏ ô lỗi, JPEG ≤300 KB ──
const cellOf = new Map(metrics.filter(m => m.f).map(m => [m.f, m]));
const sheetCtx = await browser.newContext({ viewport: { width: 1500, height: 900 } }); const sp = await sheetCtx.newPage();
const flaggedSheets = [], sheetsOut = [];
const rank = iss => iss.some(i => i.sev === 'high') ? 'high' : iss.some(i => i.sev === 'medium') ? 'medium' : iss.length ? 'low' : '';
const SHEET_MAX = 300 * 1024;
for (const vn of ['m', 'd']) for (const scheme of ['light', 'dark']) {
  const vp = VPS[vn], arr = shots.filter(s => s.vn === vn && s.scheme === scheme);
  for (const area of [...new Set(arr.map(s => areaOf(s.name)))]) {
    const inArea = arr.filter(s => areaOf(s.name) === area);
    for (let i = 0, k = 1; i < inArea.length; i += 12, k++) {
      const chunk = inArea.slice(i, i + 12), cols = vn === 'm' ? 6 : 4;
      const cells = chunk.map(s => { const m = cellOf.get(s.f) || {}, sev = rank(m.issues || []), col = sev === 'high' || sev === 'medium' ? '#e11' : sev === 'low' ? '#e90' : '#444';
        return `<figure style="margin:0;background:#fff;outline:${sev === 'high' || sev === 'medium' ? 5 : 2}px solid ${col};outline-offset:-1px"><figcaption style="background:${col};color:#fff;padding:3px 5px;font-weight:600">${s.name} · ${vp.width}×${vp.height} · ${scheme}${(m.issues || []).length ? ` · ⚠${m.issues.length}` : ''}</figcaption><img style="width:100%;display:block" src="data:image/jpeg;base64,${fs.readFileSync(s.f).toString('base64')}"></figure>`; });
      const html = `<body style="margin:0;background:#777;font:13px sans-serif"><div style="display:grid;grid-template-columns:repeat(${cols},1fr);gap:6px;padding:6px">${cells.join('')}</div>`;
      const file = `${vn}-${scheme}-${area}-${String(k).padStart(2, '0')}.jpg`; let buf;
      for (const w of [1500, 1200, 1000, 800]) { await sp.setViewportSize({ width: w, height: 900 }); await sp.setContent(html); for (const q of [72, 58, 46, 36]) { buf = await sp.screenshot({ type: 'jpeg', quality: q, fullPage: true }); if (buf.length <= SHEET_MAX) break; } if (buf.length <= SHEET_MAX) break; }
      fs.writeFileSync(`${OUT}/sheets/${file}`, buf);
      const bad = chunk.some(s => ['high', 'medium'].includes(rank((cellOf.get(s.f) || {}).issues || [])));
      if (bad) { fs.writeFileSync(`${OUT}/flagged/${file}`, buf); flaggedSheets.push(file); }
      sheetsOut.push({ file, kb: Math.round(buf.length / 1024), bad, names: chunk.map(s => s.name) });
    }
  }
}
await browser.close();
// ── report.md: lỗi xếp theo mức, mỗi dòng chỉ tờ chứa ô ──
const sheetOf = new Map(); for (const sh of sheetsOut) for (const n of sh.names) sheetOf.set(sh.file.split('-').slice(0, 2).join('-') + '|' + n, sh.file);
const rows = []; for (const m of metrics) for (const i of m.issues) rows.push({ ...i, route: m.route, vp: m.vn === 'm' ? '375' : '1440', scheme: m.scheme, sheet: sheetOf.get(`${m.vn}-${m.scheme}|${m.route}`) || '' });
rows.sort((a, b) => SEV_ORDER.indexOf(a.sev) - SEV_ORDER.indexOf(b.sev));
const cnt = s => rows.filter(r => r.sev === s).length, cells = metrics.length, badCells = metrics.filter(m => m.issues.some(i => i.sev !== 'low')).length;
const md = [`# UI audit – ${new Date().toISOString().slice(0, 10)} (${LANG})`, '', `${cells} ô · ${badCells} ô có lỗi cao/trung · 🔴 cao ${cnt('high')} · 🟠 trung ${cnt('medium')} · 🟡 thấp ${cnt('low')} · tờ có ô đỏ: ${flaggedSheets.length}/${sheetsOut.length}`, '',
  '> CI chạy offline (noProd): chữ tiếng Việt ở trang ngữ pháp en, "Invalid sitekey", khung xương từ điển ở từ lạ, "Sign-in … lexkite.com" ở Me là hiện tượng CI, không phải lỗi người dùng.', '',
  '| Mức | Màn | Cỡ | Theme | Luật | Chi tiết | Tờ |', '|---|---|---|---|---|---|---|', ...rows.map(r => `| ${r.sev} | ${r.route} | ${r.vp} | ${r.scheme} | ${r.rule} | ${r.msg.replace(/\|/g, '/')} | ${r.sheet} |`), '', `Tờ: ${sheetsOut.map(s => `${s.file} (${s.kb} KB${s.bad ? ' 🔴' : ''})`).join(', ')}`];
fs.writeFileSync(OUT + '/report.md', md.join('\n') + '\n');
fs.writeFileSync(OUT + '/summary.txt', `UI audit ${new Date().toISOString().slice(0, 10)}: ${cells} ô, cao ${cnt('high')}, trung ${cnt('medium')}, thấp ${cnt('low')}; tờ đỏ ${flaggedSheets.length}/${sheetsOut.length} (artifact ui-audit-shots → report.md)\n`);
console.log('✓', shots.length, 'ảnh,', sheetsOut.length, 'tờ,', 'cao', cnt('high'), 'trung', cnt('medium'), 'thấp', cnt('low'));
