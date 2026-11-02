// IPA khớp giọng đang phát + dạng yếu/mạnh của hư từ (owner 28/10: "of" hiện /ɒv/ trong khi Google ghi /əv/) – UI.ipaHtml / ipaOf / weakOf / audioFor
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

console.log('--- Kiểm tra IPA theo giọng + dạng yếu/mạnh ---');
// không cần jsdom: ui.js lúc nạp chỉ gọi getElementById/addEventListener
const document = { getElementById: () => null, addEventListener() {}, querySelector: () => null, querySelectorAll: () => [] };
const window = vm.createContext({ console, setTimeout, clearTimeout, document }); window.self = window; window.window = window;
window.t = (k, p) => { let s = String(k); if (p) for (const [a, b] of Object.entries(p)) s = s.replaceAll('{' + a + '}', b); return s; };
window.I18N = { lang: () => 'vi', tk: k => k };
window.IELTS_DATA = { INDEX: { of: { word: 'of', ipa: '/ɒv/', ipaUS: '/ʌv/', pos: 'prep' }, water: { word: 'water', ipa: '/ˈwɔːtə/', ipaUS: '/ˈwɔːtər/' }, that: { word: 'that', ipa: '/ðæt/', pos: 'det' } } };
const settings = { accent: 'en-GB' };
window.App = { state: { settings, cards: {} } };
vm.runInContext(fs.readFileSync('web/js/ui.js', 'utf8'), window);
const UI = window.UI;

// 1. IPA theo giọng
assert.equal(UI.ipaOf('water', 'en-GB'), '/ˈwɔːtə/');
assert.equal(UI.ipaOf('water', 'en-US'), '/ˈwɔːtər/', 'giọng Mỹ → ipaUS');
settings.accent = 'en-US'; assert.equal(UI.ipaOf('water'), '/ˈwɔːtər/', 'không truyền giọng → theo cài đặt');
assert.equal(UI.ipaOf('of'), '/ʌv/');
settings.accent = 'en-GB';
assert.equal(UI.ipaHtml({ word: 'cat', ipa: '/kæt/' }, 'en-US'), '<span class="ipa" translate="no">/kæt/</span>', 'ipaUS trống = như Anh');

// 2. Hư từ: dạng yếu trước + nhãn, dạng mạnh sau, nút nghe câu mẫu
const h = UI.ipaHtml({ word: 'of', ipa: '/ɒv/', ipaUS: '/ʌv/', pos: 'prep' }, 'en-GB');
assert.match(h, /^<span class="ipa" translate="no">\/əv\/<\/span> <span class="small muted ipa-wk">dạng yếu<\/span>/, 'yếu /əv/ đứng đầu');
assert.match(h, /data-speak-text="A cup of tea\."/, 'nút nghe dạng yếu trong câu');
assert.match(h, /dạng mạnh <span class="ipa" translate="no">\/ɒv\/<\/span>/, 'mạnh UK /ɒv/');
assert.match(UI.ipaHtml('of', 'en-US'), /dạng mạnh <span class="ipa" translate="no">\/ʌv\/<\/span>/, 'mạnh US /ʌv/ (tra kho)');
assert.match(UI.ipaHtml({ word: 'for', ipa: '/fɔː/', ipaUS: '/fɔːr/' }, 'en-US'), /\/fər\//, 'yếu US /fər/');
assert.match(UI.ipaHtml({ word: 'for', ipa: '/fɔː/' }, 'en-GB'), /\/fə\//, 'yếu UK /fə/');
assert.doesNotMatch(UI.ipaHtml('of', 'en-GB', { noEx: true }), /data-speak-text/, 'noEx → không nút câu');
// từ loại không có dạng yếu: "that" (từ hạn định), "can" (danh từ), "will" (di chúc); "US" (viết hoa) ≠ "us"
assert.equal(UI.weakOf('that', '/ðæt/', 'en-GB', 'det'), null);
assert.ok(UI.weakOf('that', '/ðæt/', 'en-GB', 'conj'));
assert.equal(UI.weakOf('can', '/kæn/', 'en-GB', 'n'), null);
assert.equal(UI.weakOf('will', '/wɪl/', 'en-GB', 'noun'), null);
assert.equal(UI.weakOf('US', '/ˌjuː ˈes/', 'en-GB'), null);
assert.equal(UI.weakOf('been', '/bɪn/', 'en-US'), null, 'yếu = mạnh (been US) → không nhãn');
assert.equal(UI.weakOf('water', '/ˈwɔːtə/'), null);
// mọi câu mẫu chứa đúng từ, đủ dạng yếu 2 giọng
for (const [w, [uk, us, ex]] of Object.entries(UI.WEAK)) { assert.ok(uk && us, w); assert.match(ex, new RegExp(`\\b${w}\\b`, 'i'), w); assert.match(ex, /[.?!]$/, `${w}: câu mẫu có dấu câu → đọc bằng giọng câu (dạng yếu tự nhiên)`); }
assert.ok(Object.keys(UI.WEAK).length >= 38, 'bảng ≥ 38 hư từ');
// ipaTag theo giọng
settings.accent = 'en-US'; assert.match(UI.ipaTag('water'), /\/ˈwɔːtər\//); settings.accent = 'en-GB';
assert.match(UI.ipaTag('of'), /\/əv\/.*dạng yếu/);

// 3. Bản ghi đúng giọng (Dict: audio có thể là bản -us khi thiếu bản Anh)
const e = { audio: 'https://x/of-us.mp3', audioUS: '' };
assert.equal(UI.audioFor(e, 'en-GB'), '', 'UK không phát bản ghi Mỹ');
assert.equal(UI.audioFor(e, 'en-US'), 'https://x/of-us.mp3');
assert.equal(UI.audioFor({ audio: 'https://x/of-uk.mp3', audioUS: 'https://x/of-us.mp3' }, 'en-US'), 'https://x/of-us.mp3');
assert.equal(UI.audioFor({ audio: 'https://x/of-uk.mp3' }, 'en-US'), '', 'US không phát bản ghi Anh');

// 4. Bề mặt dùng helper (không còn chèn c.ipa thẳng bên cạnh nút loa)
const src = f => fs.readFileSync(f, 'utf8');
assert.match(src('web/js/study.js'), /UI\.pronHtml\(c\)/, 'thẻ học: 2 giọng');
assert.doesNotMatch(src('web/js/study.js'), /speak\([cw]\.word, accent\(\), [cw]\.audio\)/, 'thẻ học phát bản ghi đúng giọng');
assert.match(src('web/js/dict-page.js'), /UI\.pronHtml\(e, \{ pills: true \}\)/, 'từ điển 2 giọng (viên riêng) – trang #/dict ở dict-page.js');
assert.equal((UI.pronHtml({ word: 'water', ipa: '/ˈwɔːtə/', ipaUS: '/ˈwɔːtər/' }, { pills: true }).match(/^<span>|<\/span><span>/g) || []).length, 2, 'pills: 2 viên');
for (const f of ['web/js/quick.js', 'web/js/reading.js', 'web/js/listening.js', 'web/js/phrases.js', 'web/js/handsfree.js']) assert.match(src(f), /UI\.ipaHtml\(/, f);
assert.match(src('web/js/lesson/ui.js'), /UI\.pronHtml\(/, 'bài học 2 giọng');
// Sổ lỗi sai giữ luật "mỗi thẻ tối đa 1 loa" (speak-ipa.mjs) → ipaTag theo giọng + dạng yếu, không khối 2 giọng
assert.match(src('web/js/plan.js'), /UI\.ipaTag\(/, 'sổ lỗi sai');
assert.match(src('extension/popup.js'), /popPron\(e\)/, 'popup add-on 2 giọng');
assert.match(src('web/js/settings.js'), /accentPicked = true/, 'chọn giọng ở Cài đặt → thứ tự theo người học');

// 5. Khối 2 giọng (owner 28/10): thứ tự theo giọng đã chọn / kỳ thi; cùng IPA → 1 IPA + 2 loa; mỗi loa đúng giọng
const ipaCount = (h, p) => h.split(p).length - 1;
settings.exam = 'ielts'; delete settings.accentPicked;
assert.deepEqual([...UI.accOrder()], ['en-GB', 'en-US'], 'IELTS → UK trước');
settings.exam = 'toeic'; assert.deepEqual([...UI.accOrder()], ['en-US', 'en-GB'], 'TOEIC → US trước');
settings.exam = 'toefl'; assert.equal(UI.accOrder()[0], 'en-US');
settings.exam = ''; assert.equal(UI.accOrder()[0], 'en-US', 'chưa có mục tiêu → US');
settings.exam = 'ielts'; settings.accentPicked = true; settings.accent = 'en-US'; assert.equal(UI.accOrder()[0], 'en-US', 'đã chọn giọng → giọng đó trước');
settings.accentPicked = false; settings.accent = 'en-GB';
const wt = UI.pronHtml({ word: 'water', ipa: '/ˈwɔːtə/', ipaUS: '/ˈwɔːtər/', audio: 'https://x/water-uk.mp3', audioUS: 'https://x/water-us.mp3' });
assert.ok(wt.indexOf('UK') < wt.indexOf('US'), 'IELTS: UK trước');
assert.match(wt, /UK<\/b> <span class="ipa" translate="no">\/ˈwɔːtə\/<\/span> <button[^>]*data-accent="en-GB" data-url="https:\/\/x\/water-uk\.mp3"/, 'loa UK phát bản UK, cạnh IPA UK');
assert.match(wt, /US<\/b> <span class="ipa" translate="no">\/ˈwɔːtər\/<\/span> <button[^>]*data-accent="en-US" data-url="https:\/\/x\/water-us\.mp3"/, 'loa US phát bản US, cạnh IPA US');
const cat = UI.pronHtml({ word: 'cat', ipa: '/kæt/' });
assert.equal(ipaCount(cat, '/kæt/'), 1, 'cùng IPA → hiện 1 lần');
assert.equal(ipaCount(cat, 'data-speak='), 2, '…với 2 loa');
assert.match(cat, /data-accent="en-GB"[\s\S]*data-accent="en-US"/);
const of = UI.pronHtml({ word: 'of', ipa: '/ɒv/', ipaUS: '/ʌv/', pos: 'prep' });
assert.match(of, /UK<\/b> <span class="ipa" translate="no">\/əv\/<\/span> <span class="small muted ipa-st">\(dạng mạnh <span class="ipa" translate="no">\/ɒv\/<\/span>\)/, 'UK /əv/ (dạng mạnh /ɒv/)');
assert.match(of, /US<\/b> <span class="ipa" translate="no">\/əv\/<\/span> <span class="small muted ipa-st">\(dạng mạnh <span class="ipa" translate="no">\/ʌv\/<\/span>\)/, 'US /əv/ (dạng mạnh /ʌv/)');
assert.equal(ipaCount(of, 'data-speak-text'), 1, '1 nút câu mẫu cho cả khối');
assert.equal(ipaCount(UI.pronHtml({ word: 'of', ipa: '/ɒv/', ipaUS: '/ʌv/' }, { noEx: true }), 'data-speak-text'), 0);
for (const h of [wt, cat, of]) { const urls = [...h.matchAll(/data-accent="([^"]+)"/g)].map(m => m[1]); assert.equal(new Set(urls).size, urls.length, 'không lặp loa cùng giọng'); }
assert.equal(UI.pronHtml({ word: '' }), '');
assert.equal(ipaCount(UI.pronHtml({ word: 'zzz' }), 'data-speak='), 2, 'chưa có IPA → vẫn 2 loa');

// 6. Hồi quy dict-perf (đỏ từ 30/10): cổng "nhất quán" đọc IPA theo VỊ TRÍ (ipa[0]=UK, ipa[1]=US) nên khi US đứng trước (chưa chọn kỳ thi)
//    báo "uk/us đảo" (record, went…) và cùng IPA → 1 IPA báo "us: undefined" (café, the…) dù kho đúng. Phải đọc theo NHÃN, mọi thứ tự.
const { JSDOM } = await import('jsdom');
const { readPron, READ_PRON_SRC } = await import('./pron-read.mjs');
const dom = new JSDOM('<div class="pron"></div>'), pronEl = dom.window.document.querySelector('.pron');
const SAMPLES = [
  { word: 'record', ipa: '/ˈrekɔːd/', ipaUS: '/ˈrekərd/' }, { word: 'went', ipa: '/ɡəʊ/', ipaUS: '/ɡoʊ/' }, // 2 giọng khác
  { word: 'café', ipa: '/ˈkæfeɪ/' }, { word: 'give up', ipa: '/ˈɡɪv ʌp/', ipaUS: '' }, { word: 'data', ipa: '/ˈdeɪtə/', ipaUS: '/ˈdeɪtə/' }, // cùng IPA → 1 IPA
  { word: 'the', ipa: '/ðə/' }, { word: 'of', ipa: '/əv/', ipaUS: '/əv/', pos: 'prep' }, { word: 'her', ipa: '/hə/', ipaUS: '/hər/', pos: 'pron' } // hư từ (dạng mạnh không được tính)
];
for (const order of [['en-GB', 'en-US'], ['en-US', 'en-GB']]) for (const pills of [true, false]) for (const e of SAMPLES) {
  pronEl.innerHTML = UI.pronHtml(e, { order, pills }) + '<span><b class="small">🐢 Chậm</b><button class="icon-btn sm">🔊</button></span>';
  const shown = (p, a) => (UI.weakOf(e.word, p, a, e.pos) || {}).weak || p; // hư từ: IPA hiển thị là dạng yếu của giọng đó
  const got = readPron(pronEl), want = { uk: shown(e.ipa, 'en-GB'), us: shown(e.ipaUS || e.ipa, 'en-US') };
  assert.deepEqual({ ...got }, want, `readPron ${e.word} ${order[0]} trước${pills ? ' (viên)' : ''}`);
}
assert.deepEqual({ ...readPron(null) }, {});
// dict-perf dùng đúng hàm này trong trang (không đọc theo vị trí nữa)
const perf = src('scripts/test/dict-perf.mjs');
assert.match(perf, /import \{ READ_PRON_SRC \} from '\.\/pron-read\.mjs'/, 'dict-perf dùng readPron chung');
assert.match(perf, /\$\{READ_PRON_SRC\}\)\(document\.querySelector\('#result \.pron'\)\)/, 'dict-perf đọc IPA theo nhãn');
assert.doesNotMatch(perf, /uk: ipa\[0\]|us: ipa\[1\]/, 'dict-perf không đọc IPA theo vị trí');
assert.equal(typeof new Function(`return (${READ_PRON_SRC})`)(), 'function', 'READ_PRON_SRC chạy được độc lập trong trang');
// Đổi cách hiển thị khối phát âm (ui.js) phải chạy lại cổng dict-perf
assert.match(src('.github/workflows/dict-perf.yml'), /'web\/js\/ui\.js'/, 'dict-perf.yml theo dõi web/js/ui.js');
console.log('✓ ipa-accent');
