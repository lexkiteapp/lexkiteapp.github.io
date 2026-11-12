// Cắt nền trơn (trắng/kem) của clip/ảnh nhân vật Kling bằng FLOOD-FILL từ mép khung (không ăn vào mắt/giày trắng bên trong viền nét) → lớp alpha cho Remotion.
// Dùng cho tài nguyên CHƯA qua clip_to_layer.py (không có kênh alpha / không phải "stacked") – chỉ là đường tạm, ghi todo; tài nguyên chuẩn vẫn là clip stacked trong kho.
//   node scripts/video/keyclip.mjs in.mp4|in.png out.webm|out.png [--h 960] [--fps 24]
// Ra: in JSON { w, h, foot:[x,y], figH, frames } (toạ độ px của lớp ra) – render.mjs đặt chân lên điểm đứng theo foot/figH.
// Cũng có: stackedToAlpha() kiểm & đổi clip stacked (nửa trên màu, nửa dưới mặt nạ) → webm alpha 30 fps (bỏ khung lặp + nội suy chuyển động); isStackedMask() kiểm nửa dưới đúng là mặt nạ xám.
import fs from 'fs';
import path from 'path';
import { spawn, execFileSync } from 'child_process';
import { fileURLToPath } from 'url';

// ---------- thuần (test được) ----------
// rgb: Uint8Array w*h*3 → alpha Uint8Array w*h. Nền = vùng nối với mép, gần màu nền (lệch kênh ≤ tol); 25% dưới khung: xám nhạt trung tính cũng là nền (bóng sàn dính).
export function floodKey(rgb, w, h, { tol = 30, shadowFrom = 0.75 } = {}) {
  const px = i => [rgb[i * 3], rgb[i * 3 + 1], rgb[i * 3 + 2]];
  const border = []; for (let x = 0; x < w; x += 4) border.push(x, (h - 1) * w + x); for (let y = 0; y < h; y += 4) border.push(y * w, y * w + w - 1);
  const ch = [0, 1, 2].map(c => border.map(i => rgb[i * 3 + c]).sort((a, b) => a - b)[border.length >> 1]);
  const dist = i => { const p = px(i); return Math.max(Math.abs(p[0] - ch[0]), Math.abs(p[1] - ch[1]), Math.abs(p[2] - ch[2])); };
  const passable = i => { if (dist(i) <= tol) return true; if (i / w < h * shadowFrom) return false; const p = px(i), mx = Math.max(...p), mn = Math.min(...p); return mx - mn < 26 && mx > 120; };
  const bg = new Uint8Array(w * h), q = new Int32Array(w * h); let qh = 0, qt = 0;
  for (const i of border) if (!bg[i] && passable(i)) { bg[i] = 1; q[qt++] = i; }
  while (qh < qt) {
    const i = q[qh++], x = i % w;
    const nb = [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, i - w, i + w];
    for (const j of nb) if (j >= 0 && j < w * h && !bg[j] && passable(j)) { bg[j] = 1; q[qt++] = j; }
  }
  // lọc đa số 3×3: bỏ hạt lẻ (bóng sàn lấm tấm) và lỗ 1 px
  const fg = new Uint8Array(w * h);
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) { const i = y * w + x; let c = 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if ((dx || dy) && !bg[i + dy * w + dx]) c++; fg[i] = bg[i] ? (c >= 7 ? 1 : 0) : (c >= 3 ? 1 : 0); }
  for (let i = 0; i < w * h; i++) bg[i] = fg[i] ? 0 : 1;
  const a = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    if (bg[i]) continue;
    const x = i % w, edge = (x > 0 && bg[i - 1]) || (x < w - 1 && bg[i + 1]) || (i >= w && bg[i - w]) || (i + w < w * h && bg[i + w]);
    a[i] = edge ? Math.min(255, 90 + Math.round(dist(i) * 3)) : 255; // mép mềm 1 px
  }
  return a;
}
// hộp bao alpha → chân (giữa đáy) + chiều cao người
export function alphaBox(a, w, h, thr = 128) {
  let x0 = w, x1 = -1, y0 = h, y1 = -1; const minRow = Math.max(2, Math.round(w * 0.006)); // hàng có ≥ 0,6% bề ngang đặc mới tính (bỏ nhiễu)
  for (let y = 0; y < h; y++) { let c = 0, lx = w, rx = -1; for (let x = 0; x < w; x++) if (a[y * w + x] >= thr) { c++; if (x < lx) lx = x; rx = x; } if (c >= minRow) { if (lx < x0) x0 = lx; if (rx > x1) x1 = rx; if (y < y0) y0 = y; y1 = y; } }
  if (x1 < 0) return null;
  let sx = 0, n = 0; for (let y = Math.max(y0, y1 - Math.round((y1 - y0) * 0.04)); y <= y1; y++) for (let x = x0; x <= x1; x++) if (a[y * w + x] >= thr) { sx += x; n++; }
  return { x0, y0, x1, y1, foot: [Math.round(n ? sx / n : (x0 + x1) / 2), y1], figH: y1 - y0 };
}
// nửa dưới khung stacked phải là mặt nạ: gần như xám (R≈G≈B), có cả vùng ~0 và ~255
export function isStackedMask(rgb, w, h) {
  const half = Math.floor(h / 2); let gray = 0, black = 0, white = 0, n = 0;
  for (let y = half; y < h; y += 2) for (let x = 0; x < w; x += 2) { const i = (y * w + x) * 3, r = rgb[i], g = rgb[i + 1], b = rgb[i + 2]; n++; if (Math.max(r, g, b) - Math.min(r, g, b) < 12) gray++; const l = (r + g + b) / 3; if (l < 20) black++; else if (l > 235) white++; }
  return { ok: gray / n > 0.97 && black / n > 0.1 && white / n > 0.02, gray: gray / n, black: black / n, white: white / n };
}

// ---------- ffmpeg ----------
const probe = f => { const j = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height,nb_frames:format=duration', '-of', 'json', f], { encoding: 'utf8' })); const s = j.streams[0]; return { w: s.width, h: s.height, dur: +j.format.duration || 0 }; };
const rateOf = f => { const r = execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=r_frame_rate', '-of', 'csv=p=0', f], { encoding: 'utf8' }).trim().split('/'); return +r[0] / (+r[1] || 1); };
export function grabFrame(file, t = 0.5, scaleH = 0) {
  const p = probe(file), h = scaleH ? scaleH : p.h, w = scaleH ? Math.round(p.w * scaleH / p.h / 2) * 2 : p.w;
  const buf = execFileSync('ffmpeg', ['-v', 'error', ...(/\.(png|jpe?g|webp)$/i.test(file) ? [] : ['-ss', String(Math.min(t, Math.max(0, p.dur - 0.1)))]), '-i', file, '-frames:v', '1', '-vf', `scale=${w}:${h}`, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], { maxBuffer: 1 << 28 });
  return { w, h, data: new Uint8Array(buf.buffer, buf.byteOffset, buf.length) };
}
// Kling xuất 24 fps nhưng nội dung thật ~12 fps ("on twos": khung lẻ gần như lặp khung trước) → dựng ở 30 fps thành nhịp 2-3-2-3 giật.
// Bỏ khung lặp (MSE ảnh xám nhỏ < thr so với khung GIỮ gần nhất, tối đa maxRun khung liền) – minterpolate dùng pts thật nên khoảng trống được nội suy đúng chỗ.
// big: khoảng giữa 2 khung giữ có MSE > big (vung tay rất nhanh trong 1/12 s) → MCI ra tay "bóng ma"/vỡ mảnh (đo 18/10: diane_talk_gesture 0,5–0,75 s)
//   → các khung 30 fps trong khoảng đó lấy khung gốc gần nhất (giữ nhịp gốc đúng lúc chuyển động nhanh nhất – mắt thấy như nhòe chuyển động, không vỡ hình).
export const DUP = { w: 96, thr: 2, maxRun: 3, big: 120 };
export function uniqueFrames(frames, { thr = DUP.thr, maxRun = DUP.maxRun } = {}) {
  if (!frames.length) return [];
  const keep = [0]; let run = 0;
  for (let i = 1; i < frames.length; i++) {
    const a = frames[keep[keep.length - 1]], b = frames[i]; let s = 0; for (let k = 0; k < a.length; k++) { const x = a[k] - b[k]; s += x * x; }
    if (s / a.length < thr && run < maxRun && i < frames.length - 1) { run++; continue; }
    keep.push(i); run = 0;
  }
  return keep;
}
export const gapMse = (frames, keep) => keep.slice(1).map((j, q) => { const a = frames[keep[q]], b = frames[j]; let s = 0; for (let k = 0; k < a.length; k++) { const x = a[k] - b[k]; s += x * x; } return s / a.length; });
// khung ra (30 fps) nằm giữa 2 khung giữ có khoảng MSE > big → lấy khung gốc gần nhất thay vì nội suy
export function holdFrames(keep, gaps, { srcFps = 24, fps = 30, n = 0, big = DUP.big } = {}) {
  const out = [];
  for (let k = 0; k < n; k++) {
    const t = k / fps; let q = 0; while (q < keep.length - 2 && keep[q + 1] / srcFps <= t + 1e-9) q++;
    const a = keep[q] / srcFps, b = keep[q + 1] / srcFps;
    if (gaps[q] > big && t > a + 1e-6 && t < b - 1e-6) out.push(k);
  }
  return out;
}
const sel = (ks, neg) => (ks.length ? `select='${neg ? 'not(' : ''}${ks.map(k => `eq(n,${k})`).join('+')}${neg ? ')' : ''}'` : neg ? 'null' : `select='0'`);
export const dropExpr = (n, keep) => { const k = new Set(keep), d = []; for (let i = 0; i < n; i++) if (!k.has(i)) d.push(`eq(n,${i})`); return d.length ? `select='not(${d.join('+')})',` : ''; };
// Nội suy chuyển động (MCI) → 30 fps. minterpolate không nhận kênh alpha → 2 lượt CÙNG mặt Y (độ sáng của màu): lượt màu (yuv444p) và lượt mặt nạ
// (Y = độ sáng màu, U/V = mặt nạ). Ước lượng chuyển động chỉ dùng mặt Y → 2 lượt ra vector giống hệt → mặt nạ bị kéo đúng như màu (mép alpha khớp màu;
// test thật: U lượt 2 == Y lượt 1 từng bit). Không blend khung (bóng ma 2 tay) – xem docs/VIDEO-PIPELINE.md §10 "Nhịp chuyển động".
export const MCI = 'minterpolate=fps=30:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1:scd=none';
export function alphaGraph({ keepSel = '', ow, oh, fps = 30, hold = [] } = {}) {
  const mi = MCI.replace('fps=30', `fps=${fps}`), H = hold.length;
  return `[0:v]${keepSel}split=${H ? 3 : 2}[a][b]${H ? '[h]' : ''};[a]crop=iw:ih/2:0:0,scale=${ow}:${oh},format=yuv444p,split[cA][cB];[b]crop=iw:ih/2:0:ih/2,scale=${ow}:${oh},format=gray[m];`
    + `[cB]extractplanes=y[yl];[yl][m]mergeplanes=0x001010:yuv444p[ma];[cA]${mi}[ci];[ma]${mi},extractplanes=u[al];[ci][al]alphamerge,format=yuva420p${H ? '[mo]' : '[o]'}`
    + (H ? `;[h]split[hc][hm];[hc]crop=iw:ih/2:0:0,scale=${ow}:${oh}[hc2];[hm]crop=iw:ih/2:0:ih/2,scale=${ow}:${oh},format=gray[hm2];[hc2][hm2]alphamerge,fps=${fps},format=yuva420p,${sel(hold, false)}[h1];[mo]${sel(hold, true)}[m1];[m1][h1]interleave[o]` : '');
}
const run = (bin, a) => new Promise((res, rej) => { const p = spawn(bin, a, { stdio: ['ignore', 'ignore', 'pipe'] }); let e = ''; p.stderr.on('data', d => { e += d; }); p.on('close', c => (c ? rej(new Error(`${bin} mã ${c}: ${e.slice(-300)}`)) : res())); });
// clip stacked → webm VP9 alpha 30 fps (kiểm định dạng trước: sai → lỗi rõ ràng, không dựng "bóng ma")
export async function stackedToAlpha(file, out, { fps = 30, h = 1800 } = {}) { // giữ độ phân giải gốc (≤ 1800) – máy cận cần nét (phóng ≤ 1,6× figH gốc)
  const p = probe(file);
  if (p.h % 2 || p.h < p.w * 0.9) throw new Error(`clip stacked sai định dạng (${p.w}×${p.h}): cao phải = 2× nửa khung, nửa dưới là mặt nạ – ${path.basename(file)}`);
  const f = grabFrame(file, 0.5), m = isStackedMask(f.data, f.w, f.h);
  if (!m.ok) throw new Error(`clip stacked ${path.basename(file)}: nửa dưới không phải mặt nạ alpha (xám ${(m.gray * 100).toFixed(0)}%, đen ${(m.black * 100).toFixed(0)}%, trắng ${(m.white * 100).toFixed(0)}%)`);
  const oh = Math.min(h, p.h / 2), ow = Math.round(p.w * oh / (p.h / 2) / 2) * 2;
  const sw = DUP.w, sh = Math.round(sw * (p.h / 2) / p.w), raw = execFileSync('ffmpeg', ['-v', 'error', '-i', file, '-vf', `crop=iw:ih/2:0:0,scale=${sw}:${sh},format=gray`, '-f', 'rawvideo', '-'], { maxBuffer: 1 << 28 });
  const n = sw * sh, frames = []; for (let o = 0; o + n <= raw.length; o += n) frames.push(raw.subarray(o, o + n));
  const keep = uniqueFrames(frames), srcFps = rateOf(file) || 24, hold = holdFrames(keep, gapMse(frames, keep), { srcFps, fps, n: Math.ceil(frames.length / srcFps * fps) });
  await run('ffmpeg', ['-v', 'error', '-y', '-i', file, '-filter_complex', alphaGraph({ keepSel: dropExpr(frames.length, keep), ow, oh, fps, hold }), '-map', '[o]', '-an', '-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', '26', '-deadline', 'realtime', '-cpu-used', '8', '-auto-alt-ref', '0', out]);
  const g = grabFrame(file, 0.5); const half = new Uint8Array(g.w * (g.h >> 1)); for (let i = 0; i < half.length; i++) half[i] = g.data[(i + g.w * (g.h >> 1)) * 3];
  const b = alphaBox(half, g.w, g.h >> 1), k = oh / (p.h / 2), dur = probe(out).dur || p.dur;
  return { w: ow, h: oh, fps, dur: +dur.toFixed(3), srcFrames: frames.length, unique: keep.length, held: hold.length, foot: b ? [Math.round(b.foot[0] * k), Math.round(b.foot[1] * k)] : [ow / 2, oh], figH: b ? Math.round(b.figH * k) : oh };
}
export const hasAlpha = f => /a/.test((execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=pix_fmt', '-of', 'csv=p=0', f], { encoding: 'utf8' }).trim()).replace('yuv', ''));
// ảnh đã có alpha → thu về cao ≤ h + đo chân/chiều cao từ kênh alpha
export function stillWithAlpha(file, out, { h = 960 } = {}) {
  const p = probe(file), oh = Math.min(h, p.h), ow = Math.round(p.w * oh / p.h / 2) * 2;
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', file, '-vf', `scale=${ow}:${oh}`, '-frames:v', '1', out]);
  const a = execFileSync('ffmpeg', ['-v', 'error', '-i', out, '-vf', 'alphaextract', '-f', 'rawvideo', '-pix_fmt', 'gray', '-'], { maxBuffer: 1 << 26 });
  const b = alphaBox(new Uint8Array(a.buffer, a.byteOffset, a.length), ow, oh);
  return { w: ow, h: oh, foot: b ? b.foot : [ow / 2, oh], figH: b ? b.figH : oh, dur: 0 };
}
// clip/ảnh nền trơn → webm alpha / png alpha (flood-fill từng khung)
export async function keyToAlpha(file, out, { fps = 24, h = 960, maxDur = 6 } = {}) {
  const p = probe(file), still = /\.(png|jpe?g|webp)$/i.test(file), oh = Math.min(h, p.h), ow = Math.round(p.w * oh / p.h / 2) * 2, fsz = ow * oh * 3;
  const dec = spawn('ffmpeg', ['-v', 'error', '-i', file, ...(still ? [] : ['-t', String(maxDur)]), '-vf', `${still ? '' : `fps=${fps},`}scale=${ow}:${oh}`, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-']);
  const enc = spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${ow}x${oh}`, '-r', String(fps), '-i', '-',
    ...(still ? ['-frames:v', '1', out] : ['-c:v', 'libvpx-vp9', '-pix_fmt', 'yuva420p', '-b:v', '0', '-crf', '32', '-deadline', 'realtime', '-cpu-used', '8', '-auto-alt-ref', '0', out])], { stdio: ['pipe', 'ignore', 'inherit'] });
  let acc = Buffer.alloc(0), frames = 0, box = null;
  const done = new Promise((res, rej) => { enc.on('close', c => (c ? rej(new Error('keyclip: ffmpeg mã ' + c)) : res())); });
  for await (const chunk of dec.stdout) {
    acc = Buffer.concat([acc, chunk]);
    while (acc.length >= fsz) {
      const rgb = new Uint8Array(acc.subarray(0, fsz)); acc = acc.subarray(fsz);
      const a = floodKey(rgb, ow, oh), rgba = Buffer.alloc(ow * oh * 4);
      for (let i = 0; i < ow * oh; i++) { rgba[i * 4] = rgb[i * 3]; rgba[i * 4 + 1] = rgb[i * 3 + 1]; rgba[i * 4 + 2] = rgb[i * 3 + 2]; rgba[i * 4 + 3] = a[i]; }
      if (!box) box = alphaBox(a, ow, oh);
      if (!enc.stdin.write(rgba)) await new Promise(r => enc.stdin.once('drain', r));
      frames++;
    }
  }
  enc.stdin.end(); await done;
  if (!frames) throw new Error('keyclip: không đọc được khung nào từ ' + file);
  return { w: ow, h: oh, frames, foot: box ? box.foot : [ow / 2, oh], figH: box ? box.figH : oh, dur: still ? 0 : frames / fps };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [i, o] = process.argv.slice(2), opt = n => { const k = process.argv.indexOf('--' + n); return k > 0 ? +process.argv[k + 1] : undefined; };
  if (!i || !o) { console.log('node scripts/video/keyclip.mjs in.mp4|in.png out.webm|out.png [--h 960] [--fps 24]'); process.exit(1); }
  console.log(JSON.stringify(await keyToAlpha(i, o, { h: opt('h') || 960, fps: opt('fps') || 24 })));
}
