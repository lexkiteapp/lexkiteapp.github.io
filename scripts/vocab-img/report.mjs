#!/usr/bin/env node
import { fileURLToPath } from 'node:url';
// Neuron + tỷ lệ đạt THẬT của một lượt ảnh cảnh (fill và pilot) – docs/VOCAB-IMG-STYLE.md §12.
//   node scripts/vocab-img/report.mjs --dir m [--out m/fill-report.json]   (pilot: job final; fill: scene-publish gọi neuronReport)
// Vẽ: neuron/ảnh của mô hình THẬT (gen-stats cf.npi – bảng giá Workers AI; klein-4b 512² = 1 ô ra 26,05 + 1 ô vào 5,37), không hằng schnell 57,6
// (báo cáo lượt fill 41205453283 ghi 57,6 trong khi vẽ klein). Thị giác: neuron từ usage token (judge-api vision_neurons), thiếu → 31/lượt.
// Lượt kiểm chứng (VIMG_JUDGE_AUDIT, chỉ pilot) tính riêng audit_neurons – không vào giá mỗi ảnh vì fill không chạy.
import fs from 'fs';
import path from 'path';

const rd = p => JSON.parse(fs.readFileSync(p, 'utf8'));
export const VISION_EST = 31;
export function neuronReport(D) {
  const ls = re => (fs.existsSync(D) ? fs.readdirSync(D).filter(f => re.test(f)).map(f => rd(path.join(D, f))) : []);
  const gs = ls(/^gen-stats\./), ja = ls(/^judge-api\./);
  const imgs = gs.reduce((a, g) => a + (+g.images || 0), 0);
  const draw = gs.reduce((a, g) => a + (+g.images || 0) * (+(g.cf && g.cf.npi) || 31.4), 0);
  const calls = ja.reduce((a, j) => a + (+j.vision_calls || 0), 0);
  const vis = ja.reduce((a, j) => a + (j.vision_neurons != null ? +j.vision_neurons : (+j.vision_calls || 0) * VISION_EST), 0);
  const sum = k => ja.reduce((a, j) => a + (+j[k] || 0), 0);
  return { images: imgs, draw_neurons: Math.round(draw), npi: imgs ? +(draw / imgs).toFixed(1) : null, vision_calls: calls, vision_neurons: Math.round(vis),
    vision_per_image: imgs ? +(calls / imgs).toFixed(2) : null, second_model_calls: sum('second_model_calls'), size_fail_local: sum('size_fail_local'), acct_dead: sum('acct_dead'),
    vision_tok_missing: sum('vision_tok_missing'), audit: { calls: sum('audit_calls'), neurons: Math.round(sum('audit_neurons')), disagree: sum('audit_disagree') }, total: Math.round(draw + vis) };
}
/** ảnh đạt trên 1.000 neuron (hiệu suất kho CF; 11/11 lượt 1 ảnh ≈ 6,4) */
export const accPerKneuron = (accepted, neurons) => neurons > 0 ? +(accepted * 1000 / neurons).toFixed(2) : null;
/** tỷ lệ đạt theo ẢNH (ảnh cảnh vẽ ra → ảnh nhận sau nén ≤ 6 KB) + theo loại từ – result.json của scene_final.py */
export function passReport(D) {
  const R = rd(path.join(D, 'result.json')).items || {}, J = {};
  for (let a = 1; a <= 6; a++) { const f = path.join(D, `judge.local.a${a}.json`); if (fs.existsSync(f)) for (const [k, v] of Object.entries(rd(f))) if (v.kind === 'scene') (J[k] = J[k] || []).push(v); }
  const by = {}, why = {}; let drawn = 0, ok = 0, first = 0;
  for (const [k, js] of Object.entries(J)) {
    // (b) 01/11: lượt có VIMG_CANDS → mỗi mục giám khảo gồm `cands` ảnh vẽ; first_round = nghĩa đạt ngay biến thể 1 (trước mọi lần vẽ lại)
    const pos = k.split('#')[1] || '?', acc = !!(R[k] && R[k].pass && R[k].kind === 'scene'), n = js.reduce((a, j) => a + (+j.cands || 1), 0); drawn += n; ok += acc; first += !!(js[0] && js[0].pass);
    const b = (by[pos] = by[pos] || { images: 0, accepted: 0, senses: 0 }); b.images += n; b.accepted += acc; b.senses++;
    for (const j of js) if (!j.pass) { const r = String((j.reasons || [''])[0]).replace(/[:(].*/, '').trim(); why[r] = (why[r] || 0) + 1; }
    if (R[k] && !R[k].pass && /size/.test((R[k].reasons || []).join())) why['size > 6 KB (final)'] = (why['size > 6 KB (final)'] || 0) + 1;
  }
  const senses = Object.keys(J).length;
  return { scene_images: drawn, scene_accepted: ok, pass_rate: drawn ? +(ok / drawn).toFixed(3) : null, senses, first_round: first, first_round_rate: senses ? +(first / senses).toFixed(3) : null, by_pos: by, fail_first_reason: why };
}
if (path.resolve(process.argv[1] || '') === path.resolve(fileURLToPath(new URL(import.meta.url)))) {
  const arg = n => { const i = process.argv.indexOf('--' + n); return i > 0 ? process.argv[i + 1] : undefined; };
  const D = arg('dir') || 'm', nr = neuronReport(D), pr = fs.existsSync(path.join(D, 'result.json')) ? passReport(D) : {};
  const scenesShare = nr.images && pr.scene_images != null ? pr.scene_images / nr.images : 1;   // pilot cũng vẽ bìa/bài học: chia neuron theo phần ảnh cảnh
  const rep = { dir: D, ...pr, neurons: nr, neurons_per_accepted: pr.scene_accepted ? Math.round(nr.total * scenesShare / pr.scene_accepted) : null };
  fs.writeFileSync(arg('out') || path.join(D, 'fill-report.json'), JSON.stringify(rep, null, 1));
  console.log(JSON.stringify(rep));
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### Ảnh cảnh – tỷ lệ đạt + neuron\n\n\`\`\`json\n${JSON.stringify(rep, null, 1)}\n\`\`\`\n`);
}
