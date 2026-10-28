// 🔍 new-ui-qa: soát hình TỪNG MÀN MỚI (bài học trộn #155/#160 · giữ thói quen #154/#157 · giáo viên #151 · mặt tiền video YouTube) – docs/NEW-UI-QA.md
// Mỗi màn × trạng thái × khung (360×800, 390×844, 768×1024, 1280×800) × sáng/tối × ngôn ngữ: chụp ảnh + đầu dò trong trang:
//   FAIL: tràn ngang · chữ bị cắt · lớp nổi đè nút / đè giáo viên · nút < 44 px (khung cảm ứng 360/390/768, CSS pointer:coarse thật) · tương phản < WCAG AA (axe) · ảnh hỏng · chữ Việt rò ở ngôn ngữ khác
//         · nhân vật lạ (chỉ Ama/Carlos 3D bank v2: không Kit/Mia/mascot khác, không emoji mặt người/con vật) · CLS > 0 khi chuyển bước bằng thao tác thật · ar không RTL
//   WARN: khung hình > 50 ms khi chuyển bước (runner không GPU → chỉ cảnh báo)
// Cờ tính năng CHỈ bật trong trình duyệt thử (localStorage lk.lesson=1, ?ret=1, ?demo=1) – không đổi cấu hình người dùng. Hermetic: /api/* giả, host ngoài = rỗng.
// Trình duyệt: Chrome thật (NUQ_CHANNEL=chrome, có H.264); NUQ_CHANNEL= (rỗng) = Chromium.
// Dùng: node scripts/test/new-ui-qa.mjs [--root .] [--lang en,ar,...] [--vp 360,390,768,1280] [--scheme light,dark] [--only lesson,ret,teacher,video] [--out nuq-out]
// Ra: <out>/shots/<state>/<vp>-<scheme>-<lang>.png · <out>/report.json {fail[], warn[], texts{}} · mã thoát 1 khi có FAIL (0 ảnh chụp → cũng FAIL).
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { serve } from '../quality/serve.mjs';

const require = createRequire(import.meta.url);
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const ROOT = path.resolve(arg('root', '.')), OUT = path.resolve(arg('out', 'nuq-out'));
const ALL_LANGS = ['en', 'vi', 'ar', 'de', 'es', 'fr', 'hi', 'id', 'ja', 'ko', 'pt', 'ru', 'th', 'tr', 'zh'];
const LANGS = arg('lang', ALL_LANGS.join(',')).split(','), VPS = arg('vp', '360,390,768,1280').split(','), SCHEMES = arg('scheme', 'light,dark').split(',');
const ONLY = arg('only', 'lesson,ret,teacher,video').split(',');
const VP = { 360: { width: 360, height: 800, m: 1 }, 390: { width: 390, height: 844, m: 1 }, 768: { width: 768, height: 1024, m: 1 }, 1280: { width: 1280, height: 800, m: 0 } };
const AXE = fs.readFileSync(require.resolve('axe-core'), 'utf8');
const CHECKS = fs.readFileSync(new URL('./journey-e2e/checks.js', import.meta.url), 'utf8');
const sleep = ms => new Promise(r => setTimeout(r, ms));
fs.mkdirSync(OUT + '/shots', { recursive: true });
const report = { fail: [], warn: [], texts: {}, shots: 0 };
const srv = await serve(path.join(ROOT, 'web'), 0), O = srv.origin, srvM = await serve(ROOT, 0), OM = srvM.origin; // app (<base href="/">) · mock docs/mocks (đường dẫn ../../../web)
process.env.PW_EXPERIMENTAL_SERVICE_WORKER_NETWORK_EVENTS ||= '1';
const browser = await chromium.launch({ channel: (process.env.NUQ_CHANNEL ?? 'chrome') || undefined, args: ['--autoplay-policy=no-user-gesture-required', '--mute-audio'] });
// Ảnh thay cho host ngoài (poster video, ảnh từ vựng media.lexkite.com): ảnh thật trong repo → "ảnh hỏng" chỉ bắt lỗi của chính trang
const STAND_IN = fs.readFileSync(path.join(ROOT, 'web/img/ext-lookup-480.webp'));

// ---------- đầu dò trong trang (chạy sau LKJC của journey-e2e) ----------
const PROBE = () => {
  const D = document;
  const vis = e => { const r = e.getBoundingClientRect(); if (r.width < 1 || r.height < 1) return null; const cs = getComputedStyle(e); if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity < 0.05) return null; for (let p = e; p; p = p.parentElement) { if (p.hidden || getComputedStyle(p).display === 'none') return null; } return r; };
  const inVp = r => r.bottom > 0 && r.right > 0 && r.top < innerHeight && r.left < innerWidth;
  const sel = e => { let s = e.tagName.toLowerCase(); if (e.id) return s + '#' + e.id; const c = [...e.classList].slice(0, 2).join('.'); return c ? s + '.' + c : s; };
  const txt = e => (e.innerText || e.textContent || e.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim().slice(0, 40);
  // Vùng của màn mới: nội dung, chân bài học, hộp thoại đang mở; trang mock (không có #view) = cả body
  const roots = () => { const m = D.querySelector('#modal:not([hidden]) #modalBox'); if (m && vis(m)) return [m]; return ['#view', '#lsnFoot', '.lv-slot'].map(s => D.querySelector(s)).filter(Boolean).concat(D.querySelector('#view') ? [] : [D.body]); };
  const VI = /[ăđơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]/i; // chỉ chữ riêng tiếng Việt (â ê ô có ở fr/pt/tr)
  // Nhân vật lạ: emoji mặt người/người/con vật/mascot (ký hiệu đồ vật 🔥🧊🎁🎉 thì được)
  const FACE = /[\u{1F600}-\u{1F64F}\u{1F466}-\u{1F478}\u{1F47C}\u{1F481}-\u{1F487}\u{1F574}-\u{1F575}\u{1F57A}\u{1F645}-\u{1F64F}\u{1F6B6}\u{1F9D1}-\u{1F9DF}\u{1F42D}-\u{1F43E}\u{1F98A}\u{1F989}\u{1F99C}\u{1F916}\u{1F47E}\u{1F920}-\u{1F92F}\u{1F970}-\u{1F97A}]/u;
  const ALLOWED_IMG = /\/teach\/(ama|carlos)\/|\/img\/teach\/(ama|carlos)\.|teachers3d\/|teacher-(call|pilot)\/(clips|assets)\/(ama|carlos)_|ext-lookup-480\.webp|\/vimg\/|^data:image\/gif|^blob:/;
  // Máy cảm ứng thật khớp @media (pointer: coarse) → vùng chạm --tap 2.8rem; Chromium giả lập hasTouch KHÔNG đổi media "pointer" → tự bật các khối coarse/hover:none
  const touchify = () => { for (const ss of D.styleSheets) { let rules; try { rules = ss.cssRules; } catch (e) { continue; } for (const r of rules) if (r.media && r.conditionText !== undefined) { const c = r.conditionText; if (/pointer:\s*coarse|hover:\s*none/.test(c) && !/pointer:\s*fine|hover:\s*hover/.test(c)) r.media.mediaText = 'all'; else if (/pointer:\s*fine|hover:\s*hover/.test(c) && !/coarse|none/.test(c)) r.media.mediaText = 'not all'; } } };
  const mOpen0 = () => { const m = D.querySelector('#modal:not([hidden]) #modalBox'); return !!(m && vis(m)); };
  return (o) => {
    if (o.touch) touchify();
    const fail = [], warn = [], add = (a, m) => a.push(m);
    const R = roots();
    // nút/vùng chạm < 44 px (WCAG 2.5.5 AAA mức 44 – yêu cầu của chủ): mọi thứ bấm được trong vùng màn mới
    for (const root of R) for (const e of root.querySelectorAll('button, a[href], [role="button"], input, select, textarea, summary')) {
      if (e.disabled && !e.matches('.lsn-opt,.lsn-tile')) continue; const r = vis(e); if (!r || !inVp(r)) continue;
      if (e.matches('a') && getComputedStyle(e).display === 'inline' && e.closest('p,li')) continue; // liên kết trong câu chữ: WCAG loại trừ
      if (o.touch && (r.width < 43.5 || r.height < 43.5)) add(fail, `tap ${sel(e)} «${txt(e)}» ${Math.round(r.width)}×${Math.round(r.height)}`);
    }
    // nút bị che / bị cắt ở mép màn: điểm giữa + điểm sát mép dưới của nút phải trúng chính nút (elementFromPoint) – bắt mọi lớp đè, kể cả lớp "chrome" của app
    for (const root of R) for (const e of root.querySelectorAll('button:not([disabled]), a.btn, [role="button"]')) {
      const r = vis(e); if (!r || r.top >= innerHeight || r.bottom <= 0) continue;
      if (e.closest('.lsn-path') || (mOpen0() && !e.closest('#modalBox'))) continue; // bản đồ cuộn dài: nút dưới màn hình là bình thường · nút trang dưới hộp thoại
      const inFixed = (() => { for (let p = e; p && p !== D.body; p = p.parentElement) if (/fixed|sticky/.test(getComputedStyle(p).position)) return true; return false; })();
      if (inFixed && r.bottom > innerHeight + 1) { add(fail, `cut-off ${sel(e)} «${txt(e)}» mép dưới ${Math.round(r.bottom)} > ${innerHeight}`); continue; }
      if (r.bottom > innerHeight) continue; // nằm dưới màn hình trong nội dung cuộn được
      for (const [x, y] of [[r.left + r.width / 2, r.top + r.height / 2], [r.left + r.width / 2, r.bottom - 3]]) { const top = D.elementFromPoint(Math.min(innerWidth - 1, x), Math.min(innerHeight - 1, y)); if (top && !e.contains(top) && !top.contains(e)) {
          // nút trong nội dung cuộn nằm dưới thanh cố định (thanh dưới, chân bài học): cuộn được tới thì không phải lỗi
          let fx = top; while (fx && fx !== D.body && getComputedStyle(fx).position !== 'fixed') fx = fx.parentElement;
          let sc = e.parentElement; while (sc && sc !== D.body && !(/auto|scroll/.test(getComputedStyle(sc).overflowY) && sc.scrollHeight > sc.clientHeight)) sc = sc.parentElement; // khung cuộn thật (app cuộn trong .main, không phải document)
          if (!sc || sc === D.body) sc = D.scrollingElement || D.documentElement;
          if (!inFixed && fx && fx !== D.body && sc.scrollHeight - sc.clientHeight - sc.scrollTop >= r.bottom - fx.getBoundingClientRect().top - 1) break; add(fail, `occluded ${sel(e)} «${txt(e)}» bị ${sel(top)} che (${Math.round(x)},${Math.round(y)})`); break; } }
    }
    // nút chỉ có biểu tượng (axe không đo): biểu tượng vs nền nút ≥ 3:1 (WCAG 1.4.11)
    const rgb = c => { const m = /rgba?\(([\d.]+), ([\d.]+), ([\d.]+)(?:, ([\d.]+))?/.exec(c); return m && (m[4] === undefined || +m[4] > 0.95) ? [+m[1], +m[2], +m[3]] : null; };
    const lum = ([r, g, b]) => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
    for (const root of R) for (const e of root.querySelectorAll('button, a')) {
      if ((e.innerText || '').trim().replace(/[^\p{L}\p{N}]/gu, '') || !e.querySelector('svg') || !vis(e)) continue;
      const cs = getComputedStyle(e), fg = rgb(cs.color), bg = rgb(cs.backgroundColor); if (!fg || !bg) continue;
      const [a1, b1] = [lum(fg), lum(bg)].sort((x, y) => y - x), cr = (a1 + 0.05) / (b1 + 0.05);
      if (cr < 3) add(fail, `icon-contrast ${sel(e)} «${(e.getAttribute('aria-label') || '').slice(0, 30)}» ${cr.toFixed(2)}:1 < 3:1`);
    }
    // giáo viên / nút bị lớp cố định đè (chân bài học, thanh dưới…)
    const fixed = [...D.querySelectorAll('body *')].filter(e => getComputedStyle(e).position === 'fixed' && vis(e) && getComputedStyle(e).pointerEvents !== 'none');
    const mOpen = D.querySelector('#modal:not([hidden]) #modalBox');
    for (const tch of D.querySelectorAll('#lsnTch, #lsnTch2, .ret-teach, .tch')) {
      if (mOpen && vis(mOpen) && !mOpen.contains(tch)) continue; // giáo viên của trang nằm dưới hộp thoại là đúng thiết kế
      const r = vis(tch); if (!r || !inVp(r)) continue;
      for (const f of fixed) { if (f.contains(tch) || tch.contains(f)) continue; const fr = f.getBoundingClientRect(); const ov = Math.max(0, Math.min(r.right, fr.right) - Math.max(r.left, fr.left)) * Math.max(0, Math.min(r.bottom, fr.bottom) - Math.max(r.top, fr.top)); if (ov > r.width * r.height * 0.05 && +getComputedStyle(f).zIndex >= 0) add(fail, `teacher-occluded ${sel(tch)} dưới ${sel(f)} ${Math.round(100 * ov / (r.width * r.height))} %`); }
    }
    // ảnh/video hỏng + nhân vật lạ
    for (const root of R) {
      for (const im of root.querySelectorAll('img')) { const r = vis(im); if (!r) continue; const src = im.currentSrc || im.src;
        if (im.complete && !im.naturalWidth) add(fail, `broken-img ${sel(im)} ${src.slice(-60)}`);
        if (!ALLOWED_IMG.test(src) && !/\/img\/(lex|vocab|w)\/|lexicon|\/video\//.test(src)) add(warn, `img-src ${sel(im)} ${src.slice(-70)}`);
        if (/img\/call\/|mia|kit[-_.]/i.test(src)) add(fail, `character ${sel(im)} nhân vật ngoài Ama/Carlos: ${src.slice(-60)}`); }
      for (const v of root.querySelectorAll('video')) { if (v.error) add(fail, `broken-video ${sel(v)} ${String(v.currentSrc).slice(-60)}`); }
      for (const k of root.querySelectorAll('svg[data-mood], .kit, [class*="kit-"]')) if (vis(k) && !(k.closest('#kitSay') && /^#\/home\?all=1/.test(location.hash))) add(fail, // trợ lý Kit của trang chủ CŨ (#/home?all=1) ngoài phạm vi màn mới – BRAND-RULES; mọi màn mới chỉ Ama/Carlos
         `character Kit/mascot ${sel(k)} (chỉ Ama/Carlos 3D)`);
      const tw = D.createTreeWalker(root, NodeFilter.SHOW_TEXT); let n;
      while ((n = tw.nextNode())) { const s = n.textContent; if (!s.trim() || !n.parentElement || !vis(n.parentElement)) continue;
        if (FACE.test(s)) add(fail, `character emoji «${s.trim().slice(0, 30)}» trong ${sel(n.parentElement)}`);
        if (o.lang !== 'vi' && VI.test(s) && !n.parentElement.closest('[lang="vi"]')) add(fail, `i18n-vi-leak «${s.trim().slice(0, 50)}» trong ${sel(n.parentElement)}`); }
    }
    // ảnh nhân vật còn nền (phòng, bảng trắng): viền trên/trái/phải phải trong suốt (cùng nguồn → đọc được điểm ảnh)
    for (const im of D.querySelectorAll('img.tch-poster, img.ret-teach, .sc img')) {
      if (!vis(im) || !im.complete || !im.naturalWidth || !/\/teach\//.test(im.currentSrc || im.src)) continue;
      try { const c = D.createElement('canvas'); c.width = 48; c.height = 64; const x = c.getContext('2d'); x.drawImage(im, 0, 0, 48, 64); const d = x.getImageData(0, 0, 48, 64).data; let s = 0, n = 0;
        for (let y = 0; y < 64; y++) for (let xx = 0; xx < 48; xx++) if (y < 3 || ((xx < 3 || xx > 44) && y < 38)) { s += d[(y * 48 + xx) * 4 + 3]; n++; }
        if (s / n > 26) add(fail, `character-bg ${sel(im)} ảnh nhân vật còn nền (alpha viền ${Math.round(s / n)}/255) – dùng bản tách nền`); } catch (e) { /* khác nguồn */ }
    }
    if (o.lang === 'ar' && D.documentElement.dir !== 'rtl' && D.querySelector('#view')) add(fail, 'rtl: <html dir> không phải rtl ở ar');
    // chữ giao diện (để bộ gộp so với bản en → chuỗi chưa dịch): bỏ phần nội dung học tiếng Anh (lang="en")
    const texts = [];
    for (const root of R) { const tw = D.createTreeWalker(root, NodeFilter.SHOW_TEXT); let n; while ((n = tw.nextNode())) { const s = n.textContent.replace(/\s+/g, ' ').trim(); if (s.length < 3 || !/\p{L}{3}/u.test(s) || !n.parentElement || !vis(n.parentElement) || n.parentElement.closest('[lang="en"]')) continue; texts.push(s.slice(0, 80)); } }
    return { fail, warn, texts: [...new Set(texts)] };
  };
};

// ---------- khung 1 tổ hợp (ngôn ngữ × khung × sáng/tối): mở 1 trang, chạy lần lượt các trạng thái ----------
async function combo(lang, vpk, scheme) {
  const vp = VP[vpk], tag = `${vpk}-${scheme}-${lang}`;
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, isMobile: !!vp.m, hasTouch: !!vp.m, deviceScaleFactor: 1, colorScheme: scheme, locale: lang, reducedMotion: 'no-preference', serviceWorkers: 'block' });
  await ctx.addInitScript(({ seed }) => {
    for (const [k, v] of Object.entries(seed)) try { localStorage.setItem(k, v); } catch { /* */ }
    window.__cls = 0; window.__clsReset = () => { window.__cls = 0; window.__clsSrc = []; }; window.__clsSrc = [];
    try { new PerformanceObserver(l => { for (const e of l.getEntries()) if (!e.hadRecentInput) { window.__cls += e.value; const s = e.sources && e.sources[0] && e.sources[0].node; window.__clsSrc.push((s ? (s.id ? '#' + s.id : String(s.className || s.nodeName)).slice(0, 40) : '?') + ' ' + e.value.toFixed(4)); } }).observe({ type: 'layout-shift', buffered: true }); } catch { /* */ }
    window.__frames = () => new Promise(res => { const d = []; let t0 = performance.now(), end = t0 + 900; const f = t => { d.push(t - t0); t0 = t; if (t < end) requestAnimationFrame(f); else res(d); }; requestAnimationFrame(f); });
  }, { seed: { 'sbx.settings': JSON.stringify({ onboarded: true }), 'lk.lesson': '1' } });
  await ctx.addInitScript(CHECKS);
  await ctx.addInitScript(`window.__NUQ = (${PROBE.toString()})();`);
  await ctx.route('**/*', async r => {
    const u = new URL(r.request().url()), t = r.request().resourceType();
    if (u.pathname.startsWith('/api/')) return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(u.pathname === '/api/config' ? { lesson_mix: false, ret: '0' } : {}) });
    if (u.origin === O && u.pathname === '/data/videos.json') { // mặt tiền YouTube: gắn youtube_id cho mọi mục (kênh nhúng giả) – nội dung thật của repo
      const j = JSON.parse(fs.readFileSync(path.join(ROOT, 'web/data/videos.json'), 'utf8')); j.items.forEach((it, i) => { it.youtube_id = ('nuqTest000' + i).slice(-11); });
      return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(j) });
    }
    if (u.origin === O || u.origin === OM) return r.continue();
    if (t === 'image') return r.fulfill({ status: 200, contentType: 'image/webp', body: STAND_IN });
    return r.fulfill({ status: 200, contentType: t === 'script' ? 'text/javascript' : t === 'stylesheet' ? 'text/css' : 'text/plain', body: '' });
  });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e.message).slice(0, 160)));
  const F = (state, m) => { report.fail.push(`[${state}] ${tag}: ${m}`); };
  const W = (state, m) => { report.warn.push(`[${state}] ${tag}: ${m}`); };
  const app = (hash, q = '') => `${O}/app/?sandbox=1&hl=${lang}${q}#${hash}`;
  const h = {
    page, lang,
    async boot(hash, q) { await page.goto(app(hash, q), { waitUntil: 'load', timeout: 45000 }); await page.waitForFunction(() => window.App && document.querySelector('#view') && document.querySelector('#view').children.length > 0, null, { timeout: 30000 }); await page.evaluate(() => window.I18N && I18N.whenReady && I18N.whenReady()).catch(() => {}); await sleep(900); },
    async go(hash) { await page.evaluate(x => { location.hash = x; }, hash); await sleep(1100); },
    async mock(p) { await page.goto(`${OM}/${p}`, { waitUntil: 'load' }); await sleep(1500); },
    /** bước chuyển bằng thao tác THẬT: đo CLS + khung hình */
    async act(state, fn) {
      await page.evaluate(() => window.__clsReset());
      const fr = page.evaluate(() => window.__frames());
      await fn(); await sleep(700);
      const [cls, src] = await page.evaluate(() => [window.__cls, window.__clsSrc]);
      if (cls > 0.0001) F(state, `CLS ${cls.toFixed(4)} khi chuyển bước (${src.slice(0, 3).join(', ')})`);
      const d = (await fr).slice(2), long = d.filter(x => x > 50);
      if (long.length) W(state, `jank ${long.length} khung > 50 ms (max ${Math.round(Math.max(...d))} ms)`);
    },
    async shot(state) {
      await page.evaluate(() => document.fonts && document.fonts.ready).catch(() => {}); await sleep(250);
      await page.evaluate(() => { const x = document.querySelector('#toast.show'); if (x && /🧪/.test(x.textContent)) x.classList.remove('show'); }).catch(() => {}); // toast "chế độ thử nghiệm" chỉ có ở ?sandbox=1 của bộ thử – người dùng không thấy
      const dir = `${OUT}/shots/${state}`; fs.mkdirSync(dir, { recursive: true });
      const p = await page.evaluate(o => window.__NUQ(o), { lang, touch: !!vp.m }).catch(e => ({ fail: ['đầu dò lỗi: ' + e.message.slice(0, 100)], warn: [], texts: [] }));
      await sleep(120); await page.screenshot( // sau đầu dò: khối CSS cảm ứng đã bật
        { path: `${dir}/${tag}.png` }); report.shots++;
      const v = await page.evaluate(s => window.LKJC ? LKJC.visual(s) : { fail: [], warn: [] }, state).catch(() => ({ fail: [], warn: [] }));
      if (!(await page.evaluate(() => !!window.axe))) await page.addScriptTag({ content: AXE });
      const ax = await page.evaluate(async () => { const inc = ['#modal:not([hidden]) #modalBox', '#view', '#lsnFoot', '.lv-slot'].filter(s => document.querySelector(s)); const r = await axe.run(inc.length ? { include: inc.map(s => [s]) } : document, { runOnly: ['color-contrast'], resultTypes: ['violations'] }); return r.violations.flatMap(x => x.nodes.map(n => `${n.target.join(' ')} ${(n.any[0] && n.any[0].data && n.any[0].data.contrastRatio) || '?'}:1 «${String(n.html).replace(/<[^>]+>/g, '').trim().slice(0, 30)}»`)); }).catch(e => ['axe lỗi ' + e.message.slice(0, 80)]);
      for (const m of p.fail) F(state, m); for (const m of p.warn) W(state, m);
      for (const m of v.fail) F(state, 'visual ' + m); for (const m of v.warn) (/\(c\)|\(f\)/.test(m) ? F : W)(state, 'visual ' + m);
      for (const m of ax) F(state, 'contrast ' + m);
      (report.texts[state] = report.texts[state] || {})[tag] = p.texts;
    },
    click: (s) => page.locator(s).first().click({ timeout: 8000, force: true }), // force: nút có hiệu ứng lặp vô hạn (BẮT ĐẦU nhún) không bao giờ "đứng yên" – vẫn là cú chạm thật
  };
  const run = async (name, fn) => { try { await fn(h); } catch (e) { F(name, 'không dựng được trạng thái: ' + String(e.message).split('\n')[0].slice(0, 160)); } };
  if (ONLY.includes('lesson')) await lessonStates(h, run);
  if (ONLY.includes('ret')) await retStates(h, run);
  if (ONLY.includes('video')) await run('video-facade', videoStates);
  if (ONLY.includes('teacher') && lang === 'en') await teacherStates(h, run); // mock tĩnh chỉ có tiếng Anh
  for (const e of [...new Set(errs)]) report.fail.push(`[pageerror] ${tag}: ${e}`);
  await ctx.close();
}

// ---------- 🧩 bài học trộn (#155, #160) ----------
const TYPES = ['gap', 'build', 'say', 'pic', 'tr', 'type', 'match', 'mean'];
async function lessonStates(h, run) {
  const P = h.page;
  await run('lesson-map', async () => { await h.boot('/lesson?demo=1'); await h.shot('lesson-map'); });
  await run('home-map', async () => { await h.go('/home'); await h.shot('home-map'); }); // cờ lesson_mix bật (máy thử) → trang chủ = bản đồ
  await run('lesson-start', async () => { await h.go('/lesson?demo=1'); await h.act('lesson-start', () => h.click('.lsn-start')); await P.waitForSelector('#lsnBub', { timeout: 10000 }); await h.shot('lesson-start'); });
  for (const ty of TYPES) await run('ex-' + ty, async () => {
    const ok = await P.evaluate(t => App.lessonDemo && App.lessonDemo.jump(t), ty); if (!ok) throw new Error('không dựng được dạng ' + ty + ' từ bộ demo');
    await sleep(700); await h.shot('ex-' + ty);
  });
  // đúng / sai / Vì sao? / COMBO / màn kết – bằng thao tác thật (bấm đáp án → Kiểm tra → Tiếp tục)
  const pickGap = async right => { await P.evaluate(() => App.lessonDemo.jump('gap')); await sleep(500); const a = await P.evaluate(() => App.lessonState().sess.cur.answer); const opts = P.locator('.lsn-opts .lsn-opt'); const n = await opts.count(); for (let i = 0; i < n; i++) { const o = await opts.nth(i).getAttribute('data-o'); if ((o === a) === right) { await opts.nth(i).click(); break; } } };
  await run('gap-selected', async () => { await pickGap(true); await h.shot('gap-selected'); });
  await run('gap-correct', async () => { await h.act('gap-correct', () => h.click('#lsnCheck')); await h.shot('gap-correct'); });
  await run('gap-explain', async () => { await h.act('gap-explain', () => h.click('#lsnWhy')); await sleep(500); await h.shot('gap-explain'); });
  await run('gap-wrong', async () => { await h.act('gap-wrong-next', () => h.click('#lsnNext')); await pickGap(false); await h.act('gap-wrong', () => h.click('#lsnCheck')); await h.shot('gap-wrong'); });
  await run('combo', async () => { for (let i = 0; i < 3; i++) { await h.click('#lsnNext'); await sleep(400); await P.evaluate(() => App.lessonDemo.answer(true)); await sleep(400); } await h.shot('combo'); });
  await run('lesson-end', async () => { await P.evaluate(() => { const L = App.lessonState(); L.sess.q = []; }); await h.act('lesson-end', () => h.click('#lsnNext')); await sleep(900); await h.shot('lesson-end'); });
  // Truyện + Radio (#160): nút bản đồ theo kế hoạch chặng → tìm vị trí nút story/radio rồi chơi
  for (const kind of ['story', 'radio']) await run(kind, async () => {
    const at = await P.evaluate(k => { const plan = LessonEngine.pathPlan([], Date.now(), { story: (window.LESSON_STORIES || []).filter(s => s.kind === 'story').length, radio: (window.LESSON_STORIES || []).filter(s => s.kind === 'radio').length }); const i = plan.findIndex(p => p.kind === k); if (i >= 0) localStorage.setItem('lk.lsn.path.demo', String(i)); return i; }, kind);
    if (at < 0) throw new Error('kế hoạch chặng không có nút ' + kind);
    await h.go('/lesson?demo=1'); await h.shot(kind + '-map');
    await h.act(kind + '-open', () => h.click('.lsn-start')); await sleep(900); await h.shot(kind + '-line');
    for (let i = 0; i < 12 && !(await P.locator('.lsn-opts, .lsn-bank, .lsn-match').count()); i++) { if (await P.locator('#lsnGo').count()) await h.click('#lsnGo'); else if (await P.locator('#lsnNext').count()) await h.click('#lsnNext'); await sleep(450); }
    await h.shot(kind + '-quiz');
  });
  await P.evaluate(() => localStorage.removeItem('lk.lsn.path.demo'));
}

// ---------- 🔥 giữ thói quen (#154, #157): lịch tuần · #/streak · mốc · rã băng · rương · sự kiện · thẻ khoe ----------
async function retStates(h, run) {
  const P = h.page;
  const seedDays = n => P.evaluate(n => { const g = App.state.game; g.days = g.days || {}; for (let i = 0; i < n; i++) { const d = new Date(Date.now() - i * 864e5); g.days[Core.todayKey(d)] = { xp: 30, quizzes: 1 }; } }, n);
  // 7 ngày liên tiếp → mở #/streak: mốc 7 chưa chúc → màn chúc mừng tự bật (check()) → rương → đóng → trang chuỗi → trang chủ có lịch tuần
  await run('ret-celebrate', async () => { await h.boot('/stats', '&ret=1'); await seedDays(7); await h.go('/streak'); await P.waitForSelector('#modal:not([hidden]) .ret-cel', { timeout: 15000 }); await sleep(800); await h.shot('ret-celebrate'); });
  await run('ret-chest', async () => { await h.act('ret-chest', () => h.click('#retChestTile')); await sleep(600); await h.shot('ret-chest'); await P.evaluate(() => UI.closeModal()); await sleep(500); });
  await run('ret-page', async () => { await P.waitForSelector('.ret-big', { timeout: 8000 }); await h.shot('ret-page'); });
  await run('ret-home', async () => { await P.evaluate(() => localStorage.setItem('lk.lesson', '0')); await h.go('/home?all=1'); await P.waitForSelector('.ret-week', { timeout: 8000 }); await h.shot('ret-home'); await P.evaluate(() => localStorage.setItem('lk.lesson', '1')); await h.go('/streak'); });
  await run('ret-thaw', async () => { await P.evaluate(() => Ret.thaw()); await sleep(500); await h.shot('ret-thaw'); for (let i = 0; i < 3; i++) { await h.click('#retIce'); await sleep(250); } await sleep(500); await h.shot('ret-thawed'); await P.evaluate(() => UI.closeModal()); await sleep(300); });
  await run('share-card', async () => { await P.evaluate(() => App.need('share').then(() => ShareCard.open(92))); await sleep(1500); await h.shot('share-card'); await P.evaluate(() => UI.closeModal && UI.closeModal()); });
}

// ---------- 🎬 mặt tiền YouTube (lesson-video.js): thẻ bìa → bấm → khung chờ/bản tự lưu ----------
async function videoStates(h) {
  const P = h.page;
  await h.boot('/home?all=1', '&vtest=1'); // 3 clip trong manifest đều là clip thử (test: true) → chỉ hiện với ?vtest=1
  await P.evaluate(() => App.need('lvideo').then(() => { const d = document.createElement('div'); d.className = 'lv-slot'; d.hidden = true; d.dataset.lv = JSON.stringify({ mode: 'day', seed: 0, words: ['book', 'exit'], level: 'A2' }); document.querySelector('#view').prepend(d); return LessonVideo.scan(); }));
  await P.waitForSelector('.lv-card', { timeout: 10000 }); await h.shot('video-facade');
  await h.act('video-play', () => h.click('.lv-card')); await sleep(600); await h.shot('video-loading');
  await sleep(5000); await h.shot('video-fallback'); // YouTube không sẵn sàng (hermetic) → bản tự lưu
}

// ---------- 👩‍🏫 giáo viên gọi / pilot sprite (#151, mock tĩnh docs/mocks) ----------
async function teacherStates(h, run) {
  await run('teacher-call', async () => { await h.mock('docs/mocks/teacher-call/index.html'); await h.shot('teacher-call'); });
  await run('teacher-pilot', async () => { await h.mock('docs/mocks/teacher-pilot/index.html'); await h.shot('teacher-pilot'); });
  await run('teacher-sprite', async () => { await h.mock('docs/mocks/teacher-pilot/b-sprite.html'); await h.shot('teacher-sprite'); });
}

for (const lang of LANGS) for (const vp of VPS) for (const sc of SCHEMES) { console.log('▶', lang, vp, sc); await combo(lang, vp, sc); }
await browser.close(); for (const x of [srv, srvM]) x.close && x.close();
report.fail = [...new Set(report.fail)]; report.warn = [...new Set(report.warn)];
fs.writeFileSync(OUT + '/report.json', JSON.stringify(report, null, 1));
console.log(`ảnh: ${report.shots} · FAIL: ${report.fail.length} · WARN: ${report.warn.length}`);
for (const f of report.fail.slice(0, 80)) console.log('  ✗', f);
if (!report.shots) { console.log('✗ 0 ảnh chụp'); process.exit(1); }
process.exit(report.fail.length ? 1 : 0);
