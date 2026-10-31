// Bài phát âm 44 âm IPA (web/js/pron/sounds.js) phải khớp bảng đặc trưng ngữ âm chuẩn scripts/pron/features.mjs:
// 1. mouth (độ cao/vị trí lưỡi, môi, hàm, dài/ngắn, nguyên âm đôi đầu→cuối, vị trí/cách cấu âm, hữu/vô thanh, bật hơi, âm bên) trùng TỪNG trường.
// 2. Lời giải thích (how/vn/tip) không được nói ngược đặc trưng: vd. /ɪ/ không được "hàm khép" hay "môi dàn rộng"; câu sai cũ (DENY) không quay lại.
// 3. Chú thích hình khẩu hình (pron.js mouthSvg) lấy từ đặc trưng và nằm DƯỚI hình tròn, không đè mép.
import fs from 'node:fs'; import vm from 'node:vm'; import assert from 'node:assert/strict';
import { REF, DENY, JAW } from '../pron/features.mjs';

const c = {}; vm.createContext(c);
vm.runInContext(fs.readFileSync('web/js/pron/sounds.js', 'utf8'), c);
const P = c.PRON.filter(x => ['vowels', 'diphthongs', 'consonants'].includes(x.group));
let n = 0; const errs = [];
const ok = (v, m) => { n++; if (!v) errs.push(m); };

// Bảng chuẩn tự nhất quán (độ mở hàm suy từ độ cao lưỡi)
for (const [id, r] of Object.entries(REF)) {
  for (const pt of r.kind === 'consonant' ? [] : [r, r.to].filter(Boolean)) ok(JAW[pt.height] === pt.jaw, `REF ${id}: jaw ${pt.jaw} ≠ ${JAW[pt.height]}`);
}
const cnt = g => P.filter(x => x.group === g).length;
ok(cnt('vowels') === 12 && cnt('diphthongs') === 8 && cnt('consonants') === 24, `cần 12/8/24 âm, có ${cnt('vowels')}/${cnt('diphthongs')}/${cnt('consonants')}`);
ok(Object.keys(REF).length === 44 && P.every(x => REF[x.id]) && Object.keys(REF).every(id => P.some(x => x.id === id)), 'sounds.js và bảng chuẩn phải cùng đúng 44 âm');

const norm = o => JSON.stringify(Object.keys(o).filter(k => k !== 'kind').sort().map(k => [k, typeof o[k] === 'object' ? norm(o[k]) : o[k]]));
const LONG = /dài/i, SHORT = /ngắn/i;
const VOICED = /rung dây thanh|dây thanh rung|có rung/i, VOICELESS = /không rung/i;
const PLACE = { lips: /môi/i, teeth: /răng.*môi|môi.*răng/i, 'tongue-teeth': /lưỡi.*răng/i, ridge: /lợi/i, 'post-ridge': /sau lợi|lùi sau \/s\//i, palate: /ngạc cứng/i, back: /ngạc mềm|cuống lưỡi/i, throat: /họng|thanh hầu/i, 'lips-back': /môi.*(ngạc mềm|cuống lưỡi)/i };
// Cụm chỉ đúng khi đặc trưng tương ứng có ở điểm đầu HOẶC điểm cuối; bỏ qua nếu ngay trước là phủ định ("không", "chưa") hoặc so sánh ("hơn")
const CLAIMS = [
  { re: /hàm (gần )?khép/gi, need: pts => pts.some(p => p.jaw === 'close'), what: 'hàm khép' },
  { re: /môi (kéo|dàn) (sang hai bên|ngang|rộng)|như đang cười/gi, need: pts => pts.some(p => p.lips === 'spread'), what: 'môi kéo/dàn' },
  { re: /môi (chu|tròn)|tròn môi|chu môi/gi, need: pts => pts.some(p => p.lips === 'round'), what: 'môi tròn' },
  { re: /hàm mở rộng|há miệng|mở miệng rộng|hạ hàm/gi, need: pts => pts.some(p => ['open-mid', 'open'].includes(p.jaw)), what: 'hàm mở rộng' },
];
const negated = (s, i) => /(không|chưa|đừng|hơn)\s*$/i.test(s.slice(Math.max(0, i - 12), i));

for (const x of P) {
  const r = REF[x.id]; if (!r) continue;
  ok(norm(x.mouth) === norm(r), `${x.id}: mouth ${JSON.stringify(x.mouth)} ≠ chuẩn ${JSON.stringify(r)}`);
  const all = [x.how, x.vn, x.tip].join(' ');
  for (const re of DENY[x.id] || []) ok(!re.test(all), `${x.id}: câu sai đã sửa quay lại (${re})`);
  if (r.kind !== 'consonant') {
    const pts = [r, r.to].filter(Boolean);
    for (const cl of CLAIMS) for (const m of x.how.matchAll(cl.re)) ok(negated(x.how, m.index) || cl.need(pts), `${x.id}: how nói "${m[0]}" nhưng chuẩn không có ${cl.what}`);
    if (r.kind === 'vowel') ok(r.long ? LONG.test(x.how) : SHORT.test(x.how), `${x.id}: how phải nói rõ âm ${r.long ? 'dài' : 'ngắn'}`);
    else ok(/bắt đầu/i.test(x.how), `${x.id}: nguyên âm đôi phải tả điểm bắt đầu → điểm cuối`);
  } else {
    ok(r.voiced ? VOICED.test(x.how) && !/không rung dây thanh/i.test(x.how) : VOICELESS.test(x.how), `${x.id}: how phải nói rõ ${r.voiced ? 'có' : 'không'} rung dây thanh`);
    ok(PLACE[r.place].test(x.how), `${x.id}: how phải nói vị trí cấu âm (${r.place})`);
    if (r.aspirated) ok(/bật hơi|luồng hơi/i.test(x.how + x.vn), `${x.id}: phải nhắc bật hơi đầu từ`);
    if (r.manner === 'nasal') ok(/mũi/.test(x.how), `${x.id}: âm mũi phải nói hơi qua mũi`);
    if (r.lateral) ok(/hai bên lưỡi/.test(x.how), `${x.id}: âm bên phải nói hơi đi hai bên lưỡi`);
  }
}

// 3. Chú thích hình: lấy từ đặc trưng, nằm dưới hình tròn (đáy y = 154)
const src = fs.readFileSync('web/js/pron.js', 'utf8');
const fn = src.slice(src.indexOf('  const lipsVi'), src.indexOf('  const placeVi'));
const ctx = { t: s => s, esc: s => String(s) }; vm.createContext(ctx); vm.runInContext(fn + ';this.mouthSvg = mouthSvg;', ctx);
for (const x of P.filter(x => x.mouth.lips && x.mouth.jaw)) {
  const svg = ctx.mouthSvg(x.mouth), ys = [...svg.matchAll(/<text[^>]*\by="(\d+)"/g)].map(m => +m[1]), vb = +svg.match(/viewBox="0 0 200 (\d+)"/)[1];
  ok(ys.length && ys.every(y => y - 10 >= 154 && y <= vb), `${x.id}: chú thích đè lên hình tròn hoặc tràn khung (y=${ys}, khung ${vb})`);
  const txt = [...svg.matchAll(/<text[^>]*>([^<]*)</g)].map(m => m[1]).join(' ');
  if (x.mouth.jaw !== 'close' && !(x.mouth.to && x.mouth.to.jaw === 'close')) ok(!/hàm gần khép|hàm khép/.test(txt), `${x.id}: chú thích "${txt}" nói hàm khép`);
  if (x.mouth.lips !== 'spread') ok(!txt.startsWith('môi hơi kéo') && !/môi dàn rộng/.test(txt), `${x.id}: chú thích "${txt}" nói môi kéo`);
}
ok(/<text[^>]*>môi tự nhiên · hàm hé</.test(ctx.mouthSvg(P.find(x => x.id === 'ɪ').mouth)), '/ɪ/: chú thích phải là "môi tự nhiên · hàm hé"');

if (errs.length) { console.error(errs.map(e => '✗ ' + e).join('\n')); console.error(`✗ pron-features: ${errs.length}/${n} lỗi`); process.exit(1); }
assert.ok(n > 200);
console.log(`✓ pron-features: ${P.length} âm khớp bảng đặc trưng ngữ âm (${n} kiểm)`);
