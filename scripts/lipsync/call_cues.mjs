// Mốc khớp miệng cho câu giáo viên trong Call (docs/specs/call-lipsync.md §Đưa vào hệ thống; CI audio.yml): Kokoro python sinh tiếng VÀ mốc âm vị CÙNG một lần
// (scripts/lipsync/kokoro_ts.py) → <khoá>-ls.mp3 (kho media, bản riêng – mp3 cũ đệm immutable 1 năm nên không ghi đè) + mốc đã align/smooth/lead như lab.mjs.
// Mỗi câu phải qua cổng mặt vẽ như lab (drawn_frames.mjs): lệch tiếng–miệng ≤ 45 ms · đúng hình theo âm vị ≥ 80 % · 0 nháy. Câu trượt → không ghi mốc (app tự chạy live), báo trong bảng.
// Ra: .media-out/audio/l/<khoá>-ls.mp3 + web/js/call/cues.js (LK_CUES: mốc nén + độ lớn tiếng 100 Hz 8 bit + từ điển nhỏ cho live) – chỉ commit sau khi đẩy mp3 thành công.
// Dùng: node scripts/lipsync/call_cues.mjs --count   (in "cần tạo N")  ·  --index-only (chỉ ghi chỉ mục)  ·  node scripts/lipsync/call_cues.mjs   (cần python kokoro==0.9.4 + espeak-ng, ffmpeg)
import fs from 'node:fs'; import os from 'node:os'; import vm from 'node:vm'; import { execFileSync } from 'node:child_process'; import { createRequire } from 'node:module';
const req = createRequire(import.meta.url), LS = req('../../web/js/call/lipsync.js'), LF = req('../../web/js/call/face.js');
const OUT = process.env.AUDIO_OUT || '.media-out/audio/l', IDX = 'web/js/call/cues.js', QA = fs.mkdtempSync(os.tmpdir() + '/callcues-');
const sh = (c, a) => execFileSync(c, a, { stdio: ['ignore', 'pipe', 'pipe'] }).toString();
const c = { self: {} }; c.self = c; vm.createContext(c);
for (const f of ['web/js/listen/kvoice.js', 'web/js/call/calls.js', 'web/js/call/calls-exam.js']) vm.runInContext(fs.readFileSync(f, 'utf8'), c);
const V = JSON.parse(fs.readFileSync('web/teach/characters.json', 'utf8')).people;
// cùng danh sách câu với scripts/gen-audio.mjs (§Cuộc gọi) – khoá = KVoice.lineKey(giọng, câu) như teacher.js phát
const lines = new Map();
for (const k of c.CALLS || []) {
  const who = V[k.who] ? k.who : 'ama', voice = V[who].voice.app, nodes = k.nodes ? Object.values(k.nodes) : (k.turns || []);
  for (const x of [...nodes.flatMap(n => [n.m, n.re, ...(n.br || []).map(b => b[1])]), k.end, "Let's keep our chat friendly and on topic!"]) if (x) { const text = String(x).trim(); lines.set(c.KVoice.lineKey(voice, text), { who, voice, text }); }
}
const old = (() => { try { const g = {}; new Function('self', fs.readFileSync(IDX, 'utf8'))(g); return g.LK_CUES.k; } catch (e) { return {}; } })();
const todo = process.argv.includes('--index-only') ? [] : [...lines].filter(([k]) => !old[k]); // --index-only: chỉ ghi lại chỉ mục (từ điển + mốc đã có), không sinh tiếng
console.log(`${lines.size} câu Call · có mốc ${Object.keys(old).length} · cần tạo ${todo.length}`);
if (process.argv.includes('--count')) process.exit(0);

// từ điển nhỏ cho chế độ live (không có mốc): chỉ các từ trong kịch bản Call (spec §4 – giữ nhẹ)
const want = new Set([...lines.values()].flatMap(l => l.text.toLowerCase().match(/[a-z']+/g) || []));
const dict = fs.readFileSync('content/lexicon/cmudict-subset.txt', 'utf8').split('\n').filter(l => want.has(l.split(' ')[0])).join('\n');

const rms100 = f => { const b = fs.readFileSync(f); let o = 12; while (b.toString('ascii', o, o + 4) !== 'data') o += 8 + b.readUInt32LE(o + 4);
  const n = b.readUInt32LE(o + 4) / 2, s = o + 8, hop = 240, R = []; for (let i = 0; i + hop <= n; i += hop) { let e = 0; for (let j = 0; j < hop; j++) { const x = b.readInt16LE(s + 2 * (i + j)) / 32768; e += x * x; } R.push(Math.sqrt(e / hop)); } return R; };
const xlag = (a, b) => { const m = v => { const u = v.reduce((x, y) => x + y, 0) / v.length; return v.map(x => x - u); }; a = m(a); b = m(b); let best = -1e9, L = 0;
  for (let l = -30; l <= 30; l++) { let s = 0; for (let i = 0; i < a.length; i++) { const j = i - l; if (j >= 0 && j < b.length) s += a[i] * b[j]; } if (s > best) { best = s; L = l; } } return L * 10; };
// điểm 1 câu – cùng cách đo với drawn_frames.mjs (khung 100 Hz của chính LipFace.machine phát thật)
function score(l, cues, env, ph) {
  const M = LF.machine(l.who, { cues, env, dur: env.length / 100, text: l.text }), peak = Math.max(...env), S = env.map((_, k) => M.at(k / 100)), sp = LS.phoneSpans(ph);
  const truth = t => { const x = sp.find(q => q.s <= t && t < q.e && q.v !== ' '); return x ? x.v : null; };
  let ok = 0, tot = 0; for (let k = 0; k < env.length; k++) { if (env[k] < peak * .1) continue; const w = new Set(); for (let d = -4; d <= 4; d++) { const v = truth((k + d) / 100); if (v) w.add(v); } if (!w.size) continue; tot++; if (w.has(S[k].shape)) ok++; }
  let flick = 0, run = 1; for (let k = 1; k < S.length; k++) { if (S[k].shape === S[k - 1].shape) { run++; continue; } if (k - run > 0 && run < Math.round(LS.MIN_HOLD * 100) - 1) flick++; run = 1; }
  return { lagMs: xlag(S.map(s => s.mouth.u + s.mouth.d), env), visemePct: tot ? Math.round(100 * ok / tot) : 100, flicker: flick };
}
// nén: mốc "X0 B120 C250 …" (ms, kết thúc = mốc sau / độ dài) · độ lớn tiếng 8 bit theo đỉnh, base64
const pack = (cues, env) => { const pk = Math.max(...env, 1e-6); return [Math.round(cues[cues.length - 1].end * 1000), cues.map(q => q.value + Math.round(q.start * 1000)).join(' '), Buffer.from(env.map(x => Math.round(255 * Math.min(1, x / pk)))).toString('base64')]; };

const K = { ...old }, rows = [];
if (todo.length) {
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(`${QA}/in.json`, JSON.stringify(todo.map(([key, l]) => ({ id: key, text: l.text.replace(/["“”]/g, ''), voice: l.voice }))));
  execFileSync('python3', ['scripts/lipsync/kokoro_ts.py', `${QA}/in.json`, QA], { stdio: ['ignore', 'ignore', 'inherit'] });
  for (const [key, l] of todo) {
    const raw = `${QA}/${key}.raw.wav`, mp3 = `${OUT}/${key}-ls.mp3`, back = `${QA}/${key}.wav`;
    if (!fs.existsSync(raw)) { rows.push({ key, text: l.text, err: 'không sinh được tiếng' }); continue; }
    // giống lab: chuẩn độ lớn → mp3; độ lớn tiếng đo trên CHÍNH mp3 giải mã lại (đúng thứ trình duyệt phát)
    sh('ffmpeg', ['-y', '-v', 'error', '-i', raw, '-af', 'loudnorm=I=-16:TP=-1.5', '-ar', '24000', '-ac', '1', '-c:a', 'libmp3lame', '-b:a', '64k', mp3]);
    sh('ffmpeg', ['-y', '-v', 'error', '-i', mp3, '-ar', '24000', '-ac', '1', '-c:a', 'pcm_s16le', back]);
    const env = rms100(back), dur = env.length / 100, kp = JSON.parse(fs.readFileSync(`${QA}/${key}.ph.json`, 'utf8'));
    const cues = LS.lead(LS.smooth(LS.align(LS.fromPhones(kp.ph, dur), env, { words: kp.words }))), s = score(l, cues, env, kp.ph), pass = Math.abs(s.lagMs) <= 45 && s.visemePct >= 80 && s.flicker === 0;
    rows.push({ key, text: l.text, ...s, pass });
    if (pass) K[key] = pack(cues, env); else fs.rmSync(mp3); // trượt cổng → không đẩy mp3, không ghi mốc → app dùng live
  }
}
const keys = Object.keys(K).filter(k => lines.has(k)).sort(), body = Object.fromEntries(keys.map(k => [k, K[k]]));
fs.writeFileSync(IDX, `/* Mốc khớp miệng câu giáo viên Call (tự sinh: scripts/lipsync/call_cues.mjs, CI audio.yml) – nạp lười sau cờ lk.lipsync (web/js/lesson/teacher.js).\n * k[khoá] = [độ dài ms, "Hình+ms …", độ lớn tiếng 100 Hz 8 bit base64] cho <khoá>-ls.mp3 · dict = từ điển nhỏ cho live. */\n`
  + `(function (g) { g.LK_CUES = ${JSON.stringify({ v: 1, k: body, dict })}; })(typeof self !== 'undefined' ? self : this);\n`);
const bad = rows.filter(r => !r.pass), md = [`## Mốc khớp miệng Call – ${keys.length}/${lines.size} câu có mốc · lượt này ${rows.length} câu, trượt cổng ${bad.length}`, '',
  rows.length ? `lệch max ${Math.max(0, ...rows.filter(r => r.lagMs != null).map(r => Math.abs(r.lagMs)))} ms · đúng hình min ${Math.min(100, ...rows.filter(r => r.visemePct != null).map(r => r.visemePct))} % · nháy ${rows.reduce((a, r) => a + (r.flicker || 0), 0)}` : '',
  ...(bad.length ? ['', '| khoá | câu | lệch ms | đúng hình % | nháy |', '|---|---|---|---|---|', ...bad.map(r => `| ${r.key} | ${r.text.slice(0, 60)} | ${r.lagMs ?? r.err} | ${r.visemePct ?? ''} | ${r.flicker ?? ''} |`)] : [])].join('\n');
console.log(md); if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, md + '\n');
fs.rmSync(QA, { recursive: true, force: true });
