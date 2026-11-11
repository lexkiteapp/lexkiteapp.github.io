// Tên file JS/CSS theo MÃ BĂM nội dung cho bản web (dist/): bản sao ở /h/<đường dẫn>.<băm10>.<đuôi> → web/_headers cho cache immutable
// 1 năm, service worker cache-first. Tham chiếu chữ (literal) trong dist/app/index.html, dist/sw.js, dist/js/**, dist/css/** được trỏ sang bản băm.
// File gốc GIỮ NGUYÊN (no-cache như cũ): đường dẫn ghép động (G + 'tenses.js'), trang tĩnh/blog, add-on, app di động vẫn dùng được.
// Băm theo tầng (Merkle): chỉ băm file mà mọi file nó tham chiếu đã băm xong → đổi 1 file con thì file cha đổi tên theo, không bao giờ
// có tên cũ mang nội dung mới. Chu trình tham chiếu → giữ tên gốc. Không băm: js/i18n/** (loadScript suy gói ngôn ngữ từ đường dẫn),
// file tự tìm vị trí của mình (currentScript / script[src*= / import.meta). CSS: url() tương đối đổi sang tuyệt đối (/fonts/…) trước khi băm.
// Chạy trong scripts/build-web.sh sau build-cpack, trước khi gắn phiên bản sw:  node scripts/build-hash.mjs dist   (NO_HASH=1 → bỏ qua: app di động)
import { isMain } from './lib/is-main.mjs';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export const SKIP_DIR = /^js\/i18n\//;
export const SELF_LOCATE = /currentScript|script\[src[*^$]?=|import\.meta/;
const REL_URL = /url\(\s*(['"]?)(?![\s'"]|data:|https?:|\/|#)([^'")]+)\1\s*\)/g;
// CSS dời sang /h/css/… → url(../fonts/x) phải thành đường dẫn tuyệt đối (/fonts/x), nếu không sẽ trỏ sai chỗ
export const absUrls = (rel, t) => t.replace(REL_URL, (m, q, u) => `url(${q}${path.posix.normalize('/' + path.posix.dirname(rel) + '/' + u)}${q})`);
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// tham chiếu đúng đường dẫn: trước là ký tự không thuộc đường dẫn (hoặc '/' gốc), sau là hết đường dẫn (không ăn 'ngsl.js' trong 'ngsl2.js')
export const refRe = rel => new RegExp(`(^|[^\\w./-])(/?)${esc(rel)}(?=[^\\w./-]|$)`, 'g');
export const hashedName = (rel, h) => 'h/' + rel.replace(/(\.\w+)$/, `.${h}$1`);

// Đọc NGƯỢC cho bộ kiểm dist (theme-switch, …): đổi tên băm trong nội dung về tên gốc theo dist/h/manifest.json → kiểm theo tên gốc,
// không cố định tên băm. Không có manifest (web/, NO_HASH) → trả nguyên văn.
export const manifestOf = root => { try { return JSON.parse(fs.readFileSync(path.join(root, 'h', 'manifest.json'), 'utf8')); } catch (e) { return {}; } };
export const plainRefs = (text, map) => { for (const [r, hn] of Object.entries(map)) if (text.includes(hn)) text = text.split(hn).join(r); return text; };
// files: Map rel → nội dung (đã rút gọn). Trả { map: rel → tên băm, out: Map rel → nội dung sau khi trỏ tham chiếu, skipped: [[rel, lý do]] }
export function plan(files, scan) {
  const cand = new Set(), skipped = [];
  files = new Map([...files].map(([rel, t]) => [rel, rel.endsWith('.css') ? absUrls(rel, t) : t]));
  for (const [rel, t] of files) {
    const why = SKIP_DIR.test(rel) ? 'i18n' : SELF_LOCATE.test(t) ? 'tự tìm vị trí' : '';
    why ? skipped.push([rel, why]) : cand.add(rel);
  }
  const res = new Map([...cand].map(r => [r, refRe(r)]));
  const out = new Map([...files, ...scan]), map = {};
  const refsOf = t => [...cand].filter(r => t.includes(r) && (res.get(r).lastIndex = 0, res.get(r).test(t)));
  const deps = new Map([...cand].map(r => [r, refsOf(files.get(r))]));
  for (const r of cand) if (deps.get(r).includes(r)) { cand.delete(r); deps.delete(r); skipped.push([r, 'tự tham chiếu']); }
  const rewrite = t => { for (const [r, hn] of Object.entries(map)) if (t.includes(r)) t = t.replace(refRe(r), (m, a, s) => a + s + hn); return t; };
  for (let progress = true; progress;) {
    progress = false;
    for (const r of cand) {
      if (map[r] || !deps.get(r).every(d => map[d] || !cand.has(d))) continue;
      const t = rewrite(files.get(r));
      map[r] = hashedName(r, crypto.createHash('sha256').update(t).digest('hex').slice(0, 10)); out.set(r, t); progress = true;
    }
  }
  for (const r of cand) if (!map[r]) skipped.push([r, 'chu trình tham chiếu']);
  for (const [k, t] of out) out.set(k, rewrite(t));
  return { map, out, skipped };
}

if (isMain(import.meta.url)) {
  const root = process.argv[2] || 'dist';
  if (process.env.NO_HASH === '1') { console.log('✓ build-hash: bỏ qua (NO_HASH=1)'); process.exit(0); }
  const walk = d => fs.existsSync(d) ? fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]) : [];
  const rel = f => path.relative(root, f).split(path.sep).join('/');
  const files = new Map([...walk(path.join(root, 'js')), ...walk(path.join(root, 'css'))].filter(f => /\.(js|css)$/.test(f)).map(f => [rel(f), fs.readFileSync(f, 'utf8')]));
  const scan = new Map(['app/index.html', 'sw.js'].filter(r => fs.existsSync(path.join(root, r))).map(r => [r, fs.readFileSync(path.join(root, r), 'utf8')]));
  const { map, out, skipped } = plan(files, scan);
  for (const [r, t] of out) if (t !== (files.get(r) ?? scan.get(r))) fs.writeFileSync(path.join(root, r), t);
  const all = [...out.values()].join('\n');
  for (const r of Object.keys(map)) if (!all.includes(map[r])) delete map[r]; // chỉ tham chiếu ghép động (G + 'x.js') → không cần bản băm (đỡ file cho giới hạn 20.000 của Pages)
  for (const [r, hn] of Object.entries(map)) { fs.mkdirSync(path.dirname(path.join(root, hn)), { recursive: true }); fs.writeFileSync(path.join(root, hn), out.get(r)); }
  fs.writeFileSync(path.join(root, 'h', 'manifest.json'), JSON.stringify(map, null, 1) + '\n');
  const why = skipped.reduce((a, [, w]) => (a[w] = (a[w] || 0) + 1, a), {});
  console.log(`✓ build-hash: ${Object.keys(map).length} file JS/CSS có bản tên theo mã băm (/h/, immutable); giữ tên gốc: ${JSON.stringify(why)}`);
}
