// Tô sáng màn đọc (#/read/<id>): mỗi từ MỘT kiểu tô, từ quá phổ biến không được tô, mọi lớp có trong chú giải (chip) và chỉ dùng token màu.
// Chạy: node scripts/test/read-highlight.mjs  (không mạng, không trình duyệt)
import fs from 'node:fs'; import vm from 'node:vm';
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('✗', m); } };
const W = p => fs.readFileSync(new URL('../../web/' + p, import.meta.url), 'utf8');
const g = { console, window: null }; g.window = g; g.self = g; vm.createContext(g);
const run = (src, f) => vm.runInContext(src, g, { filename: f });
run(W('js/data.js'), 'data.js'); run(W('js/lexis.js'), 'lexis.js'); run(W('js/readings.js'), 'readings.js');
run(W('cpack/readings/hl.js'), 'hl.js');
const { LAYERS, COMMON, has } = g.ReadHL;
const span = /<span class="([^"]+)" data-w="([^"]+)"(?: data-ph="([^"]+)")?>/g;
let words = 0;
for (const r of g.READINGS) {
  const html = g.Lexis.markText(r.text, { keywords: new Set(r.keywords.map(k => k.toLowerCase())), mine: () => true }); // mine = mọi từ (xấu nhất)
  const painted = Object.fromEntries(LAYERS.map(l => [l, new Set()]));
  for (const m of html.matchAll(span)) {
    const cls = new Set(m[1].split(' ')), el = { classList: { contains: c => cls.has(c) }, dataset: { w: m[2], ph: m[3] } };
    const k = LAYERS.find(l => has(el, l)); words++;
    if (k) painted[k].add(m[3] || m[2]);
    if (k && k !== 'kw' && !m[3]) ok(!COMMON.has(m[2]), `${r.id}: từ phổ biến "${m[2]}" bị tô lớp ${k}`);
  }
}
ok(words > 1000, 'có dữ liệu để kiểm');
for (const w of ['and', 'for', 'grow', 'the', 'of']) ok(COMMON.has(w), `COMMON thiếu "${w}"`);
// CSS: mỗi lớp có kiểu tô + mẫu trong chip (chú giải), chỉ dùng token màu (không hex/rgb)
const css = W('css/lazy-ui.css'), rules = css.split('\n').filter(l => /^\.hl-(sw|chip|bar)/.test(l)).join('\n');
for (const l of LAYERS) { ok(rules.includes(`.tw[data-l="${l}"]`), `thiếu kiểu tô cho lớp ${l}`); ok(rules.includes(`.hl-sw.${l}`), `chú giải thiếu mẫu lớp ${l}`); }
ok(!/#[0-9a-f]{3,8}\b|rgba?\(/i.test(rules), 'tô sáng màn đọc phải chỉ dùng token màu');
ok(/min-height:\s*44px/.test(rules), 'chip tô sáng ≥ 44 px');
const st = W('css/style.css');
ok(!/\.tw:hover[^}]*primary-soft/.test(st) && !/\.sent\.reading[^}]*primary-soft/.test(st), 'hover/câu đang đọc không dùng nền đỏ san hô');
ok(/hidden = !any\(tws/.test(W('js/reading.js')), 'lớp rỗng phải ẩn chip');
ok(W('js/bundles.js').includes('cpack/readings/hl.js'), 'hl.js phải nằm trong gói readings');
console.log(fails ? `FAIL ${fails}` : `OK read-highlight (${g.READINGS.length} bài, ${words} từ)`); process.exit(fails ? 1 : 0);
