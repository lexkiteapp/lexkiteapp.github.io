// Sổ YouTube ID đã kiểm cho blog (content/blog/youtube.json). Lô B5-R2 (5/11/2026): 9 ID bịa (oEmbed 404) nằm trong 29 bài
// → ảnh xem trước xám + iframe lỗi trên trang thật; blog-check chỉ kiểm độ dài 11 ký tự nên không bắt được.
// Dùng: node scripts/blog-youtube.mjs add <ID> [<ID>…]   – gọi oEmbed, chỉ ghi ID có thật và cho nhúng
//       node scripts/blog-youtube.mjs verify             – kiểm lại cả sổ (video bị gỡ/chặn nhúng → mã 1)
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
export const FILE = path.join(path.dirname(fileURLToPath(import.meta.url)), '../content/blog/youtube.json');
export const loadYoutube = (file = FILE) => { try { return JSON.parse(fs.readFileSync(file, 'utf8')).videos || {}; } catch { return {}; } };
const oembed = async id => {
  const r = await fetch(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent('https://www.youtube.com/watch?v=' + id)}`);
  if (!r.ok) return { ok: false, why: `oEmbed ${r.status} (không tồn tại, riêng tư hoặc chặn nhúng)` };
  const j = await r.json(); return { ok: true, title: j.title, channel: j.author_name };
};
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [cmd, ...ids] = process.argv.slice(2), doc = JSON.parse(fs.readFileSync(FILE, 'utf8')), today = new Date().toISOString().slice(0, 10);
  let bad = 0;
  for (const id of cmd === 'verify' ? Object.keys(doc.videos) : ids) {
    if (!/^[\w-]{11}$/.test(id)) { console.log(`✗ ${id}: không phải ID 11 ký tự`); bad++; continue; }
    const r = await oembed(id);
    if (!r.ok) { console.log(`✗ ${id}: ${r.why}`); bad++; continue; }
    doc.videos[id] = { title: r.title, channel: r.channel, checked: today };
    console.log(`✓ ${id}: ${r.title} – ${r.channel}`);
  }
  if (cmd !== 'add' && cmd !== 'verify') { console.log('Dùng: add <ID…> | verify'); process.exit(2); }
  fs.writeFileSync(FILE, JSON.stringify(doc, null, 2) + '\n');
  process.exit(bad ? 1 : 0);
}
