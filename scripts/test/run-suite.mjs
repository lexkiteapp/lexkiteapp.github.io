// `npm test`: chạy lần lượt từng lệnh trong scripts/test/suite.txt (mỗi dòng một lệnh, qua sh), dừng ở lệnh đỏ đầu tiên – y như chuỗi `a && b && …` cũ.
// Danh sách nằm ở file riêng (merge=union trong .gitattributes) để hai PR cùng thêm test không xung đột ở một dòng package.json dài.
// Chia shard (CI chạy song song, scripts/test/suite-shards.mjs canh hợp = đủ bộ): --fast = làn nhanh (lint/chính sách, FAST_RE), --shard=i/n (i từ 1) = phần i của phần còn lại, cân theo thời gian đo (suite-weights.json).
// Tùy chọn: --list in danh sách rồi thoát; --from=N bắt đầu từ lệnh thứ N (chạy lại sau lỗi, chỉ dùng cục bộ).
import fs from 'node:fs'; import path from 'node:path';
import { gitContext, hashOf, loadLedger, canSkip, recordPass, flagFalsePass } from '../lib/test-cache.mjs'; import { spawnSync } from 'node:child_process'; import { fileURLToPath } from 'node:url';
export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const SUITE = process.env.SUITE_FILE ? path.resolve(process.env.SUITE_FILE) : path.join(ROOT, 'scripts/test/suite.txt');   // SUITE_FILE: bộ nhỏ để thử cục bộ (không chạy cả suite trên máy)
export const readSuite = (file = SUITE) => fs.readFileSync(file, 'utf8').split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'));
export const FAST_RE = /^node scripts\/(vi-lint|ext-syntax|i18n-missing|test\/(ci-policy|ci-triage|syntax-check|comment-code|unit|suite-shards|workflow-yaml|no-conflict-markers))\.m?js\b/;
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
// --affected (trước push, vài giây): chỉ test liên quan file đã đổi so với main – test đọc đường dẫn/tên file đó, test tự đổi, hoặc test đi cả thư mục
// chứa file MỚI cùng đuôi (vd theme-switch quét web/*.html). 22/11: #1813 (kl.html mới) và #1814 (đổi LZCSS) đỏ CI 30–40 phút vì test kiểu này không được chạy trước push.
export const affected = (cmds, changed, added = [], read = f => fs.readFileSync(path.join(ROOT, f), 'utf8')) => cmds.filter(c => {
  const f = scriptOf(c); if (changed.includes(f)) return true;
  let src; try { src = c.replace(f, '') + '\n' + read(f); } catch { return false; } // tham số lệnh (vd 'web') + mã test, bỏ chính đường dẫn test
  const has = s => s.length > 3 && src.includes(s);
  return changed.some(p => has(p) || has(path.basename(p))) || added.some(p => !p.startsWith('scripts/') && (() => { const top = p.split('/')[0], ext = path.extname(p); return !!ext && src.includes(ext) && new RegExp(`(^|[\\s'"\`(])${top}([\\s'"\`/)]|$)`, 'm').test(src); })());
});
export const changedFiles = (run = a => spawnSync('git', a, { cwd: ROOT, encoding: 'utf8' })) => {
  const base = ['real/main', 'upstream/main', 'origin/main'].map(b => (run(['merge-base', 'HEAD', b]).stdout || '').trim()).find(Boolean) || 'HEAD';
  const rows = (run(['diff', '--name-status', base]).stdout || '') + (run(['ls-files', '--others', '--exclude-standard']).stdout || '').split('\n').filter(Boolean).map(x => 'A\t' + x).join('\n');
  const ls = rows.split('\n').filter(Boolean).map(l => l.split('\t'));
  return { base, changed: ls.map(x => x[x.length - 1]), added: ls.filter(x => x[0] === 'A').map(x => x[1]) };
};
export const lanes = (all, n, weights = {}) => ({ fast: all.filter(c => FAST_RE.test(c)), shards: split(all.filter(c => !FAST_RE.test(c)), n, weights) });
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  let cmds = readSuite(); const arg = k => (process.argv.find(a => a.startsWith(`--${k}=`)) || '').split('=')[1];
  if (process.argv.includes('--fast')) cmds = cmds.filter(c => FAST_RE.test(c));
  else if (arg('shard')) { const [i, n] = arg('shard').split('/').map(Number); cmds = lanes(cmds, n, readWeights()).shards[i - 1].cmds; console.log(`shard ${i}/${n}: ${cmds.length} lệnh`); }
  if (process.argv.includes('--affected')) { const d = changedFiles(); process.env.GEN_GUARD_BASE ||= d.base; /* máy dev: origin có thể là kho cũ → so đúng mốc main thật */ cmds = affected(cmds, d.changed, d.added); console.log(`--affected: ${d.changed.length} file đổi → ${cmds.length} test liên quan`); }
  if (process.argv.includes('--list')) { cmds.forEach((c, i) => console.log(`${i + 1}\t${c}`)); process.exit(0); }
  if (process.argv.includes('--affected') && needsJsdom(cmds)) { const je = await jsdomError(); if (je) { const skip = cmds.filter(c => needsJsdom([c])); cmds = cmds.filter(c => !needsJsdom([c])); console.warn(`⚠ máy này không nạp được jsdom (${je}) → bỏ ${skip.length} test jsdom, CI vẫn chạy:\n  ${skip.join('\n  ')}`); } }
  if (needsJsdom(cmds)) { const je = await jsdomError(); if (je) { console.error(`::error file=package.json,title=${esc('jsdom không nạp được')}::npm ci chưa đủ hoặc Node không khớp (CI dùng Node 22): ${esc(je)}`); process.exit(1); } }
  // Đầu ra test có thể hàng MB (jsdom "Not implemented"…): process.stdout.write đồng bộ vào pipe không chặn của runner CI có thể ném EAGAIN → run-suite chết (exit 1) mà mất cả dòng "✗ [n/N]" (content-factory/collect 15–18/11). Ghi bằng fs.writeSync, EAGAIN thì thử lại.
  const put = (fd, text) => { const b = Buffer.from(text); let o = 0; while (o < b.length) { try { o += fs.writeSync(fd, b, o); } catch (e) { if (e.code !== 'EAGAIN') throw e; Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 5); } } };
  // 25/11 cache kết quả ĐẠT theo hash input (scripts/lib/test-cache.mjs): bật khi TEST_CACHE_FILE có giá trị (CI khôi phục sổ bằng actions/cache). NO_TEST_CACHE=1 (lượt đêm trên main) = KHÔNG bỏ qua test nào,
  // và test đỏ mà sổ từng cho đạt cùng hash = dò input sai → ghi `cache-false-pass.txt` (workflow mở issue).
  const cacheFile = process.env.TEST_CACHE_FILE, noCache = process.env.NO_TEST_CACHE === '1';
  let ledger = null, cctx = null, hits = 0, cacheable = 0; const falsePass = [];
  if (cacheFile) { try { ledger = loadLedger(cacheFile); cctx = gitContext(ROOT); } catch (e) { console.log(`::warning::test-cache tắt: ${String(e.message).split('\n')[0]}`); ledger = null; } }
  const saveLedger = () => { if (!ledger) return; try { fs.mkdirSync(path.dirname(cacheFile), { recursive: true }); fs.writeFileSync(cacheFile, JSON.stringify(ledger)); if (falsePass.length) fs.writeFileSync(path.join(path.dirname(cacheFile), 'cache-false-pass.txt'), falsePass.join('\n') + '\n'); } catch (e) { console.log(`::warning::không ghi được sổ cache: ${e.message}`); } };
  const hashFor = c => { if (!ledger) return null; try { return hashOf(c, cctx, { root: ROOT }).hash; } catch { return null; } };
  const from = Math.max(1, Number(arg('from')) || 1), t0 = Date.now(), times = [];
  for (let i = from - 1; i < cmds.length; i++) {
    const c = cmds[i], t = Date.now(), hash = hashFor(c);
    if (hash) cacheable++;
    if (ledger && canSkip(ledger, c, hash, { disabled: noCache })) { hits++; console.log(`\n↺ cached-pass [${i + 1}/${cmds.length}] ${c} (input ${hash.slice(0, 8)}, đạt ${ledger.pass[hash].t})`); continue; }
    console.log(`\n▶ [${i + 1}/${cmds.length}] ${c}`);
    const r = spawnSync(c, { cwd: ROOT, shell: '/bin/sh', stdio: ['inherit', 'pipe', 'pipe'], env: process.env, encoding: 'utf8', maxBuffer: 1 << 28 });
    put(1, r.stdout || ''); put(2, r.stderr || '');
    const s = (Date.now() - t) / 1000; times.push([s, c]);
    if (r.status !== 0) {
      if (ledger && flagFalsePass(ledger, c, hash)) { falsePass.push(`${c}\t${hash}`); console.error(`::error title=${esc('cache dò input sai')}::${esc(c)} đỏ nhưng sổ từng cho đạt cùng input → test này không được cache nữa; sửa dò input (scripts/lib/test-cache.mjs) hoặc test`); }
      saveLedger();
      annotate(c, ((r.stderr || '') + '\n' + (r.stdout || '')).slice(-TAIL_MAX), r.status ?? r.signal);
      console.error(`\n✗ [${i + 1}/${cmds.length}] ${c} – đỏ (mã ${r.status ?? r.signal}) sau ${s.toFixed(1)}s. Chạy lại từ đây: node scripts/test/run-suite.mjs --from=${i + 1}`);
      process.exit(r.status || 1);
    }
    if (ledger && hash) recordPass(ledger, c, hash);
    console.log(`✓ [${i + 1}/${cmds.length}] ${c} (${s.toFixed(1)}s)`);
  }
  saveLedger();
  if (ledger) console.log(`test-cache: ${hits} test bỏ qua (cached-pass) / ${cacheable} cache được / ${cmds.length - from + 1} lệnh trong phần này${noCache ? ' (NO_TEST_CACHE: không bỏ qua)' : ''}`);
  const slow = times.sort((a, b) => b[0] - a[0]).slice(0, 10).map(([s, c]) => `  ${s.toFixed(1)}s  ${c}`).join('\n');
  console.log(`\n✓ npm test: ${times.length} lệnh xanh trong ${((Date.now() - t0) / 1000).toFixed(1)}s. Chậm nhất:\n${slow}`);
}
