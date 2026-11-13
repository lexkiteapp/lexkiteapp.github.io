// Cổng nội dung làm giàu trang từ (content/dict/enrich/<lang>.json) – docs/SEO-DICT-PAGES.md §11. Dùng: node scripts/test/dict-enrich.mjs [--lang xx]
// Chặn: từ ngoài tập trang, ghi chú ngắn/dài, sai chữ viết (lẫn ngôn ngữ), mã/HTML/URL, ví dụ không chứa từ hoặc chép lại ví dụ sẵn có, bản dịch trống/trùng câu gốc,
// ghi chú trùng nhau hoặc mở đầu lặp (nội dung khuôn). Ngưỡng chỉ được TĂNG.
import fs from 'node:fs';
import { setOf, J } from '../lib/seo-words.mjs';
import { countWords } from '../lib/word-depth.mjs';
const only = process.argv.includes('--lang') ? process.argv[process.argv.indexOf('--lang') + 1] : null;
export const NOTE_WORDS = [45, 110], EX_LEN = [25, 170];
const SCRIPT = { th: /[฀-๿]/g, ar: /[؀-ۿ]/g, hi: /[ऀ-ॿ]/g, ja: /[぀-ヿ㐀-鿿]/g, ko: /[가-힯]/g, zh: /[㐀-鿿]/g, ru: /[Ѐ-ӿ]/g };
const EN_STOP = /\b(the|and|is|of|to|with|for|you|this|that|are|can|it|in|on)\b/gi;
const VI = /[ăđơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]/i; // chỉ dấu riêng của tiếng Việt (â ê ô thường gặp ở pt/fr/tr nên không tính)
const letters = s => (s.match(/\p{L}/gu) || []).length;
let bad = 0, total = 0;
const err = (l, w, m) => { bad++; console.error(`✗ ${l}/${w}: ${m}`); };
for (const l of Object.keys(setOf)) {
  if (only && l !== only) continue;
  const f = `content/dict/enrich/${l}.json`; if (!fs.existsSync(f)) continue;
  let d; try { d = J(f); } catch (e) { err(l, '-', 'JSON hỏng'); continue; }
  const words = new Map(setOf[l].map(e => [e.word.toLowerCase(), e])), seen = new Map(), open = new Map();
  for (const [k, v] of Object.entries(d)) {
    total++;
    const e = words.get(k); if (k !== k.toLowerCase() || !e) { err(l, k, 'từ không thuộc tập trang (hoặc không viết thường)'); continue; }
    const n = v && v.n; if (typeof n !== 'string') { err(l, k, 'thiếu n'); continue; }
    const nw = countWords(n); if (nw < NOTE_WORDS[0] || nw > NOTE_WORDS[1]) err(l, k, `ghi chú ${nw} chữ (cần ${NOTE_WORDS[0]}–${NOTE_WORDS[1]})`);
    if (/[<>{}]|https?:|www\./.test(n)) err(l, k, 'có HTML/mã/URL');
    if (l !== 'vi' && VI.test(n)) err(l, k, 'lẫn chữ Việt');
    const sc = SCRIPT[l]; if (sc && (n.match(sc) || []).length < letters(n) * 0.4) err(l, k, 'ghi chú không phải chữ của ngôn ngữ trang');
    if (!sc && l !== 'en') { const st = (n.match(EN_STOP) || []).length / Math.max(1, nw); if (st > 0.15) err(l, k, 'ghi chú giống tiếng Anh (viết bằng ngôn ngữ trang)'); }
    if (l === 'en' && (n.match(/[^\x00-\x7F‘’“”–—…é]/g) || []).length > 3) err(l, k, 'ký tự lạ trong ghi chú tiếng Anh');
    const key = n.toLowerCase().replace(/\W+/g, ' ').trim(); if (seen.has(key)) err(l, k, `ghi chú trùng với "${seen.get(key)}"`); seen.set(key, k);
    const head = n.split(/\s+/).slice(0, 4).join(' ').toLowerCase(); open.set(head, (open.get(head) || 0) + 1);
    const x = v.x; if (!Array.isArray(x) || x.length < 2 || x.length > 3) { err(l, k, 'x phải có 2–3 ví dụ'); continue; }
    const re = new RegExp(`(^|[^a-z])${k.replace(/[^a-z' -]/g, '')}`, 'i'), have = new Set([e.ex, e.ex2].filter(Boolean));
    for (const p of x) {
      if (!Array.isArray(p) || (l === 'en' ? p.length < 1 : p.length !== 2)) { err(l, k, 'ví dụ sai dạng'); continue; }
      const [s, tr] = p;
      if (typeof s !== 'string' || s.length < EX_LEN[0] || s.length > EX_LEN[1]) err(l, k, `câu ví dụ dài ${String(s).length} ký tự (cần ${EX_LEN[0]}–${EX_LEN[1]})`);
      else { if (!re.test(s)) err(l, k, `ví dụ không chứa từ: ${s}`); if (have.has(s)) err(l, k, 'ví dụ chép lại ví dụ sẵn có'); if (!/[.!?]["”’']?$/.test(s) || /[<>{}]/.test(s) || VI.test(s)) err(l, k, `ví dụ sai dạng: ${s}`); have.add(s); }
      if (l !== 'en') { if (typeof tr !== 'string' || tr.length < 8 || tr === s || /[<>{}]/.test(tr) || VI.test(tr) && l !== 'vi') err(l, k, 'bản dịch ví dụ trống/trùng câu gốc/lẫn chữ Việt'); else if (sc && (tr.match(sc) || []).length < letters(tr) * 0.4) err(l, k, 'bản dịch ví dụ sai chữ viết'); }
    }
  }
  for (const [h, c] of open) if (c > Math.max(4, Object.keys(d).length * 0.12)) err(l, '-', `mở đầu lặp ${c} lần ("${h}") – nội dung khuôn`);
}
console.log(bad ? `✗ dict-enrich: ${bad} lỗi / ${total} mục` : `✓ dict-enrich: ${total} mục làm giàu đạt cổng`);
process.exit(bad ? 1 : 0);
