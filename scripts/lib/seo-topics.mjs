// Trang chủ đề /<lang>/words/topic/<id> (docs/specs/seo-topic-hubs.md): gom từ INDEX ĐƯỢC theo chủ đề cho 13 ngôn ngữ ngoài en/vi (en/vi đã có /en/vocabulary/, /tu-vung/ → không tạo trang cạnh tranh).
// Nguồn: content/seo/topics/<lang>.json = { <id>: { n: tên chủ đề bản ngữ, i: đoạn giới thiệu 45–80 chữ } } + _ui.json (khung chữ). Thiếu nội dung → không sinh trang (không bao giờ trang chỉ có danh sách link).
import fs from 'node:fs';
const DIR = 'content/seo/topics', MIN_WORDS = 10, MIN_INTRO = 40; // chữ (CJK/Thái: ký tự/2)
const rd = f => { try { return JSON.parse(fs.readFileSync(`${DIR}/${f}`, 'utf8')); } catch { return null; } };
export const words = s => { const t = String(s || '').trim(); const cjk = (t.match(/[぀-ヿ㐀-鿿가-힯฀-๿]/g) || []).length; return cjk > t.length / 3 ? Math.round(cjk / 2) : (t.match(/\S+/g) || []).length; };
export const topicPath = (l, id) => `/${l}/words/topic/${id}`;

/** → { pages: {lang: Map(id → {id, name, intro, words:[mục]})}, ui: {lang: {...}}, of: (l, e) => id|null } */
export function topicPages(idxW, langs) {
  const ui = rd('_ui.json') || {}, pages = {};
  for (const l of langs) {
    pages[l] = new Map();
    const c = rd(`${l}.json`), u = ui[l]; if (!c || !u || !u.title) continue;
    const by = new Map(); for (const e of idxW[l]) { if (!by.has(e.topic)) by.set(e.topic, []); by.get(e.topic).push(e); }
    for (const [id, ws] of by) { const x = c[id]; if (ws.length >= MIN_WORDS && x && x.n && words(x.i) >= MIN_INTRO) pages[l].set(id, { id, name: x.n, intro: x.i, words: ws }); }
  }
  return { pages, ui, of: (l, e) => (pages[l] && pages[l].has(e.topic) ? e.topic : null) };
}
