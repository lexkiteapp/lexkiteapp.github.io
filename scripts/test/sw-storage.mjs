// Trần dung lượng cache của service worker (web/sw.js, docs/PERF-SCROLL.md › Lưu trữ): chạy sw.js thật trong vm với Cache API giả đúng thứ tự
// (keys() theo thứ tự ghi, put ghi đè = chuyển xuống cuối) rồi kiểm:
//  1) đổi phiên bản → xóa cache khung cũ, giữ dữ liệu người dùng (lk-meta, lk-audio, lk-vimg, lk-offline); máy cài cũ vượt trần → về trần ngay
//  2) 7 ngày mở 1500 file khác nhau (đồng thời) → cache runtime ≤ RT_MAX, khung SHELL không bao giờ bị đẩy ra
//  3) LRU thật: file vừa dùng lại (trúng cache) sống sót, file cũ nhất không dùng bị xóa; âm thanh + ảnh từ vựng cũng LRU, đúng trần
//  4) không cất phản hồi lỗi (404) vào cache
import fs from 'node:fs';
import vm from 'node:vm';

const SW = fs.readFileSync('web/sw.js', 'utf8');
let bad = 0;
const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) bad++; };
const num = k => +(new RegExp(k + ' = (\\d+)').exec(SW) || [])[1];
const RT_MAX = num('RT_MAX'), AUDIO_MAX = num('AUDIO_MAX'), VIMG_MAX = num('VIMG_MAX');
const CUR = (/const CACHE = '([^']+)'/.exec(SW) || [])[1];
const SHELL = JSON.parse((/const SHELL = (\[[^\]]+\])/.exec(SW) || [])[1].replace(/'/g, '"'));
ok(RT_MAX > SHELL.length && RT_MAX <= 600 && AUDIO_MAX <= 2000 && VIMG_MAX <= 800, `trần: runtime ${RT_MAX} mục (> khung ${SHELL.length}), âm thanh ${AUDIO_MAX}, ảnh ${VIMG_MAX} (chỉ siết)`);

const tick = () => new Promise(r => setImmediate(r));
function boot(seed = {}) {
  const store = new Map(), O = 'https://lexkite.com';
  const key = r => (typeof r === 'string' ? new URL(r, O).href : r.url);
  const mk = name => { const m = new Map(); store.set(name, m); return m; };
  for (const [n, entries] of Object.entries(seed)) { const m = mk(n); for (const u of entries) m.set(new URL(u, O).href, 'seed'); }
  const open = name => { const m = store.get(name) || mk(name); return {
    match: async r => (m.has(key(r)) ? new Response(m.get(key(r))) : undefined),
    put: async (r, res) => { const k = key(r), v = await res.text(); m.delete(k); m.set(k, v); },
    add: async r => { m.set(key(r), 'shell'); },
    delete: async r => m.delete(key(r)),
    keys: async () => [...m.keys()].map(url => ({ url })),
  }; };
  const caches = {
    open: async n => open(n), has: async n => store.has(n), delete: async n => store.delete(n), keys: async () => [...store.keys()],
    match: async r => { for (const m of store.values()) if (m.has(key(r))) return new Response(m.get(key(r))); },
  };
  const h = {}, net = { n: 0, status: 200 };
  const self = { registration: { scope: O + '/app/', periodicSync: null }, addEventListener: (t, f) => { h[t] = f; }, skipWaiting: async () => {}, clients: { claim: async () => {} } };
  const fetch = async r => { net.n++; return new Response('net:' + key(r), { status: net.status, headers: { 'content-type': 'text/javascript' } }); };
  vm.runInNewContext(SW, { self, caches, fetch, location: new URL(O + '/app/'), URL, Request: class { constructor(u) { this.url = key(u); } }, Response, setTimeout, clearTimeout, console });
  const fire = async (type, ev = {}) => { const ps = []; let rsp; ev.waitUntil = p => ps.push(p); ev.respondWith = p => { rsp = p; }; h[type](ev); const r = rsp && await rsp; await Promise.all(ps); for (let i = 0; i < 5; i++) await tick(); return r; };
  const get = (url, mode = 'no-cors') => fire('fetch', { request: { url: new URL(url, O).href, method: 'GET', mode } });
  const settle = async () => { for (let i = 0; i < 30; i++) await tick(); };
  return { store, fire, get, net, settle, n: c => (store.get(c) ? store.get(c).size : 0), has: (c, u) => !!store.get(c) && store.get(c).has(new URL(u, O).href) };
}

{ // 1) đổi phiên bản + máy cài cũ vượt trần
  const audio = Array.from({ length: AUDIO_MAX + 300 }, (_, i) => `https://audio.lexkite.com/audio/w/${i}.mp3`);
  const vimg = Array.from({ length: VIMG_MAX + 50 }, (_, i) => `https://media.lexkite.com/vimg/${String(i).padStart(16, '0')}.avif`);
  const S = boot({ 'lexkite-0-aaaaaaaaaa': ['/js/old.js', '/app/'], 'lexkite-20261001000000': ['/x.js'], 'lk-meta': ['/__meta'], 'lk-audio': audio, 'lk-vimg': vimg, 'lk-offline': ['/__offline'] });
  await S.fire('install'); await S.fire('activate'); await S.settle();
  const ks = [...S.store.keys()];
  ok(!ks.includes('lexkite-0-aaaaaaaaaa') && !ks.includes('lexkite-20261001000000'), 'đổi phiên bản: xóa mọi cache khung bản cũ');
  ok(ks.includes(CUR) && ks.includes('lk-meta') && ks.includes('lk-offline') && S.has('lk-meta', '/__meta'), 'đổi phiên bản: giữ cache hiện hành + dữ liệu người dùng (nhắc học, gói offline)');
  ok(S.n('lk-audio') === AUDIO_MAX && S.has('lk-audio', audio.at(-1)) && !S.has('lk-audio', audio[0]), `máy cũ ${audio.length} file âm thanh → về đúng ${AUDIO_MAX}, giữ file mới nhất`);
  ok(S.n('lk-vimg') === VIMG_MAX, `máy cũ ${vimg.length} ảnh từ vựng → về đúng ${VIMG_MAX}`);
  ok(SHELL.every(u => S.has(CUR, u)), `cài đặt: đủ ${SHELL.length} file khung`);
}

{ // 2) + 3) 7 ngày học: 1500 file runtime khác nhau, mở đồng thời từng loạt; 1 file dùng mỗi ngày
  const S = boot(); await S.fire('install'); await S.fire('activate');
  const daily = '/h/js/lesson.0123456789.js';
  const kinds = i => [`/h/js/m${i}.abcdef0123.js`, `/img/p${i}.webp`, `/cpack/c${i}.0123456789.js`, `/css/x${i}.css`][i % 4];
  let i = 0;
  for (let d = 0; d < 7; d++) {
    await S.get(daily);
    const batch = []; for (let j = 0; j < 215; j++) batch.push(S.get(kinds(i++))); // mở app: hàng chục request cùng lúc
    await Promise.all(batch); await S.settle();
  }
  const n = S.n(CUR), rt = n - SHELL.length;
  ok(rt <= RT_MAX, `7 ngày, ${i} file runtime → cache runtime ${rt} mục ≤ trần ${RT_MAX} (trước: không trần)`);
  ok(rt >= RT_MAX - 5, `trần dùng hết (${rt}) – không xóa thừa`);
  ok(SHELL.every(u => S.has(CUR, u)), 'khung SHELL không bao giờ bị đẩy ra (app vẫn mở offline)');
  ok(S.has(CUR, daily), 'LRU: file dùng mỗi ngày (trúng cache) vẫn còn dù đã ghi > trần file mới sau nó');
  ok(!S.has(CUR, kinds(0)) && S.has(CUR, kinds(i - 1)), 'LRU: file cũ nhất không dùng lại bị xóa, file mới nhất còn');
  const before = S.net.n; await S.get(daily); ok(S.net.n === before, 'file còn trong cache → không gọi mạng');

  S.net.status = 404; await S.get('/img/missing.webp'); await S.settle();
  ok(!S.has(CUR, '/img/missing.webp'), 'không cất phản hồi lỗi 404 vào cache (lần sau vẫn thử lại)');
  S.net.status = 200;

  // âm thanh: LRU (nghe lại = mới nhất), đúng trần
  const A = i => `https://audio.lexkite.com/audio/w/a${i}.mp3`;
  for (let k = 0; k < AUDIO_MAX; k++) await S.get(A(k));
  await S.get(A(0)); // nghe lại từ cũ nhất
  for (let k = AUDIO_MAX; k < AUDIO_MAX + 10; k++) await S.get(A(k));
  await S.settle();
  ok(S.n('lk-audio') === AUDIO_MAX && S.has('lk-audio', A(0)) && !S.has('lk-audio', A(1)), `âm thanh LRU: đúng ${AUDIO_MAX} file, từ vừa nghe lại còn, từ cũ nhất không nghe bị xóa`);
}

if (bad) { console.error(`✗ sw-storage: ${bad} lỗi`); process.exit(1); }
console.log('✓ sw-storage: trần + LRU + dọn bản cũ đúng');
