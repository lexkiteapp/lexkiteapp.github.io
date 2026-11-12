#!/usr/bin/env node
// Tầng ICON (tầng 1, tốt nhất cho danh từ thường gặp): Noto Emoji (Apache-2.0, © Google) – ánh xạ NGHĨA → emoji qua chú giải CLDR tiếng Anh (tên tts).
//   node scripts/vocab-img/icons.mjs --cldr <annotations.json> [--write]   → content/lexicon/vimg-icons.json { "từ#loại": { cp, e, name } }
// Luật khớp (bảo thủ – ảnh vẫn phải qua cùng cổng giám khảo gọi tên):
//   danh từ: tên tts (≤ 3 từ) KẾT THÚC bằng một đồng nghĩa của thẻ (vd "red apple" → apple, "fire extinguisher"); ưu tiên tên ngắn nhất
//   động từ: tên tts dạng "person|man|woman <động từ-ing> …" (vd "person swimming")
//   tính từ màu/hình: KHÔNG dùng icon (ô vuông màu không phải vật chuẩn)
// Không lấy cờ, ký hiệu, tổ hợp tông da (annotationsDerived không dùng).
import fs from 'fs';
import { stem } from './strict.mjs';

const ROOT = new URL('../../', import.meta.url), rd = p => JSON.parse(fs.readFileSync(new URL(p, ROOT), 'utf8'));
const toks = s => String(s).toLowerCase().replace(/[^a-z\s-]/g, ' ').split(/[\s-]+/).filter(Boolean);
const cpOf = e => [...e].map(c => c.codePointAt(0)).filter(c => c !== 0xfe0f).map(c => c.toString(16)).join('_');   // tên file Noto: emoji_u<cp>.png (bỏ VS16)

/** cldr = annotations (emoji → {default, tts}); cards = vimg-cards items; lex = kho từ → map */
export function mapIcons(cldr, cards, lex) {
  const out = {};
  const pict = e => [...e].some(ch => ch.codePointAt(0) >= 0x1f000 || (ch.codePointAt(0) >= 0x2600 && ch.codePointAt(0) < 0x2800) || ch.codePointAt(0) === 0x2708);   // chỉ ký tự hình (bỏ ₥ ký hiệu tiền…)
  const ents = Object.entries(cldr).filter(([e, a]) => a.tts && a.tts[0] && pict(e) && !/^flag\b|keycap|button|sign$|symbol|^regional/.test(a.tts[0]));
  for (const [k, c] of Object.entries(cards)) {
    if (!c || c.skip || !lex[k]) continue;
    const pos = lex[k].pos; if (pos === 'adj') continue;
    let best = null;
    for (const [e, a] of ents) {
      const t = toks(a.tts[0]), ts = t.map(stem); if (t.length > 3) continue;
      let ok = false;
      // danh từ: CHỈ đồng nghĩa chính (s[0]) – đồng nghĩa phụ ('chain', 'vest', 'mill') kéo emoji sai nghĩa
      if (pos === 'n') ok = [c.s[0]].some(s => { const q = toks(s).map(stem); return q.length <= ts.length && q.join(' ') === ts.slice(ts.length - q.length).join(' '); });
      else if (pos === 'v') ok = /^(person|man|woman)$/.test(t[0]) && t.length >= 2 && c.s.some(s => { const q = toks(s); return q.length === 1 && stem(t[1]) === stem(q[0]) && t[1].endsWith('ing'); });
      const n = t.length - (t[0] === 'person' ? 0.5 : 0);   // ưu tiên 'person …' trung tính giới
      if (ok && (!best || n < best.n || (n === best.n && a.tts[0].length < best.name.length))) best = { e, cp: cpOf(e), name: a.tts[0], n };
    }
    if (best) out[k] = { cp: best.cp, e: best.e, name: best.name };
  }
  return out;
}
if (process.argv[1] && process.argv[1].endsWith('icons.mjs')) {
  const i = process.argv.indexOf('--cldr'), j = JSON.parse(fs.readFileSync(process.argv[i + 1], 'utf8'));
  const cldr = (j.annotations && j.annotations.annotations) || j;
  const m = mapIcons(cldr, rd('content/lexicon/vimg-cards.json').items, rd('dist/lexicon.json'));
  const doc = { _note: 'Sinh bởi scripts/vocab-img/icons.mjs từ CLDR annotations en (cldr-annotations-full@46.0.0) – KHÔNG sửa tay. Ảnh: Noto Emoji png/512 (Apache-2.0, © Google), qua cùng cổng giám khảo như ảnh AI.', v: 1, cldr: '46.0.0', noto: 'v2.047', items: m };
  if (process.argv.includes('--write')) fs.writeFileSync(new URL('content/lexicon/vimg-icons.json', ROOT), JSON.stringify(doc, null, 1) + '\n');
  for (const [k, v] of Object.entries(m)) console.log(k.padEnd(16), v.e, v.name, v.cp);
  console.log(Object.keys(m).length, 'icon');
}
