// lastmod thật theo từng URL cho sitemap (docs/SEO-ARCH.md §4b). Google bỏ qua lastmod của cả site nếu nó không "nhất quán và kiểm chứng được"
// (vd. mọi trang đều "hôm nay" vì ngày commit của cả thư mục code). Cách làm: băm phần nội dung chính (<main>, bỏ script/style/?v=)
// → so với content/seo/lastmod.json { path: [băm, ngày] }: trùng → giữ ngày cũ; đổi → hôm nay; chưa có → ngày dự phòng (gitDate cũ).
// Build chỉ đọc sổ; LASTMOD_WRITE=1 (seo-indexnow.yml trên CI) ghi lại sổ để ngày đổi được giữ cố định cho các lần build sau.
import fs from 'node:fs'; import crypto from 'node:crypto';

export const LASTMOD_FILE = 'content/seo/lastmod.json';
const today = () => new Date().toISOString().slice(0, 10);

// Nội dung chính đủ để quyết "có đổi thật không": khung trang (đầu/chân, CSS, phiên bản asset) và thủy ấn vô hình (chứa ngày) không tính.
export const mainHash = html => {
  const m = /<main\b[^>]*>([\s\S]*?)<\/main>/i.exec(html);
  const s = (m ? m[1] : html).replace(/[\u200B\u2060\u2063]/g, '').replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, '').replace(/([?&])v=[\w.-]+/g, '$1').replace(/\s+/g, ' ').trim();
  return crypto.createHash('sha1').update(s).digest('hex').slice(0, 12);
};

export function lastmodStore(file = process.env.LASTMOD_FILE || LASTMOD_FILE) {
  let book = {};
  try { book = JSON.parse(fs.readFileSync(file, 'utf8')); } catch {}
  const seen = {};
  const now = today();
  return {
    // key = đường dẫn (không gồm domain); fallback = ngày khi URL chưa từng có trong sổ (lần đầu: giữ hành vi cũ, không đẩy cả site về hôm nay)
    date(key, html, fallback = now) {
      const h = mainHash(html), e = book[key];
      const d = e && e[0] === h ? e[1] : e ? now : (fallback > now ? now : fallback);
      seen[key] = [h, d];
      return d;
    },
    hash: key => seen[key]?.[0],
    // Ghi sổ: giữ mục của script khác (cùng file), thay mục đã thấy; một dòng/URL cho diff gọn.
    save({ prefixes } = {}) {
      if (process.env.LASTMOD_WRITE !== '1') return false;
      let cur = {};
      try { cur = JSON.parse(fs.readFileSync(file, 'utf8')); } catch {}
      if (prefixes) for (const k of Object.keys(cur)) if (prefixes.some(p => k.startsWith(p)) && !seen[k]) delete cur[k]; // URL đã bỏ
      Object.assign(cur, seen);
      const keys = Object.keys(cur).sort();
      fs.mkdirSync(file.replace(/\/[^/]*$/, ''), { recursive: true });
      fs.writeFileSync(file, '{\n' + keys.map(k => `${JSON.stringify(k)}:${JSON.stringify(cur[k])}`).join(',\n') + '\n}\n');
      return true;
    },
  };
}
