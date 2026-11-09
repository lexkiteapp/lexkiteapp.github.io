// 🧭 nav-sweep – mỗi màn học đi được từ đầu tới màn kết CHỈ bằng bàn phím, không ngõ cụt (docs/specs/learn-flow-nav.md). Chỉ chạy trên CI (qa-bot.yml).
// Mỗi bước: trả lời thử bằng phím (1 = phương án đầu, phím số đặt thẻ, gõ "a" vào ô trống; màn chưa có phím số → focus thẻ/phương án đầu + Space) rồi Enter (ExitGuard: Enter = nút chính Kiểm tra/Tiếp tục).
// Đo theo màn: có nút thoát · thanh tiến độ · Enter có đi tiếp · có Bỏ qua (nghe/nói) · tới màn kết · màn kết có bước tiếp theo · số bước.
// Cổng (chỉ siết): mọi thiếu sót phải nằm trong scripts/test/nav-sweep.known.json; thiếu sót MỚI → đỏ; mục known đã hết thiếu → đỏ (xoá khỏi known).
// Dùng: node scripts/test/nav-sweep.mjs [--root dist | --base URL] [--out out/nav-sweep] [--steps 40] [--write-known]
import { chromium, devices } from 'playwright';
import { noProd } from './lib/no-prod.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { serve } from '../quality/serve.mjs';
import { HUBS, FIXED } from './lib/learn-samples.mjs';
import { waitFn } from '../lib/pw-wait.mjs';

const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const ROOT = arg('root', 'dist'), OUT = path.resolve(arg('out', 'out/nav-sweep')), STEPS = +arg('steps', '40');
const KNOWN_F = new URL('./nav-sweep.known.json', import.meta.url);
fs.mkdirSync(OUT + '/shots', { recursive: true });
const ESSAY = 'Many people believe that cities should invest more in public transport, and I agree with this view. First, buses and trains reduce traffic and pollution, which improves health. Second, cheap transport helps students and workers reach school and jobs. However, the cost is high, so governments must plan carefully and share the budget fairly. In conclusion, the benefits are greater than the drawbacks.';
const sleep = ms => new Promise(r => setTimeout(r, ms));
let srv = null, O = arg('base', '');
if (!O) { srv = await serve(ROOT, 0); O = srv.origin; }
O = O.replace(/\/$/, '');
const appUrl = hash => `${O}/app/?sandbox=1&hl=en#${hash}`;
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const ctx = await browser.newContext({ ...devices['Pixel 7'], viewport: { width: 390, height: 844 }, screen: { width: 390, height: 844 }, locale: 'en-US', serviceWorkers: 'block' });
await noProd(ctx);
await ctx.addInitScript(() => { try { localStorage.setItem('sbx.settings', JSON.stringify({ onboarded: true, theme: 'light' })); } catch { /* */ } });
const ready = page => waitFn(page, () => window.App && window.ExitGuard && document.querySelector('#view') && document.querySelector('#view').children.length > 0, null, { timeout: 30000 }).then(() => sleep(900));
const go = async (page, hash) => { await page.evaluate(x => { location.hash = x; }, hash); await sleep(1300); };

// ---------- bài mẫu (như exit-sweep) ----------
const page0 = await ctx.newPage();
await page0.goto(appUrl('/home'), { waitUntil: 'load', timeout: 45000 }); await ready(page0);
const cls = await page0.evaluate(() => ({ ALWAYS: ExitGuard.ALWAYS, WITH_ARG: ExitGuard.WITH_ARG }));
const samples = cls.ALWAYS.filter(r => r !== 'call').map(r => [r, '/' + r]); // call = cuộc gọi trực tiếp (micro/âm thanh thật) – đo ở call-e2e
for (const r of cls.WITH_ARG) {
  if (FIXED[r]) { samples.push([r, FIXED[r]]); continue; }
  let h = null;
  for (const hub of [r, ...(HUBS[r] || [])]) {
    await go(page0, '/' + hub);
    h = await page0.evaluate(rr => { const a = [...document.querySelectorAll(`#view a[href^="#/${rr}/"]`)].find(x => !/\/mix\b/.test(x.getAttribute('href'))); return a ? a.getAttribute('href').slice(1) : null; }, r);
    if (h) break;
  }
  if (h) samples.push([r, h]);
}
await page0.close();

// Ảnh chụp trạng thái màn (chạy trong trang)
const probe = () => {
  const v = document.querySelector('#view'), vis = el => { if (!el) return false; const r = el.getBoundingClientRect(), cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && !el.closest('[hidden]'); };
  const END = '.lsn-done, .lesson-complete, #wDone, [data-lesson-done], .rev-done, .nx-step, #lRes:not(:empty), #tRes:not(:empty), .celebrate:not(.lk-exit-ask), #view .score-ring';   // .score-ring: thẻ kết quả của màn Viết (#/write: Phân tích → vòng điểm band) – màn kết thật, không phụ thuộc modal lên cấp (.celebrate) có hiện hay không
  const end = [...document.querySelectorAll(END)].find(vis) || null;
  const p = window.ExitGuard && ExitGuard.primary && ExitGuard.primary();
  const SKIP = '#lsnNoL, #lsnNoS, #skip, #skipW, #lfxNoAudio, #mkSkip, [data-lk-skip], .lfx-skipmic';
  const nextLinks = end ? [...(end.closest('#view, #lsnFoot, #modal') || end).querySelectorAll('a[href^="#/"], button')].filter(vis).filter(b => !b.matches('[data-exit]')).length : 0;
  const radios = [...v.querySelectorAll('input[type=radio]')].filter(i => !i.disabled), unanswered = radios.length && !radios.some(i => i.checked);
  const blank = [...v.querySelectorAll('input[type=text], input:not([type]), textarea')].find(i => vis(i) && !i.disabled && !i.readOnly && !i.value);
  const bank = [...document.querySelectorAll('#lsnBank .lsn-tile:not(.used), [data-tile-bank] [data-i]:not(.used)')].filter(vis).length;
  const opt = [...v.querySelectorAll('.lsn-opt:not([disabled]), [data-opt]:not([disabled]), .opt:not([disabled]), .qk-btn:not([disabled])')].find(vis);
  const prog = !!v.querySelector('[role=progressbar], progress, .lsn-bar, .progress');
  const match = [...v.querySelectorAll('.lsn-match .lsn-opt:not([disabled])')].some(vis);
  const sig = location.hash + '|' + (v.innerText || '').length + '|' + (p ? (p.id || p.className) + (p.textContent || '').trim().slice(0, 20) : '') + '|' + document.querySelectorAll('#lsnFoot *').length;
  return { learn: document.body.classList.contains('lk-learn'), hash: location.hash, end: !!end, nextLinks, exit: !!v.querySelector('[data-exit]'), prog, skip: [...document.querySelectorAll(SKIP)].some(vis),
    primary: p ? (p.id ? '#' + p.id : p.tagName.toLowerCase() + '.' + [...p.classList].slice(0, 2).join('.')) : '', unanswered: !!unanswered, blank: !!blank, bank, opt: !!opt, match, sig };
};

const blur = page => page.evaluate(() => document.activeElement && document.activeElement.blur && document.activeElement.blur());
// Thẻ/phương án trả lời đầu tiên còn chọn được (bỏ qua nút thoát, nghe lại, gợi ý, bỏ qua, mic) → focus để bấm Space
const focusAnswer = () => {
  const v = document.querySelector('#view'); if (!v) return false;
  const SKIP = '#lsnNoL, #lsnNoS, #skip, #skipW, #lfxNoAudio, #mkSkip, [data-lk-skip], .lfx-skipmic, [data-exit], [data-lk-primary]';
  const bad = /skip|hint|gợi ý|bỏ qua|listen|replay|nghe|play|phát|slow|chậm|audio|speak|mic|nói|record|ghi âm|share|khoe|back|quay lại|previous|prev\b|exit|thoát|close|đóng|report|báo|sound|transcript|model|mẫu|idea/i;
  const tiles = [...document.querySelectorAll('#lsnBank .lsn-tile:not(.used), [data-tile-bank] [data-i]:not(.used)')];
  // màn giới thiệu trong bài (cbt, rtype…): link "Bắt đầu" ở lại cùng route học cũng là bước tiếp
  const route = (/^#\/([^/?]*)/.exec(location.hash) || [])[1] || '';
  const same = route ? [...v.querySelectorAll(`a[href^="#/${route}/"], a[href^="#/${route}?"]`)] : [];
  const pool = tiles.length ? tiles : [...v.querySelectorAll('button:not([disabled]), [role=button]:not([aria-disabled=true]), [role=radio], label:has(> input[type=radio])'), ...same];
  const el = pool.find(b => {
    if (b.closest('.lk-exitbar, .study-top, .lk-exit-ask, nav, header, #lsnFoot') || b.matches(SKIP) || b.getAttribute('aria-pressed') === 'true') return false;
    const r = b.getBoundingClientRect(); if (!(r.width > 0 && r.height > 0) || getComputedStyle(b).visibility === 'hidden') return false;
    const lab = ((b.getAttribute('aria-label') || '') + ' ' + (b.title || '') + ' ' + (b.innerText || '')).trim();
    return (b.innerText || '').trim().length > 0 && !bad.test(lab);
  });
  if (!el) return false;
  if (!el.hasAttribute('tabindex') && !/^(BUTTON|A|INPUT)$/.test(el.tagName)) el.tabIndex = 0;
  el.focus(); return true;
};

const focusSkip = () => { const el = [...document.querySelectorAll('#lsnNoL, #lsnNoS, #skip, #skipW, #lfxNoAudio, #mkSkip, [data-lk-skip], .lfx-skipmic')].find(b => { const r = b.getBoundingClientRect(); return r.width > 0 && r.height > 0 && !b.disabled; }); if (!el) return false; el.focus(); return true; };

const rows = [], found = {};
for (const [r, hash] of samples) {
  const page = await ctx.newPage(); page.on('dialog', d => d.accept());
  const m = { route: r, hash, exit: false, prog: false, enter: false, skip: false, end: false, next: false, steps: 0, dead: '' };
  try {
    await page.goto(appUrl('/home'), { waitUntil: 'load', timeout: 45000 }); await ready(page); await go(page, hash);
    let s = await page.evaluate(probe), still = 0;
    m.exit = s.exit; m.prog = s.prog;
    for (let k = 0; k < STEPS && !s.end; k++) {
      m.steps = k + 1; m.skip = m.skip || s.skip; m.prog = m.prog || s.prog;
      if (!s.learn) { m.dead = 'rời màn học trước màn kết (' + s.hash + ')'; break; }
      // trả lời thử bằng bàn phím – leo thang tới khi có nút chính (hoặc màn tự sang bước sau):
      // ① phím của màn (phím số đặt thẻ/chọn, gõ "a" vào ô trống) ② Tab tới thẻ/phương án đầu + Space (màn chưa có phím số)
      const pre0 = s.sig;
      if (!s.primary || s.bank || s.unanswered || s.blank || s.opt || s.match) {
        await blur(page);
        if (s.bank) for (let i = 0; i < Math.min(s.bank, 12); i++) await page.keyboard.press('1');
        else if (s.match) { // nối cặp: chọn ô trái rồi ô phải cùng cặp (data-m) bằng Space – người học biết đáp án
          for (let j = 0; j < 8; j++) { const ok = await page.evaluate(() => { const L = document.querySelector('.lsn-match .lsn-opt[data-s="w"]:not([disabled])') || document.querySelector('.lsn-match .lsn-opt:not([disabled])'); if (!L) return false; const R = [...document.querySelectorAll('.lsn-match .lsn-opt:not([disabled])')].find(x => x !== L && x.dataset.m === L.dataset.m); if (!R) return false; L.focus(); return true; }); if (!ok) break; await page.keyboard.press('Space'); await page.evaluate(() => { const L = document.activeElement; const R = [...document.querySelectorAll('.lsn-match .lsn-opt:not([disabled])')].find(x => x !== L && x.dataset.m === L.dataset.m); if (R) R.focus(); }); await page.keyboard.press('Space'); await sleep(350); await blur(page); }
        } else if (s.blank) { // ô ngắn: "a"; bài viết (textarea): đoạn ~60 từ (màn viết đòi ≥ 30–40 từ mới chấm)
          const area = await page.evaluate(() => { const v = document.querySelector('#view'); const i = [...v.querySelectorAll('input[type=text], input:not([type]), textarea')].find(x => !x.disabled && !x.readOnly && !x.value && x.getBoundingClientRect().height > 0); if (i) i.focus(); return !!(i && i.tagName === 'TEXTAREA'); });
          if (area) { await page.keyboard.insertText(ESSAY); await sleep(300); await blur(page); } else { await page.keyboard.type('a'); await page.keyboard.press('Enter'); await sleep(500); await blur(page); }
        }
        else if (s.unanswered || !s.primary) await page.keyboard.press('1');
        if (s.opt && !s.unanswered) { await page.evaluate(() => { const o = [...document.querySelectorAll('#view .lsn-opt:not([disabled]), #view [data-opt]:not([disabled]), #view .opt:not([disabled]), #view .qk-btn:not([disabled])')].find(x => x.getBoundingClientRect().height > 0); if (o) o.focus(); }); await page.keyboard.press('Space'); await blur(page); }
        await sleep(400);
        let a = await page.evaluate(probe);
        for (let j = 0; j < 12 && !a.end && a.learn && (a.bank || (!a.primary && a.sig === pre0)); j++) {
          if (!(await page.evaluate(focusAnswer))) break;
          await page.keyboard.press('Space'); await sleep(350); await blur(page);
          a = await page.evaluate(probe);
        }
        // màn tự bay sang bước sau khi chọn (quick, reflex…): tính là đi tiếp, không cần Enter
        if (a.sig !== pre0 && !a.primary && a.hash === s.hash) { const b = await page.evaluate(probe); if (!b.primary) { still = 0; s = b; continue; } }
        if (a.end || !a.learn) { s = a; continue; }
      }
      await blur(page);
      const pre = await page.evaluate(probe), before = pre.sig;
      await page.keyboard.press('Enter'); await sleep(700);
      // màn tự bay qua bước nghe/nói khi không có micro/âm thanh → chờ thêm
      let n = await page.evaluate(probe); if (n.sig === before && !n.end) { await sleep(1200); n = await page.evaluate(probe); }
      // bước nghe/nói không làm được (không micro/loa trên CI) → bấm "Bỏ qua" của màn như người học
      if (n.sig === before && !n.end && n.skip && await page.evaluate(focusSkip)) { await page.keyboard.press('Space'); await sleep(900); await blur(page); n = await page.evaluate(probe); if (n.sig !== before) { still = 0; s = n; continue; } }
      if (n.sig !== before) { still = 0; if (pre.primary) m.enter = true; } else if (++still >= 2) { m.dead = `kẹt ở bước ${k + 1}: Enter không đi tiếp (nút chính: ${n.primary || 'không có'})`; break; }
      s = n;
    }
    m.end = s.end; m.next = s.end && s.nextLinks > 0; m.prog = m.prog || s.prog; m.skip = m.skip || s.skip;
    if (!m.end && !m.dead) m.dead = `chưa tới màn kết sau ${STEPS} bước`;
    if (m.dead) await page.screenshot({ path: `${OUT}/shots/${r}-dead.png`, scale: 'css' });
  } catch (e) { m.dead = 'lỗi: ' + String(e.message || e).split('\n')[0].slice(0, 140); }
  finally { await page.close(); }
  const gaps = [];
  if (!m.exit) gaps.push('exit'); if (!m.prog) gaps.push('progress'); if (!m.enter) gaps.push('enter'); if (!m.end) gaps.push('end'); if (m.end && !m.next) gaps.push('end-next');
  if (/^(listen|listen-test|dictation|speaking|pron|roleplay|handsfree)$/.test(r) && !m.skip) gaps.push('skip');
  found[r] = gaps; rows.push(m);
  console.log(gaps.length ? '·' : '✓', r, hash, gaps.join(',') || 'đủ', m.dead ? '– ' + m.dead : '');
}
await ctx.close(); await browser.close(); if (srv) srv.close();

// ---------- cổng: known chỉ được thu nhỏ ----------
const { _flaky: flaky = {}, ...known } = fs.existsSync(KNOWN_F) ? JSON.parse(fs.readFileSync(KNOWN_F, 'utf8')) : {};
// _flaky: màn lúc đạt lúc không đạt (practice/learn?src=deck: 10 bước ở một số lượt PR, 40 bước ở main – 08/11) → cả hai kết quả đều được chấp nhận, vẫn in ra; KHÔNG phải chỗ thêm lỗi mới
const fails = [];
for (const [r, gaps] of Object.entries(found)) {
  const k = new Set((known[r] || [])), fl = new Set(flaky[r] || []);
  for (const gp of gaps) if (!k.has(gp) && !fl.has(gp)) fails.push(`${r}: thiếu "${gp}" (mới – sửa màn, không thêm vào known)`);
  for (const gp of k) if (!gaps.includes(gp) && !fl.has(gp)) fails.push(`${r}: "${gp}" đã đạt – xoá khỏi scripts/test/nav-sweep.known.json`);
}
for (const r of [...Object.keys(known), ...Object.keys(flaky)]) if (!(r in found)) fails.push(`${r}: có trong known nhưng không đo được (bài mẫu mất?)`);
if (process.argv.includes('--write-known')) fs.writeFileSync(OUT + '/known.json', JSON.stringify(Object.fromEntries(Object.entries(found).filter(([, g]) => g.length)), null, 1) + '\n');
const Y = b => (b ? '✓' : '—');
const md = `# nav-sweep\n\n${rows.length} màn học · ${rows.filter(m => m.end && m.next && m.enter).length} đi trọn bằng bàn phím tới màn kết có bước tiếp · ${fails.length} lỗi cổng\n\n| route | thoát | tiến độ | Enter | bỏ qua | màn kết | bước tiếp | bước | ngõ cụt |\n|---|---|---|---|---|---|---|---|---|\n${rows.map(m => `| ${m.route} | ${Y(m.exit)} | ${Y(m.prog)} | ${Y(m.enter)} | ${Y(m.skip)} | ${Y(m.end)} | ${Y(m.next)} | ${m.steps} | ${m.dead.replace(/\|/g, '/')} |`).join('\n')}\n\n${fails.length ? '## Lỗi cổng\n' + fails.map(f => '- ' + f).join('\n') + '\n' : ''}`;
fs.writeFileSync(OUT + '/report.md', md); fs.writeFileSync(OUT + '/result.json', JSON.stringify(rows, null, 1));
if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, md);
for (const f of fails) console.log('✗', f);
console.log(fails.length ? `✗ nav-sweep: ${fails.length} lỗi` : '✓ nav-sweep xanh');
process.exit(fails.length ? 1 : 0);
