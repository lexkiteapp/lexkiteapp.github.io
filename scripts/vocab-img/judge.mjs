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
import { createPool } from '../lib/ai-pool.mjs';

const arg = n => { const i = process.argv.indexOf('--' + n); return i > 0 ? process.argv[i + 1] : undefined; };
const OUT = arg('out') || 'out/vocab-img', ATT = +(arg('attempt') || 1);
const ROOT = new URL('../../', import.meta.url), rd = p => JSON.parse(fs.readFileSync(new URL(p, ROOT), 'utf8'));

/** ảnh → base64 JPEG ≤ ~60 KB (384 px) bằng python PIL (có sẵn trên CI và venv) */
function small(file) {
  const py = process.env.VIMG_PY || 'python3';
  return execFileSync(py, ['-c', 'import sys,io,base64;from PIL import Image;b=io.BytesIO();Image.open(sys.argv[1]).convert("RGB").resize((384,384)).save(b,"JPEG",quality=85);sys.stdout.write(base64.b64encode(b.getvalue()).decode())', file]).toString();
}
// Chuỗi giám khảo: ai-pool (scripts/lib/ai-pool.mjs) CHAINS.vision = 1) GrabCast thị giác (CHỈ khi có env GRABCAST_AI_VISION_URL – đo 24/10:
//   /api/owner-ai/generate BỎ QUA ảnh) → 2) Gemini kho khóa Lexkite qua /api/studio visionCheck (wai:0 = không Workers AI tài khoản chính)
//   → 3) Workers AI TÀI KHOẢN 2 Llama 4 Scout (chỉ khi điều phối cấp neuron) → không ai trả lời = HÀNG CHỜ (không bao giờ đăng ảnh chưa chấm).
let AI = null;
export async function ask(b64) {
  AI = AI || createPool({ log: () => {} });
  const r = await AI.vision({ question: JUDGE_Q, ask: 'Name the main thing in this picture in 1-3 words.', image: b64 });
  if (!r) return { ans: null, provider: 'none', why: 'no route' };
  const ans = r.out && !Array.isArray(r.out.frames) ? r.out : null;   // trả lời kiểu Llama YES/NO (máy chủ cũ) – không phải gọi tên
  return { ans, provider: r.route + ':' + r.model };
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
