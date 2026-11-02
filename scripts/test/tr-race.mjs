// Test đơn vị đường dịch câu (không mạng thật): web/js/dictionary.js raceTr qua translateVi/translateTo + web/js/tr-fast.js (kho dịch sẵn, IDB, ngân sách).
// Lỗi chủ báo 01/11: bôi đen câu → "Dịch" treo hàng chục giây (các nguồn chạy NỐI TIẾP 4 s + 8 s + 4 s + 8 s, ×3 lượt). Giờ: song song, ngân sách, hủy được.
//   node scripts/test/tr-race.mjs
import fs from 'node:fs';
import vm from 'node:vm';
let n = 0, fails = 0; const ok = (c, m) => { n++; if (!c) { fails++; console.log('✗', m); } };
const isG = u => /googleapis|[?&]src=gtx\b/.test(u); // web/app gọi Google qua proxy /api/dictlookup?src=gtx (#379), add-on gọi thẳng
const sleep = ms => new Promise(r => setTimeout(r, ms));
const src = f => fs.readFileSync('web/js/' + f, 'utf8');

// ---- môi trường giả: fetch theo máy chủ, Translator trên máy, IndexedDB trong bộ nhớ ----
function env({ gtx = 50, mm = 50, gtxText = 'GTX', mmText = 'MM', device = null, packs = {} } = {}) {
  const log = [], aborted = [];
  const delayed = (ms, body, signal, url) => new Promise((res, rej) => {
    const tm = ms === Infinity ? null : setTimeout(() => res(body), ms);
    if (signal) signal.addEventListener('abort', () => { clearTimeout(tm); aborted.push(url); rej(new Error('AbortError')); });
  });
  const resp = j => ({ ok: !!j, status: j ? 200 : 404, json: async () => j || {} });
  const fetch = (url, o = {}) => {
    const u = String(url), host = /[?&]src=gtx\b/.test(u) ? 'gtx' : (u.match(/^https?:\/\/([^/]+)/) || [, 'same'])[1]; log.push(host);
    if (/googleapis/.test(host) || /[?&]src=gtx\b/.test(u)) return delayed(gtx, resp(gtxText ? { sentences: [{ trans: gtxText }] } : null), o.signal, u);
    if (/mymemory/.test(host)) return delayed(mm, resp(mmText ? { responseData: { translatedText: mmText } } : null), o.signal, u);
    const m = u.match(/\/packs\/tr\/(\w+)\/(\d+)\.json$/); if (m) return delayed(packs.ms || 5, resp(packs[m[1] + '/' + m[2]] || null), o.signal, u);
    return Promise.resolve(resp(null));
  };
  const Translator = device && { availability: async () => 'available', create: async () => ({ translate: t => (device.ms === Infinity ? new Promise(() => {}) : sleep(device.ms).then(() => device.text)) }) };
  const store = new Map();
  const req = fn => { const q = {}; setTimeout(() => { try { q.result = fn(); q.onsuccess && q.onsuccess(); } catch (e) { q.onerror && q.onerror(); } }, 1); return q; };
  const indexedDB = { open: () => { const r = {}; setTimeout(() => { r.result = { createObjectStore() {}, transaction: () => ({ objectStore: () => ({ get: k => req(() => store.get(k)), put: (v, k) => req(() => store.set(k, v)), count: () => req(() => store.size), delete: k => store.delete(k), openCursor: () => req(() => null) }) }) }; r.onupgradeneeded && r.onupgradeneeded(); r.onsuccess && r.onsuccess(); }, 1); return r; } };
  const ctx = { fetch, AbortController, setTimeout, clearTimeout, console, Translator, indexedDB, document: { createElement: () => ({}), head: { appendChild: s => setTimeout(() => s.onload && s.onload(), 0) } }, location: { hostname: 'localhost' }, Promise, Map, Set, Date, Math, JSON, encodeURIComponent, String, Object, parseInt };
  ctx.self = ctx; vm.createContext(ctx);
  vm.runInContext(src('dictionary.js'), ctx); vm.runInContext(src('tr-fast.js'), ctx);
  return { ctx, D: ctx.Dict, F: ctx.TrFast, log, aborted, store };
}
const time = async p => { const t0 = Date.now(); const v = await p; return [v, Date.now() - t0]; };

// 1) Song song: Google chậm 5 s, MyMemory nhanh → MyMemory thắng ~0,9 s (trước đây: chờ Google hết 8 s rồi mới hỏi MyMemory)
{ const E = env({ gtx: 5000, mm: 30 }); const [v, ms] = await time(E.D.translateTo('Hard work pays off.', 'es'));
  ok(v === 'MM' && ms < 1400, `Google chậm → MyMemory song song thắng (${v}, ${ms} ms < 1400)`);
  ok(E.aborted.some(u => isG(u)), 'có kết quả → hủy yêu cầu Google còn chạy'); }
// 2) Google nhanh → thắng, MyMemory (hạn mức ngày) KHÔNG bị gọi
{ const E = env({ gtx: 40 }); const [v, ms] = await time(E.D.translateTo('Hard work pays off.', 'ja'));
  ok(v === 'GTX' && ms < 400, `Google nhanh → dùng ngay (${ms} ms)`); await sleep(1000);
  ok(!E.log.includes('api.mymemory.translated.net'), 'Google trả trước 0,9 s → không tốn lượt MyMemory'); }
// 3) Mọi nguồn treo → hết ngân sách trả '' đúng hạn, không treo
{ const E = env({ gtx: Infinity, mm: Infinity, device: { ms: Infinity } }); const [v, ms] = await time(E.D.translateTo('x y z', 'de', 'en', { ms: 300 }));
  ok(v === '' && ms >= 290 && ms < 450, `mọi nguồn treo → '' sau đúng ngân sách 300 ms (${ms} ms)`);
  ok(E.aborted.length >= 1, 'hết giờ → hủy các yêu cầu mạng còn treo'); }
// 4) Hủy (đổi vùng chọn) → trả '' ngay, hủy fetch
{ const E = env({ gtx: 3000, mm: 3000 }); const c = new AbortController(); const p = time(E.D.translateTo('Abort me please.', 'fr', 'en', { signal: c.signal }));
  await sleep(50); c.abort(); const [v, ms] = await p;
  ok(v === '' && ms < 150, `signal hủy → trả '' ngay (${ms} ms)`); ok(E.aborted.some(u => isG(u)), 'hủy → fetch Google bị hủy'); }
// 5) Translator trên máy treo → không chặn Google (trước đây chờ 4 s)
{ const E = env({ gtx: 60, device: { ms: Infinity } }); const [v, ms] = await time(E.D.translateTo('Device hangs here.', 'ko'));
  ok(v === 'GTX' && ms < 700, `Translator trên máy treo → Google vẫn về ngay (${ms} ms)`); }
// 6) Translator trên máy nhanh → dùng nó (offline, không tốn lượt)
{ const E = env({ gtx: 2000, device: { ms: 10, text: 'DEV' } }); const [v] = await time(E.D.translateTo('Device is quick.', 'ko'));
  ok(v === 'DEV', `Translator trên máy nhanh → dùng bản trên máy (${v})`); }
// 7) translateVi: song song + sửa chính tả (fixVi) + bộ đệm phiên
{ const E = env({ gtx: 30, gtxText: 'Chăm chỉ không phải lúc nào cũng đảm bảo thăng chức.' }); const v1 = await E.D.translateVi('Hard work does not always guarantee promotion.');
  const k = E.log.length; const [v2, ms] = await time(E.D.translateVi('Hard work does not always guarantee promotion.'));
  ok(/thăng chức/.test(v1) && v2 === v1 && E.log.length === k && ms < 20, `translateVi: bộ đệm phiên, lần 2 không gọi mạng (${ms} ms)`); }
// 8) Lô nhiều dòng (ai.js, call.js…) vẫn giữ nguyên số dòng
{ const E = env({ gtx: 20, gtxText: 'A\nB\nC' }); const v = await E.D.translateTo('a\nb\nc', 'es'); ok(v.split('\n').length === 3, 'lô 3 dòng → 3 dòng'); }
// 9) Nguồn trả rỗng nhanh → không trả rỗng sớm khi nguồn khác còn chạy
{ const E = env({ gtx: 10, gtxText: '', mm: 30 }); const v = await E.D.translateTo('Empty first.', 'es'); ok(v === 'MM', `Google rỗng → chờ MyMemory (${v})`); }

// ---- TrFast: kho dịch sẵn → IDB → mạng, ngân sách, bản đến muộn ----
const S = 'Hard work does not always guarantee promotion.';
{ const E0 = env(); const h = E0.F.hash(E0.F.norm(S)), sh = E0.F.shardOf(h);
  ok(/^[0-9a-f]{8}$/.test(h) && +sh >= 0 && +sh < 64, `băm 8 hex, mảnh 0…63 (${h} → ${sh})`);
  ok(E0.F.norm('  “Hard  work does not always guarantee promotion”. ') === E0.F.norm('hard work does not always guarantee promotion'), 'norm bỏ dấu câu đầu/cuối, khoảng trắng, hoa/thường, ngoặc cong');
  // 10) Câu có sẵn → kho dịch sẵn, không gọi mạng dịch, < 300 ms (p95 trên 20 lượt, mỗi lượt môi trường mới)
  const T = [];
  for (let i = 0; i < 20; i++) { const E = env({ gtx: 3000, packs: { ['vi/' + sh]: { [h]: 'Chăm chỉ không phải lúc nào cũng đảm bảo được thăng tiến.' }, ms: 5 + (i % 5) * 10 } });
    const [r, ms] = await time(E.F.get(S, 'vi')); T.push(ms);
    if (i === 0) { ok(r.src === 'pre' && /thăng tiến/.test(r.text), `câu có sẵn → kho dịch sẵn (${r.src})`); ok(!E.log.some(x => /googleapis|^gtx$|mymemory/.test(x)), 'câu có sẵn → không gọi Google/MyMemory');
      await sleep(20); ok(E.store.size === 1, 'bản từ kho được lưu vào IndexedDB'); } }
  T.sort((a, b) => a - b); const p95 = T[Math.ceil(T.length * 0.95) - 1]; ok(p95 <= 300, `câu có sẵn: p95 tới chữ đầu tiên ${p95} ms ≤ 300 ms`);
  // 11) Câu tự do, Google chậm 1 s → vẫn trong 2,5 s; lần 2 → bộ nhớ, tức thì
  { const E = env({ gtx: 1000, mm: 5000 }); const [r, ms] = await time(E.F.get('A brand new free sentence.', 'es'));
    ok(r.src === 'net' && r.text === 'GTX' && ms < 2500, `câu tự do (Google 1 s) → ${ms} ms < 2500`);
    const [r2, ms2] = await time(E.F.get('A brand new free sentence.', 'es')); ok(r2.src === 'mem' && ms2 < 10, `lần 2 → bộ nhớ phiên (${ms2} ms)`);
    await sleep(20); ok(E.store.has('es|' + E.F.hash(E.F.norm('A brand new free sentence.'))), 'bản mạng lưu IndexedDB theo ngôn ngữ + băm câu'); }
  // 12) IDB bền: phiên mới (bộ nhớ trống) đọc lại từ IDB, không gọi mạng
  { const E = env({ gtx: 3000 }); E.store.set('fr|' + E.F.hash(E.F.norm('Stored before.')), { t: 'Déjà stocké.', at: 1 });
    const [r, ms] = await time(E.F.get('Stored before.', 'fr')); ok(r.src === 'idb' && ms < 300 && !E.log.some(x => /googleapis|^gtx$/.test(x)), `IndexedDB → ${r.src} ${ms} ms, không gọi mạng`); }
  // 13) Mọi nguồn chậm 4 s → hết ngân sách 2,5 s trả timeout + late; late về sau vẫn có bản dịch và được lưu
  { const E = env({ gtx: 4000, mm: Infinity }); const [r, ms] = await time(E.F.get('Slow network sentence.', 'de'));
    ok(r.src === 'timeout' && ms >= 2400 && ms < 2800 && r.late, `mạng chậm → hết ngân sách đúng hạn (${ms} ms) kèm late`);
    const v = await r.late; ok(v === 'GTX', 'bản đến muộn vẫn về (để bảng tự thay)'); const [r2] = await time(E.F.get('Slow network sentence.', 'de')); ok(r2.src === 'mem', 'bản muộn đã vào bộ nhớ'); }
  // 14) Hủy giữa chừng → abort, không lưu
  { const E = env({ gtx: 2000 }); const c = new AbortController(); const p = E.F.get('Cancel this one.', 'ja', { signal: c.signal }); await sleep(300); c.abort(); const r = await p;
    ok(r.src === 'abort' && !r.text, `đổi vùng chọn → hủy (${r.src})`); }
  // 15) Mảnh kho tải chậm (1 s) nhưng Google nhanh → không chờ kho, mạng thắng
  { const E = env({ gtx: 50, packs: { ms: 1000 } }); const [r, ms] = await time(E.F.get('Pack is slow.', 'es')); ok(r.src === 'net' && ms < 600, `mảnh kho chậm → không chặn mạng (${ms} ms)`); }
  // 16) Tiếng Anh / rỗng → không dịch
  { const E = env(); const r = await E.F.get('Hello there.', 'en'); const r2 = await E.F.get('', 'vi'); ok(r.src === 'none' && r2.src === 'none', 'en/rỗng → không gọi gì'); }
}
// 17) Một nguồn duy nhất cho khóa kho: bộ sinh CI dùng đúng norm/hash của tr-fast.js
{ const gen = fs.readFileSync('scripts/gen-tr-packs.mjs', 'utf8'); ok(/web\/js\/tr-fast\.js/.test(gen) && /g\.TrFast/.test(gen), 'gen-tr-packs dùng norm/hash từ tr-fast.js (không chép lại)'); }
console.log(fails ? `✗ tr-race: ${fails}/${n} lỗi` : `✓ tr-race: ${n} kiểm tra đạt`);
process.exit(fails ? 1 : 0);
