// Gói phát âm tiếng Tây Ban Nha W3 (spanish-course.md §10): dựng web/cpack/es/px.js (chủ đề, từ, cặp tối thiểu, IPA) + px-<ngôn ngữ>.js (giải thích + nhãn giao diện 15 ngôn ngữ).
// Nguồn: content/target/es/pron.json + px/<ngôn ngữ>.json. IPA sinh bằng es-g2p.mjs (không gõ tay). Dùng bởi drill-lib.build() → drill-pack.mjs (ghi/--check) và corpus âm thanh.
import { readJSON } from './lib.mjs';
import { ipaText } from './es-g2p.mjs';

const D = 'content/target/es/', GX_LANGS = ['en', 'vi', 'es', 'pt', 'fr', 'de', 'id', 'th', 'zh', 'ja', 'ko', 'hi', 'ar', 'ru', 'tr'];
export const PX_UI = 'ti pk ex pp dc sy qp qd qs mic hd rt sk nm tp'.split(' '), PX_TOPICS = ['vow', 'rr', 'bv', 'seseo', 'stress', 'link', 'jg', 'hq'];
const w = x => [x, ipaText(x)];

export function buildPx() {
  const src = readJSON(D + 'pron.json').topics, files = {};
  const topics = src.map(t => ({ i: t.id, v: t.level, e: t.ex.map(w), p: (t.pairs || []).map(p => { const [a, b] = p.split('/'); return [a, ipaText(a), b, ipaText(b)]; }), d: t.dict.map(w), s: t.say.map(w) }));
  files['px.js'] = `self.ESX=self.ESX||{};ESX.px=${JSON.stringify(topics)};\n`;
  for (const l of GX_LANGS) {
    const s = readJSON(`${D}px/${l}.json`), o = { ui: s.ui, tp: Object.fromEntries(src.map(t => [t.id, [s.tp[t.id].t, s.tp[t.id].x]])) };
    files[`px-${l}.js`] = `self.ESX=self.ESX||{};(ESX.pxl=ESX.pxl||{})[${JSON.stringify(l)}]=${JSON.stringify(o)};\n`;
  }
  return { files, topics, GX_LANGS };
}
// Mọi câu/từ cần giọng đọc (corpus âm thanh Kokoro, gen-audio --tl es): chữ gốc không IPA
export const pxLines = () => buildPx().topics.flatMap(t => [...t.e, ...t.d, ...t.s].map(x => x[0]).concat(t.p.flatMap(p => [p[0], p[2]])));
