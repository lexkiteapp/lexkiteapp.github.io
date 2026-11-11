// Câu tiếng Tây Ban Nha có giọng Kokoro (khóa audio/l theo giọng + chữ, cùng KVoice.lineKey như tiếng Anh): chỉ câu đọc to của bài luyện W2b (drill-lib.sayText),
// MỘT giọng nhất quán ef_dora (Ama) = Target.kokoroVoice('es-419'). Tách khỏi corpus.mjs: gen-audio.mjs --tl es dùng; lượt tiếng Anh/độ phủ KHÔNG đổi.
import fs from 'node:fs'; import vm from 'node:vm';
import { build, sayText } from '../target/drill-lib.mjs';
import { pxLines } from '../target/px-lib.mjs';
import { pathLines } from '../target/path-lib.mjs';
import { examLines } from '../target/exam-es-lib.mjs';
export const ES_VOICE = 'ef_dora', ES_VOICES = { ama: 'ef_dora', carlos: 'em_alex' }; // = Target.TABLE.es.voices
export function collectEs() {
  const c = { self: {} }; c.self = c; vm.createContext(c); vm.runInContext(fs.readFileSync('web/js/listen/kvoice.js', 'utf8'), c);
  const jobs = new Map(), { dr } = build();
  for (const it of Object.values(dr).flat()) { const text = sayText(it).trim(); if (text) jobs.set(c.KVoice.lineKey(ES_VOICE, text), { voice: ES_VOICE, text }); }
  for (const [text, who] of pathLines()) jobs.set(c.KVoice.lineKey(ES_VOICES[who], text), { voice: ES_VOICES[who], text }); // từ + ví dụ + lời cuộc gọi của lộ trình ngày W4 (path-lib.pathLines)
  for (const text of pxLines()) jobs.set(c.KVoice.lineKey(ES_VOICE, text), { voice: ES_VOICE, text }); // từ/cụm của bài phát âm W3 (px-lib.pxLines)
  for (const text of examLines()) jobs.set(c.KVoice.lineKey(ES_VOICE, text), { voice: ES_VOICE, text }); // câu nghe + câu điền từ của đề DELE/SIELE W5 (exam-es-lib.examLines)
  return { jobs, parts: [] };
}
