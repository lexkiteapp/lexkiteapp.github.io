// 🤖 Kiểm thử ĐẦU-CUỐI như người dùng thật (Chromium thật, bản live, ?sandbox=1 → không ghi dữ liệu thật, không tính thống kê):
// 15 ngôn ngữ × điện thoại/máy tính, đi qua mọi trang, bấm thử các nút trong trang, rồi báo:
//   lỗi JS (pageerror/console.error), yêu cầu mạng hỏng (4xx/5xx), tràn ngang trên điện thoại, chữ tiếng Việt lọt vào ngôn ngữ khác, trang trắng.
// Dùng: node scripts/test/e2e.mjs [base] [langs]   (cần: npx playwright install chromium) – chạy hằng ngày trong health.yml
import { chromium } from 'playwright';
import fs from 'fs';
const BASE = process.argv[2] || 'https://lexkite.com/';
const LANGS = (process.argv[3] || 'vi,en,es,pt,fr,de,id,th,zh,ja,ko,hi,ar,ru,tr').split(',');
const ROUTES = ['home', 'vocab', 'library', 'review', 'practice', 'practice/learn', 'path', 'stats', 'settings', 'me', 'skills', 'tests', 'phrases', 'models', 'grammar', 'pron',
  'listening', 'reading', 'speaking', 'write', 'task1', 'letters', 'toeic', 'toefl', 'contact', 'placement', 'dict/sustainable', 'topic/ngsl1', 'topic/office-email',
  'model/t1-travel', 'handsfree', 'reflex', 'courses', 'course/ielts-writing', 'paraphrase', 'mistakes', 'goal'];
const VI = /[ăđơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]/i;
const VIEWS = { mobile: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }, desktop: { viewport: { width: 1366, height: 860 } } };
// Lỗi bỏ qua: do môi trường headless (âm thanh tự phát, quảng cáo/mạng ngoài), không phải lỗi app
const BENIGN = /play\(\) (request|failed)|NotAllowedError|AbortError|autoplay|favicon|ERR_BLOCKED_BY_CLIENT|googletagmanager|speechSynthesis|net::ERR_ABORTED/i;
const issues = [], add = (kind, lang, view, route, msg) => { const k = `${kind}|${route}|${String(msg).slice(0, 160)}`; const f = issues.find(x => x.k === k); if (f) { f.langs.add(lang); f.views.add(view); } else issues.push({ k, kind, route, msg: String(msg).slice(0, 300), langs: new Set([lang]), views: new Set([view]) }); };
const browser = await chromium.launch();
const t0 = Date.now(); let pages = 0, clicks = 0;
for (const lang of LANGS) for (const [vn, vp] of Object.entries(VIEWS)) {
  if (vn === 'desktop' && !['vi', 'en', 'ar', 'ja'].includes(lang)) continue; // máy tính: 4 ngôn ngữ đại diện (LTR/RTL/CJK) – đủ bắt lỗi bố cục
  const ctx = await browser.newContext({ ...vp, locale: lang });
  const page = await ctx.newPage(); let route = 'boot';
  page.on('pageerror', e => add('js', lang, vn, route, e.message));
  page.on('console', m => { if (m.type() === 'error' && !BENIGN.test(m.text())) add('console', lang, vn, route, m.text()); });
  page.on('response', r => { const u = r.url(); if (r.status() >= 400 && /lexkite\.(com|pages\.dev)/.test(u) && !/\/api\/(hit|sync|config)/.test(u) && !BENIGN.test(u)) add('http', lang, vn, route, `${r.status()} ${u.replace(/^https?:\/\/[^/]+/, '')}`); });
  await page.goto(`${BASE}?sandbox=1&hl=${lang}#/welcome/setup`, { waitUntil: 'networkidle' }).catch(e => add('load', lang, vn, 'welcome', e.message));
  const go = await page.$('#go'); if (go) { await go.click().catch(() => {}); await page.waitForTimeout(2000); }
  for (const r of ROUTES) {
    route = r; pages++;
    await page.evaluate(h => { location.hash = h; }, '#/' + r); await page.waitForTimeout(900);
    const st = await page.evaluate(({ vi, isVi }) => {
      const view = document.getElementById('view') || document.body;
      const txt = (view.innerText || '').trim();
      const over = document.documentElement.scrollWidth - innerWidth;
      let leak = '';
      if (!isVi) {
        const w = document.createTreeWalker(view, NodeFilter.SHOW_TEXT);
        for (let n; (n = w.nextNode());) {
          const el = n.parentElement; if (!el || el.closest('[translate="no"],[data-keep-vi],input,textarea,script,style')) continue;
          if (!el.offsetParent && getComputedStyle(el).position !== 'fixed') continue;
          if (new RegExp(vi, 'i').test(n.textContent)) { leak = n.textContent.trim().slice(0, 120); break; }
        }
      }
      return { len: txt.length, over, leak };
    }, { vi: VI.source, isVi: lang === 'vi' }).catch(e => ({ len: -1, over: 0, leak: '', err: e.message }));
    if (st.len >= 0 && st.len < 20) add('blank', lang, vn, r, 'Trang gần như trắng');
    if (vn === 'mobile' && st.over > 4) add('overflow', lang, vn, r, `Tràn ngang ${st.over}px`);
    if (st.leak) add('leak', lang, vn, r, st.leak);
    // Bấm thử tối đa 3 nút an toàn trong trang (không đăng xuất/xóa/gửi/đăng nhập), chỉ ngôn ngữ đại diện để giữ thời gian chạy
    if (['vi', 'en', 'ar'].includes(lang)) {
      const btns = await page.$$('#view button:visible:not([disabled])');
      for (const b of btns.slice(0, 3)) {
        const label = ((await b.innerText().catch(() => '')) + ' ' + ((await b.getAttribute('id')) || '')).toLowerCase();
        if (/xóa|delete|đăng xuất|sign out|log ?out|gửi|send|submit|reset|đăng nhập|sign in|google|حذف|إرسال/.test(label)) continue;
        await b.click({ timeout: 1500 }).catch(() => {}); clicks++; await page.waitForTimeout(350);
        if (!page.url().includes('#/' + r.split('/')[0])) await page.evaluate(h => { location.hash = h; }, '#/' + r);
        await page.keyboard.press('Escape').catch(() => {});
      }
    }
  }
  await ctx.close();
}
await browser.close();
const kinds = { js: 'Lỗi JS', console: 'console.error', http: 'Yêu cầu hỏng', load: 'Không tải được', blank: 'Trang trắng', overflow: 'Tràn ngang (mobile)', leak: 'Lẫn tiếng Việt' };
const lines = issues.map(i => `- **${kinds[i.kind]}** · \`#/${i.route}\` · ${[...i.langs].join(',')} · ${[...i.views].join('/')}: ${i.msg.replace(/\n/g, ' ')}`);
const head = `### 🤖 E2E: ${pages} lượt trang, ${clicks} lần bấm, ${LANGS.length} ngôn ngữ – ${Math.round((Date.now() - t0) / 1000)} s – ${issues.length ? '❌ ' + issues.length + ' vấn đề' : '✅ không lỗi'}`;
const md = head + '\n' + lines.join('\n') + '\n';
console.log(md);
if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, md);
fs.writeFileSync('e2e-report.md', md);
process.exit(issues.some(i => ['js', 'http', 'load', 'blank', 'overflow', 'leak'].includes(i.kind)) ? 1 : 0);
