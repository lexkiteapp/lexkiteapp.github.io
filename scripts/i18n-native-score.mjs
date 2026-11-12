// O5 native-score (docs/specs/content-upgrade-2.md, docs/I18N-PIPELINE.md): bản giải thích L1 có đọc tự nhiên như GV bản xứ viết không?
// Nguồn chuẩn: tiếng Anh viết gốc content/i18n/en-src/*.json { "<chuỗi vi đang hiển thị>": "<giải thích en>" } (cùng khóa với
// web/i18n/content/<lang>.json mà app.js contentTranslate dùng). Mỗi (khóa × 13 L1):
//   giám khảo A (mode nsback) dịch ngược L1 → en, KHÔNG thấy en gốc;
//   giám khảo B khác họ / khác mô hình (mode nsjudge) so en gốc + L1 + bản dịch ngược → điểm 1–5 (nghĩa khớp + tự nhiên).
//   Thiếu B (hết họ khác) → bỏ qua trung tính, lượt sau chấm lại. Cache theo hash(en + lang + L1) → chỉ chấm mục mới/đổi.
// --fix: mục < 4 → soạn lại L1 thẳng từ en (mode nsgen, không qua tiếng Việt) → B chấm lại (khác họ người soạn) → nhận khi ≥ 4 và hơn bản cũ
//   → content/i18n/native-fixed.json (gen-content-i18n.mjs ưu tiên cao nhất).
// Dùng (CI, .github/workflows/i18n-native-score.yml): node scripts/i18n-native-score.mjs --shard 1/4 --limit 400 [--fix]
//   rồi --merge → content/i18n-native-score.json { avg, min, n, byLang, low[] } (content-score.mjs đọc avg); --check = cổng (avg ≥ 4,3, không mục < 3,5).
import fs from 'fs';
import crypto from 'crypto';
import { pathToFileURL } from 'url';

export const LANGS = ['ar', 'de', 'es', 'fr', 'hi', 'id', 'ja', 'ko', 'pt', 'ru', 'th', 'tr', 'zh'];
export const GATE = { avg: 4.3, min: 3.5 };
export const FIX_MIN = 4;
const NAMES = { ar: 'Arabic', de: 'German', es: 'Spanish', fr: 'French', hi: 'Hindi', id: 'Indonesian', ja: 'Japanese', ko: 'Korean', pt: 'Portuguese (Brazil)', ru: 'Russian', th: 'Thai', tr: 'Turkish', zh: 'Simplified Chinese' };
const SRC_DIR = 'content/i18n/en-src', CACHE_DIR = 'content/i18n/native-score', FIXED = 'content/i18n/native-fixed.json', OUT = 'content/i18n-native-score.json';

export const hash = (...p) => crypto.createHash('sha1').update(p.join('\u0001')).digest('hex').slice(0, 12);
const rd = (f, d) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return d; } };

/** en gốc: gộp mọi file content/i18n/en-src/*.json (khóa trùng phải cùng en – khác là lỗi nguồn) */
export function loadEnSrc(dir = SRC_DIR) {
  const m = {}, clash = [];
  if (!fs.existsSync(dir)) return { m, clash };
  for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.json')).sort()) for (const [k, v] of Object.entries(rd(dir + '/' + f, {}))) {
    if (typeof v !== 'string' || !v.trim()) continue;
    if (m[k] && m[k] !== v) clash.push(k); else m[k] = v;
  }
  return { m, clash };
}

/** lời nhắn cục bộ (không qua /api/lexai build) – một nguồn cho 3 vai */
export const SYS = {
  nsback: lang => `You are a professional ${NAMES[lang]}→English translator. Translate each "t" into natural English, faithfully, without adding or fixing anything. ` +
    'Keep grammar terms, example sentences and symbols (A), (B), →, … as they are. Output JSON {"<k>": {"en": "..."}} for every item.',
  nsjudge: lang => `You are a senior English teacher who is also a native ${NAMES[lang]} speaker. For each item, "src" is the original English explanation ` +
    `written by a native English teacher, "l1" is the ${NAMES[lang]} version shown to learners, and "back" is an independent back-translation of "l1". ` +
    `Score "l1" from 1 to 5: 5 = same meaning as "src" AND reads as if a native ${NAMES[lang]} teacher wrote it; 4 = same meaning, slightly stiff; ` +
    '3 = meaning mostly kept but unnatural or a detail lost; 2 = a wrong or misleading detail (grammar rule, which option is right, example changed); 1 = wrong or not in the target language. ' +
    'English example sentences, grammar forms and option letters must stay in English unchanged. Output JSON {"<k>": {"s": <1-5>, "why": "<≤ 12 words>"}} for every item.',
  nsgen: lang => `You are a native ${NAMES[lang]} English teacher. Rewrite each English explanation "src" for ${NAMES[lang]}-speaking learners in natural, ` +
    `friendly ${NAMES[lang]} – as you would write it yourself, not a word-for-word translation. Keep English examples, grammar forms (am / is / are, tend to + V), ` +
    'option letters (A)–(D), arrows and quotes exactly. Same meaning, nothing added. Output JSON {"<k>": {"t": "..."}} for every item.',
};

/** danh sách việc (khóa × L1) có bản L1, sắp ổn định → chia shard i/N */
export function buildItems(en, packs) {
  const items = [], missing = {};
  for (const lang of LANGS) for (const vi of Object.keys(en).sort()) {
    const l1 = packs[lang] && packs[lang][vi];
    if (!l1) { missing[lang] = (missing[lang] || 0) + 1; continue; }
    items.push({ lang, vi, en: en[vi], l1, h: hash(en[vi], lang, l1) });
  }
  return { items, missing };
}
export const shardOf = (items, i, n) => items.filter((_, k) => k % n === i - 1);

const pick = (out, k, f) => { const v = out && out[k]; const x = v && typeof v === 'object' ? v[f] : v; return x; };
const famOf = r => (r && (r.fam || String(r.model || '').split(/[/:]/)[0])) || '';

/** chấm một lô cùng ngôn ngữ (≤ 10): A dịch ngược, B (khác họ A) chấm. Trả { h: {s, back, why, a, b} } – thiếu B thì mục bị bỏ qua. */
export async function scoreBatch(AI, lang, batch) {
  const items = batch.map((x, i) => ({ k: 'i' + i, t: x.l1 }));
  const a = await AI.judge({ mode: 'nsback', lang, items });
  if (!a) return {};
  const back = batch.map((x, i) => String(pick(a.out, 'i' + i, 'en') || '').trim());
  const jItems = batch.map((x, i) => ({ k: 'i' + i, src: x.en, l1: x.l1, back: back[i] })).filter((_, i) => back[i]);
  if (!jItems.length) return {};
  const b = await AI.judge({ mode: 'nsjudge', lang, items: jItems }, { chain: AI.CHAINS?.judgeB, exclude: [famOf(a)], excludeModels: [a.model], slot: 'B' });
  if (!b) return {};
  const res = {};
  batch.forEach((x, i) => {
    const s = +pick(b.out, 'i' + i, 's');
    if (back[i] && s >= 1 && s <= 5) res[x.h] = { s, back: back[i], why: String(pick(b.out, 'i' + i, 'why') || '').slice(0, 120), a: a.model, b: b.model };
  });
  return res;
}

/** soạn lại L1 từ en (mục < FIX_MIN) → B (khác họ người soạn) chấm → nhận khi ≥ FIX_MIN và hơn điểm cũ */
export async function fixBatch(AI, lang, batch, old) {
  const g = await AI.gen({ mode: 'nsgen', lang, items: batch.map((x, i) => ({ k: 'i' + i, src: x.en })) });
  if (!g) return {};
  const cand = batch.map((x, i) => ({ ...x, l1: String(pick(g.out, 'i' + i, 't') || '').trim() })).filter(x => x.l1 && x.l1 !== x.vi && sameMarks(x.en, x.l1));
  if (!cand.length) return {};
  const items = cand.map(x => ({ ...x, h: hash(x.en, lang, x.l1) }));
  const sc = await scoreBatch({ ...AI, judge: (req, o = {}) => AI.judge(req, { ...o, exclude: [...(o.exclude || []), famOf(g)] }) }, lang, items);
  const ok = {};
  for (const x of items) { const r = sc[x.h]; if (r && r.s >= FIX_MIN && r.s > (old[x.vi] ?? 0)) ok[x.vi] = { l1: x.l1, s: r.s, h: x.h, r }; }
  return ok;
}
/** dấu phải giữ nguyên khi viết lại: (A)–(D), {biến}, thẻ HTML, mũi tên */
export const sameMarks = (a, b) => { const m = s => (s.match(/\([A-D]\)|\{[^}]+\}|<[^>]+>|→/g) || []).sort().join(' '); return m(a) === m(b); };

/** gộp kết quả: chỉ mục còn hiện hành (hash khớp bản L1 hiện tại) */
export function summarize(items, cache, missing = {}) {
  const byLang = {}, low = []; let sum = 0, n = 0, min = 5;
  for (const x of items) {
    const r = cache[x.h]; if (!r) continue;
    const L = byLang[x.lang] = byLang[x.lang] || { n: 0, sum: 0, min: 5 };
    L.n++; L.sum += r.s; L.min = Math.min(L.min, r.s); sum += r.s; n++; min = Math.min(min, r.s);
    if (r.s < FIX_MIN) low.push({ lang: x.lang, vi: x.vi, en: x.en, l1: x.l1, back: r.back, s: r.s, why: r.why });
  }
  for (const L of Object.values(byLang)) { L.avg = +(L.sum / L.n).toFixed(2); delete L.sum; }
  low.sort((a, b) => a.s - b.s || a.lang.localeCompare(b.lang));
  return { avg: n ? +(sum / n).toFixed(2) : 0, min: n ? min : 0, n, total: items.length, keys: new Set(items.map(x => x.vi)).size, byLang, missing, low: low.slice(0, 300), gate: GATE };
}
export function gate(sum) {
  if (!sum || !sum.n) return { ok: true, why: 'chưa có mục nào được chấm (bỏ qua trung tính)' };
  const bad = [];
  if (sum.avg < GATE.avg) bad.push(`avg ${sum.avg} < ${GATE.avg}`);
  if (sum.min < GATE.min) bad.push(`có mục ${sum.min} < ${GATE.min}`);
  return { ok: !bad.length, why: bad.join(' · ') || `avg ${sum.avg} ≥ ${GATE.avg}, min ${sum.min} ≥ ${GATE.min}` };
}

/** bản L1 hiện hành: gói CDN, đè bằng bản đã sửa (native-fixed) khi en gốc chưa đổi */
export function packs(en, read = rd) { const p = {}, fx = read(FIXED, {}); for (const l of LANGS) { p[l] = { ...read(`web/i18n/content/${l}.json`, {}) }; for (const [k, v] of Object.entries(fx[l] || {})) if (en[k] && v && v.l1 && v.en === hash(en[k])) p[l][k] = v.l1; } return p; }
function loadCache() { const c = {}; if (fs.existsSync(CACHE_DIR)) for (const f of fs.readdirSync(CACHE_DIR).filter(f => f.endsWith('.json'))) Object.assign(c, rd(CACHE_DIR + '/' + f, {})); return c; }

/** chuỗi tiếng Việt đang hiển thị của các bài ngữ pháp (trừ trường vi = bản dịch câu ví dụ) – để viết en gốc (lô S-EN) */
/** tệp bài ngữ pháp: web/js/grammar + web/cpack/grammar (bài tải lười dời sang cpack để trả byte người học); bỏ mục lục lười lazy-*.js (bài rút gọn – bản đầy đủ ở cùng thư mục) */
export const grammarFiles = (dirs = GRAMMAR_DIRS) => dirs.filter(d => fs.existsSync(d)).flatMap(d => fs.readdirSync(d).filter(f => f.endsWith('.js') && !/^lazy-/.test(f)).sort().map(f => d + '/' + f));
export const GRAMMAR_DIRS = ['web/js/grammar', 'web/cpack/grammar'];
export async function lessonKeys(ids, dirs = GRAMMAR_DIRS) {
  const vm = await import('vm'), VI = /[ăâđêôơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]/i, g = {}, ctx = vm.createContext({ window: g, self: g, globalThis: g });
  for (const f of grammarFiles([].concat(dirs))) { try { vm.runInContext(fs.readFileSync(f, 'utf8'), ctx); } catch { /* file phụ không tự chạy được */ } }
  const G = g.GRAMMAR || ctx.GRAMMAR || [], res = {};
  for (const id of ids) {
    const l = G.find(x => x.id === id); if (!l) { res[id] = null; continue; }
    const o = []; const walk = v => { if (typeof v === 'string') { const t = v.trim().replace(/\s+/g, ' '); if (t.length > 1 && VI.test(t) && !o.includes(t)) o.push(t); } else if (Array.isArray(v)) v.forEach(walk); else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) if (k !== 'vi') walk(x); };
    walk(l); res[id] = o;
  }
  return res;
}

async function main(argv) {
  const arg = k => { const i = argv.indexOf(k); return i < 0 ? null : (argv[i + 1] || ''); };
  if (argv[0] === '--keys') { // node scripts/i18n-native-score.mjs --keys <id bài>… → { "<vi>": "" } còn thiếu en (dán vào content/i18n/en-src/grammar-<lô>.json rồi viết en)
    const have = loadEnSrc().m, ks = await lessonKeys(argv.slice(1)), out = {};
    for (const [id, list] of Object.entries(ks)) { if (!list) { console.error('✗ không có bài', id); process.exitCode = 1; continue; } for (const k of list) if (!have[k]) out[k] = ''; }
    console.log(JSON.stringify(out, null, 0).replace(/","/g, '",\n"'));
    return;
  }
  const { m: en, clash } = loadEnSrc();
  if (clash.length) { console.error('✗ en-src: khóa trùng khác nội dung:', clash.slice(0, 5)); process.exit(1); }
  const { items, missing } = buildItems(en, packs(en));
  if (argv.includes('--merge') || argv.includes('--check')) {
    const cache = loadCache(), sum = summarize(items, cache, missing);
    if (argv.includes('--merge')) { fs.writeFileSync(OUT, JSON.stringify({ at: new Date().toISOString().slice(0, 10), ...sum }, null, 1) + '\n'); console.log(`✓ native-score: avg ${sum.avg} · min ${sum.min} · ${sum.n}/${sum.total} mục · ${sum.keys} khóa`); }
    const s = argv.includes('--merge') ? sum : rd(OUT, null), g = gate(s);
    console.log((g.ok ? '✓' : '✗') + ' cổng native-score: ' + g.why);
    if (argv.includes('--check') && !g.ok) process.exit(1);
    return;
  }
  const [si, sn] = String(arg('--shard') || '1/1').split('/').map(Number), limit = +(arg('--limit') || 400), mine = rd(`${CACHE_DIR}/part-${si}.json`, {});
  const { createPool, CHAINS } = await import('./lib/ai-pool.mjs');
  const pool = createPool({ budget: { lexai: 0 }, prompt: req => ({ sys: SYS[req.mode](req.lang), user: JSON.stringify(req.items), temp: req.mode === 'nsgen' ? 0.4 : 0.1 }) });
  const AI = { ...pool, CHAINS };
  // NS_MIN: dừng đúng hạn để CI kịp lưu phần đã chấm (quá giờ job bị hủy → mất hết, run 42953904883); chốt cứng +4 phút nếu một lô treo trong hàng chờ pool
  const deadline = Date.now() + (+process.env.NS_MIN || 1e6) * 60000, late = () => Date.now() > deadline;
  const notice = why => { const by = Object.entries(pool.stats().by).map(([k, v]) => `${k} ${v.ok}/${v.fail}/${v.bad}`).join(' · '); console.log(`::notice title=native-score shard ${si}::${why} · ${Object.keys(mine).length} mục · ok/fail/bad: ${by}`.slice(0, 1800)); };
  if (process.env.NS_MIN) setTimeout(() => { notice('chốt cứng hết giờ'); process.exit(0); }, +process.env.NS_MIN * 60000 + 240000).unref();
  const cache = loadCache(), part = `${CACHE_DIR}/part-${si}.json`;
  const todo = shardOf(items, si, sn).filter(x => !cache[x.h]).slice(0, limit);
  console.log(`shard ${si}/${sn}: ${todo.length} mục mới (tổng ${items.length}, thiếu L1 ${JSON.stringify(missing)})`);
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  for (const lang of LANGS) {
    const L = todo.filter(x => x.lang === lang);
    for (let i = 0; i < L.length && !late(); i += 10) { const r = await scoreBatch(AI, lang, L.slice(i, i + 10)); Object.assign(mine, r); Object.assign(cache, r); fs.writeFileSync(part, JSON.stringify(mine)); }
  }
  if (argv.includes('--fix')) {
    const fixed = rd(FIXED, {}), mineItems = shardOf(items, si, sn);
    for (const lang of LANGS) {
      const low = mineItems.filter(x => x.lang === lang && cache[x.h] && cache[x.h].s < FIX_MIN), old = Object.fromEntries(low.map(x => [x.vi, cache[x.h].s]));
      for (let i = 0; i < low.length && !late(); i += 8) {
        const ok = await fixBatch(AI, lang, low.slice(i, i + 8), old);
        for (const [vi, v] of Object.entries(ok)) { (fixed[lang] = fixed[lang] || {})[vi] = { l1: v.l1, s: v.s, en: hash(en[vi]) }; mine[v.h] = v.r; }
        fs.writeFileSync(part, JSON.stringify(mine)); fs.writeFileSync(FIXED, JSON.stringify(fixed, null, 1) + '\n');
        if (Object.keys(ok).length) console.log(`  ${lang}: sửa ${Object.keys(ok).length}`);
      }
    }
  }
  notice(late() ? 'hết NS_MIN, phần còn lại để lượt sau' : 'xong');
  console.log('✓ xong shard', si, '·', Object.keys(mine).length, 'mục đã chấm trong part');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main(process.argv.slice(2));
