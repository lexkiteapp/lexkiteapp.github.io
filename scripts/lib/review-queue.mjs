// Mỗi tệp nén gzip (.json.gz; cây repo tính theo kích thước chưa nén → 37,5 MB thành ~4 MB).
// Hàng duyệt nội dung (docs/CONTENT-QA.md) – lưu TÁCH THEO LÔ trong content/qa/review-queue/<lô>.json.gz (mỗi tệp ≤ ~3 MB; 24/11: tệp
// đơn 37,5 MB làm cây repo vượt trần 600 MB). Mọi script đọc/ghi QUA ĐÂY; hình dạng trả về giữ nguyên: { _doc, items: [...] }.
// Tệp cũ content/qa/review-queue.json (nếu còn trong nhánh cũ) vẫn được đọc, rồi lần ghi kế sẽ chuyển sang thư mục.
import fs from 'fs';
import zlib from 'zlib';
import path from 'path';
import { fileURLToPath } from 'url';
export const QDIR = 'content/qa/review-queue';
export const QLEGACY = 'content/qa/review-queue.json';
export const QDOC = 'Hàng duyệt nội dung (docs/CONTENT-QA.md): mục KHÔNG đạt cổng – không xuất. Tách theo lô (scripts/lib/review-queue.mjs); mỗi tệp ≤ 5 MB (test review-queue-size).';
const MAXB = 3e6;
const abs = r => (r instanceof URL ? fileURLToPath(r) : String(r));
export const gz = t => zlib.gzipSync(Buffer.from(t), { level: 9 });
export const gunz = b => zlib.gunzipSync(b).toString('utf8');
export const qText = items => '{"items":[\n' + items.map(i => JSON.stringify(i)).join(',\n') + '\n]}\n';
const safe = b => String(b || '_').replace(/[^A-Za-z0-9._-]+/g, '_').slice(0, 80);

export function readQueue(root) {
  const R = abs(root), items = [], d = path.join(R, QDIR);
  const lf = path.join(R, QLEGACY);
  if (fs.existsSync(lf)) items.push(...(JSON.parse(fs.readFileSync(lf, 'utf8')).items || []));
  if (fs.existsSync(d)) for (const f of fs.readdirSync(d).filter(f => f.endsWith('.json.gz')).sort()) items.push(...(JSON.parse(gunz(fs.readFileSync(path.join(d, f)))).items || []));
  return { _doc: QDOC, items };
}

/** ghi lại: nhóm theo lô, chỉ ghi tệp đổi, xoá tệp rỗng/mồ côi, bỏ tệp đơn cũ */
export function writeQueue(root, q) {
  const R = abs(root), d = path.join(R, QDIR), by = new Map();
  for (const it of q.items || []) { const k = safe(it.batch); (by.get(k) || by.set(k, []).get(k)).push(it); }
  const want = new Map();
  for (const [k, arr] of by) {
    let part = [], size = 0, n = 1;
    const flush = () => { if (part.length) { want.set(n === 1 ? `${k}.json.gz` : `${k}.${n}.json.gz`, part); n++; part = []; size = 0; } };
    for (const it of arr) { const s = JSON.stringify(it).length + 2; if (size + s > MAXB && part.length) flush(); part.push(it); size += s; }
    flush();
  }
  fs.mkdirSync(d, { recursive: true });
  for (const f of fs.readdirSync(d).filter(f => /\.json(\.gz)?$/.test(f))) if (!want.has(f)) fs.unlinkSync(path.join(d, f));
  for (const [f, items] of want) {
    const txt = qText(items), p = path.join(d, f), buf = gz(txt);
    if (!fs.existsSync(p) || gunz(fs.readFileSync(p)) !== txt) fs.writeFileSync(p, buf);
  }
  const lf = path.join(R, QLEGACY); if (fs.existsSync(lf)) fs.unlinkSync(lf);
}
