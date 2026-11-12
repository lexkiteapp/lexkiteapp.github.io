// Mốc khớp miệng cho VIDEO bằng ĐÚNG đường ống của web (scripts/lipsync/call_cues.mjs): âm vị Kokoro (kokoro_ts.py *.ph.json) + tiếng → align/smooth/lead
// → JSON kiểu Rhubarb {metadata, mouthCues, generator:'lexkite-kokoro'} mà scripts/video/tpl/render_*.py và scripts/cine/lipsync.py đọc sẵn.
// Câu đã có mốc web (web/js/call/cues.js) → dùng NGUYÊN mốc đó (--key <khóa>), không tính lại → web và video không bao giờ lệch.
// node scripts/lipsync/cues_cli.mjs --key <khóa> > cues.json   |   node scripts/lipsync/cues_cli.mjs --ph <x.ph.json> --wav <x.wav> > cues.json
import { isMain } from '../lib/is-main.mjs';
import fs from 'node:fs'; import { createRequire } from 'node:module';
const req = createRequire(import.meta.url), LS = req('../../web/js/call/lipsync.js');
const arg = k => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
export function decode(e) { return LS.unpack([e[0], e[1]]).cues; } // cùng hàm giải với web (LipSync.unpack)
export function rms100(f) { const b = fs.readFileSync(f); let o = 12; while (b.toString('ascii', o, o + 4) !== 'data') o += 8 + b.readUInt32LE(o + 4);
  const sr = b.readUInt32LE(24), n = b.readUInt32LE(o + 4) / 2, s = o + 8, hop = Math.round(sr / 100), R = []; for (let i = 0; i + hop <= n; i += hop) { let e = 0; for (let j = 0; j < hop; j++) { const x = b.readInt16LE(s + 2 * (i + j)) / 32768; e += x * x; } R.push(Math.sqrt(e / hop)); } return R; }
export function fromKokoro(kp, env) { return LS.lead(LS.smooth(LS.align(LS.fromPhones(kp.ph, env.length / 100), env, { words: kp.words }))); }
if (isMain(import.meta.url)) {
  let cues;
  if (arg('--key')) { const g = {}; new Function('self', fs.readFileSync('web/js/call/cues.js', 'utf8'))(g); const e = g.LK_CUES.k[arg('--key')]; if (!e) { console.error('không có mốc web cho khóa', arg('--key')); process.exit(2); } cues = decode(e); }
  else cues = fromKokoro(JSON.parse(fs.readFileSync(arg('--ph'), 'utf8')), rms100(arg('--wav')));
  const r = c => Math.round(c * 1000) / 1000;
  process.stdout.write(JSON.stringify({ metadata: { duration: r(cues[cues.length - 1].end) }, generator: 'lexkite-kokoro', mouthCues: cues.map(c => ({ start: r(c.start), end: r(c.end), value: c.value })) }) + '\n');
}
