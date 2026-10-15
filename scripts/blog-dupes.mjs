// Tự kiểm trùng lặp/đạo văn nội bộ: shingle 8 từ (chữ thường, NFC, bỏ dấu câu) của plainText(body).
//  • giữa 2 bài: chồng lấn |A∩B| / min(|A|,|B|) > 12% → lỗi
//  • bài so với nội dung sẵn có của site (bài mẫu Writing/Speaking, Reading…) > 5% → lỗi
//  • đoạn văn ≥ 25 từ lặp nguyên văn trong 1 bài hoặc giữa các bài → lỗi
// Dùng: node scripts/blog-dupes.mjs [--root content/blog] [file.md …]   (không có file → mọi bài không phải draft)
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import { ROOT, plainText, readPost, loadPostsAt } from './lib/blog-content.mjs';

const K = 8, PAIR = 0.12, CORPUS = 0.05, PARA = 25;
const CORPUS_FILES = ['web/js/models.js', 'web/js/readings.js', 'web/js/write', 'web/js/speak'];
const tokens = s => s.normalize('NFC').toLowerCase().replace(/[^\p{L}\p{N}\s]+/gu, ' ').split(/\s+/).filter(Boolean);
// Băm 53 bit (cyrb53) – ít va chạm, khóa số nhanh hơn chuỗi
const hash = (s, seed = 0) => {
  let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
  for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); h1 = Math.imul(h1 ^ c, 2654435761); h2 = Math.imul(h2 ^ c, 1597334677); }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
};
const shingles = text => { const w = tokens(text), out = new Set(); for (let i = 0; i + K <= w.length; i++) out.add(hash(w.slice(i, i + K).join(' '))); return out; };
const rel = f => { const r = path.relative(process.cwd(), f); return r && !r.startsWith('..') ? r : f; };
const pct = x => (x * 100).toFixed(1) + '%';

const args = process.argv.slice(2); let root = ROOT; const files = [];
for (let i = 0; i < args.length; i++) args[i] === '--root' ? (root = args[++i]) : files.push(args[i]);
const t0 = Date.now();
const all = loadPostsAt(root).filter(p => p.status !== 'draft');
const byFile = new Map(all.map(p => [path.resolve(p.file), p]));
for (const f of files) byFile.set(path.resolve(f), readPost(f));
const posts = [...byFile.values()], targets = new Set(files.length ? files.map(f => path.resolve(f)) : byFile.keys());
const isT = p => targets.has(path.resolve(p.file));
const errors = [];

// Shingle từng bài + chỉ mục ngược shingle → danh sách bài
const sh = posts.map(p => shingles(plainText(p.body || ''))), index = new Map();
sh.forEach((s, i) => { for (const h of s) { const l = index.get(h); l ? l.push(i) : index.set(h, [i]); } });
const pairs = [];
sh.forEach((s, i) => {
  const cnt = new Map();
  for (const h of s) for (const j of index.get(h)) if (j > i) cnt.set(j, (cnt.get(j) || 0) + 1);
  for (const [j, c] of cnt) {
    const r = c / Math.min(s.size, sh[j].size) || 0; pairs.push({ i, j, r });
    if (r > PAIR && (isT(posts[i]) || isT(posts[j]))) errors.push(`${rel(posts[i].file)}: [trùng-bài] chồng lấn ${pct(r)} với ${rel(posts[j].file)} (${c} shingle, ngưỡng ${pct(PAIR)})`);
  }
});

// So với nội dung sẵn có của site
const corpus = new Set(); let cf = 0;
const walk = p => { if (!fs.existsSync(p)) return; if (fs.statSync(p).isDirectory()) return fs.readdirSync(p).sort().forEach(f => walk(path.join(p, f))); if (p.endsWith('.js')) { cf++; for (const h of shingles(fs.readFileSync(p, 'utf8'))) corpus.add(h); } };
CORPUS_FILES.forEach(f => walk(path.join(fileURLToPath(new URL('..', import.meta.url)), f)));
sh.forEach((s, i) => {
  if (!isT(posts[i]) || !s.size) return;
  let c = 0; for (const h of s) if (corpus.has(h)) c++;
  if (c / s.size > CORPUS) errors.push(`${rel(posts[i].file)}: [trùng-site] ${pct(c / s.size)} shingle trùng nội dung sẵn có của site (ngưỡng ${pct(CORPUS)})`);
});

// Đoạn văn lặp nguyên văn (≥ 25 từ)
const paras = new Map();
posts.forEach(p => {
  for (const block of (p.body || '').replace(/```[\s\S]*?```/g, ' ').replace(/^\s*(#{1,6}\s.*|!\[.*|\{\{.*)$/gm, '').split(/\n\s*\n/)) {
    const w = tokens(plainText(block)); if (w.length < PARA) continue;
    const key = w.join(' '), l = paras.get(key); l ? l.push(p) : paras.set(key, [p]);
  }
});
for (const [key, l] of paras) if (l.length > 1 && l.some(isT)) {
  const names = [...new Set(l.map(p => rel(p.file)))];
  errors.push(`${names[0]}: [đoạn-lặp] đoạn ${key.split(' ').length} từ lặp ${l.length} lần${names.length > 1 ? ' (cả ở ' + names.slice(1).join(', ') + ')' : ' trong cùng bài'}: "${key.slice(0, 60)}…"`);
}

for (const e of errors) console.log(`✗ ${e}`);
const top = pairs.sort((a, b) => b.r - a.r)[0];
console.log(`${errors.length ? '✗' : '✓'} blog-dupes: ${targets.size}/${posts.length} bài, corpus ${cf} file (${corpus.size} shingle), ${errors.length} lỗi` +
  (top ? `; cặp giống nhất ${pct(top.r)} (${path.basename(posts[top.i].file)} ~ ${path.basename(posts[top.j].file)})` : '') + ` – ${Date.now() - t0} ms`);
process.exit(errors.length ? 1 : 0);
