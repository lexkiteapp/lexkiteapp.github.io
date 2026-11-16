// Cứu ảnh đã vẽ nhưng chưa chấm (run 41569456017: 564 ảnh vẽ xong, job bị huỷ khi chấm) – fill với input judge_run=<run id>:
// tải artifact vimg-fill-* của lượt đó, BỎ bước vẽ, mỗi việc ma trận lấy phần khoá fnv(k) % n == i (cùng luật chia shard của scene-gen)
// → dựng $OUT như lượt fill thường (raw/, svg/, targets.json) để local_judge.py --budget-min chấm rồi fillpub đăng đúng đường cũ.
// Idempotent: scene-publish bỏ khoá đã có ảnh AI trong img.json; chạy lại chỉ chấm lại (ảnh đã đăng bị pHash trùng chính nó → không đăng lại).
// CLI: node judge-run-prep.mjs --src <thư mục chứa các vimg-fill-N> --out <OUT> --shard i/n
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import { fnv } from './style.mjs';

export const slug = k => k.replace(/#/g, '__').replace(/[^a-zA-Z0-9_-]+/g, '-');   // trùng local_judge.py/scene-gen
export const inShard = (k, i, n) => n <= 1 || fnv(k) % n === i;
export const shardKeys = (keys, i, n) => keys.filter(k => inShard(k, i, n));

// ảnh của một khoá: <slug>.a<N>.jpg và ứng viên <slug>.a<N>.c<M>.jpg
export const imagesOf = (files, k) => { const s = slug(k); return files.filter(f => f.startsWith(s + '.a') && /^\.a\d+(\.c\d)?\.jpg$/.test(f.slice(s.length))); };

export function prep({ src, out, shard: [i, n] }) {
  fs.mkdirSync(path.join(out, 'raw'), { recursive: true }); fs.mkdirSync(path.join(out, 'svg'), { recursive: true });
  const parts = fs.readdirSync(src).filter(d => fs.existsSync(path.join(src, d, 'out/vimg-fill'))).map(d => path.join(src, d));
  const T = {}, keys = new Set(); let copied = 0;
  for (const p of parts) {
    const o = path.join(p, 'out/vimg-fill'), tf = path.join(o, 'targets.json');
    if (fs.existsSync(tf)) Object.assign(T, JSON.parse(fs.readFileSync(tf, 'utf8')));
    const kf = path.join(p, 'keys.json'); if (fs.existsSync(kf)) for (const k of JSON.parse(fs.readFileSync(kf, 'utf8')).items) keys.add(k);
  }
  const mine = shardKeys([...keys].filter(k => T[k]), i, n);
  for (const p of parts) {
    const rawD = path.join(p, 'out/vimg-fill/raw'); if (!fs.existsSync(rawD)) continue;
    const files = fs.readdirSync(rawD);
    for (const k of mine) for (const f of imagesOf(files, k)) { const d = path.join(out, 'raw', f); if (!fs.existsSync(d)) { fs.copyFileSync(path.join(rawD, f), d); copied++; } }
    const sv = path.join(p, 'out/vimg-fill/svg'); if (fs.existsSync(sv)) for (const f of fs.readdirSync(sv)) if (!fs.existsSync(path.join(out, 'svg', f))) fs.copyFileSync(path.join(sv, f), path.join(out, 'svg', f));
    // thống kê vẽ / thẻ của lượt cũ đi cùng việc 0 (một lần) để fill-report tính neuron/ảnh nhận đúng, không nhân đôi
    if (i === 0) for (const f of fs.readdirSync(path.join(p, 'out/vimg-fill'))) if (/^(gen-stats|speed\.(?!judge)|cards\.|cardstats\.)/.test(f) && f.endsWith('.json')) fs.copyFileSync(path.join(p, 'out/vimg-fill', f), path.join(out, f));
  }
  fs.writeFileSync(path.join(out, 'targets.json'), JSON.stringify(T, null, 1));   // đủ MỌI khoá: giám khảo cần anh em/nhiễu
  fs.writeFileSync(path.join(out, 'judge-run-keys.json'), JSON.stringify({ items: mine }));
  return { keys: keys.size, mine: mine.length, images: copied };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const arg = k => { const j = process.argv.indexOf('--' + k); return j > 0 ? process.argv[j + 1] : undefined; };
  const [i, n] = (arg('shard') || '0/1').split('/').map(Number);
  const r = prep({ src: arg('src'), out: arg('out'), shard: [i, n] });
  console.log(`judge_run shard ${i}/${n}: ${r.mine}/${r.keys} khoá · ${r.images} ảnh`);
  if (!r.images) { console.log('::warning::việc này không có ảnh để chấm'); }
}
