// Test bảng tra trên trang của add-on (extension/content.js) + bộ tra từ (web/js/dictionary.js) – KHÔNG mạng, KHÔNG trình duyệt thật.
// Bắt các lỗi đã gặp: (1) tiêu đề từ loại "verb" trống khi Google chỉ có nghĩa Việt cho động từ (action);
// (2) không hiện ảnh minh họa: ảnh người dùng từng báo sai bị ẩn vĩnh viễn theo TỪ, nguồn ảnh tạm lỗi bị nhớ thành "không có ảnh" 6 giờ,
// dạng biến đổi (actions) không có ảnh; (3) nhãn từ loại tiếng Việt lộ ở giao diện ngôn ngữ khác; (4) menu chuột phải với đoạn
// không phải tiếng Anh bị cắt chữ; (5) bản content script cũ sau khi cập nhật vẫn bắt phím P của trang.
// Chạy: node scripts/test/ext-popup.mjs
import fs from 'node:fs';
import vm from 'node:vm';
import jsdom from 'jsdom';
const { JSDOM } = jsdom;
let fails = 0, n = 0; const ok = (c, m) => { n++; if (!c) { fails++; console.log('✗', m); } };
// OLD_SRC=<thư mục> : chạy với bản content.js/dictionary.js khác (vd. bản cũ lấy bằng git show) để xác nhận test bắt được lỗi
const rd = f => fs.readFileSync(process.env.OLD_SRC && /content\.js$|dictionary\.js$/.test(f) ? `${process.env.OLD_SRC}/${f.split('/').pop()}` : new URL('../../' + f, import.meta.url), 'utf8');
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ---------- 1) Bộ tra từ với dữ liệu giả lập (dạng trả về thật của từng nguồn) ----------
const IMG = 'https://live.staticflickr.com/2488/3775825809_bae0339293_n.jpg';
const GOOGLE = {
  action: { sentences: [{ trans: 'hoạt động' }], dict: [{ pos: 'danh từ', terms: ['hành động', 'hoạt động', 'tác động'], base_form: 'action' }, { pos: 'động từ', terms: ['xử lý'], base_form: 'action' }],
    definitions: [{ pos: 'danh từ', base_form: 'action', entry: [{ gloss: 'the fact or process of doing something, typically to achieve an aim.', definition_id: 'a1', example: 'the need for local action' }, { gloss: 'a thing done; an act.', definition_id: 'a2', example: 'she could not explain her actions' }] }] },
  actions: { sentences: [{ trans: 'hành động' }], dict: [{ pos: 'danh từ', terms: ['hành động'], base_form: 'action' }],
    definitions: [{ pos: 'danh từ', base_form: 'action', entry: [{ gloss: 'the fact or process of doing something.', definition_id: 'b1' }] }] },
  tree: { sentences: [{ trans: 'cây' }], dict: [{ pos: 'danh từ', terms: ['cây'], base_form: 'tree' }], definitions: [{ pos: 'danh từ', entry: [{ gloss: 'a woody perennial plant.', definition_id: 't1' }] }] },
  'give up': { sentences: [{ trans: 'từ bỏ' }], dict: [{ pos: 'động từ', terms: ['từ bỏ', 'bỏ cuộc'], base_form: 'give up' }] },
};
const FREEDICT = {
  action: [{ word: 'action', phonetics: [{ text: '/ˈæk.ʃən/', audio: 'https://api.dictionaryapi.dev/media/pronunciations/en/action-uk.mp3' }], meanings: [
    { partOfSpeech: 'noun', definitions: [{ definition: 'Something done so as to accomplish a purpose.' }] },
    { partOfSpeech: 'verb', definitions: [{ definition: 'To act on; to take action regarding.', example: 'I will action that request immediately.' }] },
    { partOfSpeech: 'interjection', definitions: [{ definition: 'Demanding or signifying the start of something.' }] }] }],
};
const WIKT_DEF = { 'give up': { en: [{ partOfSpeech: 'Verb', definitions: [{ definition: 'To <b>surrender</b>; to stop trying.', examples: [] }] }] } };
let imgReply = w => (w === 'action' ? { src: IMG, link: 'https://www.flickr.com/photos/x/1', license: 'BY 2.0', title: 'Sport action', creator: 'Qrodo Photos' } : { none: true });
const calls = [];
const fakeFetch = async url => {
  url = String(url); calls.push(url);
  const q = k => decodeURIComponent((url.match(new RegExp('[?&]' + k + '=([^&]*)')) || [])[1] || '');
  const res = d => ({ ok: d != null, status: d != null ? 200 : 404, json: async () => d });
  if (url.includes('translate.googleapis.com')) return res(GOOGLE[q('q')] || { sentences: [{ trans: q('q') }] });
  if (url.includes('api.dictionaryapi.dev')) return res(FREEDICT[decodeURIComponent(url.split('/').pop())] || null);
  if (url.includes('/api/img')) return res(imgReply(q('w')));
  if (url.includes('page/definition')) return res(WIKT_DEF[decodeURIComponent(url.split('/').pop())] || null);
  return res(null); // Wiktionary IPA, Tatoeba, Datamuse… → không có
};
const sw = { console, Date, Math, JSON, Promise, Map, Set, URL, AbortController, TextEncoder, setTimeout, clearTimeout, fetch: fakeFetch, location: { hostname: 'abcdefghijklmnopabcdefghijklmnop' } };
sw.self = sw; vm.createContext(sw);
vm.runInContext(rd('web/js/data.js'), sw);
vm.runInContext(rd('web/js/dictionary.js'), sw);
const { Dict } = sw;

const action = await Dict.lookup('action');
const posOf = m => String(m.pos).normalize('NFC');
ok(action && action.found, 'action: tra được');
ok(action.oxford.some(m => /verb|động từ/.test(posOf(m)) && m.defs.length), 'action: Oxford thiếu động từ → bù định nghĩa động từ từ dictionaryapi.dev');
ok(!action.oxford.some(m => posOf(m) === 'interjection'), 'action: không thêm từ loại Google không có nghĩa (interjection)');
ok(action.image === IMG, 'action: có ảnh minh họa (danh từ)');
ok(action.imageCredit && /Qrodo Photos/.test(action.imageCredit.text) && !/qua|không rõ/.test(action.imageCredit.text), 'ảnh: ghi nguồn trung tính (service worker không có t() → không lẫn tiếng Việt)');
const actions = await Dict.lookup('actions');
ok(actions.image === IMG, 'actions: dạng số nhiều không có ảnh riêng → dùng ảnh của từ gốc action');
imgReply = () => ({ none: true, retry: true });
const tmp = await Dict.lookup('tree');
ok(tmp && tmp.found && !tmp.image && tmp._imgTry === 0, 'nguồn ảnh tạm lỗi (retry) → không ghi nhớ "không có ảnh" (thử lại lần tra sau)');
const giveUp = await Dict.lookup('give up');
ok(giveUp.found && (giveUp.meanings || []).some(m => m.defs.length), 'give up: Google chỉ có nghĩa Việt → lấy định nghĩa tiếng Anh từ Wiktionary');
ok(Dict.normWord('Café') === 'café' && Dict.normWord('naïve') === 'naïve', 'normWord giữ chữ Latin có dấu (café, naïve)');
ok(Dict.normWord(' Give  UP ') === 'give up', 'normWord: viết hoa + nhiều khoảng trắng');

// ---------- 2) Bảng tra trong trang (content.js) với chrome.* giả lập ----------
async function page(uiLang, opts = {}) {
  const dom = new JSDOM('<!doctype html><html><head></head><body><p id="p">We need to take <b id="w">action</b> on climate change now.</p></body></html>', { url: 'https://news.example.org/a', runScripts: 'outside-only', pretendToBeVisual: true });
  const w = dom.window;
  Object.defineProperty(w.navigator, 'webdriver', { get: () => true }); // shadow root 'open' như khi kiểm thử tự động
  Object.defineProperty(w.navigator, 'language', { get: () => opts.navLang || 'en-US' });
  w.HTMLMediaElement.prototype.play = function () { return Promise.resolve(); };
  w.HTMLMediaElement.prototype.pause = function () {};
  const store = { uiLang, settings: { autoSpeak: false }, badImg: opts.badImg || [] };
  const listeners = [], sent = [];
  const entries = { action, actions, 'give up': giveUp };
  w.chrome = {
    runtime: {
      id: 'ext1', getManifest: () => ({ version: '9.9.9' }),
      sendMessage: async msg => {
        sent.push(msg);
        switch (msg.type) {
          case 'quick': { const e = entries[msg.word]; return { entry: e ? { ...e, image: '', partial: true } : null, saved: false }; }
          case 'lookup': await sleep(20); return { entry: entries[msg.word] || { word: msg.word, found: false }, saved: false };
          case 'uiDict': return { dict: opts.dict || {} };
          case 'translate': return { vi: opts.tr || '' };
          case 'extJson': return { data: {} };
          case 'save': return { ok: true };
          default: return {};
        }
      },
      onMessage: { addListener: f => listeners.push(f) },
    },
    storage: { local: { get: async k => (typeof k === 'string' ? { [k]: store[k] } : Object.fromEntries([].concat(k).map(x => [x, store[x]]))), set: async o => Object.assign(store, o) }, onChanged: { addListener() {} } },
    i18n: { getUILanguage: () => uiLang },
  };
  w.eval(rd('extension/content.js'));
  await sleep(30);
  const lookup = async word => { listeners.forEach(f => f({ type: 'showLookup', word }, {}, () => {})); await sleep(150); };
  const root = () => w.document.querySelector('ielts-lexi-popup').shadowRoot;
  return { w, root, lookup, sent, store, listeners };
}

for (const L of ['en', 'ja', 'vi']) {
  const DICT = { 'danh từ': '名詞', 'động từ': '動詞' };
  const p = await page(L, { dict: L === 'ja' ? DICT : {}, navLang: L === 'vi' ? 'vi-VN' : L === 'ja' ? 'ja-JP' : 'en-US', tr: L === 'ja' ? '行動' : '' });
  await p.lookup('action');
  const r = p.root(), box = r.querySelector('.box');
  ok(box && !box.hidden, `[${L}] action: bảng tra hiện`);
  const groups = [...r.querySelectorAll('.pg')];
  ok(groups.length >= 2, `[${L}] action: có nhóm danh từ + động từ (${groups.length})`);
  ok(groups.every(g => g.querySelector('.pdef') || g.querySelector('.pvi')), `[${L}] action: không có tiêu đề từ loại trống`);
  ok(groups.some(g => /verb|動詞|động từ/.test(g.textContent) && g.querySelector('.pdef')), `[${L}] action: nhóm động từ có định nghĩa`);
  const img = r.querySelector('.pic img');
  ok(img && img.getAttribute('src') === IMG, `[${L}] action: có ảnh minh họa`);
  ok(img && img.alt === 'action', `[${L}] ảnh có alt`);
  const cr = r.querySelector('.pic .pcredit');
  ok(cr && /flickr\.com/.test(cr.href) && cr.rel.includes('noopener'), `[${L}] ảnh có liên kết ghi nguồn (giấy phép CC BY)`);
  if (L !== 'vi') ok(!/[ạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹđơư]/i.test([...r.querySelectorAll('.chip')].map(x => x.textContent).join(' ')), `[${L}] nhãn từ loại không lộ tiếng Việt`);
  if (L === 'ja') ok(r.textContent.includes('動詞'), '[ja] nhãn từ loại theo từ điển giao diện (動詞)');
  ok(!box.querySelector('[style]'), `[${L}] không dùng thuộc tính style trong bảng (CSP style-src chặn)`);
  // Lưu thẻ
  r.querySelector('#save').click(); await sleep(30);
  const sv = p.sent.find(m => m.type === 'save');
  ok(sv && sv.entry.word === 'action' && sv.entry.image === IMG && !('_imgTry' in sv.entry) && !('oxford' in sv.entry), `[${L}] lưu thẻ: đủ ảnh, không kèm trường nội bộ`);
  p.w.close();
}

// Ảnh từng bị báo sai theo kiểu CŨ (chỉ lưu từ) → không còn ẩn ảnh mới; báo sai kiểu mới (từ + URL) → ẩn đúng ảnh đó
{
  const p = await page('en', { badImg: ['action'] }); await p.lookup('action');
  ok(p.root().querySelector('.pic img'), 'badImg cũ (chỉ theo từ) không ẩn vĩnh viễn ảnh mới');
  const nb = p.root().querySelector('.pic .noimg'); if (nb) nb.click(); await sleep(10);
  ok((p.store.badImg || []).includes('action ' + IMG), 'báo "ảnh không đúng" lưu theo từ + URL ảnh');
  p.w.close();
  const p2 = await page('en', { badImg: ['action ' + IMG] }); await p2.lookup('action');
  ok(!p2.root().querySelector('.pic img'), 'ảnh đã báo sai không hiện lại');
  p2.root().querySelector('#save').click(); await sleep(30);
  const sv = p2.sent.find(m => m.type === 'save'); ok(sv && sv.entry.image === '', 'ảnh đã báo sai không vào thẻ khi lưu');
  p2.w.close();
}
// Menu chuột phải với đoạn không phải tiếng Anh → dịch đoạn (sl auto), không tra từ bị cắt chữ
{
  const p = await page('en', { tr: 'Hello everyone' }); await p.lookup('Xin chào các bạn, hôm nay trời đẹp quá');
  const tr = p.sent.find(m => m.type === 'translate');
  ok(tr && tr.sl === 'auto' && !p.sent.some(m => m.type === 'quick'), 'menu chuột phải: đoạn tiếng Việt → dịch với sl=auto, không tra từ');
  ok(p.root().textContent.includes('Hello everyone'), 'giao diện tiếng Anh vẫn hiện bản dịch khi nguồn không phải tiếng Anh');
  p.w.close();
}
// Bản content script cũ (sau khi add-on cập nhật) không còn bắt phím P của trang
{
  const p = await page('en'); await p.lookup('action');
  p.w.document.dispatchEvent(new p.w.CustomEvent('ielts-lexi-takeover', { detail: 'ext1' }));
  const ev = new p.w.KeyboardEvent('keydown', { key: 'p', bubbles: true, cancelable: true });
  p.w.document.body.dispatchEvent(ev);
  ok(!ev.defaultPrevented, 'bản cũ sau takeover không chặn phím P của trang');
  p.w.close();
}

console.log(fails ? `✗ ext-popup: ${fails}/${n} lỗi` : `✓ ext-popup: ${n} kiểm tra đạt`);
process.exit(fails ? 1 : 0);
