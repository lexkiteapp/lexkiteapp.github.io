// `npm test`: chạy lần lượt từng lệnh trong scripts/test/suite.txt (mỗi dòng một lệnh, qua sh), dừng ở lệnh đỏ đầu tiên – y như chuỗi `a && b && …` cũ.
// Danh sách nằm ở file riêng (merge=union trong .gitattributes) để hai PR cùng thêm test không xung đột ở một dòng package.json dài.
// Chia shard (CI chạy song song, scripts/test/suite-shards.mjs canh hợp = đủ bộ): --fast = làn nhanh (lint/chính sách, FAST_RE), --shard=i/n (i từ 1) = phần i của phần còn lại, cân theo thời gian đo (suite-weights.json).
// Tùy chọn: --list in danh sách rồi thoát; --from=N bắt đầu từ lệnh thứ N (chạy lại sau lỗi, chỉ dùng cục bộ).
import fs from 'node:fs'; import path from 'node:path'; import { spawnSync } from 'node:child_process'; import { fileURLToPath } from 'node:url';
export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const SUITE = path.join(ROOT, 'scripts/test/suite.txt');
export const readSuite = (file = SUITE) => fs.readFileSync(file, 'utf8').split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'));
export const FAST_RE = /^node scripts\/(vi-lint|ext-syntax|i18n-missing|test\/(ci-policy|ci-triage|syntax-check|comment-code|unit|suite-shards|workflow-yaml))\.m?js\b/;
// Chú thích lỗi CI: mỗi test đỏ in `::error file=…::<test>: <lý do ngắn>` + ghi bảng tóm tắt vào job summary (không chỉ "exit 1").
export const TAIL_MAX = 6000;
export const scriptOf = c => (c.match(/(?:^|\s)((?:\.\/)?[\w./-]+\.(?:m?js|py|sh|cjs|ts))\b/) || [])[1]?.replace(/^\.\//, '') || 'package.json';
export const reasonOf = (tail, status) => {
  // 17/11: nhiều test in "✗ chi tiết" rồi dòng tổng "✗ test: N lỗi" – chú thích phải mang CHI TIẾT (tối đa 2 dòng), không chỉ dòng tổng (landing-v3 "1 lỗi" không nói gì)
  const lines = String(tail).replace(/\u001b\[[0-9;]*m/g, '').split('\n').map(l => l.trim()).filter(Boolean);
  const hits = lines.filter(l => /(✗|✘|\bnot ok\b|\bFAIL(ED)?\b|\b(Assertion|Type|Reference|Syntax)?Error\b|\bassert|\bExpected\b|\bđỏ\b|\bthiếu\b|\blỗi\b)/i.test(l));
  const summary = l => /^[✗✘]?\s*[\w./-]+:\s*\d+(\/\d+)?\s+(lỗi|loi|fail(ed|ures)?|errors?)\b/i.test(l);
  const detail = hits.filter(l => !summary(l));
  const pick = detail.length ? detail.slice(0, 2) : hits.slice(-1);
  return ((pick.length ? pick.join(' | ') : lines[lines.length - 1]) || `thoát mã ${status}`).slice(0, 300);
};
export const esc = s => String(s).replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A');
export const annotate = (c, tail, status) => {
  const reason = reasonOf(tail, status), file = scriptOf(c);
  console.error(`::error file=${esc(file)},title=${esc('npm test đỏ')}::${esc(`${c}: ${reason}`)}`);
  if (process.env.GITHUB_STEP_SUMMARY) { try { fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### ✗ npm test đỏ\n\n- Lệnh: \`${c}\`\n- Mã thoát: ${status}\n- Lý do: ${reason.replace(/`/g, "'")}\n\n<details><summary>Đuôi output</summary>\n\n\`\`\`\n${String(tail).slice(-2000)}\n\`\`\`\n</details>\n`); } catch {} }
  return reason;
};
// jsdom không nạp được (thiếu module phụ thuộc…) thì test dùng nó chỉ văng lỗi lúc import – dễ bị đọc nhầm là "pass" khi chỉ lọc ✗. Kiểm sớm: cần mà hỏng → ĐỎ ngay với lý do rõ.
export const needsJsdom = (cmds, read = f => fs.readFileSync(path.join(ROOT, f), 'utf8')) => cmds.some(c => { const f = scriptOf(c); try { return f !== 'package.json' && /\bjsdom\b/.test(read(f)); } catch { return false; } });
export const jsdomError = (load = () => import('jsdom')) => load().then(() => '', e => String((e && e.message) || e).split('\n')[0].slice(0, 200));
export const split = (cmds, n, weights = {}) => {   // LPT: lệnh nặng trước vào shard nhẹ nhất; thứ tự gốc giữ trong shard; tất định
  const W = c => weights[c] ?? 3, bins = Array.from({ length: n }, () => ({ t: 0, idx: [] }));
  cmds.map((c, i) => [c, i]).sort((a, b) => W(b[0]) - W(a[0]) || a[1] - b[1]).forEach(([c, i]) => { const b = bins.reduce((m, x) => x.t < m.t ? x : m); b.t += W(c); b.idx.push(i); });
  return bins.map(b => ({ t: b.t, cmds: b.idx.sort((x, y) => x - y).map(i => cmds[i]) }));
};
export const readWeights = () => { try { return JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/test/suite-weights.json'), 'utf8')); } catch { return {}; } };
export const lanes = (all, n, weights = {}) => ({ fast: all.filter(c => FAST_RE.test(c)), shards: split(all.filter(c => !FAST_RE.test(c)), n, weights) });
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  let cmds = readSuite(); const arg = k => (process.argv.find(a => a.startsWith(`--${k}=`)) || '').split('=')[1];
  if (process.argv.includes('--fast')) cmds = cmds.filter(c => FAST_RE.test(c));
  else if (arg('shard')) { const [i, n] = arg('shard').split('/').map(Number); cmds = lanes(cmds, n, readWeights()).shards[i - 1].cmds; console.log(`shard ${i}/${n}: ${cmds.length} lệnh`); }
  if (process.argv.includes('--list')) { cmds.forEach((c, i) => console.log(`${i + 1}\t${c}`)); process.exit(0); }
  if (needsJsdom(cmds)) { const je = await jsdomError(); if (je) { console.error(`::error file=package.json,title=${esc('jsdom không nạp được')}::npm ci chưa đủ hoặc Node không khớp (CI dùng Node 22): ${esc(je)}`); process.exit(1); } }
  // Đầu ra test có thể hàng MB (jsdom "Not implemented"…): process.stdout.write đồng bộ vào pipe không chặn của runner CI có thể ném EAGAIN → run-suite chết (exit 1) mà mất cả dòng "✗ [n/N]" (content-factory/collect 15–18/11). Ghi bằng fs.writeSync, EAGAIN thì thử lại.
  const put = (fd, text) => { const b = Buffer.from(text); let o = 0; while (o < b.length) { try { o += fs.writeSync(fd, b, o); } catch (e) { if (e.code !== 'EAGAIN') throw e; Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 5); } } };
  const from = Math.max(1, Number(arg('from')) || 1), t0 = Date.now(), times = [];
  for (let i = from - 1; i < cmds.length; i++) {
    const c = cmds[i], t = Date.now();
    console.log(`\n▶ [${i + 1}/${cmds.length}] ${c}`);
    const r = spawnSync(c, { cwd: ROOT, shell: '/bin/sh', stdio: ['inherit', 'pipe', 'pipe'], env: process.env, encoding: 'utf8', maxBuffer: 1 << 28 });
    put(1, r.stdout || ''); put(2, r.stderr || '');
    const s = (Date.now() - t) / 1000; times.push([s, c]);
    if (r.status !== 0) {
      annotate(c, ((r.stderr || '') + '\n' + (r.stdout || '')).slice(-TAIL_MAX), r.status ?? r.signal);
      console.error(`\n✗ [${i + 1}/${cmds.length}] ${c} – đỏ (mã ${r.status ?? r.signal}) sau ${s.toFixed(1)}s. Chạy lại từ đây: node scripts/test/run-suite.mjs --from=${i + 1}`);
      process.exit(r.status || 1);
    }
    console.log(`✓ [${i + 1}/${cmds.length}] ${c} (${s.toFixed(1)}s)`);
  }
  const slow = times.sort((a, b) => b[0] - a[0]).slice(0, 10).map(([s, c]) => `  ${s.toFixed(1)}s  ${c}`).join('\n');
  console.log(`\n✓ npm test: ${times.length} lệnh xanh trong ${((Date.now() - t0) / 1000).toFixed(1)}s. Chậm nhất:\n${slow}`);
}
