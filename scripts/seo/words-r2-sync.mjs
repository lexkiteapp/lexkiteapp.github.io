#!/usr/bin/env node
// Đồng bộ dist-words/ → R2 lexkite-words (docs/specs/words-off-pages.md §1.3/§1.6). CHỈ trên CI. Sổ _words/manifest.json (khoá → sha256) trong chính bucket:
// chỉ ghi khi băm đổi (Class A tối thiểu), không bao giờ xoá. Thoát 1 nếu lỗi đẩy / thư mục rỗng khi cần / mẫu đọc lại lệch. R2 đóng băng ($0 guard) → bỏ qua, không đỏ.
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import { r2Config, r2Put, r2Get, sha256hex } from '../lib/media-store.mjs';
import { r2Langs, WORDS_DIR } from '../lib/words-r2.mjs';
const MANIFEST = '_words/manifest.json';
const walk = d => fs.existsSync(d) ? fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]) : [];
/** Tệp cần đẩy: khoá = đường dẫn tương đối trong dist-words (vd ko/words/abc.html), băm khác sổ. */
export function plan(dir, manifest) {
  const all = walk(dir).filter(f => f.endsWith('.html')).map(f => { const b = fs.readFileSync(f); return { key: path.relative(dir, f).split(path.sep).join('/'), b, h: sha256hex(b) }; });
  return { all, todo: all.filter(x => manifest[x.key] !== x.h) };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const DRY = process.argv.includes('--dry'), langs = r2Langs();
  if (!langs.length) { console.log('· words-r2-sync: không ngôn ngữ nào bật (content/seo/words-r2.json / SEO_WORDS_R2=0) – bỏ qua'); process.exit(0); }
  if (!process.env.CI && !DRY) { console.error('words-r2-sync: chỉ chạy trên CI (hoặc --dry)'); process.exit(2); }
  const cfg = r2Config({ ...process.env, R2_BUCKET: 'lexkite-words' });
  if (!cfg && !DRY) { console.log('::notice::R2 đóng băng hoặc thiếu khoá S3 → không đồng bộ (trang vẫn phục vụ bản R2 cũ)'); process.exit(0); }
  let man = {}; if (cfg) { const m = await r2Get(cfg, MANIFEST); if (m) man = JSON.parse(m.toString()); }
  const { all, todo } = plan(WORDS_DIR, man);
  const want = langs.reduce((n, l) => n + all.filter(x => x.key.startsWith(l + '/words/')).length, 0);
  if (!all.length || want < 100 * langs.length) { console.error(`✗ words-r2-sync: ${WORDS_DIR} chỉ có ${all.length} trang (${want} của ${langs.join(',')}) – dựng hỏng? KHÔNG đồng bộ`); process.exit(1); }
  console.log(`words-r2-sync: ${all.length} trang, ${todo.length} đổi/mới${DRY ? ' (dry)' : ''}`);
  if (DRY) process.exit(0);
  let i = 0, err = 0; const q = [...todo];
  await Promise.all(Array.from({ length: 16 }, async () => { for (let x; (x = q.shift());) { try { await r2Put(cfg, x.key, x.b, 'text/html; charset=utf-8'); man[x.key] = x.h; } catch (e) { err++; console.error('✗', x.key, e.message); } i++; } }));
  await r2Put(cfg, MANIFEST, Buffer.from(JSON.stringify(man)), 'application/json'); // sổ ghi cả khi có lỗi lẻ → lượt sau chỉ đẩy lại phần thiếu
  const ks = all.map(x => x.key), probe = [ks[0], ks[ks.length >> 1], ks.at(-1)];
  for (const k of probe) { const g = await r2Get(cfg, k), h = all.find(x => x.key === k).h; if (!g || sha256hex(g) !== h) { console.error(`✗ mẫu đọc lại lệch: ${k}`); err++; } }
  console.log(`✓ words-r2-sync: đẩy ${todo.length - err}/${todo.length}, lỗi ${err}`); process.exit(err ? 1 : 0);
}
