// Kiểm LIVE (Playwright → lexkite.com, ?sandbox=1: không ghi dữ liệu thật): lesson/go ở giao diện en/fr/zh/es không lộ chữ Việt,
// mọi bài có "Tôi không biết" (lsnIdk), bài xếp từ đủ ô cho đáp án. Ảnh ở out/live-lesson-lang. Chạy: node scripts/test/live-lesson-lang.mjs [origin] [out]
import fs from 'node:fs'; import { chromium } from 'playwright';
const ORIGIN = process.argv[2] || 'https://lexkite.com', OUT = process.argv[3] || 'out/live-lesson-lang'; fs.mkdirSync(OUT, { recursive: true });
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.error('✗', m); } else console.log('✓', m); };
const VI = /[ăâđêôơưàáảãạằắẳẵặầấẩẫậèéẻẽẹềếểễệìíỉĩịòóỏõọồốổỗộờớởỡợùúủũụừứửữựỳýỷỹỵ]/i;
const SEED = async () => { localStorage.setItem('lk.ux1', '1'); localStorage.setItem('lk.onb', '1'); App.state.settings.onboarded = true; App.state.settings.exam = 'ielts'; await App.saveSettings(); };
const browser = await chromium.launch();
for (const lang of ['en', 'fr', 'zh', 'es']) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block', locale: lang }), page = await ctx.newPage(), errs = [];
  page.on('pageerror', e => errs.push(e.message));
  const url = h => `${ORIGIN}/app/?sandbox=1&hl=${lang}#/${h}`;
  await page.goto(url('home'), { waitUntil: 'load' }); await page.waitForFunction(() => window.App && App.state && App.saveSettings, null, { timeout: 45000 }); await page.evaluate(SEED);
  await page.goto(url('lesson/go?demo=1'), { waitUntil: 'load' }); await page.reload({ waitUntil: 'load' });
  await page.waitForFunction(() => App._lsn && App._lsn.sess && App._lsn.sess.cur, null, { timeout: 45000 }).catch(() => {});
  const seen = []; let shot = 0;
  for (let n = 0; n < 40; n++) {
    const r = await page.evaluate(async () => {
      const q = s => document.querySelector(s), w = ms => new Promise(r => setTimeout(r, ms)); await w(500);
      if (q('.lsn-end')) return { end: true };
      if (q('#lsnGo')) { q('#lsnGo').click(); return { step: 'go' }; }
      const f = q('#lsnFoot'); if (f && !f.hidden && q('#lsnNext')) { q('#lsnNext').click(); return { step: 'next' }; }
      const it = App._lsn && App._lsn.sess && App._lsn.sess.cur; if (!it) return { none: true };
      const root = q('#lsn') || document.body, idk = q('#lsnIdk');
      const bank = it.tiles ? (() => { const b = it.tiles.slice(); for (const x of String(it.answer).split(' ')) { const i = b.indexOf(x); if (i < 0) return x; b.splice(i, 1); } return null; })() : null;
      return { type: it.type, text: root.innerText, idk: !!idk, bankMissing: bank, idkClick: (idk && !q('#lsnCheck:not([hidden])') ? 0 : 0) };
    }).catch(() => ({ none: true }));
    if (r.end) break; if (r.step || r.none) { if (r.none) await page.waitForTimeout(500); continue; }
    seen.push(r);
    if (shot < 3) await page.screenshot({ path: `${OUT}/${lang}-${shot++}-${r.type}.png` });
    await page.evaluate(() => { const b = document.querySelector('#lsnIdk'); if (b) b.click(); });
  }
  ok(seen.length >= 4, `${lang}: lái được ${seen.length} bài (${[...new Set(seen.map(s => s.type))].join(',')})`);
  ok(seen.every(s => !VI.test(s.text.replace(/\bAma\b|\bCarlos\b/g, ''))), `${lang}: không có chữ Việt trên màn bài${seen.filter(s => VI.test(s.text)).map(s => ' [' + s.type + ': ' + (s.text.match(new RegExp('.{0,30}' + VI.source + '.{0,20}', 'i')) || [''])[0].replace(/\s+/g, ' ') + ']').join('')}`);
  ok(seen.every(s => s.idk), `${lang}: bài nào cũng có "Tôi không biết" (${seen.filter(s => !s.idk).map(s => s.type).join(',') || 'đủ'})`);
  ok(seen.every(s => s.bankMissing == null), `${lang}: bài xếp từ đủ ô`);
  ok(errs.length === 0, `${lang}: không lỗi JS (${errs.slice(0, 2).join(' | ')})`);
  await ctx.close();
}
await browser.close(); process.exit(fails ? 1 : 0);
