#!/usr/bin/env node
// Chấm ảnh TOEIC Part 1 bằng AI thị giác miễn phí (Workers AI, cùng nhà cung cấp với scripts/video/library.mjs).
// Chấm MÙ: đưa ảnh + 4 câu (không nói đáp án) → mô hình chọn câu đúng + đánh giá từng câu + chữ trong ảnh.
// PASS = mô hình chọn đúng đáp án của đề VÀ cả 3 câu nhiễu bị đánh "false".
//   node scripts/toeic/photo-qc.mjs [test...] [--model scout|llama32|gemma] [--out file.json]
// Chỉ đọc; không đổi dữ liệu. Token: CLOUDFLARE_API_TOKEN hoặc ~/.config/lexkite/cf-token (không in ra).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { cfVisionProvider, CF_VISION, CF_ACCOUNT } from '../video/library.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args.splice(i, 2)[1] : d; };
const model = CF_VISION[opt('model', 'scout')];
const out = opt('out', '');
const tests = args.length ? args.map(Number) : Array.from({ length: 20 }, (_, i) => i + 1);

/** Lấy các câu Part 1 có ảnh từ web/js/toeic/listening<n>.js. */
export function part1Items(n) {
  const f = path.join(ROOT, `web/js/toeic/listening${n}.js`);
  if (!fs.existsSync(f)) return [];
  const g = {}; vm.runInNewContext(fs.readFileSync(f, 'utf8'), { window: g, self: g, globalThis: g });
  return ((g.TOEIC || {}).listening || []).filter(p => p.part === 1)
    .flatMap(p => p.groups.flatMap(gr => gr.items || [])).filter(it => it.img)
    .map(it => ({ test: n, n: it.n, img: it.img, a: it.a, s: it.s || it.o || it.options }));
}

const PROMPT = s => `You are checking a TOEIC Part 1 photograph question. Look ONLY at what is visible in the photo.
Statements:
${s.map((x, i) => `(${'ABCD'[i]}) ${x}`).join('\n')}
For each statement decide if it is TRUE (clearly visible in the photo) or FALSE. Then pick the ONE statement that best describes the photo.
Also list any readable text/words/numbers in the photo, and any visual defects (blur, distorted faces or hands, watermark).
Reply with ONE flat JSON object only, keys in this order: "why" (one short reason per statement, separated by ;), then "A","B","C","D" (each "T" or "F", matching your reasons), then "best" (the letter), "text" (readable text in the photo, or ""), "defects" (visual defects, or "").`;

const parse = r => { if (r && typeof r === 'object') return r; const m = String(r || '').match(/\{[\s\S]*\}/); try { return m ? JSON.parse(m[0]) : null; } catch { return null; } };

async function main() {
  const token = process.env.CLOUDFLARE_API_TOKEN || (() => { try { return fs.readFileSync(path.join(os.homedir(), '.config/lexkite/cf-token'), 'utf8').trim(); } catch { return ''; } })();
  const prov = cfVisionProvider(model), deps = { fetch, cfToken: token, cfAccount: process.env.CLOUDFLARE_ACCOUNT_ID || CF_ACCOUNT };
  const rows = [];
  for (const n of tests) for (const it of part1Items(n)) {
    const b64 = fs.readFileSync(path.join(ROOT, 'web', it.img)).toString('base64');
    let j = null, err = '', raw = null;
    try { raw = await prov.run({ prompt: PROMPT(it.s), b64 }, deps); j = parse(raw); if (!j) { const m = String(raw).match(/answer is \(?([ABCD])\b/i); if (m) j = { best: m[1], loose: true }; else err = 'unparsed: ' + String(raw).slice(0, 200); } } catch (e) { err = e.message; }
    const best = j ? 'ABCD'.indexOf(String(j.best || '').trim()[0]) : -1;
    const tf = j ? 'ABCD'.split('').map(k => String(j[k] ?? '?').trim().toUpperCase()[0] || '?').join('') : '';
    const falseOk = it.s.every((_, i) => i === it.a || tf[i] === 'F');
    const row = { id: `t${n}-q${it.n}`, img: it.img, key: 'ABCD'[it.a], ai: best >= 0 ? 'ABCD'[best] : '?', pass: best === it.a && falseOk, falseOk,
      text: (j && j.text) || [], defects: (j && j.defects) || [], tf, why: (j && j.why) || '', err };
    rows.push(row);
    console.log(`${row.pass ? 'PASS' : 'FLAG'} ${row.id} key=${row.key} ai=${row.ai} distractorsFalse=${falseOk} text=${JSON.stringify(row.text).slice(0, 80)} ${err}`);
    if (!row.pass && row.why) console.log(`   tf=${row.tf} ${String(row.why).slice(0, 400)}`);
  }
  if (out) fs.writeFileSync(out, JSON.stringify({ model, at: new Date().toISOString(), rows }, null, 1));
  console.log(`${rows.filter(r => r.pass).length}/${rows.length} PASS (${model})`);
}
if (import.meta.url === pathToFileURL(process.argv[1]).href) main();
