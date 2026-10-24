#!/usr/bin/env node
// Đăng ảnh CẢNH đã qua giám khảo cảnh (ngưỡng độ chính xác cao vimg-judge-scene.json) của lượt `fill` – docs/LEXICON.md § Ảnh mọi nghĩa.
//   node scripts/vocab-img/scene-publish.mjs --dir m --stage .media-out         chép final/<h>.webp|.avif → .media-out/vimg/ (scripts/media/push.mjs --kind img đẩy lên kho open, nay m4)
//   node scripts/vocab-img/scene-publish.mjs --dir m --index [--variants 4]      SAU khi đẩy thành công: img.json (+ kind scene, repo), thẻ cảnh mới, hàng chờ sửa prompt, báo cáo
// Không bao giờ đăng ảnh chưa chấm: chỉ mục result.json pass (giám khảo cảnh) + kind scene. Ô khái niệm (hư từ) không đăng ở đây.
// Hàng chờ content/lexicon/vimg-scene-queue.json: nghĩa đã thử ĐỦ biến thể mà không ảnh nào qua → lượt sau bỏ qua tới khi sửa prompt/thẻ rồi xoá khỏi hàng.
// Giám khảo không trả lời (queue: vision judge unavailable) KHÔNG vào hàng chờ (lượt sau vẽ/chấm lại).
import fs from 'fs';
import path from 'path';
import { STYLE } from './style.mjs';
import { pick, load } from './media-repo.mjs';

const arg = n => { const i = process.argv.indexOf('--' + n); return i > 0 ? process.argv[i + 1] : undefined; };
const ROOT = new URL('../../', import.meta.url), P = p => new URL(p, ROOT).pathname, rd = p => JSON.parse(fs.readFileSync(p, 'utf8'));
const D = arg('dir') || 'm', R = rd(path.join(D, 'result.json')), V = +(arg('variants') || 4);
// CHỈ ảnh AI được giám khảo cảnh chấm (có câu trả lời thị giác) – ô chữ dự phòng (src concept, nghĩa không có thẻ) KHÔNG BAO GIỜ là ảnh cảnh
// (lượt 40088424311: 1.900 ô chữ lọt vì scene_final đánh dấu pass cho fallback 'type' → đã gỡ)
const ok = Object.entries(R.items).filter(([, r]) => r.pass && r.h && r.kind === 'scene' && r.src !== 'concept' && r.f && r.f.ask_yes === true && r.att);

if (arg('stage')) {
  const dst = path.join(arg('stage'), 'vimg'); fs.mkdirSync(dst, { recursive: true }); let n = 0;
  for (const [, r] of ok) for (const ext of ['webp', 'avif']) { const f = path.join(D, 'final', `${r.h}.${ext}`); if (fs.existsSync(f)) { fs.copyFileSync(f, path.join(dst, `${r.h}.${ext}`)); n++; } }
  console.log(`✓ chuẩn bị ${n} tệp (${ok.length} ảnh) → ${dst}`); process.exit(0);
}
if (!process.argv.includes('--index')) { console.error('dùng --stage <dir> | --index'); process.exit(2); }

const IMG = P('content/lexicon/img.json'), SC = P('content/lexicon/vimg-scenes.json'), QF = P('content/lexicon/vimg-scene-queue.json');
const img = rd(IMG), now = new Date().toISOString().slice(0, 10), BATCH = process.env.GITHUB_RUN_ID || now, reg = load();
let n = 0;
for (const [k, r] of ok) {
  if (img.rejected[k] || (img.items[k] && img.items[k].h && img.items[k].src && img.items[k].src.tier === 'ai')) continue;
  const prev = img.items[k] || {}, f = r.f || {};
  // dự phòng Noto/Wikimedia: ảnh AI qua cổng THAY h (icon); ảnh Wikimedia ở trường photo giữ cho trang tra từ tới khi soát
  img.items[k] = { h: r.h, url: img.base + r.h + '.webp', alt: k.split('#')[0], sv: STYLE.v, fmt: ['webp', 'avif'], kind: 'scene', ...(r.alpha ? { bg: 'alpha' } : {}),
    src: { tier: 'ai', lic: 'own', by: 'Lexkite' }, q: { score: +(+f.clip_ex || 0).toFixed(3), vision: f.ask_model || 'gc-vision', conf: f.ask_conf, tries: r.tries || r.att || 1 },
    ph: f.ph, at: now, b: BATCH, repo: pick(reg, `vimg/${r.h}.webp`).id, ...(prev.photo ? { photo: prev.photo } : {}) };
  n++;
}
const sorted = o => Object.fromEntries(Object.entries(o).sort(([a], [b]) => (a < b ? -1 : 1)));
img.items = sorted(img.items); fs.writeFileSync(IMG, JSON.stringify(img, null, 1) + '\n');
// thẻ cảnh do các việc ma trận viết (chỉ THÊM, không đè thẻ đã có / thẻ chủ sửa)
const cur = fs.existsSync(SC) ? rd(SC) : { items: {} }; let c = 0;
for (const f of fs.readdirSync(D).filter(f => /^cards\..*\.json$/.test(f))) for (const [k, v] of Object.entries(rd(path.join(D, f)).items || {})) if (!cur.items[k]) { cur.items[k] = v; c++; }
cur.items = sorted(cur.items); fs.writeFileSync(SC, JSON.stringify(cur, null, 1) + '\n');
// hàng chờ: thử đủ V biến thể, không ảnh nào qua (lý do cuối ghi lại để sửa prompt)
const q = fs.existsSync(QF) ? rd(QF) : { _note: 'Nghĩa cảnh đã thử đủ biến thể mà không ảnh nào qua giám khảo cảnh – fill bỏ qua tới khi sửa thẻ (vimg-scenes.json) / prompt rồi xoá mục khỏi đây (scene-publish.mjs).', items: {} };
let qn = 0;
for (const [k, r] of Object.entries(R.items)) {
  if (r.kind !== 'scene' || r.pass || q.items[k] || img.items[k] && img.items[k].kind === 'scene') continue;
  const why = (r.reasons || []).join('; ');
  if ((r.tries || 0) >= V && !/vision judge unavailable/.test(why)) { q.items[k] = { at: now, tries: r.tries, why: why.slice(0, 160), b: BATCH }; qn++; }
}
q.items = sorted(q.items); fs.writeFileSync(QF, JSON.stringify(q, null, 1) + '\n');
// báo cáo lượt: ảnh nhận, lượt gọi GrabCast / ảnh nhận, mã HTTP (gửi GrabCast)
const gs = fs.readdirSync(D).filter(f => /^gen-stats\./.test(f)).map(f => rd(path.join(D, f)));
const sum = key => gs.reduce((a, g) => a + (+g.gc[key] || 0), 0), codes = {};
for (const g of gs) for (const [c_, v] of Object.entries(g.gc.by_code || {})) codes[c_] = (codes[c_] || 0) + v;
const imgs = gs.reduce((a, g) => a + g.images, 0), calls = sum('submit');
const rep = { run: BATCH, accepted: n, images_generated: imgs, gc_image_calls: calls, calls_per_accepted: n ? +(calls / n).toFixed(1) : null, images_per_accepted: n ? +(imgs / n).toFixed(1) : null,
  http: codes, s5xx: sum('s5xx'), s429: sum('s429'), ai_busy: sum('ai_busy'), ai_unavailable: sum('ai_unavailable'), ai_exhausted: sum('ai_exhausted'), safety_refused: sum('safety'), safety_rephrased: gs.reduce((a, g) => a + (g.safety_rephrased || 0), 0), safety_failed: gs.reduce((a, g) => a + (g.safety_failed || 0), 0), job_err: sum('job_err'), timeout: sum('timeout'), net: sum('net'), s5xx_rate: calls ? +(sum('s5xx') / calls).toFixed(3) : 0,
  cards_added: c, queued: qn, scene_total: Object.values(img.items).filter(x => x.kind === 'scene').length, img_total: Object.values(img.items).filter(x => x.h).length };
fs.writeFileSync(path.join(D, 'fill-report.json'), JSON.stringify(rep, null, 1));
console.log(JSON.stringify(rep));
if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### Ảnh cảnh fill\n\n\`\`\`json\n${JSON.stringify(rep, null, 1)}\n\`\`\`\n`);
