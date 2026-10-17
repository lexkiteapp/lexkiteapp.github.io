// Test bảng "🌐 Dịch đoạn đã chọn" của add-on (extension/content.js) + chuỗi AI "🤖 Giải thích sâu" và dịch tự nhận ngôn ngữ
// (extension/background.js + web/js/dictionary.js) – KHÔNG mạng, KHÔNG trình duyệt thật (jsdom + vm, chrome.*/fetch/LanguageModel giả lập).
// Bắt các lỗi đã gặp (ảnh chụp trên trang GitHub Actions, đoạn "Kiểm thử add-on (E2E): Some jobs were not successful"):
//  (1) "AI is not enabled … add your free Gemini key" – AI miễn phí có sẵn nhưng add-on lại đòi khóa;
//  (2) đoạn lẫn Việt + Anh không có bản dịch (chữ "ể", "ử" nằm ngoài dải À-ɏ → bị coi là tiếng Anh → EN→EN, ẩn bản dịch);
//  (3) "Tra từng từ" cắt "thử" thành "th" và đưa cả từ tiếng Việt vào;
//  (4) chip ngôn ngữ "EN" mơ hồ, nút 📋 không có nhãn, Esc không đóng bảng.
// Chạy: node scripts/test/ext-selection.mjs
import fs from 'node:fs';
import vm from 'node:vm';
import { webcrypto } from 'node:crypto';
import jsdom from 'jsdom';
const { JSDOM } = jsdom;
let fails = 0, n = 0; const ok = (c, m) => { n++; if (!c) { fails++; console.log('✗', m); } };
const rd = f => fs.readFileSync(new URL('../../' + f, import.meta.url), 'utf8');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const MIXED = 'Kiểm thử add-on (E2E): Some jobs were not successful';
const LANGS = ['es', 'pt', 'fr', 'de', 'id', 'th', 'zh', 'ja', 'ko', 'hi', 'ar', 'ru', 'tr'];
const loadDict = l => { const g = {}; new Function('self', rd(`web/js/i18n/${l}.js`))(g); return g.I18N_DICT[l]; };

// ---------- 1) Bảng dịch trong trang (content.js) ----------
async function page(uiLang, opts = {}) {
  const dom = new JSDOM('<!doctype html><html><head></head><body><p id="p">Kiểm thử add-on (E2E): Some jobs were not successful</p></body></html>', { url: 'https://github.example.org/actions/runs/1', runScripts: 'outside-only', pretendToBeVisual: true });
  const w = dom.window;
  Object.defineProperty(w.navigator, 'webdriver', { get: () => true });
  Object.defineProperty(w.navigator, 'language', { get: () => opts.navLang || 'en-US' });
  if (opts.lm) w.LanguageModel = opts.lm;
  const store = { uiLang, settings: { autoSpeak: false } }, sent = [], listeners = [];
  w.chrome = {
    runtime: {
      id: 'ext1', getManifest: () => ({ version: '9.9.9' }),
      sendMessage: async msg => {
        sent.push(msg);
        if (msg.type === 'uiDict') return { dict: opts.dict || {} };
        if (msg.type === 'extJson') return { data: {} };
        if (opts.on && opts.on[msg.type]) { await sleep(5); return opts.on[msg.type](msg); }
        return {};
      },
      onMessage: { addListener: f => listeners.push(f) },
    },
    storage: { local: { get: async k => (typeof k === 'string' ? { [k]: store[k] } : Object.fromEntries([].concat(k).map(x => [x, store[x]]))), set: async o => Object.assign(store, o) }, onChanged: { addListener() {} } },
    i18n: { getUILanguage: () => uiLang },
  };
  w.eval(rd('extension/content.js'));
  await sleep(30);
  const root = () => w.document.querySelector('ielts-lexi-popup').shadowRoot;
  // Menu chuột phải "Dịch đoạn đã chọn" / tra đoạn không phải từ đơn → translateSelection
  const select = async text => { listeners.forEach(f => f({ type: 'showLookup', word: text }, {}, () => {})); await sleep(120); };
  return { w, root, select, sent, store };
}
const chips = r => [...r.querySelectorAll('.lw.chipw')].map(x => x.textContent);

// (3) Tách từ: Unicode-aware, chỉ từ tiếng Anh, bỏ từ chức năng, không cắt chữ
{
  const tr = { vi: 'Testing add-on (E2E): Some jobs were not successful', src: 'vi', tl: 'en' };
  const p = await page('en', { navLang: 'vi-VN', on: { translate: () => tr } });
  await p.select(MIXED);
  const r = p.root(), c = chips(r);
  ok(JSON.stringify(c) === JSON.stringify(['add-on', 'jobs', 'successful']), `tra từng từ (đoạn lẫn Việt + Anh) = add-on, jobs, successful (được: ${c.join(', ')})`);
  ok(!c.some(x => /^(th|kiểm|thử|kiem|were|not|some)$/i.test(x)), 'không có mẩu chữ bị cắt ("th") hay từ tiếng Việt / từ chức năng');
  ok([...r.querySelectorAll('.lw.chipw')].every(x => x.tagName === 'BUTTON'), 'ô tra từ là <button> (dùng được bằng bàn phím)');
  // (2) Dịch: nguồn tự nhận + gợi ý vi, không bao giờ để trống
  const m = p.sent.find(x => x.type === 'translate');
  ok(m && m.sl === 'auto' && m.hint === 'vi' && m.tl === 'en', `đoạn lẫn Việt + Anh → sl=auto, hint=vi, tl=en (được: ${m && [m.sl, m.hint, m.tl].join('/')})`);
  ok(r.querySelector('#tr').textContent.includes('Testing add-on'), 'hiện bản dịch tiếng Anh cho đoạn lẫn Việt + Anh');
  ok(r.querySelector('#lang').textContent === 'VI → EN', `chip ngôn ngữ dạng "VI → EN" (được: ${r.querySelector('#lang').textContent})`);
  ok(/→/.test(r.querySelector('#lang').title) && /Vietnamese/.test(r.querySelector('#lang').title), 'chip ngôn ngữ có chú thích tên ngôn ngữ đầy đủ');
  ok(!r.querySelector('#listen').hidden && !r.querySelector('#deep').hidden, 'đã có bản tiếng Anh → nút Nghe + Giải thích sâu hiện');
  // (4) Thứ bậc nút + nhãn
  ok(r.querySelector('#deep').classList.contains('p') && !r.querySelector('#listen').classList.contains('p'), 'nút chính = Giải thích sâu; Nghe là nút phụ');
  const cp = r.querySelector('#copy');
  ok(cp && cp.getAttribute('aria-label') === 'Copy translation' && cp.title === 'Copy translation', 'nút 📋 có aria-label + tooltip "Copy translation"');
  ok(r.querySelector('#close').getAttribute('aria-label'), 'nút đóng có aria-label');
  ok(r.querySelector('.box').getAttribute('role') === 'dialog', 'bảng có role="dialog"');
  ok(!r.querySelector('.box').querySelector('[style]'), 'không dùng thuộc tính style bên trong bảng (CSP style-src chặn)');
  // Esc đóng bảng
  p.w.document.dispatchEvent(new p.w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  ok(r.querySelector('.box').hidden, 'Esc đóng bảng dịch');
  p.w.close();
}
// Chữ ở dạng NFD (dấu tổ hợp tách rời) + lặp từ + giới hạn 10 + viết tắt
{
  const long = 'The API returned errors and errors again while the pipeline deployed builds, uploaded artifacts, cached modules, signed packages, notified reviewers, archived logs and published releases';
  const p = await page('en', { on: { translate: () => ({ vi: '', src: 'en', tl: 'en', same: true }) } });
  await p.select(MIXED.normalize('NFD')); let c = chips(p.root());
  ok(JSON.stringify(c) === JSON.stringify(['add-on', 'jobs', 'successful']), `chữ NFD (dấu tổ hợp) vẫn tách đúng (được: ${c.join(', ')})`);
  await p.select(long); c = chips(p.root());
  ok(c.length === 10 && new Set(c).size === c.length, `tối đa 10 từ, không trùng (được ${c.length})`);
  ok(c[0] === 'API' && p.root().querySelector('.lw.chipw').dataset.w === 'api', 'viết tắt giữ chữ hoa (API), tra bằng chữ thường');
  // Đã là tiếng Anh + giao diện tiếng Anh → ghi chú rõ ràng, không để trống
  ok(/already in English/.test(p.root().querySelector('#tr').textContent) && p.root().querySelector('#lang').textContent === 'EN', 'đoạn tiếng Anh + đích tiếng Anh → ghi chú "already in English", chip "EN"');
  p.w.close();
}
// Dịch lỗi → thông báo + Thử lại (không bao giờ để trống)
{
  let calls = 0;
  const p = await page('en', { navLang: 'vi-VN', on: { translate: () => (++calls === 1 ? { vi: '' } : { vi: 'Testing add-on', src: 'vi', tl: 'en' }) } });
  await p.select(MIXED);
  const r = p.root();
  ok(r.querySelector('#tr .err') && /Could not translate/.test(r.querySelector('#tr').textContent) && r.querySelector('#retry'), 'bản dịch rỗng → báo lỗi rõ ràng + nút Thử lại');
  r.querySelector('#retry').click(); await sleep(120);
  ok(calls === 2 && p.root().querySelector('#tr').textContent.includes('Testing add-on'), 'bấm Thử lại → dịch lại và hiện kết quả');
  p.w.close();
}
// Đoạn đã ở ngôn ngữ người học (tiếng Việt, giao diện vi) → dịch sang tiếng Anh, có ghi chú
{
  const p = await page('vi', { navLang: 'vi-VN', on: { translate: () => ({ vi: 'Testing is important', src: 'vi', tl: 'en' }) } });
  await p.select('Kiểm thử là việc rất quan trọng');
  const r = p.root();
  ok(r.querySelector('#tr').textContent.includes('Testing is important') && r.querySelector('#tr .note'), 'nguồn trùng đích → hiện bản tiếng Anh + ghi chú');
  ok(chips(r).length === 0, 'đoạn toàn tiếng Việt → không có ô tra từ tiếng Anh');
  p.w.close();
}

// (1) Giải thích sâu: không bao giờ đòi khóa; thông báo thân thiện theo mã lỗi
for (const [code, re, retry] of [['QUOTA_DAY', /Daily free AI limit reached – try again tomorrow/, false], ['OFFLINE', /unavailable offline/, true], ['BUSY', /busy right now/, true], ['FAILED', /Could not analyze/, true], ['NO_KEY', /Could not analyze/, true]]) {
  const p = await page('en', { on: { translate: () => ({ vi: '', src: 'en', tl: 'en', same: true }), explain: () => ({ error: code }) } });
  await p.select('We need to take action on climate change now');
  p.root().querySelector('#deep').click(); await sleep(80);
  const out = p.root().querySelector('#aiEx').textContent;
  ok(re.test(out), `${code}: thông báo thân thiện (${out.trim().slice(0, 70)})`);
  ok(!/Gemini|API key|key|Settings|not enabled/i.test(out) && !p.root().querySelector('#openSet'), `${code}: không nhắc khóa / mở Cài đặt`);
  ok(!!p.root().querySelector('#aiRetry') === retry, `${code}: nút Thử lại ${retry ? 'có' : 'không có (hết lượt hôm nay)'}`);
  p.w.close();
}
// AI trên máy (Gemini Nano) có sẵn trong tab → chạy tại chỗ, gửi kết quả cho background chỉ để dịch phần giải thích
{
  let created = 0;
  const lm = { availability: async () => 'available', create: async () => { created++; return { prompt: async () => 'Sure: {"meaning":"act now","structure":[{"pattern":"take action on sth","explain":"do something about"}],"grammar":"need to + V","collocations":["take urgent action"],"examples":[{"en":"We must take action."}],"tip":"Use in Task 2"}', destroy() {} }; } };
  const p = await page('en', { lm, on: { translate: () => ({ same: true, src: 'en', tl: 'en' }), explain: m => (m.local ? { result: m.local, via: 'device' } : { error: 'FAILED' }) } });
  await p.select('We need to take action on climate change now');
  p.root().querySelector('#deep').click(); await sleep(120);
  const ex = p.sent.filter(m => m.type === 'explain');
  ok(created === 1 && ex.length === 1 && ex[0].local && ex[0].local.meaning === 'act now', '(a) AI trên máy chạy trước, kết quả gửi kèm local');
  ok(/act now/.test(p.root().querySelector('#aiEx').textContent) && /On-device AI/.test(p.root().querySelector('#aiEx').textContent), 'hiện giải thích + nhãn "On-device AI – private"');
  p.w.close();
}
// AI trên máy chỉ 'downloadable' → KHÔNG tự tải ngầm; dùng AI máy chủ + nút bật 1 chạm
{
  let created = 0; const lm = { availability: async () => 'downloadable', create: async o => { created++; if (o && o.monitor) { const t = new EventTarget(); o.monitor(t); const e = new Event('downloadprogress'); e.loaded = 0.5; t.dispatchEvent(e); } return { destroy() {} }; } };
  const p = await page('en', { lm, on: { translate: () => ({ same: true, src: 'en', tl: 'en' }), explain: () => ({ result: { meaning: 'hành động ngay' }, via: 'server', left: 7, nano: 'downloadable' }) } });
  await p.select('We need to take action on climate change now');
  p.root().querySelector('#deep').click(); await sleep(80);
  ok(created === 0, "'downloadable' → không gọi LanguageModel.create khi chưa bấm (không tải ~2 GB ngầm)");
  ok(/7 free AI explanations left today/.test(p.root().querySelector('#aiEx').textContent), 'AI máy chủ: hiện số lượt miễn phí còn lại');
  const nb = p.root().querySelector('#nanoOn');
  ok(nb && /Enable on-device AI \(free, private\)/.test(nb.textContent), 'đề nghị "Enable on-device AI (free, private)"');
  nb.click(); await sleep(30);
  ok(created === 1 && /ready/.test(nb.textContent), 'bấm → tải AI trên máy (có tiến độ) → "On-device AI is ready"');
  p.w.close();
}
// 15 ngôn ngữ: mọi chữ mới của bảng dịch có bản dịch thật ở từng ngôn ngữ (không lộ tiếng Việt / tiếng Anh)
{
  const cs = rd('extension/content.js'), EN = (() => { const g = {}; for (const f of ['en.js', 'en/extpanel.js']) new Function('self', rd('web/js/i18n/' + f))(g); return g.I18N_DICT.en; })(); // extpanel: nhóm tải lười, chỉ add-on dùng
  const NEW = ['Hết lượt AI miễn phí hôm nay – thử lại vào ngày mai.', 'AI đang bận – thử lại sau ít phút.', 'AI không dùng được khi ngoại tuyến – kết nối mạng rồi thử lại.', '⚡ Bật AI trên máy (miễn phí, riêng tư)', 'Chrome tải AI trên máy một lần (~2 GB) – sau đó dùng được cả khi ngoại tuyến.', '⬇️ Đang tải AI trên máy… {pct}%', '✓ AI trên máy đã sẵn sàng', 'Không bật được AI trên máy – thử lại sau.', '💻 AI trên máy – riêng tư, không gửi đi đâu', '🎁 Còn {n} lượt AI miễn phí hôm nay', 'Ngôn ngữ nhận diện → ngôn ngữ dịch', 'Chép bản dịch', 'Đoạn này đã là tiếng Anh – nghe, tra từng từ hoặc xem giải thích sâu bên dưới.', 'Đoạn này đã ở ngôn ngữ của bạn nên được dịch sang tiếng Anh.', 'Thử lại', 'Nghe cả câu', 'Nghe chậm'];
  for (const k of NEW) ok(cs.includes(`'${k}'`) && EN[k], `"${k.slice(0, 40)}": có trong bảng EN của content.js và web en.js / en/extpanel.js`);
  for (const l of LANGS) { const D = loadDict(l); const miss = NEW.filter(k => !D[k] || /[ạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹđ]/i.test(D[k])); ok(!miss.length, `[${l}] đủ bản dịch chữ mới (thiếu: ${miss.slice(0, 3).join(' | ')})`); }
  ok(!/khóa Gemini miễn phí của bạn|NO_KEY|Open Settings/.test(cs), 'content.js không còn thông báo đòi khóa Gemini / NO_KEY');
  // Giao diện tiếng Nhật với từ điển thật → thông báo hết lượt bằng tiếng Nhật
  const ja = loadDict('ja');
  const p = await page('ja', { dict: ja, navLang: 'ja-JP', on: { translate: () => ({ vi: '行動を起こす必要がある', src: 'en', tl: 'ja' }), explain: () => ({ error: 'QUOTA_DAY' }) } });
  await p.select('We need to take action on climate change now');
  p.root().querySelector('#deep').click(); await sleep(80);
  ok(p.root().querySelector('#aiEx').textContent.includes(ja['Hết lượt AI miễn phí hôm nay – thử lại vào ngày mai.']), '[ja] thông báo hết lượt AI theo tiếng Nhật');
  ok(p.root().querySelector('#copy').getAttribute('aria-label') === ja['Chép bản dịch'], '[ja] nhãn nút chép theo tiếng Nhật');
  ok(p.root().querySelector('#lang').textContent === 'EN → JA', '[ja] chip "EN → JA"');
  p.w.close();
}

// ---------- 2) background.js: chuỗi AI + dịch tự nhận ngôn ngữ ----------
const store = {}, fetches = [];
let route = () => null;
const resp = (status, body) => ({ ok: status >= 200 && status < 300, status, headers: { get: () => null }, json: async () => body, text: async () => JSON.stringify(body), clone() { return this; } });
const fakeFetch = async (url, init = {}) => {
  url = String(url); fetches.push({ url, init });
  const r = route(url, init); if (r instanceof Error) throw r; if (r) return r;
  if (url.includes('translate.googleapis.com')) { const q = decodeURIComponent((url.match(/[?&]q=([^&]*)/) || [])[1] || ''); return resp(200, { sentences: [{ trans: 'TR:' + q }], src: 'en' }); }
  return resp(404, null);
};
const deep = () => new Proxy(function () {}, { get: (t, k) => (k === 'then' ? undefined : deep()), apply: () => Promise.resolve(undefined) });
let onMsg = null;
const chromeMock = new Proxy({}, { get: (t, k) => {
  if (k === 'runtime') return new Proxy({}, { get: (t2, k2) => k2 === 'getManifest' ? () => ({ version: '9.9.9', update_url: 'x' }) : k2 === 'getURL' ? p => 'chrome-extension://abc/' + p : k2 === 'onMessage' ? { addListener: f => { onMsg = f; } } : k2 === 'id' ? 'abc' : deep() });
  if (k === 'storage') return { local: { get: async q => (typeof q === 'string' ? { [q]: store[q] } : Array.isArray(q) ? Object.fromEntries(q.map(x => [x, store[x]])) : { ...store }), set: async o => { Object.assign(store, JSON.parse(JSON.stringify(o))); } }, onChanged: { addListener() {} }, session: null };
  if (k === 'i18n') return { getUILanguage: () => 'en' };
  return deep();
} });
const nav = { onLine: true, language: 'en-US' };
const sw = { addEventListener() {}, console, Date, Math, JSON, Promise, Map, Set, URL, URLSearchParams, AbortController, AbortSignal, TextEncoder, Uint8Array, Event, EventTarget, setTimeout, clearTimeout, fetch: fakeFetch, crypto: webcrypto, navigator: nav, chrome: chromeMock, location: { hostname: 'abc' } };
sw.self = sw; sw.globalThis = sw; vm.createContext(sw);
for (const f of ['web/js/data.js', 'web/js/core.js', 'web/js/vi-check.js', 'web/js/dictionary.js', 'extension/background.js']) vm.runInContext(rd(f), sw, { filename: f });
await sleep(20);
ok(typeof onMsg === 'function', 'background: đăng ký onMessage');
const send = msg => new Promise(res => onMsg(msg, { tab: { id: 1 } }, res));
const EXPL = { meaning: 'hành động', structure: [{ pattern: 'take action', explain: 'làm gì đó' }], grammar: 'need to + V', collocations: ['take urgent action'], examples: [{ en: 'Act now.', vi: 'Hãy hành động.' }], tip: 'Task 2' };
const reset = () => { fetches.length = 0; delete sw.LanguageModel; nav.onLine = true; for (const k of Object.keys(store)) delete store[k]; };
const idx = re => fetches.findIndex(f => re.test(f.url));
let seq = 0; const q = () => `take action on climate change ${++seq}`;

// (b) không có AI trên máy → AI miễn phí của Lexkite, có mã thiết bị
reset(); route = url => (/lexkite\.com\/api\/ai/.test(url) ? resp(200, { out: { ...EXPL }, left: 9, model: 'workers-ai' }) : null);
let r = await send({ type: 'explain', text: q(), sentence: '', lang: 'vi' });
const ai = fetches.find(f => /api\/ai/.test(f.url));
ok(r.result && r.via === 'server' && r.left === 9, `(b) AI máy chủ trả kết quả + lượt còn lại (được ${JSON.stringify(r).slice(0, 80)})`);
ok(ai && /^[a-z0-9]{16,64}$/.test(ai.init.headers['X-Lexkite-Device']) && !ai.init.headers.Authorization, '(b) gửi mã thiết bị ẩn danh, không cần đăng nhập/khóa');
ok(JSON.parse(ai.init.body).prompt.length >= 40 && /Vietnamese/.test(JSON.parse(ai.init.body).prompt), '(b) prompt hợp lệ cho /api/ai, giải thích theo ngôn ngữ người học');
ok(idx(/generativelanguage/) < 0, '(b) không gọi Gemini trực tiếp khi không có khóa');
// bộ nhớ đệm: bấm lại cùng đoạn không tốn lượt
fetches.length = 0; const again = await send({ type: 'explain', text: `take action on climate change ${seq}`, sentence: '', lang: 'vi' });
ok(again.result && idx(/api\/ai/) < 0, 'giải thích lại cùng đoạn → lấy bộ nhớ đệm, không gọi máy chủ');

// (a) AI trên máy đã sẵn sàng trong service worker → dùng trước, không gọi máy chủ
reset(); let created = 0;
sw.LanguageModel = { availability: async () => 'available', create: async () => { created++; return { prompt: async () => JSON.stringify({ meaning: 'act now', structure: [], grammar: 'g', collocations: [], examples: [{ en: 'Act now.' }], tip: 't' }), destroy() {} }; } };
r = await send({ type: 'explain', text: q(), sentence: '', lang: 'en' });
ok(r.via === 'device' && created === 1 && idx(/api\/ai/) < 0, '(a) AI trên máy chạy trước, không gọi /api/ai');
// kết quả AI trên máy từ content script (msg.local) → chỉ dịch phần giải thích
reset(); r = await send({ type: 'explain', text: q(), sentence: '', lang: 'vi', local: { meaning: 'act now', examples: [{ en: 'Act now.' }] } });
ok(r.via === 'device' && /^TR:/.test(r.result.meaning) && r.result.examples[0].vi && idx(/api\/ai/) < 0, 'msg.local → dịch giải thích sang ngôn ngữ người học, không gọi /api/ai');
// 'downloadable' → không tự tải, báo nano để bảng đề nghị bật
reset(); created = 0; sw.LanguageModel = { availability: async () => 'downloadable', create: async () => { created++; return { destroy() {} }; } };
r = await send({ type: 'explain', text: q(), sentence: '', lang: 'vi' });
ok(created === 0 && r.via === 'server' && r.nano === 'downloadable', "'downloadable' → không gọi create (không tải ngầm), dùng máy chủ, trả nano='downloadable'");

// (d) hết lượt hôm nay, không có khóa → QUOTA_DAY, không bao giờ NO_KEY
reset(); route = url => (/api\/ai/.test(url) ? resp(429, { error: 'quota', msg: 'quota.daily', left: 0 }) : null);
r = await send({ type: 'explain', text: q(), sentence: '', lang: 'vi' });
ok(r.error === 'QUOTA_DAY', `hết lượt hôm nay → QUOTA_DAY (được ${r.error})`);
route = url => (/api\/ai/.test(url) ? resp(429, { error: 'quota', msg: 'quota.busy' }) : null);
r = await send({ type: 'explain', text: q(), sentence: '', lang: 'vi' }); ok(r.error === 'BUSY', 'máy chủ bận (quota.busy) → BUSY');
route = url => (/api\/ai/.test(url) ? resp(503, { error: 'ai' }) : null);
r = await send({ type: 'explain', text: q(), sentence: '', lang: 'vi' }); ok(r.error === 'BUSY', 'máy chủ lỗi 503 → BUSY');
nav.onLine = false; route = () => new TypeError('Failed to fetch');
r = await send({ type: 'explain', text: q(), sentence: '', lang: 'vi' }); ok(r.error === 'OFFLINE', 'mất mạng → OFFLINE');
nav.onLine = true;
// (c) khóa Gemini riêng (tùy chọn) chỉ dùng SAU khi AI máy chủ hết lượt
reset(); store.aiKey = 'AIza' + 'x'.repeat(30); store.aiModels = { k: store.aiKey.slice(-6), at: Date.now(), list: ['gemini-test'] };
route = url => (/api\/ai/.test(url) ? resp(429, { error: 'quota', msg: 'quota.daily' }) : /generativelanguage.*generateContent/.test(url) ? resp(200, { candidates: [{ content: { parts: [{ text: JSON.stringify(EXPL) }] } }] }) : null);
r = await send({ type: 'explain', text: q(), sentence: '', lang: 'vi' });
ok(r.via === 'key' && idx(/api\/ai/) >= 0 && idx(/api\/ai/) < idx(/generateContent/), '(c) khóa riêng chỉ dùng sau khi AI miễn phí hết lượt (thứ tự /api/ai → Gemini)');
route = url => (/api\/ai/.test(url) ? resp(429, { error: 'quota', msg: 'quota.daily' }) : /generateContent/.test(url) ? resp(400, { error: { message: 'API key not valid' } }) : null);
r = await send({ type: 'explain', text: q(), sentence: '', lang: 'vi' });
ok(r.error === 'QUOTA_DAY', `khóa riêng hỏng + hết lượt → vẫn báo QUOTA_DAY, không BAD_KEY/NO_KEY (được ${r.error})`);
ok(!/error: 'NO_KEY'|'NO_KEY'/.test(rd('extension/background.js').replace(/\/\/.*$/gm, '')), "background.js không còn trả 'NO_KEY'");

// Dịch đoạn chọn: tự nhận ngôn ngữ, không bao giờ rỗng khi còn nguồn dự phòng
reset();
const gtxRoute = (fn) => url => { if (!/translate\.googleapis/.test(url)) return null; const sl = (url.match(/[?&]sl=([^&]*)/) || [])[1], tl = (url.match(/[?&]tl=([^&]*)/) || [])[1]; return fn(sl, tl, decodeURIComponent((url.match(/[?&]q=([^&]*)/) || [])[1] || '')); };
route = gtxRoute((sl, tl) => resp(200, { sentences: [{ trans: 'Testing add-on (E2E): Some jobs were not successful' }], src: sl === 'auto' ? 'vi' : sl }));
r = await send({ type: 'translate', text: MIXED, tl: 'en', sl: 'auto', hint: 'vi' });
ok(r.vi && r.src === 'vi' && r.tl === 'en' && !r.same, `đoạn lẫn Việt + Anh → bản dịch tiếng Anh, src=vi (được ${JSON.stringify(r).slice(0, 90)})`);
route = gtxRoute((sl, tl, qq) => resp(200, { sentences: [{ trans: tl === 'en' ? 'Testing is important' : qq }], src: 'vi' }));
r = await send({ type: 'translate', text: 'Kiểm thử là việc quan trọng', tl: 'vi', sl: 'auto', hint: 'vi' });
ok(r.vi === 'Testing is important' && r.tl === 'en', 'nguồn trùng đích (vi → vi) → dịch sang tiếng Anh, tl=en');
route = gtxRoute(() => resp(200, { sentences: [{ trans: 'Hello' }], src: 'en' }));
r = await send({ type: 'translate', text: 'Café latte is great', tl: 'en', sl: 'auto' });
ok(r.same === true, 'đoạn tiếng Anh, đích tiếng Anh → same (bảng ghi chú, không để trống)');
r = await send({ type: 'translate', text: 'We need to act now', tl: 'en', sl: 'en' });
ok(r.same === true && !fetches.some(f => /q=We%20need/.test(f.url)), 'EN → EN không gọi dịch');
route = url => (/translate\.googleapis/.test(url) ? resp(500, null) : /mymemory/.test(url) ? resp(200, { responseData: { translatedText: 'Testing add-on' } }) : null);
r = await send({ type: 'translate', text: MIXED + ' 2', tl: 'en', sl: 'auto', hint: 'vi' });
ok(r.vi === 'Testing add-on' && r.src === 'vi', 'Google lỗi → dự phòng MyMemory theo gợi ý nguồn vi (không rỗng)');
ok(fetches.some(f => /mymemory.*langpair=vi(\||%7C)en/.test(f.url)), 'MyMemory gọi đúng cặp vi|en');

console.log(fails ? `✗ ext-selection: ${fails}/${n} lỗi` : `✓ ext-selection: ${n} kiểm tra đạt`);
process.exit(fails ? 1 : 0);
