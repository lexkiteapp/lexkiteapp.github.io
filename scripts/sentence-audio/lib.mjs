// Dùng chung cho cổng ASR audio câu (sentence-audio-asr.yml, docs/WORD-AUDIO.md mục "Audio câu"):
//  - web/js/listen/audio-index.js: LISTEN_AUDIO (khóa có file) + LISTEN_AUDIO_S2 (khóa đã render lại s2 → app tải <khóa>-s2.mp3, web/js/ui.js audioUrl)
//  - web/audio/l/asr.tsv: "khóa \t ok | s2 | fail" (khóa đã có kết quả CUỐI) · asr-fail.tsv: câu trượt (giữ bản cũ) kèm lý do · asr-stats.json: cộng dồn
import fs from 'node:fs';
export const IDX = 'web/js/listen/audio-index.js', LEDGER = 'web/audio/l/asr.tsv', FAIL = 'web/audio/l/asr-fail.tsv', STATS = 'web/audio/l/asr-stats.json';
export const S2 = '-s2'; // hậu tố khóa mới (CDN đệm 1 năm – không ghi đè khóa cũ). Đổi cách tạo lần nữa → hậu tố mới, không dùng lại.
import { encode, DEC } from './keyset.mjs';
// Đọc bằng cách CHẠY tệp (dạng nén keyset.mjs; vẫn đọc được dạng chuỗi cũ) – không regex
export function readIndex(f = IDX) { const g = {}; if (fs.existsSync(f)) new Function('self', fs.readFileSync(f, 'utf8'))(g); return { have: new Set(g.LISTEN_AUDIO || []), s2: new Set(g.LISTEN_AUDIO_S2 || []) }; }
export function writeIndex(have, s2, f = IDX) {
  const j = x => { const e = encode(x); return `D(${JSON.stringify(e.s)},${e.k},${e.n})`; };
  fs.writeFileSync(f, `/* Danh sách câu thoại đã có file âm thanh Kokoro (tự sinh bởi scripts/gen-audio.mjs; LISTEN_AUDIO_S2 = đã render lại qua cổng ASR, scripts/sentence-audio/merge.mjs). Dạng nén Rice – scripts/sentence-audio/keyset.mjs */\n(function (g) { var D = ${DEC}; g.LISTEN_AUDIO = ${j(have)}; g.LISTEN_AUDIO_S2 = ${j(s2)}; })(typeof self !== 'undefined' ? self : this);\n`);
}
export const readLedger = (f = LEDGER) => new Map((fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : '').split('\n').filter(Boolean).map(l => l.split('\t')));
// ≤ 3 chữ (từ vựng đọc đơn): tạo lại bằng các phương án từ đơn (scripts/word-audio/kokoro.mjs METHODS); dài hơn: câu, đổi tốc độ
export const isShort = t => /^[A-Za-z][A-Za-z' -]*$/.test(t) && t.trim().split(/\s+/).length <= 3;
