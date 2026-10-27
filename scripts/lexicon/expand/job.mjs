#!/usr/bin/env node
import { fileURLToPath } from 'node:url';
// Mở rộng kho từ tới 20k (docs/LEXICON.md §Mở rộng 20k) – việc nền `lexicon-expand` (infra/jobs.json), chạy trên CI, tiếp tục được, idempotent.
//   node scripts/lexicon/expand/job.mjs --candidates <candidates.json> --cmu <cmudict.dict> [--n 400] [--pilot] [--calls 400] [--batch <id>] [--dry] [--no-retry]
// Mỗi từ: IPA Mỹ CMUdict (BSD-2) · IPA Anh Wiktionary qua kaikki.org (CC BY-SA 4.0, ghi công) · nghĩa WordNet làm khung
//   → /api/lexai lxgen (Gemini: định nghĩa ≤ B1, 2 ví dụ, cụm, đồng nghĩa, CEFR, chủ đề, vi, lỗi hay gặp vi) → lxtr (13 ngôn ngữ)
//   → 2 giám khảo KHÁC HỌ (gemini + gemma) chấm mục + từng bản dịch + dịch ngược → cổng (scripts/lexicon/expand/lib.mjs gateEntry).
// Đạt → content/lexicon/expand/pending/<lô>.json (CHƯA xuất). Trượt → content/qa/review-queue.json (src lexicon-expand). Không bao giờ xuất thẳng:
// xuất = `promote.mjs` sau khi soát mẫu ≥ 5 % (docs/CONTENT-QA.md lớp 6) → content/lexicon/expand/<lô>.json + content/qa/batches/lx-<lô>.json.
import fs from 'fs';
import { execFileSync } from 'child_process';
import { arpaToIpa, badChars } from '../ipa.mjs';
import { ROOT, rd, wr, loadAll } from '../lib.mjs';
import { assignTopics, buildTopicSets, TAX } from './topics.mjs';
import { gateEntry, defPosOk, DEF_POS_FIX, doneWords, LANGS, TOPIC_CHOICES, QUEUE, queueable, hasGap } from './lib.mjs';
import { createPool, judgeKey } from '../../lib/ai-pool.mjs';
import { kaikki, clean, pmap } from './wikt.mjs';
import { espeakUK } from './espeak.mjs';
import { parseCmu, pickPron, heteronym, ipaAgrees } from './cmu.mjs';
const arg = (n, d) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : d; };
const N = +arg('--n', 400), CALLS = +arg('--calls', 400), PILOT = process.argv.includes('--pilot'), DRY = process.argv.includes('--dry'), NORETRY = process.argv.includes('--no-retry'); // --no-retry: lượt kiểm nhỏ, không đụng danh sách làm lại
const API = process.env.LEXAI_URL || 'https://lexkite.com/api/lexai';
const BATCH = arg('--batch', new Date().toISOString().slice(0, 10).replace(/-/g, '') + (PILOT ? '-pilot' : ''));
const C = JSON.parse(fs.readFileSync(arg('--candidates'), 'utf8'));
const t0 = Date.now(), stat = { calls: 0, fail: 0, kaikki: 0, ukMiss: 0 };

// ---- chọn từ: nối tiếp (theo tần suất) hoặc pilot rải đều dải tần suất × nhóm WordNet
const done = doneWords();
const RETRY = 'content/lexicon/expand/retry/words.json', retry = fs.existsSync(new URL(RETRY, ROOT)) ? JSON.parse(rd(RETRY)) : { _doc: 'Từ làm lại ở lượt kế (lỗ dữ liệu nguồn – không vào hàng duyệt). job.mjs tự thêm/bớt.', items: [] };
const want = new Set(retry.items.map(k => k.split('#')[0]));
let pool = C.items.filter(e => !done.has(e.w) && !want.has(e.w)); // từ làm lại KHÔNG tính vào N từ mới
if (PILOT) {
  const by = new Map(); for (const e of pool) { const b = Math.min(5.5, Math.max(2.5, e.band)); (by.get(b) || by.set(b, []).get(b)).push(e); }
  const bands = [...by.keys()].sort((a, b) => b - a), pick = [];
  for (const b of bands) { const l = by.get(b), lx = new Map(); for (const e of l) (lx.get(e.lex) || lx.set(e.lex, []).get(e.lex)).push(e); by.set(b, [...lx.values()]); }
  for (let r = 0; pick.length < N; r++) { let any = false; for (const b of bands) { const groups = by.get(b), g = groups[r % groups.length]; const e = g && g.shift(); if (e) { pick.push(e); any = true; } if (pick.length >= N) break; } if (!any && r > 5000) break; }
  pool = pick;
} else pool = pool.slice(0, N);
// làm lại TRƯỚC: lỗ dữ liệu nguồn + mục đưa về chờ (content/lexicon/expand/retry/words.json) – ngoài N từ mới
if (!NORETRY) { const inPool = new Set(pool.map(e => e.w)); const seenW = new Set(); pool = [...C.items.filter(e => want.has(e.w) && !done.has(e.w) && !inPool.has(e.w) && !seenW.has(e.w) && seenW.add(e.w)), ...pool]; stat.retry = pool.length - Math.min(N, pool.length); }
console.log(`lexicon-expand ${BATCH}: ${pool.length} từ (đã có ${done.size}) · bands ${JSON.stringify(pool.reduce((o, e) => (o[e.band] = (o[e.band] || 0) + 1, o), {}))}`);

// ---- IPA: CMUdict (Mỹ) + Wiktionary/kaikki (Anh, Mỹ dự phòng)
const CMU = parseCmu(fs.readFileSync(arg('--cmu'), 'latin1'));
// Mỹ: biến thể CMUdict THEO TỪ LOẠI (cmu.mjs pickPron – reuse#v /riˈjuːz/). Anh: Wiktionary theo từ loại; từ đổi trọng âm/hữu thanh danh–động
// (heteronym) → chọn ứng viên Anh KHỚP biến thể Mỹ đã chọn (ipaAgrees); không ứng viên nào khớp → trượt 'ipa-pos' (hàng duyệt, không đoán).
// UK: Wiktionary → (thiếu) espeak-ng en-gb đã hiệu chuẩn (espeak-calib.mjs: 300 từ, khớp gần 94 % ≥ 90 %) → src.ipaUK = 'espeak'.
// Vẫn thiếu = lỗ dữ liệu nguồn → bỏ qua (KHÔNG vào hàng duyệt), lượt sau làm lại.
const VIW = {};
const KK = {}; // Wiktionary (kaikki): ví dụ dùng + bảng dịch theo nghĩa – nguồn người viết
const ipa = await pmap(pool, 10, async e => { const k = await kaikki(e.w, e.pos, stat); VIW[e.w + '#' + e.pos] = k.vi || []; KK[e.w + '#' + e.pos] = { exs: k.exs || [], trg: k.trg || [] };
  const vs = CMU.get(e.w) || [], arp = pickPron(vs, e.pos), het = heteronym(vs);
  const us = arp ? '/' + arpaToIpa(arp) + '/' : clean(k.us);
  const cands = [...(k.ukAll || []), ...(het ? k.ukNoRegion || [] : [])].map(clean).filter(Boolean);
  const uk = het ? cands.find(c => ipaAgrees(c, vs, arp)) || '' : cands[0] || '';
  if (!uk) stat.ukMiss++; return { uk, us, ukSrc: uk ? 'wiktionary' : '', het, vs, arp, posBad: het && !uk && cands.length > 0 }; });
{ const miss = pool.map((e, i) => (!ipa[i].uk ? i : -1)).filter(i => i >= 0), es = espeakUK(miss.map(i => pool[i].w));
  for (const i of miss) { const c = es[pool[i].w]; if (!c) continue; if (ipa[i].het && !ipaAgrees(c, ipa[i].vs, ipa[i].arp)) { ipa[i].posBad = true; continue; }
    ipa[i].uk = c; ipa[i].ukSrc = 'espeak'; ipa[i].posBad = false; stat.ukEspeak = (stat.ukEspeak || 0) + 1; } }
stat.heteronym = ipa.filter(x => x.het).length;
// vi đối chiếu Wiktionary: trùng 1 nghĩa tương đương (chuẩn hoá) = đồng ý; khác → giám khảo nhận cả 2 ứng viên (vi_wikt) và chọn
const viNorm = v => String(v || '').toLowerCase().replace(/\([^)]*\)/g, '').split(/[;,]/).map(x => x.trim().replace(/\s+/g, ' ')).filter(Boolean);
const viAgree = (vi, wk) => { const A = new Set(viNorm(vi)); return wk.some(x => viNorm(x.w).some(y => A.has(y))); };

// ---- AI qua ai-pool (scripts/lib/ai-pool.mjs): Gemini kho Lexkite → GrabCast Cloudflare → Workers AI tài khoản 2 → GrabCast Groq;
// soạn chỉ mô hình hạng L (lxtr cấm Llama), 2 giám khảo KHÁC HỌ; mọi tuyến hỏng → null = bỏ qua trung tính (không vào hàng duyệt, lượt sau làm lại).
const AI = createPool({ budget: { lexai: CALLS } }), callOk = new Map();
const used = new Set();
async function call(mode, items) { stat.calls++; const r = await AI.gen({ mode, items }); if (!r) { stat.fail++; stat.pool = 'empty'; } else used.add(r.route + ':' + r.model); return r; }
await AI.health();
// KHÓA NGHĨA khi SemCor yếu (cnt < 2: WordNet xếp nghĩa gần như tuỳ ý – mesh "số lỗ/inch", trek "xe bò", revoke "bài"): chọn lại trong các synset cùng từ loại
// nghĩa trùng nhiều từ nội dung nhất với 2 nghĩa ĐẦU của Wiktionary (Wiktionary xếp nghĩa thông dụng trước); hoà → giữ thứ tự WordNet.
const CW = t => new Set((String(t).toLowerCase().match(/[a-z]{3,}/g) || []).filter(x => !['the', 'and', 'for', 'with', 'that', 'which', 'from', 'into', 'something', 'someone', 'used', 'especially', 'usually', 'often', 'having', 'being', 'etc', 'one', 'other', 'any', 'such', 'are', 'not', 'its', 'has'].includes(x)).map(x => x.slice(0, 5)));
const ov = (a, b) => { let n = 0; for (const x of a) if (b.has(x)) n++; return n; };
stat.resense = 0;
for (const e of pool) { const g1 = (KK[e.w + '#' + e.pos] || {}).g1 || []; if (!(e.cnt < 2) || !(e.alts || []).length || !g1.length) continue;
  const W1 = CW(g1[0]), W2 = CW(g1[1] || ''), sc = c => 2 * ov(CW(c.gloss + ' ' + (c.lemmas || []).join(' ')), W1) + ov(CW(c.gloss + ' ' + (c.lemmas || []).join(' ')), W2);
  const best = [e, ...e.alts].reduce((b, c) => (sc(c) > sc(b) ? c : b), e);
  if (best !== e) { Object.assign(e, { syn: best.syn, gloss: best.gloss, lemmas: best.lemmas, wnex: best.wnex, syns: best.syns, lex: best.lex, comp: e.comp }); stat.resense++; } }
const items = pool.map((e, i) => ({ k: e.w + '#' + e.pos, w: e.w, pos: e.pos, gloss: e.gloss, lemmas: e.lemmas || [], wnex: e.wnex || [], cefr: e.cefr, lex: e.lex, topics: TOPIC_CHOICES, _c: e, _ipa: ipa[i] }));
const chunks = (a, n) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n));
const strip = x => { const { _c, _ipa, ...r } = x; return r; };
// ---- SOURCE-FIRST (24/10, pilot 8 soát 50 → ~10 sai): mỗi trường lấy từ NGUỒN NGƯỜI VIẾT, AI chỉ viết lại gloss + chấm + lấp chỗ trống.
//   nghĩa/def: WordNet (SemCor) → lxdef viết lại ≤ B1 (cấm đổi nghĩa) → lxsrc 2 giám khảo: def ≡ gloss
//   ví dụ: Tatoeba (CC BY 2.0 FR, examples.py: lemma + từ loại + câu dễ) + Wiktionary (CC BY-SA) → lxsrc chọn câu ĐÚNG nghĩa (giao 2 giám khảo); thiếu → lxex (AI) + chấm nghiêm
//   dịch: bảng dịch Wiktionary theo nghĩa (lxsrc khớp nhãn bảng ↔ gloss, 2 giám khảo trùng chỉ số) → thiếu ngôn ngữ → lxtr chỉ phần thiếu; mọi bản dịch qua lxjudge 2 họ + dịch ngược
//   CEFR: CEFR-J/Octanove → dải tần suất (AI chỉ cờ lệch) · đồng nghĩa: lemma cùng synset · cụm: từ ghép WordNet + đồng xuất hiện Tatoeba, giám khảo lọc – không đủ → bỏ trống
const TAT = arg('--tatoeba', process.env.TATOEBA || ''), EXT = {};
const VIOK = new Set(); { const f = arg('--viwords'); if (f && fs.existsSync(f)) for (const l of fs.readFileSync(f, 'utf8').split('\n')) if (l.trim()) VIOK.add(l.trim().toLowerCase().normalize('NFC'));
  if (VIOK.size) for (const r of loadAll()) for (const v of String(r.row[3] || '').split(/[;,]/)) if (v.trim()) VIOK.add(v.replace(/\([^)]*\)/g, '').trim().toLowerCase().normalize('NFC')); console.log('vi từ điển kiểm: ' + VIOK.size); }
if (TAT && fs.existsSync(TAT)) { const tmp = (process.env.RUNNER_TEMP || process.env.TMPDIR || '/tmp') + '/lx-ex-' + process.pid;
  fs.writeFileSync(tmp + '.in.json', JSON.stringify(items.map(x => ({ k: x.k, w: x.w, pos: x.pos }))));
  try { console.log(execFileSync('python3', [fileURLToPath(new URL('examples.py', import.meta.url)), '--words', tmp + '.in.json', '--tatoeba', TAT, '--out', tmp + '.out.json', ...(arg('--bad') ? ['--bad', arg('--bad')] : [])], { encoding: 'utf8', maxBuffer: 1 << 26 }).trim()); Object.assign(EXT, JSON.parse(fs.readFileSync(tmp + '.out.json', 'utf8'))); }
  catch (e) { console.error('✗ examples.py', String(e.stderr || e.message).slice(-400)); } }
else console.warn('⚠ không có Tatoeba (--tatoeba) – ví dụ chỉ từ Wiktionary/AI');
const formRe = w => new RegExp('\\b' + w.replace(/[^a-z-]/g, '').slice(0, Math.max(3, Math.min(w.length, w.length - 1))) + '[a-z]*\\b', 'i');
if (DRY) { console.log(JSON.stringify(items.slice(0, 3).map(x => ({ ...strip(x), tat: EXT[x.k], wk: KK[x.k] }))), stat); process.exit(0); }
// pilot 9: giám khảo B (họ khác – Llama CF) hay nghỉ 1 phút → 35/36 lô lxsrc bỏ qua. Chờ và hỏi lại CHỈ giám khảo B (vẫn bắt buộc khác họ A), tối đa 5 lần.
async function pairWait(req) { let { a, b } = await AI.judgePair(req);
  for (let i = 0; a && !b && i < 5; i++) { await new Promise(r => setTimeout(r, 70e3)); b = await AI.judge(req, { exclude: [a.fam] }); stat.pairWait = (stat.pairWait || 0) + 1; }
  // ĐỒNG THUẬN 3 GIÁM KHẢO (chủ 27/10, soát pilot 2: ~9/50 sai qua 2 giám khảo): C = họ thứ ba (mistral/qwen trên kho CF), lời nhắn soát đối nghịch như B.
  // Thiếu C = bỏ qua trung tính (hạ tầng, lượt sau làm lại) – không bao giờ nhận với 2 giám khảo.
  let c = null; if (a && b) { c = await AI.judge(req, { chain: ['cf2'], slot: 'C', exclude: [a.fam, b.fam], excludeModels: [a.model, b.model] }); if (!c) stat.judgeCMiss = (stat.judgeCMiss || 0) + 1; }
  return { a, b, c }; }
const D = {}, S = {}, X = {}, T = {}, JA = {}, JB = {}, JC = {}; let mGen = '', mA = '', mB = ''; const GM = {};
// 1. định nghĩa: viết lại gloss
await pmap(chunks(items, 10), 8, async ch => { const r = await call('lxdef', ch.map(strip)); for (const x of ch) callOk.set(x.k, !!r); if (r) { mGen = r.model; for (const x of ch) if (r.out[x.k]) { D[x.k] = r.out[x.k]; GM[x.k] = r.model; } } });
// 2. ứng viên người viết + giám khảo nguồn (2 họ)
for (const x of items) { const k = KK[x.k] || {}, re = formRe(x.w);
  const GW = CW(x.gloss + ' ' + x.lemmas.join(' ')), wk = (k.exs || []).filter(e => re.test(e.t) && ov(CW(e.g), GW) >= 1).slice(0, 3).map(e => ({ t: e.t, src: 'wiktionary' })), tt = ((EXT[x.k] || {}).ex || []).map(e => ({ t: e.t, src: 'tatoeba:' + e.id }));
  x._cand = [...tt.slice(0, 8 - wk.length), ...wk]; x._cols = [...new Set([...(x._c.comp || []), ...((EXT[x.k] || {}).col || [])])].slice(0, 8); x._trg = k.trg || []; }
const live = items.filter(x => D[x.k] && D[x.k].keep !== false && D[x.k].def);
async function srcPass(list) {
await pmap(chunks(list, 10), 6, async ch => {
  const req = { mode: 'lxsrc', items: ch.map(x => ({ k: x.k, w: x.w, pos: x.pos, gloss: x.gloss, lemmas: x.lemmas, def: D[x.k].def, cand: x._cand.map(c => c.t), cols: x._cols, ts: x._trg.map(g => g.g) })) };
  const { a, b, c } = await pairWait(req);
  if (!a || !b || !c) return; for (const x of ch) if (a.out[x.k] && b.out[x.k] && c.out[x.k]) S[x.k] = { a: a.out[x.k], b: b.out[x.k], c: c.out[x.k] }; });
for (const x of list) { const s = S[x.k]; if (!s) continue;
  const A = new Set(idx(s.a.ex)), bagOf = t => new Set(t.toLowerCase().match(/[a-z']+/g) || []), pick = [];
  for (const c of x._cand.filter((c, i) => A.has(i) && idx(s.b.ex).includes(i) && idx(s.c.ex).includes(i)).sort((p, q) => p.t.split(' ').length - q.t.split(' ').length)) { const b = bagOf(c.t); if (pick.length < 2 && !pick.some(p => { const q = bagOf(p.t); return [...b].filter(y => q.has(y)).length / new Set([...b, ...q]).size >= 0.5; })) pick.push(c); }
  const col = (Array.isArray(s.a.col) ? s.a.col : []).filter(c => x._cols.includes(c) && (s.b.col || []).includes(c) && (s.c.col || []).includes(c)).slice(0, 3);
  // bảng dịch Wiktionary CHỈ khi khớp nghĩa CHẮC CHẮN (chủ 27/10): cả 3 giám khảo cùng chỉ số + nhãn bảng chung ≥ 1 từ nội dung với gloss/def/lemma
  // (soát pilot 2: idol "representation of anything revered" → vi "thần tượng" cho nghĩa TƯỢNG thờ). Không chắc → không dùng bảng, ngôn ngữ đó do lxtr + 3 giám khảo.
  const ti = Number(s.a.ts), same3 = Number.isInteger(ti) && ti >= 0 && ti === Number(s.b.ts) && ti === Number(s.c.ts);
  const lab = same3 && x._trg[ti] ? x._trg[ti].g : '', labOk = lab && ov(CW(lab), CW(x.gloss + ' ' + D[x.k].def + ' ' + x.lemmas.join(' '))) >= 1;
  const grp = same3 && labOk ? x._trg[ti] : null; if (same3 && !labOk) stat.tsLabelReject = (stat.tsLabelReject || 0) + 1;
  X[x.k] = { defOk: s.a.def === 'same' && s.b.def === 'same' && s.c.def === 'same', defWhy: [s.a, s.b, s.c].filter(j => j.def !== 'same').map(j => j.f || 'changed').join(' / '), ex: pick, col, tr: grp ? grp.tr : {}, tg: grp ? grp.g : '' }; }
}
const idx = v => (Array.isArray(v) ? v : []).map(Number).filter(Number.isInteger);
const cov = { def: { wordnet: 0 }, ex: { tatoeba: 0, wiktionary: 0, ai: 0 }, tr: { wiktionary: 0, ai: 0 }, vi: { wiktionary: 0, ai: 0 }, col: { src: 0, none: 0 }, syn: { wordnet: 0, none: 0 }, cefr: {} };
await srcPass(live);
// def bị giám khảo bác → viết lại 1 lần theo lý do (gần chữ gloss hơn) rồi chấm lại; vẫn bác → hàng duyệt
// + định nghĩa sai hình từ loại (defPosOk – pilot 11 purple#adj "a colour…") cũng viết lại 1 lần với lý do cụ thể
{ const posBad = x => !defPosOk(D[x.k].def, x.pos), redo = live.filter(x => X[x.k] && (!X[x.k].defOk || posBad(x))); stat.defRedo = redo.length; stat.defPosRedo = redo.filter(posBad).length;
  await pmap(chunks(redo, 10), 8, async ch => { const r = await call('lxdef', ch.map(x => ({ ...strip(x), fix: [X[x.k].defOk ? '' : X[x.k].defWhy || 'meaning changed', posBad(x) ? DEF_POS_FIX[x.pos] : ''].filter(Boolean).join('; ') }))); if (r) for (const x of ch) { const o = r.out[x.k]; if (o && o.def && o.keep !== false) { D[x.k] = { ...D[x.k], def: o.def }; delete S[x.k]; delete X[x.k]; } } });
  await srcPass(redo.filter(x => !X[x.k])); stat.defRedoOk = redo.filter(x => X[x.k] && X[x.k].defOk).length; }

// 3. ví dụ AI CHỈ khi thiếu câu người viết (chấm nghiêm ở lxjudge: sense yes cả 2 + s ≥ 4)
const needEx = live.filter(x => X[x.k] && X[x.k].defOk && X[x.k].ex.length < 2);
await pmap(chunks(needEx, 10), 8, async ch => { const r = await call('lxex', ch.map(x => ({ k: x.k, w: x.w, pos: x.pos, gloss: x.gloss, def: D[x.k].def, lemmas: x.lemmas, wnex: x.wnex, n: 2 - X[x.k].ex.length, avoid: X[x.k].ex.map(e => e.t) })));
  if (r) for (const x of ch) { const ex = r.out[x.k] && r.out[x.k].ex; if (Array.isArray(ex)) X[x.k].ex.push(...ex.filter(t => typeof t === 'string' && t.trim()).slice(0, 2 - X[x.k].ex.length).map(t => ({ t: t.trim(), src: 'ai' }))); } });
// 4. dịch: Wiktionary theo nghĩa → AI lấp ngôn ngữ còn thiếu (vi + 13)
const ALL = ['vi', ...LANGS], trOf = x => Object.fromEntries(Object.entries(X[x.k].tr).filter(([l, v]) => ALL.includes(l) && v.length).map(([l, v]) => [l, v.slice(0, 3).join('; ')]));
const ready = live.filter(x => X[x.k] && X[x.k].defOk && X[x.k].ex.length === 2);
for (const x of ready) { X[x.k].m = trOf(x); X[x.k].trSrc = Object.fromEntries(Object.keys(X[x.k].m).map(l => [l, 'wiktionary'])); }
// CỔNG THEO TRƯỜNG (chủ 27/10): 12 ngôn ngữ CHỈ từ bảng Wiktionary khớp nghĩa chắc chắn – AI KHÔNG lấp (soát pilot 2/3: lỗi dịch AI qua cả 3 giám khảo);
// AI chỉ lấp vi (lõi, chấm nghiêm + Viet74K). Ngôn ngữ thiếu → app dùng đường dịch hiện có (mảnh thiếu → gói → dịch máy).
const AI_FILL = ['vi'];
const gapTr = ready.filter(x => AI_FILL.some(l => !X[x.k].m[l]));
await pmap(chunks(gapTr, 10), 8, async ch => { const r = await call('lxtr', ch.map(x => ({ k: x.k, w: x.w, pos: x.pos, gloss: x.gloss, lemmas: x.lemmas, def: D[x.k].def, ex: X[x.k].ex.map(e => e.t), need: AI_FILL.filter(l => !X[x.k].m[l]) })));
  if (r) for (const x of ch) { const o = r.out[x.k] || {}; for (const l of AI_FILL) if (!X[x.k].m[l] && typeof o[l] === 'string' && o[l].trim()) { X[x.k].m[l] = o[l].trim(); X[x.k].trSrc[l] = 'ai'; } } });
// vi do AI lấp: chỉ giữ phương án CÓ trong từ điển tiếng Việt (Viet74K – GPL-2.0, chỉ dùng để KIỂM trong CI, không phân phối – ∪ nghĩa vi của kho hiện có);
// không còn phương án nào → để trống = trượt cổng (pilot 9: "mong man", "dư thảo", "đrăm" qua cả 2 giám khảo)
for (const x of ready) if (X[x.k].trSrc.vi === 'ai' && VIOK.size) { const keep = String(X[x.k].m.vi).split(/\s*;\s*/).filter(v => VIOK.has(v.toLowerCase().trim()));
  X[x.k].m.vi = keep.join('; '); if (!keep.length) stat.viReject = (stat.viReject || 0) + 1; }
// CỔNG TỪ CÓ THẬT (27/10, pilot 11: mainline pt "inyectar" = tiếng Tây Ban Nha qua cả 2 giám khảo): trcheck.py (wordfreq) – bản dịch có từ không tồn tại
// trong ngôn ngữ đích → bỏ, hỏi lxtr lại 1 lần (kèm lý do); vẫn lạ → giữ cờ trBad = trượt cổng (lib.mjs gateEntry), không bao giờ nhận.
function trCheck(list) { const tmp = (process.env.RUNNER_TEMP || process.env.TMPDIR || '/tmp') + '/lx-tr-' + process.pid, inp = {};
  for (const x of list) inp[x.k] = X[x.k].m; fs.writeFileSync(tmp + '.in.json', JSON.stringify(inp));
  try { console.log(execFileSync('python3', [fileURLToPath(new URL('trcheck.py', import.meta.url)), '--in', tmp + '.in.json', '--out', tmp + '.out.json'], { encoding: 'utf8' }).trim()); return JSON.parse(fs.readFileSync(tmp + '.out.json', 'utf8')); }
  catch (e) { console.error('✗ trcheck.py', String(e.stderr || e.message).slice(-300)); return null; } }
{ let bad = trCheck(ready);
  if (!bad) { stat.trCheck = 'unavailable'; for (const x of ready) X[x.k].trBad = { all: ['trcheck.py lỗi'] }; } // không kiểm được = KHÔNG nhận (an toàn)
  else { stat.trBad = Object.values(bad).reduce((n, o) => n + Object.keys(o).length, 0);
    const redo = []; for (const x of ready) if (bad[x.k]) X[x.k].trBad = bad[x.k]; // theo trường: ngôn ngữ có từ lạ chỉ bị BỎ ở cổng (không hỏi AI lấp) for (const x of redo) for (const l of Object.keys(bad[x.k])) { X[x.k].trWhy = { ...(X[x.k].trWhy || {}), [l]: bad[x.k][l] }; delete X[x.k].m[l]; }
    await pmap(chunks(redo, 10), 8, async ch => { const r = await call('lxtr', ch.map(x => ({ k: x.k, w: x.w, pos: x.pos, gloss: x.gloss, lemmas: x.lemmas, def: D[x.k].def, ex: X[x.k].ex.map(e => e.t), need: Object.keys(X[x.k].trWhy),
      fix: 'previous answer used words that do not exist in that language: ' + Object.entries(X[x.k].trWhy).map(([l, w]) => l + ': ' + w.join(', ')).join('; ') })));
      if (r) for (const x of ch) { const o = r.out[x.k] || {}; for (const l of Object.keys(X[x.k].trWhy)) if (typeof o[l] === 'string' && o[l].trim()) { X[x.k].m[l] = o[l].trim(); X[x.k].trSrc[l] = 'ai'; } } });
    const bad2 = trCheck(redo) || Object.fromEntries(redo.map(x => [x.k, { all: ['trcheck.py lỗi'] }]));
    for (const x of redo) if (bad2[x.k]) X[x.k].trBad = bad2[x.k]; stat.trBadFinal = Object.keys(bad2).length; } }
for (const x of ready) if (X[x.k].m.vi) T[x.k] = Object.fromEntries(LANGS.filter(l => X[x.k].m[l]).map(l => [l, X[x.k].m[l]])); // vi bắt buộc (lõi); 12 ngôn ngữ: có thì chấm, thiếu thì thôi
const G = Object.fromEntries(live.filter(x => X[x.k]).map(x => [x.k, { keep: true, pos: x.pos, def: D[x.k].def, ex: X[x.k].ex.map(e => e.t), col: X[x.k].col, syn: x._c.syns || [], vi: (X[x.k].m || {}).vi || '', note_vi: '', emoji: '', topic: D[x.k].topic || '' }]));
for (const x of items) if (D[x.k] && (D[x.k].keep === false || !D[x.k].def)) G[x.k] = { keep: false, why: D[x.k].why, def: '' };
const kept = items.filter(x => G[x.k] && G[x.k].keep !== false && G[x.k].def);
const viAlt = x => { const wk = VIW[x.k] || []; return wk.length && !viAgree(G[x.k].vi, wk) ? wk.map(v => v.w + (v.sense ? ' (' + v.sense + ')' : '')) : null; };
const forJudge = x => ({ k: x.k, w: x.w, pos: G[x.k].pos || x.pos, gloss: x.gloss, lemmas: x.lemmas, wnex: x.wnex, ...(viAlt(x) ? { vi_wikt: viAlt(x) } : {}), def: G[x.k].def, ex: G[x.k].ex, col: G[x.k].col, syn: G[x.k].syn, cefr: x._c.cefr, vi: G[x.k].vi, note_vi: '', tr: T[x.k] || {} });
const judged = kept.filter(x => T[x.k] && X[x.k] && X[x.k].defOk);
const JK = {}; // k → { a: '<họ>:<mô hình>', b }
await pmap(chunks(judged, 10), 6, async ch => {
  const { a, b, c } = await pairWait({ mode: 'lxjudge', items: ch.map(forJudge) });
  if (!a || !b || !c) return; // thiếu giám khảo khác họ (A, B hoặc C) → KHÔNG ghi điểm nào (bỏ qua trung tính)
  for (const x of ch) if (a.out[x.k] && b.out[x.k] && c.out[x.k]) { JA[x.k] = a.out[x.k]; JB[x.k] = b.out[x.k]; JC[x.k] = c.out[x.k]; JK[x.k] = { a: judgeKey(a.model), b: judgeKey(b.model), c: judgeKey(c.model) }; }
  mA = a.model; mB = b.model;
});

// ---- cổng + ghi
const PEND = `content/lexicon/expand/pending/${BATCH}.json`;
const pend = fs.existsSync(new URL(PEND, ROOT)) ? JSON.parse(rd(PEND)) : { id: BATCH, at: new Date().toISOString(), items: {} };
const queue = fs.existsSync(new URL(QUEUE, ROOT)) ? JSON.parse(rd(QUEUE)) : { _doc: 'Hàng duyệt nội dung (docs/CONTENT-QA.md): mục KHÔNG đạt cổng – không xuất.', items: [] };
const why = {}, gaps = new Set();
for (const x of items) {
  const g = G[x.k], c = x._c;
  const ent = g ? { w: x.w, pos: g.pos || x.pos, ipa: x._ipa.uk, ipaUS: x._ipa.us, def: g.def || '', ex: g.ex || [], col: g.col || [], syn: g.syn || [], level: c.cefr, // CEFR: CEFR-J/Octanove → dải tần suất; AI KHÔNG đặt cấp (chỉ cờ lệch ở cổng)
     cefrF: c.cefrZ || c.cefr, cefrSrc: c.cefrSrc || 'freq', perLang: true, ...(X[x.k] && X[x.k].trBad ? { trBad: X[x.k].trBad } : {}), z: c.z, emoji: g.emoji || '', topic: g.topic || '', vi: g.vi || '', note_vi: g.note_vi || '', m: T[x.k] || {},
    src: { freq: 'wordfreq-3.1', sense: 'wordnet-3.0:' + c.syn, def: 'wordnet-gloss+ai-simplify', defGen: GM[x.k] || mGen, ipaUS: CMU.has(x.w) ? 'cmudict' : 'wiktionary', ipaUK: x._ipa.ukSrc, cefr: c.cefrSrc || 'freq',
      ex: X[x.k] ? X[x.k].ex.map(e => e.src) : [], tr: X[x.k] ? X[x.k].trSrc || {} : {}, trSense: X[x.k] ? X[x.k].tg : '', col: g.col && g.col.length ? 'wordnet/tatoeba' : '', syn: g.syn && g.syn.length ? 'wordnet' : '',
      lic: 'WordNet 3.0 (Princeton licence) · Tatoeba CC BY 2.0 FR · Wiktionary CC BY-SA 4.0 (kaikki.org) · CMUdict BSD-2 · CEFR-J 1.5 / Octanove CC BY-SA 4.0 · wordfreq CC BY-SA 4.0' }, qa: {} } : null;
  if (ent && X[x.k] && !X[x.k].defOk) ent.defChanged = X[x.k].defWhy || 'changed';
  if (ent && g.pos && g.pos !== x.pos) ent.posDrift = g.pos; // khóa nghĩa: từ loại cố định theo nghĩa WordNet đã chọn
  if (ent && x._ipa.posBad) ent.ipaPos = false; // heteronym: không có IPA Anh khớp từ loại
  if (ent && JK[x.k]) { const a = JA[x.k], b = JB[x.k], c = JC[x.k], J3 = [a, b, c];
    ent.qa = { n: 3, j: { ...(a ? { [JK[x.k].a]: +a.s } : {}), ...(b ? { [JK[x.k].b]: +b.s } : {}), ...(c ? { [JK[x.k].c]: +c.s } : {}) }, f: J3.map(j => j && j.f).filter(Boolean), tr: {}, bt: null };
    for (const l of LANGS) ent.qa.tr[l] = J3.map(j => j && j.tr && +j.tr[l]).filter(Number.isFinite);
    ent.qa.btw = Object.fromEntries(LANGS.map(l => [l, J3.map(j => j && j.bt && j.bt[l]).filter(Boolean)]));
    // khóa nghĩa · CEFR độc lập · cờ phiên âm/khác từ loại · vi đối chiếu Wiktionary (lib.mjs gateEntry)
    ent.qa.sense = J3.map(j => j && (j.sense === true || /^\s*yes/i.test(String(j.sense))) ? 'yes' : String((j && j.sense) ?? 'missing').toLowerCase());
    ent.qa.cefrJ = J3.map(j => String((j && j.cefr) || '').toUpperCase());
    ent.qa.bad = {}; for (const j of J3) for (const [l, v] of Object.entries((j && j.bad) || {})) if (LANGS.includes(l) && /translit|pos/.test(v)) ent.qa.bad[l] = String(v);
    if (viAlt(x)) { const vv = J3.map(j => String((j && j.vi) || 'unsure').toLowerCase()), fx = J3.map(j => String((j && j.vi_fix) || '').trim()), wk = (VIW[x.k] || []).map(v => v.w);
      ent.qa.vi = vv; ent.qa.viWikt = wk;
      if (vv.every(v => v === 'alt') && fx[0] && wk.includes(fx[0]) && fx.every(f => f === fx[0] || wk.includes(f))) { ent.qa.viGen = ent.vi; ent.vi = [...new Set(fx.filter(f => wk.includes(f)))].join('; '); ent.qa.vi = vv.map(() => 'fixed'); } } }
  if (ent) ent.tp = assignTopics(ent); // chủ đề: miền → chủ đề → tiểu chủ đề (content/lexicon/topics.json)
  // hạ tầng (không sinh được / không dịch được / thiếu 2 giám khảo) ≠ lỗi nội dung → bỏ qua, lượt sau làm lại
  if (ent && ent.defChanged) { /* nội dung: viết lại đổi nghĩa → cổng */ } else if ((ent && g.keep !== false && g.def && (!T[x.k] || !JK[x.k] || ent.ex.length !== 2)) || !g) { // !g: gọi lỗi HOẶC mô hình bỏ sót mục → lượt sau làm lại (không đốt từ vào hàng duyệt)
    why.infra = (why.infra || 0) + 1; continue; }
  const r = gateEntry(ent, { keep: g ? g.keep !== false : null, keepWhy: g && g.why });
  if (hasGap(r)) { why.gap = (why.gap || 0) + 1; gaps.add(x.k); continue; } // có lỗ dữ liệu nguồn (thiếu IPA…, kể cả kèm lỗi nội dung – vd. 20261027-pilot) → không vào hàng duyệt, lượt sau sinh lại
  if (r.ok) { ent.qa.bt = r.bt; delete ent.qa.btw; if (r.drop) { for (const l of Object.keys(r.drop)) delete ent.m[l]; ent.qa.trDrop = r.drop; ent.qa.trKeep = r.keep.filter(l => ent.m[l]); delete ent.perLang; } pend.items[x.k] = ent; }
  else if (!queueable(r, callOk.get(x.k))) { why.infra = (why.infra || 0) + 1; }
  else { why[r.why[0].split(':')[0]] = (why[r.why[0].split(':')[0]] || 0) + 1; queue.items = queue.items.filter(q => !(q.src === 'lexicon-expand' && q.id === x.k)); queue.items.push({ src: 'lexicon-expand', id: x.k, batch: BATCH, why: r.why.slice(0, 4), at: new Date().toISOString().slice(0, 10), ...(ent ? { data: ent } : {}) }); }
}
pend.n = Object.keys(pend.items).length;
fs.mkdirSync(new URL('content/lexicon/expand/pending/', ROOT), { recursive: true });
if (pend.n) wr(PEND, JSON.stringify(pend, null, 0).replace(/,"(?=[^"]+#(n|v|adj|adv)":)/g, ',\n"') + '\n');
wr(QUEUE, JSON.stringify(queue, null, 1) + '\n');
{ const settled = new Set([...Object.keys(pend.items), ...queue.items.filter(q => q.src === 'lexicon-expand').map(q => q.id)]); // chỉ bỏ khỏi retry khi ĐÃ đạt hoặc vào hàng duyệt (hạ tầng hỏng → giữ; run 40080132264 xóa nhầm)
  retry.items = [...new Set([...retry.items.filter(k => !settled.has(k)), ...gaps])].sort();
  fs.mkdirSync(new URL('content/lexicon/expand/retry/', ROOT), { recursive: true }); wr(RETRY, JSON.stringify(retry, null, 1) + '\n'); }
// độ phủ theo trường: nguồn người viết vs AI (mục ĐẠT của lượt này)
for (const x of items) { const e = pend.items[x.k]; if (!e || !e.src || !e.src.ex) continue; cov.def.wordnet++;
  for (const s of e.src.ex) cov.ex[s.startsWith('tatoeba') ? 'tatoeba' : s]++;
  for (const l of LANGS) cov.tr[(e.src.tr || {})[l] === 'wiktionary' ? 'wiktionary' : 'ai']++; cov.vi[(e.src.tr || {}).vi === 'wiktionary' ? 'wiktionary' : 'ai']++;
  cov.col[e.col.length ? 'src' : 'none']++; cov.syn[e.syn.length ? 'wordnet' : 'none']++; cov.cefr[e.cefrSrc] = (cov.cefr[e.cefrSrc] || 0) + 1; }
const sec = (Date.now() - t0) / 1000, pass = Object.keys(pend.items).length;
const rep = { batch: BATCH, n: items.length, pass, cov, tatoeba: Object.values(EXT).filter(v => v.ex.length >= 2).length, review: items.length - pass - (why.infra || 0) - (why.gap || 0), skipped: why.infra || 0, gap: why.gap || 0, pool: stat.pool || 'ok', why, calls: stat.calls, fail: stat.fail, retry: stat.retry || 0, ukMiss: stat.ukMiss, ukEspeak: stat.ukEspeak || 0, sec: Math.round(sec), perHour: Math.round(items.length / sec * 3600), models: { gen: mGen, a: mA, b: mB }, ai: { routes: [...used], ...AI.stats() }, topics: buildTopicSets(Object.entries(pend.items).map(([k, e]) => ({ k, e })), TAX()).stats };
AI.report('lexicon-expand'); fs.mkdirSync(new URL('reports/', ROOT), { recursive: true }); wr('reports/lexicon-expand.json', JSON.stringify(rep, null, 1));
console.log('✓ lexicon-expand ' + JSON.stringify(rep));
// kho AI cạn hoàn toàn (mọi mục bỏ qua hạ tầng, không mục nào vào hàng duyệt) = KHÔNG phải lỗi: lịch 3 giờ thử lại (27/10 – kho CF cửa sổ 24 giờ trượt)
if (!pass && (why.infra || 0) >= items.length && items.length) { console.log('::warning::lexicon-expand: kho AI cạn (' + (why.infra || 0) + '/' + items.length + ' bỏ qua hạ tầng) – lượt sau thử lại'); process.exit(0); }
if (!pass) { console.error('✗ lexicon-expand: 0 mục đạt' + (stat.pool ? ' – mọi tuyến AI hỏng/hết hạn mức (xem Quản trị › Khóa API › Sức chứa)' : '')); process.exit(1); }
