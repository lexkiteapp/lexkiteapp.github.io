// Từ điển chịu lỗi Datamuse. Gốc 3/11: Datamuse phản chiếu Origin vào Access-Control-Allow-Origin, CDN đệm 24 h không Vary: Origin → origin khác gọi trước thì #/dict của lexkite.com bị CORS
// (post-deploy đỏ, 3 dòng console, mất từ liên quan). Test: khóa đệm tách theo origin; nguồn hỏng → 1 lệnh hỏng, không bắn tiếp, có dự phòng + Thử lại; mọi chỗ gọi Datamuse đi qua Dict.dm; biểu đồ dự báo không tràn nhãn.
// Chạy: node scripts/test/datamuse-resilience.mjs (không mạng – fetch giả lập)
import assert from 'node:assert/strict'; import fs from 'node:fs'; import path from 'node:path'; import vm from 'node:vm'; import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'), read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');

function boot(net) {
  const calls = [], els = {};
  const fetch = async u => { u = String(u); calls.push(u); const v = await net(u); if (v instanceof Error) throw v; return { ok: v !== 500, status: v === 500 ? 500 : 200, json: async () => v }; };
  const noop = () => {}, chain = new Proxy(noop, { get: (_, k) => (k === Symbol.toPrimitive ? () => '' : chain), apply: () => chain, set: () => true });
  const App = { state: { cards: {} }, routes: {}, view: {}, inDeck: noop, masteryDots: noop, reward: noop, addWord: noop, parseHash: () => ({ arg: 'hello' }), guard: () => noop };
  const win = { location: { origin: 'https://lexkite.com', pathname: '/app/', protocol: 'https:' }, navigator: {}, fetch, App, addEventListener: noop };
  const sb = { window: win, globalThis: win, self: win, location: win.location, navigator: win.navigator, fetch, AbortController, AbortSignal, setTimeout, clearTimeout, console, URL, encodeURIComponent, App,
    localStorage: { getItem: () => null, setItem: noop }, document: chain, I18N: { learnLang: () => 'vi', lang: () => 'en', uiLang: () => 'en', whenReady: async () => {} }, t: s => s,
    Core: { Store: chain, todayKey: noop }, IELTS_DATA: { INDEX: {} }, UI: { $: s => (els[s] = els[s] || { innerHTML: '' }), $$: () => [], esc: s => s, wordRegex: () => /x/ } };
  sb.Dict = undefined; const ctx = vm.createContext(sb);
  vm.runInContext(read('web/js/dictionary.js'), ctx); sb.Dict = win.Dict || sb.Dict; assert.ok(sb.Dict && sb.Dict.dm, 'Dict.dm được xuất');
  vm.runInContext(read('web/js/dict-page.js'), ctx);
  return { Dict: sb.Dict, App, calls, els, dmCalls: () => calls.filter(u => u.includes('api.datamuse.com')) };
}
const E = { word: 'hello', pos: 'noun', syn: [] }, html = b => (b.els['#related'] || {}).innerHTML || '';
const related = async (b, retry) => { b.els['#related'] = { innerHTML: '' }; await b.App.loadRelated(E, retry); return html(b); };

{ // Nguồn tốt: khóa đệm theo origin, gọi đủ các lệnh, hiện chip
  const b = boot(u => (u.includes('api.datamuse') ? (u.includes('ml=') ? [{ word: 'greeting', tags: ['f:20'] }] : u.includes('rel_ant') ? [{ word: 'goodbye' }] : []) : null));
  const h = await related(b);
  assert.ok(b.dmCalls().every(u => u.endsWith('&o=https%3A%2F%2Flexkite.com')), 'mọi lệnh có o=<origin>: ' + b.dmCalls());
  assert.equal(b.dmCalls().length, 3, 'ml + rel_jjb + rel_ant'); assert.ok(h.includes('greeting') && h.includes('goodbye'), h); assert.ok(!h.includes('relRetry'), 'nguồn tốt không hiện Thử lại');
}
for (const bad of [new TypeError('Failed to fetch'), 500]) { // CORS/mạng hỏng hoặc 5xx
  let up = false; const syn = [{ meanings: [{ synonyms: ['hi'], antonyms: ['bye'], definitions: [{ synonyms: ['howdy'] }] }] }];
  const b = boot(u => (u.includes('api.datamuse') ? (up ? [{ word: 'greeting', tags: ['f:20'] }] : bad) : syn));
  const h = await related(b);
  assert.equal(b.dmCalls().length, 1, 'nguồn hỏng: chỉ 1 lệnh hỏng (1 dòng console), không bắn tiếp');
  assert.ok(h.includes('hi') && h.includes('howdy') && h.includes('bye'), 'dự phòng đồng nghĩa/trái nghĩa: ' + h); assert.ok(h.includes('relRetry'), 'có nút Thử lại');
  assert.equal(await b.Dict.dm('sug?s=he&max=8'), null, 'đang nghỉ: trả null'); await related(b); assert.equal(b.dmCalls().length, 1, 'đang nghỉ: không gọi lại nguồn');
  up = true; const h2 = await related(b, true);
  assert.ok(b.dmCalls().length > 1 && h2.includes('greeting') && !h2.includes('relRetry'), 'Thử lại bỏ qua thời gian nghỉ, hết nút khi nguồn sống');
}
{ // Cả dự phòng cũng hỏng: vẫn gọn, không ném lỗi
  const b = boot(() => new TypeError('Failed to fetch')), h = await related(b);
  assert.ok(h.includes('relRetry') && !h.includes('undefined'), h);
}
// Mọi chỗ gọi Datamuse phải qua Dict.dm (lệnh trần = không có khóa đệm theo origin, CORS lại)
for (const f of fs.readdirSync(path.join(ROOT, 'web/js')).filter(x => x.endsWith('.js'))) {
  const n = (read('web/js/' + f).match(/https:\/\/api\.datamuse\.com/g) || []).length;
  assert.equal(n, f === 'dictionary.js' ? 1 : 0, `${f}: gọi Datamuse trực tiếp ${n} lần`);
}
// Biểu đồ 14 cột dự báo: cột hẹp thì nhãn thưa, nhãn cuối không bao giờ tràn (trước: chỉ đỏ khi cột cuối rơi vào thứ Hai → QA bot đỏ theo ngày)
assert.ok(/class="bars dense"/.test(read('web/js/stats-page.js')), 'biểu đồ dự báo dùng .bars.dense');
assert.ok(/@container[^{]*\{[^}]*\.bars\.dense > div:nth-child\(even\) > small[^}]*display: none/.test(read('web/css/style.css') + read('web/css/lazy-ui.css')), '14 cột: cột cuối (chẵn) không có nhãn khi hẹp');
console.log('✓ datamuse-resilience: khóa đệm theo origin, 1 lệnh hỏng rồi nghỉ, dự phòng + Thử lại, không gọi trực tiếp, nhãn biểu đồ');
