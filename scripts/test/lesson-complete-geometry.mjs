// 🏁 Màn "Hoàn thành bài học" (Stitch v2.1 lesson-complete) – máy gác lỗi chủ báo 12/11 ("nhiều phần chưa logic, hơi lệch, chưa đúng"):
//   chip sai cấp (IELTS thay vì chặng/bài) · 2 vòng không nhãn · Ama lệch trái + bị thẻ cắt · ô icon ✨ thừa · "3′" · "TỔNG XP" sai nghĩa ·
//   vòng focus khi chuột · icon replay cho "Bản đồ" · nút ✕ bị cắt mép trên · số liệu lệch giữa các ô.
// Đo bằng HÌNH HỌC THẬT (Playwright/Chromium): lái bài thử tới màn kết (đúng hết / sai xen kẽ), rồi kiểm từng điều. Hermetic (web/ trên https://lk.test).
// Ma trận: 375×812 + 320×640 + 1280×800 · sáng/tối · vi/en/de/ar(RTL). Chạy: node scripts/test/lesson-complete-geometry.mjs [web] [out]  (CI: .github/workflows/lesson-complete.yml)
import fs from 'node:fs'; import path from 'node:path';
import { chromium } from 'playwright';
import { serve, SEED } from './stitch-screens.mjs';
const ROOT = path.resolve(process.argv[2] || 'web'), OUT = process.argv[3] || 'out/lesson-complete'; fs.mkdirSync(OUT, { recursive: true });
let fails = 0, total = 0; const ok = (c, m) => { total++; if (!c) { fails++; console.error('✗', m); } else console.log('✓', m); };

// Lái bài thử tới màn kết: wrongEvery = 0 → đúng hết; n → câu thứ 2 mỗi n câu trả sai
const PLAY = async wrongEvery => {
  const q = s => document.querySelector(s), qa = s => [...document.querySelectorAll(s)], w = ms => new Promise(r => setTimeout(r, ms)), nz = s => String(s || '').trim().toLowerCase().replace(/[^\p{L}\p{N}' ]/gu, '');
  let c = 0;
  for (let n = 0; n < 220 && !q('.lsn-end'); n++) {
    const it = App._lsn && App._lsn.sess && App._lsn.sess.cur;
    if (!it) { if (App._lsn && App._lsn.sess && App._lsn.sess.done && q('#lsnNext')) q('#lsnNext').click(); await w(300); continue; }
    if (q('#lsnGo')) { q('#lsnGo').click(); await w(300); continue; }
    if (q('#lsnNext') && q('#lsnFoot') && !q('#lsnFoot').hidden) { q('#lsnNext').click(); await w(250); continue; }
    const wrong = wrongEvery && (c++ % wrongEvery === 1);
    if (q('.lsn-opts .lsn-opt')) { const os = qa('.lsn-opts .lsn-opt'), o = wrong ? os.find(b => b.dataset.o !== String(it.answer)) : os.find(b => b.dataset.o === String(it.answer)); (o || os[0]).click(); }
    else if (q('#lsnBank')) { const used = new Set(), ws = String(it.answer).split(/\s+/); if (wrong) ws.reverse(); for (const x of ws) { const b = qa('#lsnBank .lsn-tile').find(t => !used.has(t) && nz(t.textContent) === nz(x)); if (b) { used.add(b); b.click(); await w(40); } } }
    else if (q('#lsnIn')) { q('#lsnIn').value = wrong ? 'zzz' : it.answer; q('#lsnIn').dispatchEvent(new Event('input', { bubbles: true })); }
    else if (q('.lsn-match')) { for (const a of qa('.lsn-match [data-s="w"]')) { a.click(); const b = q(`.lsn-match [data-s="m"][data-m="${a.dataset.m}"]`); if (b) b.click(); await w(60); } }
    else if (q('#lsnNoS')) { q('#lsnNoS').click(); await w(300); continue; }
    await w(150); if (q('#lsnCheck') && !q('#lsnCheck').disabled) q('#lsnCheck').click(); await w(200);
  }
  return !!q('.lsn-end');
};

// Mọi số đo trên màn kết (chạy trong trang)
const MEASURE = () => {
  const q = s => document.querySelector(s), r = el => { const b = el.getBoundingClientRect(); return { l: b.left, t: b.top, r: b.right, b: b.bottom, w: b.width, h: b.height, cx: b.left + b.width / 2 }; };
  const root = q('.v2-lesson-complete'), tiles = q('.lsn-tiles'), sub = q('.lsn-sub'), img = q('#lsnTch img') || q('#lsnTch'), hdr = root && root.querySelector('header'), again = q('#lsnAgain'), rev = q('#lsnRev'), x2 = q('#lsnX2');
  const icons = el => el ? [...el.querySelectorAll('.material-symbols-outlined')].map(i => i.textContent.trim()) : [];
  const cs = el => getComputedStyle(el), s = App._lsn && App._lsn.sess, picks = (App._lsn && App._lsn.picks) || [];
  return {
    text: root ? root.innerText : '', chip: (q('#lsnX2').nextElementSibling || {}).innerText || '',
    tiles: [...tiles.children].map(c => ({ ...r(c), txt: c.innerText.replace(/\s+/g, ' ').trim(), over: c.scrollWidth > c.clientWidth + 1 })),
    legend: q('.lsn-legend') ? [...q('.lsn-legend').children].map(c => ({ txt: c.innerText.replace(/\s+/g, ' ').trim(), hidden: c.hidden || c.offsetParent === null })) : null,
    rings: [...document.querySelectorAll('.v2-lesson-complete circle[stroke-dashoffset]')].map(c => +c.getAttribute('stroke-dashoffset')),
    tiles_r: r(tiles), sub: r(sub), tch: r(img), hdr: r(hdr), x2: r(x2), sy: scrollY, sw: document.documentElement.scrollWidth, iw: innerWidth,
    sub_txt: sub.innerText.replace(/\s+/g, ' ').trim(), dir: document.documentElement.dir || cs(document.body).direction,
    again: { txt: again.innerText.replace(/\s+/g, ' ').trim(), icons: icons(again), focus: document.activeElement === again, outline: cs(again).outlineStyle, ow: cs(again).outlineWidth, ptr: root.classList.contains('lsn-ptr') },
    rev: { txt: rev.innerText.replace(/\s+/g, ' ').trim(), icons: icons(rev), href: rev.getAttribute('href') },
    s: { acc: s.accuracy, best: s.best, ok1: s.ok1, wrongN: s.wrong.size, weak: [...s.wrong.keys()].filter(k => k[0] !== '#'), picks: picks.map(p => p.card.word.toLowerCase()) },
    subIcons: icons(sub), cls: window.__cls, path: localStorage.getItem('lk.lsn.path.demo'), icon_ai: icons(root).includes('auto_awesome'),
  };
};

const CASES = [ // [tên, khung nhìn, giao diện, ngôn ngữ, sai mỗi n câu (0 = đúng hết), dùng bàn phím]
  ['m375-sang-vi', { width: 375, height: 812 }, 'light', 'vi', 0, false],
  ['m375-toi-vi', { width: 375, height: 812 }, 'dark', 'vi', 0, false],
  ['m375-sang-vi-sai', { width: 375, height: 812 }, 'light', 'vi', 2, false],
  ['m375-toi-en-sai', { width: 375, height: 812 }, 'dark', 'en', 3, false],
  ['m375-sang-ar', { width: 375, height: 812 }, 'light', 'ar', 0, false],
  ['m320-sang-de-sai', { width: 320, height: 640 }, 'light', 'de', 2, false],
  ['d1280-sang-vi', { width: 1280, height: 800 }, 'light', 'vi', 0, false],
  ['d1280-toi-en', { width: 1280, height: 800 }, 'dark', 'en', 0, false],
  ['m375-sang-vi-banphim', { width: 375, height: 812 }, 'light', 'vi', 0, true],
];

const browser = await chromium.launch();
for (const [name, vp, scheme, lang, wrongEvery, kbd] of CASES) {
  const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 1, colorScheme: scheme, serviceWorkers: 'block' }); await serve(ctx, ROOT);
  await ctx.addInitScript(() => { window.__cls = 0; window.__armed = false; // CLS chỉ tính từ lúc màn kết hiện
    try { new PerformanceObserver(l => { if (window.__armed) for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: 'layout-shift', buffered: false }); } catch (e) { /* trình duyệt không có */ }
    new MutationObserver(() => { if (document.querySelector('.lsn-end')) window.__armed = true; }).observe(document, { childList: true, subtree: true }); });
  const page = await ctx.newPage(), errs = []; page.on('pageerror', e => errs.push(e.message));
  const tag = name, url = h => `https://lk.test/app/?sandbox=1&hl=${lang}#/${h}`;
  await page.goto(url('home'), { waitUntil: 'load' }); await page.waitForFunction(() => window.App && App.state && App.saveSettings && window.Core, null, { timeout: 30000 }); await page.evaluate(SEED);
  await page.goto(url('lesson/go?demo=1'), { waitUntil: 'load' }); await page.reload({ waitUntil: 'load' });
  await page.waitForFunction(() => App._lsn && App._lsn.sess && App._lsn.sess.cur, null, { timeout: 30000 }).catch(() => {});
  if (kbd) await page.keyboard.press('Shift'); else await page.mouse.click(2, 2); // thiết bị nhập gần nhất: chuột/chạm hay bàn phím
  const pathBefore = await page.evaluate(() => localStorage.getItem('lk.lsn.path.demo'));
  const done = await page.evaluate(PLAY, wrongEvery); ok(done, `${tag}: lái bài thử tới màn kết`);
  if (!done) { await page.screenshot({ path: path.join(OUT, `fail-${name}.png`) }); await ctx.close(); continue; }
  await page.waitForSelector('#lsnTch img', { timeout: 8000 }).catch(() => {}); await page.waitForTimeout(1800); // Ama + hiệu ứng vào xong
  const m = await page.evaluate(MEASURE); await page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: true });
  const S = m.s, perfect = !S.weak.length, tx = m.tiles.map(t => t.txt), num = (t, re) => { const x = t.match(re); return x ? +x[1] : NaN; };

  // 1 · chip = chặng + số bài thật, KHÔNG phải chip kỳ thi (hạt giống: IELTS)
  ok(/\d+\s*\/\s*\d+/.test(m.chip) && !/^\s*IELTS\s*$/i.test(m.chip) && m.chip.length > 5, `${tag}: chip đúng chặng/bài (“${m.chip.replace(/\s+/g, ' ')}”), không phải nhãn kỳ thi`);
  // 2 · không ký hiệu phút ′
  ok(!/[′″]/.test(m.text) && !/\d\s*['’]/.test(m.text), `${tag}: không còn ký hiệu phút ′ / dấu phẩy trên`);
  // 3 · focus: nút chính nhận focus; chuột/chạm → KHÔNG vòng; bàn phím → vòng được giữ
  ok(m.again.focus, `${tag}: nút chính ("${m.again.txt}") nhận focus khi vào màn`);
  if (!kbd) ok((m.again.outline === 'none' || m.again.ow === '0px') && m.again.ptr, `${tag}: không vòng focus khi tới bằng chuột/chạm (outline ${m.again.outline} ${m.again.ow})`);
  else ok(!m.again.ptr, `${tag}: tới bằng bàn phím → giữ vòng focus cho người dùng bàn phím`);
  // 4 · icon đúng nghĩa
  ok(!m.rev.icons.includes('replay') && m.rev.icons.includes(perfect ? 'map' : 'edit_note'), `${tag}: nút phụ icon đúng nghĩa (${m.rev.icons.join(',')}; ${perfect ? 'Bản đồ = map' : 'Sổ lỗi sai = edit_note'})`);
  ok(m.again.icons.includes('arrow_forward') && !m.icon_ai, `${tag}: nút chính mũi tên tiến; không ô icon ✨ thừa`);
  ok(m.rev.href === (perfect ? '#/lesson?demo=1' : '#/mistakes'), `${tag}: nút phụ dẫn đúng nơi (${m.rev.href})`);
  // 5 · Ama: căn giữa cột, không dính tiles, nhìn thấy ≥ 60 % (thẻ chỉ che chân)
  const dx = m.tch.cx - (m.tiles_r.l + m.tiles_r.w / 2); ok(Math.abs(dx) <= 2, `${tag}: Ama căn giữa cột (lệch ${dx.toFixed(1)} px)`);
  const vis = (Math.min(m.tch.b, m.sub.t) - m.tch.t) / m.tch.h; ok(vis >= 0.6 && vis <= 1.001, `${tag}: Ama thấy ${Math.round(vis * 100)} % thân (≥ 60 %)`);
  ok(m.tch.t >= m.tiles_r.b - 1, `${tag}: Ama không đè lên ô số liệu`);
  // 6 · ✕ không bị cắt mép trên; trang bắt đầu ở đỉnh
  ok(m.sy === 0 && m.x2.t >= 0 && m.x2.t >= m.hdr.b - 1, `${tag}: nút ✕ không bị cắt (cuộn ${m.sy}, ✕ top ${m.x2.t.toFixed(0)}, thanh trên đáy ${m.hdr.b.toFixed(0)})`);
  // 7 · 3 ô cùng hàng, chữ không tràn, không cuộn ngang
  ok(m.tiles.length === 3 && m.tiles.every(t => Math.abs(t.t - m.tiles[0].t) <= 1 && !t.over), `${tag}: 3 ô số liệu cùng hàng, không tràn (${tx.join(' | ')})`);
  ok(m.sw <= m.iw, `${tag}: không cuộn ngang (${m.sw} ≤ ${m.iw})`);
  // 8 · nhãn ô
  if (lang === 'vi') ok(!/tổng/i.test(tx[0]) && /nhận/i.test(tx[0]) && /combo/i.test(tx[1]) && /ngày/i.test(tx[2]), `${tag}: nhãn: XP nhận được · COMBO · Chuỗi ngày (“${tx.join(' | ')}”)`);
  // 9 · SỐ LIỆU NHẤT QUÁN giữa ô, vòng, thẻ và phiên thật
  const xpExp = 10 + S.ok1 * 2 + (S.wrongN ? 0 : 5); // thưởng +5 chỉ khi KHÔNG sai câu nào (kể cả câu ghép cặp/truyện)
  ok(num(tx[0], /\+(\d+)/) === xpExp, `${tag}: XP trên ô = XP phiên (${num(tx[0], /\+(\d+)/)} = 10 + ${S.ok1}×2${S.wrongN ? '' : ' + 5'})`);
  ok(num(tx[1], /(\d+)/) === S.best, `${tag}: COMBO trên ô = COMBO cao nhất phiên (${S.best})`);
  const lg = (m.legend || []).filter(x => !x.hidden); ok(lg.length >= 1 && num(lg[0].txt, /(\d+)\s*%/) === S.acc, `${tag}: chú giải vòng ngoài = độ chính xác phiên (${S.acc}%)`);
  ok(m.rings.length === 2 && Math.abs(m.rings[0] - Math.round(490 * (1 - Math.min(100, S.acc) / 100))) <= 1, `${tag}: vòng ngoài khớp ${S.acc}% (offset ${m.rings[0]})`);
  const got = S.picks.filter(p => !S.weak.includes(p)).length;
  if (S.picks.length) {
    ok(lg.length === 2 && lg[1].txt.includes(`${got}/${S.picks.length}`), `${tag}: chú giải vòng trong = từ nhớ ngay ${got}/${S.picks.length}`);
    ok(Math.abs(m.rings[1] - Math.round(414 * (1 - got / S.picks.length))) <= 1, `${tag}: vòng trong khớp ${got}/${S.picks.length} (offset ${m.rings[1]})`);
  }
  const low = m.sub_txt.toLowerCase();
  ok(S.picks.every(p => low.includes(p)), `${tag}: thẻ liệt kê đủ ${S.picks.length} từ đã học`);
  ok(perfect ? m.subIcons.join() === 'timer' : m.subIcons.includes('edit_note') && S.weak.every(w => low.includes(w)), `${tag}: ${perfect ? 'không sai câu nào → không dòng từ cần ôn' : `thẻ liệt kê đủ ${S.weak.length} từ cần ôn: ${S.weak.join(', ')}`}`);
  // 10 · RTL
  if (lang === 'ar') { ok(m.dir === 'rtl', `${tag}: RTL bật (dir=${m.dir})`); ok(m.tiles[0].l > m.tiles[2].l, `${tag}: RTL: ô XP nằm bên phải ô chuỗi`); }
  // 11 · CLS từ lúc màn kết hiện
  ok((m.cls || 0) <= 0.02, `${tag}: CLS từ lúc hiện màn kết ${(m.cls || 0).toFixed(4)} ≤ 0.02`);
  // 12 · bài đã được đếm; nút chính dẫn sang bài KẾ TIẾP
  ok(+m.path === (+pathBefore || 0) + 1, `${tag}: tiến độ lộ trình +1 (${pathBefore || 0} → ${m.path})`);
  if (name === 'm375-sang-vi') {
    await page.click('#lsnAgain'); await page.waitForFunction(() => !document.querySelector('.lsn-end') && App._lsn && App._lsn.sess && App._lsn.sess.cur, null, { timeout: 20000 }).catch(() => {});
    const L1 = await page.evaluate(() => ({ end: !!document.querySelector('.lsn-end'), has: !!(App._lsn && App._lsn.sess.cur), hash: location.hash }));
    ok(!L1.end && L1.has && /#\/lesson\/go/.test(L1.hash), `${tag}: "Bài tiếp theo" → vào bài mới (${L1.hash})`);
  }
  ok(errs.length === 0, `${tag}: không lỗi JS (${errs.slice(0, 2).join(' · ')})`);
  await ctx.close();
}
await browser.close();
console.log(`\n${total - fails}/${total} đạt`); if (fails) { console.error(`✗ ${fails} kiểm tra hỏng`); process.exit(1); }
