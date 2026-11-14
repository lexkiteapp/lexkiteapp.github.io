// ĐO THỬ nguồn vi GPL (11/11, chủ duyệt "Đo thử, không vào app"; từ điển Anh–Việt Hồ Ngọc Đức – GPL, tải TRONG job, gpl_probe.py).
// Chỉ in CON SỐ: bao nhiêu mục trượt vì vi sẽ qua được nếu có nguồn đó. Không ghi repo, không artifact, không chữ nào của từ điển ra log.
//   node gpl-probe.mjs --sample <out.json>                                  → mẫu cố định từ hàng duyệt + retry (hạt 1111)
//   node gpl-probe.mjs --count <sample.json> --gpl <gpl.json> --viwk <viwk.json> → đếm
// Mẫu: hàng duyệt «dịch vi: không có ≥ 2 nguồn độc lập trùng» (q2) + PRE_N mục retry ngẫu nhiên (hạt cố định). Đo tất định, KHÔNG gọi AI (câu trả lời AI cũ không lưu):
//   noVi    = 0 nguồn vi người viết (humanSrc.vi = 0 → lọc trước AI); noViGpl = trong đó GPL có nghĩa cùng từ loại → vào được vòng AI (cận trên, chưa xét ví dụ)
//   gplAgree = có vi người viết nhưng chưa có 2 nguồn NGƯỜI VIẾT trùng; thêm GPL → có phương án ≥ 2 nguồn người viết (viAgreeSources) – qua lớp «≥ 2 nguồn»
//              không cần AI họ A/B đồng ý (vẫn còn phản bác AI + trắc nghiệm 3 giám khảo → cận trên)
import fs from 'fs';
import { QUEUE, viAgreeSources } from './lib.mjs';
import { kaikki, pmap } from './wikt.mjs';

const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const J = f => JSON.parse(fs.readFileSync(f, 'utf8'));
const PRE_N = 2000, SEED = 1111;
const rng = (s => () => (s = (s * 1103515245 + 12345) % 2147483648) / 2147483648)(SEED);
const split = k => { const i = k.lastIndexOf('#'); return { w: k.slice(0, i), pos: k.slice(i + 1) }; };

if (arg('--sample')) {
  const q = (J(QUEUE).items || []).filter(x => x.src === 'lexicon-expand' && String((x.why || [])[0]).startsWith('dịch vi: không có ≥ 2 nguồn')).map(x => String(x.id)).sort();
  const qs = new Set(q), rt = (J('content/lexicon/expand/retry/words.json').items || []).filter(k => !qs.has(k)).sort();
  for (let i = rt.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [rt[i], rt[j]] = [rt[j], rt[i]]; }
  const items = [...q.map(k => ({ ...split(k), g: 'q2' })), ...rt.slice(0, PRE_N).map(k => ({ ...split(k), g: 'pre' }))];
  fs.writeFileSync(arg('--sample'), JSON.stringify({ seed: SEED, items }));
  console.log(`mẫu: q2 ${q.length} · pre ${Math.min(PRE_N, rt.length)}/${rt.length}`);
} else {
  const S = J(arg('--count')).items, G = J(arg('--gpl')), WV = (() => { try { return J(arg('--viwk')); } catch { return {}; } })();
  const stat = {}, r = {}, Z = () => ({ n: 0, err: 0, noVi: 0, noViGpl: 0, base: 0, gplHas: 0, gplAgree: 0 });
  await pmap(S, 10, async e => {
    const k = e.w + '#' + e.pos, o = r[e.g] ||= Z(); o.n++;
    const kc = await kaikki(e.w, e.pos, stat); if (kc.err) { o.err++; return; }
    const wk = [...(kc.vi || []).map(v => v.w), ...(kc.trg || []).flatMap(g => (g.tr || {}).vi || [])], wv = WV[k] || [], gp = G[k] || [];
    if (gp.length) o.gplHas++;
    if (!wk.length && !wv.length) { o.noVi++; if (gp.length) o.noViGpl++; return; }
    if (viAgreeSources({ wk, wv }).length) { o.base++; return; } // nguồn cũ đã trùng (bảng dịch đủ mọi nghĩa – rộng hơn job) → không tính cho GPL
    if (gp.length && viAgreeSources({ wk, wv, gpl: gp }).some(x => x.src.includes('gpl'))) o.gplAgree++;
  });
  const out = { at: new Date().toISOString(), licence: 'GPL – chỉ đo trong CI, không dùng trong app', ...r };
  console.log(JSON.stringify(out, null, 1));
  const L = (g, t) => { const o = r[g] || Z(); return `- ${t}: ${o.n} mục (lỗi mạng ${o.err}) · GPL có nghĩa cùng từ loại ${o.gplHas} · 0 nguồn vi người viết ${o.noVi} → **GPL mở ${o.noViGpl}** · vi người viết đã trùng sẵn ${o.base} · **thêm GPL thành ≥ 2 nguồn người viết trùng ${o.gplAgree}**`; };
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, ['## Đo thử nguồn vi GPL (Hồ Ngọc Đức) – chỉ con số', '',
    L('q2', 'Hàng duyệt «không có ≥ 2 nguồn trùng»'), L('pre', `Mẫu retry (hạt ${SEED})`), '',
    'Cận trên: mục qua lớp vi vẫn còn phản bác AI, trắc nghiệm 3 giám khảo, ví dụ người viết. Giấy phép GPL: tải vào RUNNER_TEMP, xoá cuối job, không commit/artifact. Dùng thật cần xem giấy phép riêng + chủ quyết.', ''].join('\n'));
}
