// Dùng chung cho gen-word-audio.mjs + merge.mjs: kho từ cần giọng, trạng thái s3 (web/audio/w/s3.tsv).
import fs from 'node:fs'; import { loadAllPlus } from '../lexicon/lib.mjs';
export const RES = 'web/audio/w/s3.tsv', IDX = 'web/audio/w/index.txt', VOICES = ['bf_emma', 'af_heart'];
// mục mở rộng (x: 1): khi WORD_AUDIO_EXPAND=1 (word-audio.yml – mp3 vào kho media, không vào repo chính)
export const corpus = async () => [...new Set((await loadAllPlus()).filter(e => !e.x || process.env.WORD_AUDIO_EXPAND === '1').map(e => e.row[0].trim()).filter(w => /^[A-Za-z][A-Za-z' -]*$/.test(w) && w.split(/\s+/).length <= 3))];
export const readRes = (f = RES) => new Map((fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : '').split('\n').filter(Boolean).map(l => { const [w, ...s] = l.split('\t'); return [w, s]; }));
export const writeRes = (m, f = RES) => fs.writeFileSync(f, [...m].map(([w, s]) => [w, ...s].join('\t')).join('\n') + '\n');
