// ✅ QC CUỐI 1-1 cho 13 màn Stitch v2.1 (cổng trước khi gửi chủ bộ ảnh & gộp #212). Chạy SAU stitch-diff.mjs (cùng job CI) và dùng lại kết quả của nó:
//   từ stitch-diff (scores.json): SSIM/nhịp hàng sáng+tối so ngưỡng, tương phản pixel 360/390/412/1366, chạm ≥44, tràn/cắt chữ, axe WCAG 2.2 AA, chữ giữ chỗ/lẫn tiếng Việt
//   tự chạy thêm: ar RTL (sáng+tối, tràn/cắt/lẫn ngôn ngữ/lỗi JS) · giảm chuyển động (không hoạt ảnh dài/lặp) · lỗi JS từng màn ·
//   giáo viên: đúng tư thế theo trạng thái, KHÔNG "dán đè" (vòng tròn/hào quang/khung/mặt nạ; thân mờ hay đường cắt LỘ RA – nửa người khuất gọn sau mặt đục của Stitch thì đạt), bóng chân hoặc đứng sau mặt, tỉ lệ ·
//   giọng nghe == giáo viên hiện (Chars.voice) · khớp miệng (vòng nói bật/tắt theo câu) · âm hiệu ứng đúng sự kiện (đúng/sai/xong bài).
// Ra: out/final-qc/sheet-<màn>.jpg (Stitch | app sáng/tối 390 · 360 · 1366 · ar) + SUMMARY.md + report.json. Đỏ khi còn 1 lỗi.
// Dùng: node scripts/test/final-qc.mjs [web] [out/stitch-diff] [out/final-qc]   (ảnh mẫu: STITCH_V2_PNG=out/stitch-v2/png)
import fs from 'node:fs'; import path from 'node:path'; import { execFileSync } from 'node:child_process';
import { chromium } from 'playwright';
import { SCREENS, DRIVE, DRIVEN, SEED, SEED_STREAK, SEED_LEAGUE, FINAL, serve } from './stitch-screens.mjs';
const [ROOT = 'web', SD = 'out/stitch-diff', OUT = 'out/final-qc'] = process.argv.slice(2); fs.mkdirSync(OUT, { recursive: true });
const REF = process.env.STITCH_V2_PNG || 'out/stitch-v2/png', LIM = JSON.parse(fs.readFileSync('scripts/test/stitch-diff.json', 'utf8'));
const S = fs.existsSync(path.join(SD, 'scores.json')) ? JSON.parse(fs.readFileSync(path.join(SD, 'scores.json'), 'utf8')) : null;
const R = {}; // stitch → { checks: {tên: {ok, note}} }
const put = (s, name, ok, note = '') => { const c = (R[s] = R[s] || { checks: {} }).checks; if (c[name] && !c[name].ok) return; c[name] = { ok: !!ok, note: String(note).slice(0, 300) }; };

// ---------- A) từ stitch-diff ----------
for (const f of FINAL) {
  const k = f.k; if (!k) { put(f.stitch, 'port', false, 'chưa port / chưa có trong SCREENS (scripts/test/stitch-screens.mjs)'); continue; }
  put(f.stitch, 'port', true);
  if (!S) { put(f.stitch, 'stitch-diff', false, `thiếu ${SD}/scores.json – chạy stitch-diff.mjs trước`); continue; }
  for (const sc of ['light', 'dark']) { const v = S.res[`${k}-${sc}`], l = LIM[`${k}-${sc}`] || {};
    if (!v) put(f.stitch, 'ssim', false, `${sc}: không có điểm (thiếu mẫu Stitch?)`);
    else put(f.stitch, 'ssim', (l.ssim == null || v.ssim >= l.ssim) && (l.rows == null || v.rows >= l.rows), `${sc} ssim ${v.ssim}/${l.ssim ?? '–'} · nhịp ${v.rows}/${l.rows ?? '–'}`); }
  const cm = Object.entries(S.contrast || {}).filter(([t]) => t.startsWith(k + '-')).flatMap(([t, v]) => v.miss.map(m => `${t.slice(k.length + 1)} ${m.t} ${m.cr}/${m.need}`));
  put(f.stitch, 'contrast', !cm.length, cm.slice(0, 4).join(' · '));
  const q = Object.entries(S.qc || {}).filter(([t]) => t.startsWith(k + '-'));
  const tap = q.filter(([, v]) => v.tapN).map(([t, v]) => `${t.slice(k.length + 1)}: ${v.tap.slice(0, 2).join(',')}`);
  put(f.stitch, 'tap44', !tap.length, tap.join(' · '));
  const ov = q.filter(([, v]) => v.hscroll || (v.over || []).length || (v.clip || []).length).map(([t, v]) => `${t.slice(k.length + 1)}: ${[...(v.over || []), ...(v.clip || [])].slice(0, 2).join(',')}`);
  put(f.stitch, 'overlap/clip', !ov.length, ov.join(' · '));
  const ax = Object.entries(S.a11y || {}).filter(([t]) => t.startsWith(k + '-') && !/-(390|360|412|1366)$/.test(t)).flatMap(([t, v]) => (v.violations || []).filter(x => x.impact === 'serious' || x.impact === 'critical').map(x => `${t.slice(k.length + 1)} ${x.id}×${x.n}`));
  put(f.stitch, 'axe', !ax.length, ax.join(' · '));
  const ph = Object.entries(S.ph || {}).filter(([t]) => t === `${k}-light` || t === `${k}-dark`).flatMap(([, v]) => v);
  put(f.stitch, 'mixed-lang', !ph.length, ph.join(' · '));
}

// ---------- B) chạy thêm ----------
// Ghi lại trước khi app chạy: giọng (KVoice.lineKey = mp3 sinh sẵn theo giọng), giọng máy (UI.tts), âm hiệu ứng (Sfx.*), vòng nói của giáo viên (.tch.speaking)
const HOOK = () => {
  const L = window.__qc = { voice: [], tts: [], sfx: [], talk: [], t0: performance.now() }, now = () => Math.round(performance.now() - L.t0);
  // bọc bằng Proxy lúc app gán window.X: mọi lần gọi (kể cả sau Object.assign của Feel) đều đi qua bộ ghi
  const spy = (name, keys, rec) => { let v; Object.defineProperty(window, name, { configurable: true, get: () => v, set: x => { v = x && typeof x === 'object' ? new Proxy(x, { get: (t, k) => { const f = t[k]; return keys.includes(k) && typeof f === 'function' ? function () { rec(k, arguments); return f.apply(t, arguments); } : f; } }) : x; } }); };
  spy('KVoice', ['lineKey'], (k, a) => L.voice.push({ voice: a[0], text: String(a[1]).slice(0, 40), t: now() }));
  spy('Sfx', ['correct', 'wrong', 'win', 'combo'], k => L.sfx.push({ k, t: now() }));
  spy('UI', ['tts'], (k, a) => L.tts.push({ text: String(a[0]).slice(0, 40), t: now() }));
  new MutationObserver(ms => { for (const m of ms) if (m.target.classList && m.target.classList.contains('tch')) L.talk.push({ on: m.target.classList.contains('speaking'), t: now() }); })
    .observe(document, { attributes: true, attributeFilter: ['class'], subtree: true });
};
// Giáo viên trên màn: ảnh/clip Chars (teach/<who>/…) + kiểm "dán đè" + toàn thân + bóng chân. Chạy trong trang.
const TEACH = async () => {
  const out = [], vh = innerHeight;
  const els = [...document.querySelectorAll('#view img[src*="teach/"], #view canvas.tch-cv, #view video[src*="teach/"]')].filter(e => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width > 8 && r.height > 8 && cs.visibility !== 'hidden' && +cs.opacity > 0.05; });
  for (const e of els) {
    // clip sống (canvas/video trong .tch): tư thế = nói/nghe theo vòng đang chạy; khung hình đo trên ảnh poster cùng khung của clip
    const tch = e.closest('.tch'), live = e.tagName !== 'IMG' || !!(tch && /poster/.test(e.getAttribute('src') || '')), // poster của .tch = giáo viên sống khi máy không phát được clip (Chromium CI không có H.264) → tư thế theo vòng nói/nghe
      pimg = live ? tch && tch.querySelector('img[src*="teach/"]') : e, src = (pimg && pimg.getAttribute('src')) || e.getAttribute('src') || '';
    if (e.tagName === 'IMG' && tch && tch.querySelector('canvas.tch-cv')) continue; // poster dưới clip đang chạy: đã tính qua canvas
    const m = src.match(/teach\/(ama|carlos)\/(?:still-)?([a-z]+)/) || [], who = m[1] || '?', kind = live ? (tch && tch.classList.contains('speaking') ? 'talk' : 'listen') : /avatar/.test(src) ? 'avatar' : /poster/.test(src) ? 'poster' : (m[2] || '?');
    e.scrollIntoView({ block: 'center' }); await new Promise(res => setTimeout(res, 60));
    const r = e.getBoundingClientRect(), bad = [], cut = []; let visBottom = r.bottom; // cut = nửa người/mờ/cắt: ĐẠT nếu khuất hẳn sau 1 mặt đục của Stitch (thẻ/bàn/bảng che đường hông, kiểu Duolingo)
    // vòng tròn / hào quang / khung: chính nó hoặc 3 tổ tiên gần bo tròn ≥ 40 % cạnh ngắn có nền/viền/bóng, hoặc cắt tràn
    for (let q = e, i = 0; q && i < 4 && q.id !== 'view'; q = q.parentElement, i++) { const cs = getComputedStyle(q), qr = q.getBoundingClientRect(), br = parseFloat(cs.borderTopLeftRadius) || 0;
      if (br >= 0.4 * Math.min(qr.width, qr.height) && (cs.overflow !== 'visible' || cs.backgroundColor !== 'rgba(0, 0, 0, 0)' || cs.backgroundImage !== 'none' || cs.borderTopWidth !== '0px' || cs.boxShadow !== 'none')) bad.push('vòng tròn/hào quang');
      if (cs.maskImage && cs.maskImage !== 'none' || cs.webkitMaskImage && cs.webkitMaskImage !== 'none' || cs.clipPath && cs.clipPath !== 'none') bad.push('mặt nạ/clip-path');
      if (i && cs.overflow !== 'visible') { if (r.top < qr.top - 1 || r.left < qr.left - 1 || r.right > qr.right + 1) bad.push('đường cắt (khung cắt đầu/tay)'); if (r.bottom > qr.bottom + 1) { cut.push('đường cắt ngang thân'); visBottom = Math.min(visBottom, qr.bottom); } } }
    if (kind === 'avatar') bad.push('ảnh avatar (chỉ đầu – không phải người đứng)'); if (kind === 'poster') cut.push('ảnh nửa người');
    // toàn thân: ảnh gốc không chạm mép dưới & không mờ dần ở đáy (đo kênh alpha)
    let body = null;
    const im = pimg; if (im) { try { if (!im.complete) await new Promise(res => { im.onload = im.onerror = res; setTimeout(res, 3000); });
      const c = document.createElement('canvas'), W = c.width = Math.min(240, im.naturalWidth), H = c.height = Math.round(W * im.naturalHeight / im.naturalWidth), x = c.getContext('2d'); x.drawImage(im, 0, 0, W, H);
      const a = x.getImageData(0, 0, W, H).data, row = y => { let s = 0, n = 0; for (let i = 0; i < W; i++) { const v = a[(y * W + i) * 4 + 3]; if (v > 8) { s += v; n++; } } return { n, mean: n ? s / n / 255 : 0 }; };
      let top = 0, bot = H - 1; while (top < H && row(top).n < 2) top++; while (bot > top && row(bot).n < 2) bot--;
      const fig = bot - top + 1, edge = row(H - 1).n > W * 0.04, tail = Array.from({ length: Math.max(3, Math.round(fig * 0.12)) }, (_, j) => row(bot - j).mean), soft = tail.filter(v => v > 0.12 && v < 0.8).length / tail.length;
      body = { edge, soft: +soft.toFixed(2), fig: +(fig / H).toFixed(2) };
      if (edge) cut.push('chạm mép dưới ảnh (nửa người)'); if (soft > 0.5) cut.push('thân mờ dần ở đáy');
      body.tail = (bot - Math.round(fig * 0.15)) / H; } catch (err) { body = { err: String(err).slice(0, 60) }; } }
    // khuất sau mặt đục? lưới điểm trong dải đáy hình (15 % dưới của người → đáy thấy được): điểm trên cùng phải là phần tử KHÁC, nền đục (alpha ≥ .95)
    const opaque = h => { for (let q = h, i = 0; q && i < 4 && !q.contains(e); q = q.parentElement, i++) { const c = getComputedStyle(q).backgroundColor.match(/[\d.]+/g) || []; if (c.length >= 3 && (c[3] == null ? 1 : +c[3]) >= 0.95) return true; } return false; };
    let occluded = false; if (cut.length) { const y0 = r.top + (body && body.tail != null ? body.tail : 0.8) * r.height, y1 = visBottom - 1, pts = [];
      for (let yi = 0; yi < 4; yi++) for (let xi = 0; xi < 5; xi++) pts.push([r.left + r.width * (0.3 + xi * 0.1), y0 + (y1 - y0) * (yi / 3)]);
      occluded = y1 > y0 && pts.every(([x, y]) => { if (y < 0 || y >= innerHeight) return false; const h = document.elementFromPoint(x, y); return h && h !== e && !e.contains(h) && !(tch && tch.contains(h)) && opaque(h); }); }
    if (cut.length && !occluded) bad.push(...cut.map(x => x + ' – lộ ra, không khuất sau mặt Stitch'));
    // bóng chân: phần tử/::before/::after có radial-gradient hoặc blur nằm sát đáy hình (±28 px), chồng giữa hình
    const near = [...document.querySelectorAll('#view *')].some(q => { if (q === e) return false; const qr = q.getBoundingClientRect(), cx = r.left + r.width / 2;
      const hit = qr.width > 6 && qr.height > 1 && qr.height < 40 && Math.abs(qr.top + qr.height / 2 - r.bottom) < 28 && qr.left < cx && qr.right > cx;
      const sh = el => { const cs = getComputedStyle(el); return /radial-gradient/.test(cs.backgroundImage) || /blur/.test(cs.filter) || (cs.boxShadow !== 'none' && parseFloat(cs.borderTopLeftRadius) > 4); };
      return hit && sh(q); }) || ['::before', '::after'].some(p => { const pe = e.parentElement && getComputedStyle(e.parentElement, p); return pe && pe.content !== 'none' && /radial-gradient/.test(pe.backgroundImage); });
    if (!near && !occluded) bad.push('không có bóng chân / không đứng sau mặt nào (trôi nổi)');
    const sc = r.height / vh; if (sc < 0.12) bad.push(`quá nhỏ (${Math.round(sc * 100)} % cao màn)`); if (sc > 0.8) bad.push(`quá to (${Math.round(sc * 100)} %)`);
    out.push({ who, pose: kind, h: Math.round(r.height), bad: [...new Set(bad)], body, occluded });
  }
  return out;
};
const RM = () => (document.getAnimations ? document.getAnimations() : []).filter(a => { const t = a.effect && a.effect.getTiming ? a.effect.getTiming() : {}; const el = a.effect && a.effect.target;
  return a.playState === 'running' && el && el.closest && el.closest('#view') && (t.iterations === Infinity || (+t.duration || 0) > 200); }).map(a => (a.animationName || a.transitionProperty || 'anim') + '@' + ((a.effect.target.className || a.effect.target.tagName) + '').slice(0, 30));
const LAYOUT = () => { const W = innerWidth, over = [], clip = [];
  for (const e of document.querySelectorAll('#view *')) { const r = e.getBoundingClientRect(), cs = getComputedStyle(e); if (!r.width || cs.visibility === 'hidden' || e.closest('.sr-only')) continue;
    if ((r.right > W + 1 || r.left < -1) && !e.closest('[class*="overflow-hidden"],[class*="overflow-x"]')) over.push(String(e.className).slice(0, 30));
    if (!e.children.length && e.textContent.trim() && cs.textOverflow !== 'ellipsis' && e.scrollWidth > e.clientWidth + 2 && cs.overflow !== 'visible') clip.push(e.textContent.trim().slice(0, 20)); }
  const vi = (document.getElementById('view').innerText.match(/[^\s]*[ăâđêôơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ][^\s]*/gi) || []);
  return { dir: document.documentElement.dir, hscroll: document.documentElement.scrollWidth > W + 1, over: over.slice(0, 4), clip: clip.slice(0, 4), vi: [...new Set(vi)].slice(0, 5) }; };

const browser = await chromium.launch(); const url = (h, hl) => `https://lk.test/app/?sandbox=1&hl=${hl}#/${h}`;
async function visit(page, k, errs) {
  await page.goto(url(SCREENS[k], page.__hl), { waitUntil: 'load' }); await page.reload({ waitUntil: 'load' }); await page.waitForTimeout(1600);
  if (k === 'streak') { await page.evaluate(SEED_STREAK); await page.evaluate(() => App.route()); await page.waitForTimeout(600); }
  if (k === 'leagues') { await page.evaluate(SEED_LEAGUE); await page.evaluate(() => App.route()); await page.waitForTimeout(900); }
  if (DRIVEN.test(k)) await page.evaluate(DRIVE, k).catch(e => errs.push('drive ' + e.message));
  await page.addStyleTag({ content: '#toast{display:none!important}' }).catch(() => {}); // như stitch-diff: thông báo sandbox không che ảnh/đo
  await page.waitForTimeout(400);
}
async function session(o) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, colorScheme: o.scheme, reducedMotion: o.rm ? 'reduce' : 'no-preference', serviceWorkers: 'block' });
  await serve(ctx, ROOT); await ctx.addInitScript(HOOK);
  const page = await ctx.newPage(); page.__hl = o.hl; const errs = []; page.on('pageerror', e => errs.push(e.message.slice(0, 120)));
  await page.goto(url('home', o.hl), { waitUntil: 'load' }); await page.waitForTimeout(2000); await page.evaluate(SEED).catch(e => errs.push('seed ' + e.message));
  return { ctx, page, errs };
}
for (const f of FINAL.filter(x => x.k)) {
  const k = f.k;
  // RTL tiếng Ả Rập, sáng + tối
  for (const scheme of ['light', 'dark']) { const { ctx, page, errs } = await session({ scheme, hl: 'ar' });
    await visit(page, k, errs); const L = await page.evaluate(LAYOUT).catch(e => ({ err: e.message }));
    put(f.stitch, 'rtl-ar', L.dir === 'rtl' && !L.hscroll && !(L.over || []).length && !(L.clip || []).length, `${scheme}: dir=${L.dir}${L.hscroll ? ' cuộn ngang' : ''} ${[...(L.over || []), ...(L.clip || [])].join(',')}`.trim());
    put(f.stitch, 'mixed-lang', !(L.vi || []).length, (L.vi || []).length ? `ar ${scheme}: ${L.vi.join(' ')}` : '');
    put(f.stitch, 'js-errors', !errs.length, errs.slice(0, 2).join(' · '));
    if (scheme === 'light') { const h = await page.evaluate(() => Math.min(2600, document.documentElement.scrollHeight)); await page.setViewportSize({ width: 390, height: Math.max(844, h) }); await page.waitForTimeout(200); await page.screenshot({ path: path.join(OUT, `ar-${f.stitch}.png`) }); }
    await ctx.close(); }
  // Giảm chuyển động + giáo viên + giọng + khớp miệng + âm hiệu ứng (tiếng Anh, sáng)
  for (const rm of [true, false]) { const { ctx, page, errs } = await session({ scheme: 'light', hl: 'en', rm });
    await visit(page, k, errs); await page.waitForTimeout(rm ? 900 : 2600);
    if (f.ready) put(f.stitch, 'port', !!(await page.$(f.ready)), `chưa tới trạng thái ${f.ready}`);
    if (rm) { const a = await page.evaluate(RM).catch(() => []); put(f.stitch, 'reduced-motion', !a.length, a.slice(0, 3).join(' · ')); }
    else {
      if (f.speaks) await page.waitForFunction(() => { const t = (window.__qc || {}).talk || []; return t.some(x => x.on) && !document.querySelector('.tch.speaking'); }, null, { timeout: 8000 }).catch(() => {}); // câu đầu nói xong (≤ 8 s)
      const T = await page.evaluate(TEACH).catch(e => [{ bad: ['lỗi đo ' + e.message] }]), log = await page.evaluate(() => window.__qc).catch(() => ({ voice: [], tts: [], sfx: [], talk: [] }));
      const want = f.teacher;
      if (!want) put(f.stitch, 'teacher', true, T.length ? `${T.length} hình (màn không bắt buộc)` : '');
      else {
        put(f.stitch, 'teacher', T.length > 0 && (!f.duo || new Set(T.map(x => x.who)).size >= 2), T.length ? (f.duo ? `${[...new Set(T.map(x => x.who))].join('+')}` : `${T[0].who}/${T[0].pose}`) : 'không thấy giáo viên (Chars) trên màn · ' + await page.evaluate(() => [...document.querySelectorAll('#view [id^=lsnTch], #view .tch')].map(e => { const r = e.getBoundingClientRect(); return `${e.id || e.className}@${Math.round(r.top)},${Math.round(r.width)}x${Math.round(r.height)} ${getComputedStyle(e).display}`; }).concat([...document.querySelectorAll('#view img[src*="teach/"]')].map(i => `${(i.getAttribute('src') || '').slice(-22)} ${Math.round(i.getBoundingClientRect().height)}px ${getComputedStyle(i).visibility}`)).join(' | ') || 'không có #lsnTch').catch(() => ''));
        const wrong = T.filter(x => x.pose !== '?' && !want.includes(x.pose)); put(f.stitch, 'teacher-pose', T.length && !wrong.length, wrong.map(x => `${x.who}/${x.pose} ≠ ${want.join('|')}`).join(' · ') || (T[0] ? `${T[0].who}/${T[0].pose}` : ''));
        const pasted = T.filter(x => x.bad.length); put(f.stitch, 'not-pasted-on', T.length && !pasted.length, pasted.map(x => `${x.who}: ${x.bad.join(', ')}`).join(' · '));
        // giọng nghe == giáo viên đang hiện: mọi câu giáo viên nói phải dùng mp3 giọng registry của chính người đó; nói bằng giọng máy = sai
        const shown = [...new Set(T.map(x => x.who))].filter(w => w !== '?'), voices = await page.evaluate(ws => ws.map(w => window.Chars && Chars.voice ? Chars.voice(w) : null), shown);
        const used = [...new Set(log.voice.map(v => v.voice))], fall = new Set(log.voice.map(v => v.text)); log.tts = log.tts.filter(x => !fall.has(x.text)); // mp3 giọng giáo viên 404 trên CI → giọng máy dự phòng CÙNG câu = vẫn đúng đường giọng
        if (!log.voice.length && !log.tts.length) put(f.stitch, 'voice==teacher', !f.speaks, f.speaks ? 'giáo viên không nói câu nào trong 2,6 s (màn này phải nói)' : 'không nói (màn không bắt buộc)');
        else put(f.stitch, 'voice==teacher', log.voice.length > 0 && used.every(v => voices.includes(v)) && !log.tts.length, `hiện ${shown.join('+')} (${voices.join('/')}) · nghe ${used.join('/') || '–'}${log.tts.length ? ` · ${log.tts.length} câu giọng máy (không phải giọng giáo viên)` : ''}`);
        // khớp miệng: vòng nói bật trong ≤250 ms sau khi bắt đầu câu, và tắt lại sau đó
        if (log.voice.length || log.tts.length) { const s0 = (log.voice[0] || log.tts[0]).t, on = log.talk.find(x => x.on && x.t >= s0 - 50), off = on && log.talk.find(x => !x.on && x.t > on.t);
          put(f.stitch, 'lip-sync', on && on.t - s0 <= 250 && off, on ? `bật sau ${on.t - s0} ms${off ? `, tắt sau ${off.t - on.t} ms` : ', không tắt'}` : 'vòng nói không bật khi giáo viên nói'); }
      }
      if (f.sfx) { const got = log.sfx.map(x => x.k); put(f.stitch, 'sfx', f.sfx.every(x => got.includes(x)), `cần ${f.sfx.join(',') || '–'} · nghe ${got.join(',') || '–'}`); }
      put(f.stitch, 'js-errors', !errs.length, errs.slice(0, 2).join(' · '));
    }
    await ctx.close(); }
}
await browser.close();

// ---------- C) tờ từng màn (thu nhỏ để chủ duyệt): Stitch sáng | app sáng 390 | Stitch tối | app tối 390 | 360 sáng | 1366 sáng | ar sáng ----------
for (const f of FINAL) { const k = f.k, a = [], add = (lab, file, crop) => { if (file && fs.existsSync(file)) a.push('-label', lab, file + (crop || '')); else a.push('-label', lab + ' (thiếu)', 'xc:#ddd'); };
  add('Stitch – sáng', path.join(REF, `${f.stitch}-light.png`), '[390x1700+0+0]'); add('app 390 – sáng', k && path.join(SD, `app-${k}-light.png`), '[390x1700+0+0]');
  add('Stitch – tối', path.join(REF, `${f.stitch}-dark.png`), '[390x1700+0+0]'); add('app 390 – tối', k && path.join(SD, `app-${k}-dark.png`), '[390x1700+0+0]');
  add('app 360 – sáng', k && path.join(SD, `w360-${k}-light.png`), '[360x1700+0+0]'); add('app ar RTL', path.join(OUT, `ar-${f.stitch}.png`), '[390x1700+0+0]');
  try { execFileSync('montage', [...a, '-tile', '6x1', '-geometry', 'x1100+6+6', '-pointsize', '18', '-background', '#e9e9e9', '-quality', '72', path.join(OUT, `sheet-${f.stitch}.jpg`)]);
    const d = k && path.join(SD, `desk-${k}-light.png`); if (d && fs.existsSync(d)) execFileSync('convert', [d, '-resize', '1000x', '-quality', '70', path.join(OUT, `desk-${f.stitch}.jpg`)]);
    execFileSync('convert', [path.join(OUT, `sheet-${f.stitch}.jpg`), '-resize', '1400x1400>', '-quality', '68', path.join(OUT, `sm-sheet-${f.stitch}.jpg`)]); } catch (e) { console.log('montage bỏ qua:', e.message.split('\n')[0]); } }

// ---------- D) SUMMARY.md ----------
const COLS = ['port', 'ssim', 'contrast', 'tap44', 'overlap/clip', 'axe', 'js-errors', 'mixed-lang', 'rtl-ar', 'reduced-motion', 'teacher', 'teacher-pose', 'not-pasted-on', 'voice==teacher', 'lip-sync', 'sfx'];
const cell = c => (!c ? '–' : c.ok ? '✓' : '✗');
const pass = FINAL.filter(f => Object.values((R[f.stitch] || { checks: {} }).checks).every(c => c.ok));
const md = [`# QC cuối 1-1 – ${pass.length}/${FINAL.length} màn đạt`, '', `| màn | ${COLS.join(' | ')} |`, `|---|${COLS.map(() => '---').join('|')}|`,
  ...FINAL.map(f => `| ${f.stitch} | ${COLS.map(c => cell(R[f.stitch]?.checks[c])).join(' | ')} |`), '', '## Lỗi cần sửa',
  ...FINAL.flatMap(f => Object.entries(R[f.stitch]?.checks || {}).filter(([, c]) => !c.ok).map(([n, c]) => `- **${f.stitch}** · ${n}: ${c.note}`)), '',
  'Tờ từng màn: `sheet-<màn>.jpg` (bản nhỏ `sm-sheet-*`) · máy tính: `desk-<màn>.jpg`. Ngưỡng SSIM: scripts/test/stitch-diff.json (chỉ nâng).'].join('\n');
fs.writeFileSync(path.join(OUT, 'SUMMARY.md'), md + '\n'); fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(R, null, 1));
if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, md + '\n');
console.log(md.split('\n').slice(0, FINAL.length + 4).join('\n'));
if (pass.length < FINAL.length) { console.error(`✗ final-qc: ${FINAL.length - pass.length} màn chưa đạt (xem SUMMARY.md)`); process.exit(1); }
console.log('✓ final-qc: 13/13 màn đạt QC cuối 1-1');
