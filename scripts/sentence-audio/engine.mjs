// Công cụ dựng giọng của một tl: 'piper' khi giọng DÙNG THẬT (require) của bảng tl-voices.json là nhãn Piper của chính dòng đó (fr: piper_siwis), còn lại 'kokoro' (es).
// Một nguồn cho render-tl.mjs và audio.yml (bước plan in ra: node scripts/sentence-audio/engine.mjs <tl>).
import fs from 'node:fs'; import { fileURLToPath } from 'node:url';
export const VOICES = () => JSON.parse(fs.readFileSync(new URL('../word-audio/tl-voices.json', import.meta.url), 'utf8'));
export const engineOf = (tl, V = VOICES()) => { const r = V[tl]; if (!r) throw new Error(`tl-voices.json: không có dòng ${tl}`); return r.piper && (r.require || []).includes(r.piper.label) ? 'piper' : 'kokoro'; };
if (process.argv[1] === fileURLToPath(import.meta.url)) console.log(engineOf(process.argv[2] || 'es'));
