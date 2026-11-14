// 🔤 Thư viện phát âm (#/pron) trên khung Stitch v2 pron-hub: chạy web/js/pron.js thật với 44 âm + 18 chuyên đề thật, dựng khung TỰ SINH và kiểm đủ ý cũ –
//   5 nhóm đúng thứ tự (lưới 4 cột nguyên âm đơn/đôi · lưới 5 cột phụ âm + ghi chú vô thanh · hàng Sửa lỗi người Việt/Trọng âm), mọi bài đúng 1 lần với href mã hoá,
//   tick đã xong + % ở hàng, viền nét đứt cho phụ âm vô thanh, âm kế tiếp (ô hổ phách + nút Học tiếp), hết bài thì ẩn nút, Quay lại → #/skills, gói + CSS nạp đúng.
import fs from 'node:fs'; import vm from 'node:vm'; import assert from 'node:assert/strict';
const rd = f => fs.readFileSync(f, 'utf8'), app = rd('web/js/app.js');
assert.match(app, /pron: \['js\/i18n\/en\/pron\.js', [^\]]*'js\/st\/v2\/runtime\.js', 'js\/st\/v2\/pron-hub\.js', 'js\/pron\.js'\]/, 'gói pron nạp runtime + khung pron-hub trước pron.js');
assert.match(app, /pron: 'css\/st-v2-pron-hub\.css'/, 'CSS màn nạp cùng gói');
assert.match(rd('scripts/build-stitch-css.mjs'), /'pron-hub': \['web\/js\/pron\.js'\]/, 'class viết tay trong pron.js được biên dịch');
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const run = (pronDone, view = {}) => {
  const out = {}, c = { UI: { $: () => null, $$: () => [], esc, speak() {}, tts() {}, shuffle: a => a }, Chars: { slot: (w, o) => `<i data-who="${w}" data-pose="${o.pose}"></i>` }, t: (s, v) => s + (v ? JSON.stringify(v) : ''), Game: {}, Sfx: {}, setTimeout() {}, innerWidth: 1200 };
  c.self = c; c.window = c; c.ST = { esc }; c.ST2 = { mount: (v, k, d, tab) => { assert.equal(k, 'pron-hub'); assert.equal(tab, null, 'màn con của Kỹ năng: không có thanh tab'); out.d = JSON.parse(JSON.stringify(d)); out.html = c.ST2['pron-hub'](d).main; return {}; } };
  c.App = { state: { game: { pronDone }, settings: { accent: 'uk' } }, routes: {}, view, bindCommon() {} };
  for (const f of ['web/cpack/pron/sounds.js', 'web/cpack/pron/skills.js', 'web/js/st/v2/pron-hub.js', 'web/js/pron.js']) vm.runInNewContext(rd(f), c, { filename: f });
  c.App.routes.pron(''); return { ...out, PRON: JSON.parse(JSON.stringify(c.PRON)) };
};
const a = run({ 'iː': 100, p: 95, 'final-consonants': 80, e: 0 }), { d, html, PRON } = a, ids = PRON.map(x => x.id);
assert.equal(PRON.length, 62); assert.deepEqual(d.groups.map(g => [g.v, g.items.length]), [['v4', 12], ['v4', 8], ['c5', 24], ['rows', 6], ['rows', 12]]);
assert.deepEqual(d.groups.flatMap(g => g.items.map(x => x.id)).sort(), [...ids].sort(), 'mọi bài đúng 1 lần, không nhóm nào bị bỏ');
for (const x of d.groups.flatMap(g => g.items)) assert.equal(x.href, '#/pron/' + encodeURIComponent(x.id));
// e: 0 vẫn là "có bản ghi" (chip + vòng đếm mọi bài đã chấm, như bản cũ); tick/hàng ✓ chỉ khi điểm > 0
assert.equal(d.count, '4/62'); assert.ok(Math.abs(d.pct - 4 / 62 * 100) < 1e-9);
assert.equal(d.back, '#/skills'); assert.deepEqual(d.groups.map(g => g.count), ['1/12', '0/8', '1/24', '1/6', '0/12']); // e:0 không tính là xong
// âm kế tiếp = bài đầu chưa có bản ghi: /ɪ/ (iː đã có, ɪ chưa)
const nx = PRON.find(x => !['iː', 'p', 'final-consonants', 'e'].includes(x.id));
assert.equal(d.next.id, nx.id); assert.equal(d.nextHref, '#/pron/' + encodeURIComponent(nx.id)); assert.match(d.cta, /^Học tiếp: /); assert.match(d.nextL, /^Âm tiếp theo$/); assert.match(d.teacher, /data-who="ama" data-pose="point"/);
assert.deepEqual(d.groups.flatMap(g => g.items).filter(x => x.next).map(x => x.id), [nx.id], 'đúng 1 ô hổ phách');
// phụ âm vô thanh = viền nét đứt; chỉ phụ âm có voiced === false
const unv = PRON.filter(x => x.mouth && x.mouth.voiced === false).map(x => x.id);
assert.ok(unv.length >= 8 && unv.every(i => PRON.find(x => x.id === i).group === 'consonants'));
assert.deepEqual(d.groups.flatMap(g => g.items).filter(x => x.unv).map(x => x.id).sort(), [...unv].sort());
assert.equal((html.match(/border-dashed/g) || []).length, unv.length, 'mỗi ô vô thanh một viền nét đứt (kể cả ô đã xong)');
assert.equal((html.match(/ href="#\/pron\//g) || []).length, 62, 'mọi bài là liên kết thật (mở tab mới được)');
assert.equal((html.match(/<a class="/g) || []).length, 62); assert.doesNotMatch(html, /teacher-slot|Acoustic|Calibrate|Foundational|Pronunciation library/, 'không sót chữ giữ chỗ của mẫu');
assert.match(html, /aria-label="\/iː\/ · [a-z]+ · Đã xong 100%"/, 'ô đã xong đọc được cả điểm, không chữ Việt cứng trong aria-label (i18n-leak)'); assert.match(html, /check_circle/);
assert.match(html, /Ô viền xám nhạt = phụ âm vô thanh/); assert.match(html, /✓ 80% · /, 'hàng chuyên đề đã xong hiện %');
assert.match(html, /data-href="#\/skills"/); assert.match(html, new RegExp('data-href="' + d.nextHref.replace(/[/?]/g, '\\$&') + '"'));
assert.doesNotMatch(html, /class="fixed [^"]*hidden|hidden bottom-0/, 'có bài kế tiếp → nút Học tiếp hiện');
// học hết: không còn ô hổ phách, nút dưới cùng ẩn, giáo viên ăn mừng
const all = Object.fromEntries(ids.map(i => [i, 100])), b = run(all);
assert.equal(b.d.next, undefined); assert.equal(b.d.cta, ''); assert.match(b.html, /hidden bottom-0/); assert.equal(b.d.count, '62/62'); assert.equal(b.d.nextL, 'Đã xong'); assert.match(b.d.teacher, /data-pose="cheer"/);
assert.equal(b.d.groups.flatMap(g => g.items).filter(x => x.next).length, 0);
// chưa có dữ liệu bài: thông báo thay vì khung trống
const r = run({}); assert.equal(r.d.empty, ''); assert.equal(r.d.count, '0/62');
// bài #/pron/<id> vẫn là khung cũ (chưa port): id lạ rơi về hub (hành vi cũ), id thật không gọi ST2
{ const c = { UI: { $: () => null, $$: () => [], esc, speak() {}, tts() {}, shuffle: a => a, stopRecognize() {} }, t: s => s, ST2: { mount() { throw new Error('bài không dùng khung hub'); } }, Chars: {}, setTimeout() {}, innerWidth: 1200 }; c.self = c; c.window = c;
  c.App = { state: { game: {}, settings: {} }, routes: {}, view: { innerHTML: '' }, bindCommon() {} }; for (const f of ['web/cpack/pron/sounds.js', 'web/js/pron.js']) vm.runInNewContext(rd(f), c);
  assert.doesNotThrow(() => c.App.routes.pron('iː')); assert.match(c.App.view.innerHTML, /Quy tắc|Luyện từ/); }
// CSS ≤ 10 KB gz (ngân sách màn Stitch)
import zlib from 'node:zlib'; assert.ok(zlib.gzipSync(rd('web/css/st-v2-pron-hub.css')).length <= 10 * 1024, 'CSS pron-hub ≤ 10 KB gz');
console.log('✓ pron-hub');
