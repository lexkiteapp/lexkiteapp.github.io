// Ảnh minh hoạ từ vựng: cổng img.json (dict-consistency), cờ UI mặc định TẮT, shell +0 byte, SW có trần, việc nền tạm dừng & ưu tiên thấp nhất.
import fs from 'fs';
import vm from 'vm';
import assert from 'assert/strict';
import { checkImg } from '../lexicon/img.mjs';
import { promptFor, STYLE, fnv } from '../vocab-img/style.mjs';

const rd = p => fs.readFileSync(p, 'utf8'), J = p => JSON.parse(rd(p));
let n = 0; const ok = (c, m) => { assert.ok(c, m); n++; };

// 1. cổng img.json
const senses = new Set(['apple#n', 'run#v']), base = 'https://media.lexkite.com/vimg/';
const good = { v: 1, style: { v: 's1' }, base, items: { 'apple#n': { h: '0123456789abcdef', url: base + '0123456789abcdef.webp', alt: 'apple', sv: 's1', q: { score: 0.9 } } }, rejected: {} };
ok(checkImg(good, senses).length === 0, 'mục hợp lệ phải qua');
ok(checkImg(J('content/lexicon/img.json'), new Set(Object.keys(J('content/lexicon/vimg-select.json').items))).length === 0 || Object.keys(J('content/lexicon/img.json').items).length > 0, 'img.json gốc hợp lệ');
const bad = JSON.parse(JSON.stringify(good)); bad.items['pear#n'] = { h: 'xyz', url: 'https://lexkite.com/x.webp', alt: '', sv: '', q: {} }; bad.rejected['apple#n'] = { why: 'sai' };
const errs = checkImg(bad, senses);
for (const m of ['không có nghĩa này', 'h sai', 'url', 'alt', 'sv sai', 'q.score', 'rejected']) ok(errs.some(e => e.includes(m)), 'phải bắt lỗi: ' + m);
ok(checkImg({ ...good, base: 'https://lexkite.com/vimg/' }, senses).some(e => e.includes('Pages')), 'ảnh không được nằm trên Pages');

// 2. module UI: cờ mặc định TẮT → không tải gì; bật → <img lazy> đúng nghĩa + alt theo ngôn ngữ UI
const code = rd('web/js/vocab-img.js');
function sandbox(store, index) {
  const fetched = [], els = [];
  const mk = (k, alt) => { const a = { 'data-vimg': k, 'data-alt': alt }; const el = { innerHTML: '', getAttribute: x => a[x], setAttribute: (x, v) => { a[x] = v; } }; els.push(el); return el; };
  const ctx = { localStorage: { getItem: k => (k in store ? store[k] : null) }, fetch: u => { fetched.push(u); return Promise.resolve({ ok: true, json: () => Promise.resolve(index) }); },
    URL, location: { href: 'https://lexkite.com/app/' }, document: { currentScript: null, querySelectorAll: () => els.filter(e => !e.getAttribute('data-vimg-done')) } };
  ctx.self = ctx; vm.runInNewContext(code, ctx); return { V: ctx.VImg, fetched, mk };
}
const index = { v: 1, base, sv: 's1', m: { 'apple#n': '0123456789abcdef' } };
{ const { V, fetched } = sandbox({}, index); ok(V.enabled() === false, 'cờ mặc định TẮT'); ok(V.slot('apple', 'n') === '', 'tắt → không chèn chỗ ảnh'); ok(await V.get('apple', 'n') === null && fetched.length === 0, 'tắt → không tải chỉ mục'); }
{ const { V } = sandbox({ 'lk.cfg': JSON.stringify({ at: Date.now(), v: { vocab_img: false } }) }, index); ok(V.enabled() === false, 'config vocab_img=false → tắt'); }
{ const { V, fetched, mk } = sandbox({ 'lk.vimg': '1' }, index);
  const r = await V.get('Apple', 'n', 'quả táo'); ok(r && r.url === base + '0123456789abcdef.webp' && r.alt === 'Apple – quả táo', 'đúng url + alt theo ngôn ngữ UI');
  ok(fetched.length === 1 && /\/app\/js\/lexicon-img\.json$/.test(fetched[0]), 'chỉ mục tải lười từ js/lexicon-img.json');
  ok(await V.get('apple', 'v') === null, 'không lấy ảnh của loại từ khác (nghĩa khác)');
  mk('apple#n', 'apple – táo'); mk('run#v', 'run'); const k = await V.fill(); ok(k === 1, 'fill chỉ chèn nghĩa có ảnh'); }
{ const { V, mk } = sandbox({ 'lk.vimg': '1' }, index); const el = mk('apple#n', 'apple – "x"'); await V.fill(); ok(/loading="lazy"/.test(el.innerHTML) && /alt="apple – &quot;x&quot;"/.test(el.innerHTML) && /crossorigin="anonymous"/.test(el.innerHTML), 'img lazy + alt thoát ký tự + CORS cho SW'); }

// 3. shell +0 byte: khung app không nạp module/chỉ mục; SW lưu khi xem có trần
const shell = rd('web/app/index.html') + rd('web/js/app.js');
ok(!/vocab-img\.js|lexicon-img\.json/.test(shell), 'khung app (index.html/app.js) không được nạp vocab-img – chỉ tải lười');
const sw = rd('web/sw.js'), mx = +(/VIMG_MAX = (\d+)/.exec(sw) || [])[1];
ok(mx > 0 && mx <= 500, 'SW: trần ảnh lưu offline ≤ 500'); ok(/\\\/vimg\\\/\[0-9a-f\]\{16\}\\\.webp/.test(sw) && /trimVimg/.test(sw), 'SW chỉ lưu ảnh vimg theo mã băm + cắt theo trần');
ok(rd('web/js/lexicon-img.json') === rd('extension/app/js/lexicon-img.json'), 'add-on dùng cùng chỉ mục');

// 4. chọn nghĩa + phong cách
const sel = J('content/lexicon/vimg-select.json'), pilot = J('content/lexicon/vimg-pilot.json').items;
ok(sel.imageable === Object.keys(sel.items).length && sel.imageable > 500 && sel.imageable < sel.total, 'số nghĩa vẽ được hợp lý');
ok(pilot.length === 60 && pilot.every(k => sel.items[k]), 'pilot 60 nghĩa đều đạt ngưỡng');
for (const a of ['idea#n', 'freedom#n', 'however#adv']) ok(!sel.items[a], 'từ trừu tượng không có ảnh: ' + a);
const p = promptFor('kiss#v', { w: 'kiss', pos: 'v', def: 'to touch with the lips' });
ok(p.startsWith('Illustration of ') && /without any lettering/.test(p) && /suitable for young children/.test(p) && !/"kiss"|flashcard|caption/i.test(p), 'prompt: chủ thể trước, không chữ (không ngoặc kép/flashcard), an toàn');
ok(promptFor('kiss#v', { w: 'kiss', pos: 'v', def: 'x' }) === promptFor('kiss#v', { w: 'kiss', pos: 'v', def: 'x' }) && fnv('a') !== fnv('b'), 'người trong ảnh xoay vòng tất định');
ok(promptFor('apple#n', { w: 'apple', pos: 'n', def: 'x' }, '', 2).includes(STYLE.retry), 'lần thử 2 dùng biến thể cố định');

// 5. việc nền: tạm dừng, ưu tiên thấp nhất, không lịch
const reg = J('infra/jobs.json'), job = reg.jobs.find(j => j.id === 'vocab-img'), wf = rd('.github/workflows/vocab-img.yml');
ok(job && job.paused === true, 'vocab-img đăng ký & TẠM DỪNG'); ok(job.priority === reg.priorities[reg.priorities.length - 1], 'ưu tiên thấp nhất');
ok(job.resources.includes('workers_ai') && job.lease, 'thuê workers_ai'); ok(!/^\s*schedule:/m.test(wf), 'tạm dừng → workflow chưa có lịch');
ok(J('infra/resources.json').services.some(s => s.key === 'vocab-img'), 'đăng ký ở infra/resources.json');
console.log(`✓ vocab-img: ${n} kiểm`);
