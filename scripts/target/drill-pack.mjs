// Gói luyện tập ngôn ngữ đích (es W2b · fr W2, --tl fr → web/cpack/fr/) (spanish-course.md §10): dựng web/cpack/es/{dr,gx-<ngôn ngữ>}.js từ NGUỒN
//   content/target/es/drills.json (câu điền từ tự soạn gắn điểm ngữ pháp A1–B1) + content/target/es/gx/<ngôn ngữ>.json (giải thích) + grammar-inventory.json.
// Bài CHIA ĐỘNG TỪ sinh ở đây bằng form()/tenses của conjugate.mjs (đáp án = bộ chia đã kiểm chéo Wiktionary 100 % ở conj-check.mjs) → không tay gõ dạng chia.
// Dùng: node scripts/target/drill-pack.mjs          (ghi gói)
//       node scripts/target/drill-pack.mjs --check [--lt]  (--lt = bắt buộc có LT_URL, CI target-content; gói khớp nguồn + bất biến; có LT_URL thì LanguageTool 0 lỗi trên mọi câu điền từ; CI trượt nếu lỗi)
import fs from 'node:fs';
import { readJSON, TL_RULES, ltErrors } from './lib.mjs';
import { TL_GEN } from './tl-gen.mjs';
import { LV, GX_LANGS, TLP, build, sayText } from './drill-lib.mjs';

const ti = process.argv.indexOf('--tl'), TL = ti > 0 ? process.argv[ti + 1] : 'es';
if (!TLP[TL]) { console.error(`✗ tl "${TL}" chưa có dòng TLP (drill-lib.mjs)`); process.exit(2); }
const D = TLP[TL].D, OUT = TLP[TL].OUT, CHECK = process.argv.includes('--check');
const { files, dr, pts, cloze } = build(TL);
const PACKS = `web/packs/${TL}/`, dest = f => f.startsWith('@packs/') ? PACKS + f.slice(7) : OUT + f; // từ lộ trình → web/packs/<tl> (path-lib)
if (!CHECK) {
  fs.mkdirSync(OUT, { recursive: true });
  if (Object.keys(files).some(f => f.startsWith('@packs/'))) fs.mkdirSync(PACKS, { recursive: true });
  for (const [f, s] of Object.entries(files)) fs.writeFileSync(dest(f), s);
  console.log(`✓ drill-pack: ${Object.values(dr).flat().length} câu (${LV.map(l => l + ' ' + dr[l].length).join(' · ')}), ${GX_LANGS.length} ngôn ngữ giải thích`);
  process.exit(0);
}

const errs = [], E = m => errs.push(m);
for (const [f, s] of Object.entries(files)) if (!fs.existsSync(dest(f)) || fs.readFileSync(dest(f), 'utf8') !== s) E(`${dest(f)} cũ so với nguồn – chạy: node scripts/target/drill-pack.mjs`);
for (const f of fs.existsSync(OUT) ? fs.readdirSync(OUT) : []) if (!files[f]) E(`${OUT}${f} mồ côi (không có trong nguồn)`);
for (const f of fs.existsSync(PACKS) ? fs.readdirSync(PACKS) : []) if (!files['@packs/' + f]) E(`${PACKS}${f} mồ côi (không có trong nguồn)`);
const VN = /[ơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹđă]/i, en = readJSON(`${D}gx/en.json`), lint = TL_RULES[TL].lint || [], mix = TL_RULES[TL].mix;
const GXD = Object.fromEntries(GX_LANGS.map(l => [l, readJSON(`${D}gx/${l}.json`)])), kept = (id, seg) => GX_LANGS.filter(l => l !== 'en' && GXD[l][id] && GXD[l][id].x.includes(seg)).length;
for (const p of pts) {
  const cl = cloze[p.id] || [];
  if (cl.length < 3) E(`${p.id}: cần ≥ 3 câu điền từ (có ${cl.length})`);
  cl.forEach((it, i) => {
    const w = `${p.id}#${i + 1}`;
    if ((it.s.match(/___/g) || []).length !== 1) E(`${w}: cần đúng một ___`);
    if (!it.o.includes(it.a)) E(`${w}: đáp án không nằm trong phương án`);
    if (new Set(it.o).size !== it.o.length || it.o.length < 3 || it.o.length > 4) E(`${w}: phương án phải duy nhất, 3–4 mục`);
    if (!it.en) E(`${w}: thiếu bản dịch en`);
    const full = it.s.replace('___', it.a);
    if (lint.some(re => re.test(full))) E(`${w}: lệch chuẩn ${TL} (từ vùng/thông tục): ${full}`);
    if (mix && mix.informal.test(full) && mix.formal.test(full)) E(`${w}: trộn tu + vous: ${full}`);
    if (it.o.some(o => o !== it.a && it.s.replace('___', o) === full)) E(`${w}: phương án trùng đáp án`);
  });
  for (const l of GX_LANGS) {
    const g = GXD[l][p.id];
    if (!g || !g.t || !g.x) { E(`gx/${l}: thiếu ${p.id}`); continue; }
    if (g.x.length > 600 || g.t.length > 80) E(`gx/${l}/${p.id}: quá dài`);
    if (l !== 'vi' && VN.test(g.t + g.x)) E(`gx/${l}/${p.id}: lẫn tiếng Việt`);
    if (l !== 'en' && l !== TL && g.x === en[p.id].x) E(`gx/${l}/${p.id}: chưa dịch (trùng en)`);
    // ví dụ TBN trong "…" phải giữ nguyên: đoạn của bản en mà ĐA SỐ ngôn ngữ giữ nguyên là chữ TBN (đoạn còn lại là lời dịch tiếng Anh, được dịch)
    if (l !== 'en') for (const seg of en[p.id].x.match(/"[^"]+"/g) || []) if (kept(p.id, seg) >= 8 && !g.x.includes(seg)) E(`gx/${l}/${p.id}: mất/sửa ví dụ ${TL} ${seg}`);
  }
}
for (const l of LV) for (const it of dr[l]) if (it[0] === 'c' && (!it[3] || /undefined/.test(it[3] + it[2]))) E(`chia động từ hỏng: ${it}`);
if (process.env.LT_URL) {
  const L = TL_GEN[TL].lt; let n = 0;
  for (const p of pts) for (const it of cloze[p.id] || []) { n++; for (const m of await ltErrors(process.env.LT_URL, L, it.s.replace('___', it.a))) E(`${p.id}: LanguageTool – ${m}: ${it.s.replace('___', it.a)}`); }
  console.log(`LanguageTool: ${n} câu điền từ`);
} else if (process.argv.includes('--lt')) E('thiếu LT_URL – cổng LanguageTool bắt buộc cho câu điền từ ' + TL);
else console.log('(bỏ qua LanguageTool – chưa có LT_URL; CI chạy đủ)');
if (errs.length) { console.error('✗ drill-pack:\n  - ' + errs.slice(0, 60).join('\n  - ') + (errs.length > 60 ? `\n  … +${errs.length - 60}` : '')); process.exit(1); }
console.log(`✓ drill-pack ${TL}: ${pts.length} điểm A1–B1 · ${Object.values(dr).flat().length} câu · ${GX_LANGS.length} ngôn ngữ`);
