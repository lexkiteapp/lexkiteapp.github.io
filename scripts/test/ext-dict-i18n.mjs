// Add-on THẬT (extension/app): nạp script như Chrome (<script> + App.need lười, KHÔNG dùng lazyfix) → vẽ #/dict/<từ> ở mọi ngôn ngữ giao diện ≠ vi
// và báo mọi chữ tiếng Việt lọt vào UI. Chuỗi dự phòng bắt buộc: ngôn ngữ giao diện → en, KHÔNG BAO GIỜ vi.
// Trường hợp xấu nhất được dựng sẵn: Google từ điển luôn trả tiếng Việt (fixtures/gtx-house-vi.json), dịch máy không dùng được,
// bộ nhớ đệm bền (chrome.storage 'dc2:home') còn bản tiếng Việt từ trước khi đổi ngôn ngữ.
//   node scripts/test/ext-dict-i18n.mjs [langs|all] [words]    (mặc định: 14 ngôn ngữ ≠ vi · house,home)   · thoát 1 nếu có lỗi
//   LIVE=1 NODE_USE_ENV_PROXY=1 …   → gọi mạng thật thay vì dữ liệu dựng sẵn (chỉ để soi tay)
import { createRequire } from 'node:module';
import fs from 'node:fs'; import path from 'node:path';
const require = createRequire(import.meta.url);
const { JSDOM, ResourceLoader, VirtualConsole } = require('jsdom');
const APP = path.resolve('extension/app'), WEB = path.resolve('web');
const ALL = ['en', 'es', 'pt', 'fr', 'de', 'id', 'th', 'zh', 'ja', 'ko', 'hi', 'ar', 'ru', 'tr'];
const [a1, a2] = process.argv.slice(2);
const LANGS = a1 && a1 !== 'all' ? a1.split(',') : ALL, WORDS = (a2 || 'house,home').split(',');
const VI = /[ăđơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]/i;
const tick = ms => new Promise(r => setTimeout(r, ms));
const html = fs.readFileSync(path.join(APP, 'index.html'), 'utf8');
if (/\b(?:https?:)?\/\/(?:www\.gstatic|cdn\.jsdelivr)/.test(html)) throw new Error('index.html còn tải mã từ xa');
const ORIGIN = 'chrome-extension://lexkiteextensionidabcdefghijklmn';
const GTX_VI = fs.readFileSync(path.resolve('scripts/test/fixtures/gtx-house-vi.json'), 'utf8');
const missing = new Set();
class Loader extends ResourceLoader {
  fetch(url) {
    const p = decodeURIComponent(new URL(url).pathname), f = path.join(APP, p);
    if (!f.startsWith(APP) || !fs.existsSync(f) || !fs.statSync(f).isFile()) { missing.add(p); return Promise.resolve(Buffer.from('')); } // thiếu tệp = như 404 (script onerror)
    return Promise.resolve(fs.readFileSync(f));
  }
}

async function run(lang, word) {
  const errors = [];
  const vc = new VirtualConsole(); vc.on('jsdomError', e => errors.push(String(e.message).split('\n')[0]));
  const mem = new Map([['vb.uiLang', lang], ['vb.geo', '-']]);
  const dom = new JSDOM(html.replace(/<!--hero-->[\s\S]*?<!--\/hero-->/, ''), {
    url: ORIGIN + '/index.html', runScripts: 'dangerously', resources: new Loader(), pretendToBeVisual: true, virtualConsole: vc,
    beforeParse(w) {
      Object.defineProperty(w, 'localStorage', { value: { getItem: k => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: k => mem.delete(k), key: i => [...mem.keys()][i], get length() { return mem.size; } } });
      // bản tra đã lưu từ lúc người dùng còn dùng nghĩa tiếng Việt (không có _ml) – phải bị bỏ qua khi giao diện ≠ vi
      const st = { 'dc2:home': { word: 'home', pos: 'danh từ', vi: 'nhà', def: 'nơi ở', ex: 'Tôi về nhà', ipa: '/həʊm/', oxford: [{ pos: 'danh từ', defs: [{ def: 'the place where one lives', ex: 'Tôi muốn về nhà' }] }], meanings: [], senses: [{ pos: 'danh từ', terms: ['nhà'] }], sentences: [], _t: Date.now(), _v: 7 } };
      w.chrome = { runtime: { id: 'x', sendMessage: () => Promise.resolve(), onMessage: { addListener() {} }, getURL: p => ORIGIN + '/' + p, lastError: null },
        storage: { local: { get: async k => (typeof k === 'string' ? (k in st ? { [k]: st[k] } : {}) : { ...st }), set: async o => { Object.assign(st, o); }, remove: async k => { delete st[k]; } }, onChanged: { addListener() {} } } };
      w.TextEncoder = TextEncoder; w.TextDecoder = TextDecoder; w.AbortController = AbortController;
      w.scrollTo = () => {}; w.HTMLElement.prototype.scrollIntoView = () => {}; w.matchMedia = () => ({ matches: false, addEventListener() {}, addListener() {} });
      w.CSS = { escape: s => s }; w.console.error = () => {}; w.HTMLMediaElement.prototype.play = () => Promise.resolve(); w.HTMLCanvasElement.prototype.getContext = () => null;
      const ok = b => ({ ok: true, json: async () => JSON.parse(b), text: async () => b });
      w.fetch = async url => {
        const u = String(url);
        if (process.env.LIVE && /^https:\/\//.test(u)) { const r = await fetch(u); const b = r.ok ? await r.text() : ''; return { ok: r.ok, json: async () => JSON.parse(b), text: async () => b }; }
        if (/translate\.googleapis.*dt=bd/.test(u)) return ok(GTX_VI); // Google trả tiếng Việt bất kể tl/hl (xấu nhất)
        const m = u.match(/^https:\/\/lexkite\.com(\/[^?#]*)/), f = m && path.join(WEB, m[1]);
        if (f && fs.existsSync(f) && fs.statSync(f).isFile()) return ok(fs.readFileSync(f, 'utf8'));
        return { ok: false, json: async () => ({}), text: async () => '' }; // mọi thứ khác (dịch máy, Wiktionary, Tatoeba…) không dùng được
      };
    },
  });
  const w = dom.window;
  for (let i = 0; i < 60 && !(w.App && w.App.need && w.document.querySelector('#view')); i++) await tick(100);
  if (!w.App) return { leaks: ['app không nạp: ' + errors.slice(0, 3).join(' | ')], errors, shown: 0 };
  await tick(300); w.location.hash = '#/welcome/setup'; await tick(150); const q = s => w.document.querySelector(s); for (let i = 0; i < 60 && !q('#go'); i++) { if (q('#obNext')) q('#obNext').click(); await tick(100); } const go = q('#go'); if (go) go.click(); await tick(1200); // thiết lập từng bước (onboard.js): Tiếp tục tới màn cuối rồi Bắt đầu
  w.location.hash = '#/dict/' + word; await tick(3500);
  const leaks = new Set();
  const tw = w.document.createTreeWalker(w.document.body, w.NodeFilter.SHOW_TEXT); let n;
  while ((n = tw.nextNode())) {
    const s = n.nodeValue.replace(/\s+/g, ' ').trim(); if (!s || !VI.test(s)) continue;
    const el = n.parentElement; if (!el || el.closest('script,style,[translate="no"],[data-keep-vi],textarea,[hidden],.tr-wait,.wn-tr')) continue; // .tr-wait/.wn-tr: CSS ẩn tới khi dịch xong
    leaks.add(`“${s.slice(0, 80)}” (${((el.closest('[id]') || el).id || el.className || el.tagName).toString().slice(0, 30)})`);
  }
  w.document.querySelectorAll('[placeholder],[title],[aria-label]').forEach(el => ['placeholder', 'title', 'aria-label'].forEach(a => { const v = el.getAttribute(a); if (v && VI.test(v) && !el.closest('[translate="no"],[data-keep-vi]')) leaks.add(`[${a}] “${v.slice(0, 60)}”`); }));
  const res = w.document.querySelector('#result'), shown = res ? res.textContent.length : 0;
  if (process.env.DUMP) console.log('   ' + w.document.querySelector('#view').textContent.replace(/\s+/g, ' ').slice(0, 1500));
  w.close();
  return { leaks: [...leaks], errors, shown, hasEntry: !!(res && /\/h[^/]+\//.test(res.textContent)) };
}

let bad = 0;
const jobs = LANGS.flatMap(lang => WORDS.map(word => ({ lang, word })));
for (let i = 0; i < jobs.length; i += 4) { // 4 phiên jsdom song song
  const res = await Promise.all(jobs.slice(i, i + 4).map(async j => ({ ...j, ...(await run(j.lang, j.word)) })));
  for (const { lang, word, leaks, shown, hasEntry } of res) {
    const fail = leaks.length || !shown || hasEntry === false;
    bad += fail ? 1 : 0;
    console.log(`${fail ? '✗' : '✓'} ${lang} #/dict/${word}: ${leaks.length} chỗ lẫn tiếng Việt${shown ? '' : ' · TRANG TRỐNG'}${hasEntry === false ? ' · KHÔNG CÓ MỤC TỪ' : ''}`);
    leaks.slice(0, 12).forEach(x => console.log('    ' + x));
  }
}
console.log(bad ? `✗ ext-dict-i18n: ${bad} ca lỗi` : '✓ ext-dict-i18n: add-on không lẫn tiếng Việt ở #/dict/* (14 ngôn ngữ)');
process.exit(bad ? 1 : 0);
