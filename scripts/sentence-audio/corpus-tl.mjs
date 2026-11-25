// Câu của ngôn ngữ đích (tl: es, fr) có giọng dựng sẵn (khóa audio/l theo giọng + chữ, cùng KVoice.lineKey như tiếng Anh): câu đọc to của bài luyện W2b (drill-lib.sayText),
// từ + ví dụ + lời cuộc gọi của lộ trình ngày W4 (path-lib), từ/cụm bài phát âm W3 (px-lib), câu đề W5 (exam-es-lib) – MỘT giọng nhất quán cho Ama.
// MỘT engine, bảng theo tl: giọng lấy từ CHÍNH bảng Target (web/js/target.js, chạy trong vm) → khóa khớp từng byte với những gì app tra (UI.tts → Target.kokoroVoice);
// vai không có giọng riêng (fr: không giọng nam đạt – french-course.md §7) đọc bằng giọng Ama. Công cụ dựng (Kokoro hay Piper) ở render-tl.mjs, theo scripts/word-audio/tl-voices.json.
// Tách khỏi corpus.mjs: gen-audio.mjs --tl <tl> dùng; lượt tiếng Anh/độ phủ KHÔNG đổi.
import fs from 'node:fs'; import vm from 'node:vm';
import { build, sayText, TLP } from '../target/drill-lib.mjs';
import { pxLines } from '../target/px-lib.mjs';
import { pathLines } from '../target/path-lib.mjs';
import { examLines } from '../target/exam-es-lib.mjs';
export const TL_AUDIO = ['es', 'fr']; // ngôn ngữ đích có corpus âm thanh (thêm tl = thêm vào đây + giọng ở Target + tl-voices.json)
const ctx = () => { const c = { self: {} }; c.self = c; vm.createContext(c); for (const f of ['web/js/listen/kvoice.js', 'web/js/target.js']) vm.runInContext(fs.readFileSync(f, 'utf8'), c); return c; };
/** Giọng của tl theo Target: { ama, carlos?, voice (Ama) } */
export const tlVoices = (tl, c = ctx()) => { const v = c.Target.table(tl).voices || {}; return { ...v, voice: v.ama }; };
export function collectTl(tl = 'es') {
  if (!TL_AUDIO.includes(tl)) throw new Error(`corpus âm thanh: chưa có ngôn ngữ ${tl}`);
  const c = ctx(), V = tlVoices(tl, c), T = TLP[tl], jobs = new Map(), add = (text, voice) => { text = String(text).trim(); if (text) jobs.set(c.KVoice.lineKey(voice, text), { voice, text }); };
  for (const it of Object.values(build(tl).dr).flat()) add(sayText(it), V.voice);
  for (const [text, who] of pathLines({ tl, D: T.D, G: T.G })) add(text, V[who] || V.voice); // từ + ví dụ + lời cuộc gọi (path-lib.pathLines); vai không có giọng → Ama
  for (const text of pxLines(tl)) add(text, V.voice); // từ/cụm của bài phát âm W3 (px-lib.pxLines)
  for (const text of examLines(tl)) add(text, V.voice); // câu nghe + câu điền từ của đề W5 (exam-es-lib.examLines)
  return { jobs, parts: [] };
}
