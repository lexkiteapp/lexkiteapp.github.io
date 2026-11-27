// Gói phát âm W3 theo ngôn ngữ đích (spanish-course.md §10 · french-course.md §10): dựng web/cpack/<tl>/px.js (chủ đề, từ, cặp tối thiểu, IPA) + px-<ngôn ngữ>.js (giải thích + nhãn giao diện 15 ngôn ngữ).
// MỘT engine, bảng TLX theo tl (không nhánh `if (tl)`): nguồn content/target/<tl>/pron.json + px/<ngôn ngữ>.json; IPA lấy từ bảng `ipa` của TLX – es sinh bằng es-g2p.mjs (không gõ tay),
// fr = bảng 'ipa' trong pron.json (soạn tay theo espeak-ng fr-fr, CI đối chiếu ở tl_ipa_fill.py --pron; thiếu từ nào = lỗi dựng). Dùng bởi drill-lib.build() → drill-pack.mjs (ghi/--check) và corpus âm thanh.
import { readJSON } from './lib.mjs';
import { ipaText } from './es-g2p.mjs';
import { ipa as jaIpa, accentKana } from './ja-kana.mjs';

const GX_LANGS = ['en', 'vi', 'es', 'pt', 'fr', 'de', 'id', 'th', 'zh', 'ja', 'ko', 'hi', 'ar', 'ru', 'tr'];
export const PX_UI = 'ti pk ex pp dc sy qp qd qs mic hd rt sk nm tp'.split(' '), PX_TOPICS = ['vow', 'rr', 'bv', 'seseo', 'stress', 'link', 'jg', 'hq'];
const strict = tl => src => x => { if (!src.ipa || !src.ipa[x]) throw new Error(`px ${tl}: thiếu IPA cho "${x}" (content/target/${tl}/pron.json → ipa)`); return src.ipa[x]; };
export const TLX = {
  es: { D: 'content/target/es/', G: 'ESX', topics: PX_TOPICS, ipa: () => ipaText },
  fr: { D: 'content/target/fr/', G: 'FRX', topics: ['nasal', 'uou', 'r', 'emuet', 'eai', 'eu', 'liaison', 'semi', 'h', 'gn', 'enchain', 'final'], ipa: strict('fr') },
  // ja (japanese-course.md §4 W3): read = {chữ: [kana, cao độ NHK]} → "kana có dấu hạ ꜜ · IPA" SINH bằng ja-kana.mjs (không gõ tay); gói ra web/packs (out), không vào cpack
  ja: { D: 'content/target/ja/', G: 'JAX', out: 'web/packs/tl/ja/', topics: ['vow', 'long', 'sokuon', 'nn', 'yoon', 'pitch', 'devoice', 'tsu'],
    ipa: src => x => { const r = src.read && src.read[x]; if (!r) throw new Error(`px ja: thiếu read cho "${x}" (content/target/ja/pron.json → read)`); return `${accentKana(r[0], r[1])} · ${jaIpa(r[0])}`; } },
};

export function buildPx(tl = 'es') {
  const T = TLX[tl], D = T.D, X = T.G, pron = readJSON(D + 'pron.json'), src = pron.topics, ip = T.ipa(pron), files = {}, w = x => [x, ip(x)];
  const topics = src.map(t => ({ i: t.id, v: t.level, e: t.ex.map(w), p: (t.pairs || []).map(p => { const [a, b] = p.split('/'); return [a, ip(a), b, ip(b)]; }), d: t.dict.map(w), s: t.say.map(w) }));
  files['px.js'] = `self.${X}=self.${X}||{};${X}.px=${JSON.stringify(topics)};\n`;
  for (const l of GX_LANGS) {
    const s = readJSON(`${D}px/${l}.json`), o = { ui: s.ui, tp: Object.fromEntries(src.map(t => [t.id, [s.tp[t.id].t, s.tp[t.id].x]])) };
    files[`px-${l}.js`] = `self.${X}=self.${X}||{};(${X}.pxl=${X}.pxl||{})[${JSON.stringify(l)}]=${JSON.stringify(o)};\n`;
  }
  return { files, topics, GX_LANGS };
}
// Mọi câu/từ cần giọng đọc (corpus âm thanh Kokoro, gen-audio --tl <tl>): chữ gốc không IPA
export const pxLines = (tl = 'es') => buildPx(tl).topics.flatMap(t => [...t.e, ...t.d, ...t.s].map(x => x[0]).concat(t.p.flatMap(p => [p[0], p[2]])));
