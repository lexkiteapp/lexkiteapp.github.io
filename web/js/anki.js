/* 🃏 Liên thông Anki – xuất/nhập gói .apkg THẬT, chạy hoàn toàn trên máy (không thư viện ngoài, không WASM, không gửi dữ liệu đi đâu).
 * - Xuất: dựng file SQLite "collection.anki2" (lược đồ 11 – Anki desktop, AnkiDroid, AnkiMobile đều nhập được) + nén ZIP → .apkg.
 *   Kiểu ghi chú "Lexkite (EN)" có mẫu thẻ theo thương hiệu (sáng/tối). GUID cố định theo từ → xuất lại chỉ CẬP NHẬT thẻ trong Anki, không trùng.
 *   Tùy chọn giữ tiến độ: thẻ đã vào ôn theo ngày → thẻ ôn của Anki (hạn, khoảng cách, độ dễ) + trạng thái nhớ FSRS (s, d) trong cards.data.
 * - Nhập: .apkg/.colpkg (collection.anki21 / .anki2; định dạng mới .anki21b nén zstd → hướng dẫn xuất lại "Support older Anki versions"),
 *   .txt/.tsv/.csv (kể cả dòng #separator/#columns của Anki). Chữ HTML được lọc thành chữ thường (không bao giờ innerHTML nội dung lạ).
 * Phần lõi (AnkiKit) thuần JS, kiểm thử bằng scripts/test/anki.mjs. Phần giao diện (AnkiUI) nạp lười qua App.need('anki'). */
(function (g) {
  'use strict';
  let te, td; // tạo khi dùng (môi trường thiếu TextEncoder vẫn nạp được file)
  const enc = { encode: s => (te || (te = new TextEncoder())).encode(s) }, dec = { decode: b => (td || (td = new TextDecoder())).decode(b) };
  const DAY = 86400000;

  // ================= CRC32 & ZIP =================
  const CRC = (() => { const tb = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; tb[n] = c >>> 0; } return tb; })();
  function crc32(u8) { let c = 0xFFFFFFFF; for (let i = 0; i < u8.length; i++) c = CRC[(c ^ u8[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
  const pipeThrough = async (u8, stream) => new Uint8Array(await new Response(new Blob([u8]).stream().pipeThrough(stream)).arrayBuffer());

  async function zipWrite(files, { deflate = true } = {}) {
    const canDeflate = deflate && typeof CompressionStream !== 'undefined';
    const d = new Date(), dosTime = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1), dosDate = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
    const parts = [], central = []; let off = 0;
    for (const f of files) {
      const name = enc.encode(f.name), raw = f.data, crc = crc32(raw);
      let data = raw, method = 0;
      if (canDeflate && raw.length > 64) { const z = await pipeThrough(raw, new CompressionStream('deflate-raw')); if (z.length < raw.length) { data = z; method = 8; } }
      const h = new DataView(new ArrayBuffer(30));
      h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(8, method, true);
      h.setUint16(10, dosTime, true); h.setUint16(12, dosDate, true); h.setUint32(14, crc, true); h.setUint32(18, data.length, true); h.setUint32(22, raw.length, true);
      h.setUint16(26, name.length, true); h.setUint16(28, 0, true);
      parts.push(new Uint8Array(h.buffer), name, data);
      const c = new DataView(new ArrayBuffer(46));
      c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true); c.setUint16(10, method, true);
      c.setUint16(12, dosTime, true); c.setUint16(14, dosDate, true); c.setUint32(16, crc, true); c.setUint32(20, data.length, true); c.setUint32(24, raw.length, true);
      c.setUint16(28, name.length, true); c.setUint32(42, off, true);
      central.push(new Uint8Array(c.buffer), name);
      off += 30 + name.length + data.length;
    }
    const cdSize = central.reduce((s, p) => s + p.length, 0), e = new DataView(new ArrayBuffer(22));
    e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true); e.setUint32(12, cdSize, true); e.setUint32(16, off, true);
    return concat([...parts, ...central, new Uint8Array(e.buffer)]);
  }
  function concat(arr) { const n = arr.reduce((s, a) => s + a.length, 0), out = new Uint8Array(n); let o = 0; for (const a of arr) { out.set(a, o); o += a.length; } return out; }

  // Đọc ZIP theo kiểu truy cập ngẫu nhiên (Blob.slice) → gói nhiều trăm MB ảnh/âm thanh vẫn chỉ đọc đúng phần cần
  async function zipOpen(src) {
    const size = src instanceof Uint8Array ? src.length : src.size;
    const read = async (o, n) => src instanceof Uint8Array ? src.subarray(o, o + n) : new Uint8Array(await src.slice(o, o + n).arrayBuffer());
    const tl = Math.min(size, 65557), tail = await read(size - tl, tl), tv = new DataView(tail.buffer, tail.byteOffset, tail.byteLength);
    let p = -1; for (let i = tl - 22; i >= 0; i--) if (tv.getUint32(i, true) === 0x06054b50) { p = i; break; }
    if (p < 0) throw err('zip');
    let count = tv.getUint16(p + 10, true), cdSize = tv.getUint32(p + 12, true), cdOff = tv.getUint32(p + 16, true);
    if ((cdOff === 0xFFFFFFFF || count === 0xFFFF) && p >= 20 && tv.getUint32(p - 20, true) === 0x07064b50) { // ZIP64
      const lo = Number(tv.getBigUint64(p - 12, true)), z = await read(lo, 56), zv = new DataView(z.buffer, z.byteOffset, 56);
      count = Number(zv.getBigUint64(32, true)); cdSize = Number(zv.getBigUint64(40, true)); cdOff = Number(zv.getBigUint64(48, true));
    }
    const cd = await read(cdOff, cdSize), cv = new DataView(cd.buffer, cd.byteOffset, cd.byteLength), entries = new Map();
    for (let i = 0, q = 0; i < count && q + 46 <= cd.length; i++) {
      if (cv.getUint32(q, true) !== 0x02014b50) break;
      const nl = cv.getUint16(q + 28, true), xl = cv.getUint16(q + 30, true), cl = cv.getUint16(q + 32, true);
      const e = { method: cv.getUint16(q + 10, true), csize: cv.getUint32(q + 20, true), usize: cv.getUint32(q + 24, true), lho: cv.getUint32(q + 42, true) };
      for (let x = q + 46 + nl; x + 4 <= q + 46 + nl + xl;) { const id = cv.getUint16(x, true), sz = cv.getUint16(x + 2, true); if (id === 1) { let y = x + 4; if (e.usize === 0xFFFFFFFF) { e.usize = Number(cv.getBigUint64(y, true)); y += 8; } if (e.csize === 0xFFFFFFFF) { e.csize = Number(cv.getBigUint64(y, true)); y += 8; } if (e.lho === 0xFFFFFFFF) e.lho = Number(cv.getBigUint64(y, true)); } x += 4 + sz; }
      entries.set(dec.decode(cd.subarray(q + 46, q + 46 + nl)), e);
      q += 46 + nl + xl + cl;
    }
    return {
      names: [...entries.keys()],
      has: n => entries.has(n),
      async get(n) {
        const e = entries.get(n); if (!e) throw err('zip');
        const lh = await read(e.lho, 30), lv = new DataView(lh.buffer, lh.byteOffset, 30);
        const data = await read(e.lho + 30 + lv.getUint16(26, true) + lv.getUint16(28, true), e.csize);
        if (e.method === 0) return data.slice();
        if (e.method === 8) { if (typeof DecompressionStream === 'undefined') throw err('browser'); return pipeThrough(data, new DecompressionStream('deflate-raw')); }
        throw err('zip-method');
      },
    };
  }
  const err = (code, extra) => Object.assign(new Error(code), { code }, extra || {});

  // ================= SQLite (đọc/ghi tối giản, đúng đặc tả "SQLite Database File Format" (fileformat2)) =================
  const PS = 4096; // cỡ trang khi ghi
  const varintLen = v => { let n = 1; while (v >= 128 && n < 9) { v = Math.floor(v / 128); n++; } return n; };
  function putVarint(b, o, v) { // v ≥ 0, < 2^56
    if (v < 128) { b[o] = v; return 1; }
    const g7 = []; while (v > 0) { g7.push(v % 128); v = Math.floor(v / 128); }
    const n = g7.length; for (let i = 0; i < n; i++) b[o + i] = g7[n - 1 - i] | (i < n - 1 ? 0x80 : 0);
    return n;
  }
  function getVarint(b, p) {
    let v = 0;
    for (let i = 0; i < 8; i++) { const c = b[p + i]; v = v * 128 + (c & 0x7f); if (!(c & 0x80)) return [v, i + 1]; }
    return [v * 256 + b[p + 8], 9];
  }
  const INT_SIZES = [[1, 1], [2, 2], [3, 3], [4, 4], [6, 5], [8, 6]];
  function intType(v) { for (const [len, ty] of INT_SIZES) { if (len === 8) return [len, ty]; const lim = 2 ** (8 * len - 1); if (v >= -lim && v < lim) return [len, ty]; } }
  function encodeRecord(values) {
    const types = [], bodies = []; let bl = 0;
    for (const v of values) {
      if (v == null) types.push(0);
      else if (typeof v === 'number' && Number.isInteger(v)) {
        if (v === 0) types.push(8); else if (v === 1) types.push(9);
        else { const [len, ty] = intType(v); types.push(ty); bodies.push(['i', v, len]); bl += len; }
      } else if (typeof v === 'number') { types.push(7); bodies.push(['f', v, 8]); bl += 8; }
      else { const b = v instanceof Uint8Array ? v : enc.encode(String(v)); types.push((v instanceof Uint8Array ? 12 : 13) + 2 * b.length); bodies.push(['b', b, b.length]); bl += b.length; }
    }
    const tl = types.reduce((s, t) => s + varintLen(t), 0); let hl = tl + 1; while (tl + varintLen(hl) !== hl) hl = tl + varintLen(hl);
    const out = new Uint8Array(hl + bl), dv = new DataView(out.buffer); let o = putVarint(out, 0, hl);
    for (const t of types) o += putVarint(out, o, t);
    for (const [k, v, len] of bodies) {
      if (k === 'b') { out.set(v, o); }
      else if (k === 'f') dv.setFloat64(o, v);
      else if (len === 8) dv.setBigInt64(o, BigInt(v));
      else { let x = v < 0 ? v + 2 ** (8 * len) : v; for (let i = len - 1; i >= 0; i--) { out[o + i] = x % 256; x = Math.floor(x / 256); } }
      o += len;
    }
    return out;
  }
  // objects: [{ type:'table', name, sql, rows:[{ rowid, values }] (rowid tăng dần) }]
  function sqliteWrite(objects) {
    const U = PS, pages = [null, new Uint8Array(PS)];
    const alloc = () => { pages.push(new Uint8Array(PS)); return pages.length - 1; };
    const X = U - 35, M = Math.floor((U - 12) * 32 / 255) - 23;
    const leafCell = (rowid, rec) => {
      const P = rec.length; let local = P;
      if (P > X) { const K = M + ((P - M) % (U - 4)); local = K <= X ? K : M; }
      const head = new Uint8Array(18); let h = putVarint(head, 0, P); h += putVarint(head, h, rowid);
      const cell = new Uint8Array(h + local + (local < P ? 4 : 0)); cell.set(head.subarray(0, h)); cell.set(rec.subarray(0, local), h);
      if (local < P) { // trang tràn
        let rest = rec.subarray(local), first = 0, prev = null;
        while (rest.length) { const pg = alloc(), buf = pages[pg]; if (prev) new DataView(prev.buffer).setUint32(0, pg); else first = pg; const n = Math.min(rest.length, U - 4); buf.set(rest.subarray(0, n), 4); rest = rest.subarray(n); prev = buf; }
        new DataView(cell.buffer).setUint32(h + local, first);
      }
      return cell;
    };
    const writePage = (pg, type, cells, right) => {
      const buf = pages[pg], off = pg === 1 ? 100 : 0, dv = new DataView(buf.buffer), interior = type === 0x05;
      buf[off] = type; dv.setUint16(off + 3, cells.length); if (interior) dv.setUint32(off + 8, right);
      let ptr = off + (interior ? 12 : 8), content = U;
      for (const c of cells) { content -= c.length; buf.set(c, content); dv.setUint16(ptr, content); ptr += 2; }
      if (ptr > content) throw err('sqlite-overflow');
      dv.setUint16(off + 5, content === 65536 ? 0 : content);
    };
    const buildTree = (rows, fixedPage) => {
      const leaves = []; let cells = [], used = 8, maxKey = 0;
      const room = () => U - (fixedPage === 1 && !leaves.length ? 100 : 0);
      const flush = () => { const pg = fixedPage && !leaves.length ? fixedPage : alloc(); writePage(pg, 0x0D, cells, 0); leaves.push({ pg, maxKey }); cells = []; used = 8; };
      for (const r of rows) {
        const c = leafCell(r.rowid, encodeRecord(r.values));
        if (cells.length && used + 2 + c.length > room()) flush();
        cells.push(c); used += 2 + c.length; maxKey = r.rowid;
      }
      flush();
      if (fixedPage && leaves.length > 1) throw err('sqlite-schema');
      let level = leaves;
      const per = Math.floor((U - 12) / (2 + 13)); // số ô tối đa/trang trong (ô ≤ 13 byte)
      while (level.length > 1) {
        const groups = []; for (let i = 0; i < level.length; i += per + 1) groups.push(level.slice(i, i + per + 1));
        const last = groups[groups.length - 1]; if (last.length === 1 && groups.length > 1) last.unshift(groups[groups.length - 2].pop());
        level = groups.map(gr => {
          const pg = alloc(), right = gr[gr.length - 1];
          const cells2 = gr.slice(0, -1).map(ch => { const b = new Uint8Array(13); new DataView(b.buffer).setUint32(0, ch.pg); const n = putVarint(b, 4, ch.maxKey); return b.slice(0, 4 + n); });
          writePage(pg, 0x05, cells2, right.pg); return { pg, maxKey: right.maxKey };
        });
      }
      return level[0].pg;
    };
    const master = [];
    objects.forEach((o, i) => { const root = buildTree(o.rows); master.push({ rowid: i + 1, values: [o.type || 'table', o.name, o.name, root, o.sql] }); });
    buildTree(master, 1);
    const h = pages[1], dv = new DataView(h.buffer);
    h.set(enc.encode('SQLite format 3\0'));
    dv.setUint16(16, PS); h[18] = 1; h[19] = 1; h[20] = 0; h[21] = 64; h[22] = 32; h[23] = 32;
    dv.setUint32(24, 1); dv.setUint32(28, pages.length - 1); dv.setUint32(40, 1); dv.setUint32(44, 4); dv.setUint32(56, 1); dv.setUint32(92, 1); dv.setUint32(96, 3046000);
    return concat(pages.slice(1));
  }

  function sqliteOpen(b) {
    if (b.length < 100 || dec.decode(b.subarray(0, 15)) !== 'SQLite format 3') throw err('sqlite');
    const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
    let ps = dv.getUint16(16); if (ps === 1) ps = 65536;
    const U = ps - b[20], X = U - 35, M = Math.floor((U - 12) * 32 / 255) - 23, nPages = Math.floor(b.length / ps);
    if (dv.getUint32(56) > 1) throw err('sqlite-utf16');
    const XI = Math.floor((U - 12) * 64 / 255) - 23; // ngưỡng tràn của trang chỉ mục (bảng WITHOUT ROWID)
    const payloadOf = (p, index) => {
      const [P, n1] = getVarint(b, p), [rowid, n2] = index ? [0, 0] : getVarint(b, p + n1), s = p + n1 + n2, X2 = index ? XI : X;
      let local = P; if (P > X2) { const K = M + ((P - M) % (U - 4)); local = K <= X2 ? K : M; }
      if (local === P) return [rowid, b.subarray(s, s + P)];
      const out = new Uint8Array(P); out.set(b.subarray(s, s + local)); let o = local, next = dv.getUint32(s + local), guard = 0;
      while (o < P && next && guard++ < nPages) { const base = (next - 1) * ps, n = Math.min(P - o, U - 4); out.set(b.subarray(base + 4, base + 4 + n), o); o += n; next = dv.getUint32(base); }
      return [rowid, out];
    };
    const decodeRecord = rec => {
      const [hl, n0] = getVarint(rec, 0), types = []; let p = n0;
      while (p < hl) { const [t, n] = getVarint(rec, p); types.push(t); p += n; }
      const vals = [], rv = new DataView(rec.buffer, rec.byteOffset, rec.byteLength); let o = hl;
      for (const t of types) {
        if (t === 0) vals.push(null); else if (t === 8) vals.push(0); else if (t === 9) vals.push(1);
        else if (t <= 6) { const len = [0, 1, 2, 3, 4, 6, 8][t]; if (len === 8) vals.push(Number(rv.getBigInt64(o))); else { let x = 0; for (let i = 0; i < len; i++) x = x * 256 + rec[o + i]; if (rec[o] & 0x80) x -= 2 ** (8 * len); vals.push(x); } o += len; }
        else if (t === 7) { vals.push(rv.getFloat64(o)); o += 8; }
        else if (t >= 12) { const len = (t - (t % 2 ? 13 : 12)) / 2, sl = rec.subarray(o, o + len); vals.push(t % 2 ? dec.decode(sl) : sl.slice()); o += len; }
        else vals.push(null);
      }
      return vals;
    };
    const walk = (pg, out, depth = 0) => {
      if (pg < 1 || pg > nPages || depth > 40) throw err('sqlite');
      const base = (pg - 1) * ps, off = base + (pg === 1 ? 100 : 0), type = b[off], n = dv.getUint16(off + 3);
      if (type === 0x0D) { for (let i = 0; i < n; i++) { const [rowid, rec] = payloadOf(base + dv.getUint16(off + 8 + 2 * i)); out.push([rowid, rec]); } }
      else if (type === 0x05) { for (let i = 0; i < n; i++) walk(dv.getUint32(base + dv.getUint16(off + 12 + 2 * i)), out, depth + 1); walk(dv.getUint32(off + 8), out, depth + 1); }
      else if (type === 0x0A) { for (let i = 0; i < n; i++) out.push(payloadOf(base + dv.getUint16(off + 8 + 2 * i), true)); }
      else if (type === 0x02) { for (let i = 0; i < n; i++) { const c = base + dv.getUint16(off + 12 + 2 * i); walk(dv.getUint32(c), out, depth + 1); out.push(payloadOf(c + 4, true)); } walk(dv.getUint32(off + 8), out, depth + 1); }
      else throw err('sqlite');
      return out;
    };
    const schema = walk(1, []).map(([, rec]) => { const [type, name, , root, sql] = decodeRecord(rec); return { type, name, root, sql }; });
    const colsOf = sql => {
      const body = String(sql || '').replace(/--[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
      const inner = body.slice(body.indexOf('(') + 1, body.lastIndexOf(')')); const parts = []; let depth = 0, cur = '';
      for (const ch of inner) { if (ch === '(') depth++; if (ch === ')') depth--; if (ch === ',' && !depth) { parts.push(cur); cur = ''; } else cur += ch; }
      parts.push(cur);
      const unq = x => x.trim().replace(/^["`[]|["`\]]$/g, '');
      const cols = parts.map(s => s.trim()).filter(s => s && !/^(primary|unique|check|foreign|constraint)\b/i.test(s)).map(s => ({ name: unq(s.split(/\s+/)[0]), pk: /^\S+\s+integer\b/i.test(s) && /\bprimary\s+key\b/i.test(s), key: /\bprimary\s+key\b/i.test(s) }));
      if (!/without\s+rowid\s*$/i.test(body.trim())) return cols;
      // WITHOUT ROWID: bản ghi lưu cột khóa chính trước (theo thứ tự khóa), rồi các cột còn lại
      const pkc = parts.map(x => x.trim()).find(x => /^primary\s+key\s*\(/i.test(x)), keys = pkc ? pkc.slice(pkc.indexOf('(') + 1, pkc.lastIndexOf(')')).split(',').map(x => unq(x.split(/\s+/).filter(Boolean)[0] || '')) : cols.filter(c => c.key).map(c => c.name);
      return [...keys.map(k => cols.find(c => c.name === k)).filter(Boolean), ...cols.filter(c => !keys.includes(c.name))].map(c => ({ name: c.name, pk: false }));
    };
    return {
      tables: () => schema.filter(s => s.type === 'table').map(s => s.name),
      // Trả về mảng đối tượng {cột: giá trị}; cột INTEGER PRIMARY KEY lấy từ rowid
      rows(name) {
        const s = schema.find(x => x.type === 'table' && x.name === name); if (!s) return null;
        const cols = colsOf(s.sql);
        return walk(s.root, []).map(([rowid, rec]) => { const v = decodeRecord(rec), o = {}; cols.forEach((c, i) => { o[c.name] = c.pk && v[i] == null ? rowid : (i < v.length ? v[i] : null); }); return o; });
      },
    };
  }

  // ================= Chữ: HTML → chữ thường an toàn =================
  const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '–', mdash: '—', hellip: '…', laquo: '«', raquo: '»', ldquo: '“', rdquo: '”', lsquo: '‘', rsquo: '’', middot: '·', bull: '•', copy: '©', reg: '®', trade: '™', deg: '°', times: '×', divide: '÷', rarr: '→', larr: '←', harr: '↔', shy: '', zwnj: '', zwj: '', ensp: ' ', emsp: ' ', thinsp: ' ' };
  const decodeEntities = s => s.replace(/&(#x[0-9a-f]{1,6}|#\d{1,7}|[a-z]{2,8});/gi, (m, e) => {
    if (e[0] === '#') { const cp = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10); return cp > 0 && cp <= 0x10FFFF && !(cp >= 0xD800 && cp <= 0xDFFF) ? String.fromCodePoint(cp) : ''; }
    const v = ENT[e.toLowerCase()]; return v != null ? v : m;
  });
  // Kết quả KHÔNG BAO GIỜ chứa < > (đổi thành ‹ ›) → dù nơi hiển thị quên escape cũng không chèn được thẻ HTML
  function htmlToText(s, sep = ' · ') {
    s = String(s == null ? '' : s);
    if (s.length > 20000) s = s.slice(0, 20000);
    s = s.replace(/<(script|style|template|iframe|object|svg|math|noscript|head|title)\b[\s\S]*?<\/\1\s*>/gi, ' ')
      .replace(/<!--[\s\S]*?(-->|$)/g, ' ')
      .replace(/<br\s*\/?>|<\/(div|p|li|tr|h[1-6]|blockquote)\s*>|<(li|tr)\b[^>]*>/gi, '\n')
      .replace(/<\/?[a-z!/?][^>]*>/gi, '').replace(/<[a-z!/?][^>]*$/i, '')
      .replace(/\[sound:[^\]]*\]/g, '').replace(/\[anki:[^\]]*\][\s\S]*?\[\/anki:[^\]]*\]/g, '')
      .replace(/\{\{c\d+::([\s\S]*?)(?:::[\s\S]*?)?\}\}/g, '$1');
    s = decodeEntities(s).replace(/</g, '‹').replace(/>/g, '›').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u200B\uFEFF]/g, '');
    return s.split(/\r?\n/).map(x => x.replace(/[\s\u00A0]+/g, ' ').trim()).filter(Boolean).join(sep).trim();
  }
  const escHtml = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // ================= CSV / TSV (kể cả tiêu đề #separator… của Anki) =================
  const SEP_NAMES = { comma: ',', semicolon: ';', tab: '\t', space: ' ', pipe: '|', colon: ':' };
  function parseDelimited(text) {
    text = String(text || '').replace(/^\uFEFF/, '');
    const meta = { sep: null, html: null, columns: null, tagsCol: 0, deck: '', notetype: '', tags: [] };
    let pos = 0;
    while (pos < text.length && text[pos] === '#') {
      const end = text.indexOf('\n', pos), line = text.slice(pos + 1, end < 0 ? text.length : end).replace(/\r$/, '');
      const m = line.match(/^([a-z ]+):(.*)$/i);
      if (m) {
        const k = m[1].trim().toLowerCase(), v = m[2];
        if (k === 'separator') meta.sep = SEP_NAMES[v.trim().toLowerCase()] || v.trim()[0] || (v[0] === ' ' ? ' ' : null);
        else if (k === 'html') meta.html = /^true$/i.test(v.trim());
        else if (k === 'tags column') meta.tagsCol = +v || 0;
        else if (k === 'deck') meta.deck = v.trim();
        else if (k === 'notetype') meta.notetype = v.trim();
        else if (k === 'tags') meta.tags = v.trim().split(/\s+/).filter(Boolean);
        else if (k === 'columns') meta.columnsRaw = v;
      }
      pos = end < 0 ? text.length : end + 1;
    }
    const body = text.slice(pos);
    let sep = meta.sep;
    if (!sep) { // đoán dấu phân cách từ vài dòng đầu (bỏ phần trong ngoặc kép)
      const sample = body.slice(0, 8000).replace(/"(?:[^"]|"")*"/g, '').split(/\r?\n/).filter(l => l.trim()).slice(0, 20);
      let best = '\t', bestScore = 0;
      for (const c of ['\t', ';', ',', '|']) { const counts = sample.map(l => l.split(c).length - 1); const hit = counts.filter(n => n > 0).length; const score = hit * 10 - (new Set(counts).size); if (hit && score > bestScore) { best = c; bestScore = score; } }
      sep = best;
    }
    const rows = []; let row = [], f = '', q = false, start = true;
    for (let i = 0; i < body.length; i++) {
      const ch = body[i];
      if (q) { if (ch === '"') { if (body[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += ch; continue; }
      if (ch === '"' && start) { q = true; start = false; continue; }
      if (ch === sep) { row.push(f); f = ''; start = true; continue; }
      if (ch === '\n' || ch === '\r') { if (ch === '\r' && body[i + 1] === '\n') i++; row.push(f); rows.push(row); row = []; f = ''; start = true; continue; }
      f += ch; start = false;
    }
    if (f !== '' || row.length) { row.push(f); rows.push(row); }
    const data = rows.filter(r => r.some(c => c.trim()));
    let columns = meta.columnsRaw != null ? meta.columnsRaw.split(sep).map(s => s.trim()) : null;
    // Dòng tiêu đề: ≥ 2 ô là tên cột quen thuộc, hoặc ô đầu là "Word" (kể cả bản dịch – CSV Lexkite xuất theo ngôn ngữ giao diện)
    const HEAD = /^(front|back|word|words|term|vocab|vocabulary|english|meaning|meanings|definition|translation|example|examples|example meaning|sentence|ipa|pronunciation|phonetic|collocations?|tags?|notes?|từ|từ vựng|nghĩa|ví dụ|phiên âm|câu ví dụ)$/i;
    const WORDHEAD = /^(word|words|term|front|vocab|vocabulary|từ|từ vựng|palabra|palavra|mot|wort|kata|คำ|单词|単語|단어|शब्द|الكلمة|слово|kelime)$/i;
    const r0 = (data[0] || []).map(c => c.trim());
    if (!columns && data.length > 1 && r0.filter(Boolean).length >= 2 && r0.every(c => c.length <= 40) && (r0.filter(c => HEAD.test(c)).length >= 2 || WORDHEAD.test(r0[0]))) columns = data.shift().map(s => s.trim());
    const width = Math.max(columns ? columns.length : 0, ...data.slice(0, 500).map(r => r.length));
    const html = meta.html != null ? meta.html : /<\/?(b|i|u|br|div|span|p|img|font)\b|&(amp|nbsp|lt|gt);/i.test(body.slice(0, 20000));
    const tagsIdx = meta.tagsCol ? meta.tagsCol - 1 : (columns || []).findIndex(c => /^tags?$/i.test(c));
    return { kind: 'text', deck: meta.deck, html, sep, columns: Array.from({ length: width }, (_, i) => (columns && columns[i]) || ''), tagsIdx, rows: data.map(r => ({ cells: r, tags: [...meta.tags, ...(tagsIdx >= 0 && r[tagsIdx] ? r[tagsIdx].trim().split(/\s+/) : [])] })) };
  }
  const csvCell = (s, sep) => { s = String(s == null ? '' : s); return /["\n\r]/.test(s) || s.includes(sep) || /^\s|\s$/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };

  // ================= Mô hình Anki "Lexkite (EN)" =================
  const MODEL_ID = 1729000000101; // cố định → nhập lần sau Anki nhận đúng kiểu ghi chú cũ (đổi mẫu thẻ ⇒ tăng số này)
  const FIELDS = ['Word', 'IPA', 'Meaning', 'Definition', 'Example', 'ExampleMeaning', 'Collocations', 'Audio'];
  const fnv = (s, seed = 0x811c9dc5) => { let h = seed >>> 0; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h >>> 0; };
  const B62 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  const b62 = n => { let s = ''; do { s = B62[n % 62] + s; n = Math.floor(n / 62); } while (n > 0); return s; };
  const guidOf = key => 'lk' + b62(fnv(key)) + b62(fnv(key, 0x9747b28c));
  const deckIdOf = name => 1600000000000 + fnv('deck:' + name);
  const CSS = `.card{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;font-size:20px;line-height:1.5;text-align:center;color:#171827;background:#FFF7EA;margin:0;padding:12px}
.lk-card,.lk-back{max-width:560px;margin:12px auto;background:#fff;border-radius:22px;box-shadow:0 10px 30px rgba(15,61,62,.12);box-sizing:border-box}
.lk-card{padding:22px 20px 18px;border-top:6px solid #0F3D3E}
.lk-brand{font-size:.62em;font-weight:800;letter-spacing:.04em;color:#0F3D3E;opacity:.6;margin-bottom:8px}.lk-brand b{color:#CC3F1C}
.lk-word{font-size:2.1em;font-weight:800;color:#0F3D3E;line-height:1.15;word-break:break-word}
.lk-ipa{font-family:"Lucida Sans Unicode","Arial Unicode MS","Segoe UI",sans-serif;color:#4e526b;margin-top:6px;font-size:.95em}
.lk-audio{margin-top:8px}
hr#answer{border:0;height:0;margin:0}
.lk-back{padding:18px 20px;text-align:start}
.lk-meaning{font-size:1.3em;font-weight:800;color:#B03718;text-align:center;word-break:break-word}
.lk-def{color:#4e526b;font-size:.82em;text-align:center;margin-top:4px}
.lk-ex{margin-top:14px;padding:10px 14px;border-left:4px solid #FFB054;background:#FFF7EA;border-radius:10px;font-size:.88em}
.lk-ex-en{font-style:italic}.lk-ex-en b{color:#0D6964;font-style:normal}
.lk-ex-tr{color:#4e526b;margin-top:4px;font-size:.92em}
.lk-col{margin-top:12px;font-size:.84em}
.lk-lbl{display:inline-block;font-size:.72em;font-weight:800;text-transform:uppercase;letter-spacing:.06em;color:#0D6964;background:#DDF1EE;padding:2px 9px;border-radius:99px;margin-right:6px;vertical-align:1px}
.nightMode.card,.night_mode.card,.nightMode .card,.night_mode .card{background:#0f1017;color:#eceef7}
.nightMode .lk-card,.night_mode .lk-card,.nightMode .lk-back,.night_mode .lk-back{background:#181a24;box-shadow:none;border-color:#5FD0C4}
.nightMode .lk-word,.night_mode .lk-word,.nightMode .lk-brand,.night_mode .lk-brand{color:#5FD0C4}
.nightMode .lk-brand b,.night_mode .lk-brand b{color:#FF8466}
.nightMode .lk-ipa,.night_mode .lk-ipa,.nightMode .lk-def,.night_mode .lk-def,.nightMode .lk-ex-tr,.night_mode .lk-ex-tr{color:#9a9db5}
.nightMode .lk-meaning,.night_mode .lk-meaning{color:#FF8466}
.nightMode .lk-ex,.night_mode .lk-ex{background:#20222f}
.nightMode .lk-ex-en b,.night_mode .lk-ex-en b{color:#5FD0C4}
.nightMode .lk-lbl,.night_mode .lk-lbl{color:#5FD0C4;background:#20222f}`;
  const QFMT = '<div class="lk-card"><div class="lk-brand">lex<b>kite</b></div><div class="lk-word">{{Word}}</div>{{#IPA}}<div class="lk-ipa">{{IPA}}</div>{{/IPA}}<div class="lk-audio">{{#Audio}}{{Audio}}{{/Audio}}{{^Audio}}{{tts en_GB:Word}}{{/Audio}}</div></div>';
  const AFMT = colLabel => '{{FrontSide}}<hr id="answer"><div class="lk-back"><div class="lk-meaning">{{Meaning}}</div>{{#Definition}}<div class="lk-def">{{Definition}}</div>{{/Definition}}{{#Example}}<div class="lk-ex"><div class="lk-ex-en">{{Example}}</div>{{#ExampleMeaning}}<div class="lk-ex-tr">{{ExampleMeaning}}</div>{{/ExampleMeaning}}</div>{{/Example}}{{#Collocations}}<div class="lk-col"><span class="lk-lbl">' + escHtml(colLabel || 'Collocations') + '</span>{{Collocations}}</div>{{/Collocations}}</div>';

  // Ngày theo lịch Anki (qua 4 giờ sáng mới sang ngày mới) – số ngày kể từ 1970 theo giờ địa phương
  const ankiDay = ms => { const d = new Date(ms - 4 * 3600000); return Math.round(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / DAY); };
  const CRT_BACK = 3650; // ngày tạo bộ sưu tập = 10 năm trước → "hôm nay" = 3650, thẻ quá hạn vẫn có hạn dương
  // Trạng thái FSRS của Lexkite → thẻ Anki. Thẻ đang ở bước học (chưa vào ôn theo ngày) → thẻ mới.
  function ankiSched(srs, now, pos, retention) {
    const s = srs || {}, mem = s.S != null && s.D != null ? JSON.stringify({ s: Math.round(s.S * 1e4) / 1e4, d: Math.round(s.D * 1e4) / 1e4, dr: retention || 0.9 }) : '';
    if (s.reps > 0 || (s.lapses > 0 && s.S != null)) {
      const today = ankiDay(now), dueDay = s.reps > 0 ? ankiDay(s.due || now) : today;
      const ivl = Math.max(1, Math.round(s.reps > 0 ? (s.interval || s.S || 1) : Math.max(1, s.S || 1)));
      const ef = s.D != null ? 1.3 + (10 - s.D) / 5 : (s.ef || 2.5);
      return { type: 2, queue: 2, due: CRT_BACK + (dueDay - today), ivl, factor: Math.round(Math.min(3.1, Math.max(1.3, ef)) * 1000), reps: (s.reps || 0) + (s.lapses || 0), lapses: s.lapses || 0, data: mem };
    }
    return { type: 0, queue: 0, due: pos, ivl: 0, factor: 0, reps: 0, lapses: 0, data: '' };
  }
  const hl = (ex, word) => { const e = escHtml(ex); if (!word) return e; const w = escHtml(word).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); try { return e.replace(new RegExp(`\\b(${w}\\w*)`, 'gi'), '<b>$1</b>'); } catch (x) { return e; } };
  const sha1csum = async s => { try { const h = new Uint8Array(await crypto.subtle.digest('SHA-1', enc.encode(s))); return ((h[0] << 24) >>> 0) + (h[1] << 16) + (h[2] << 8) + h[3]; } catch (e) { return 0; } };
  const tagSafe = s => String(s || '').trim().replace(/\s+/g, '_').replace(/["]/g, '').slice(0, 60);

  // items: [{ word, ipa, meaning, def, ex, exMeaning, col:[], tags:[], srs }]
  async function buildApkg(items, { deckName = 'Lexkite', keepProgress = false, retention = 0.9, colLabel, now = Date.now(), onProgress } = {}) {
    const sec = Math.floor(now / 1000), did = deckIdOf(deckName), notes = [], cards = [];
    const crtD = new Date(now - 4 * 3600000); crtD.setDate(crtD.getDate() - CRT_BACK); crtD.setHours(12, 0, 0, 0);
    const seen = new Set(); let id = now - items.length * 2 - 10;
    for (let i = 0; i < items.length; i++) {
      const it = items[i], word = String(it.word || '').trim(); if (!word) continue;
      const key = word.toLowerCase(); if (seen.has(key)) continue; seen.add(key);
      const flds = [escHtml(word), escHtml(it.ipa), escHtml(it.meaning), escHtml(it.def), hl(it.ex, word), escHtml(it.exMeaning), (it.col || []).map(escHtml).join(' · '), ''];
      const nid = ++id, cid = ++id, tags = [...new Set((it.tags || []).map(tagSafe).filter(Boolean))];
      notes.push({ rowid: nid, values: [null, guidOf(key), MODEL_ID, sec, -1, tags.length ? ` ${tags.join(' ')} ` : '', flds.join('\x1f'), word, await sha1csum(word), 0, ''] });
      const sc = keepProgress ? ankiSched(it.srs, now, notes.length, retention) : ankiSched(null, now, notes.length);
      cards.push({ rowid: cid, values: [null, nid, did, 0, sec, -1, sc.type, sc.queue, sc.due, sc.ivl, sc.factor, sc.reps, sc.lapses, 0, 0, 0, 0, sc.data] });
      if (onProgress && i % 500 === 0) { onProgress(i / items.length); await new Promise(r => setTimeout(r, 0)); }
    }
    const conf = { activeDecks: [did], curDeck: did, newSpread: 0, collapseTime: 1200, timeLim: 0, estTimes: true, dueCounts: true, curModel: MODEL_ID, nextPos: notes.length + 1, sortType: 'noteFld', sortBackwards: false, addToCur: true, schedVer: 2, sched2021: true, rollover: 4, creationOffset: crtD.getTimezoneOffset(), localOffset: new Date(now).getTimezoneOffset() };
    const model = { id: MODEL_ID, name: 'Lexkite (EN)', type: 0, mod: sec, usn: -1, sortf: 0, did, tags: [], vers: [], req: [[0, 'any', [0]]], latexsvg: false,
      latexPre: '\\documentclass[12pt]{article}\n\\special{papersize=3in,5in}\n\\usepackage[utf8]{inputenc}\n\\usepackage{amssymb,amsmath}\n\\pagestyle{empty}\n\\setlength{\\parindent}{0in}\n\\begin{document}\n', latexPost: '\\end{document}',
      flds: FIELDS.map((name, ord) => ({ name, ord, sticky: false, rtl: false, font: 'Arial', size: 20, media: [], description: '' })),
      tmpls: [{ name: 'Word → Meaning', ord: 0, qfmt: QFMT, afmt: AFMT(colLabel), bqfmt: '', bafmt: '', did: null, bfont: '', bsize: 0 }], css: CSS };
    const deck = (id2, name) => ({ id: id2, name, mod: sec, usn: -1, lrnToday: [0, 0], revToday: [0, 0], newToday: [0, 0], timeToday: [0, 0], collapsed: false, browserCollapsed: false, desc: '', dyn: 0, conf: 1, extendNew: 0, extendRev: 0 });
    const dconf = { 1: { id: 1, name: 'Default', mod: 0, usn: 0, maxTaken: 60, autoplay: true, timer: 0, replayq: true, dyn: false, new: { delays: [1, 10], ints: [1, 4, 0], initialFactor: 2500, order: 1, perDay: 20, bury: false }, lapse: { delays: [10], mult: 0, minInt: 1, leechFails: 8, leechAction: 1 }, rev: { perDay: 200, ease4: 1.3, ivlFct: 1, maxIvl: 36500, bury: false, hardFactor: 1.2 } } };
    const decks = { 1: deck(1, 'Default') }; decks[did] = deck(did, deckName);
    const db = sqliteWrite([
      { name: 'col', sql: 'CREATE TABLE col (id integer primary key, crt integer not null, mod integer not null, scm integer not null, ver integer not null, dty integer not null, usn integer not null, ls integer not null, conf text not null, models text not null, decks text not null, dconf text not null, tags text not null)',
        rows: [{ rowid: 1, values: [null, Math.floor(crtD.getTime() / 1000), now, now, 11, 0, 0, 0, JSON.stringify(conf), JSON.stringify({ [MODEL_ID]: model }), JSON.stringify(decks), JSON.stringify(dconf), '{}'] }] },
      { name: 'notes', sql: 'CREATE TABLE notes (id integer primary key, guid text not null, mid integer not null, mod integer not null, usn integer not null, tags text not null, flds text not null, sfld integer not null, csum integer not null, flags integer not null, data text not null)', rows: notes },
      { name: 'cards', sql: 'CREATE TABLE cards (id integer primary key, nid integer not null, did integer not null, ord integer not null, mod integer not null, usn integer not null, type integer not null, queue integer not null, due integer not null, ivl integer not null, factor integer not null, reps integer not null, lapses integer not null, left integer not null, odue integer not null, odid integer not null, flags integer not null, data text not null)', rows: cards },
      { name: 'revlog', sql: 'CREATE TABLE revlog (id integer primary key, cid integer not null, usn integer not null, ease integer not null, ivl integer not null, lastIvl integer not null, factor integer not null, time integer not null, type integer not null)', rows: [] },
      { name: 'graves', sql: 'CREATE TABLE graves (usn integer not null, oid integer not null, type integer not null)', rows: [] },
    ]);
    if (onProgress) onProgress(1);
    return { bytes: await zipWrite([{ name: 'collection.anki2', data: db }, { name: 'media', data: enc.encode('{}') }]), count: notes.length };
  }

  // Văn bản Anki (File → Import): kiểu Basic, cột Front/Back/Tags, có sẵn tiêu đề → không cần chỉnh gì khi nhập
  function buildAnkiText(items, { deckName = 'Lexkite' } = {}) {
    const clean = s => String(s == null ? '' : s).replace(/[\t\r\n]+/g, ' ').trim();
    const rows = items.filter(it => it.word).map(it => {
      const front = `<b>${escHtml(clean(it.word))}</b>${it.ipa ? `<br><span style="color:#4e526b">${escHtml(clean(it.ipa))}</span>` : ''}`;
      const back = [it.meaning && `<b>${escHtml(clean(it.meaning))}</b>`, it.def && escHtml(clean(it.def)), it.ex && `<i>${hl(clean(it.ex), it.word)}</i>`, it.exMeaning && escHtml(clean(it.exMeaning)), (it.col || []).length && escHtml(clean(it.col.join(' · ')))].filter(Boolean).join('<br>');
      return [front, back, [...new Set((it.tags || []).map(tagSafe).filter(Boolean))].join(' ')].map(c => csvCell(c, '\t')).join('\t');
    });
    return '#separator:tab\n#html:true\n#notetype:Basic\n#deck:' + clean(deckName) + '\n#columns:Front\tBack\tTags\n#tags column:3\n' + rows.join('\n') + '\n';
  }
  // Bảng tính (Excel, Google Sheets, Quizlet…): CSV có BOM để Excel đọc đúng UTF-8
  function buildCsv(items, head) {
    const H = head || ['Word', 'IPA', 'Meaning', 'Definition', 'Example', 'Example meaning', 'Collocations', 'Tags'];
    const rows = items.filter(it => it.word).map(it => [it.word, it.ipa, it.meaning, it.def, it.ex, it.exMeaning, (it.col || []).join('; '), (it.tags || []).map(tagSafe).join(' ')].map(c => csvCell(c, ',')).join(','));
    return '\uFEFF' + H.map(c => csvCell(c, ',')).join(',') + '\r\n' + rows.join('\r\n') + '\r\n';
  }

  // ================= Đọc gói Anki =================
  async function parseApkg(src) {
    const z = await zipOpen(src);
    // Ưu tiên: .anki21b (Anki 2.1.50+, nén zstd – giải bằng fzstd chép sẵn trong gói) → .anki21 → .anki2 (bản cũ / bản giả "Please update")
    const name = z.has('collection.anki21b') ? 'collection.anki21b' : z.has('collection.anki21') ? 'collection.anki21' : z.has('collection.anki2') ? 'collection.anki2' : null;
    if (!name) throw err('notanki');
    let raw = await z.get(name);
    if (name === 'collection.anki21b') { try { raw = (await loadZstd()).decompress(raw); } catch (e) { throw err('anki21b'); } }
    const db = sqliteOpen(raw), tables = db.tables();
    if (!tables.includes('notes')) throw err('notanki');
    const notes = db.rows('notes'), col = (db.rows('col') || [])[0] || {};
    const models = {}, decks = {};
    try { for (const m of Object.values(JSON.parse(col.models || '{}'))) models[m.id] = { name: m.name, fields: (m.flds || []).slice().sort((a, b) => a.ord - b.ord).map(f => f.name) }; } catch (e) { /* bỏ qua */ }
    if (!Object.keys(models).length && tables.includes('notetypes') && tables.includes('fields')) { // lược đồ mới (18) không còn JSON trong col
      for (const n of db.rows('notetypes')) models[n.id] = { name: n.name, fields: [] };
      for (const f of db.rows('fields').sort((a, b) => a.ord - b.ord)) if (models[f.ntid]) models[f.ntid].fields[f.ord] = f.name;
    }
    try { for (const d of Object.values(JSON.parse(col.decks || '{}'))) decks[d.id] = d.name; } catch (e) { /* bỏ qua */ }
    if (!Object.keys(decks).length && tables.includes('decks')) for (const d of db.rows('decks')) decks[d.id] = String(d.name || '').replace(/\x1f/g, '::');
    const deckOfNote = {};
    for (const c of db.rows('cards') || []) if (deckOfNote[c.nid] == null) deckOfNote[c.nid] = c.odid || c.did;
    // Kiểu ghi chú phổ biến nhất → cột cho bước ghép
    const cnt = {}; for (const n of notes) cnt[n.mid] = (cnt[n.mid] || 0) + 1;
    const mainMid = Object.keys(cnt).sort((a, b) => cnt[b] - cnt[a])[0];
    const deckCnt = {}; for (const n of notes) { const dn = decks[deckOfNote[n.id]]; if (dn) deckCnt[dn] = (deckCnt[dn] || 0) + 1; }
    const deck = Object.keys(deckCnt).sort((a, b) => deckCnt[b] - deckCnt[a]).filter(d => d !== 'Default')[0] || '';
    const rows = notes.map(n => ({ cells: String(n.flds || '').split('\x1f'), tags: String(n.tags || '').trim().split(/\s+/).filter(Boolean), deck: decks[deckOfNote[n.id]] || '' }));
    const fields = (models[mainMid] || {}).fields || [];
    const width = Math.max(fields.length, ...rows.slice(0, 500).map(r => r.cells.length), 0);
    return { kind: 'apkg', deck, html: true, columns: Array.from({ length: width }, (_, i) => fields[i] || ''), tagsIdx: -1, rows, models: Object.values(models).map(m => m.name), media: z.has('media') };
  }

  // Đoán cột: từ / nghĩa / ví dụ / phiên âm
  function guessMap(set) {
    const cols = set.columns.map(c => c.toLowerCase()), find = re => cols.findIndex(c => re.test(c));
    let word = find(/^(word|words|term|front|vocab|vocabulary|english|expression|headword|từ|từ vựng|单词|単語|단어)$/); if (word < 0) word = find(/word|front|term|vocab|expression|từ/);
    let mean = find(/^(meaning|meanings|back|definition|translation|nghĩa|vietnamese|tiếng việt)$/); if (mean < 0) mean = find(/mean|back|defin|transl|nghĩa/);
    let ex = find(/example|sentence|context|ví dụ|câu/);
    let ipa = find(/^(ipa|pronunciation|phonetic|phonetics|reading|phiên âm)$/);
    const free = () => { for (let i = 0; i < set.columns.length; i++) if (i !== set.tagsIdx && ![word, mean, ex, ipa].includes(i)) return i; return -1; };
    if (word < 0) word = free();
    if (mean < 0) mean = free();
    if (word === mean) mean = -1;
    if (ex === word || ex === mean) ex = -1;
    if (ipa === word || ipa === mean) ipa = -1;
    return { word, mean, ex, ipa };
  }

  // Lập danh sách thẻ sẽ nhập (chia lô, nhường luồng chính, hủy được). existing: Set khóa từ đã có.
  async function planImport(set, map, { existing = new Set(), keyOf = s => s.toLowerCase().replace(/\s+/g, ' ').trim(), chunk = 500, onProgress, isCancelled, limit = 20000 } = {}) {
    const out = [], seen = new Set(); let dup = 0, invalid = 0, i = 0;
    const cell = (r, k) => k >= 0 && k < r.cells.length ? (set.html ? htmlToText(r.cells[k]) : htmlToText(String(r.cells[k]).replace(/</g, '&lt;'))) : '';
    for (const r of set.rows) {
      if (i % chunk === 0) { if (isCancelled && isCancelled()) return { cancelled: true, entries: [], dup, invalid }; if (onProgress) onProgress(i / set.rows.length); if (i) await new Promise(res => setTimeout(res, 0)); }
      i++;
      const word = cell(r, map.word).split(' · ')[0].trim();
      if (!word || word.length > 80 || !/[a-z]/i.test(word)) { invalid++; continue; }
      const key = keyOf(word);
      if (existing.has(key) || seen.has(key)) { dup++; continue; }
      if (out.length >= limit) { invalid++; continue; }
      seen.add(key);
      out.push({ word, key, meaning: cell(r, map.mean).slice(0, 300), ex: cell(r, map.ex).slice(0, 400), ipa: cell(r, map.ipa).slice(0, 80), tags: r.tags || [] });
    }
    if (onProgress) onProgress(1);
    return { cancelled: false, entries: out, dup, invalid };
  }

  let zstdP = null;
  const loadZstd = () => zstdP || (zstdP = g.fzstd ? Promise.resolve(g.fzstd)
    : typeof document === 'undefined' && typeof require === 'function' ? Promise.resolve(require(__dirname + '/vendor/fzstd.js'))
      : new Promise((res, rej) => { const s = document.createElement('script'); s.src = 'js/vendor/fzstd.js'; s.onload = () => g.fzstd ? res(g.fzstd) : rej(err('anki21b')); s.onerror = () => { zstdP = null; rej(err('anki21b')); }; document.head.appendChild(s); }));
  async function parseFile(file) {
    const head = new Uint8Array(await file.slice(0, 4).arrayBuffer());
    if (head[0] === 0x50 && head[1] === 0x4B) return parseApkg(file);
    if (head[0] === 0x53 && head[1] === 0x51 && head[2] === 0x4C) { const db = new Uint8Array(await file.arrayBuffer()); return parseApkg(await zipWrite([{ name: 'collection.anki2', data: db }], { deflate: false })); } // file collection.anki2 rời
    if (file.size > 50 * 1048576) throw err('toobig');
    return parseDelimited(await file.text());
  }

  const AnkiKit = { crc32, zipWrite, zipOpen, sqliteWrite, sqliteOpen, htmlToText, decodeEntities, escHtml, parseDelimited, parseApkg, parseFile, guessMap, planImport, buildApkg, buildAnkiText, buildCsv, ankiSched, ankiDay, guidOf, MODEL_ID, FIELDS, CRT_BACK };
  g.AnkiKit = AnkiKit;
  if (typeof module !== 'undefined' && module.exports) module.exports = AnkiKit;
  if (typeof document === 'undefined' || !g.UI) return;

  // ================= Giao diện =================
  const { $, $$, esc, toast, modal, closeModal, download } = g.UI;
  const T = (k, v) => g.t(k, v);
  let dictP = null;
  const dict = () => dictP || (dictP = (!g.I18N || I18N.lang() === 'vi' || (g.I18N_DICT && I18N_DICT.en && I18N_DICT.en['Gói Anki (.apkg)'])) ? Promise.resolve() : new Promise(r => { const s = document.createElement('script'); s.src = 'js/i18n/en/anki.js'; s.onload = s.onerror = () => r(); document.head.appendChild(s); }));
  const css = () => {
    if (document.getElementById('ak-css')) return;
    const st = document.createElement('style'); st.id = 'ak-css';
    st.textContent = `.ak{display:grid;gap:1rem}.ak-hero{display:flex;gap:.9rem;align-items:center}.ak-hero svg{flex:none}.ak-hero h2{margin:0;font-size:1.3rem}.ak-hero p{margin:.15rem 0 0}
.ak-tabs{display:grid;grid-template-columns:1fr 1fr;gap:.3rem;background:var(--surface-2);padding:.3rem;border-radius:14px}.ak-tabs button{border:0;background:none;padding:.6rem .5rem;border-radius:11px;font-weight:700;color:var(--muted);cursor:pointer;font:inherit;font-weight:700}.ak-tabs button[aria-selected=true]{background:var(--surface);color:var(--text);box-shadow:var(--shadow-sm)}
.ak-opt{display:flex;gap:.7rem;align-items:flex-start;padding:.75rem .85rem;border:1.5px solid var(--line);border-radius:14px;cursor:pointer;background:var(--surface)}.ak-opt:has(input:checked){border-color:var(--accent);background:var(--accent-soft)}.ak-opt input{margin-top:.25rem;accent-color:var(--accent);flex:none}.ak-opt b{display:block}.ak-opt .em{font-size:1.4rem;line-height:1;flex:none}
.ak-badge{display:inline-block;font-size:.72rem;font-weight:800;color:var(--accent-text);background:var(--accent-soft);border-radius:99px;padding:.05rem .5rem;margin-left:.35rem;vertical-align:1px}
.ak-prev{display:grid;grid-template-columns:1fr 1fr;gap:.6rem;background:#FFF7EA;border-radius:16px;padding:.7rem}.ak-face{background:#fff;border-radius:14px;padding:.8rem;text-align:center;box-shadow:0 6px 18px rgba(15,61,62,.1);border-top:4px solid #0F3D3E;min-width:0;color:#171827}.ak-face .w{font-weight:800;font-size:1.15rem;color:#0F3D3E;word-break:break-word}.ak-face .p{color:#4e526b;font-size:.82rem}.ak-face .m{font-weight:800;color:#B03718;word-break:break-word}.ak-face .x{font-size:.78rem;font-style:italic;text-align:start;border-left:3px solid #FFB054;padding-left:.45rem;margin-top:.45rem;color:#171827}.ak-cap{font-size:.68rem;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:#4e526b;margin-bottom:.3rem}
@media (prefers-color-scheme:dark){:root:not([data-theme=light]) .ak-prev{background:#20222f}:root:not([data-theme=light]) .ak-face{background:#181a24;color:#eceef7;border-color:#5FD0C4}:root:not([data-theme=light]) .ak-face .w{color:#5FD0C4}:root:not([data-theme=light]) .ak-face .m{color:#FF8466}:root:not([data-theme=light]) .ak-face .p,:root:not([data-theme=light]) .ak-cap{color:#9a9db5}:root:not([data-theme=light]) .ak-face .x{color:#eceef7}}
:root[data-theme=dark] .ak-prev{background:#20222f}:root[data-theme=dark] .ak-face{background:#181a24;color:#eceef7;border-color:#5FD0C4}:root[data-theme=dark] .ak-face .w{color:#5FD0C4}:root[data-theme=dark] .ak-face .m{color:#FF8466}:root[data-theme=dark] .ak-face .p,:root[data-theme=dark] .ak-cap{color:#9a9db5}:root[data-theme=dark] .ak-face .x{color:#eceef7}
.ak-drop{display:grid;place-items:center;gap:.35rem;text-align:center;padding:1.6rem 1rem;border:2px dashed var(--line);border-radius:18px;background:var(--surface-2);cursor:pointer;width:100%;font:inherit;color:var(--text)}.ak-drop:hover,.ak-drop.on{border-color:var(--accent);background:var(--accent-soft)}.ak-drop .em{font-size:2rem}
.ak-map{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.6rem}.ak-map label{display:grid;gap:.25rem;font-size:.85rem;font-weight:700}.ak-map select,.ak-map input{width:100%}
.ak-tbl{overflow:auto;max-height:240px;border:1px solid var(--line);border-radius:12px}.ak-tbl table{border-collapse:collapse;width:100%;font-size:.84rem}.ak-tbl th,.ak-tbl td{text-align:start;padding:.4rem .55rem;border-bottom:1px solid var(--line);vertical-align:top;max-width:220px;overflow-wrap:anywhere}.ak-tbl th{position:sticky;top:0;background:var(--surface-2)}
.ak-st{font-size:.72rem;font-weight:800;border-radius:99px;padding:.05rem .45rem;white-space:nowrap}.ak-st.new{background:var(--good-soft);color:var(--good-text)}.ak-st.dup{background:var(--surface-2);color:var(--muted)}.ak-st.bad{background:var(--again-soft);color:var(--again-text)}
.ak-sum{display:flex;flex-wrap:wrap;gap:.4rem}.ak-steps{list-style:none;margin:0;padding:0;display:grid;gap:.5rem;counter-reset:s}.ak-steps li{display:flex;gap:.6rem;align-items:flex-start;font-size:.92rem}.ak-steps li::before{counter-increment:s;content:counter(s);flex:none;width:1.5rem;height:1.5rem;border-radius:50%;display:grid;place-items:center;background:var(--accent-soft);color:var(--accent-text);font-weight:800;font-size:.8rem}
.ak-plat{display:flex;gap:.3rem;flex-wrap:wrap}.ak-plat button{border:1px solid var(--line);background:var(--surface);border-radius:99px;padding:.35rem .8rem;font:inherit;font-size:.85rem;font-weight:700;cursor:pointer;color:var(--text)}.ak-plat button[aria-pressed=true]{background:var(--accent);border-color:var(--accent);color:#fff}
.ak-done{text-align:center;display:grid;gap:.6rem;justify-items:center}.ak-done h2{margin:0}.ak-note{font-size:.82rem;color:var(--muted);background:var(--surface-2);border-radius:12px;padding:.6rem .75rem}.ak-err{background:var(--again-soft);color:var(--again-text);border-radius:12px;padding:.7rem .85rem;font-size:.9rem}
.ak .row.end{justify-content:flex-end}@media (max-width:480px){.ak-map{grid-template-columns:1fr}.ak-prev{grid-template-columns:1fr}.ak .row.end .btn{flex:1}}`;
    document.head.appendChild(st);
  };
  const ART = () => `<svg width="64" height="56" viewBox="0 0 64 56" aria-hidden="true"><rect x="22" y="6" width="34" height="44" rx="7" fill="#FFB054" transform="rotate(10 39 28)"/><rect x="16" y="6" width="34" height="44" rx="7" fill="#fff" stroke="#0F3D3E" stroke-width="2.5" transform="rotate(-6 33 28)"/><path d="M26 18 L36 14 L40 26 Z" fill="#E5502F" transform="rotate(-6 33 28)"/><path d="M36 14 L46 22 L40 26 Z" fill="#FFC94A" transform="rotate(-6 33 28)"/><path d="M40 26 Q38 34 32 38 Q28 41 30 45" stroke="#0F3D3E" stroke-width="2" fill="none" stroke-linecap="round" transform="rotate(-6 33 28)"/></svg>`;
  const kit = (m, s) => g.Kit && typeof g.Kit.svg === 'function' ? g.Kit.svg(m, s, true) : '';
  const meanLangVi = () => !g.I18N || !I18N.meanLang || I18N.meanLang() === 'vi';
  const slug = s => String(s || 'lexkite').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'lexkite';
  const dateKey = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

  // Thẻ Lexkite / từ thư viện → mục xuất
  function itemOf(c) {
    const ctx = (c.contexts || []).find(x => x && x.text), sent = (c.sentences || [])[0], vi = meanLangVi();
    const meaning = g.App && App.meanOf ? App.meanOf(c) : (c.vi || c.def || '');
    let ex = '', exMeaning = '';
    if (ctx) { ex = ctx.text.length > 300 ? ctx.text.slice(0, 300) + '…' : ctx.text; exMeaning = vi ? (ctx.vi || '') : ''; }
    else if (c.ex) { ex = c.ex; exMeaning = vi && sent && sent.en === c.ex ? sent.vi || '' : ''; }
    else if (sent && sent.en) { ex = sent.en; exMeaning = vi ? sent.vi || '' : ''; }
    return { word: c.word, ipa: c.ipa || '', meaning, def: c.def && c.def !== meaning ? c.def : '', ex, exMeaning, col: c.col || [], tags: ['lexkite', c.topic && c.topic !== 'mine' ? c.topic : '', c.level || '', c.deck ? 'anki:' + c.deck : ''].filter(Boolean), srs: c.srs };
  }

  let S = null; // trạng thái hộp thoại đang mở
  async function open(tab, opts = {}) {
    await dict(); css();
    S = { tab: tab === 'import' ? 'import' : 'export', opts, fmt: 'apkg', scope: opts.shown && opts.shown.length && opts.shown.length !== (opts.cards || []).length ? 'shown' : 'all', keep: false, plat: /android/i.test(navigator.userAgent) ? 'android' : /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) ? 'ios' : 'desktop' };
    const box = modal('<div class="ak" id="akRoot"></div>');
    box.setAttribute('aria-labelledby', 'akTitle');
    draw();
  }
  const root = () => document.getElementById('akRoot');
  const isOpen = () => { const m = document.getElementById('modal'); return !!root() && !(m && m.hidden); };
  function shell(body) {
    return `<div class="ak-hero">${ART()}<div><h2 id="akTitle">Anki</h2><p class="small muted">${T('Dùng chung sổ từ Lexkite với Anki – trên máy tính, Android và iPhone.')}</p></div></div>
      <div class="ak-tabs" role="tablist" aria-label="Anki">
        <button type="button" role="tab" id="akTabE" aria-controls="akPanel" aria-selected="${S.tab === 'export'}" tabindex="${S.tab === 'export' ? 0 : -1}">⬇️ ${T('Xuất sang Anki')}</button>
        <button type="button" role="tab" id="akTabI" aria-controls="akPanel" aria-selected="${S.tab === 'import'}" tabindex="${S.tab === 'import' ? 0 : -1}">⬆️ ${T('Nhập từ Anki')}</button>
      </div>
      <div id="akPanel" role="tabpanel" aria-labelledby="${S.tab === 'export' ? 'akTabE' : 'akTabI'}" class="ak">${body}</div>`;
  }
  function bindTabs() {
    const tabs = [$('#akTabE'), $('#akTabI')];
    tabs.forEach((b, i) => {
      b.onclick = () => { if (S.busy) return; S.tab = i ? 'import' : 'export'; S.result = null; S.set = null; S.error = null; draw(); const nb = i ? $('#akTabI') : $('#akTabE'); if (nb) nb.focus(); };
      b.onkeydown = e => { if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); tabs[1 - i].click(); } };
    });
  }
  function draw() {
    const r = root(); if (!r) return;
    r.innerHTML = shell(S.tab === 'export' ? (S.result ? exportDone() : exportForm()) : importView());
    bindTabs();
    if (S.tab === 'export') S.result ? bindExportDone() : bindExport(); else bindImport();
  }

  // ---------- Xuất ----------
  const srcCards = () => (S.scope === 'shown' ? S.opts.shown : S.opts.cards) || [];
  function previewCard() {
    const c = srcCards()[0]; if (!c) return '';
    const it = itemOf(c);
    return `<div><div class="ak-cap">${T('Thẻ trong Anki sẽ trông như thế này')}</div><div class="ak-prev" aria-hidden="true">
      <div class="ak-face"><div class="ak-cap">${T('Mặt trước')}</div><div class="w">${esc(it.word)}</div>${it.ipa ? `<div class="p">${esc(it.ipa)}</div>` : ''}<div class="p">🔊</div></div>
      <div class="ak-face"><div class="ak-cap">${T('Mặt sau')}</div><div class="m">${esc(it.meaning || '—')}</div>${it.ex ? `<div class="x">${esc(it.ex.length > 90 ? it.ex.slice(0, 90) + '…' : it.ex)}</div>` : ''}</div></div></div>`;
  }
  function exportForm() {
    const all = (S.opts.cards || []).length, shown = (S.opts.shown || []).length, n = srcCards().length;
    if (!all) return `<div class="empty"><div class="em">📒</div>${T('Chưa có từ nào để xuất. Hãy lưu vài từ trước nhé.')}</div>`;
    const fmt = (v, em, title, desc, badge) => `<label class="ak-opt"><input type="radio" name="akFmt" value="${v}" ${S.fmt === v ? 'checked' : ''}><span class="em" aria-hidden="true">${em}</span><span><b>${title}${badge ? `<span class="ak-badge">${badge}</span>` : ''}</b><span class="small muted">${desc}</span></span></label>`;
    const hasProgress = S.opts.progress !== false && srcCards().some(c => c.srs && (c.srs.reps > 0 || c.srs.lapses > 0));
    return `${shown && shown !== all ? `<fieldset class="ak" style="border:0;padding:0;margin:0;gap:.5rem"><legend class="small" style="font-weight:800;margin-bottom:.4rem">${T('Xuất những từ nào?')}</legend>
        <label class="ak-opt"><input type="radio" name="akScope" value="all" ${S.scope === 'all' ? 'checked' : ''}><span><b>${esc(S.opts.name || T('Sổ từ'))}</b><span class="small muted">${T('{n} từ', { n: all })}</span></span></label>
        <label class="ak-opt"><input type="radio" name="akScope" value="shown" ${S.scope === 'shown' ? 'checked' : ''}><span><b>${T('Chỉ các từ đang lọc')}</b><span class="small muted">${T('{n} từ', { n: shown })}</span></span></label></fieldset>` : `<p class="small" style="margin:0">📦 <b>${esc(S.opts.name || T('Sổ từ'))}</b> · ${T('{n} từ', { n })}</p>`}
      <fieldset class="ak" style="border:0;padding:0;margin:0;gap:.5rem"><legend class="small" style="font-weight:800;margin-bottom:.4rem">${T('Định dạng')}</legend>
        ${fmt('apkg', '🃏', T('Gói Anki (.apkg)'), T('Thẻ đẹp có phiên âm, phát âm, ví dụ – mở bằng Anki, AnkiDroid, AnkiMobile.'), T('Khuyên dùng'))}
        ${fmt('txt', '📝', T('Văn bản cho Anki (.txt)'), T('Nhập qua File → Import, kiểu thẻ Basic.'))}
        ${fmt('csv', '📊', T('Bảng tính (.csv)'), T('Mở bằng Excel, Google Sheets hoặc nhập vào Quizlet.'))}
      </fieldset>
      ${S.fmt === 'apkg' && hasProgress ? `<label class="ak-opt"><input type="checkbox" id="akKeep" ${S.keep ? 'checked' : ''}><span><b>${T('Giữ tiến độ ôn tập (FSRS)')}</b><span class="small muted">${T('Từ đã vào lịch ôn giữ nguyên hạn ôn và độ nhớ; từ đang học dở bắt đầu như thẻ mới.')}</span></span></label>` : ''}
      ${S.fmt === 'apkg' ? previewCard() : ''}
      <div class="row end"><button type="button" class="btn ghost" data-close>${T('Đóng')}</button><button type="button" class="btn primary" id="akGo">⬇️ ${T('Tạo file')}</button></div>
      <div id="akMsg" role="status" aria-live="polite" class="small muted"></div>`;
  }
  function bindExport() {
    $$('input[name=akFmt]').forEach(i => i.onchange = () => { S.fmt = i.value; draw(); const x = $(`input[name=akFmt][value=${S.fmt}]`); if (x) x.focus(); });
    $$('input[name=akScope]').forEach(i => i.onchange = () => { S.scope = i.value; draw(); const x = $(`input[name=akScope][value=${S.scope}]`); if (x) x.focus(); });
    const k = $('#akKeep'); if (k) k.onchange = () => { S.keep = k.checked; };
    const go = $('#akGo'); if (go) go.onclick = runExport;
  }
  async function runExport() {
    const go = $('#akGo'), msg = $('#akMsg'), cards = srcCards();
    if (!cards.length) return;
    go.disabled = true; S.busy = true; msg.textContent = T('Đang tạo file…');
    try {
      const items = cards.map(itemOf), name = S.opts.name || 'Lexkite', deckName = 'Lexkite::' + String(name).replace(/::/g, ' ').trim();
      const base = `lexkite-${slug(name)}-${dateKey()}`;
      let blob, file, count = items.length;
      if (S.fmt === 'apkg') {
        const r = await buildApkg(items, { deckName, keepProgress: S.keep, retention: (g.Core && Core.SRS && Core.SRS.retentionTarget) || 0.9, colLabel: T('Cụm hay gặp'), onProgress: p => { if (msg) msg.textContent = T('Đang tạo file… {p}%', { p: Math.round(p * 100) }); } });
        blob = new Blob([r.bytes], { type: 'application/octet-stream' }); file = base + '.apkg'; count = r.count;
      } else if (S.fmt === 'txt') { blob = new Blob([buildAnkiText(items, { deckName })], { type: 'text/plain;charset=utf-8' }); file = base + '.txt'; }
      else { blob = new Blob([buildCsv(items, [T('Từ'), T('Phiên âm'), T('Nghĩa'), T('Định nghĩa (tiếng Anh)'), T('Ví dụ'), T('Nghĩa câu ví dụ'), T('Cụm hay gặp'), 'Tags'])], { type: 'text/csv;charset=utf-8' }); file = base + '.csv'; }
      if (!(g.LKFile && LKFile.native())) download(blob, file); // app gốc: không tự mở bảng chia sẻ – người dùng bấm “Gửi sang ứng dụng Anki” ở màn kết quả
      S.result = { blob, file, count, fmt: S.fmt, deck: deckName };
      if (g.Sfx && Sfx.win) try { Sfx.win(); } catch (e) { /* bỏ qua */ }
    } catch (e) { S.error = e; if (msg) msg.textContent = '⚠️ ' + T('Chưa tạo được file. Hãy thử lại.'); go.disabled = false; S.busy = false; return; }
    S.busy = false; draw();
    const h = $('.ak-done h2'); if (h) { h.tabIndex = -1; h.focus(); }
  }
  const PLAT = (nat = !!(g.LKFile && LKFile.native())) => ({ // nat: app gốc – không có thư mục Tải về, gửi file qua bảng chia sẻ
    desktop: [T('Mở Anki trên máy tính.'), T('Bấm đúp vào file vừa tải, hoặc chọn File → Import… rồi chọn file.'), T('Bộ thẻ “{d}” xuất hiện trong danh sách – bấm vào để học.', { d: (S.result && S.result.deck) || 'Lexkite' })],
    android: [T('Cài AnkiDroid (miễn phí trên Google Play).'), nat ? T('Bấm “Gửi sang ứng dụng Anki” rồi chọn AnkiDroid.') : T('Mở thông báo tải xuống hoặc ứng dụng Tệp, chạm vào file và chọn AnkiDroid.'), T('Hoặc trong AnkiDroid: ⋮ → Nhập → chọn file.')],
    ios: [T('Cài AnkiMobile trên App Store.'), nat ? T('Bấm “Gửi sang ứng dụng Anki” rồi chọn AnkiMobile.') : T('Mở ứng dụng Tệp → Tải về, chạm vào file → nút Chia sẻ → AnkiMobile.'), T('Chọn Nhập (Import) – bộ thẻ xuất hiện ngay.')],
  });
  function exportDone() {
    const r = S.result, steps = PLAT()[r.fmt === 'apkg' ? S.plat : 'desktop'];
    const canShare = !!(g.LKFile && LKFile.canShare(r.blob, r.file)); // web: navigator.canShare · app gốc: luôn có bảng chia sẻ
    const txtSteps = [T('Mở Anki trên máy tính.'), T('Chọn File → Import… rồi chọn file vừa tải.'), T('Kiểm tra kiểu ghi chú Basic và bộ thẻ, rồi bấm Import.')];
    const csvSteps = [T('Mở file bằng Excel hoặc Google Sheets (đã có dòng tiêu đề).'), T('Với Anki: File → Import, chọn dấu phẩy và bỏ qua dòng đầu.')];
    return `<div class="ak-done">${kit('win', 84)}<h2>${T('Đã tạo file!')}</h2><p class="muted" style="margin:0">${T('{n} thẻ · {f}', { n: r.count, f: esc(r.file) })}</p>
        <div class="row" style="justify-content:center"><button type="button" class="btn" id="akAgain">⬇️ ${T('Tải lại')}</button>${canShare ? `<button type="button" class="btn primary" id="akShare">📤 ${T('Gửi sang ứng dụng Anki')}</button>` : ''}</div></div>
      <div><h3 style="margin:.2rem 0 .6rem">${T('Mở trong Anki')}</h3>
        ${r.fmt === 'apkg' ? `<div class="ak-plat" role="group" aria-label="${T('Thiết bị')}">${[['desktop', '💻 ' + T('Máy tính')], ['android', '🤖 Android'], ['ios', '📱 iPhone / iPad']].map(([k, l]) => `<button type="button" data-plat="${k}" aria-pressed="${S.plat === k}">${l}</button>`).join('')}</div>` : ''}
        <ol class="ak-steps" style="margin-top:.7rem">${(r.fmt === 'apkg' ? steps : r.fmt === 'txt' ? txtSteps : csvSteps).map(s => `<li><span>${esc(s)}</span></li>`).join('')}</ol></div>
      ${r.fmt === 'apkg' ? `<p class="ak-note">💡 ${T('Xuất lại lần sau chỉ cập nhật các thẻ đã có trong Anki, không tạo thẻ trùng.')} ${T('Phát âm dùng giọng đọc có sẵn của thiết bị (không kèm file âm thanh).')}</p>` : ''}
      <div class="row end"><button type="button" class="btn ghost" id="akBack">← ${T('Quay lại')}</button><button type="button" class="btn primary" data-close>${T('Xong')}</button></div>`;
  }
  function bindExportDone() {
    const r = S.result;
    $('#akAgain').onclick = () => download(r.blob, r.file);
    const sh = $('#akShare'); if (sh) sh.onclick = async () => { try { await LKFile.save(r.blob, r.file, { share: true, title: r.file }); } catch (e) { toast(T('Không tải được – thử lại sau')); } };
    $$('[data-plat]').forEach(b => b.onclick = () => { S.plat = b.dataset.plat; draw(); const x = $(`[data-plat=${S.plat}]`); if (x) x.focus(); });
    $('#akBack').onclick = () => { S.result = null; draw(); };
  }

  // ---------- Nhập ----------
  const ERR = () => ({
    anki21b: T('Chưa đọc được định dạng Anki mới trong file này. Trong Anki chọn File → Export → “Anki Deck Package (.apkg)”, tích “Support older Anki versions” rồi xuất lại.'),
    notanki: T('Không tìm thấy bộ thẻ Anki trong file này.'),
    zip: T('File bị hỏng hoặc không phải gói Anki.'), sqlite: T('File bị hỏng hoặc không phải gói Anki.'), 'zip-method': T('File bị hỏng hoặc không phải gói Anki.'),
    browser: T('Trình duyệt chưa hỗ trợ – hãy cập nhật trình duyệt'), toobig: T('File quá lớn (tối đa 50 MB với file văn bản).'),
  });
  function importView() {
    if (S.done) return importDone();
    if (S.importing) return `<div class="ak" aria-busy="true"><p style="margin:0"><b>${T('Đang nhập vào sổ từ…')}</b></p><div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" aria-label="${T('Tiến độ nhập')}" id="akBar"><i style="width:0%"></i></div><p class="small muted" id="akProg" role="status" aria-live="polite"></p><div class="row end"><button type="button" class="btn" id="akCancel">${T('Hủy')}</button></div></div>`;
    if (!S.set) return `<button type="button" class="ak-drop" id="akDrop"><span class="em" aria-hidden="true">📥</span><b>${T('Chọn hoặc kéo thả file vào đây')}</b><span class="small muted">.apkg · .colpkg · .txt · .tsv · .csv</span></button>
      <input type="file" id="akFile" accept=".apkg,.colpkg,.anki2,.anki21,.txt,.tsv,.csv,text/plain,text/csv,text/tab-separated-values" hidden aria-label="${T('Chọn file')}">
      <div id="akMsg" role="status" aria-live="polite">${S.error ? `<div class="ak-err">⚠️ ${esc(S.error)}</div>` : S.parsing ? `<p class="small muted">${T('Đang đọc file…')}</p>` : ''}</div>
      <div class="ak-note"><b>${T('Lấy file từ Anki thế nào?')}</b><ol class="ak-steps" style="margin-top:.5rem"><li><span>${esc(T('Trong Anki chọn bộ thẻ → File → Export.'))}</span></li><li><span>${esc(T('Chọn “Anki Deck Package (.apkg)” hoặc “Notes in Plain Text (.txt)”.'))}</span></li><li><span>${esc(T('Chọn file đó ở đây. Âm thanh và hình ảnh trong thẻ sẽ được bỏ qua.'))}</span></li></ol></div>`;
    const set = S.set, opt = sel => `<option value="-1">${T('— Không dùng —')}</option>` + set.columns.map((c, i) => `<option value="${i}" ${sel === i ? 'selected' : ''}>${esc(c || T('Cột {n}', { n: i + 1 }))}</option>`).join('');
    const sel = (id, label, k) => `<label for="${id}">${label}<select class="input" id="${id}" data-k="${k}">${opt(S.map[k])}</select></label>`;
    return `<div class="ak-sum"><span class="chip">📦 ${T('{n} thẻ trong file', { n: set.rows.length })}</span>${set.kind === 'apkg' && set.models && set.models.length ? `<span class="chip">🧩 ${esc(set.models.slice(0, 3).join(', '))}</span>` : ''}</div>
      <div class="ak-map">
        <label for="akDeck" style="grid-column:1/-1">${T('Tên bộ từ trong Lexkite')}<input class="input" id="akDeck" maxlength="60" value="${esc(S.deck)}"></label>
        ${sel('akW', T('Từ tiếng Anh') + ' *', 'word')}${sel('akM', T('Nghĩa'), 'mean')}${sel('akE', T('Ví dụ'), 'ex')}${sel('akP', T('Phiên âm'), 'ipa')}
      </div>
      <div class="ak-sum" id="akCount" role="status" aria-live="polite"></div>
      <div><div class="ak-cap">${T('Xem trước 10 dòng đầu')}</div><div class="ak-tbl" tabindex="0" role="region" aria-label="${T('Xem trước 10 dòng đầu')}"><table><thead><tr><th scope="col">${T('Từ tiếng Anh')}</th><th scope="col">${T('Nghĩa')}</th><th scope="col">${T('Ví dụ')}</th><th scope="col"><span class="sr-only">${T('Trạng thái')}</span></th></tr></thead><tbody id="akRows"></tbody></table></div></div>
      <p class="small muted" style="margin:0">${T('Từ mới được thêm vào lịch ôn FSRS như thẻ mới. Từ đã có trong sổ được giữ nguyên.')}</p>
      <div class="row end"><button type="button" class="btn ghost" id="akReset">← ${T('Chọn file khác')}</button><button type="button" class="btn primary" id="akGo"></button></div>`;
  }
  const existingKeys = () => { const s = new Set(); const ko = g.Core && Core.keyOf; for (const c of Object.values((g.App && App.state.cards) || {})) s.add(ko ? Core.keyOf(c.word) : String(c.word).toLowerCase()); return s; };
  const keyFn = () => (g.Core && Core.keyOf) || (s => s.toLowerCase().replace(/\s+/g, ' ').trim());
  async function refreshPlan() {
    const set = S.set, my = S.planSeq = (S.planSeq || 0) + 1;
    const plan = await planImport(set, S.map, { existing: existingKeys(), keyOf: keyFn(), chunk: 2000 });
    if (my !== S.planSeq || !root()) return;
    S.plan = plan;
    const c = $('#akCount'); if (c) c.innerHTML = `<span class="ak-st new">${T('{n} từ mới', { n: plan.entries.length })}</span>${plan.dup ? `<span class="ak-st dup">${T('{n} đã có', { n: plan.dup })}</span>` : ''}${plan.invalid ? `<span class="ak-st bad">${T('{n} bỏ qua', { n: plan.invalid })}</span>` : ''}`;
    const go = $('#akGo'); if (go) { go.textContent = plan.entries.length ? '⬆️ ' + T('Nhập {n} từ', { n: plan.entries.length }) : T('Không có từ mới để nhập'); go.disabled = !plan.entries.length; }
    // Bảng xem trước: dựng bằng DOM + textContent (không innerHTML nội dung từ file)
    const tb = $('#akRows'); if (!tb) return;
    tb.textContent = '';
    const ex = existingKeys(), k = keyFn(), seen = new Set();
    const cell = (r, i) => i >= 0 && i < r.cells.length ? htmlToText(set.html ? r.cells[i] : String(r.cells[i]).replace(/</g, '&lt;')) : '';
    for (const r of set.rows.slice(0, 10)) {
      const w = cell(r, S.map.word).split(' · ')[0], key = k(w || ''), tr = document.createElement('tr');
      const st = !w || w.length > 80 || !/[a-z]/i.test(w) ? ['bad', T('Bỏ qua')] : ex.has(key) || seen.has(key) ? ['dup', T('Đã có')] : ['new', T('Sẽ nhập')];
      seen.add(key);
      for (const v of [w, cell(r, S.map.mean), cell(r, S.map.ex)]) { const td = document.createElement('td'); td.textContent = v.length > 140 ? v.slice(0, 140) + '…' : v; tr.appendChild(td); }
      const td = document.createElement('td'), sp = document.createElement('span'); sp.className = 'ak-st ' + st[0]; sp.textContent = st[1]; td.appendChild(sp); tr.appendChild(td);
      tb.appendChild(tr);
    }
  }
  async function pick(file) {
    if (!file) return;
    S.error = null; S.parsing = true; draw();
    try {
      const set = await parseFile(file);
      if (!set.rows.length) throw err('notanki');
      S.set = set; S.map = guessMap(set);
      S.deck = (set.deck || file.name.replace(/\.[^.]+$/, '')).split('::').pop().trim().slice(0, 60) || 'Anki';
    } catch (e) { S.error = ERR()[e.code] || ERR().zip; S.set = null; }
    S.parsing = false; draw();
    if (S.set) { refreshPlan(); const d = $('#akW'); if (d) d.focus(); } else { const d = $('#akDrop'); if (d) d.focus(); }
  }
  function bindImport() {
    if (S.done) { const h = $('#akDoneH'); if (h) { h.tabIndex = -1; h.focus(); } return; }
    if (S.importing) { $('#akCancel').onclick = () => { S.cancel = true; }; return; }
    if (!S.set) {
      const drop = $('#akDrop'), f = $('#akFile');
      drop.onclick = () => f.click();
      f.onchange = () => pick(f.files[0]);
      drop.ondragover = e => { e.preventDefault(); drop.classList.add('on'); };
      drop.ondragleave = () => drop.classList.remove('on');
      drop.ondrop = e => { e.preventDefault(); drop.classList.remove('on'); pick(e.dataTransfer.files[0]); };
      return;
    }
    $$('.ak-map select').forEach(s => s.onchange = () => { S.map[s.dataset.k] = +s.value; refreshPlan(); });
    $('#akDeck').oninput = e => { S.deck = e.target.value; };
    $('#akReset').onclick = () => { S.set = null; S.plan = null; draw(); };
    $('#akGo').onclick = runImport;
  }
  async function runImport() {
    if (S.map.word < 0) return;
    S.importing = true; S.cancel = false; draw();
    const bar = $('#akBar'), prog = $('#akProg');
    const setP = (p, label) => { if (!bar) return; const v = Math.round(p * 100); bar.firstElementChild.style.width = v + '%'; bar.setAttribute('aria-valuenow', v); if (label) prog.textContent = label; };
    const cancelled = () => S.cancel || !isOpen();
    const deck = (S.deck || 'Anki').trim().slice(0, 60) || 'Anki';
    try {
      const plan = await planImport(S.set, S.map, { existing: existingKeys(), keyOf: keyFn(), onProgress: p => setP(p * 0.4, T('Đang kiểm tra {n} dòng…', { n: S.set.rows.length })), isCancelled: cancelled });
      if (plan.cancelled) throw err('cancel');
      const C = Core.Cards, lib = (g.IELTS_DATA && IELTS_DATA.INDEX) || {}, vi = meanLangVi(), now = Date.now(), list = plan.entries;
      const map = await C.all(), del = await Core.Store.get('deleted', {});
      for (let i = 0; i < list.length; i++) {
        if (i % 400 === 0) { if (cancelled()) throw err('cancel'); setP(0.4 + 0.55 * i / list.length, T('Đang nhập {i}/{n} từ…', { i, n: list.length })); await new Promise(r => setTimeout(r, 0)); }
        const e = list[i], L = lib[e.key];
        const entry = L ? { ...L } : { word: e.word, ipa: e.ipa, vi: vi ? e.meaning : '', def: vi ? '' : e.meaning, ex: e.ex, pos: /\s/.test(e.word) ? 'phrase' : '', emoji: '🃏', topic: 'anki' };
        if (!L && !entry.ipa) delete entry.ipa;
        const card = C.make(entry, { deck, added: now - list.length + i, note: L && e.meaning ? e.meaning : '' });
        if (!L && e.ex) card.ex = e.ex;
        map[e.key] = card; delete del[e.key];
      }
      if (cancelled()) throw err('cancel');
      setP(0.97, T('Đang lưu…'));
      await C.save(map); await Core.Store.set('deleted', del);
      if (g.App) { await App.load(); App.updateChrome && App.updateChrome(); }
      if (g.Sync && Sync.schedule) Sync.schedule();
      S.done = { n: list.length, dup: plan.dup, invalid: plan.invalid, deck };
      if (g.Sfx && Sfx.win) try { Sfx.win(); } catch (e) { /* bỏ qua */ }
    } catch (e) {
      S.importing = false;
      if (e.code === 'cancel') { if (isOpen()) { draw(); toast(T('Đã hủy – chưa nhập từ nào')); } return; }
      S.error = T('Chưa nhập được. Hãy thử lại.'); S.set = null; if (isOpen()) draw(); return;
    }
    S.importing = false;
    if (isOpen()) draw(); else toast(T('Đã nhập {n} từ vào bộ “{d}”', { n: S.done.n, d: S.done.deck }));
    if (g.App && /^#\/(deck|library|home|settings)/.test(location.hash)) { try { App.route && App.route(); } catch (e) { /* bỏ qua */ } }
  }
  function importDone() {
    const d = S.done;
    return `<div class="ak-done">${kit('cheer', 84)}<h2 id="akDoneH">${T('Đã nhập {n} từ vào bộ “{d}”', { n: d.n, d: esc(d.deck) })}</h2>
        ${d.dup || d.invalid ? `<p class="small muted" style="margin:0">${T('Bỏ qua {k} từ đã có hoặc không hợp lệ.', { k: d.dup + d.invalid })}</p>` : ''}
        <p class="small muted" style="margin:0">${T('Từ mới đã vào lịch ôn FSRS – mỗi ngày học vài từ theo mục tiêu của bạn.')}</p></div>
      <div class="row end"><a class="btn" href="#/deck?from=anki" data-close>📒 ${T('Xem trong Sổ từ')}</a><a class="btn primary" href="#/practice/learn?src=deck" data-close>🧠 ${T('Học ngay')}</a></div>`;
  }

  g.AnkiUI = { open, itemOf };
  if (g.App) g.App.ankiOpen = open;
})(typeof self !== 'undefined' ? self : globalThis);
