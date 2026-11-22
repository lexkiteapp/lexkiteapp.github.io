// Lộ trình ngày ngôn ngữ đích W4 (spanish-course.md §10 · french-course.md §10; MỘT engine, bảng TLP của drill-lib truyền T = { tl, D, G }): dựng web/cpack/<tl>/{cl,dy,dy-<ngôn ngữ>}.js + web/packs/<tl>/{wd,wd-<ngôn ngữ>}.json từ NGUỒN
//   content/target/<tl>/{seed.json, core-*.json (status reviewed), calls/*.json, drills.json+grammar-inventory (qua drill-lib), pron.json (nếu tl có), path-ui.json}.
// Mỗi ngày = ~4 từ mới (theo rank) + 1 điểm ngữ pháp (drill-lib pts) + 1 chủ đề phát âm + cứ 5 ngày 1 cuộc gọi. Số ngày = số điểm ngữ pháp A1–B1 (mỗi điểm đúng 1 ngày).
// Dùng bởi drill-lib.build() → drill-pack.mjs (ghi/--check, mồ côi) và corpus âm thanh.
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { readJSON, coreFiles } from './lib.mjs';

const ES = { tl: 'es', D: 'content/target/es/', G: 'ESX' }, LANGS = ['en', 'vi', 'es', 'pt', 'fr', 'de', 'id', 'th', 'zh', 'ja', 'ko', 'hi', 'ar', 'ru', 'tr'];
export const DAY_UI = 'ti sub dy w g p c go pr mk fin td sv'.split(' '), CALL_EVERY = 5, WORDS_MAX = 8; // ≤ 8 từ mới/ngày (kho 3.000 không dồn 24 từ/ngày); phần còn lại học qua Ôn tập

/** Từ học theo thứ tự: seed (A1 nền) trước, rồi lô lõi đã duyệt theo rank. Lô chưa duyệt không vào lộ trình. */
export function pathWords(T = ES) {
  const seed = readJSON(T.D + 'seed.json').words.map(w => ({ ...w, rank: -1 }));
  const core = coreFiles(T.tl).flatMap(f => { const d = readJSON(f); return d.status === 'reviewed' ? d.words : []; }).sort((a, b) => a.rank - b.rank || a.word.localeCompare(b.word));
  return [...seed, ...core];
}

/** Kế hoạch một ngày – hàm thuần, MỘT nguồn: build dùng trực tiếp, trình duyệt nhận đúng mã này qua dy.js (Function.toString) → không lệch.
 *  D = { g: [điểm ngữ pháp theo ngày], l: [[cấp, số điểm]], t: [[chủ đề, 1 nếu có cặp tối thiểu]], n: số từ, c: [id cuộc gọi dễ→khó] }; trả [từ đầu, từ cuối, điểm, cấp, chủ đề, chế độ, id cuộc gọi?] */
export function planDay(i, D) {
  const G = D.g.length, tp = D.t[i % D.t.length], ci = Math.floor(i / 5); let k = i, lv = '';
  for (const [l, c] of D.l) if (!lv) { if (k < c) lv = l; else k -= c; }
  const per = Math.min(D.k || 1e9, D.n / G); // D.k = trần từ mới/ngày (WORDS_MAX)
  const r = [Math.round(i * per), Math.round((i + 1) * per), D.g[i], lv, tp[0], i % 3 === 0 && tp[1] ? 'pp' : i % 2 ? 'sy' : 'dc'];
  if (i % 5 === 4 && ci < D.c.length) r.push(D.c[ci]);
  return r;
}

/** Hàng từ trong wd.js: [từ, loại, IPA, ví dụ, giống?, số nhiều bất quy tắc?, 'a' nếu h aspiré (fr)?] – giống để hiện mạo từ (danh từ học kèm mạo từ), số nhiều chỉ khi ≠ từ+s ('' khi chỉ cần cờ h). */
export const wdRow = (w, tl = 'es') => { const r = [w.word, w.pos, w.ipa, w.ex[tl]]; if (w.pos === 'n' && w.gender) { r.push(w.gender); const irr = w.plural && w.plural !== w.word + 's', asp = w.h === 'aspire'; if (irr || asp) r.push(irr ? w.plural : ''); if (asp) r.push('a'); } return r; };

export function buildPath(pts, px, T = ES) {
  const D = T.D, X = T.G, words = pathWords(T), calls = fs.readdirSync(D + 'calls').filter(f => /^calls-\d+\.json$/.test(f)).sort().flatMap(f => readJSON(D + 'calls/' + f)), files = {}, ui = readJSON(D + 'path-ui.json');
  const lvRank = { A1: 0, A2: 1, B1: 2, B2: 3, C1: 4 }, order = [...calls].sort((a, b) => lvRank[a.lv] - lvRank[b.lv]); // cuộc gọi dễ → khó theo ngày
  const lvs = [...new Set(pts.map(p => p.level))], plan = { g: pts.map(p => p.id), l: lvs.map(l => [l, pts.filter(p => p.level === l).length]), t: (px && px.length ? px : [{ i: '', p: [] }]).map(t => [t.i, t.p.length ? 1 : 0]), n: words.length, k: WORDS_MAX, c: order.map(c => c.id) };
  const days = pts.map((p, i) => planDay(i, plan));
  // Từ của lộ trình (lớn dần tới 3.000 lemma/ngôn ngữ) = JSON ở web/packs/<tl>/ (khóa '@packs/'), tải như App.loadPack: cùng tên miền trên web,
  // https://lexkite.com ở add-on/app gốc – không nằm trong web/cpack (không nâng trần cpackTotal mỗi lô). <G>.wdv = băm nội dung (dy.js tên băm) → bỏ cache khi đổi.
  files['@packs/wd.json'] = JSON.stringify(words.map(w => wdRow(w, T.tl))) + '\n';
  for (const l of LANGS) {
    files[`@packs/wd-${l}.json`] = JSON.stringify(words.map(w => w.gl[l] || w.gl.en)) + '\n';
    files[`dy-${l}.js`] = `self.${X}=self.${X}||{};(${X}.dyl=${X}.dyl||{})[${JSON.stringify(l)}]=${JSON.stringify(DAY_UI.map(k => ui[l][k]))};\n`;
  }
  // gói nhỏ gọn: bỏ kind/tr (không dùng ở màn gọi); tl gắn lúc nạp (call.js lọc theo tl)
  const wdv = createHash('sha1').update(Object.keys(files).filter(f => f.startsWith('@packs/')).sort().map(f => files[f]).join('')).digest('hex').slice(0, 10);
  files['dy.js'] = `self.${X}=self.${X}||{};${X}.dy=${JSON.stringify(plan)};${X}.dyp=${planDay.toString()};${X}.wdv=${JSON.stringify(wdv)};\n`;
  files['cl.js'] = `self.CALLS=(self.CALLS||[]).concat(${JSON.stringify(calls.map(({ kind, tr, ...c }) => ({ ...c, tl: T.tl })))});\n`;
  return { files, days, words, calls, plan };
}

// Mọi câu/từ cần giọng đọc → [chữ, vai]: từ + ví dụ = ama (ef_dora), lời cuộc gọi theo vai c.who (Ama ef_dora / Carlos em_alex) – corpus Kokoro (gen-audio --tl es)
export function pathLines(T = ES) {
  const { words, calls } = buildPath(readJSON(T.D + 'grammar-inventory.json').points.filter(p => ['A1', 'A2', 'B1'].includes(p.level)), [{ i: 'x', p: [] }], T);
  const cl = calls.flatMap(c => Object.values(c.nodes).flatMap(n => [n.m, n.re, ...n.o, ...(n.br || []).map(b => b[1])]).concat(c.end || []).filter(Boolean).map(x => [x, c.who]));
  return [...words.flatMap(w => [w.word, w.ex[T.tl]].map(x => [x, 'ama'])), ...cl].filter(([x]) => x);
}
