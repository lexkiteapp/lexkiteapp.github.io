// Test content script "mồ côi": sau khi add-on tải lại/cập nhật, bản content.js + writecheck.js cũ ở tab đang mở mất ngữ cảnh
// (chrome.runtime.id = undefined, mọi chrome.* ném "Extension context invalidated"). Yêu cầu: KHÔNG ném lỗi nào khi sự kiện/timer/promise
// chạy tiếp, tự gỡ UI + listener, và bản chạy sau (tiêm lại) tắt bản trước (không bind đôi). jsdom, không mạng.
// Chạy: node scripts/test/ext-orphan.mjs
import fs from 'node:fs';
import jsdom from 'jsdom';
const { JSDOM } = jsdom;
let fails = 0, n = 0; const ok = (c, m) => { n++; if (!c) { fails++; console.log('✗', m); } };
const rd = f => fs.readFileSync(new URL('../../' + f, import.meta.url), 'utf8');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const INV = () => { throw new Error('Extension context invalidated.'); };

function mk() {
  const dom = new JSDOM('<!doctype html><html><body><p id="p">Hello world</p><textarea id="t"></textarea></body></html>', { url: 'https://example.org/', runScripts: 'outside-only', pretendToBeVisual: true });
  const w = dom.window, errors = [], bag = { msg: [], store: [] };
  Object.defineProperty(w.navigator, 'webdriver', { get: () => true });
  w.addEventListener('error', e => { if (!String(e.filename || '').startsWith('chrome-extension://')) errors.push(String(e.message)); }); // ErrorEvent giả của chính test bị bỏ qua
  const rt = { id: 'ext1', getManifest: () => ({ version: '9.9.9' }), sendMessage: async () => ({}), onMessage: { addListener: f => bag.msg.push(f), removeListener: f => { bag.msg = bag.msg.filter(x => x !== f); } } };
  const store = { uiLang: 'vi', settings: { autoSpeak: false }, cards: { hello: { word: 'hello', vi: 'xin chào' } } };
  const st = { addListener: f => bag.store.push(f), removeListener: f => { bag.store = bag.store.filter(x => x !== f); } };
  w.chrome = { runtime: rt, storage: { local: { get: async k => (typeof k === 'string' ? { [k]: store[k] } : Object.fromEntries([].concat(k).map(x => [x, store[x]]))), set: async o => Object.assign(store, o) }, onChanged: st }, i18n: { getUILanguage: () => 'vi' } };
  const kill = () => { // giống Chrome sau khi add-on bị thay thế
    rt.id = undefined; rt.sendMessage = INV; rt.getManifest = INV;
    w.chrome.storage.local.get = INV; w.chrome.storage.local.set = INV;
    Object.defineProperty(w.chrome.runtime.onMessage, 'addListener', { value: INV }); Object.defineProperty(st, 'addListener', { value: INV });
  };
  const load = () => { for (const f of ['extension/app/js/structures.js', 'extension/app/js/writecheck-rules.js', 'extension/content.js', 'extension/writecheck.js']) w.eval(rd(f)); };
  return { w, errors, bag, kill, load };
}
const fire = (w, t, type, init = {}) => t.dispatchEvent(new w.MouseEvent(type, { bubbles: true, cancelable: true, clientX: 5, clientY: 5, ...init }));

// 1) Sống bình thường: nghe đủ, có thể mở bảng tra
{
  const a = mk(); a.load(); await sleep(40);
  ok(a.bag.msg.length >= 1 && a.bag.store.length >= 1, 'đăng ký listener chrome khi còn sống');
  ok(a.w.__lkCS && a.w.__lkWC, 'có token phiên bản ở window');
  a.w.close();
}

// 2) Mồ côi: mọi đường vào không ném lỗi, tự gỡ
{
  const a = mk(), { w } = a; a.load(); await sleep(40);
  const p = w.document.getElementById('p'), t = w.document.getElementById('t');
  // mở một bảng tra để có UI cần gỡ
  a.bag.msg.forEach(f => f({ type: 'showLookup', word: 'hello' }, {}, () => {})); await sleep(60);
  const hadUi = !!w.document.querySelector('ielts-lexi-popup');
  let rej = 0; const onRej = () => rej++; process.on('unhandledRejection', onRej);
  a.kill();
  const listeners = [...a.bag.msg, ...a.bag.store];
  for (const ty of ['dblclick', 'mouseup', 'mousedown', 'click', 'mouseover', 'mouseout']) fire(w, p, ty);
  fire(w, t, 'mouseup');
  for (const ty of ['keydown', 'keyup']) w.document.dispatchEvent(new w.KeyboardEvent(ty, { key: 'Escape', bubbles: true }));
  w.document.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'a', bubbles: true }));
  for (const ty of ['focusin', 'focusout', 'input']) t.dispatchEvent(new w.Event(ty, { bubbles: true }));
  w.dispatchEvent(new w.Event('scroll')); w.dispatchEvent(new w.Event('resize'));
  w.document.dispatchEvent(new w.Event('fullscreenchange'));
  w.dispatchEvent(new w.MessageEvent('message', { source: w, origin: w.location.origin, data: { lkBridge: 'req', op: 'get', id: 1 } }));
  w.document.dispatchEvent(new w.CustomEvent('ielts-lexi-takeover', { detail: 'ext1' }));
  let thrown = null;
  try { listeners.forEach(f => { f({ settings: { newValue: {} }, cards: {}, uiLang: { newValue: 'en' } }, 'local'); f({ type: 'showLookup', word: 'x' }, {}, () => {}); f({ type: 'translateSelection' }, {}, () => {}); }); } catch (e) { thrown = e; }
  w.document.body.appendChild(w.document.createElement('div')); // MutationObserver
  w.dispatchEvent(new w.ErrorEvent('error', { message: 'x', filename: 'chrome-extension://ext1/content.js', error: new Error('Extension context invalidated.') }));
  w.dispatchEvent(new w.Event('unhandledrejection'));
  await sleep(2200); // timer 1500 ms của observer đánh dấu + debounce soát lỗi
  process.off('unhandledRejection', onRej);
  ok(!thrown, 'listener chrome không ném khi mồ côi: ' + (thrown && thrown.message));
  ok(a.errors.length === 0, 'không có lỗi chưa bắt: ' + a.errors.join(' | '));
  ok(rej === 0, 'không có promise bị từ chối chưa bắt');
  ok(!w.document.querySelector('ielts-lexi-popup') && !w.document.querySelector('lexkite-wc'), 'UI đã chèn bị gỡ (có UI trước đó: ' + hadUi + ')');
  ok(!w.document.querySelector('vb-mark'), 'không còn vb-mark');
  ok(!w.__lkCS && !w.__lkWC, 'token window được dọn');
  // sau khi đã tắt: sự kiện tiếp theo cũng im lặng
  fire(w, p, 'dblclick'); await sleep(50);
  ok(a.errors.length === 0, 'sau khi tắt vẫn không lỗi');
  w.close();
}

// 3) Tiêm lại (background executeScript) cùng thế giới: bản cũ đứng yên, không bind đôi
{
  const a = mk(), { w } = a; a.load(); await sleep(30);
  const first = w.__lkCS; let shows = 0;
  w.document.addEventListener('ielts-lexi-probe', () => {});
  a.load(); await sleep(30);
  ok(w.__lkCS && w.__lkCS !== first, 'bản mới giữ token');
  const before = a.bag.msg.length;
  // chỉ còn 1 bản nghe onMessage (bản cũ đã gỡ listener)
  ok(before === 1, 'chỉ 1 listener onMessage sau tiêm lại (có ' + before + ')');
  ok(w.document.querySelectorAll('ielts-lexi-popup').length <= 1, 'không có 2 host');
  ok(a.errors.length === 0, 'tiêm lại không lỗi');
  w.close();
}

console.log(fails ? `\n${fails}/${n} lỗi` : `ext-orphan: ${n} kiểm tra OK`);
process.exit(fails ? 1 : 0);
