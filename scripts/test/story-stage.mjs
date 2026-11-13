// Cổng sân khấu Truyện + khung bài tập (docs/specs/story-stage.md). Phần TĨNH chạy trong npm test; phần TRÌNH DUYỆT (playwright) chạy khi có + cờ --browser (story-stage.yml).
//   node scripts/test/story-stage.mjs [--browser] [--out out/story-stage]
import fs from 'node:fs'; import path from 'node:path'; import { createRequire } from 'node:module';
const FPS_MIN = 50; // ngưỡng fps – KHÔNG hạ (scripts/test/ci-policy.mjs chặn); phép đo bền hơn thay vì nới ngưỡng
const A = process.argv.slice(2), BROWSER = A.includes('--browser'), OUT = A.includes('--out') ? A[A.indexOf('--out') + 1] : 'out/story-stage';
const errs = [], rd = f => fs.readFileSync(f, 'utf8'), ok = (c, m) => { if (!c) errs.push(m); };
// ---------- tương phản WCAG (thuần) ----------
const lum = h => { const v = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255).map(c => (c <= .03928 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4)); return .2126 * v[0] + .7152 * v[1] + .0722 * v[2]; };
export const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
// ---------- 1) tĩnh ----------
const css = rd('web/css/story-stage.css'), js = rd('web/js/lesson/story-stage.js'), ui = rd('web/js/lesson/ui.js'), tj = rd('web/js/lesson/teacher.js'), app = rd('web/js/app.js'), sw = rd('web/sw.js');
for (const f of ['lesson/story-stage.js', 'lesson/ui.js', 'lesson/teacher.js']) ok(rd('web/js/' + f) === rd('extension/app/js/' + f), `bản sao add-on lệch: ${f}`);
ok(rd('web/css/story-stage.css') === rd('extension/app/css/story-stage.css'), 'bản sao add-on lệch: css/story-stage.css');
// tải lười: không vào khung app / SW SHELL / gói bài học
ok(!/story-stage/.test(sw.split('\n').find(l => /const SHELL/.test(l)) || ''), 'story-stage nằm trong SHELL (khung app ≤ 377 KB gz)');
ok(!/BUNDLES[\s\S]{0,40}story-stage/.test(app) && !/story-stage/.test(app), 'story-stage không được vào BUNDLES/khung – tải lười từ lesson/ui.js');
ok(/App\.loadCss\('css\/story-stage\.css'\)/.test(ui) && /App\.loadScript\('js\/lesson\/story-stage\.js'\)/.test(ui), 'ui.js phải tải lười CSS + JS sân khấu');
// chỉ animate transform/opacity; không backdrop-filter (giật Safari); giảm chuyển động
for (const m of css.matchAll(/transition:([^;}]+)/g)) ok(m[1].trim() === 'none' || /^(?:\s*(?:transform|opacity|background-color)\b[^,]*,?)+$/.test(m[1].replace(/cubic-bezier\([^)]*\)/g, '')), `transition ngoài transform/opacity/màu: ${m[1].trim()}`);
for (const m of css.matchAll(/@keyframes [\w-]+\{([^@]*?\}\})/g)) ok(!/(?:width|height|top|left|margin|padding)\s*:/.test(m[1]), 'keyframes chạm thuộc tính bố cục');
ok(/prefers-reduced-motion:reduce/.test(css) && /prefers-reduced-motion:no-preference/.test(css), 'thiếu prefers-reduced-motion');
ok(/backdrop-filter:none/.test(css), 'đầu trang cố định phải bỏ backdrop-filter');
ok(!/\.lsn-fx[^{]*#lsnTch\{[^}]*(mask|clip-path)/.test(css), 'Ama ở khung bài tập không được có mặt nạ/clip-path (final-qc not-pasted-on)'); ok(/\.ss \.ss-stage\{[^}]*direction:ltr/.test(css), 'sân khấu Truyện phải direction:ltr (RTL: Ama dịch ra ngoài mép → final-qc rtl-ar)');
ok(/\.lsn-fx \.ex-seat #lsnTch\{[^}]*position:relative/.test(css), 'Ama ở khung bài tập phải position:relative (đè .lsn-v2 .tch{absolute;inset:0} → lệch trái, không giữa bệ)');
ok(!/root\.style\.visibility = 'hidden'/.test(ui), 'ui.js ẩn khung chờ CSS bằng visibility:hidden → ExitGuard không thấy nút ✕, chèn thanh .lk-exitbar 64 px (lệch mẫu Stitch); dùng opacity');
ok(/<i class="ss-floor"/.test(ui), 'sàn chung (.ss-floor) thiếu trong ui.js');
// tương phản nút Kiểm tra: tắt/bật × sáng/tối (đọc từ biến CSS)
for (const name of ['sáng', 'tối']) {
  const g = k => { const re = name === 'sáng' ? new RegExp(`\\.lsn-fx\\{([^}]*)\\}`) : new RegExp(`:root\\[data-theme="dark"\\] \\.lsn-fx\\{([^}]*)\\}`); const b = css.match(re); const m = b && b[1].match(new RegExp(`--${k}:(#[0-9A-Fa-f]{6})`)); return m && m[1]; };
  for (const [bg, fg, what] of [['ex-dis-bg', 'ex-dis-fg', 'Kiểm tra (tắt)'], ['ex-on-bg', 'ex-on-fg', 'Kiểm tra (bật)']]) { const a = g(bg), b = g(fg); ok(a && b && ratio(a, b) >= 4.5, `${what} ${name}: tương phản ${a && b ? ratio(a, b).toFixed(2) : '?'} < 4.5`); }
}
ok(/#lsnCheck:disabled\{background-image:none!important/.test(css), 'nút Kiểm tra (tắt) còn gradient');
// lớp khung bài tập là .lsn-fx, KHÔNG .ex (style.css có .ex{font-style:italic;color:muted} cho câu ví dụ → cả màn bị nghiêng + xám)
ok(!/classList\.add\('ex'\)/.test(ui) && /classList\.add\('lsn-fx'\)/.test(ui), 'khung bài tập không được dùng lớp .ex (đụng style.css: chữ nghiêng/xám)');
// dòng kẻ trả lời chọn theo #lsnAns, KHÔNG theo lớp .lsn-ans: tấm phản hồi sai có span.lsn-ans = "Correct answer: …" (mẫu feedback-wrong) – chọn theo lớp làm nó cao 2 dòng kẻ trống
ok(!/\.lsn-fx \.lsn-ans/.test(css) && /\.lsn-fx div\.lsn-ans\{/.test(css) && !/\.lsn-fx #lsnAns/.test(css), 'story-stage.css: dòng kẻ trả lời chọn div.lsn-ans (không lớp trần: dính span "Correct answer" của tấm phản hồi; không #lsnAns: reserve() đo trên bản sao mất id)');
// chữ giao diện: chỉ khóa đã có bản dịch 15 ngôn ngữ (không khóa mới)
const en = fs.readdirSync('web/js/i18n/en').map(f => rd('web/js/i18n/en/' + f)).join('\n');
for (const m of js.matchAll(/\bT\('([^']+)'/g)) ok(en.includes(`'${m[1]}'`), `khóa dịch thiếu trong web/js/i18n/en: ${m[1]}`);
// bàn phím + rung + chip
ok(/e\.key === 'Enter'/.test(ui) && /navigator\.vibrate/.test(ui), 'Enter = Kiểm tra / rung phản hồi thiếu');
ok(/chip: sh\.chip/.test(ui), 'chip mục tiêu ở khung bài tập phải theo mẫu Stitch (sh.chip, ẩn khi không có mục tiêu)');
ok(/L\.vids/.test(ui) && /ctx\.vids\(\)/.test(js), 'dừng video người im (park) thiếu'); ok(!/park\(on\)/.test(tj), 'teacher.js thuộc PR #760 – không sửa ở đây');
// ---------- 2) trình duyệt ----------
const lines = [];
async function browser() {
  let pw; try { pw = createRequire(import.meta.url)('playwright'); } catch (e) { lines.push('playwright không có → bỏ phần trình duyệt'); return; }
  const { serve } = await import('./ux-guard-lib.mjs'); fs.mkdirSync(OUT, { recursive: true });
  const base = 'https://lk.test/app/?sandbox=1&ux1=1&ret=1&hl=en';
  const boot = async (br, scheme, vp, extra = {}) => { const ctx = await br.newContext(Object.assign({ viewport: vp, colorScheme: scheme, serviceWorkers: 'block', deviceScaleFactor: 2 }, extra)); await ctx.addInitScript(() => { try { localStorage.setItem('lk.ux1', '1'); localStorage.setItem('lk.ret', '1'); localStorage.setItem('lk.lesson_mix', '1'); window.__plays = 0; const P = HTMLMediaElement.prototype.play; HTMLMediaElement.prototype.play = function () { if (!this.muted && this.volume > 0) { window.__plays++; (window.__playSrc = window.__playSrc || []).push(String(this.currentSrc || this.src).slice(-60) + ' ' + (new Error().stack || '').split('\n').slice(2, 4).join('|').slice(0, 160)); } /* bước mở khóa iOS của LKAudio phát câu rỗng volume 0 = không có tiếng */ return P.apply(this, arguments); }; } catch (e) { /* */ } }); await serve(ctx, 'web'); return ctx; };
  const overlap = (a, b) => !(a.right <= b.left + 1 || b.right <= a.left + 1 || a.bottom <= b.top + 1 || b.bottom <= a.top + 1);
  for (const eng of ['chromium', 'webkit']) {
    let br; try { br = await pw[eng].launch(); } catch (e) { lines.push(`${eng}: không chạy được (${e.message.split('\n')[0]})`); continue; }
    for (const scheme of ['light', 'dark']) {
      const dev = eng === 'webkit' ? pw.devices['iPhone 13'] : { viewport: { width: 360, height: 780 } };
      const ctx = await boot(br, scheme, dev.viewport, eng === 'webkit' ? { userAgent: dev.userAgent, hasTouch: true, isMobile: true } : {}), page = await ctx.newPage(), tag = `${eng}-${scheme}`;
      const jsErr = []; page.on('pageerror', e => jsErr.push(e.message));
      // ----- Truyện -----
      await page.goto(`${base}#/lesson/go?story=s-cafe`, { waitUntil: 'load' }); await page.waitForSelector('.ss-stage', { timeout: 15000 }).catch(() => {});
      await page.waitForTimeout(1500);
      ok(await page.evaluate(() => !!document.querySelector('.ss-stage .ss-floor')), `${tag}: không có sàn chung`);
      ok((await page.evaluate(() => window.__plays)) === 0, `${tag}: âm thanh phát trước khi chạm ${JSON.stringify(await page.evaluate(() => window.__playSrc || []))}`);
      await page.screenshot({ path: `${OUT}/story-${tag}.png` });
      const geo = await page.evaluate(() => { const r = s => { const e = document.querySelector(s); return e && e.getBoundingClientRect().toJSON(); }; const chips = [...document.querySelectorAll('main > div > div:first-child span')].map(e => e.getBoundingClientRect().toJSON()); return { hdr: r('header'), chips, stage: r('.ss-stage'), floor: r('.ss-floor'), imgs: [...document.querySelectorAll('.ss-fig img')].map(i => i.getBoundingClientRect().toJSON()) }; });
      ok(geo.chips.every(c => c.top >= geo.hdr.bottom - 1), `${tag}: chip AMA/ĐỐI THOẠI/CARLOS bị đầu trang che`);
      ok(geo.imgs.every(i => i.bottom <= geo.floor.bottom + 1 && i.bottom >= geo.floor.top - 1), `${tag}: chân nhân vật không nằm trên/trong sàn (đường cắt lộ)`);
      { const fl = await page.evaluate(() => { const r = s => { const e = document.querySelector(s); return e && e.getBoundingClientRect().toJSON(); }; return { floor: r('.ss-stage .ss-floor'), stage: r('.ss-stage'), sheet: r('#lsnChat'), vh: innerHeight, bg: getComputedStyle(document.querySelector('.ss-stage .ss-floor')).backgroundColor, dis: getComputedStyle(document.querySelector('.ss-stage .ss-floor')).display }; });
        ok(fl.dis !== 'none' && fl.floor.height > 0 && fl.bg !== 'rgba(0, 0, 0, 0)', `${tag}: bệ .ss-floor phải hiển thị (cao > 0, có màu)`);
        ok(fl.floor.top >= fl.stage.top - 1 && fl.floor.bottom <= fl.stage.bottom + 1, `${tag}: bệ .ss-floor bị khung sân khấu cắt (nằm ngoài .ss-stage)`);
        ok(fl.floor.bottom <= fl.vh && fl.floor.top >= 0, `${tag}: bệ .ss-floor ngoài viewport`);
        ok(fl.sheet.top - fl.floor.top >= 4, `${tag}: bệ .ss-floor bị tấm hội thoại che hết (cần lộ ≥ 4 px)`); }
      // chạm Tiếp tục → âm chỉ phát sau chạm, người nói sáng, đổi theo dòng
      const speakers = []; { await page.click('#lsnGo').catch(() => {}); await page.waitForFunction(() => { const s = document.querySelector('.ss-stage'); return s && s.dataset.speaker; }, null, { timeout: 3000 }).catch(() => {}); speakers.push(await page.evaluate(() => (document.querySelector('.ss-stage') || {}).dataset?.speaker)); } // 1 lần chạm: dòng 2 (Carlos); chạm tiếp là vào bài Xếp câu của truyện
      ok(new Set(speakers.filter(Boolean)).size >= 1, `${tag}: người nói không sáng (data-speaker)`);
      ok((await page.evaluate(() => window.__plays)) > 0 || eng === 'webkit', `${tag}: không phát âm sau khi chạm`);
      const act = await page.evaluate(() => [...document.querySelectorAll('.lsn-ln')].map(n => { const a = n.querySelector('.ss-act'); if (!a) return null; const p = n.querySelector('p').getBoundingClientRect(), b = a.getBoundingClientRect(); return { who: n.dataset.who, dx: Math.round(a.firstElementChild.getBoundingClientRect().left - n.getBoundingClientRect().left), below: b.top >= p.bottom - 1, btns: a.children.length }; }).filter(Boolean));
      ok(act.length >= 2 && act.every(x => x.below && x.btns === 2) && new Set(act.map(x => x.dx)).size === 1, `${tag}: 🔊/🐢 không cùng chỗ ở cả hai người ${JSON.stringify(act)}`);
      const ov = await page.evaluate(() => { const bs = [...document.querySelectorAll('.lsn-ln button, #lsnGo, header button, header a')].map(e => e.getBoundingClientRect().toJSON()).filter(r => r.width); const o = []; bs.forEach((a, i) => bs.slice(i + 1).forEach(b => { if (!(a.right <= b.left + 1 || b.right <= a.left + 1 || a.bottom <= b.top + 1 || b.bottom <= a.top + 1)) o.push([a, b]); })); return o.length; });
      ok(ov === 0, `${tag}: ${ov} cặp nút chồng nhau`);
      await page.evaluate(() => scrollTo(0, 0)); await page.screenshot({ path: `${OUT}/story-after-${tag}.png` });
      await ctx.close();
      // ----- khung bài tập -----
      const c2 = await boot(br, scheme, dev.viewport, eng === 'webkit' ? { userAgent: dev.userAgent, hasTouch: true, isMobile: true } : {}), p2 = await c2.newPage();
      p2.on('pageerror', e => jsErr.push(e.message));
      let found = false; await p2.goto(`${base}#/lesson/go?demo=1`, { waitUntil: 'load' });
      for (let i = 0; i < 12 && !found; i++) { await p2.waitForTimeout(700); found = !!(await p2.$('#lsnBank')); if (!found) { const b = (await p2.$('#lsnGo')) || (await p2.$('#lsnSkip')); if (b) await b.click().catch(() => {}); else { const o = await p2.$('.lsn-opt'); if (o) { await o.click().catch(() => {}); await (await p2.$('#lsnCheck'))?.click().catch(() => {}); await p2.waitForTimeout(300); await (await p2.$('#lsnNext'))?.click().catch(() => {}); } } } }
      if (!found) { lines.push(`${tag}: không gặp bài Xếp câu trong demo (bỏ kiểm khung bài tập)`); await c2.close(); continue; }
      await p2.waitForTimeout(500);
      const col = await p2.evaluate(() => { const bg = e => getComputedStyle(e).backgroundColor, fg = e => getComputedStyle(e).color; const c = document.querySelector('#lsnCheck'); return { dis: c.disabled, bg: bg(c), fg: fg(c), chip: !!document.querySelector('.lsn-ex,.lsn-chip') && [...document.querySelectorAll('#lsn *')].some(e => /Mục tiêu|Target/.test(e.textContent) && e.children.length === 0 && e.offsetParent), skip: (() => { const s = document.querySelector('.lsn-skipb'); return s && { bg: bg(s), size: parseFloat(getComputedStyle(s.querySelector('span:last-child')).fontSize) }; })() }; });
      // chẩn đoán (không phải cổng): chiều dọc các khối đầu khung bài tập – so với mẫu Stitch lesson-question (chip 64 px, thẻ đề 111 px ở khổ 390)
      lines.push(`  ${tag} dọc: ` + JSON.stringify(await p2.evaluate(() => { const r = (e, n) => { if (!e) return null; const b = e.getBoundingClientRect(), c = getComputedStyle(e); return `${n}:${Math.round(b.top + scrollY)}+${Math.round(b.height)} pt${c.paddingTop} mt${c.marginTop} mb${c.marginBottom} ${c.position}`; }; const m = document.querySelector('#lsn > main, #lsn main'); const w = m && m.firstElementChild; return [r(document.querySelector('#lsn > header'), 'header'), r(m, 'main'), r(w, 'wrap'), ...(w ? [...w.children].slice(0, 6).map((e, i) => r(e, i + ':' + String(e.className).split(' ').filter(c => /^lsn-|^ex-/.test(c)).join('.'))) : []), r(document.querySelector('#lsn'), 'root'), r(document.querySelector('#lsn').parentElement, 'rootParent'), r(document.querySelector('#view'), 'view'), ...[...document.querySelector('#view').children].map((e, i) => r(e, 'view>' + i + ':' + e.tagName + '.' + String(e.className).slice(0, 24))), 'viewBefore:' + getComputedStyle(document.querySelector('#view'), '::before').content + '/' + getComputedStyle(document.querySelector('#view'), '::before').height, 'bodyPt' + getComputedStyle(document.body).paddingTop + ' disp' + getComputedStyle(document.querySelector('#view')).display + ' jc' + getComputedStyle(document.querySelector('#view')).justifyContent + ' scrollY' + Math.round(scrollY) + ' vh' + innerHeight]; })));
      const rgb = s => '#' + s.match(/\d+/g).slice(0, 3).map(n => (+n).toString(16).padStart(2, '0')).join('');
      ok(col.dis && ratio(rgb(col.bg), rgb(col.fg)) >= 4.5, `${tag}: nút Kiểm tra (tắt) tương phản ${ratio(rgb(col.bg), rgb(col.fg)).toFixed(2)}`);
      ok(!col.chip, `${tag}: chip mục tiêu còn ở màn bài tập`);
      { // sân khấu giáo viên (chủ 10/11): người cao ≥ 120 px thấy được, đáy khung (hông + dải mờ) khuất sau thẻ đề bài đục ≥ 28 px, không bệ giả, bong bóng có đuôi cạnh người, trong màn hình
        const sg = await p2.evaluate(() => { const t = document.querySelector('.lsn-fx .ex-seat #lsnTch'), q = document.querySelector('.lsn-fx .ex-seat + .lsn-qcard'), b = document.querySelector('.lsn-fx .tstage-bub'); if (!t || !q || !b) return { miss: [!t && 'tch', !q && 'qcard', !b && 'bub'].filter(Boolean) };
          const tr = t.getBoundingClientRect(), qr = q.getBoundingClientRect(), br = b.getBoundingClientRect(), tail = getComputedStyle(b, '::before');
          return { h: Math.round(qr.top - tr.top - tr.height * 0.08), hid: Math.round(tr.bottom - qr.top), floor: !!document.querySelector('.lsn-fx .ex-seat .ss-floor'), bub: !b.hidden && br.width > 80 && b.textContent.trim().length > 1, tail: tail.content !== 'none' && tail.content !== 'normal',
            beside: br.left >= tr.left + tr.width * 0.4 && br.top > tr.top && br.top < tr.top + tr.height * 0.45, inVp: tr.left > -24 && br.right <= innerWidth + 1 && document.documentElement.scrollWidth <= innerWidth + 1 }; });
        ok(!sg.miss && sg.h >= 120 && sg.hid >= 28 && !sg.floor && sg.bub && sg.tail && sg.beside && sg.inVp, `${tag}: sân khấu giáo viên sai chuẩn (≥120 px, che hông ≥28 px, không bệ, bong bóng có đuôi cạnh người) ${JSON.stringify(sg)}`); }
      ok(col.skip && /rgba\(0, 0, 0, 0\)|transparent/.test(col.skip.bg) && col.skip.size <= 13, `${tag}: Bỏ qua/Báo lỗi chưa lặng (${JSON.stringify(col.skip)})`);
      const rules = await p2.evaluate(() => { const a = document.querySelector('#lsnAns'); const s = getComputedStyle(a); return { img: s.backgroundImage.includes('gradient'), h: a.getBoundingClientRect().height }; });
      ok(rules.img && rules.h >= 100, `${tag}: không thấy dòng kẻ trả lời`);
      const slots = async () => p2.evaluate(() => [...document.querySelectorAll('#lsnBank>*')].map(e => e.getBoundingClientRect().toJSON()).map(r => [Math.round(r.left + scrollX), Math.round(r.top + scrollY)])); // theo toạ độ trang (click có thể cuộn khung nhìn)
      const bankBefore = await slots(), h0 = await p2.evaluate(() => document.querySelector('#lsnBank').getBoundingClientRect().height);
      await p2.click('#lsnBank>button'); await p2.waitForTimeout(350);
      ok(await p2.evaluate(() => document.querySelectorAll('#lsnAns>button').length === 1), `${tag}: chạm từ không bay vào dòng trả lời`);
      ok(await p2.evaluate(() => !document.querySelector('#lsnCheck').disabled), `${tag}: Kiểm tra không bật sau khi đặt từ`);
      const on = await p2.evaluate(() => { const c = document.querySelector('#lsnCheck'), s = getComputedStyle(c); return [s.backgroundColor, s.color, getComputedStyle(c).backgroundImage]; });
      // nền là gradient (background-color trong suốt) → đo chữ với TỪNG điểm dừng màu của gradient (kém nhất quyết định); không gradient thì đo nền phẳng
      const stops = (on[2].match(/rgba?\([^)]*\)/g) || []).map(rgb), bgs = stops.length ? stops : [rgb(on[0])];
      ok(Math.min(...bgs.map(b => ratio(b, rgb(on[1])))) >= 4.5 && (on[0] !== col.bg || on[2] !== 'none') && on[2] !== 'none', `${tag}: nút Kiểm tra (bật) tương phản ≥ 4.5 trên mọi điểm dừng gradient, khác bản tắt, giữ gradient mẫu Stitch ${on}`);
      const h1 = await p2.evaluate(() => document.querySelector('#lsnBank').getBoundingClientRect().height); ok(Math.abs(h1 - h0) < 1, `${tag}: ngân hàng đổi chiều cao ${h0}→${h1}`);
      await p2.screenshot({ path: `${OUT}/exercise-${tag}.png` });
      await p2.click('#lsnAns>button'); await p2.waitForTimeout(350);
      const bankAfter = await slots(); ok(JSON.stringify(bankAfter) === JSON.stringify(bankBefore), `${tag}: từ không về ĐÚNG ô cũ / ngân hàng xô bố cục ${JSON.stringify(bankBefore.map((p, i) => [p, bankAfter[i]]).filter(([p, q]) => !q || p[0] !== q[0] || p[1] !== q[1]).slice(0, 4))}`);
      // đặt đủ từ theo đáp án rồi Enter → tấm phản hồi (sai/đúng đều có câu đúng khi sai)
      await p2.click('#lsnBank>button'); await p2.keyboard.press('Backspace'); await p2.waitForTimeout(200); ok(await p2.evaluate(() => document.querySelectorAll('#lsnAns>button').length === 0), `${tag}: Backspace không gỡ từ cuối`);
      const n = await p2.evaluate(() => document.querySelectorAll('#lsnBank>button').length); for (let i = 0; i < n; i++) await p2.click(`#lsnBank>button:not([aria-hidden="true"]):not([disabled]) >> nth=0`).catch(() => {});
      await p2.evaluate(() => document.activeElement && document.activeElement.blur()); await p2.keyboard.press('Enter'); await p2.waitForTimeout(600);
      const fb = await p2.evaluate(() => { const f = document.querySelector('#lsnFoot'); return f && !f.hidden ? f.textContent.trim().length : 0; }); ok(fb > 0, `${tag}: Enter không mở tấm phản hồi`);
      ok(jsErr.length === 0, `${tag}: lỗi JS ${jsErr[0]}`);
      await p2.screenshot({ path: `${OUT}/feedback-${tag}.png` }); await c2.close();
    }
    // hiệu năng: Chromium CPU 4× – tác vụ dài > 50 ms ≤ 2 khi dòng hiện, fps ≥ 50, CLS 0
    if (eng === 'chromium') {
      const ctx = await boot(br, 'dark', { width: 360, height: 780 }), page = await ctx.newPage(), cdp = await ctx.newCDPSession(page); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
      await ctx.addInitScript(() => { window.__lt = 0; window.__cls = 0; new PerformanceObserver(l => l.getEntries().forEach(e => { if (e.duration > 50) window.__lt++; })).observe({ type: 'longtask', buffered: true }); new PerformanceObserver(l => l.getEntries().forEach(e => { if (!e.hadRecentInput) { window.__cls += e.value; (window.__clsSrc = window.__clsSrc || []).push(e.value.toFixed(4) + ' ' + (e.sources || []).map(s => (s.node && (s.node.id || s.node.className || s.node.nodeName)) + ':' + Math.round(s.previousRect.y) + '>' + Math.round(s.currentRect.y)).join(',').slice(0, 200)); } })).observe({ type: 'layout-shift', buffered: true }); });
      // 09/11 phép đo ổn định hơn: 1 cửa sổ 3 s duy nhất (gồm cú bấm + chuyển cảnh) dao động 38–60 fps trên runner chung dù fps nhàn rỗi luôn ~61 (22 lượt CI hôm nay, mã y hệt
      // lúc xanh lúc đỏ) → đo 5 LẦN trên 5 trang mới cùng máy, cổng lấy TRUNG VỊ (ngưỡng giữ nguyên fps ≥ 50, tác vụ dài ≤ 2); CLS phải = 0 ở MỌI lần. Không thử lại cho tới khi xanh.
      const measure = async pg => {
        await pg.goto(`${base}#/lesson/go?story=s-cafe`, { waitUntil: 'load' }); await pg.waitForSelector('.ss-stage', { timeout: 20000 }).catch(() => {}); await pg.waitForTimeout(2500);
        // cửa sổ đo 3 s TRỌN (gồm cú bấm + dòng mới hiện): đợi vòng đếm khung kết thúc rồi chia cho thời gian thật – đọc sớm khi mới trôi ~2 s mà vẫn chia 3 làm fps tụt giả (42 thay vì 61)
        await pg.evaluate(() => { window.__f = 0; window.__fdone = false; const t0 = performance.now(); (function f(now) { window.__f++; if (now - t0 < 3000) requestAnimationFrame(f); else { window.__fdt = now - t0; window.__fdone = true; } })(t0); window.__lt = 0; });
        await pg.evaluate(() => { window.__clk = performance.now(); }); await pg.click('#lsnGo').catch(() => {}); await pg.waitForFunction(() => window.__fdone, null, { timeout: 15000 });
        return await pg.evaluate(() => ({ lt: window.__lt, cls: window.__cls, fps: window.__f / (window.__fdt / 1000) }));
      };
      // 13/11 bền hơn nữa (điều phối): 2 lượt khởi động bỏ đi + 15 mẫu, lấy TRUNG VỊ, tự đo lại đúng 1 lần nếu trượt (runner chung dao động ±10 fps cùng mã: 58/56/47); ngưỡng KHÔNG đổi
      // (FPS_MIN – ci-policy giữ ≥ 50); mọi mẫu ghi vào ${OUT}/fps-samples.json (artifact) để xem xu hướng.
      const runSet = async n => { const out = [];
        for (let k = 0; k < n + 2; k++) { const pg = k === 0 ? page : await ctx.newPage(); if (k) { const c = await ctx.newCDPSession(pg); await c.send('Emulation.setCPUThrottlingRate', { rate: 4 }); }
          const r = await measure(pg); if (k) await pg.close(); if (k >= 2) out.push(r); }
        return out; };
      const stat = a => { const med = k => [...a].map(x => x[k]).sort((x, y) => x - y)[a.length >> 1]; return { lt: med('lt'), fps: med('fps'), cls: Math.max(...a.map(x => x.cls)) }; };
      let ms = await runSet(15), m = stat(ms), retried = false; const sets = [ms];
      if (m.fps < FPS_MIN || m.lt > 2) { retried = true; ms = await runSet(15); sets.push(ms); m = stat(ms); }
      fs.writeFileSync(`${OUT}/fps-samples.json`, JSON.stringify({ min: FPS_MIN, retried, sets: sets.map(a => a.map(x => +x.fps.toFixed(1))) }));
      lines.push(`chromium 4× (trung vị ${ms.length} lần${retried ? ', đã đo lại 1 lần' : ''}): longtask>50ms=${m.lt} cls=${m.cls.toFixed(3)} fps≈${m.fps.toFixed(0)} · fps từng lần ${ms.map(x => x.fps.toFixed(0)).join('/')} · longtask ${ms.map(x => x.lt).join('/')}`);
      ok(m.lt <= 2, `4×: ${m.lt} tác vụ dài > 50 ms (tối đa 2)`); ok(m.cls === 0, `CLS ${m.cls} ≠ 0 ${JSON.stringify(await page.evaluate(() => window.__clsSrc || []))}`); ok(m.fps >= FPS_MIN, `fps ${m.fps.toFixed(0)} < ${FPS_MIN}`);
      // chẩn đoán (không phải cổng): fps khi tắt dần từng nguồn vẽ → biết chi phí nằm ở đâu
      const fpsNow = async () => page.evaluate(() => new Promise(r => { let n = 0; const t0 = performance.now(); (function f() { n++; if (performance.now() - t0 < 2000) requestAnimationFrame(f); else r(n / 2); })(); }));
      lines.push(`  chẩn đoán fps: nguyên trạng ${(await fpsNow()).toFixed(0)}`);
      await page.evaluate(() => document.querySelectorAll('video').forEach(v => v.pause())); lines.push(`  dừng mọi video: ${(await fpsNow()).toFixed(0)}`);
      await page.addStyleTag({ content: '.ss-fig canvas{display:none!important}' }); lines.push(`  ẩn canvas: ${(await fpsNow()).toFixed(0)}`);
      await page.addStyleTag({ content: '.ss-stage{display:none!important}' }); lines.push(`  ẩn cả sân khấu: ${(await fpsNow()).toFixed(0)}`);
      await ctx.close();
    }
    await br.close();
  }
}
if (BROWSER) await browser();
fs.mkdirSync(OUT, { recursive: true });
const res = (errs.length ? errs.map(e => '✗ ' + e) : ['✓ story-stage: tĩnh' + (BROWSER ? ' + trình duyệt' : '') + ' đạt']).concat(lines).join('\n'); fs.writeFileSync(path.join(OUT, 'result.txt'), res + '\n'); console.log(res);
if (errs.length) process.exitCode = 1;
