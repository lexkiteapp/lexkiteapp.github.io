// Test chéo khớp miệng web ↔ video (docs/LESSON-ENGINE.md §Khớp miệng §Một bộ máy): MỘT bảng viseme (web/js/call/visemes.json) và MỘT cách chọn hình.
// 1) khối @visemes trong lipsync.js khớp bảng · 2) âm vị → hình giống nhau ở JS (LipSync) và Python (scripts/lipsync/visemes.py)
// 3) cùng câu (mọi mốc trong web/js/call/cues.js) → cùng chuỗi hình mỗi khung 24 fps ở mặt vẽ web (LipFace.machine) và video (visemes.shape_at)
// 4) cues_cli --key xuất đúng mốc web cho video · 5) mốc video sẵn có (brand/library/cine/*/visemes) chỉ dùng hình trong bảng.
import fs from 'node:fs'; import os from 'node:os'; import { execFileSync } from 'node:child_process'; import { createRequire } from 'node:module'; import assert from 'node:assert/strict';
import { decode } from '../lipsync/cues_cli.mjs';
const req = createRequire(import.meta.url), LS = req('../../web/js/call/lipsync.js'), LF = req('../../web/js/call/face.js');
const VIS = JSON.parse(fs.readFileSync('web/js/call/visemes.json', 'utf8'));
execFileSync('node', ['scripts/lipsync/visemes-sync.mjs', '--check'], { stdio: 'pipe' });
assert.deepEqual(LS.SHAPES, VIS.shapes); assert.equal(LS.LEAD, VIS.timing.lead); assert.equal(LS.BLEND, VIS.timing.blend);
const py = (code, ...a) => execFileSync('python3', ['-I', '-c', `import sys; sys.path.insert(0, 'scripts/lipsync'); import visemes as V, json\n${code}`, ...a], { encoding: 'utf8' });
// 2) âm vị IPA (Kokoro) + ARPAbet → hình
const ipa = [...Object.keys(VIS.ipa), 'k', 's', 't', 'ð', 'ŋ', 'θ', 'ʤ', 'ʧ'], arp = [...Object.keys(VIS.arpabet), 'K', 'S', 'HH', 'NG'];
const jsI = ipa.map(p => LS.phoneSpans([{ p, s: 0, e: .1 }])[0].v).join(''), jsA = arp.map(p => LS.P2V[p] || VIS.fallback).join('');
assert.equal(py('print("".join(V.p2v(p) for p in json.loads(sys.argv[1])))', JSON.stringify(ipa)).trim(), jsI, 'IPA → hình lệch JS/Python');
assert.equal(py('print("".join(V.p2v(p, "arpa") for p in json.loads(sys.argv[1])))', JSON.stringify(arp)).trim(), jsA, 'ARPAbet → hình lệch JS/Python');
// 3) mọi câu có mốc: chuỗi hình 24 fps
const g = {}; new Function('self', fs.readFileSync('web/js/call/cues.js', 'utf8'))(g);
const K = Object.entries(g.LK_CUES.k).filter(([, v]) => v), FPS = 24, batch = {}, web = {};
assert.ok(K.length >= 100, 'quá ít câu có mốc: ' + K.length);
for (const [k, e] of K) {
  const cues = decode(e), dur = e[0] / 1000, M = LF.machine(/af_|bf_/.test(k) ? 'ama' : 'carlos', { cues, dur });
  web[k] = Array.from({ length: Math.round(dur * FPS) }, (_, i) => M.at(i / FPS).shape).join(''); batch[k] = { cues, dur };
}
const f = fs.mkdtempSync(os.tmpdir() + '/lsx-') + '/b.json'; fs.writeFileSync(f, JSON.stringify(batch));
const vid = JSON.parse(execFileSync('python3', ['-I', 'scripts/lipsync/visemes.py', 'batch', f, String(FPS)], { encoding: 'utf8', maxBuffer: 1 << 26 }));
let bad = 0; for (const k in web) if (web[k] !== vid[k]) { if (bad++ < 3) console.error('lệch', k, '\n web ', web[k], '\n video', vid[k]); }
assert.equal(bad, 0, `${bad}/${K.length} câu: chuỗi hình web ≠ video`);
// 4) video lấy nguyên mốc web
const [k0, e0] = K[0], cli = JSON.parse(execFileSync('node', ['scripts/lipsync/cues_cli.mjs', '--key', k0], { encoding: 'utf8' }));
assert.equal(cli.generator, 'lexkite-kokoro'); assert.deepEqual(cli.mouthCues.map(c => c.value), decode(e0).map(c => c.value));
// 5) mốc video sẵn có
let n = 0; for (const d of fs.existsSync('brand/library/cine') ? fs.readdirSync('brand/library/cine') : []) { const vd = `brand/library/cine/${d}/visemes`; if (!fs.existsSync(vd)) continue;
  for (const x of fs.readdirSync(vd).filter(x => x.endsWith('.json'))) { for (const c of JSON.parse(fs.readFileSync(`${vd}/${x}`, 'utf8')).mouthCues) assert.ok(VIS.shapes.includes(c.value), `${vd}/${x}: hình ${c.value}`); n++; } }
console.log(`lipsync-cross ok – ${K.length} câu cùng chuỗi hình web = video (24 fps), ${ipa.length + arp.length} âm vị, ${n} mốc video`);
