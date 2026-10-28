// Puppet host of a Stitch short → input of the puppet lip-sync gate (scripts/puppet/gate.mjs), docs/VIDEO-MOTION.md §host.
// Same timeline the Remotion <Teacher/> builds (== hostTimeline in scripts/video/remotion/src/Puppet.jsx: Rhubarb cues, KIND → expr/gest), 30 fps,
// audio = the plate's mix (the word clock). Usage: node scripts/video/motion/lip_props.mjs <stitch props.json> <out dir>   (expects <out dir>/voice.wav)
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const Pup = createRequire(import.meta.url)(path.join(ROOT, 'web/js/lesson/puppet.js'));
const [src, out] = process.argv.slice(2), P = JSON.parse(fs.readFileSync(src, 'utf8')), h = P.host;
if (!h || h.kind !== 'puppet') throw new Error('props have no puppet host');
const expr = (h.expr || []).slice(), gest = [];
for (const g of h.gestures || []) {
  const k = Pup.KIND[g.g], name = k ? k.gest : g.g;
  if (k && k.expr) expr.push([g.t, k.expr]);
  if (name) gest.push([g.t, name === 'point' && h.pointTo !== 'right' ? 'pointL' : name]);
}
const tl = { cues: h.cues.slice().sort((a, b) => a[0] - b[0]), expr: expr.sort((a, b) => a[0] - b[0]), gest: gest.sort((a, b) => a[0] - b[0]), seed: h.seed || 11, lead: 0.03 };
const words = h.lines.flatMap(l => l.words.map(w => ({ w: w.w, start: w.s, end: w.e })));
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'props.json'), JSON.stringify({ fps: 30, durationInFrames: Math.round(P.total * 30), tl, words, audio: 'voice.wav' }));
console.log(`lip props: ${tl.cues.length} cues, ${tl.gest.length} gestures, ${words.length} words → ${out}/props.json`);
