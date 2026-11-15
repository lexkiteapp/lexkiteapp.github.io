// Test (jsdom + tĩnh) web/js/exit-guard.js – hồi quy các lỗi của #339 (exit-sweep đỏ 108 lỗi, iOS E2E "@aria-label: Thoát bài học"):
// 1) i18n: mọi khóa t('…') của ExitGuard (module khung, chạy trên MỌI màn học) phải có trong từ điển khung en.js và <lang>.js của 14 ngôn ngữ,
//    không chỉ trong gói lười (en/lesson.js…) – không thì màn chưa nạp gói đó (practice, review…) hiện nhãn tiếng Việt.
// 2) Esc khi chưa làm gì → rời màn (lỗi cũ: nhánh else nằm trong comment → Esc không làm gì).
// 3) Đang làm dở + màn có ô ghi chú từ .wn-slot[data-done] → vẫn hỏi (lỗi cũ: [data-done] chung bị coi là "màn kết").
// 4) Back chỉ có popstate (back từ mục do pushState tạo, không có hashchange) → vẫn hỏi; "Thoát" → rời màn thật, app vẽ trang mới.
// 5) Chưa làm dở + back chỉ có popstate → app vẫn vẽ trang mới (không đứng yên ở URL mới).
// 6) Lượt điều hướng bị giữ có đích (#/me) → "Thoát" đi đúng đích; hashchange theo sau lượt đã giữ không làm app vẽ lại màn học.
// Chạy: node scripts/test/exit-guard.mjs
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import jsdom from 'jsdom';
const { JSDOM } = jsdom;
let n = 0, fails = 0; const ok = (c, m) => { n++; if (!c) { fails++; console.log('✗', m); } };
const SRC = fs.readFileSync('web/js/exit-guard.js', 'utf8');

// ---------- 1) i18n tĩnh ----------
const keys = [...new Set([...SRC.matchAll(/\bt\('((?:[^'\\]|\\.)+)'/g)].map(m => m[1]))];
ok(keys.length >= 8, 'tìm được khóa t() trong exit-guard.js (' + keys.length + ')');
const dictOf = file => { const ctx = { I18N_DICT: {} }; ctx.self = ctx; vm.createContext(ctx); vm.runInContext(fs.readFileSync(file, 'utf8'), ctx); return Object.values(ctx.I18N_DICT)[0] || {}; };
const langs = fs.readFileSync('scripts/i18n-langs.txt', 'utf8').split('\n').map(s => s.trim()).filter(s => s && !s.startsWith('#'));
for (const lang of ['en', ...langs.filter(l => l !== 'en' && l !== 'vi')]) {
  const f = lang === 'en' ? 'web/js/i18n/en.js' : `i18n/ui/${lang}.js`; // 13 ngôn ngữ: nguồn khóa nguyên câu (web/js/i18n/<lang>.js là gói khóa băm) if (!fs.existsSync(f)) { ok(false, 'thiếu ' + f); continue; }
  const D = dictOf(f), miss = keys.filter(k => !D[k] || D[k] === k || /[ăđơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]/i.test(D[k])); // chữ chỉ tiếng Việt có
  ok(!miss.length, `${lang}.js (từ điển khung) thiếu/chưa dịch khóa ExitGuard: ${miss.join(' | ')}`);
}

// ---------- 2–6) hành vi (jsdom, App giả tối giản) ----------
const html = '<!doctype html><html><body><main id="view"></main><div id="modal" hidden></div></body></html>';
const boot = async () => {
  const dom = new JSDOM(html, { url: 'https://lexkite.test/app/#/home', runScripts: 'outside-only', pretendToBeVisual: true });
  const w = dom.window, d = w.document, errors = [];
  w.addEventListener('error', e => errors.push(e.message));
  // jsdom không có layout → nút coi như nhìn thấy, 48×48 ở đầu màn
  w.HTMLElement.prototype.getBoundingClientRect = function () { return { top: 10, left: 10, width: 48, height: 48, right: 58, bottom: 58 }; };
  const gcs = w.getComputedStyle.bind(w); w.getComputedStyle = (el, ps) => (ps ? { content: 'none' } : gcs(el)); // jsdom chưa có ::before
  const DICT = { 'Thoát bài học': 'Quit lesson' }; w.t = s => DICT[s] || s;
  const PAGES = {
    home: () => '<h1>Home</h1><a href="#/quick">Quick</a>',
    me: () => '<h1>Me</h1>',
    quick: () => '<div class="study-top"><a class="icon-btn" href="#/home" aria-label="Quit lesson"><svg><use href="#i-x"/></svg></a></div><div class="wn-slot" data-notes="cat" data-done="1">notes</div><button class="option" id="opt">cat</button>',
  };
  const App = w.App = { routes: PAGES, renders: 0, route() { App.renders++; const name = (/^#\/([^/?]*)/.exec(w.location.hash) || [])[1] || 'home'; d.getElementById('view').innerHTML = (PAGES[name] || PAGES.home)(); if (App.afterRoute) App.afterRoute(name); } };
  w.UI = { modal: h => { const m = d.getElementById('modal'); m.innerHTML = h; m.hidden = false; m.querySelectorAll('[data-close]').forEach(b => { b.onclick = () => { m.hidden = true; }; }); return m; }, closeModal: () => { d.getElementById('modal').hidden = true; } };
  w.eval(SRC);
  w.addEventListener('hashchange', () => App.route()); // app.js nạp SAU exit-guard.js (web/app/index.html) → cùng thứ tự
  d.dispatchEvent(new w.Event('DOMContentLoaded'));
  await tick(5);
  App.route();
  return { w, d, App, errors };
};
const tick = (ms = 30) => new Promise(r => setTimeout(r, ms));
const modalOpen = d => !d.getElementById('modal').hidden;
const press = (E, sel) => { const b = E.d.querySelector(sel); ok(b, 'có nút ' + sel); if (b) b.click(); };
const toQuick = async E => { E.w.location.hash = '#/quick'; await tick(); };
// back/vuốt mà trình duyệt chỉ bắn popstate (không hashchange): URL đổi rồi popstate
const popOnly = async (E, h) => { E.w.History.prototype.replaceState.call(E.w.history, null, '', h); /* lượt duyệt lịch sử thật: URL đổi, không qua history.replaceState của app */ E.w.dispatchEvent(new E.w.PopStateEvent('popstate', { state: null })); await tick(); };

{ // 2) Esc chưa làm gì → rời màn
  const E = await boot(); await toQuick(E);
  ok(E.d.body.classList.contains('lk-learn'), 'quick là màn học');
  ok(E.d.querySelector('#view [data-exit]'), 'gắn [data-exit] vào nút thoát sẵn có');
  E.d.dispatchEvent(new E.w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); await tick(250);
  ok(E.w.location.hash === '#/home' && /Home/.test(E.d.getElementById('view').textContent), 'Esc khi chưa làm gì → về #/home (đang ' + E.w.location.hash + ')');
  ok(!E.errors.length, 'không lỗi JS: ' + E.errors.join(' | '));
}
{ // 3) đang làm dở + ô ghi chú [data-done] → Esc hỏi
  const E = await boot(); await toQuick(E);
  E.d.getElementById('opt').dispatchEvent(new E.w.Event('pointerdown', { bubbles: true }));
  ok(E.w.ExitGuard._s().dirty, 'chạm đáp án → đang làm dở');
  E.d.dispatchEvent(new E.w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); await tick();
  ok(modalOpen(E.d) && E.w.location.hash === '#/quick', 'đang dở (dù có .wn-slot[data-done]) → Esc hỏi, ở lại màn');
}
{ // 4) back chỉ có popstate, đang dở → hỏi; Tiếp tục học ở lại; back lần 2 (từ mục pushState) → hỏi; Thoát → rời màn
  const E = await boot(); await toQuick(E); await tick(900); E.w.ExitGuard.dirty(true);
  await popOnly(E, '#/home');
  ok(modalOpen(E.d) && E.w.location.hash === '#/quick' && /notes/.test(E.d.getElementById('view').textContent), 'back (popstate) khi dở → hỏi, giữ màn & URL');
  press(E, '#modal [data-exit-stay]'); await tick();
  ok(!modalOpen(E.d) && E.w.location.hash === '#/quick', '"Tiếp tục học" ở lại');
  await tick(900); await popOnly(E, '#/home');
  ok(modalOpen(E.d) && E.w.location.hash === '#/quick', 'back lần 2 (chỉ popstate) vẫn hỏi');
  press(E, '#modal [data-exit-go]'); await tick(300);
  ok(E.w.location.hash === '#/home' && /Home/.test(E.d.getElementById('view').textContent) && !E.d.body.classList.contains('lk-learn'), '"Thoát" sau back → rời màn, vẽ Home (đang ' + E.w.location.hash + ')');
}
{ // 5) chưa dở + back chỉ popstate → app vẫn vẽ trang mới
  const E = await boot(); await toQuick(E); await tick(900);
  await popOnly(E, '#/home'); await tick(250);
  ok(/Home/.test(E.d.getElementById('view').textContent) && !E.d.body.classList.contains('lk-learn'), 'back chỉ có popstate → app vẽ #/home (không đứng yên)');
}
{ // 6) đích của lượt bị giữ + hashchange theo sau bị chặn
  const E = await boot(); await toQuick(E); await tick(900); E.w.ExitGuard.dirty(true);
  E.w.History.prototype.replaceState.call(E.w.history, null, '', '#/home'); E.w.dispatchEvent(new E.w.PopStateEvent('popstate', { state: null }));
  const r0 = E.App.renders;
  E.w.dispatchEvent(new E.w.HashChangeEvent('hashchange', { oldURL: 'https://lexkite.test/app/#/quick', newURL: 'https://lexkite.test/app/#/home' })); await tick();
  ok(E.App.renders === r0 && /notes/.test(E.d.getElementById('view').textContent), 'hashchange của lượt đã giữ không vẽ lại màn học');
  // hash do app đặt bị coi là back (WebKit không có Navigation API: #/me = mục trước) → "Thoát" phải tới #/me
  const F = await boot(); F.w.location.hash = '#/me'; await tick(); await toQuick(F); await tick(900); F.w.ExitGuard.dirty(true);
  await popOnly(F, '#/me');
  ok(modalOpen(F.d), 'đổi hash sang mục trước khi dở → hỏi');
  press(F, '#modal [data-exit-go]'); await tick(300);
  ok(F.w.location.hash === '#/me' && /Me/.test(F.d.getElementById('view').textContent), '"Thoát" đi đúng đích #/me (đang ' + F.w.location.hash + ')');
}
{ // 7) màn tự đổi query (replaceState) rồi back khi dở → giữ màn đúng URL đã đổi
  const E = await boot(); await toQuick(E); await tick(900);
  E.w.history.replaceState(null, '', '#/quick?i=2'); E.w.ExitGuard.dirty(true);
  await popOnly(E, '#/home');
  ok(modalOpen(E.d) && E.w.location.hash === '#/quick?i=2', 'back sau replaceState của màn → hỏi, URL khôi phục = #/quick?i=2 (đang ' + E.w.location.hash + ')');
}
{ // 8) nút thoát < 44 (desktop: .icon-btn 36×36, .btn.sm.ghost 54×36) → hộp THẬT ≥ 44 mà điểm ảnh giữ nguyên:
  //    phần nhìn thấy chuyển vào span.lk-face (cùng lớp, cùng hộp), nút thành hộp trong suốt bọc ngoài (padding + lề âm → bố cục không đổi)
  const E = await boot(), b = E.d.createElement('a');
  b.className = 'icon-btn has-i lk-hit44'; b.href = '#/home'; b.setAttribute('aria-label', 'Exit'); b.style.cssText = 'color:red'; b.innerHTML = '<svg class="i"></svg>'; E.d.body.appendChild(b);
  b.getBoundingClientRect = () => ({ top: 0, left: 0, width: 36, height: 36, right: 36, bottom: 36 });
  E.w.ExitGuard._grow(b); const S = b.style, f = b.querySelector(':scope > .lk-face');
  ok(f && f.tagName === 'SPAN' && f.classList.contains('icon-btn') && f.classList.contains('has-i') && !f.classList.contains('lk-hit44') && f.querySelector('svg.i'), 'nới: phần nhìn thấy (icon) chuyển vào span.lk-face cùng lớp');
  ok(f && f.style.width === '36px' && f.style.height === '36px' && f.style.boxSizing === 'border-box' && f.style.color === 'red' && f.style.margin === '0px', 'lk-face: đúng hộp cũ 36×36, giữ style nội tuyến (' + (f && f.style.cssText) + ')');
  ok(b.classList.contains('lk-grow') && S.paddingTop === '4px' && S.paddingLeft === '4px' && S.width === '36px' && S.boxSizing === 'content-box' && S.borderWidth === '0px', 'nút: hộp 44×44 = 36 + padding 4 (' + S.cssText + ')');
  ok(S.marginTop === '-4px' && S.marginLeft === '-4px', 'nút: lề −4 px → bố cục không đổi');
  ok(b.getAttribute('href') === '#/home' && b.getAttribute('aria-label') === 'Exit', 'nút giữ href/aria (handler, id không đổi)');
  const css = fs.readFileSync('web/css/style.css', 'utf8');
  ok(/\.lk-grow\s*\{[^}]*background:\s*none !important[^}]*border-color:\s*transparent !important[^}]*box-shadow:\s*none !important[^}]*opacity:\s*1 !important/.test(css), 'style.css: hộp bọc (.lk-grow) không vẽ gì – chỉ .lk-face vẽ');
  const gb = E.d.createElement('button'); gb.className = 'btn sm ghost'; gb.id = 'mkQuit'; gb.textContent = 'Quit'; E.d.body.appendChild(gb);
  gb.getBoundingClientRect = () => ({ top: 0, left: 0, width: 54, height: 35.99, right: 54, bottom: 35.99 });
  E.w.ExitGuard._grow(gb); const gp = parseFloat(gb.style.paddingTop);
  ok(gb.id === 'mkQuit' && gb.querySelector('.lk-face.btn.ghost') && gb.style.paddingLeft === '0px' && 35.99 + 2 * gp >= 44 && gp * 64 === Math.round(gp * 64) && gb.style.marginTop === -gp + 'px', 'nút ghost 54×35.99: cao ≥ 44 (không hụt vì số lẻ), bước 1/64 px, id giữ trên nút (' + gb.style.cssText + ')');
  { // hồi quy exit-sweep /mock/run @768: phông web nạp SAU khi nới → chữ rộng 51,7 → 54 px; hộp đã nới phải đo lại theo cỡ thật
    const v = E.d.getElementById('view') || E.d.body, fb = E.d.createElement('button'); fb.className = 'btn sm ghost'; fb.setAttribute('data-exit', ''); fb.textContent = 'Quit'; v.appendChild(fb);
    let wd = 51.6875; fb.getBoundingClientRect = () => ({ top: 0, left: 0, width: wd, height: 36.39, right: wd, bottom: 36.39 });
    E.w.ExitGuard._grow(fb); const w0 = fb.querySelector('.lk-face').style.width;
    wd = 54; E.w.ExitGuard._regrow(); const fc = fb.querySelector(':scope > .lk-face');
    ok(w0 === '51.6875px' && fc && fc.style.width === '54px' && fb.style.width === '54px' && fb.querySelectorAll('.lk-face').length === 1, 'phông nạp xong → nút đã nới đo lại theo chữ thật (51,69 → 54 px), không lồng lk-face: ' + (fc && fc.style.width));
    fb.remove(); }
  E.w.ExitGuard._ungrow(b); ok(!b.dataset.lkGrow && !b.classList.contains('lk-grow') && !b.querySelector('.lk-face') && b.querySelector(':scope > svg.i') && S.cssText === 'color: red;', 'gỡ nới → về đúng DOM & style cũ (' + S.cssText + ')');
}
{ // 7) Enter = nút chính của bước (khung chung docs/specs/learn-flow-nav.md); không bắt khi đang ở nút/ô gõ hoặc hộp hỏi mở; thanh FOCUS bật mặc định
  const E = await boot(); await toQuick(E);
  const v = E.d.getElementById('view'); let hits = 0;
  v.insertAdjacentHTML('beforeend', '<button id="nextQ" disabled>Next</button><button id="chk" data-lk-primary>Check</button><input id="inp">');
  E.d.getElementById('chk').onclick = () => { hits++; };
  ok(E.w.ExitGuard.primary() && E.w.ExitGuard.primary().id === 'chk', 'primary(): bỏ nút bị khoá, chọn [data-lk-primary]');
  E.d.body.dispatchEvent(new E.w.KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
  ok(hits === 1, 'Enter (không ở nút/ô gõ) → bấm nút chính');
  E.d.getElementById('inp').focus(); E.d.getElementById('inp').dispatchEvent(new E.w.KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
  ok(hits === 1, 'Enter trong ô gõ → để màn tự xử lý (không bấm hai lần)');
  E.d.getElementById('inp').blur(); E.d.getElementById('modal').hidden = false;
  E.d.body.dispatchEvent(new E.w.KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
  ok(hits === 1, 'Enter khi hộp hỏi mở → không bấm nút của màn'); E.d.getElementById('modal').hidden = true;
  ok(E.d.body.classList.contains('focus'), 'thanh FOCUS bật mặc định ở màn học (tắt: lk.exitbar = 0)');
}
{ // 9) #/review?hub=1 (thanh tab, ux1) = màn "Ôn" trung tâm Stitch → không phải màn học: không chèn thanh FOCUS (lỗi #432: stitch-diff review ssim 0.19)
  const E = await boot(), G = E.w.ExitGuard;
  E.App.ux1On = () => true;
  ok(!G.isLearn('review', '', 'hub=1') && G.isLearn('review', '', '') && G.isLearn('review', '', 'ahead=1'), 'isLearn: hub Ôn (ux1) không phải màn học; phiên ôn #/review vẫn là màn học');
  E.App.ux1On = () => false;
  ok(G.isLearn('review', '', 'hub=1'), 'isLearn: ux1 tắt → study.js mở phiên ôn ngay cả với ?hub=1 → vẫn là màn học');
}
{ // 10) đua điều hướng (route-race, #743): URL đã sang trang khác nhưng `cur` còn là màn học cũ (App.afterRoute chưa chạy) → #view đổi nội dung KHÔNG được chèn thanh thoát vào trang mới
  const E = await boot(); await toQuick(E);
  ok(E.d.body.classList.contains('lk-learn'), 'quick là màn học (đua điều hướng)');
  E.w.History.prototype.replaceState.call(E.w.history, null, '', '#/me'); // URL đổi, afterRoute chưa chạy
  E.d.getElementById('view').innerHTML = '<h1>Me</h1>'; await tick(80);
  ok(!E.d.querySelector('#view [data-exit], #view .lk-exitbar'), 'trang đã sang #/me: không bị chèn thanh thoát của màn học cũ');
  ok(!E.errors.length, 'không lỗi JS: ' + E.errors.join(' | '));
}
console.log(fails ? `✗ exit-guard: ${fails}/${n} lỗi` : `✓ exit-guard: ${n} kiểm tra`);
process.exit(fails ? 1 : 0);
