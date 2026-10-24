#!/usr/bin/env node
// Giám khảo GỌI TÊN (cổng chính của QC ảnh minh hoạ, strict.mjs): hỏi mô hình thị giác "ảnh này vẽ cái gì" mà KHÔNG nói từ đích,
// rồi khớp tên với đồng nghĩa của thẻ. Nhà cung cấp: /api/studio op visionCheck (wai:0 → bỏ Llama YES/NO, đi Gemini – kho khóa Lexkite).
// Không trả lời (hết hạn mức) = KHÔNG đạt ('judge unavailable') – nghiêm: không có giám khảo thì không có ảnh.
//   node scripts/vocab-img/judge.mjs --out <dir> --attempt N   → <dir>/judge.aN.json { key: { ans, provider, pass, reasons, named, hit } }
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { JUDGE_Q, judgeVerdict } from './strict.mjs';
import { slug } from './gen.mjs';

const arg = n => { const i = process.argv.indexOf('--' + n); return i > 0 ? process.argv[i + 1] : undefined; };
const OUT = arg('out') || 'out/vocab-img', ATT = +(arg('attempt') || 1);
const ROOT = new URL('../../', import.meta.url), rd = p => JSON.parse(fs.readFileSync(new URL(p, ROOT), 'utf8'));
const API = process.env.STUDIO_API || 'https://lexkite.com/api/studio';

/** ảnh → base64 JPEG ≤ ~60 KB (384 px) bằng python PIL (có sẵn trên CI và venv) */
function small(file) {
  const py = process.env.VIMG_PY || 'python3';
  return execFileSync(py, ['-c', 'import sys,io,base64;from PIL import Image;b=io.BytesIO();Image.open(sys.argv[1]).convert("RGB").resize((384,384)).save(b,"JPEG",quality=85);sys.stdout.write(base64.b64encode(b.getvalue()).decode())', file]).toString();
}
export async function ask(b64, tries = 3) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Studio-Secret': process.env.STUDIO_CALLBACK_SECRET || '', 'User-Agent': 'lexkite-ci' },
        body: JSON.stringify({ op: 'visionCheck', gemini: 1, wai: 0, question: JUDGE_Q, ask: 'Name the main thing in this picture in 1-3 words.', images: [b64] }) });
      if (r.status === 429) { await new Promise(s => setTimeout(s, 20e3)); continue; }
      const j = await r.json().catch(() => ({}));
      if (!j.text) { if (i < tries - 1) { await new Promise(s => setTimeout(s, 8e3)); continue; } return { ans: null, provider: j.provider || 'none', why: (j.tried || []).join(',').slice(0, 120) || String(r.status) }; }
      const t = String(j.text); let ans = null; try { ans = JSON.parse(t.slice(t.indexOf('{'), t.lastIndexOf('}') + 1)); } catch (e) { /* bỏ */ }
      if (ans && Array.isArray(ans.frames)) ans = null;   // trả lời kiểu Llama YES/NO (máy chủ cũ) – không phải gọi tên
      return { ans, provider: j.provider };
    } catch (e) { if (i === tries - 1) return { ans: null, provider: 'none', why: String(e.message).slice(0, 80) }; }
  }
  return { ans: null, provider: 'none', why: 'rate' };
}
async function main() {
  const lex = rd('dist/lexicon.json'), cards = rd('content/lexicon/vimg-cards.json').items, KEY = Object.fromEntries(Object.keys(lex).map(k => [slug(k), k]));
  const f = path.join(OUT, `judge.a${ATT}.json`), res = fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : {};
  const files = fs.readdirSync(path.join(OUT, 'raw')).filter(x => x.endsWith(`.a${ATT}.jpg`));
  let ok = 0;
  for (const x of files) {
    const k = KEY[x.slice(0, -`.a${ATT}.jpg`.length)]; if (!k || (res[k] && res[k].ans)) { ok += !!(res[k] && res[k].pass); continue; }
    const card = cards[k]; if (!card || card.skip) { res[k] = { ans: null, pass: false, reasons: ['no card'] }; continue; }
    const a = await ask(small(path.join(OUT, 'raw', x)));
    const v = judgeVerdict(lex[k].pos, card, a.ans); res[k] = { ...a, ...v }; ok += v.pass;
    console.log(k, v.pass ? 'PASS' : 'FAIL', v.reasons.join('; '), '·', a.provider, '·', JSON.stringify(a.ans || a.why).slice(0, 160));
  }
  fs.writeFileSync(f, JSON.stringify(res, null, 1));
  console.log(`giám khảo lần ${ATT}: ${ok}/${files.length} gọi đúng tên`);
}
if (path.resolve(process.argv[1] || '') === path.resolve(new URL(import.meta.url).pathname)) main();
