// 🎭 Cổng chars-stage (runtime, CI: .github/workflows/chars-stage.yml): MỌI màn có Ama/Carlos × 390 px + desktop × sáng + tối – đo trên trang thật, không đoán:
//  · đủ lớn: đầu ≥ minHead px (ngưỡng từng màn trong chars-stage.json, CHỈ được nâng) · không tràn ngang · đầu không bị thanh trên/khung xén
//  · không lơ lửng/cắt trần: đáy khung phải khuất sau mặt đục, hoặc nằm trong Chars.slot
//  · cảnh hai người (Chars.duo): mặt đỡ THẤY ĐƯỢC so với nền trang, cùng đáy + cùng đường mắt, đứng sát, câu mới ngay dưới hai người, đúng người nói ở MỌI lượt, đuôi bong bóng nằm trong bề ngang người đó, nhãn tên đúng tâm từng người + không đè đầu, giảm chuyển động → không chuyển tiếp
//  · không làm nhạt: opacity < 1 / filter (brightness, saturate…) / lớp phủ st-dim trên nhân vật khi đứng yên = ĐỎ; đủ nét: điểm ảnh nguồn ≥ 0,85 × điểm ảnh hiển thị (DPR 2), độ nét cảnh đo trên ảnh chụp có/không biến đổi
//  · icon Material không rỗng (font tải được, tên có trong bộ thu gọn) · nhãn 'Đối thoại' đúng ngôn ngữ
//  · 0 nhân vật ở màn phải có = ĐỎ (cổng không im lặng). Màn không có nhân vật (expect:0) cũng được ghi lại để bảng luôn đủ.
// Dùng: node scripts/test/chars-stage-shots.mjs [web=web] [out=out/chars-stage] [--report]   (--report: chỉ chụp + đo, không đỏ – dùng cho ảnh TRƯỚC của nhánh gốc). Chỉ chạy trên CI.
import fs from 'node:fs'; import path from 'node:path';
import { chromium } from 'playwright';
import { DRIVE, DRIVEN, READY, SEED_STREAK, FIX_CLOCK, MIME } from './stitch-screens.mjs';
const argv = process.argv.slice(2), REPORT = argv.includes('--report'), [ROOT = 'web', OUT = 'out/chars-stage'] = argv.filter(x => !x.startsWith('--'));
fs.mkdirSync(OUT, { recursive: true });
const CFG = JSON.parse(fs.readFileSync(new URL('./chars-stage.json', import.meta.url), 'utf8')), SURF = CFG.surfaces;
const VIEWS = [['390', { width: 390, height: 844, isMobile: true, hasTouch: true }], ['desk', { width: 1280, height: 900, isMobile: false, hasTouch: false }]], THEMES = ['dark', 'light'];
const STORY = { id: 's-qc', kind: 'story', cefr: 'A2', em: '🛂', title: 'Passport control', lines: [{ who: 'ama', en: 'Good morning. Can I see your passport, please?' }, { who: 'carlos', en: 'Of course. Here you are.' }, { who: 'ama', en: 'Thank you. How long are you staying?' }, { who: 'carlos', en: 'Two weeks. I am visiting my sister in the city.' }, { who: 'ama', en: 'Where does your sister live?' }, { who: 'carlos', en: 'She lives near the central station.' }, { who: 'ama', en: 'Do you have anything to declare?' }, { who: 'carlos', en: 'No, only my clothes and a few books.' }, { who: 'ama', en: 'Thank you. Enjoy your stay.' }, { who: 'carlos', en: 'Thanks. Have a nice day.' }], checks: [] };

// Đo trong trang: mọi hình giáo viên đang thấy. Khung ảnh registry: đầu ≈ 35 % chiều cao khung (Ama 8 %→43 %, Carlos 12 %→46 %).
function measure() {
  const W = innerWidth, out = { w: W, over: document.documentElement.scrollWidth - W, items: [] };
  const shown = e => { for (let x = e; x && x !== document.documentElement; x = x.parentElement) { const s = getComputedStyle(x); if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity < 0.05) return false; } const b = e.getBoundingClientRect(); return b.width > 8 && b.height > 8; };
  const els = [...document.querySelectorAll('img[src*="teach/"], video[src*="teach/"], canvas.tch-cv, canvas.tch-face, canvas.tslot-img')].filter(shown).filter(e => !(e.tagName === 'IMG' && e.closest('.tch') && e.closest('.tch').querySelector('canvas.tch-cv, canvas.tch-face')));
  const opaque = e => { for (let x = e; x && x !== document.documentElement; x = x.parentElement) { const c = getComputedStyle(x).backgroundColor, m = c.match(/[\d.]+/g) || [], g = getComputedStyle(x).backgroundImage; if ((m.length === 3 || (m.length > 3 && +m[3] > 0.9)) || g !== 'none') return true; } return false; };
  const pe = document.createElement('style'); pe.textContent = '*{pointer-events:auto!important}'; document.head.appendChild(pe);
  for (const e of els) {
    const r = e.getBoundingClientRect(), host = e.closest('.tslot') || e.closest('.tch') || e, avatar = /avatar/.test(e.getAttribute('src') || ''), src = (e.getAttribute('src') || (e.closest('.tch') && (e.closest('.tch').querySelector('img') || {}).getAttribute?.('src')) || '');
    const dpr = devicePixelRatio, natH = e.tagName === 'CANVAS' ? e.height : e.tagName === 'VIDEO' ? e.videoHeight : e.naturalHeight;
    let op = 1, fil = ''; for (let x = e; x && x !== document.documentElement; x = x.parentElement) { const s = getComputedStyle(x); op *= +s.opacity; if (/(brightness|saturate|grayscale|contrast|opacity|blur|sepia)\(/.test(s.filter)) fil = s.filter; }
    const it = { op: +op.toFixed(2), sharp: natH ? +(natH / (r.height * dpr)).toFixed(2) : null, kind: host.classList.contains('tslot') ? 'slot' : host.classList.contains('tch') ? 'live' : 'bare', who: (src.match(/teach\/(ama|carlos)/) || [])[1] || '?', h: Math.round(r.height), head: Math.round(r.height * (avatar ? 0.7 : 0.35)), l: Math.round(r.left), r: Math.round(r.right), t: Math.round(r.top), b: Math.round(r.bottom), errs: [] };
    if (r.left < -2 || r.right > W + 2) it.errs.push(`tràn ngang ${it.l}..${it.r}`);
    if (op < 0.995) it.errs.push(`nhân vật bị làm nhạt: opacity ${it.op}`); if (fil) it.errs.push('nhân vật bị filter ' + fil); if (it.sharp != null && it.sharp < 0.85) it.errs.push(`kém nét: nguồn/hiển thị ${it.sharp}`);
    { const dim = e.closest('.st-dim'), w = e.closest('.lsn-tchw'); if (dim && !(w && +getComputedStyle(w).zIndex > 25)) it.errs.push('nhân vật dưới lớp phủ st-dim'); }
    const cx = r.left + r.width / 2, hy = r.top + r.height * 0.25, top = document.elementFromPoint(cx, Math.max(0, Math.min(innerHeight - 1, hy)));
    if (hy >= 0 && hy < innerHeight && top && !(host.contains(top) || top.contains(host)) && opaque(top) && getComputedStyle(top).pointerEvents !== 'none') it.errs.push('mặt bị che bởi ' + (top.id || String(top.className).split(' ')[0] || top.tagName));
    if (it.kind !== 'slot' && !avatar && r.bottom > 0 && r.bottom < innerHeight) { const y = r.bottom - Math.min(6, r.height * .05), b = document.elementFromPoint(cx, y); if (!b || host.contains(b) || !opaque(b)) it.errs.push('đáy khung không khuất sau mặt đục (cắt trần/lơ lửng)'); }
    out.items.push(it);
  }
  pe.remove();
  out.icons = [...document.querySelectorAll('.material-symbols-outlined')].filter(shown).filter(x => { const b = x.getBoundingClientRect(); return b.width > 0; }).flatMap(x => { const b = x.getBoundingClientRect(), fs = parseFloat(getComputedStyle(x).fontSize), n = x.textContent.trim(); return !n ? ['icon rỗng'] : !/^[a-z0-9_]+$/.test(n) ? [`icon hiện chữ '${n}' thay vì ký hiệu`] : !document.fonts.check(`${fs}px "Material Symbols Outlined"`) ? [`font icon chưa tải (${n})`] : b.width > fs * 1.35 ? [`icon '${n}' không có trong bộ thu gọn`] : []; });
  return out;
}
// Cảnh hai người: đo hình học + đúng người nói. who = người của câu đang hiện.
function duoState(who) {
  const lum = c => { const m = (c.match(/[\d.]+/g) || []).map(Number).slice(0, 3).map(v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }); return .2126 * m[0] + .7152 * m[1] + .0722 * m[2]; }, ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
  const s = document.querySelector('.cduo'), errs = [], d = {}; if (!s) return { errs: ['không có cảnh Chars.duo (.cduo)'], d };
  const a = s.querySelector('.cduo-a'), b = s.querySelector('.cduo-b'), ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect(), H = ra.height;
  if (Math.abs(ra.bottom - rb.bottom) > 1) errs.push('hai người không cùng mặt đất'); if (Math.abs(ra.top - rb.top) > 1) errs.push('hai người lệch đường mắt');
  const fa = { l: ra.left + ra.width / 2 - H * 1.154 * .203, r: ra.left + ra.width / 2 + H * 1.154 * .203 }, fb = { l: rb.left + rb.width / 2 - H * 1.154 * .394, r: rb.left + rb.width / 2 + H * 1.154 * .394 }, rtl = fa.l > fb.l;
  d.gap = Math.round(rtl ? fa.l - fb.r : fb.l - fa.r); d.H = Math.round(H); if (d.gap > 40) errs.push(`hai người cách xa ${d.gap}px (> 40)`);
  const ch = document.querySelector('#lsnChat'), lg = document.querySelector('.cduo-log'); if (!lg) return { errs: errs.concat('không có khung thoại cố định .cduo-log'), d }; const cr = lg.getBoundingClientRect(), bg = getComputedStyle(document.querySelector('main')).backgroundColor, edge = getComputedStyle(lg).borderTopColor;
  d.edge = +ratio(edge, bg).toFixed(2); if (d.edge < 1.2) errs.push(`mặt đỡ gần trùng màu nền (mép ${d.edge}:1 < 1.2) – đường hông như bị cắt`);
  const sunk = ra.bottom - cr.top; d.sunk = Math.round(sunk / H * 100); if (sunk < H * .2) errs.push(`đường hông lộ trên mặt đỡ (khuất ${d.sunk}% < 20%)`);
  const cur = ch.querySelector('.lsn-ln:last-child'), bub = cur && cur.children[1];
  if (!cur) return { errs: errs.concat('không có câu thoại'), d };
  if (cur.dataset.who !== who) errs.push(`bong bóng mới của ${cur.dataset.who}, đang nói ${who}`);
  const br = bub.getBoundingClientRect(); d.stageTop = Math.round(ra.top); d.logH = Math.round(cr.height);
  if (document.scrollingElement.scrollTop > 0 || document.scrollingElement.scrollHeight > innerHeight + 1) errs.push(`cả trang cuộn được (${document.scrollingElement.scrollHeight} > ${innerHeight}) – nhân vật sẽ bị đẩy đi`);
  if (ra.top < 0 || sunk > H * .4) errs.push(`nhân vật bị che: đỉnh ${Math.round(ra.top)}, khuất ${d.sunk}% (> 40%) – không xem được khớp miệng`);
  if (cr.height < 120) errs.push(`khung thoại quá thấp (${d.logH}px < 120)`);
  if (br.top < cr.top - 1 || br.bottom > cr.bottom + 1) errs.push(`câu mới không nằm trọn trong khung thoại (${Math.round(br.top)}–${Math.round(br.bottom)} / ${Math.round(cr.top)}–${Math.round(cr.bottom)})`);
  const pb = getComputedStyle(bub, '::before'), tail = bub.querySelector('.tchb-tail'), mid0 = (rtl ? -1 : 1) * ((br.left + br.width / 2) - (lg.getBoundingClientRect().left + cr.width / 2)); d.tail = !!tail || (pb.content !== 'none' && pb.content !== 'normal');
  if (!d.tail) errs.push('bong bóng không có đuôi'); if (who === 'carlos' ? mid0 < 0 : mid0 > 0) errs.push(`bong bóng của ${who} không nằm phía người nói`);
  const box = w => s.querySelector(`.cduo-p[data-who=${w}] .tch`), other = who === 'carlos' ? 'ama' : 'carlos', sp = box(who), li = box(other);
  if (!sp || !li) errs.push('thiếu khung giáo viên'); else { if (!sp.classList.contains('talk') || li.classList.contains('talk')) errs.push(`người nói (.talk) sai, phải là ${who}`);
    d.opListen = +getComputedStyle(li).opacity; if (d.opListen < 1) errs.push('người nghe bị làm mờ'); if (sp.getBoundingClientRect().height <= li.getBoundingClientRect().height) errs.push('người nói không nổi hơn người nghe');
    d.trans = getComputedStyle(sp).transitionDuration; }
  { const row = document.querySelector('main>div>div:first-child'), ps = [row.firstElementChild, row.lastElementChild], figC = [(fa.l + fa.r) / 2, (fb.l + fb.r) / 2], mid = document.querySelector('.lsn-mid').getBoundingClientRect(), headTop = ra.top + H * .08;
    ps.forEach((p, i) => { const b = p.getBoundingClientRect(), dx = Math.abs(b.left + b.width / 2 - figC[i]); d['nameDx' + i] = Math.round(dx); if (dx > 3) errs.push(`nhãn ${p.textContent.trim()} lệch tâm người ${Math.round(dx)}px`); if (b.bottom > headTop - 2) errs.push(`nhãn ${p.textContent.trim()} đè đầu`); if (b.left < mid.right && b.right > mid.left && b.top < mid.bottom && b.bottom > mid.top) errs.push('nhãn tên đè nhãn giữa'); });
    if (ps[who === 'carlos' ? 1 : 0].getBoundingClientRect().width && getComputedStyle(ps[who === 'carlos' ? 1 : 0]).boxShadow === 'none') errs.push('nhãn người đang nói không nổi'); }
  const old = ch.querySelector('.lsn-ln:not(:last-child)'); if (old && old.getBoundingClientRect().top >= br.top) errs.push('câu cũ phải nằm trên câu mới');
  const foot = document.querySelector('#lsnGo'); if (foot && foot.getBoundingClientRect().bottom > innerHeight + 1) errs.push('nút Tiếp tục ngoài màn');
  return { errs, d };
}
const rows = [], fails = [], jsErrs = []; const browser = await chromium.launch();
const route = async ctx => ctx.route('**/*', r => { const u = new URL(r.request().url()); if (u.hostname !== 'lk.test') return r.abort(); let p = decodeURIComponent(u.pathname); if (p.startsWith('/api/')) return r.fulfill({ status: 200, body: '{}', contentType: 'application/json' }); if (p.endsWith('/')) p += 'index.html'; const f = path.join(ROOT, p); if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) return r.fulfill({ status: 404, body: '' }); r.fulfill({ status: 200, body: fs.readFileSync(f), contentType: MIME[path.extname(f)] || 'application/octet-stream' }); });
const shot = async (page, name) => { await page.addStyleTag({ content: '#toast{display:none!important}' }).catch(() => {}); await page.evaluate(() => { if (document.activeElement) document.activeElement.blur(); scrollTo(0, 0); }).catch(() => {}); fs.writeFileSync(path.join(OUT, name + '.png'), await page.screenshot()); };
const seed = page => page.evaluate(async () => { localStorage.setItem('lk.ux1', '1'); localStorage.setItem('lk.speak', '1'); localStorage.setItem('lk.onb', '1'); App.state.settings.onboarded = true; App.state.settings.exam = 'ielts'; App.state.settings.examTarget = '7.5'; await App.saveSettings(); localStorage.setItem('lk.lsn.path', '3'); localStorage.setItem('lk.ux1.st', JSON.stringify({ 0: 3, 1: 3, 2: 2 })); });
for (const [vn, vp] of VIEWS) for (const th of THEMES) {
  const { width, height, ...o } = vp, ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 2, colorScheme: th, serviceWorkers: 'block', ...o }); await route(ctx);
  const page = await ctx.newPage(); page.on('pageerror', e => jsErrs.push(`${vn}/${th}: ${e.message}`)); await FIX_CLOCK(page);
  const url = h => `https://lk.test/app/?sandbox=1&hl=en#/${h}`;
  await page.goto(url('home'), { waitUntil: 'load' }); await page.waitForTimeout(2200); await seed(page).catch(e => jsErrs.push('seed ' + e.message));
  for (const [k, c] of Object.entries(SURF)) {
    const tag = `${k}-${vn}-${th}`, rec = { k, vn, th, role: c.role, errs: [], items: [] };
    try {
      if (c.page) { await page.goto('https://lk.test' + c.page, { waitUntil: 'load' }); await page.waitForTimeout(1500); }
      else { await page.goto(url(c.route), { waitUntil: 'load' }); await page.reload({ waitUntil: 'load' }); await page.waitForTimeout(1500); await FIX_CLOCK(page); await page.evaluate(SEED_STREAK).catch(() => {}); await page.evaluate(() => App.route()).catch(() => {}); await page.waitForTimeout(500); if (DRIVEN.test(c.drive || '')) await page.evaluate(DRIVE, c.drive); if (READY[c.drive]) await page.waitForSelector(READY[c.drive], { state: 'attached', timeout: 6000 }).catch(() => rec.errs.push('chưa tới trạng thái ' + READY[c.drive])); await page.waitForTimeout(700); }
      await shot(page, tag);
      const m = await page.evaluate(measure); rec.items = m.items; rec.over = m.over;
      if (m.over > 1) rec.errs.push(`tràn ngang trang ${m.over}px`); rec.errs.push(...new Set(m.icons));
      if (!c.expect0 && !m.items.length) rec.errs.push('không thấy nhân vật nào (cổng không im lặng)');
      if (c.expect0 && m.items.length) rec.errs.push('màn ghi "không có nhân vật" nay có – đo và thêm ngưỡng');
      for (const it of m.items) { rec.errs.push(...it.errs.map(x => `${it.who}: ${x}`)); if (c.minHead && it.head < c.minHead) rec.errs.push(`${it.who}: đầu ${it.head}px < ${c.minHead}`); }
    } catch (e) { rec.errs.push('lỗi mở màn: ' + e.message.split('\n')[0]); }
    rows.push(rec); if (rec.errs.length) fails.push(`${tag}: ${rec.errs.join(' · ')}`);
  }
  // Hội thoại thật: đi từng lượt Ama → Carlos → Ama, chụp từng lượt
  { const rec = { k: 'duo-turns', vn, th, role: 'duo', errs: [], items: [], turns: [] };
    try { await page.goto(url('lesson/go?demo=1'), { waitUntil: 'load' }); await page.reload({ waitUntil: 'load' }); await page.waitForTimeout(1200);
      await page.evaluate(async st => { localStorage.setItem('lk.lsn.path.demo', '3'); localStorage.removeItem('lk.lsn.s.story.demo'); await App.need('lesson'); window.LESSON_STORIES = [st]; await App.routes.lesson('go'); }, STORY); await page.waitForTimeout(900);
      for (let i = 0; i < STORY.lines.length; i++) { const who = STORY.lines[i].who; await page.waitForSelector('#lsnGo', { timeout: 5000 }); await page.waitForTimeout(450); const r = await page.evaluate(duoState, who); rec.turns.push({ who, ...r.d }); rec.errs.push(...r.errs.map(x => `lượt ${i + 1}: ${x}`)); if (i && Math.abs(r.d.stageTop - rec.turns[0].stageTop) > 1) rec.errs.push(`lượt ${i + 1}: nhân vật xê dịch ${r.d.stageTop - rec.turns[0].stageTop}px so với câu đầu`); await shot(page, `duo-${i + 1}-${vn}-${th}`);
        if (!i) { const lap = async () => { const c = await page.evaluate(() => { const b = document.querySelector('.cduo').getBoundingClientRect(); return { x: b.left, y: Math.max(0, b.top), width: b.width, height: b.height * .6 }; }); const png = (await page.screenshot({ clip: c })).toString('base64'); return page.evaluate(async b => { const im = new Image(); im.src = 'data:image/png;base64,' + b; await im.decode(); const k = document.createElement('canvas'); k.width = im.width; k.height = im.height; const x = k.getContext('2d'); x.drawImage(im, 0, 0); const D = x.getImageData(0, 0, k.width, k.height).data, W = k.width, L = i => .3 * D[i * 4] + .59 * D[i * 4 + 1] + .11 * D[i * 4 + 2]; let v = 0, n = 0; for (let y = 1; y < k.height - 1; y += 2) for (let q = 1; q < W - 1; q += 2) { const c = y * W + q, l = 4 * L(c) - L(c - 1) - L(c + 1) - L(c - W) - L(c + W); v += l * l; n++; } return v / n; }, png); };
          const a1 = await lap(), st = await page.addStyleTag({ content: '.cduo .tch{transform:none!important;transition:none!important}' }); await page.waitForTimeout(80); const a0 = await lap(); await st.evaluate(n => n.remove()); rec.sharp = +(a1 / a0).toFixed(3); if (rec.sharp < 0.85) rec.errs.push(`biến đổi làm nhoè hình: độ nét ${rec.sharp} so với không biến đổi`); }
        await page.click('#lsnGo'); await page.waitForTimeout(300); }
    } catch (e) { rec.errs.push('lỗi hội thoại: ' + e.message.split('\n')[0]); }
    rows.push(rec); if (rec.errs.length) fails.push(`duo-${vn}-${th}: ${rec.errs.join(' · ')}`); }
  await ctx.close();
}
// Nhãn 'Đối thoại' đúng ngôn ngữ + RTL (ar) vẫn đúng tâm, không chữ nguồn lọt
for (const [hl, no] of [['de', /Đối thoại/], ['ja', /Đối thoại|Dialogue/], ['ar', /Đối thoại|Dialogue/], ['vi', /Dialogue/]]) { const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, serviceWorkers: 'block', isMobile: true, hasTouch: true }); await route(ctx); const page = await ctx.newPage(); const rec = { k: 'i18n-' + hl, vn: '390', th: 'auto', errs: [] };
  try { await page.goto(`https://lk.test/app/?sandbox=1&hl=${hl}#/home`, { waitUntil: 'load' }); await page.waitForTimeout(1800); await seed(page); await page.goto(`https://lk.test/app/?sandbox=1&hl=${hl}#/lesson/go?demo=1`, { waitUntil: 'load' }); await page.reload({ waitUntil: 'load' }); await page.waitForTimeout(1200); await page.evaluate(async st => { localStorage.setItem('lk.lsn.path.demo', '3'); await App.need('lesson'); window.LESSON_STORIES = [st]; await App.routes.lesson('go'); }, STORY); await page.waitForSelector('#lsnGo', { timeout: 6000 }); await page.waitForTimeout(500);
    rec.mid = await page.evaluate(() => document.querySelector('.lsn-mid').textContent.trim()); if (!rec.mid || no.test(rec.mid)) rec.errs.push(`nhãn giữa chưa dịch: "${rec.mid}"`); const r = await page.evaluate(duoState, 'ama'); rec.errs.push(...r.errs); await shot(page, `duo-i18n-${hl}`);
  } catch (e) { rec.errs.push('lỗi: ' + e.message.split('\n')[0]); } rows.push(rec); if (rec.errs.length) fails.push(`i18n ${hl}: ${rec.errs.join(' · ')}`); await ctx.close(); }
// Giảm chuyển động: đổi lượt không chuyển tiếp
{ const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, reducedMotion: 'reduce', serviceWorkers: 'block' }); await route(ctx); const page = await ctx.newPage(); await page.goto('https://lk.test/app/?sandbox=1&hl=en#/home', { waitUntil: 'load' }); await page.waitForTimeout(1800); await seed(page).catch(() => {});
  await page.goto('https://lk.test/app/?sandbox=1&hl=en#/lesson/go?demo=1', { waitUntil: 'load' }); await page.reload({ waitUntil: 'load' }); await page.waitForTimeout(1200);
  const rm = await page.evaluate(async st => { localStorage.setItem('lk.lsn.path.demo', '3'); await App.need('lesson'); window.LESSON_STORIES = [st]; await App.routes.lesson('go'); await new Promise(r => setTimeout(r, 700)); const t = document.querySelector('.cduo .tch'), l = document.querySelector('.lsn-ln:last-child'); return { t: t && getComputedStyle(t).transitionDuration, a: l && getComputedStyle(l).animationName }; }, STORY).catch(e => ({ err: e.message }));
  if (!(rm.t === '0s' && rm.a === 'none')) fails.push(`giảm chuyển động: vẫn chuyển động (${JSON.stringify(rm)})`); rows.push({ k: 'reduced-motion', vn: '390', th: 'auto', errs: [], rm }); await ctx.close(); }
if (jsErrs.length) fails.push('lỗi JS: ' + [...new Set(jsErrs)].slice(0, 6).join(' | '));
// Bảng + tờ trước/sau (ảnh TRƯỚC: thư mục <out>/../chars-stage-before nếu có)
const sum = rows.filter(r => r.items && r.k !== 'duo-turns').map(r => `| ${r.k} | ${r.vn} ${r.th} | ${r.role || ''} | ${[...new Set(r.items.map(i => i.kind))].join('+') || '–'} | ${r.items.map(i => i.who + ' ' + i.head + 'px').join(', ') || '0'} | ${r.errs.join(' · ') || 'đạt'} |`);
fs.writeFileSync(path.join(OUT, 'report.md'), `# chars-stage\n\n| màn | khổ | vai | cách vẽ | cỡ đầu | kết quả |\n|---|---|---|---|---|---|\n${sum.join('\n')}\n\n## Hội thoại từng lượt\n\n\`\`\`json\n${JSON.stringify(rows.filter(r => r.k === 'duo-turns').map(r => ({ v: r.vn, t: r.th, turns: r.turns, errs: r.errs })), null, 0)}\n\`\`\`\n`);
fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify({ rows, fails }, null, 1));
const before = OUT.replace(/\/?$/, '') + '-before', ALL = [...Object.keys(SURF), 'duo-1', 'duo-2', 'duo-3'];
for (const [vn] of VIEWS) { const png = f => fs.existsSync(f) ? `data:image/png;base64,${fs.readFileSync(f).toString('base64')}` : '';
  const cell = (dir, n) => { const s = png(path.join(dir, n + '.png')); return s ? `<img src="${s}" style="width:${vn === '390' ? 234 : 480}px;display:block">` : '<i>–</i>'; };
  const body = ALL.flatMap(k => THEMES.map(th => `<tr><th>${k}<br>${th}</th><td>${cell(before, `${k}-${vn}-${th}`)}</td><td>${cell(OUT, `${k}-${vn}-${th}`)}</td></tr>`)).join('');
  const p = await browser.newPage({ viewport: { width: vn === '390' ? 640 : 1120, height: 900 } }); await p.setContent(`<!doctype html><meta charset=utf-8><style>body{font:13px system-ui;margin:12px}table{border-collapse:collapse}td,th{border:1px solid #bbb;padding:4px;vertical-align:top}</style><table><tr><th></th><th>TRƯỚC</th><th>SAU</th></tr>${body}</table>`, { waitUntil: 'load' }); fs.writeFileSync(path.join(OUT, `sheet-${vn}.png`), await p.screenshot({ fullPage: true })); await p.close(); }
await browser.close();
console.log(sum.join('\n'));
if (fails.length) { console.error(`${REPORT ? '(chỉ báo cáo) ' : ''}✗ chars-stage:\n  ` + fails.join('\n  ')); if (!REPORT) process.exit(1); } else console.log('✓ chars-stage: mọi màn đạt');
