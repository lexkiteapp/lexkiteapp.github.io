// 📖 Trang Từ điển (#/dict) trên khung Stitch v2 dict: chạy web/js/dict-page.js thật (nhánh chưa tra) + khung tự sinh → đủ ý cũ: ô tìm gửi bằng Enter / nút kính lúp (mã hoá từ),
//   Gần đây (chip là liên kết mã hoá, xóa được) · Khám phá nhanh (6 từ mẫu, chỉ khi chưa tra) · thẻ giải thích + mẹo add-on trong #result · #result có sẵn · không còn nút/ô thừa của mẫu,
//   khung chung (Back ≥44 về #/vocab, bỏ st+v2on), gói + CSS nạp đúng, CSS ≤ 10 KB gz. Phần kết quả (đầu mục từ, thẻ lưu ngữ cảnh…) còn khung cũ: dict-entry-layout (CI) kiểm.
import fs from 'node:fs'; import vm from 'node:vm'; import zlib from 'node:zlib'; import assert from 'node:assert/strict';
const rd = f => fs.readFileSync(f, 'utf8'), app = rd('web/js/app.js');
assert.match(app, /dictp: \['js\/i18n\/en\/v2\.js', 'js\/st\/v2\/runtime\.js', 'js\/st\/v2\/dict\.js', 'js\/dict-page\.js'\]/, 'gói dictp nạp runtime + khung dict trước dict-page.js');
assert.match(app, /dictp: 'css\/st-v2-dict\.css'/, 'CSS màn nạp cùng gói'); assert.match(rd('scripts/build-stitch-css.mjs'), /dict: \['web\/js\/dict-page\.js'\]/);
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const run = async recent => {
  const out = { calls: [], store: { recent } }, els = {}, mk = id => (els[id] = { id, value: '', hidden: false, focus() { out.focused = id; }, set innerHTML(v) { this._h = v; }, get innerHTML() { return this._h || ''; } });
  const $ = s => (/^#(q|qGo|qClear|recClear|result)$/.test(s) ? els[s.slice(1)] || mk(s.slice(1)) : null), loc = { hash: '#/dict' };
  const c = { Core: { Store: { get: async (k, d) => out.store[k] || d, set: async (k, v) => { out.store[k] = v; } }, todayKey: () => 'k' }, IELTS_DATA: { INDEX: {} }, UI: { $, $$: () => [], esc, highlight: x => x, toast() {}, modal() {}, closeModal() {}, speak() {}, pic() {}, levelChip() {}, posChip() {} },
    t: (s, v) => s + (v ? JSON.stringify(v) : ''), I18N: { meanLang: () => 'vi', lang: () => 'vi' }, Dict: { quick: () => null, normWord: x => x }, location: loc, setTimeout() {}, document: { body: { classList: { remove: (...n) => { out.rm = n; } } } } };
  c.self = c; c.window = c;
  c.ST2 = { mount: (v, k, d, tab) => { assert.equal(k, 'dict'); assert.equal(tab, null); out.d = JSON.parse(JSON.stringify(d)); out.html = c.ST2.dict(d).main; ['q', 'qGo', 'qClear', 'result'].forEach(mk); if (d.recentBlk.length) mk('recClear'); return {}; } };
  c.ST = { esc };
  c.App = { state: { cards: {}, settings: {} }, routes: {}, view: {}, inDeck() {}, masteryDots() {}, reward() {}, addWord() {}, guard: f => f, W: x => x, vimgReady: async () => {}, parseHash: () => ({ arg: '' }), extCta: () => Promise.resolve(null), bindCommon() {} };
  vm.runInNewContext(rd('web/js/st/v2/dict.js'), c); vm.runInNewContext(rd('web/js/dict-page.js'), c);
  await c.App.routes.dict(''); return { ...out, els, loc };
};
const a = await run(['mitigate', 'a/b c']), { d, html } = a;
assert.deepEqual(a.rm, ['st', 'v2on'], 'bỏ st + v2on: khung chung (thanh trên + 5 tab + lề #view)');
assert.equal(d.back, '#/vocab'); assert.equal(d.langChip, 'EN ⇄ VI'); assert.match(html, /data-href="#\/vocab"/); assert.match(html, /id="searchForm"/); assert.match(html, /id="q"/);
assert.equal(d.browseBlk[0].items.length, 6); assert.ok(d.browseBlk[0].items.every(x => x.href === '#/dict/' + x.w), 'Khám phá nhanh: 6 từ mẫu');
assert.deepEqual(d.recentBlk[0].items.map(x => x.href), ['#/dict/mitigate', '#/dict/a%2Fb%20c'], 'Gần đây: liên kết mã hoá');
assert.match(html, / href="#\/dict\/a%2Fb%20c"/); assert.match(html, /id="recClear"/); assert.match(html, /id="result"/); assert.match(html, /data-ext-cta="app"/);
assert.doesNotMatch(html, /Morphology|reluctan|Recent searches|Academic quick|Loading full entry|Save flashcard|Dictionary/, 'không sót chữ/khối giữ chỗ của mẫu');
assert.match(a.els.result.innerHTML, /Tra bất kỳ từ tiếng Anh nào/); assert.match(a.els.result.innerHTML, /add-on Chrome/);
// gõ + Enter / bấm kính lúp → #/dict/<từ mã hoá>; chữ rỗng không đi đâu; X xóa chữ
a.els.q.value = ' a/b c '; a.els.q.onkeydown({ key: 'Enter', preventDefault() {} }); assert.equal(a.loc.hash, '#/dict/a%2Fb%20c');
a.loc.hash = '#/dict'; a.els.q.value = '  '; a.els.qGo.onclick(); assert.equal(a.loc.hash, '#/dict');
a.els.q.value = 'x'; a.els.q.oninput(); assert.equal(a.els.qClear.hidden, false); a.els.qClear.onclick(); assert.equal(a.els.q.value, ''); assert.equal(a.els.qClear.hidden, true);
// xóa Gần đây
await a.els.recClear.onclick(); assert.equal(JSON.stringify(a.store.recent), '[]');
// chưa có lịch sử: không khối Gần đây
const b = await run([]); assert.deepEqual(b.d.recentBlk, []); assert.doesNotMatch(b.html, /id="recClear"/);
assert.ok(zlib.gzipSync(rd('web/css/st-v2-dict.css')).length <= 10 * 1024, 'CSS dict ≤ 10 KB gz');
console.log('✓ dict-hub');
