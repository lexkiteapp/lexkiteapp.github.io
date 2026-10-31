#!/usr/bin/env node
// Độ to giọng nói (EBU R128) – MỘT chuẩn cho mọi clip app phát: −16 LUFS tích hợp, đỉnh thật ≤ −1 dBTP, lệch tối đa ±1 LU.
//   node scripts/audio/loudness.mjs measure <thư mục|tệp>… [--out report.json] [--md summary.md]   → đo từng mp3 (ffmpeg ebur128 peak=true)
//   node scripts/audio/loudness.mjs gate <report.json>                                              → thoát 1 nếu có clip lệch chuẩn
// Việc nặng (ffmpeg hàng chục nghìn tệp) CHỈ chạy trên CI: ngoài $CI script tự từ chối (docs/METHODS.md).
// Chuẩn và hàm chuẩn hoá dùng chung cho các đường ống sinh âm thanh: scripts/audio/norm.mjs.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { TARGET_LUFS, MAX_TP, TOL_LU, MEASURE_AF, parseSummary } from './norm.mjs';

const A = process.argv.slice(2), cmd = A[0], opt = (k, d) => { const i = A.indexOf('--' + k); return i >= 0 ? A[i + 1] : d; };
const rest = A.slice(1).filter((a, i, all) => !a.startsWith('--') && !(i > 0 && all[i - 1].startsWith('--')));

export function verdict(r) {
  if (r.err) return 'error';
  if (r.I == null || !Number.isFinite(r.I)) return 'silent';
  if (Math.abs(r.I - TARGET_LUFS) > TOL_LU) return 'off';
  if (r.TP != null && r.TP > MAX_TP + 0.05) return 'peak';
  return 'ok';
}

function measureOne(f) {
  return new Promise(res => {
    execFile('ffmpeg', ['-hide_banner', '-nostats', '-i', f, '-af', MEASURE_AF, '-f', 'null', '-'], { maxBuffer: 64 << 20 }, (e, _o, err) => {
      const d = (err.match(/Duration:\s*(\d+):(\d+):([\d.]+)/) || []).slice(1).map(Number);
      const dur = d.length ? d[0] * 3600 + d[1] * 60 + d[2] : null;
      if (e && !/Summary:/.test(err)) return res({ f, err: String(err).slice(-200) });
      res({ f, dur, ...parseSummary(err) });
    });
  });
}

const walk = d => fs.statSync(d).isDirectory() ? fs.readdirSync(d, { withFileTypes: true }).flatMap(e => walk(path.join(d, e.name))) : [d];
const q = (xs, p) => xs.length ? xs[Math.min(xs.length - 1, Math.floor(p * xs.length))] : null;
const r1 = x => x == null ? '–' : x.toFixed(1);

export function summarize(rows) {
  const by = {};
  for (const r of rows) {
    const g = r.f.split('/').slice(-2, -1)[0] || '.';
    (by[g] = by[g] || []).push(r);
  }
  return Object.fromEntries(Object.entries(by).map(([g, rs]) => {
    const I = rs.map(r => r.I).filter(Number.isFinite).sort((a, b) => a - b), TP = rs.map(r => r.TP).filter(Number.isFinite).sort((a, b) => a - b);
    const v = {}; rs.forEach(r => { const k = verdict(r); v[k] = (v[k] || 0) + 1; });
    return [g, { n: rs.length, I_min: I[0], I_p5: q(I, .05), I_med: q(I, .5), I_p95: q(I, .95), I_max: I[I.length - 1], TP_p95: q(TP, .95), TP_max: TP[TP.length - 1], verdicts: v }];
  }));
}

export function markdown(sum) {
  const L = [`| nhóm | clip | I min | p5 | trung vị | p95 | I max (LUFS) | TP p95 | TP max (dBTP) | ok | lệch >±${TOL_LU} LU | đỉnh >${MAX_TP} | lặng/lỗi |`, '|---|---|---|---|---|---|---|---|---|---|---|---|---|'];
  for (const [g, s] of Object.entries(sum)) {
    const v = s.verdicts;
    L.push(`| ${g} | ${s.n} | ${r1(s.I_min)} | ${r1(s.I_p5)} | ${r1(s.I_med)} | ${r1(s.I_p95)} | ${r1(s.I_max)} | ${r1(s.TP_p95)} | ${r1(s.TP_max)} | ${v.ok || 0} | ${v.off || 0} | ${v.peak || 0} | ${(v.silent || 0) + (v.error || 0)} |`);
  }
  return `Chuẩn: ${TARGET_LUFS} LUFS ±${TOL_LU} LU, đỉnh thật ≤ ${MAX_TP} dBTP.\n\n` + L.join('\n') + '\n';
}

async function measure() {
  if (!process.env.CI) { console.error('loudness: chỉ chạy trên CI (ffmpeg hàng loạt) – đặt CI=1 nếu thật sự cần thử 1 tệp'); process.exit(2); }
  const files = rest.flatMap(walk).filter(f => /\.(mp3|wav|m4a|ogg|opus)$/i.test(f));
  const lim = Number(opt('limit', 0)), list = lim ? files.slice(0, lim) : files;
  const N = Math.max(2, os.cpus().length), out = [];
  let i = 0, done = 0;
  await Promise.all(Array.from({ length: N }, async () => {
    while (i < list.length) { const f = list[i++]; out.push(await measureOne(f)); if (++done % 2000 === 0) console.log(`loudness: ${done}/${list.length}`); }
  }));
  out.sort((a, b) => a.f < b.f ? -1 : 1);
  const sum = summarize(out);
  if (opt('out')) fs.writeFileSync(opt('out'), JSON.stringify({ target: TARGET_LUFS, tp: MAX_TP, tol: TOL_LU, summary: sum, rows: out.map(r => ({ ...r, v: verdict(r) })) }));
  const md = markdown(sum);
  if (opt('md')) fs.writeFileSync(opt('md'), md);
  console.log(md);
}

function gate() {
  const rep = JSON.parse(fs.readFileSync(rest[0], 'utf8')), bad = rep.rows.filter(r => r.v !== 'ok');
  console.log(markdown(rep.summary));
  if (bad.length) {
    console.log(bad.slice(0, 40).map(r => `✗ ${r.f}: I=${r1(r.I)} TP=${r1(r.TP)} (${r.v})`).join('\n'));
    console.error(`✗ loudness: ${bad.length}/${rep.rows.length} clip lệch chuẩn ${TARGET_LUFS} LUFS ±${TOL_LU} LU / TP ≤ ${MAX_TP} dBTP`);
    process.exit(1);
  }
  console.log(`✓ loudness: ${rep.rows.length} clip đúng chuẩn`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  if (cmd === 'measure') await measure();
  else if (cmd === 'gate') gate();
  else { console.error('dùng: loudness.mjs measure|gate …'); process.exit(2); }
}
