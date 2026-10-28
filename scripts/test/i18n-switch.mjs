// Đổi ngôn ngữ giao diện SAU khi đã dùng app – như người dùng thật. Bắt lỗi "đóng băng" tiếng Việt (vd. "Nivel 1 · Người mới").
//   node scripts/test/i18n-switch.mjs [web] [es,ja,ar]   → mô phỏng đổi ngôn ngữ, đi qua các trang chính, báo chữ tiếng Việt còn hiện
//   node scripts/test/i18n-switch.mjs [web] --scan       → liệt kê mọi lời gọi t() chạy LÚC NẠP MODULE (file:dòng) – phải = 0
// Vì sao i18n-leak.js không bắt được: nó nạp từ điển NGAY sau i18n.js, còn trình duyệt nạp js/i18n/<lang>.js bất đồng bộ
// (thường SAU các module defer, có khi sau cả DOMContentLoaded). Mọi t() chạy lúc nạp module / trước khi từ điển về
// → trả về khóa tiếng Việt và bị giữ mãi. Quy tắc: t() chỉ gọi lúc vẽ (trong hàm), dữ liệu lưu giữ KHÓA (I18N.tk), không lưu chữ đã dịch.
import { createRequire } from 'node:module';
import fs from 'node:fs'; import path from 'node:path'; import vm from 'node:vm';
const require = createRequire(import.meta.url);
const { JSDOM, VirtualConsole } = require('jsdom');
const lazyfix = require('./lazyfix.js');

const args = process.argv.slice(2);
const WEB = args.find(a => !a.startsWith('--') && !/^[a-z]{2}(,[a-z]{2})*$/.test(a)) || 'web';
const LANGS = (args.find(a => /^[a-z]{2}(,[a-z]{2})*$/.test(a)) || 'es,ja,ar').split(',');
const VI = /[ăđơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]/i;
const VI0 = VI, VIS = /[âêôăđơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]/i; // es/ja/ar…: â ê ô cũng là dấu hiệu tiếng Việt (“câu”, “nên”)
const ROUTES = ['#/home', '#/me', '#/vocab', '#/library', '#/review', '#/practice', '#/path', '#/plan', '#/stats', '#/settings', '#/league', '#/goal',
  '#/skills', '#/tests', '#/mistakes', '#/grammar', '#/pron', '#/listening', '#/reading', '#/speaking', '#/write', '#/task1', '#/letters', '#/rtype',
  '#/mock', '#/toeic', '#/toefl', '#/dict/sustainable', '#/topic/education', '#/topic/ngsl1', '#/resources', '#/placement', '#/usage', '#/usage/interested', '#/usage?c=pair', '#/home'];
const html = fs.readFileSync(path.join(WEB, 'app', 'index.html'), 'utf8').replace(/<!--hero-->[\s\S]*?<!--\/hero-->/, '');
const scripts = [...html.matchAll(/<script(?: defer)? src="([^"]+)"><\/script>/g)].map(m => m[1]);
const tick = (ms = 40) => new Promise(r => setTimeout(r, ms));
const rel = f => path.relative(process.cwd(), path.join(WEB, f));
const EN = (() => { const c = { self: {} }; c.self = c; vm.createContext(c); vm.runInContext(fs.readFileSync(path.join(WEB, 'js/i18n/en.js'), 'utf8'), c); return c.I18N_DICT.en; })();
const VIK = /[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i; // khóa tiếng Việt (rộng hơn VI: VI chỉ gồm dấu không có trong es/fr/pt)
const UI_KEYS = new Set(Object.keys(EN).filter(k => VIK.test(k) && !/\{\w+\}/.test(k)));
const UI_TPL = Object.keys(EN).filter(k => VIK.test(k.replace(/\{\w+\}/g, '')) && k.replace(/\{\w+\}/g, '').trim().length >= 6 && /\{\w+\}/.test(k) && !/[<>]/.test(k))
  .map(k => new RegExp('^' + k.replace(/[.*+?^$()|[\]\\]/g, '\\$&').replace(/\{\w+\}/g, '.+?') + '$'));
const isUI1 = x => UI_KEYS.has(x) || UI_TPL.some(r => r.test(x));
const isUI = x => isUI1(x) || isUI1(x.replace(/^[^\p{L}(]+/u, '').replace(/\s*\(\d+\)$/, '')); // vd. "✗ (bỏ trống)", "🔤 Từ vựng (0)"

// Một "trang" jsdom; ls: localStorage mang sang từ phiên trước (đổi ngôn ngữ = tải lại trang, giữ dữ liệu)
function page(ls) {
  const vc = new VirtualConsole(); // bỏ "Not implemented: navigation" khi I18N.set() gọi location.reload()
  const dom = new JSDOM(html.replace(/<script(?: defer)? src="[^"]+"><\/script>/g, '').replace(/<link[^>]+>/g, ''), { url: 'http://localhost/app/?sandbox=1#/home', runScripts: 'outside-only', pretendToBeVisual: true, virtualConsole: vc });
  const w = dom.window, ctx = dom.getInternalVMContext(), errors = [];
  for (const [k, v] of Object.entries(ls)) w.localStorage.setItem(k, v);
  w.scrollTo = () => {}; w.HTMLElement.prototype.scrollIntoView = () => {}; w.matchMedia = () => ({ matches: false, addEventListener() {}, addListener() {} });
  w.CSS = { escape: s => s }; w.console.error = () => {}; w.console.warn = () => {};
  // Dịch máy nội dung (contentTranslate) giả lập: nội dung bài → "T"; nhưng chuỗi là KHÓA giao diện (có trong en.js) thì trả nguyên –
  // chữ giao diện phải qua t(), không được trông vào dịch máy lúc chạy (đó chính là chỗ i18n-leak bị che lỗi đóng băng)
  w.fetch = async url => {
    const u = String(url);
    if (/translate\.googleapis/.test(u)) { const q = decodeURIComponent((u.match(/[?&]q=([^&]*)/) || [])[1] || ''); const out = q.split('\n').map(x => (isUI(x.trim()) ? x : 'T')).join('\n'); return { ok: true, json: async () => (/dj=1/.test(u) ? { sentences: [{ trans: out }] } : [[[out]]]) }; }
    return { ok: false, status: 404, json: async () => ({}), text: async () => '' };
  };
  const run = f => { try { vm.runInContext(fs.readFileSync(path.join(WEB, f), 'utf8'), ctx, { filename: rel(f) }); } catch (e) { errors.push(f + ': ' + e.message); } };
  return { w, run, errors };
}
const dump = w => { const o = {}; for (let i = 0; i < w.localStorage.length; i++) { const k = w.localStorage.key(i); o[k] = w.localStorage.getItem(k); } return o; };

// ---------- 1) Quét: t() chạy lúc nạp module ----------
if (args.includes('--scan')) {
  const { w, run, errors } = page({ 'vb.uiLang': 'vi', 'vb.geo': '-' });
  w.Error.stackTraceLimit = 40;
  const hits = new Map(); let spying = true;
  const spy = () => {
    const orig = w.I18N.t;
    const t = function (s, v) {
      const fr = new w.Error().stack.split('\n').slice(2).find(l => !/i18n\.js:/.test(l)) || '';
      const m = fr.match(/\(?([^()\s]+\.js):(\d+):\d+\)?$/);
      if (m && spying) { const k = m[1] + ':' + m[2]; if (!hits.has(k)) hits.set(k, String(s)); }
      return orig(s, v);
    };
    w.t = t; w.I18N.t = t;
  };
  for (const f of scripts) { run(f); if (/i18n\.js$/.test(f)) spy(); }
  // bundle tải lười (BUNDLES trong app.js) + mọi file js còn lại (thư viện từ, dữ liệu bài…) – lỗi nạp bỏ qua
  const loaded = new Set(scripts);
  const src = fs.readFileSync(path.join(WEB, 'js/app.js'), 'utf8'), a = src.indexOf("const G = 'js/grammar/', BUNDLES = {"), b = src.indexOf('\n  };', a);
  const lazy = [...new Set(Object.values(new Function(src.slice(a, b + 4) + '; return BUNDLES;')()).flat())];
  const rest = []; const walk = d => { for (const f of fs.readdirSync(path.join(WEB, d)).sort()) { const p = d + '/' + f; if (fs.statSync(path.join(WEB, p)).isDirectory()) { if (!/^(i18n|vendor|notes)$/.test(f)) walk(p); } else if (/\.js$/.test(f) && !/^admin|^sw\.js$/.test(f)) rest.push(p); } };
  walk('js');
  for (const f of [...lazy, ...rest]) if (!loaded.has(f)) { loaded.add(f); run(f); }
  // Khóa lưu trữ I18N.tk('…') (dịch lúc vẽ) cũng phải có bản tiếng Anh – i18n-missing chỉ quét t('…')
  const en = EN;
  const tkMiss = [];
  for (const f of rest) { const s = fs.readFileSync(path.join(WEB, f), 'utf8'); for (const m of s.matchAll(/\btk\('((?:[^'\\]|\\.)*)'/g)) if (VI.test(m[1]) && !Object.hasOwn(en, m[1])) tkMiss.push(`${f}: ${m[1]}`); }
  const found = [...hits]; hits.clear(); spying = false; // sau đây là lúc chạy (DOMContentLoaded, hẹn giờ…) – không tính
  for (const [k, s] of found) console.log(`  ${k}  t('${s.slice(0, 60)}')`);
  tkMiss.forEach(x => console.log('  thiếu bản tiếng Anh cho I18N.tk: ' + x));
  if (found.length) console.log(`✗ i18n-switch --scan: ${found.length} chỗ gọi t() lúc nạp module → chữ bị đóng băng trước khi từ điển ngôn ngữ nạp xong.\n  Sửa: chuyển vào hàm/getter gọi lúc vẽ, vd. const L = () => [t('…')] hoặc { get name() { return t('…'); } }`);
  else if (!tkMiss.length) console.log(`✓ i18n-switch --scan: không có t() lúc nạp module (${loaded.size} file)`);
  if (errors.length && process.env.DEBUG) console.log('  (lỗi nạp bỏ qua) ' + errors.slice(0, 8).join(' | '));
  process.exit(found.length || tkMiss.length ? 1 : 0);
} else {
  // ---------- 2) Đổi ngôn ngữ sau khi dùng app ----------
  const boot = async (ls, dictAt) => {
    const P = page(ls), { w, run, errors } = P;
    for (const f of scripts) run(f);
    if (!w.App) { console.log('nạp lỗi:', errors.slice(0, 5).join(' | ')); process.exit(2); }
    lazyfix(w, fs, path, WEB, errors);
    // Từ điển về muộn như trên mạng thật: 'modules' = sau các module defer, trước DOMContentLoaded; 'boot' = sau cả khi app khởi động
    const dict = () => { for (const s of w.document.head.querySelectorAll('script[src^="js/i18n/"]')) { run(s.getAttribute('src')); if (s.onload) s.onload(); } };
    if (dictAt === 'modules') dict();
    await tick(150);
    if (dictAt === 'boot') { dict(); await tick(150); }
    return P;
  };
  // Phiên tiếng Việt: dùng app (onboarding, XP, lỗi sai, ngữ cảnh từ) rồi bấm đổi ngôn ngữ trong hộp 🌐
  const vi = await boot({ 'vb.uiLang': 'vi', 'vb.geo': '-' }, 'modules');
  { const { w } = vi;
    w.location.hash = '#/welcome/setup'; await tick(120); const q = s => w.document.querySelector(s); for (let i = 0; i < 60 && !q('#go'); i++) { if (q('#obNext')) q('#obNext').click(); await tick(100); } const go = w.document.querySelector('#go'); if (go) go.click(); await tick(800);
    await w.Game.track({ xp: 30, reviews: 1 }, { cards: 1, mastered: 0, streak: 1 });
    const tk = w.I18N.tk || ((k, v) => w.t(k, v)); // mã cũ (trước I18N.tk) lưu chữ đã dịch
    await w.App.logMistake({ kind: 'reading', q: tk('{title} – câu {n}: {q}', { title: 'Passage 1', n: 3, q: 'What is the main idea?' }), answer: 'B', given: tk('(bỏ trống)') });
    const ms = JSON.parse(w.localStorage.getItem('sbx.mistakes') || w.localStorage.getItem('ielts.mistakes') || '[]'); // bản ghi kiểu cũ: lưu chữ đã dịch (tiếng Việt)
    ms.push({ kind: 'listening', q: 'Test 2 – Câu 7: Where is the station?', answer: 'north', given: '(bỏ trống)', explain: 'Nghe: “…the north exit…”', key: 'listening|old', n: 1, at: Date.now(), fixed: false });
    w.localStorage.setItem(w.localStorage.getItem('sbx.mistakes') ? 'sbx.mistakes' : 'ielts.mistakes', JSON.stringify(ms));
    w.location.hash = '#/home'; await tick(200);
  }
  const before = dump(vi.w);
  let total = 0;
  const plan = LANGS.flatMap((l, i) => (i === 0 ? [[l, 'modules'], [l, 'boot']] : [[l, i % 2 ? 'boot' : 'modules']]));
  for (const [lang, dictAt] of plan) {
    // Bấm chọn ngôn ngữ như người dùng → I18N.set lưu lựa chọn rồi tải lại trang (jsdom: không tải lại → mở trang mới với cùng localStorage)
    const { w: wv } = await boot(before, 'modules');
    // Nút ngôn ngữ ở thanh trên đã chuyển vào Cài đặt (trang chủ gọn) → chọn trong #/settings như người dùng
    wv.location.hash = '#/settings'; for (let i = 0; i < 60 && !wv.document.querySelector('#view [data-lang-select], #view [data-lang-pick]'); i++) await tick(50);
    const sel = wv.document.querySelector('#view [data-lang-select]');
    if (sel) { sel.value = lang; sel.dispatchEvent(new wv.Event('change', { bubbles: true })); }
    else { const pick = wv.document.querySelector(`#view [data-lang-pick] [data-v="${lang}"]`); if (pick) pick.click(); }
    if (wv.localStorage.getItem('vb.uiLang') !== lang) { console.log(`✗ ${lang}: bấm chọn ngôn ngữ không lưu vb.uiLang`); total++; continue; }
    const { w, errors } = await boot(dump(wv), dictAt);
    const leaks = new Map(), VI = /fr|pt/.test(lang) ? VI0 : VIS;
    const scan = route => {
      const tw = w.document.createTreeWalker(w.document.body, w.NodeFilter.SHOW_TEXT); let n;
      while ((n = tw.nextNode())) {
        const s = n.nodeValue.replace(/\s+/g, ' ').trim(); if (!s || !VI.test(s)) continue;
        const el = n.parentElement; if (!el || el.closest('script,style,[translate="no"],[data-keep-vi],textarea,[hidden]')) continue;
        const where = (el.closest('[id]') || el).id || el.className || el.tagName, k = s.slice(0, 80);
        if (!leaks.has(k)) leaks.set(k, `${route} · ${String(where).slice(0, 30)} · “${k}”`);
      }
      w.document.querySelectorAll('[placeholder],[title],[aria-label]').forEach(el => ['placeholder', 'title', 'aria-label'].forEach(a => { const v = el.getAttribute(a); if (v && VI.test(v) && !el.closest('[translate="no"],[data-keep-vi]')) { const k = a + ':' + v.slice(0, 60); if (!leaks.has(k)) leaks.set(k, `${route} · [${a}] · “${v.slice(0, 60)}”`); } }));
      if (VI.test(w.document.title)) leaks.set('title', `${route} · <title> · “${w.document.title.slice(0, 60)}”`);
    };
    scan('(start)');
    for (const r of ROUTES) { w.location.hash = r; await tick(300); scan(r); if (process.env.SHOW === r) console.log(w.document.querySelector('#view').textContent.replace(/\s+/g, ' ').slice(0, 1500)); w.document.body.classList.remove('bare'); }
    total += leaks.size;
    console.log(`${leaks.size ? '✗' : '✓'} vi → ${lang} (từ điển về sau ${dictAt === 'boot' ? 'khi app khởi động' : 'các module'}): ${leaks.size} chỗ còn tiếng Việt${errors.length ? ` · ${errors.length} lỗi nạp` : ''}`);
    [...leaks.values()].slice(0, process.env.N ? +process.env.N : 25).forEach(x => console.log('   ' + x));
  }
  console.log(total ? `✗ i18n-switch: ${total} chỗ lẫn tiếng Việt sau khi đổi ngôn ngữ` : '✓ i18n-switch: đổi ngôn ngữ không còn chữ tiếng Việt');
  setTimeout(() => process.exit(total ? 1 : 0), 20);
}
