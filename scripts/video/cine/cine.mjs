#!/usr/bin/env node
// Dây chuyền video ĐIỆN ẢNH (chế độ cine) A→Z – docs/VIDEO-PIPELINE.md §13.
//   plan → refs → frames (khung đầu từ ảnh tham chiếu + cổng tỉ lệ/trang phục/AI thị giác, sinh lại ≤ N lần) → motion (2.5 Turbo + cổng trôi trang phục)
//   → voice (TTS giọng cố định + cổng ≥ 2 s) → lipsync (chọn mặt rõ, tắt tiếng gốc) → endcard (dựng riêng) → assemble → qa (cổng 1–7 + LUFS) → report (Studio ciResult)
// Dùng: node scripts/video/cine/cine.mjs --script <kịch bản cine | sample khuôn> [--driver kling|local-cache] [--fixture content/video/cine/fixtures/latte.json]
//        [--out out/cine/<id>] [--budget 250] [--max-tries 3] [--dry-run] [--no-vision] [--job <studio job id>] [--preset medium]
// Mọi bước ghi manifest.json (đầu vào, đầu ra, điểm, credit). Mọi tài sản sinh ra cache theo băm nội dung (prompt + ảnh tham chiếu + tham số + lượt)
// ở CINE_CACHE (mặc định out/cine/_cache) → chạy lại = tiếp tục, chỉ sinh lại phần trượt cổng. Vượt trần --budget → dừng (manifest ghi budget-exceeded).
// env: KLING_API_KEY | KLING_ACCESS_KEY + KLING_SECRET_KEY (driver kling) · CLOUDFLARE_API_TOKEN / GEMINI_KEYS (AI thị giác) · STUDIO_CALLBACK_SECRET (+ STUDIO_API)
//      LEXKITE_PY (Python có numpy+pillow+mediapipe) · LEXKITE_MP_MODELS · CINE_CACHE · CINE_VISION=off
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import { spawnSync, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { plan as makePlan, estimate, subTiming } from './planner.mjs';
import * as G from './gates.mjs';
import { sha256, probe, silences, rmsDb, lufs, ffmpeg, frameAt } from './media.mjs';
import { klingDriver, scrub, NeedsOwner } from './providers/kling.mjs';
import { localCacheDriver } from './providers/local-cache.mjs';
import { visionReview } from './vision.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(HERE, '../../..');
const rel = f => (f ? path.relative(ROOT, path.resolve(f)) : f);
const J = f => JSON.parse(fs.readFileSync(path.resolve(ROOT, f), 'utf8'));
const r2 = x => Math.round(x * 100) / 100;
const now = () => new Date().toISOString();
class BudgetExceeded extends Error { constructor(m) { super(m); this.budget = true; } }

function args(a) {
  const o = { _: [] };
  for (let i = 0; i < a.length; i++) { if (a[i].startsWith('--')) { const k = a[i].slice(2); o[k] = a[i + 1] && !a[i + 1].startsWith('--') ? a[++i] : true; } else o._.push(a[i]); }
  return o;
}
function python() {
  for (const p of [process.env.LEXKITE_PY, path.join(ROOT, '.tools/pyenv/bin/python'), 'python3'].filter(Boolean)) if (spawnSync(p, ['-c', 'import numpy, PIL'], { stdio: 'ignore' }).status === 0) return p;
  throw new Error('thiếu Python có numpy + pillow (+ mediapipe): python3 -m venv .tools/pyenv && .tools/pyenv/bin/pip install numpy pillow mediapipe');
}
function py(script, a) {
  const r = spawnSync(python(), [path.join(HERE, script), ...a], { encoding: 'utf8', maxBuffer: 256 << 20, cwd: ROOT });
  const line = (r.stdout || '').trim().split('\n').filter(l => l.startsWith('{')).pop();
  if (r.status !== 0 || !line) throw new Error(`${script} ${a[0]} lỗi: ${(r.stderr || '').trim().split('\n').slice(-3).join(' | ').slice(0, 400)}`);
  return JSON.parse(line);
}

export async function run(o) {
  const log = (...m) => console.log(...m);
  const summary = s => { log(s); if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, s + '\n'); };
  // ---------- bối cảnh ----------
  const scriptPath = o.script; if (!scriptPath) throw new Error('--script <file> là bắt buộc');
  const input = J(scriptPath), isCine = Array.isArray(input.shots);
  const ctx = { cast: J('content/video/cine/cast.json'), scenes: J('content/video/cine/scenes.json'), casting: J('content/video/casting.json'), sample: isCine ? J(input.source) : null };
  const pricing = J('content/video/cine/pricing.json');
  const P = makePlan(input, ctx);
  const OUT = path.resolve(ROOT, o.out || path.join('out/cine', P.id || 'cine')), CACHE = path.resolve(ROOT, process.env.CINE_CACHE || 'out/cine/_cache');
  fs.mkdirSync(OUT, { recursive: true });
  const MF = path.join(OUT, 'manifest.json');
  const prev = fs.existsSync(MF) ? JSON.parse(fs.readFileSync(MF, 'utf8')) : null;
  const driverName = o.driver || 'kling', budget = +(o.budget || 250), maxTries = Math.max(1, +(o['max-tries'] || 3));
  const M = { version: 1, id: P.id, createdAt: (prev && prev.createdAt) || now(), updatedAt: now(), runs: ((prev && prev.runs) || 0) + 1,
    input: { script: rel(scriptPath), sha256: sha256(path.resolve(ROOT, scriptPath)), source: isCine ? input.source : null, bibles: { cast: sha256(path.join(ROOT, 'content/video/cine/cast.json')), scenes: sha256(path.join(ROOT, 'content/video/cine/scenes.json')) } },
    driver: driverName, budget: { credits: budget }, ledger: { credits: 0, usd: 0, videoCredits: 0, videoUsd: 0, cachedCalls: 0, entries: [] }, steps: {}, assets: {}, frames: {}, shots: {}, gates: [], notes: [] };
  const save = () => { M.updatedAt = now(); fs.writeFileSync(MF, JSON.stringify(M, null, 1)); };
  const note = s => { M.notes.push(s); log('  ℹ ' + s); };
  const asset = (k, f, extra = {}) => { const a = { file: rel(f), sha256: sha256(f), ...extra }; M.assets[k] = a; return a; };
  async function step(name, fn) {
    const st = M.steps[name] = { status: 'running', startedAt: now() }; save(); log(`\n▶ ${name}`);
    try { st.outputs = await fn(); st.status = 'done'; } catch (e) { st.status = e.budget ? 'budget-exceeded' : e.needsOwner ? 'needs-owner' : 'failed'; st.error = scrub(e.message); save(); throw e; }
    st.endedAt = now(); save();
  }

  // ---------- 0 · plan ----------
  await step('plan', async () => {
    fs.writeFileSync(path.join(OUT, 'plan.json'), JSON.stringify(P, null, 1));
    const est = estimate(P, pricing); M.estimate = est;
    log(`  ${P.shots.length} shot · ${Object.keys(P.frames).length} khung đầu · ước ${est.credits} credit (${est.withRetries.credits} kể dự phòng sinh lại) ≈ ${est.usd} USD API`);
    P.warnings.forEach(w => log('  ⚠ ' + w)); P.errors.forEach(e => log('  ✗ ' + e));
    if (P.errors.length) throw new Error('kịch bản trượt planner: ' + P.errors.join(' · '));
    return { plan: rel(path.join(OUT, 'plan.json')), estimate: est, warnings: P.warnings };
  });
  if (o['dry-run']) {
    const e = M.estimate;
    summary(`### Cine dry-run · ${P.id}\n- ${P.shots.length} shot, ${e.frames} khung đầu (${e.images} ảnh), ${e.lipsync} Lip Sync\n- Ước: **${e.credits} credit** (${e.withRetries.credits} kể dự phòng ${Math.round((pricing.retryReserve || 0) * 100)} %) ≈ ${e.usd} USD (${e.withRetries.usd} USD) · trần: ${budget} credit${e.withRetries.credits > budget ? ' → **VƯỢT TRẦN**' : ''}`);
    M.steps.dryRun = { status: 'done', at: now() }; save(); return { ok: true, dryRun: true, manifest: MF };
  }

  // ---------- driver + cache + ngân sách ----------
  const D = driverName === 'local-cache' ? localCacheDriver({ fixture: path.resolve(ROOT, o.fixture || 'content/video/cine/fixtures/latte.json'), root: ROOT }) : klingDriver({ log });
  const simulated = !D.paid, dcache = path.join(CACHE, driverName);
  const costOf = (op, n) => ({ credits: n * ((pricing[op] || {}).credits || 0), usd: r2(n * ((pricing[op] || {}).usd || 0)) });
  /** Gọi nhà cung cấp có cache theo băm nội dung + kiểm trần ngân sách. keyObj: mọi thứ quyết định kết quả (prompt, sha ảnh tham chiếu, tham số, lượt). */
  async function cached(op, keyObj, units, fn) {
    const key = crypto.createHash('sha256').update(JSON.stringify({ op, ...keyObj })).digest('hex').slice(0, 24), dir = path.join(dcache, op, key), meta = path.join(dir, 'meta.json');
    if (fs.existsSync(meta)) { const m = JSON.parse(fs.readFileSync(meta, 'utf8')); const files = [].concat(m.file || [], m.files || []).filter(Boolean); if (files.every(f => fs.existsSync(path.resolve(ROOT, f)))) { M.ledger.cachedCalls++; M.ledger.videoCredits += m.credits || 0; M.ledger.videoUsd = r2(M.ledger.videoUsd + (m.usd || 0)); M.ledger.entries.push({ op, key, cached: true, credits: 0, assetCredits: m.credits || 0 }); return { ...m, key, cached: true }; } }
    const c = costOf(op, units);
    // trần áp cho TỔNG chi phí tài sản của video (kể phần đã sinh ở lần chạy trước, lấy từ cache) – chạy lại không lách được trần
    if (M.ledger.videoCredits + c.credits > budget) throw new BudgetExceeded(`trần ngân sách ${budget} credit: video đã dùng ${M.ledger.videoCredits}, ${op} cần ${c.credits} – tăng --budget rồi chạy lại (cache giữ phần đã làm)`);
    fs.mkdirSync(dir, { recursive: true });
    const res = await fn(dir);
    const relRes = JSON.parse(JSON.stringify(res, (k, v) => (typeof v === 'string' && v.startsWith(ROOT) ? rel(v) : v)));
    fs.writeFileSync(meta, JSON.stringify({ ...relRes, op, credits: c.credits, usd: c.usd, ...(simulated ? { simulated: true } : {}), at: now() }, null, 1));
    M.ledger.credits += c.credits; M.ledger.usd = r2(M.ledger.usd + c.usd); M.ledger.videoCredits += c.credits; M.ledger.videoUsd = r2(M.ledger.videoUsd + c.usd); M.ledger.entries.push({ op, key, credits: c.credits, usd: c.usd, ...(simulated ? { simulated: true } : {}) }); save();
    return { ...relRes, key, cached: false };
  }
  const abs = f => path.resolve(ROOT, f);
  const MEAS = path.join(CACHE, 'measure'); fs.mkdirSync(MEAS, { recursive: true });
  /** measure.py có cache theo sha file + lệnh + phiên bản measure.py (đổi cách đo → đo lại). */
  const MVER = sha256(path.join(HERE, 'measure.py')).slice(0, 12);
  function measure(cmd, f, extra = []) {
    const k = crypto.createHash('sha256').update(MVER + cmd + sha256(f) + extra.map(x => (fs.existsSync(String(x)) ? sha256(x) : x)).join(',')).digest('hex').slice(0, 24), p = path.join(MEAS, `${cmd}-${k}.json`);
    if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf8'));
    const r = py('measure.py', [cmd, f, ...extra]); fs.writeFileSync(p, JSON.stringify(r)); return r;
  }
  const VCACHE = path.join(CACHE, 'vision.json'), useVision = !o['no-vision'];
  const sceneB = ctx.scenes.scenes[P.scene];
  const castFor = slots => slots.map(s => ({ name: ctx.cast.characters[s.who].name, look: ctx.cast.characters[s.who].look }));
  async function vision(img, slots, times) {
    if (!useVision) return { status: 'SKIP', reasons: ['--no-vision'], perFrame: [] };
    const jpg = path.join(OUT, 'tmp', path.basename(img).replace(/\.\w+$/, '') + '-v.jpg'); fs.mkdirSync(path.dirname(jpg), { recursive: true });
    ffmpeg(['-i', img, '-vf', 'scale=768:768:force_original_aspect_ratio=decrease', '-q:v', '3', jpg]);
    return visionReview(jpg, { scene: sceneB.look, cast: castFor(slots), n: times ? times.length : 1, times }, { cacheFile: VCACHE });
  }

  // ---------- 1 · refs ----------
  const refs = {};
  await step('refs', async () => {
    const who = [...new Set(P.shots.flatMap(s => s.slots.map(x => x.who)))];
    for (const w of who) { const f = abs(ctx.cast.characters[w].ref); refs[w] = measure('ref', f); asset(`ref:${w}`, f); }
    asset('ref:room', abs(sceneB.room));
    return Object.fromEntries(who.map(w => [w, { heads: refs[w].heads, sleeve: refs[w].sleeve, mp: refs[w].mp }]));
  });

  // ---------- 2 · frames ----------
  const frameGates = (meas, fp) => [G.proportionGate(meas, fp, ctx.cast, sceneB), G.identityGate(meas, fp, refs, ctx.cast)];
  const scoreOf = gs => gs.reduce((a, g) => a + (g.status === 'PASS' ? 0 : g.status === 'WARN' ? 1 : g.status === 'SKIP' ? 2 : 10), 0) + ((gs.find(g => g.k === 'identity') || {}).data ? Object.values(gs.find(g => g.k === 'identity').data).reduce((a, v) => a + (v.palette || 0) / 100, 0) : 0);
  await step('frames', async () => {
    const order = Object.values(P.frames).sort((a, b) => (a.refFrom ? 1 : 0) - (b.refFrom ? 1 : 0));
    for (const fp of order) {
      const F = M.frames[fp.id] = { attempts: [], chosen: null, status: 'pending' };
      const refFiles = fp.refs.map(r => (r.kind === 'frame' ? abs(M.frames[r.frame].chosen.file) : abs(r.path)));
      for (let t = 0; t < maxTries && !F.chosen; t++) {
        let res;
        try {
          res = await cached('image', { prompt: fp.prompt, refs: refFiles.map(sha256), n: fp.n, aspect: fp.aspect, resolution: fp.resolution, attempt: t, ...(simulated ? { frameId: fp.id } : {}) }, fp.n,
            dir => D.image({ prompt: fp.prompt, refs: refFiles, aspect: fp.aspect, resolution: fp.resolution, n: fp.n, frameId: fp.id, attempt: t, externalId: `${P.id}-${fp.id}-${t}`.replace(/[^\w-]/g, '-').slice(0, 60), outDir: dir }));
        } catch (e) { if (e.cacheMiss) { note(`${fp.id}: ${e.message}`); break; } throw e; }
        const cands = res.files.map((f, i) => {
          const meas = measure('frame', abs(f)), gs = frameGates(meas, fp);
          return { file: f, source: (res.sources || [])[i] || null, gates: gs, score: r2(scoreOf(gs)) };
        }).sort((a, b) => a.score - b.score);
        for (const c of cands) {
          if (G.worst(c.gates) === 'FAIL') continue;
          const v = await vision(abs(c.file), fp.slots); c.gates.push(G.visionGate(v)); c.score = r2(scoreOf(c.gates));
          if (G.worst(c.gates) !== 'FAIL') { F.chosen = c; break; }
        }
        F.attempts.push({ attempt: t, key: res.key, cached: res.cached, candidates: cands.map(c => ({ file: c.file, source: c.source, score: c.score, gates: c.gates.map(g => ({ k: g.k, status: g.status, note: g.note })) })) });
        log(`  ${fp.id} lượt ${t + 1}: ${cands.map(c => `${c.source || path.basename(c.file)}=${G.worst(c.gates)}(${c.score})`).join(' ')}${F.chosen ? ` → chọn ${F.chosen.source || F.chosen.file}` : ''}`);
        if (!F.chosen && t + 1 < maxTries) log(`  ${fp.id}: không ảnh nào qua cổng → sinh lại`);
      }
      if (!F.chosen) { // hết lượt: giữ ảnh tốt nhất để còn ra bản xem, cổng ghi FAIL (video bị chặn đăng)
        const all = F.attempts.flatMap(a => a.candidates).sort((a, b) => a.score - b.score);
        if (!all.length) throw new Error(`${fp.id}: không sinh được ảnh nào`);
        const b = all[0]; F.chosen = { file: b.file, source: b.source, gates: b.gates, score: b.score, forced: true }; F.status = 'failed';
        note(`${fp.id}: ${maxTries} lượt không ảnh nào qua cổng – dùng ảnh tốt nhất ${b.source || b.file} (CHẶN ĐĂNG)`);
      } else F.status = 'ok';
      asset(`frame:${fp.id}`, abs(F.chosen.file), { source: F.chosen.source });
      save();
    }
    return Object.fromEntries(Object.entries(M.frames).map(([k, v]) => [k, { status: v.status, chosen: v.chosen.source || v.chosen.file, attempts: v.attempts.length }]));
  });

  // ---------- 3 · motion (image→video) + cổng trôi trang phục trong clip ----------
  const TIMES = [0.5, 2.5, 4.5];
  await step('motion', async () => {
    for (const s of P.shots) {
      const fp = P.frames[s.frame], S = M.shots[s.id] = { frame: s.frame, frameFile: M.frames[s.frame].chosen.file, frameSource: M.frames[s.frame].chosen.source };
      const go = (img, src) => cached('video', { image: sha256(abs(img)), prompt: s.motion.prompt, duration: s.motion.duration, ...(simulated ? { shotId: s.id } : {}) }, Math.ceil(s.motion.duration / 5),
        dir => D.video({ image: abs(img), prompt: s.motion.prompt, duration: s.motion.duration, shotId: s.id, imageSource: src, externalId: `${P.id}-${s.id}`.slice(0, 60), outDir: dir }));
      let v;
      try { v = await go(S.frameFile, S.frameSource); } catch (e) {
        if (!(e.cacheMiss && e.preferFrame)) throw e;
        const alt = M.frames[s.frame].attempts.flatMap(a => a.candidates).find(c => c.source === e.preferFrame);
        note(`${s.id}: local-cache chỉ có video sinh từ ${e.preferFrame} (cổng chọn ${S.frameSource}) → dùng ${e.preferFrame}; cổng khung của ảnh này: ${alt ? alt.gates.map(g => `${g.k} ${g.status}`).join(', ') : '?'}`);
        S.frameFile = alt.file; S.frameSource = alt.source; S.frameGates = alt.gates; v = await go(alt.file, alt.source);
      }
      S.video = v.file; S.videoId = v.videoId; S.raw = v.raw || null;
      const pr = probe(abs(v.file)); S.videoDur = pr.duration; S.videoHasAudio = pr.audio;
      asset(`video:${s.id}`, abs(v.file));
      const vm2 = measure('video', abs(v.file), ['--times', TIMES.join(',')]); S.samples = vm2.frames.map(f => ({ t: f.t, faces: f.faces, persons: (f.persons || []).length, w: f.w, h: f.h }));
      S.gates = [];
      const idg = vm2.frames.map(f => G.identityGate(f, fp, refs, ctx.cast));
      S.gates.push({ ...idg.find(g => g.status === 'FAIL') || idg.find(g => g.status !== 'PASS') || idg[0], k: 'identity-video', note: 'clip: ' + idg.map((g, i) => `${TIMES[i]}s ${g.status}`).join(', ') + ' – ' + (idg.find(g => g.status !== 'PASS') || idg[0]).note });
      // AI thị giác trên bảng 3 khung → luật cắt (lỗi chỉ ở cuối → cắt shot trước khung lỗi)
      const sheet = path.join(OUT, 'tmp', `${s.id}-sheet.jpg`); fs.mkdirSync(path.dirname(sheet), { recursive: true });
      ffmpeg(['-i', abs(v.file), '-vf', `select='${TIMES.map(t => `between(t\\,${t}\\,${t + 0.04})`).join('+')}',scale=-2:640,tile=${TIMES.length}x1`, '-frames:v', '1', '-vsync', 'vfr', sheet]);
      const vis = useVision ? await visionReview(sheet, { scene: sceneB.look, cast: castFor(fp.slots), n: TIMES.length, times: TIMES }, { cacheFile: VCACHE }) : { status: 'SKIP', reasons: ['--no-vision'] };
      const vg = G.visionGate(vis, TIMES); S.gates.push({ ...vg, k: 'vision-video' }); if (vg.data && vg.data.trimTo) S.trimTo = vg.data.trimTo;
      log(`  ${s.id} ${path.basename(v.file)} ${v.cached ? '(cache)' : ''} · ${S.gates.map(g => `${g.k} ${g.status}`).join(' · ')}`);
      save();
    }
    return Object.fromEntries(P.shots.map(s => [s.id, { video: M.shots[s.id].video, gates: M.shots[s.id].gates.map(g => g.status) }]));
  });

  // ---------- 4 · voice (TTS) + cổng ≥ 2 s ----------
  await step('voice', async () => {
    for (const s of P.shots.filter(x => x.lipsync.needed)) {
      const S = M.shots[s.id];
      const t = await cached('tts', { text: s.text, voice: s.voice, emotion: s.emotion, ...(simulated ? { shotId: s.id } : {}) }, 1, dir => D.tts({ text: s.text, voice: s.voice, emotion: s.emotion, shotId: s.id, outDir: dir }));
      S.tts = t.file; S.audioId = t.audioId; asset(`tts:${s.id}`, abs(t.file));
      const d = probe(abs(t.file)).duration; S.speech = G.speechBounds(silences(abs(t.file)), d);
      S.emotionApplied = D.name === 'kling' ? false : 'pilot (web UI)';
      const g = G.lipsyncGate(s, S.speech, null, ctx.cast); S.voiceGate = g;
      log(`  ${s.id} "${s.text.slice(0, 40)}" giọng ${s.voice.name}/${s.emotion}: ${S.speech.start}–${S.speech.end}s (${S.speech.dur}s, ${S.speech.pauses.length} khoảng ngắt) · ${g.status}`);
      if (g.status === 'FAIL') note(`${s.id}: ${g.note}`);
      save();
    }
    return Object.fromEntries(P.shots.filter(x => x.lipsync.needed).map(s => [s.id, M.shots[s.id].speech]));
  });

  // ---------- 5 · lipsync ----------
  await step('lipsync', async () => {
    for (const s of P.shots.filter(x => x.lipsync.needed)) {
      const S = M.shots[s.id];
      if (S.voiceGate.status === 'FAIL') { S.lipGate = { ...S.voiceGate }; note(`${s.id}: bỏ Lip Sync (giọng trượt cổng) – shot giữ tiếng im`); continue; }
      const fc = await cached('faces', { video: S.videoId || sha256(abs(S.video)), ...(simulated ? { shotId: s.id } : {}) }, 1, dir => D.faces({ videoId: S.videoId, videoFile: abs(S.video), shotId: s.id, outDir: dir }));
      let face = fc.faces[0], chosenBy = fc.faces.length === 1 ? 'only-face' : null, margin = null;
      if (fc.faces.length > 1) { // chọn mặt rõ ràng: so hist đầu từng face_image với ref người nói vs người nghe
        const other = s.slots.find(x => x.who !== s.speaker);
        const scored = fc.faces.map(f => { const m = f.image ? measure('facematch', abs(f.image), ['--refs', [ctx.cast.characters[s.speaker].ref, other && ctx.cast.characters[other.who].ref].filter(Boolean).map(abs).join(',')]) : null; const sim = m ? Object.values(m.sim) : [0, 0]; return { f, d: (sim[0] || 0) - (sim[1] || 0), sim }; }).sort((a, b) => b.d - a.d);
        face = scored[0].f; margin = r2(scored[0].d - (scored[1] ? scored[1].d : 0)); chosenBy = 'ref-match';
        S.faceChoice = scored.map(x => ({ faceId: x.f.faceId, simSpeaker: x.sim[0], simOther: x.sim[1] }));
        log(`  ${s.id}: ${fc.faces.length} mặt → chọn mặt ${face.faceId} (khớp ${s.speaker}, chênh ${margin})`);
      }
      const req = { faceId: face.faceId, faces: fc.faces.length, faceChosenBy: chosenBy, faceMargin: margin, originalAudioVolume: s.lipsync.originalAudioVolume, soundEndMs: Math.round(probe(abs(S.tts)).duration * 1000), insertMs: 0 };
      S.lipReq = req;
      const pre = G.lipsyncGate(s, S.speech, req, ctx.cast);
      if (pre.status === 'FAIL') { S.lipGate = pre; note(`${s.id}: ${pre.note}`); continue; }
      const l = await cached('lipsync', { video: S.videoId || sha256(abs(S.video)), audio: S.audioId || sha256(abs(S.tts)), face: face.faceId, ov: 0, ...(simulated ? { shotId: s.id } : {}) }, Math.max(1, Math.ceil((S.videoDur - 0.1) / 5)) /* Kling 2.5 Turbo trả 5,06 s = 1 đơn vị 5 s */,
        dir => D.lipsync({ sessionId: fc.sessionId, faceId: face.faceId, audioId: S.audioId, soundEndMs: req.soundEndMs, insertMs: req.insertMs, shotId: s.id, outDir: dir }));
      S.lipsynced = l.file; asset(`lipsync:${s.id}`, abs(l.file));
      // kiểm lại trên file Lip Sync: ranh giới giọng (khoảng ngắt giữa câu không cắt câu)
      const ld = probe(abs(l.file)); S.lipDur = ld.duration; S.speechOut = G.speechBounds(silences(abs(l.file)), ld.duration);
      S.lipGate = G.lipsyncGate(s, S.speechOut, req, ctx.cast);
      log(`  ${s.id} lip sync ${path.basename(l.file)} ${l.cached ? '(cache)' : ''}: giọng ${S.speechOut.start}–${S.speechOut.end}s · ${S.lipGate.status}`);
      save();
    }
    return Object.fromEntries(P.shots.filter(x => x.lipsync.needed).map(s => [s.id, (M.shots[s.id].lipGate || {}).status]));
  });

  // ---------- 6 · endcard (dựng riêng) ----------
  const spec = { W: 1080, H: 1920, fps: 30, workdir: path.join(OUT, 'overlays'), fonts: { body: path.join(ROOT, 'brand/social/src/fonts/BeVietnamPro-ExtraBold.ttf'), head: path.join(ROOT, 'brand/social/src/fonts/BricolageGrotesque-ExtraBold.ttf') }, preset: o.preset || 'medium' };
  await step('endcard', async () => {
    const kitSvg = path.join(OUT, 'tmp', 'kit-happy.svg'), kitPng = path.join(OUT, 'tmp', 'kit-happy.png'); fs.mkdirSync(path.dirname(kitSvg), { recursive: true });
    const kctx = { self: {} }; vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'web/js/kit.js'), 'utf8'), kctx); // Kit chỉ từ web/js/kit.js (luật brand)
    fs.writeFileSync(kitSvg, kctx.self.Kit.svg('happy', 512, false).replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" '));
    let kit = null;
    for (const [bin, a] of [['rsvg-convert', ['-w', '520', '-o', kitPng, kitSvg]], ['magick', ['-background', 'none', '-density', '300', kitSvg, '-resize', '520x', kitPng]]]) { try { execFileSync(bin, a, { stdio: 'ignore' }); if (fs.existsSync(kitPng)) { kit = kitPng; break; } } catch { /* thử công cụ kế */ } }
    if (!kit) note('không chuyển được SVG Kit sang PNG (cần rsvg-convert hoặc ImageMagick) – màn kết không có Kit');
    const ec = path.join(OUT, 'endcard.png');
    const sp = path.join(OUT, 'tmp', 'endcard-spec.json'); fs.writeFileSync(sp, JSON.stringify({ ...spec, endcard: { kit, cta: P.endcard.cta, out: ec } }));
    py('assemble.py', ['endcard', sp]);
    M.endcard = { ...asset('endcard', ec), madeBy: 'endcard', kit: !!kit };
    return { endcard: rel(ec), kit: !!kit };
  });

  // ---------- 7 · assemble ----------
  let segs = [], events = [];
  await step('assemble', async () => {
    let t = 0;
    const scale = (b, w, h) => [b[0] * 1080 / w, b[1] * 1920 / h, b[2] * 1080 / w, b[3] * 1920 / h].map(Math.round);
    for (const s of P.shots) {
      const S = M.shots[s.id], voiced = !!S.lipsynced, file = voiced ? S.lipsynced : S.video, d = voiced ? S.lipDur : S.videoDur, sp2 = voiced ? S.speechOut : null;
      let L;
      if (!voiced) L = Math.min(d, s.maxSec || d);
      else {
        L = Math.min(d, Math.max(sp2.end + 0.2, Math.min(sp2.end + 0.45, s.maxSec || 99)));
        if (s.overlays.some(x => x.kind === 'card' && x.sym === '✗')) L = Math.min(d, sp2.end + 1.4); // thẻ ✗ đọc được ≥ 1,2 s sau câu
      }
      if (S.trimTo && S.trimTo < L) { note(`${s.id}: cắt shot ${r2(L)} → ${S.trimTo}s (luật cắt – AI thị giác thấy lỗi cuối clip)`); L = S.trimTo; }
      const fz = (ctx.scenes.scenes[P.scene].blocking[s.blocking] || {}).faceZone;
      let faces = (S.samples || []).flatMap(f => (f.faces || []).map(b => scale(b.box, f.w, f.h)));
      const measured = faces.length > 0; if (!measured && fz) faces = [[fz[0] * 1080, fz[1] * 1920, fz[2] * 1080, fz[3] * 1920].map(Math.round)];
      const seg = { id: s.id, kind: 'shot', file: abs(file), in: 0, dur: r2(L), voiced, t0: r2(t), t1: r2(t + L), faces, facesMeasured: measured, sha256: sha256(abs(file)), speech: sp2 ? { start: r2(t + sp2.start), end: r2(t + Math.min(sp2.end, L)) } : null };
      segs.push(seg);
      // phụ đề: chia thời lượng giọng theo số ký tự từng trang, kẹp TRONG shot
      if (voiced && s.pages.length) {
        const subs = subTiming(s.pages, sp2, t, L).map(e => ({ style: 'Sub', ...e, shot: s.id, faces }));
        events.push(...subs);
        for (const ov of s.overlays.filter(x2 => x2.kind === 'card')) {
          const c0 = ov.when === 'after-line' ? t + sp2.end - 0.2 : subs[subs.length - 1].t0;
          events.push({ style: 'Card', sym: ov.sym, text: ov.text, t0: r2(Math.max(c0, seg.speech.start)), t1: r2(t + L - 0.05), shot: s.id, payoff: { shot: ov.payoff }, faces });
        }
      }
      for (const ov of s.overlays.filter(x2 => x2.kind === 'hook')) events.push({ style: 'Hook', text: ov.text, t0: r2(t), t1: r2(t + L - 0.05), shot: s.id, faces });
      t += L;
    }
    const ecDur = P.endcard.duration;
    segs.push({ id: 'end', kind: 'endcard', file: abs(M.endcard.file), image: true, dur: ecDur, voiced: false, t0: r2(t), t1: r2(t + ecDur), faces: [], sha256: M.endcard.sha256 });
    if (P.endcard.tip) events.push({ style: 'Tip', text: P.endcard.tip, t0: r2(t + 0.25), t1: r2(t + ecDur - 0.05), shot: 'end', faces: [] });
    // tiếng nền: tiếng Kling tự sinh trong clip gốc (2.5 Turbo API không có tiếng → không có thì bỏ + ghi chú)
    const amb = sceneB.ambience || {}, ambFiles = amb.source === 'shots' ? P.shots.map(s => M.shots[s.id]).filter(S => S.videoHasAudio).map(S => abs(S.video)) : [];
    const pick = ambFiles.length > 2 ? [ambFiles[0], ambFiles[ambFiles.length - 1]] : ambFiles;
    if (!pick.length) note('không có tiếng nền (clip không có tiếng gốc) – thêm file tiếng nền vào scenes.json ambience');
    const sp = { ...spec, out: path.join(OUT, 'video.mp4'), segments: segs, events, ambience: { ...amb, files: pick }, loudnorm: { I: -16, TP: -1.5, LRA: 9 } };
    const spf = path.join(OUT, 'assemble-spec.json'); fs.writeFileSync(spf, JSON.stringify(sp, null, 1));
    const res = py('assemble.py', ['render', spf]);
    events = res.events.map(e => ({ ...e, png: rel(e.png) }));
    fs.writeFileSync(path.join(OUT, 'events.json'), JSON.stringify(events, null, 1));
    asset('video', path.join(OUT, 'video.mp4'));
    M.ambience = pick.map(rel);
    return { video: rel(res.out), duration: res.duration, segments: segs.map(s => ({ id: s.id, t0: s.t0, t1: s.t1, file: rel(s.file) })), events: events.length };
  });

  // ---------- 8 · qa ----------
  await step('qa', async () => {
    const V = path.join(OUT, 'video.mp4'), gates = [];
    const pick = (k, list) => { const fail = list.find(g => g.status === 'FAIL'), skip = list.find(g => g.status === 'SKIP'), warn = list.find(g => g.status === 'WARN'); const w = fail || skip || warn || list[0]; return { k, status: G.worst(list), note: list.map(g => g.note).filter((x, i, a) => a.indexOf(x) === i).slice(0, 4).join(' | '), detail: list.map(g => ({ status: g.status, note: g.note })), ...(w && w.data ? { data: w.data } : {}) }; };
    // khung đầu thực sự được dùng (local-cache có thể đổi sang ảnh pilot)
    const used = [...new Map(P.shots.map(s => [M.shots[s.id].frameFile, { s, F: M.shots[s.id] }])).values()];
    const fg = used.map(({ s, F }) => { const gs = F.frameGates || M.frames[s.frame].chosen.gates; return gs.map(g => ({ ...g, note: `${s.frame} (${F.frameSource || path.basename(F.frameFile)}): ${g.note}` })); }).flat();
    gates.push(pick('proportion', fg.filter(g => g.k === 'proportion')));
    gates.push(pick('identity', [...fg.filter(g => g.k === 'identity'), ...P.shots.map(s => ({ ...M.shots[s.id].gates.find(g => g.k === 'identity-video'), note: `${s.id}: ${M.shots[s.id].gates.find(g => g.k === 'identity-video').note}` }))]));
    const vis = [...fg.filter(g => g.k === 'vision'), ...P.shots.map(s => { const g = M.shots[s.id].gates.find(x => x.k === 'vision-video'); return { ...g, note: `${s.id}: ${g.note}` }; })];
    const vg = pick('vision', vis); if (vis.some(g => g.data && g.data.needsHumanReview)) vg.needsHumanReview = true; gates.push(vg);
    const lg = P.shots.filter(s => s.lipsync.needed).map(s => { const g = M.shots[s.id].lipGate || M.shots[s.id].voiceGate; return { ...g, note: `${s.id}: ${g.note}` }; });
    gates.push(pick('lipsync', lg.length ? lg : [{ status: 'PASS', note: 'không có câu thoại' }]));
    gates.push(G.openingGate(rmsDb(V, 0, G.TH.openWindow), events));
    gates.push(G.layoutGate(segs, events));
    gates.push(G.endcardGate(segs, M.assets, M.endcard));
    gates.push(G.loudnessGate(lufs(V)));
    M.gates = gates; M.qa = G.studioQa(gates); M.qa.needsHumanReview = !!vg.needsHumanReview;
    const pv = probe(V); M.files = { video: rel(V), duration: pv.duration, size: fs.statSync(V).size, width: pv.w, height: pv.h };
    fs.writeFileSync(path.join(OUT, 'qa.json'), JSON.stringify({ gates, qa: M.qa }, null, 1));
    return { gates: gates.map(g => `${g.k}: ${g.status}`) };
  });

  // ---------- 9 · report ----------
  await step('report', async () => {
    const lines = [`### Cine · ${P.id} (${driverName}${simulated ? ', credit mô phỏng' : ''})`, `- Video: \`${rel(path.join(OUT, 'video.mp4'))}\` · ${M.files.duration}s`, `- Credit video: ${M.ledger.videoCredits}${simulated ? ' (mô phỏng)' : ''} / trần ${budget} (≈ ${M.ledger.videoUsd} USD API) · lần chạy này tiêu ${M.ledger.credits} · ${M.ledger.cachedCalls} lời gọi lấy từ cache`, '', '| Cổng | Kết quả | Ghi chú |', '|---|---|---|', ...M.gates.map(g => `| ${g.k} | ${g.status} | ${String(g.note).replace(/\|/g, '/').slice(0, 220)} |`)];
    if (M.notes.length) lines.push('', ...M.notes.map(n => '- ' + n));
    summary(lines.join('\n'));
    if (!o.job) return { studio: 'không gửi (không có --job)' };
    const API = process.env.STUDIO_API || 'https://lexkite.com/api/studio', SECRET = process.env.STUDIO_CALLBACK_SECRET;
    if (!SECRET) { note('không có STUDIO_CALLBACK_SECRET – không báo Studio'); return { studio: 'thiếu secret' }; }
    const files = { ...M.files, mode: 'cine', credits: M.ledger.videoCredits, run_url: process.env.RUN_URL || undefined, preview_url: process.env.PREVIEW_URL || undefined, artifact: `cine-${P.id}`, todo: M.qa.needsHumanReview ? ['vision-human-review'] : [] };
    const r = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Studio-Secret': SECRET }, body: JSON.stringify({ op: 'ciResult', id: o.job, ok: true, files, qa: M.qa }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(`Studio ciResult → HTTP ${r.status} ${j.error || ''}`);
    return { studio: (j.job || {}).status || 'ok' };
  });
  return { ok: !M.qa.blocked, manifest: MF, gates: M.gates };
}

/** CI: bước trước lỗi → báo Studio job quay lại (ciResult ok:false, lỗi lấy từ manifest). */
async function reportFailure(o) {
  const SECRET = process.env.STUDIO_CALLBACK_SECRET; if (!o.job || !SECRET) { console.log('không báo lỗi Studio (thiếu --job hoặc STUDIO_CALLBACK_SECRET)'); return; }
  let err = 'dựng cine thất bại – xem log Actions';
  try { const m = JSON.parse(fs.readFileSync(path.resolve(ROOT, o.out, 'manifest.json'), 'utf8')); const st = Object.entries(m.steps).find(([, v]) => v.status !== 'done'); if (st) err = `cine ${st[0]}: ${st[1].status} ${st[1].error || ''}`.slice(0, 300); } catch { /* chưa có manifest */ }
  const r = await fetch(process.env.STUDIO_API || 'https://lexkite.com/api/studio', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Studio-Secret': SECRET }, body: JSON.stringify({ op: 'ciResult', id: o.job, ok: false, error: scrub(err), files: { mode: 'cine', run_url: process.env.RUN_URL } }) });
  console.log(`báo lỗi Studio: HTTP ${r.status}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if ((process.env.HTTPS_PROXY || process.env.https_proxy) && !process.env.NODE_USE_ENV_PROXY) { // fetch của Node đi qua proxy (như library.mjs)
    const r = spawnSync(process.execPath, process.argv.slice(1), { stdio: 'inherit', env: { ...process.env, NODE_USE_ENV_PROXY: '1' } });
    process.exit(r.status ?? 1);
  }
  const o = args(process.argv.slice(2));
  if (o['report-failure']) { reportFailure(o).then(() => process.exit(0), e => { console.error(scrub(e.message)); process.exit(0); }); } else
  run(o).then(r => { console.log(r.dryRun ? '✓ dry-run xong' : `${r.ok ? '✓' : '✗ (CHẶN ĐĂNG – xem cổng)'} manifest: ${rel(r.manifest)}`); process.exit(0); },
    e => { console.error(`✗ cine: ${scrub(e.message)}${e.needsOwner ? ' [cần chủ dự án]' : ''}`); process.exit(e.budget ? 3 : e.needsOwner ? 4 : 1); });
}
