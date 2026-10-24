// 🛡️ CỔNG QA NỘI DUNG – bắt buộc cho MỌI nguồn nội dung học (docs/CONTENT-QA.md). Chạy trong npm test + .github/workflows/content-qa.yml.
//   node scripts/content-qa/gate.mjs                 kiểm; đỏ khi lỗi CỨNG hoặc số lỗi cũ (baseline) TĂNG
//   node scripts/content-qa/gate.mjs --json          + ghi reports/content-qa.json (bản tin / admin Chất lượng)
//   node scripts/content-qa/gate.mjs --lower-baseline   chỉ HẠ baseline khi đã sửa bớt lỗi (không bao giờ nâng)
// Lỗi CỨNG (không bao giờ vào baseline): nguồn chưa đăng ký · mục sinh tự động xuất ra mà chưa có 2 giám khảo đồng ý ·
//   mục trong hàng duyệt bị xuất · lô thiếu kiểm mẫu 5% / sai > 2% mà chưa "rejected" · dịch sinh tự động hỏng biến/ô/chữ viết · thẻ lời giải không lọc mục bị báo lỗi.
// Lỗi CŨ (nội dung soạn tay trước cổng): đếm theo nguồn × loại kiểm → content/qa/baseline.json, chỉ được giảm (sửa theo LOẠI, METHODS "Làm đúng 1 lần").
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { CE, VI, lvOk, pairOk, agree, trIssues, spot, cefrOver, norm } from './lib.mjs';
import { loadAll } from '../lexicon/lib.mjs';
import { loadContent } from '../lib/content-load.mjs';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const P = (...a) => path.join(ROOT, ...a), ex = f => fs.existsSync(P(f)), J = f => JSON.parse(fs.readFileSync(P(f), 'utf8'));
const ARG = new Set(process.argv.slice(2));
const hard = [], cnt = {}, sample = {}, info = {};
const H = (src, m) => hard.push(`${src}: ${m}`);
const C = (src, chk, where) => { const k = src + '/' + chk; cnt[k] = (cnt[k] || 0) + 1; (sample[k] = sample[k] || []).length < 3 && sample[k].push(where); };
const LANGS = ['en', ...fs.readFileSync(P('scripts/i18n-langs.txt'), 'utf8').split('\n').map(s => s.trim()).filter(s => s && !s.startsWith('#'))];

// ---------- 0) Sổ đăng ký nguồn: MỌI thư mục nội dung phải có chủ + cách kiểm (thư mục mới chưa đăng ký → đỏ) ----------
const REG = J('content/qa/sources.json');
const dirs = [...fs.readdirSync(P('content'), { withFileTypes: true }).filter(d => d.isDirectory()).map(d => 'content/' + d.name),
  ...fs.readdirSync(P('web/js'), { withFileTypes: true }).filter(d => d.isDirectory() && !['vendor', 'i18n'].includes(d.name)).map(d => 'web/js/' + d.name)];
for (const d of dirs) if (!REG.sources.some(s => (s.paths || []).some(p => p === d || p.startsWith(d + '/') || d.startsWith(p + '/'))) && !(REG.skip || {})[d]) H('đăng ký', `${d} chưa có trong content/qa/sources.json (thêm nguồn + cách kiểm, hoặc "skip" kèm lý do)`);
for (const s of REG.sources) { if (!s.owner || !s.checks || !s.checks.length) H('đăng ký', `${s.id}: thiếu owner/checks`); for (const t of s.delegate || []) if (!fs.readFileSync(P('package.json'), 'utf8').includes(t)) H('đăng ký', `${s.id}: test uỷ quyền "${t}" không có trong npm test`); }

// ---------- Kho từ (đối chiếu từ + CEFR) ----------
const LEX = new Map();
for (const { row, file, line } of loadAll()) {
  const [w, , pos, vi, , , , , level] = row, where = `${path.basename(file)}:${line + 1} ${w}`;
  if (!w || !pos || !vi) C('vocab', 'schema', where);
  if (level && !lvOk(level)) C('vocab', 'cefr', where + ' (' + level + ')');
  const k = String(w || '').toLowerCase(); if (k && !LEX.has(k)) LEX.set(k, level || '');
}
info.vocab = LEX.size;
const known = w => LEX.has(String(w).toLowerCase());

// ---------- Ngữ pháp · đọc · phát âm (dữ liệu soạn tay trong web/js) ----------
const K = loadContent();
for (const x of K.GRAMMAR || []) {
  if (!lvOk(x.level)) C('grammar', 'cefr', x.id);
  for (const [i, q] of (x.quiz || []).entries()) {
    const opts = q.options || [];
    if (!q.q || opts.length < 2 || !(q.answer >= 0 && q.answer < opts.length) || new Set(opts.map(norm)).size !== opts.length) C('grammar', 'schema', `${x.id}#${i}`);
    if (!q.explain || !String(q.explain).trim()) C('grammar', 'explain', `${x.id}#${i}`);
  }
}
for (const r of K.READINGS || []) {
  if (!lvOk(r.level)) C('reading', 'cefr', r.id);
  for (const [i, q] of (r.questions || []).entries()) if (q.answer == null || !q.explain) C('reading', 'schema', `${r.id}#${i}`);
}
{ const g = {}; g.self = g; g.window = g; vm.createContext(g); for (const f of ['sounds', 'skills']) vm.runInContext(fs.readFileSync(P('web/js/pron', f + '.js'), 'utf8'), g);
  for (const x of g.PRON || []) { if (!lvOk(x.level)) C('pron', 'cefr', x.id); for (const w of (x.words || []).map(v => v.w || v)) if (typeof w === 'string' && /^[a-z]+$/i.test(w) && !known(w)) C('pron', 'lexicon', `${x.id}:${w}`); } }

// ---------- Cách dùng từ: cặp ✗/✓ + đối chiếu kho từ + độ phủ ghi chú ----------
{ const g = { console }; g.self = g; g.window = g; vm.createContext(g);
  for (const f of fs.readdirSync(P('web/js/usage'))) vm.runInContext(fs.readFileSync(P('web/js/usage', f), 'utf8'), g);
  vm.runInContext(fs.readFileSync(P('web/js/usage-core.js'), 'utf8'), g);
  let n = 0, noted = 0;
  for (const [k, src] of Object.entries(g.LK_USAGE_SRC || {})) {
    const r = g.LK_USAGE.parse(k, src); for (const e of r.errors || []) C('usage', 'schema', `${k}: ${e}`);
    for (const e of r.entries) {
      n++; if ((e.notes || []).length || (e.mis || []).length) noted++;
      if (!/\s/.test(e.key) && /^[a-z-]+$/i.test(e.key) && !known(e.key)) C('usage', 'lexicon', `${k}:${e.key}`);
      for (const m of e.mis || []) { if (!pairOk(m.w, m.r)) C('usage', 'pair', `${k}:${e.key} “${m.w}”`); if (!m.en) C('usage', 'explain-en', `${k}:${e.key}`); }
      for (const it of e.items || []) for (const s of it.ex || []) if (!/\[[^\]]+\]/.test(s)) C('usage', 'schema', `${k}:${e.key} ví dụ thiếu [đáp án]`);
    }
  }
  info.usage = { entries: n, withNotes: noted, pct: n ? Math.round(noted / n * 100) : 0 };
}

// ---------- Giao tiếp tự tin: CEFR bài + cặp ✗/✓ (not → say) + nghĩa/lý do đủ en ----------
for (const f of fs.readdirSync(P('content/confidence/units')).filter(f => f.endsWith('.json'))) {
  const u = J('content/confidence/units/' + f);
  if (!['A1', 'A2', 'B1', 'B2'].includes(u.level)) C('confidence', 'cefr', u.id);
  for (const p of u.phrases || []) {
    if (p.not && !pairOk(p.not, p.say, p.gap)) C('confidence', 'pair', `${u.id}:${p.id}`);
    if (!p.mean || !p.mean.en || !p.why || !p.why.en) C('confidence', 'schema', `${u.id}:${p.id}`);
    if (cefrOver(p.say, u.level, LEX, new Set(norm(p.gap || '').split(' '))).length > 1) C('confidence', 'cefr-fit', `${u.id}:${p.id}`);
  }
}

// ---------- Lời giải sinh tự động (content/explain/<bộ>.json): 2 giám khảo + dịch – lỗi CỨNG ----------
const queue = ex('content/qa/review-queue.json') ? J('content/qa/review-queue.json') : { items: [] };
const queued = new Set([...(queue.items || []).map(x => x.src + '|' + x.id + '|' + (x.lang || '')), ...(ex('content/explain/review.json') ? J('content/explain/review.json') : []).map(x => 'explain|' + x.id + '|' + x.lang)]);
const XDB = {}; for (const f of fs.readdirSync(P('content/explain')).filter(f => f.endsWith('.json') && f !== 'review.json')) Object.assign(XDB, J('content/explain/' + f));
for (const sub of ex('web/js/explain') ? fs.readdirSync(P('web/js/explain'), { withFileTypes: true }).filter(d => d.isDirectory()).map(d => d.name) : []) {
  for (const l of LANGS) {
    const out = P('web/js/explain', sub, l + '.json'); if (!fs.existsSync(out)) continue;
    const pub = JSON.parse(fs.readFileSync(out, 'utf8'));
    for (const [id, row] of Object.entries(pub)) {
      const d = XDB[id], fb = Array.isArray(row) && row[5] === 1, ll = fb ? 'en' : l, qa = d && d.qa && d.qa[ll]; // cờ 1 = phần giải thích tiếng Anh dự phòng → xét giám khảo bản en
      if (!d) { H('explain', `${sub}/${l} xuất mục không có nguồn: ${id}`); continue; }
      const a = agree(qa); if (!a.ok) H('explain', `${sub}/${l} ${id}: ${a.why} – phải vào hàng duyệt, không xuất`);
      if (queued.has('explain|' + id + '|' + ll)) H('explain', `${sub}/${l} ${id}: đang ở hàng duyệt nhưng đã xuất`);
      if (fb) continue;
      if (l !== 'en' && d[l] && d.en) { const is = trIssues(d.en.why, d[l].why, l, { bt: qa && qa.bt }); if (is.length) H('explain', `${set}/${l} ${id}: dịch – ${is.join(', ')}`); }
    }
  }
}
// thẻ lời giải phải lọc mục bị học viên báo sai (api/report op 'hidden')
if (!/op":"hidden"/.test(fs.readFileSync(P('web/js/explain-card.js'), 'utf8')) || !/flagContent/.test(fs.readFileSync(P('functions/api/report.js'), 'utf8'))) H('báo lỗi', 'mất cơ chế tự ẩn mục bị báo sai (report.js flagContent + explain-card.js hidden)');

// ---------- Lời giải đề thi dịch sẵn (web/i18n/explain/<lang>.json – bot dịch đêm): QA dịch, lỗi CŨ theo ngôn ngữ ----------
{ const en = J('web/i18n/explain/en.json');
  for (const l of LANGS.filter(l => l !== 'en')) { const f = `web/i18n/explain/${l}.json`; if (!ex(f)) continue; const d = J(f);
    for (const [k, v] of Object.entries(d)) { const is = trIssues(en[k] || '', v, l); for (const i of is) C('explain-i18n', `${l}:${i}`, k); } } }

// ---------- Lô nội dung (content/qa/batches/*.json): kiểm mẫu ≥ 5%, sai ≤ 2% – lỗi CỨNG ----------
if (ex('content/qa/batches')) for (const f of fs.readdirSync(P('content/qa/batches')).filter(f => f.endsWith('.json'))) {
  const b = J('content/qa/batches/' + f), s = spot(b);
  if (!b.source || !REG.sources.some(x => x.id === b.source)) H('lô', `${f}: source "${b.source}" chưa đăng ký`);
  if (!s.ok && b.status !== 'rejected') H('lô', `${f}: ${s.why} – đánh dấu "rejected" và gỡ mục khỏi nguồn`);
  if (s.ok && b.status === 'rejected') H('lô', `${f}: đạt kiểm mẫu nhưng ghi "rejected" – kiểm lại`);
}

// ---------- So baseline (chỉ được giảm) ----------
const BF = 'content/qa/baseline.json', base = ex(BF) ? J(BF).counts || {} : {};
const up = Object.entries(cnt).filter(([k, n]) => n > (base[k] || 0)), down = Object.entries(base).filter(([k, n]) => (cnt[k] || 0) < n);
for (const [k, n] of up) H('baseline', `${k}: ${n} > ${base[k] || 0} (lỗi MỚI cùng loại – sửa nội dung, không nâng baseline). Ví dụ: ${(sample[k] || []).join(' · ')}`);
if (ARG.has('--init-baseline') && !ex(BF)) { fs.mkdirSync(P('content/qa'), { recursive: true }); fs.writeFileSync(P(BF), JSON.stringify({ _doc: 'Số lỗi CŨ theo nguồn/loại kiểm (scripts/content-qa/gate.mjs). Chỉ được GIẢM: --lower-baseline. Không sửa tay để nâng.', at: new Date().toISOString().slice(0, 10), counts: cnt }, null, 1) + '\n'); console.log('baseline khởi tạo:', Object.keys(cnt).length, 'loại'); process.exit(0); }
if (ARG.has('--lower-baseline')) {
  const next = {}; for (const [k, n] of Object.entries(base)) if (cnt[k]) next[k] = Math.min(n, cnt[k]);
  fs.writeFileSync(P(BF), JSON.stringify({ _doc: 'Số lỗi CŨ theo nguồn/loại kiểm (scripts/content-qa/gate.mjs). Chỉ được GIẢM: --lower-baseline. Không sửa tay để nâng.', at: new Date().toISOString().slice(0, 10), counts: next }, null, 1) + '\n');
}
if (ARG.has('--json')) { fs.mkdirSync(P('reports'), { recursive: true }); fs.writeFileSync(P('reports/content-qa.json'), JSON.stringify({ at: new Date().toISOString(), hard, counts: cnt, base, info }, null, 1)); }
const tot = Object.values(cnt).reduce((a, b) => a + b, 0);
if (hard.length) { console.error('✗ content-qa:\n  ' + hard.slice(0, 40).join('\n  ') + (hard.length > 40 ? `\n  … +${hard.length - 40}` : '')); process.exit(1); }
console.log(`✓ content-qa: ${REG.sources.length} nguồn đăng ký · ${info.vocab} từ · lỗi cũ ${tot} (≤ baseline${down.length ? `, ${down.length} loại đã giảm → chạy --lower-baseline` : ''}) · cách dùng từ có ghi chú ${info.usage.pct}%`);
