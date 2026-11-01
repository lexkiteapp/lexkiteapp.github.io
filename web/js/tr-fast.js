/* TrFast – MỘT đường dịch câu cho mọi điểm dịch khi học (bôi đen → Dịch, Lưu cụm, tra từ, câu ngữ cảnh) – tải lười, ngoài khung app.
 * Thứ tự: 1) bộ nhớ trong phiên → 2) kho DỊCH SẴN web/packs/tr/<lang>/<mảnh>.json (CI: scripts/gen-tr-packs.mjs – mọi câu ví dụ + định nghĩa có sẵn)
 *         song song với 3) IndexedDB bền (khóa = ngôn ngữ + băm câu) → 4) Dict.translateTo (các nguồn chạy song song, hủy được).
 * get() trả trong ngân sách (mặc định 2,5 s): { text, src: mem|pre|idb|net } – hết giờ → { text: '', src: 'timeout', late } (late = Promise bản dịch đến muộn, vẫn lưu đệm).
 * norm/hash dùng chung với bộ sinh kho trên CI (một nguồn – đổi ở đây là đổi cả khóa kho).
 */
(function (g) {
  const norm = s => String(s || '').replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, ' ').trim().replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '').toLowerCase();
  const hash = s => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); } return (h >>> 0).toString(16).padStart(8, '0'); }; // FNV-1a 32 bit
  const shardOf = h => String(parseInt(h.slice(0, 2), 16) >> 2); // 64 mảnh "0"…"63"
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const api = { norm, hash, shardOf };
  if (typeof document === 'undefined' && typeof indexedDB === 'undefined') { g.TrFast = api; return; } // Node (bộ sinh kho, test) chỉ cần norm/hash

  // ---------- 2) kho dịch sẵn: nạp lười theo mảnh, mỗi mảnh 1 lần ----------
  const host = (g.location && g.location.hostname) || '';
  const BASE = g.LK_PACK_BASE != null ? g.LK_PACK_BASE : /(^|\.)lexkite\.(com|pages\.dev)$|^(localhost|127\.0\.0\.1|\[::1\])$/.test(host) ? '' : 'https://lexkite.com';
  const SH = {};
  const shard = (tl, sh) => SH[tl + sh] || (SH[tl + sh] = fetch(`${BASE}/packs/tr/${tl}/${sh}.json`).then(r => (r.ok ? r.json() : {})).catch(() => { delete SH[tl + sh]; return {}; }));
  const preGet = (tl, h) => shard(tl, shardOf(h)).then(j => (j && j[h]) || '');

  // ---------- 3) IndexedDB bền: tối đa ~3000 câu, tỉa câu cũ nhất ----------
  let dbp = null, puts = 0;
  const db = () => dbp || (dbp = new Promise(res => {
    setTimeout(() => res(null), 800); // IDB kẹt (chế độ riêng tư, trình duyệt khóa) → bỏ qua lớp này, không chặn
    try { const r = indexedDB.open('lk-tr', 1); r.onupgradeneeded = () => r.result.createObjectStore('tr'); r.onsuccess = () => res(r.result); r.onerror = r.onblocked = () => res(null); } catch (e) { res(null); }
  }));
  const idb = (mode, fn) => db().then(d => d && new Promise(res => { try { const q = fn(d.transaction('tr', mode).objectStore('tr')); q.onsuccess = () => res(q.result); q.onerror = () => res(null); } catch (e) { res(null); } }));
  const idbGet = k => idb('readonly', s => s.get(k)).then(v => (v && v.t) || '');
  const prune = () => idb('readonly', s => s.count()).then(n => {
    if (!(n > 3000)) return;
    return db().then(d => { const rows = [], st = d.transaction('tr', 'readwrite').objectStore('tr'), c = st.openCursor();
      c.onsuccess = () => { const cur = c.result; if (cur) { rows.push([cur.key, cur.value.at || 0]); cur.continue(); return; } rows.sort((a, b) => a[1] - b[1]).slice(0, n - 2500).forEach(([k]) => st.delete(k)); }; });
  }).catch(() => {});
  const idbPut = (k, t) => idb('readwrite', s => s.put({ t, at: Date.now() }, k)).then(() => { if (++puts % 40 === 0) prune(); });

  // ---------- get: nhanh nhất có thể, không bao giờ treo ----------
  const mem = new Map();
  const firstOf = (ps, ms) => new Promise(res => { let n = ps.length; const tm = setTimeout(() => res(''), ms); ps.forEach(p => p.then(v => { if (v) { clearTimeout(tm); res(v); } else if (--n === 0) { clearTimeout(tm); res(''); } }, () => { if (--n === 0) { clearTimeout(tm); res(''); } })); });
  async function get(text, tl, o = {}) {
    text = String(text || '').trim();
    if (!text || !tl || tl === 'en') return { text: '', src: 'none' };
    const t0 = Date.now(), h = hash(norm(text)), k = tl + '|' + h, sig = o.signal, left = () => Math.max(0, (o.budget || 2500) - (Date.now() - t0));
    if (mem.has(k)) return { text: mem.get(k), src: 'mem' };
    // Kho dịch sẵn + IDB chạy song song; chậm quá 250 ms (mạng chậm khi tải mảnh) → mở luôn đường mạng, bản nào về trước thắng
    const localP = firstOf([preGet(tl, h).then(v => v && { text: v, src: 'pre' }), idbGet(k).then(v => v && { text: v, src: 'idb' })], o.localMs || 2000);
    const keep = r => { mem.set(k, r.text); if (r.src === 'pre') idbPut(k, r.text); return r; };
    let r = await Promise.race([localP, sleep(250).then(() => null)]);
    if (r) return keep(r);
    if (sig && sig.aborted) return { text: '', src: 'abort' };
    const D = g.Dict, net = D && D.translateTo ? D.translateTo(text, tl, 'en', { ms: o.lateMs || 12000, signal: sig }).then(v => { v = String(v || '').trim(); if (v) { mem.set(k, v); idbPut(k, v); } return v; }, () => '') : Promise.resolve('');
    r = await firstOf([localP, net.then(v => v && { text: v, src: 'net' })], left());
    if (sig && sig.aborted) return { text: '', src: 'abort' };
    if (r) return r.src === 'net' ? r : keep(r);
    return { text: '', src: 'timeout', late: net };
  }
  // Nạp sẵn mảnh kho cho câu sắp dịch (gọi khi thanh nút hiện lên – trước khi người dùng bấm "Dịch")
  const warm = (text, tl) => { if (text && tl && tl !== 'en') { const h = hash(norm(text)); shard(tl, shardOf(h)); db(); } };
  g.TrFast = Object.assign(api, { get, warm, _mem: mem });
})(typeof self !== 'undefined' ? self : globalThis);
