// Hồi quy CLS #/speak (quality-sweep #53, bản ar): cờ speak tắt → #/speak chuyển sang #/skills (màn v2 tràn khung) → v2pre phải có NGAY từ script đầu trang và trong route(),
// không thì thanh trên 56 px hiện rồi ẩn (#view tụt 56 px rồi về). Node thuần, không trình duyệt.
import fs from 'fs';
import vm from 'vm';
let bad = 0; const ok = (c, m) => { if (!c) { bad++; console.error('✗ ' + m); } else console.log('✓ ' + m); };
const html = fs.readFileSync('web/app/index.html', 'utf8');
const sc = html.split('<script>').map(x => x.split('</script>')[0]).find(x => x.includes("'train skills me say goal'"));
ok(!!sc, 'script đầu trang tìm thấy');
function run(hash, store) {
  const cl = new Set();
  const ls = { getItem: k => (k in store ? store[k] : null) };
  vm.runInNewContext(sc, { document: { body: { classList: { add: c => cl.add(c) } } }, localStorage: ls, sessionStorage: { getItem: () => null }, location: { search: '', hash } });
  return cl;
}
ok(run('#/speak', {}).has('v2pre'), '#/speak, cờ tắt (không cfg) → v2pre ngay lúc đầu');
ok(run('#/speak/cafe', { 'lk.speak': '0' }).has('v2pre'), '#/speak/cafe, lk.speak=0 → v2pre');
ok(!run('#/speak', { 'lk.speak': '1' }).has('v2pre'), 'cờ bật → không v2pre (màn speak có thanh trên riêng)');
ok(!run('#/speak', { 'lk.cfg': JSON.stringify({ v: { speak_pack: true } }), 'lk.ux1': '1' }).has('v2pre'), 'cfg speak_pack=true → không v2pre');
ok(run('#/skills', {}).has('v2pre'), '#/skills vẫn v2pre');
const app = fs.readFileSync('web/js/app.js', 'utf8');
ok(/preNow = ux1 && \(reviewHub \|\| V2_ROUTES\.has\(name\) \|\| \(name === 'speak' && !speakFlag\(\)\)/.test(app), 'route(): preNow gồm speak khi cờ tắt');
const sp = fs.readFileSync('web/js/speak/app.js', 'utf8');
const rule = f => f.match(/speak_pack; return ([^}]*)}/)[1];
ok(rule(app.slice(app.indexOf('const speakFlag'))) === rule(sp), 'speakFlag() cùng luật App.speakOn');
process.exit(bad ? 1 : 0);
