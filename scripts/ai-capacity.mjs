#!/usr/bin/env node
// Ước lượng sức chứa AI việc nền → web/data/ai-capacity.json (Quản trị › Khóa API › thẻ "Sức chứa AI việc nền", docs/API-KEYS.md §8–9).
//   node scripts/ai-capacity.mjs [--check]   (--check: chỉ in, không ghi)
// Hàng đợi (số lần gọi) tính từ repo; hạn mức mỗi tuyến = số đo 24/10 (sửa MEASURED khi đo lại). Số khóa Gemini sống lấy TRỰC TIẾP trong trang quản trị (kho khóa).
import fs from 'fs';
import { doneWords } from './lexicon/expand/lib.mjs';
import { items as explainItems, LANGS as XL } from './explain/sets.mjs';

export const MEASURED = {
  _at: '2026-10-24',
  gemini: { flashRpdPerKey: 20, flashModels: 4, liteRpdPerKey: 135, note: 'mỗi KHÓA phải thuộc một dự án Google Cloud riêng – hạn mức tính theo dự án, không theo khóa' },
  'gc-cf': { keys: 70, ciCallsPerDay: 115000, keep: 0.9, vocabImgShare: 1100, model: 'gpt-oss-120b · llama-3.3-70b', note: 'GrabCast MAX 24/10: 1.500/phút, 115.000/ngày/khóa (230.000/tài khoản); xô IP generate 300/phút → ai-pool nhịp 270/phút – chung cho Groq + Cloudflare; ×90 %, trừ vocab-img' },
  jobs: { lexiconWordsPerDay: 400, explainCallsPerDay: 800, scriptsPerDay: 400, note: 'kích thước lượt hằng ngày (--n lexicon, --calls explain × 2 bộ, --max script-bank) – tăng ở workflow nếu muốn nhanh hơn' },
  cf2: { neuronsPerDay: 10000, grants: 3500, neuronsPerCall: 300, model: 'gpt-oss-120b', status: 'chờ quyền Workers AI (token tài khoản 2: 10000 Authentication error)' },
  'gc-groq': { keys: 108, callsPerDay: 0, status: 'sống 24/10 (gpt-oss-120b) – tính chung trong hạn mức GrabCast ở dòng Cloudflare' },
};
const ceil = Math.ceil;

export function workload() {
  // lexicon-expand: 12k từ mục tiêu; mỗi 10 từ = lxgen + lxtr + 2 giám khảo
  const done = doneWords().size, words = Math.max(0, 12000 - done), b = ceil(words / 10);
  const lex = { words, gen: 2 * b, genGeminiOnly: b, judgeA: b, judgeB: b }; // lxgen (Llama 70B được) + lxtr (chỉ Gemini/gpt-oss)
  // explain: mỗi bộ – xgen (6/lần) + 2 giám khảo en (10/lần) + mỗi ngôn ngữ xtr (8/lần) + 2 giám khảo (10/lần)
  const ex = { gen: 0, genGeminiOnly: 0, judgeA: 0, judgeB: 0, items: 0 };
  for (const set of ['usage', 'grammar']) {
    let all = []; try { all = explainItems(set); } catch { continue; }
    const f = new URL(`../content/explain/${set}.json`, import.meta.url), DB = fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : {};
    const missEn = all.filter(x => !DB[x.id]).length, unjEn = all.filter(x => !DB[x.id] || DB[x.id].sc?.en == null).length;
    ex.items += all.length; ex.gen += ceil(missEn / 6); ex.judgeA += ceil(unjEn / 10); ex.judgeB += ceil(unjEn / 10);
    for (const l of XL) { const m = all.filter(x => !DB[x.id] || !DB[x.id][l]).length, u = all.filter(x => !DB[x.id] || DB[x.id].sc?.[l] == null).length; ex.gen += ceil(m / 8); ex.judgeA += ceil(u / 10); ex.judgeB += ceil(u / 10); }
    ex.genGeminiOnly = ex.gen; // xgen/xtr: Llama cấm → chỉ Gemini / gpt-oss
  }
  // script-bank: mỗi 20 kịch bản = vgen + 1 giám khảo khác họ
  let sb = { left: 0 }; try { sb = JSON.parse(fs.readFileSync(new URL('../web/data/script-bank.json', import.meta.url), 'utf8')); } catch { /* chưa có */ }
  const sbb = ceil((sb.left || 0) / 20);
  const scr = { scripts: sb.left || 0, gen: sbb, genGeminiOnly: 0, judgeA: 0, judgeB: sbb };
  // vocab-img: giám khảo gọi tên thị giác ≈ 400 ảnh/ngày (nhịp do vẽ ảnh quyết định, không phải hàng đợi hữu hạn)
  const vimg = { perDay: 400 };
  const sum = k => lex[k] + ex[k] + scr[k];
  return { lexicon: lex, explain: ex, scriptBank: scr, vocabImg: vimg, total: { gen: sum('gen'), genGeminiOnly: sum('genGeminiOnly'), judge: sum('judgeA') + sum('judgeB') } };
}

/** số ngày để xong hàng đợi với k khóa Gemini (các tuyến khác theo MEASURED). Dùng chung cho trang quản trị (công thức giống web/js/admin-keys.js). */
export function daysFor(k, W, M = MEASURED) {
  const flash = k * M.gemini.flashRpdPerKey * M.gemini.flashModels, lite = k * M.gemini.liteRpdPerKey;
  const gc = Math.max(0, M['gc-cf'].ciCallsPerDay * M['gc-cf'].keep - M['gc-cf'].vocabImgShare), cf2 = M.cf2.status.startsWith('chờ') ? 0 : M.cf2.grants / M.cf2.neuronsPerCall;
  // trần API: việc "chỉ Gemini/gpt-oss" chạy trên Gemini + GrabCast gpt-oss + tk2; mọi việc trên mọi tuyến
  const api = Math.max(W.total.genGeminiOnly / Math.max(1e-9, flash + gc + cf2), (W.total.gen + W.total.judge) / Math.max(1e-9, flash + lite + gc + cf2));
  // trần lượt hằng ngày của từng việc (thường là giới hạn thật khi GrabCast còn lượt)
  const J = M.jobs, ex = W.explain.gen + W.explain.judgeA;
  const job = Math.max(W.lexicon.words / J.lexiconWordsPerDay, ex / J.explainCallsPerDay, W.scriptBank.scripts / J.scriptsPerDay);
  return Math.max(api, job);
}

if (process.argv[1] && process.argv[1].endsWith('ai-capacity.mjs')) {
  const W = workload(), table = [0, 1, 2, 5, 10, 15, 20, 30].map(k => { const d = daysFor(k, W); return { keys: k, days: Number.isFinite(d) && d < 1e5 ? +d.toFixed(1) : null }; });
  const out = { updated: new Date().toISOString(), measured: MEASURED, workload: W, table };
  console.log(JSON.stringify({ workload: W.total, lex: W.lexicon.words, explainItems: W.explain.items, scripts: W.scriptBank.scripts, table }));
  if (!process.argv.includes('--check')) { fs.mkdirSync(new URL('../web/data/', import.meta.url), { recursive: true }); fs.writeFileSync(new URL('../web/data/ai-capacity.json', import.meta.url), JSON.stringify(out, null, 1) + '\n'); }
}
