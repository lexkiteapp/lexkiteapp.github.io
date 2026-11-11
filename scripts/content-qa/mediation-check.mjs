// Cổng bài trung gian (mediation, O3 – docs/specs/mediation.md): content/mediation/m<NN>.json.
// Kiểm: khuôn + id/tên file, cấp + mục tiêu Can-do M.* có thật (content/framework/lkf.json, lệch ≤ 1 bậc), loại hoạt động,
// nguồn đúng loại + độ dài theo cấp, nhiệm vụ (write/speak, khoảng số từ), ý bắt buộc ≥ 3 + ý nên bỏ ≥ 1,
// bài mẫu: đủ số từ, đạt MỌI ý bắt buộc, KHÔNG chứa ý nên bỏ, không chép nguyên ≥ 8 từ liền từ nguồn (trung gian = diễn đạt lại),
// checks không quá rộng (một từ khóa ≥ 3 ký tự, không phải từ chức năng), chữ tiếng Anh (không còn tiếng Việt).
// Dùng: node scripts/content-qa/mediation-check.mjs [thư mục]   → mã 1 khi có lỗi. Hàm thuần xuất ra để test.
import fs from 'fs';
import { pathToFileURL } from 'url';

export const LEVELS = ['A2', 'B1', 'B2', 'C1', 'C2'];
export const ACTIVITIES = ['relay', 'summarise', 'explain-data', 'simplify', 'notes', 'facilitate'];
export const SOURCE_KINDS = ['announcement', 'text', 'email', 'notice', 'dialogue', 'chart', 'talk'];
export const SOURCE_MAX = { A2: 120, B1: 220, B2: 350, C1: 500, C2: 650 };
export const COPY_RUN = 8;
const VI = /[ăâđêôơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]/i;
const STOP = new Set(['the', 'and', 'but', 'for', 'you', 'are', 'was', 'not', 'his', 'her', 'its', 'our', 'can', 'has', 'had', 'this', 'that', 'with', 'from', 'they', 'them', 'then', 'than', 'have', 'will', 'what', 'when']);

export const words = s => (String(s || '').match(/[A-Za-z0-9][A-Za-z0-9'’:%.-]*/g) || []).map(w => w.replace(/[.]+$/, '')).filter(Boolean);
export const norm = s => ' ' + String(s || '').toLowerCase().replace(/[’‘]/g, "'").replace(/[–—]/g, '-').replace(/\s+/g, ' ') + ' ';
/** ý đạt khi MỌI nhóm checks có ít nhất một cụm xuất hiện (không phân biệt hoa thường) */
export const hit = (text, checks) => { const t = norm(text); return (checks || []).length > 0 && checks.every(g => (g || []).some(k => t.includes(String(k).toLowerCase()))); };
export function sourceText(src) {
  if (!src) return '';
  if (src.kind === 'chart') return [src.caption, ...(src.cols || []), ...(src.rows || []).flat(), src.note].filter(x => x != null).join(' ');
  if (src.kind === 'dialogue') return (src.lines || []).map(l => (l && l.t) || '').join(' ');
  return Array.isArray(src.text) ? src.text.join(' ') : String(src.text || '');
}
/** cụm ≥ COPY_RUN từ liền nhau của bài mẫu có nguyên văn trong nguồn */
export function copied(model, source, n = COPY_RUN) {
  const m = words(model).map(w => w.toLowerCase()), s = ' ' + words(source).map(w => w.toLowerCase()).join(' ') + ' ';
  for (let i = 0; i + n <= m.length; i++) { const run = m.slice(i, i + n).join(' '); if (s.includes(' ' + run + ' ')) return run; }
  return '';
}
const lvl = l => LEVELS.indexOf(l) + 1; // A2=1 … (A1 không có bài trung gian)
const base = l => String(l || '').slice(0, 2);

export function checkItem(x, file, lkf) {
  const E = [], w = `${file}`;
  const e = m => E.push(`${w}: ${m}`);
  if (!x || typeof x !== 'object') return [`${w}: không phải object`];
  if (!/^m\d{2,3}$/.test(x.id || '') || (file && !file.endsWith(x.id + '.json'))) e(`id "${x.id}" phải là mNN và trùng tên file`);
  if (!LEVELS.includes(x.level)) e(`level "${x.level}" ∉ ${LEVELS.join('/')}`);
  if (!ACTIVITIES.includes(x.activity)) e(`activity "${x.activity}" ∉ ${ACTIVITIES.join('/')}`);
  const lo = lkf && lkf.get(x.lo);
  if (!lo) e(`lo "${x.lo}" không có trong content/framework/lkf.json`);
  else if (lo.skill !== 'M') e(`lo ${x.lo} không phải mục tiêu trung gian (M.*)`);
  else if (LEVELS.includes(x.level) && Math.abs(lvl(base(lo.level)) - lvl(x.level)) > 1) e(`lo ${x.lo} (${lo.level}) lệch cấp bài ${x.level} quá 1 bậc`);
  for (const k of ['title', 'scenario', 'model', 'explain']) if (typeof x[k] !== 'string' || x[k].trim().length < 8) e(`thiếu ${k}`);
  // nguồn
  const s = x.source || {};
  if (!SOURCE_KINDS.includes(s.kind)) e(`source.kind "${s.kind}" ∉ ${SOURCE_KINDS.join('/')}`);
  if (s.kind === 'chart') {
    if (!Array.isArray(s.cols) || !s.cols.length || !Array.isArray(s.rows) || s.rows.length < 3) e('chart cần cols + ≥ 3 rows');
    else if (s.rows.some(r => !Array.isArray(r) || r.length !== s.cols.length + 1 || typeof r[0] !== 'string' || r.slice(1).some(v => typeof v !== 'number'))) e('mỗi row = [nhãn, số × cols]');
    if (!s.caption) e('chart thiếu caption');
  } else if (s.kind === 'dialogue') { if (!Array.isArray(s.lines) || s.lines.length < 3 || s.lines.some(l => !l || !l.s || !l.t)) e('dialogue cần ≥ 3 lines {s, t}'); }
  else if (!sourceText(s).trim()) e('source.text trống');
  const srcW = words(sourceText(s)).length;
  if (LEVELS.includes(x.level) && srcW > SOURCE_MAX[x.level]) e(`nguồn ${srcW} từ > ${SOURCE_MAX[x.level]} cho ${x.level}`);
  // nhiệm vụ
  const t = x.task || {};
  if (!['write', 'speak'].includes(t.mode)) e('task.mode phải là write | speak');
  if (!t.prompt || !t.audience) e('task cần prompt + audience (trung gian luôn có người nhận)');
  if (!(t.min_words > 0 && t.max_words > t.min_words)) e('task.min_words < max_words');
  // ý
  const pts = Array.isArray(x.points) ? x.points : [], lo2 = Array.isArray(x.leave_out) ? x.leave_out : [];
  if (pts.length < 3) e(`cần ≥ 3 ý bắt buộc (có ${pts.length})`);
  if (lo2.length < 1) e('cần ≥ 1 ý nên bỏ (leave_out) – trung gian là chọn lọc cho người nhận');
  const ids = new Set();
  for (const p of [...pts, ...lo2]) {
    if (!p || !p.idea || !Array.isArray(p.checks) || !p.checks.length || p.checks.some(g => !Array.isArray(g) || !g.length)) { e(`ý "${p && (p.id || p.idea)}" cần idea + checks [[…]]`); continue; }
    for (const g of p.checks) for (const k of g) { const kk = String(k).toLowerCase().trim(); if (kk.length < 2 || STOP.has(kk)) e(`checks quá rộng "${k}" (${p.id || p.idea})`); }
  }
  for (const p of pts) { if (!p.id) e(`ý bắt buộc thiếu id: ${p.idea}`); else if (ids.has(p.id)) e(`id ý trùng ${p.id}`); else ids.add(p.id); }
  // bài mẫu
  const mw = words(x.model).length;
  if (t.min_words && (mw < t.min_words || mw > t.max_words)) e(`bài mẫu ${mw} từ ∉ [${t.min_words}, ${t.max_words}]`);
  for (const p of pts) if (p.checks && !hit(x.model, p.checks)) e(`bài mẫu thiếu ý "${p.id}"`);
  for (const p of lo2) if (p.checks && hit(x.model, p.checks)) e(`bài mẫu chứa ý nên bỏ: ${p.idea}`);
  const cp = copied(x.model, sourceText(s)); if (cp) e(`bài mẫu chép nguyên văn nguồn: "${cp}"`);
  if (!Array.isArray(x.useful) || x.useful.length < 3) e('cần ≥ 3 cụm useful');
  if (!Array.isArray(x.tips) || x.tips.length < 2) e('cần ≥ 2 tips');
  const all = JSON.stringify(x); if (VI.test(all)) e('còn chữ tiếng Việt – nội dung viết gốc tiếng Anh (L1 sinh trên CI)');
  return E;
}

export function loadLkf(f = 'content/framework/lkf.json') { const d = JSON.parse(fs.readFileSync(f, 'utf8')); return new Map(d.objectives.map(o => [o.id, o])); }

export function run(dir = 'content/mediation', lkf = loadLkf()) {
  if (!fs.existsSync(dir)) return { files: 0, errors: [] };
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.json')).sort(), errors = [], los = new Map();
  for (const f of files) {
    let x; try { x = JSON.parse(fs.readFileSync(dir + '/' + f, 'utf8')); } catch (err) { errors.push(`${f}: JSON lỗi ${err.message}`); continue; }
    errors.push(...checkItem(x, f, lkf));
    if (x && x.lo) { if (los.has(x.lo + '|' + x.activity + '|' + x.title)) errors.push(`${f}: trùng bài ${los.get(x.lo + '|' + x.activity + '|' + x.title)}`); los.set(x.lo + '|' + x.activity + '|' + x.title, f); }
  }
  return { files: files.length, errors };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { files, errors } = run(process.argv[2] || 'content/mediation');
  if (errors.length) { console.error('✗ mediation-check:\n' + errors.map(x => '  - ' + x).join('\n')); process.exit(1); }
  console.log(`✓ mediation-check: ${files} bài trung gian đạt (Can-do M.*, nguồn theo cấp, bài mẫu đủ ý + không chép nguồn)`);
}
