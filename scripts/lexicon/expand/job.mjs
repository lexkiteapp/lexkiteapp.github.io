#!/usr/bin/env node
import { fileURLToPath } from 'node:url';
// Mở rộng kho từ tới 20k (docs/LEXICON.md §Mở rộng 20k) – việc nền `lexicon-expand` (infra/jobs.json), chạy trên CI, tiếp tục được, idempotent.
//   node scripts/lexicon/expand/job.mjs --candidates <candidates.json> --cmu <cmudict.dict> [--britfone <britfone.main.csv>] [--n 400] [--pilot] [--calls 400] [--batch <id>] [--dry] [--no-retry]
// Mỗi từ: IPA Mỹ CMUdict (BSD-2) · IPA Anh Wiktionary qua kaikki.org (CC BY-SA 4.0, ghi công) · nghĩa WordNet làm khung
//   → /api/lexai lxgen (Gemini: định nghĩa ≤ B1, 2 ví dụ, cụm, đồng nghĩa, CEFR, chủ đề, vi, lỗi hay gặp vi) → lxtr (13 ngôn ngữ)
//   → 2 giám khảo KHÁC HỌ (gemini + gemma) chấm mục + từng bản dịch + dịch ngược → cổng (scripts/lexicon/expand/lib.mjs gateEntry).
// Đạt → content/lexicon/expand/pending/<lô>.json (CHƯA xuất). Trượt → content/qa/review-queue.json (src lexicon-expand). Không bao giờ xuất thẳng:
// xuất = `promote.mjs` sau khi soát mẫu ≥ 5 % (docs/CONTENT-QA.md lớp 6) → content/lexicon/expand/<lô>.json + content/qa/batches/lx-<lô>.json.
import fs from 'fs';
import { execFileSync } from 'child_process';
import { arpaToIpa, badChars, ukStyle } from '../ipa.mjs';
import { ROOT, rd, wr, loadAll } from '../lib.mjs';
import { assignTopics, buildTopicSets, TAX } from './topics.mjs';
import { gateEntry, defPosOk, DEF_POS_FIX, doneWords, LANGS, TOPIC_CHOICES, QUEUE, queueable, hasGap, wsdOk, lockSense, viAgreeSources, viNorm, omwHas } from './lib.mjs';
import { createPool, judgeKey, familyOf } from '../../lib/ai-pool.mjs';
import { kaikki, clean, pmap } from './wikt.mjs';
import { espeakUK } from './espeak.mjs';
import { parseCmu, pickPron, heteronym, ipaAgrees } from './cmu.mjs';
import { loadRefs, checkEntry } from '../ipa-check.mjs';
const arg = (n, d) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : d; };
const N = +arg('--n', 400), CALLS = +arg('--calls', 400), PILOT = process.argv.includes('--pilot'), DRY = process.argv.includes('--dry'), NORETRY = process.argv.includes('--no-retry'); // --no-retry: lượt kiểm nhỏ, không đụng danh sách làm lại
const API = process.env.LEXAI_URL || 'https://lexkite.com/api/lexai';
// --words <tệp>: MẪU PILOT CỐ ĐỊNH (content/lexicon/expand/pilot/hard.json – mọi từ đã soát + mọi từ từng lỗi, QUALITY-PIPELINE bước 3): xử lý đúng các từ đó
// (kể cả đã làm), KHÔNG ghi lô chờ/hàng duyệt/retry – chỉ reports/pilot-hard-out.json để grade.mjs chấm theo content/lexicon/expand/pilot/labels.json.
const WORDS = arg('--words');
const BATCH = arg('--batch', WORDS ? 'pilothard-' + new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '') : new Date().toISOString().slice(0, 10).replace(/-/g, '') + (PILOT ? '-pilot' : ''));
const C = JSON.parse(fs.readFileSync(arg('--candidates'), 'utf8'));
const t0 = Date.now(), stat = { calls: 0, fail: 0, kaikki: 0, ukMiss: 0 };

// ---- chọn từ: nối tiếp (theo tần suất) hoặc pilot rải đều dải tần suất × nhóm WordNet
const done = doneWords();
const RETRY = 'content/lexicon/expand/retry/words.json', retry = fs.existsSync(new URL(RETRY, ROOT)) ? JSON.parse(rd(RETRY)) : { _doc: 'Từ làm lại ở lượt kế (lỗ dữ liệu nguồn – không vào hàng duyệt). job.mjs tự thêm/bớt.', items: [] };
const want = new Set(retry.items.map(k => k.split('#')[0]));
let pool = C.items.filter(e => !done.has(e.w) && !want.has(e.w)); // từ làm lại KHÔNG tính vào N từ mới
if (WORDS) { const want = JSON.parse(fs.readFileSync(WORDS, 'utf8')).items, miss = [];
  pool = want.map(k => { const [w, p] = k.split('#'); return C.items.find(e => e.w === w && e.pos === p) || C.items.find(e => e.w === w) || (miss.push(k), null); }).filter(Boolean);
  pool = [...new Map(pool.map(e => [e.w + '#' + e.pos, e])).values()]; if (miss.length) console.log(`⚠ pilot cố định: ${miss.length} từ không còn trong ứng viên (${miss.slice(0, 12).join(', ')})`);
} else if (PILOT) {
  const by = new Map(); for (const e of pool) { const b = Math.min(5.5, Math.max(2.5, e.band)); (by.get(b) || by.set(b, []).get(b)).push(e); }
  const bands = [...by.keys()].sort((a, b) => b - a), pick = [];
  for (const b of bands) { const l = by.get(b), lx = new Map(); for (const e of l) (lx.get(e.lex) || lx.set(e.lex, []).get(e.lex)).push(e); by.set(b, [...lx.values()]); }
  for (let r = 0; pick.length < N; r++) { let any = false; for (const b of bands) { const groups = by.get(b), g = groups[r % groups.length]; const e = g && g.shift(); if (e) { pick.push(e); any = true; } if (pick.length >= N) break; } if (!any && r > 5000) break; }
  pool = pick;
} else pool = pool.slice(0, N);
// làm lại TRƯỚC: lỗ dữ liệu nguồn + mục đưa về chờ (content/lexicon/expand/retry/words.json) – ngoài N từ mới
if (!NORETRY && !WORDS) { const inPool = new Set(pool.map(e => e.w)); const seenW = new Set(); pool = [...C.items.filter(e => want.has(e.w) && !done.has(e.w) && !inPool.has(e.w) && !seenW.has(e.w) && seenW.add(e.w)), ...pool]; stat.retry = pool.length - Math.min(N, pool.length); }
console.log(`lexicon-expand ${BATCH}: ${pool.length} từ (đã có ${done.size}) · bands ${JSON.stringify(pool.reduce((o, e) => (o[e.band] = (o[e.band] || 0) + 1, o), {}))}`);

// ---- IPA: CMUdict (Mỹ) + Wiktionary/kaikki (Anh, Mỹ dự phòng)
const CMU = parseCmu(fs.readFileSync(arg('--cmu'), 'latin1'));
// Kiểm IPA trước khi ghi lô (ipa-check.mjs checkEntry): Anh ↔ Britfone (MIT), Mỹ ↔ CMUdict; thiếu --britfone → tải 1 lần (BRITFONE_URL)
const REFS = { cmu: CMU, bf: (await loadRefs({ britfone: arg('--britfone'), cmu: arg('--cmu') })).bf };
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
// viNorm: lib.mjs (chung với viAgreeSources)
const viAgree = (vi, wk) => { const A = new Set(viNorm(vi)); return wk.some(x => viNorm(x.w).some(y => A.has(y))); };

// ---- AI qua ai-pool (scripts/lib/ai-pool.mjs): Gemini kho Lexkite → GrabCast Cloudflare → Workers AI tài khoản 2 → GrabCast Groq;
// soạn chỉ mô hình hạng L (lxtr cấm Llama), 2 giám khảo KHÁC HỌ; mọi tuyến hỏng → null = bỏ qua trung tính (không vào hàng duyệt, lượt sau làm lại).
const AI = createPool({ budget: { lexai: CALLS } }), callOk = new Map();
const used = new Set();
async function call(mode, items) { stat.calls++; const r = await AI.gen({ mode, items }); if (!r) { stat.fail++; stat.pool = 'empty'; } else used.add(r.route + ':' + r.model); return r; }
await AI.health();
const CW = t => new Set((String(t).toLowerCase().match(/[a-z]{3,}/g) || []).filter(x => !['the', 'and', 'for', 'with', 'that', 'which', 'from', 'into', 'something', 'someone', 'used', 'especially', 'usually', 'often', 'having', 'being', 'etc', 'one', 'other', 'any', 'such', 'are', 'not', 'its', 'has'].includes(x)).map(x => x.slice(0, 5)));
const ov = (a, b) => { let n = 0; for (const x of a) if (b.has(x)) n++; return n; };
const chunks = (a, n) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n));
const strip = x => { const { _c, _ipa, ...r } = x; return r; };
// ---- TRẮC NGHIỆM NGHĨA 3 GIÁM KHẢO (lxwsd, "ra là ok" 29/10): mỗi probe (nghĩa Wiktionary, câu, vi, bản dịch) → số nghĩa WordNet; nhận khi cả 3 cùng chọn nghĩa khoá.
// Trả { k: { probeId: [a, b, c] } }; lô thiếu giám khảo → không có k (hạ tầng, lượt sau làm lại – không bao giờ nhận với < 3 phiếu).
const senseList = e => (e.senses && e.senses.length ? e.senses : [{ syn: e.syn, gloss: e.gloss, lemmas: e.lemmas, wnex: e.wnex, syns: e.syns, lex: e.lex, cnt: e.cnt }]);
const sensesTxt = e => senseList(e).map((s, i) => `${i + 1}. ${s.gloss}${s.lemmas && s.lemmas.length ? ' (= ' + s.lemmas.slice(0, 3).join(', ') + ')' : ''}`);
const lockIdx = e => senseList(e).findIndex(s => s.syn === e.syn) + 1;
stat.wsd = { calls: 0, probes: 0, ok: 0 };
async function wsd3(list) { const out = {};
  await pmap(chunks(list, 8), 6, async ch => { stat.wsd.calls++; const { a, b, c } = await pairWait({ mode: 'lxwsd', items: ch.map(r => ({ k: r.k, w: r.w, pos: r.pos, senses: r.senses, probes: r.probes })) });
    if (!a || !b || !c) return;
    for (const r of ch) { const A = a.out[r.k], B = b.out[r.k], Z = c.out[r.k]; if (!A || !B || !Z) continue;
      out[r.k] = Object.fromEntries(Object.keys(r.probes).map(id => [id, [A[id], B[id], Z[id]].map(v => (v == null || v === '' ? NaN : Number(v)))])); stat.wsd.probes += Object.keys(r.probes).length; } });
  return out; }
// KHÓA NGHĨA THÔNG DỤNG cho MỌI từ (lớp L3, 29/10 – thay luật cũ chỉ khi SemCor < 2): nghĩa 1 (và 2) của Wiktionary – xếp theo độ thông dụng – là nghĩa
// WordNet số mấy (lib.mjs lockSense: cả 3 giám khảo cùng số; nghĩa 2 chỉ xác nhận nghĩa SemCor). Không khoá được → hàng duyệt (bỏ từ), không đoán.
// Wiktionary không có từ loại này → giữ nghĩa SemCor chỉ khi SemCor đủ chắc (cnt ≥ 2), còn lại cũng bỏ.
stat.resense = 0; stat.lock = { 'wiktionary-1': 0, 'wiktionary-2+semcor': 0, semcor: 0, fail: 0, infra: 0 };
if (DRY) for (const e of pool) e._lock = 'dry'; else { const req = [];
  for (const e of pool) { const g1 = (KK[e.w + '#' + e.pos] || {}).g1 || [];
    if (!g1.length) { e._lock = e.cnt >= 2 ? 'semcor' : false; stat.lock[e._lock || 'fail']++; continue; }
    req.push({ k: e.w + '#' + e.pos, w: e.w, pos: e.pos, senses: sensesTxt(e), probes: { wk1: g1[0], ...(g1[1] ? { wk2: g1[1] } : {}) }, e }); }
  const V = await wsd3(req);
  for (const r of req) { const e = r.e, v = V[r.k]; if (!v) { e._lock = null; stat.lock.infra++; continue; }
    const L = senseList(e), got = lockSense(v.wk1, v.wk2, lockIdx(e), L.length);
    if (!got) { e._lock = false; e._lockVotes = v; stat.lock.fail++; continue; }
    const t = L[got.idx - 1]; if (t.syn !== e.syn) { Object.assign(e, { syn: t.syn, gloss: t.gloss, lemmas: t.lemmas, wnex: t.wnex, syns: t.syns, lex: t.lex }); stat.resense++; }
    e._lock = got.by; stat.lock[got.by]++; } }
const items = pool.map((e, i) => ({ k: e.w + '#' + e.pos, w: e.w, pos: e.pos, gloss: e.gloss, lemmas: e.lemmas || [], wnex: e.wnex || [], cefr: e.cefr, lex: e.lex, topics: TOPIC_CHOICES, _c: e, _ipa: ipa[i] }));
const locked = x => !!x._c._lock;
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
// dữ liệu người viết theo SYNSET đã khoá (synset.py): lemma OMW 8 ngôn ngữ (lớp D1) + ví dụ WordNet của chính synset (lớp L2)
const SY = {}; if (!DRY) { const tmp = (process.env.RUNNER_TEMP || process.env.TMPDIR || '/tmp') + '/lx-syn-' + process.pid;
  fs.writeFileSync(tmp + '.in.json', JSON.stringify(items.filter(locked).map(x => ({ k: x.k, w: x.w, pos: x.pos, syn: x._c.syn, wnex: x.wnex }))));
  try { console.log(execFileSync('python3', [fileURLToPath(new URL('synset.py', import.meta.url)), '--in', tmp + '.in.json', '--out', tmp + '.out.json'], { encoding: 'utf8', maxBuffer: 1 << 26 }).trim()); Object.assign(SY, JSON.parse(fs.readFileSync(tmp + '.out.json', 'utf8'))); }
  catch (e) { console.error('✗ synset.py', String(e.stderr || e.message).slice(-400)); } }
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
await pmap(chunks(items.filter(locked), 10), 8, async ch => { const r = await call('lxdef', ch.map(strip)); for (const x of ch) callOk.set(x.k, !!r); if (r) { mGen = r.model; for (const x of ch) if (r.out[x.k]) { D[x.k] = r.out[x.k]; GM[x.k] = r.model; } } });
// 2. ứng viên người viết + giám khảo nguồn (2 họ)
for (const x of items) { const k = KK[x.k] || {}, re = formRe(x.w);
  const GW = CW(x.gloss + ' ' + x.lemmas.join(' ')), wk = (k.exs || []).filter(e => re.test(e.t) && ov(CW(e.g), GW) >= 1).slice(0, 3).map(e => ({ t: e.t, src: 'wiktionary' })), tt = ((EXT[x.k] || {}).ex || []).map(e => ({ t: e.t, src: 'tatoeba:' + e.id }));
  const wx = ((SY[x.k] || {}).wx || []).filter(t => re.test(t)).map(t => ({ t, src: 'wordnet:' + x._c.syn })); // ví dụ của CHÍNH synset trước (lớp L2)
  x._cand = [...wx, ...tt.slice(0, 8 - wk.length - wx.length), ...wk]; x._cols = [...new Set([...(x._c.comp || []), ...((EXT[x.k] || {}).col || [])])].slice(0, 8); x._trg = k.trg || []; }
const live = items.filter(x => D[x.k] && D[x.k].keep !== false && D[x.k].def);
async function srcPass(list) {
await pmap(chunks(list, 10), 6, async ch => {
  const req = { mode: 'lxsrc', items: ch.map(x => ({ k: x.k, w: x.w, pos: x.pos, gloss: x.gloss, lemmas: x.lemmas, def: D[x.k].def, cand: x._cand.map(c => c.t), cols: x._cols, ts: x._trg.map(g => g.g) })) };
  const { a, b, c } = await pairWait(req);
  if (!a || !b || !c) return; for (const x of ch) if (a.out[x.k] && b.out[x.k] && c.out[x.k]) S[x.k] = { a: a.out[x.k], b: b.out[x.k], c: c.out[x.k] }; });
for (const x of list) { const s = S[x.k]; if (!s) continue;
  // câu cả 3 giám khảo nguồn chọn → ỨNG VIÊN; chọn 2 câu SAU trắc nghiệm nghĩa (pickEx): WordNet trước, rồi ngắn nhất, không trùng ý
  const A = new Set(idx(s.a.ex)), exAll = x._cand.filter((c, i) => A.has(i) && idx(s.b.ex).includes(i) && idx(s.c.ex).includes(i));
  const col = (Array.isArray(s.a.col) ? s.a.col : []).filter(c => x._cols.includes(c) && (s.b.col || []).includes(c) && (s.c.col || []).includes(c)).slice(0, 3);
  // bảng dịch Wiktionary CHỈ khi khớp nghĩa CHẮC CHẮN (chủ 27/10): cả 3 giám khảo cùng chỉ số + nhãn bảng chung ≥ 1 từ nội dung với gloss/def/lemma
  // (soát pilot 2: idol "representation of anything revered" → vi "thần tượng" cho nghĩa TƯỢNG thờ). Không chắc → không dùng bảng, ngôn ngữ đó do lxtr + 3 giám khảo.
  const ti = Number(s.a.ts), same3 = Number.isInteger(ti) && ti >= 0 && ti === Number(s.b.ts) && ti === Number(s.c.ts);
  const lab = same3 && x._trg[ti] ? x._trg[ti].g : '', labOk = lab && ov(CW(lab), CW(x.gloss + ' ' + D[x.k].def + ' ' + x.lemmas.join(' '))) >= 1;
  const grp = same3 && labOk ? x._trg[ti] : null; if (same3 && !labOk) stat.tsLabelReject = (stat.tsLabelReject || 0) + 1;
  X[x.k] = { defOk: s.a.def === 'same' && s.b.def === 'same' && s.c.def === 'same', defWhy: [s.a, s.b, s.c].filter(j => j.def !== 'same').map(j => j.f || 'changed').join(' / '), exAll, ex: [], col, tr: grp ? grp.tr : {}, tg: grp ? grp.g : '' }; }
}
const idx = v => (Array.isArray(v) ? v : []).map(Number).filter(Number.isInteger);
const cov = { def: { wordnet: 0 }, ex: { wordnet: 0, tatoeba: 0, wiktionary: 0, ai: 0 }, tr: { wiktionary: 0, ai: 0 }, vi: { wiktionary: 0, ai: 0 }, col: { src: 0, none: 0 }, syn: { wordnet: 0, none: 0 }, cefr: {} };
await srcPass(live);
// def bị giám khảo bác → viết lại 1 lần theo lý do (gần chữ gloss hơn) rồi chấm lại; vẫn bác → hàng duyệt
// + định nghĩa sai hình từ loại (defPosOk – pilot 11 purple#adj "a colour…") cũng viết lại 1 lần với lý do cụ thể
{ const posBad = x => !defPosOk(D[x.k].def, x.pos), redo = live.filter(x => X[x.k] && (!X[x.k].defOk || posBad(x))); stat.defRedo = redo.length; stat.defPosRedo = redo.filter(posBad).length;
  await pmap(chunks(redo, 10), 8, async ch => { const r = await call('lxdef', ch.map(x => ({ ...strip(x), fix: [X[x.k].defOk ? '' : X[x.k].defWhy || 'meaning changed', posBad(x) ? DEF_POS_FIX[x.pos] : ''].filter(Boolean).join('; ') }))); if (r) for (const x of ch) { const o = r.out[x.k]; if (o && o.def && o.keep !== false) { D[x.k] = { ...D[x.k], def: o.def }; delete S[x.k]; delete X[x.k]; } } });
  await srcPass(redo.filter(x => !X[x.k])); stat.defRedoOk = redo.filter(x => X[x.k] && X[x.k].defOk).length; }

// 3. "RA LÀ OK" (29/10) – mỗi trường nhận khi qua TRẮC NGHIỆM NGHĨA 3 giám khảo (wsd3) + nguồn độc lập:
//   vi (lớp L1): ≥ 2 nguồn trùng trong { Wiktionary (bảng khớp nghĩa ∪ vi cùng từ loại), lxtr (họ A), lxvi (họ khác) } – lib.mjs viAgreeSources
//   12 ngôn ngữ (lớp D1–D3): bảng Wiktionary ∩ lemma OMW của synset (8 ngôn ngữ có OMW), không khớp → lemma OMW; ngôn ngữ không có OMW → bảng + từ có thật (trcheck --exist) + hình từ loại
//   ví dụ (lớp L2): ứng viên giám khảo nguồn đã chọn → trắc nghiệm nghĩa; thiếu → lxex (AI) → trắc nghiệm nghĩa vòng 2; vẫn thiếu = hàng duyệt (không lặp vô hạn)
const okDef = live.filter(x => X[x.k] && X[x.k].defOk), VA = {}, VB = {}, FA = {};
await pmap(chunks(okDef, 10), 8, async ch => { const r = await call('lxtr', ch.map(x => ({ k: x.k, w: x.w, pos: x.pos, gloss: x.gloss, lemmas: x.lemmas, def: D[x.k].def, ex: X[x.k].exAll.slice(0, 2).map(e => e.t), need: ['vi'] })));
  if (r) for (const x of ch) { const o = r.out[x.k] || {}; if (typeof o.vi === 'string' && o.vi.trim()) { VA[x.k] = o.vi.trim(); FA[x.k] = r.fam || familyOf(r.model); } } });
await pmap(chunks(okDef, 10), 6, async ch => { const fa = ch.map(x => FA[x.k]).find(Boolean) || 'gpt-oss'; stat.calls++;
  const r = await AI.judge({ mode: 'lxvi', items: ch.map(x => ({ k: x.k, w: x.w, pos: x.pos, gloss: x.gloss, lemmas: x.lemmas, def: D[x.k].def })) }, { exclude: [fa] });
  if (r) { used.add(r.route + ':' + r.model); for (const x of ch) { const o = r.out[x.k] || {}; if (typeof o.vi === 'string' && o.vi.trim()) VB[x.k] = o.vi.trim(); } } });
const OMWL = ['ja', 'zh', 'th', 'id', 'fr', 'es', 'pt', 'ar'];
stat.vi = { agree: 0, none: 0 }; stat.tr = { 'wiktionary+omw': 0, omw: 0, wiktionary: 0 };
const probe = {};
for (const x of okDef) { const P = {}, X1 = X[x.k], om = (SY[x.k] || {}).omw || {};
  X1.exAll.slice(0, 6).forEach((c, i) => { P['ex' + i] = c.t; });
  X1.viC = viAgreeSources({ wk: [...(X1.tr.vi || []), ...(VIW[x.k] || []).map(v => v.w)], a: VA[x.k] || '', b: VB[x.k] || '' }).slice(0, 3); stat.vi[X1.viC.length ? 'agree' : 'none']++;
  X1.viC.forEach((c, i) => { P['vi' + i] = c.v; });
  // vi Wiktionary lẻ (để kiểm phương án sửa vi_fix của lxjudge – chỉ nhận vi_fix đã qua trắc nghiệm nghĩa)
  X1.viW = [...new Set((VIW[x.k] || []).map(v => viNorm(v.w)[0]).filter(v => v && !X1.viC.some(c => c.v === v)))].slice(0, 3); X1.viW.forEach((v, i) => { P['vw' + i] = v; });
  X1.trC = {};
  for (const l of LANGS) { const t = (X1.tr[l] || [])[0] || '', O = om[l] || [], allT = new Set(x._trg.flatMap(g => g.tr[l] || []));
    if (OMWL.includes(l) && O.length) { if (t && omwHas(l, t, O)) X1.trC[l] = { t, src: 'wiktionary+omw' };
      else { const best = O.find(o => allT.has(o)) || O[0]; X1.trC[l] = { t: best, src: 'omw' }; } } // bảng ghép nhầm nghĩa (D1) → lemma OMW của synset (ưu tiên lemma cũng có trong bảng dịch của từ)
    else if (t) X1.trC[l] = { t, src: 'wiktionary' };
    if (X1.trC[l]) P['tr_' + l] = X1.trC[l].t; }
  probe[x.k] = P; }
const W1 = await wsd3(okDef.map(x => ({ k: x.k, w: x.w, pos: x.pos, senses: sensesTxt(x._c), probes: probe[x.k] })));
const bagOf = t => new Set(t.toLowerCase().match(/[a-z']+/g) || []), dup = (p, c) => { const b = bagOf(c.t), q = bagOf(p.t); return [...b].filter(y => q.has(y)).length / new Set([...b, ...q]).size >= 0.5; };
function pickEx(X1, cands) { for (const c of cands.filter(c => c.ok).sort((p, q) => (/^wordnet/.test(q.src) - /^wordnet/.test(p.src)) || p.t.split(' ').length - q.t.split(' ').length)) if (X1.ex.length < 2 && !X1.ex.some(p => dup(p, c))) X1.ex.push(c); }
for (const x of okDef) { const X1 = X[x.k], v = W1[x.k], L = lockIdx(x._c); if (!v) { X1.wsdInfra = true; continue; }
  const ok = id => { const r = wsdOk(v[id], L); if (r) stat.wsd.ok++; return r; };
  pickEx(X1, X1.exAll.slice(0, 6).map((c, i) => ({ ...c, ok: ok('ex' + i) })));
  const viOk = X1.viC.filter((c, i) => ok('vi' + i));
  X1.viOkSet = new Set([...viOk.map(c => c.v), ...X1.viW.filter((w, i) => ok('vw' + i))]);
  // vi chỉ AI (2 họ trùng, không Wiktionary): phải có trong từ điển tiếng Việt (Viet74K ∪ vi kho) – như cũ
  const viKeep = viOk.filter(c => c.src.includes('wk') || !VIOK.size || VIOK.has(c.v));
  X1.m = {}; X1.trSrc = {}; X1.wsdTr = {};
  if (viKeep.length) { X1.m.vi = viKeep.map(c => c.v).join('; '); X1.trSrc.vi = viKeep.some(c => c.src.includes('wk')) ? 'wiktionary' : 'ai'; X1.viSrc = viKeep[0].src; }
  else X1.viFail = X1.viC.length ? 'dịch vi: không phương án nào qua trắc nghiệm nghĩa 3 giám khảo' : 'dịch vi: không có ≥ 2 nguồn độc lập trùng (Wiktionary / AI họ A / AI họ B)';
  for (const l of LANGS) if (X1.trC[l] && ok('tr_' + l)) { X1.m[l] = X1.trC[l].t; X1.trSrc[l] = X1.trC[l].src; X1.wsdTr[l] = true; stat.tr[X1.trC[l].src]++; } }
// ví dụ AI CHỈ khi thiếu câu người viết đúng nghĩa → trắc nghiệm nghĩa vòng 2 (cùng luật)
const needEx = okDef.filter(x => !X[x.k].wsdInfra && X[x.k].ex.length < 2); stat.exAi = needEx.length;
const AIX = {};
await pmap(chunks(needEx, 10), 8, async ch => { const r = await call('lxex', ch.map(x => ({ k: x.k, w: x.w, pos: x.pos, gloss: x.gloss, def: D[x.k].def, lemmas: x.lemmas, wnex: x.wnex, n: 2 - X[x.k].ex.length + 1, avoid: X[x.k].ex.map(e => e.t) })));
  if (r) for (const x of ch) { const ex = r.out[x.k] && r.out[x.k].ex; if (Array.isArray(ex)) AIX[x.k] = ex.filter(t => typeof t === 'string' && t.trim() && formRe(x.w).test(t)).slice(0, 3).map(t => ({ t: t.trim(), src: 'ai' })); } });
const W2 = await wsd3(needEx.filter(x => (AIX[x.k] || []).length).map(x => ({ k: x.k, w: x.w, pos: x.pos, senses: sensesTxt(x._c), probes: Object.fromEntries(AIX[x.k].map((c, i) => ['ax' + i, c.t])) })));
for (const x of needEx) { const X1 = X[x.k], c = AIX[x.k];
  if (!c) { X1.wsdInfra = true; continue; } // lxex hỏng → hạ tầng
  if (c.length && !W2[x.k]) { X1.wsdInfra = true; continue; }
  pickEx(X1, c.map((e, i) => ({ ...e, ok: wsdOk((W2[x.k] || {})['ax' + i], lockIdx(x._c)) })));
  if (X1.ex.length < 2) X1.exFail = 'ví dụ: không đủ 2 câu đúng nghĩa khoá (trắc nghiệm nghĩa 3 giám khảo, cả nguồn người viết lẫn AI)'; }
const ready = okDef.filter(x => !X[x.k].wsdInfra && X[x.k].ex.length === 2 && X[x.k].m.vi);
// CỔNG TỪ CÓ THẬT: lẫn ngôn ngữ (trcheck.py – pilot 11 pt "inyectar") cho mọi bản dịch + (lớp D2) bản dịch CHỈ có nguồn Wiktionary phải có trong kho tần suất
function trCheck(list, exist) { const tmp = (process.env.RUNNER_TEMP || process.env.TMPDIR || '/tmp') + '/lx-tr-' + process.pid, inp = {};
  for (const x of list) inp[x.k] = exist ? Object.fromEntries(Object.entries(X[x.k].m).filter(([l]) => X[x.k].trSrc[l] === 'wiktionary' && l !== 'vi')) : X[x.k].m; fs.writeFileSync(tmp + '.in.json', JSON.stringify(inp));
  try { console.log(execFileSync('python3', [fileURLToPath(new URL('trcheck.py', import.meta.url)), '--in', tmp + '.in.json', '--out', tmp + '.out.json', ...(exist ? ['--exist'] : [])], { encoding: 'utf8' }).trim()); return JSON.parse(fs.readFileSync(tmp + '.out.json', 'utf8')); }
  catch (e) { console.error('✗ trcheck.py', String(e.stderr || e.message).slice(-300)); return null; } }
{ const bad = trCheck(ready, false), bad2 = trCheck(ready, true);
  if (!bad || !bad2) { stat.trCheck = 'unavailable'; for (const x of ready) X[x.k].trBad = Object.fromEntries(LANGS.map(l => [l, ['trcheck.py lỗi']])); } // không kiểm được = KHÔNG nhận ngôn ngữ nào (an toàn)
  else { for (const x of ready) { const m = { ...(bad[x.k] || {}) }; for (const [l, w] of Object.entries(bad2[x.k] || {})) m[l] = [...(m[l] || []), ...w]; if (Object.keys(m).length) X[x.k].trBad = m; }
    stat.trBad = ready.filter(x => X[x.k].trBad).length; } }
for (const x of ready) T[x.k] = Object.fromEntries(LANGS.filter(l => X[x.k].m[l]).map(l => [l, X[x.k].m[l]])); // vi bắt buộc (lõi); 12 ngôn ngữ: có thì chấm, thiếu thì thôi
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
const pend = !WORDS && fs.existsSync(new URL(PEND, ROOT)) ? JSON.parse(rd(PEND)) : { id: BATCH, at: new Date().toISOString(), items: {} };
const queue = fs.existsSync(new URL(QUEUE, ROOT)) ? JSON.parse(rd(QUEUE)) : { _doc: 'Hàng duyệt nội dung (docs/CONTENT-QA.md): mục KHÔNG đạt cổng – không xuất.', items: [] };
const why = {}, gaps = new Set(), OUT = {}; // OUT: kết quả từng mục cho chế độ mẫu cố định (--words)
for (const x of items) {
  const g = G[x.k], c = x._c;
  const ent = g ? { w: x.w, pos: g.pos || x.pos, ipa: x._ipa.uk && ukStyle(x._ipa.uk), ipaUS: x._ipa.us, def: g.def || '', ex: g.ex || [], col: g.col || [], syn: g.syn || [], level: c.cefr, // CEFR: CEFR-J/Octanove → dải tần suất; AI KHÔNG đặt cấp (chỉ cờ lệch ở cổng)
     cefrF: c.cefrZ || c.cefr, cefrSrc: c.cefrSrc || 'freq', perLang: true, ...(X[x.k] && X[x.k].trBad ? { trBad: X[x.k].trBad } : {}), z: c.z, emoji: g.emoji || '', topic: g.topic || '', vi: g.vi || '', note_vi: g.note_vi || '', m: T[x.k] || {},
    src: { freq: 'wordfreq-3.1', sense: 'wordnet-3.0:' + c.syn, def: 'wordnet-gloss+ai-simplify', defGen: GM[x.k] || mGen, ipaUS: CMU.has(x.w) ? 'cmudict' : 'wiktionary', ipaUK: x._ipa.ukSrc, cefr: c.cefrSrc || 'freq',
      ex: X[x.k] ? X[x.k].ex.map(e => e.src) : [], tr: X[x.k] ? X[x.k].trSrc || {} : {}, trSense: X[x.k] ? X[x.k].tg : '', col: g.col && g.col.length ? 'wordnet/tatoeba' : '', syn: g.syn && g.syn.length ? 'wordnet' : '',
      lic: 'WordNet 3.0 (Princeton licence) · Tatoeba CC BY 2.0 FR · Wiktionary CC BY-SA 4.0 (kaikki.org) · CMUdict BSD-2 · CEFR-J 1.5 / Octanove CC BY-SA 4.0 · wordfreq CC BY-SA 4.0' }, qa: {} } : null;
  if (ent && X[x.k] && !X[x.k].defOk) ent.defChanged = X[x.k].defWhy || 'changed';
  if (ent) { ent.senseLock = c._lock || false; ent.src.senseLock = c._lock || ''; }
  if (ent && g.pos && g.pos !== x.pos) ent.posDrift = g.pos; // khóa nghĩa: từ loại cố định theo nghĩa WordNet đã chọn
  if (ent && x._ipa.posBad) ent.ipaPos = false; // heteronym: không có IPA Anh khớp từ loại
  if (ent && JK[x.k]) { const a = JA[x.k], b = JB[x.k], c = JC[x.k], J3 = [a, b, c];
    ent.qa = { n: 3, j: { ...(a ? { [JK[x.k].a]: +a.s } : {}), ...(b ? { [JK[x.k].b]: +b.s } : {}), ...(c ? { [JK[x.k].c]: +c.s } : {}) }, f: J3.map(j => j && j.f).filter(Boolean), tr: {}, bt: null };
    for (const l of LANGS) ent.qa.tr[l] = J3.map(j => j && j.tr && +j.tr[l]).filter(Number.isFinite);
    ent.qa.btw = Object.fromEntries(LANGS.map(l => [l, J3.map(j => j && j.bt && j.bt[l]).filter(Boolean)]));
    { ent.qa.viBtw = J3.map(j => j && typeof j.bt_vi === 'string' && j.bt_vi.trim()).filter(Boolean); ent.qa.viLem = x.lemmas || []; } // cổng dịch ngược vi (lib.mjs viBtOk) – mọi nguồn vi (AI lấp + Wiktionary)
    // khóa nghĩa · CEFR độc lập · cờ phiên âm/khác từ loại · vi đối chiếu Wiktionary (lib.mjs gateEntry)
    ent.qa.sense = J3.map(j => j && (j.sense === true || /^\s*yes/i.test(String(j.sense))) ? 'yes' : String((j && j.sense) ?? 'missing').toLowerCase());
    ent.qa.cefrJ = J3.map(j => String((j && j.cefr) || '').toUpperCase());
    ent.qa.bad = {}; for (const j of J3) for (const [l, v] of Object.entries((j && j.bad) || {})) if (LANGS.includes(l) && /translit|pos/.test(v)) ent.qa.bad[l] = String(v);
    if (viAlt(x)) { const vv = J3.map(j => String((j && j.vi) || 'unsure').toLowerCase()), fx = J3.map(j => String((j && j.vi_fix) || '').trim()), wk = (VIW[x.k] || []).map(v => v.w);
      ent.qa.vi = vv; ent.qa.viWikt = wk; // sửa theo Wiktionary CHỈ khi phương án đó đã qua trắc nghiệm nghĩa (idol "thần tượng" – 29/10)
      if (vv.every(v => v === 'alt') && fx[0] && wk.includes(fx[0]) && fx.every(f => f === fx[0] || wk.includes(f)) && fx.every(f => !wk.includes(f) || (X[x.k].viOkSet || new Set()).has(viNorm(f)[0]))) { ent.qa.viGen = ent.vi; ent.vi = [...new Set(fx.filter(f => wk.includes(f)))].join('; '); ent.qa.vi = vv.map(() => 'fixed'); } } }
  if (ent && JK[x.k] && X[x.k]) { /* trắc nghiệm nghĩa: chỉ trường đã qua mới vào mục (lib.mjs gateEntry kiểm lại) */ ent.qa.wsd = { ex: (X[x.k].ex || []).map(() => true), vi: !!(X[x.k].m && X[x.k].m.vi), tr: X[x.k].wsdTr || {} }; ent.qa.viSrc = X[x.k].viSrc || []; }
  // khoá nghĩa / ví dụ / vi không qua trắc nghiệm nghĩa = lỗi NỘI DUNG → hàng duyệt (không bỏ qua hạ tầng – trước 29/10 mục thiếu ví dụ bị chọn lại mãi)
  { const cf = c._lock === false ? ['nghĩa: không khoá được nghĩa thông dụng (nghĩa 1 Wiktionary ↔ WordNet, 3 giám khảo' + (c._lockVotes ? ' ' + JSON.stringify(c._lockVotes) : '') + ')']
      : X[x.k] && !X[x.k].wsdInfra ? [X[x.k].exFail, X[x.k].viFail].filter(Boolean) : [];
    if (cf.length && c._lock !== null) { why[cf[0].split(':')[0]] = (why[cf[0].split(':')[0]] || 0) + 1; OUT[x.k] = { pass: false, why: cf };
      if (!WORDS) { queue.items = queue.items.filter(q => !(q.src === 'lexicon-expand' && q.id === x.k)); queue.items.push({ src: 'lexicon-expand', id: x.k, batch: BATCH, why: cf, at: new Date().toISOString().slice(0, 10), ...(ent ? { data: ent } : {}) }); }
      continue; } }
  if (c._lock === null || (X[x.k] && X[x.k].wsdInfra)) { why.infra = (why.infra || 0) + 1; continue; } // trắc nghiệm nghĩa thiếu giám khảo = hạ tầng
  if (ent) ent.tp = assignTopics(ent); // chủ đề: miền → chủ đề → tiểu chủ đề (content/lexicon/topics.json)
  // hạ tầng (không sinh được / không dịch được / thiếu 2 giám khảo) ≠ lỗi nội dung → bỏ qua, lượt sau làm lại
  if (ent && ent.defChanged) { /* nội dung: viết lại đổi nghĩa → cổng */ } else if ((ent && g.keep !== false && g.def && (!T[x.k] || !JK[x.k] || ent.ex.length !== 2)) || !g) { // !g: gọi lỗi HOẶC mô hình bỏ sót mục → lượt sau làm lại (không đốt từ vào hàng duyệt)
    why.infra = (why.infra || 0) + 1; continue; }
  // IPA khớp nguồn (chủ 28/10, pilot 20261028 uninteresting US /əˈnɪntrəstɪŋ/): lệch → sửa theo Britfone/CMU (1 phương án) hoặc trượt 'ipa: lệch Britfone/CMU …'
  if (ent) { const c = checkEntry(ent, REFS);
    if (c.fix.length) { ent.ipa = c.ipa; ent.ipaUS = c.ipaUS; ent.src.ipaFix = c.fix; if (c.fix.some(f => /ukToUs/.test(f))) ent.src.ipaUS = 'ukToUs'; stat.ipaFix = (stat.ipaFix || 0) + 1; }
    if (c.bad.length) { ent.ipaBad = c.bad; stat.ipaBad = (stat.ipaBad || 0) + 1; } }
  const r = gateEntry(ent, { keep: g ? g.keep !== false : null, keepWhy: g && g.why });
  OUT[x.k] = { pass: !!r.ok, why: r.why || [], ...(ent ? { ent } : {}) };
  if (hasGap(r)) { why.gap = (why.gap || 0) + 1; gaps.add(x.k); continue; } // có lỗ dữ liệu nguồn (thiếu IPA…, kể cả kèm lỗi nội dung – vd. 20261027-pilot) → không vào hàng duyệt, lượt sau sinh lại
  if (r.ok) { ent.qa.bt = r.bt; delete ent.qa.btw; delete ent.qa.viLem; if (r.drop) { for (const l of Object.keys(r.drop)) delete ent.m[l]; ent.qa.trDrop = r.drop; ent.qa.trKeep = r.keep.filter(l => ent.m[l]); delete ent.perLang; } pend.items[x.k] = ent; }
  else if (!queueable(r, callOk.get(x.k))) { why.infra = (why.infra || 0) + 1; }
  else if (WORDS) why[r.why[0].split(':')[0]] = (why[r.why[0].split(':')[0]] || 0) + 1;
  else { why[r.why[0].split(':')[0]] = (why[r.why[0].split(':')[0]] || 0) + 1; queue.items = queue.items.filter(q => !(q.src === 'lexicon-expand' && q.id === x.k)); queue.items.push({ src: 'lexicon-expand', id: x.k, batch: BATCH, why: r.why.slice(0, 4), at: new Date().toISOString().slice(0, 10), ...(ent ? { data: ent } : {}) }); }
}
// lưới cuối: KHÔNG bao giờ ghi IPA lệch vào lô chờ (kể cả mục cũ của cùng lô) – cùng kiểm với promote.mjs
for (const [k, e] of Object.entries(pend.items)) { const c = checkEntry(e, REFS); if (c.bad.length || c.fix.length) { console.error(`✗ ${k}: IPA lệch nguồn – bỏ khỏi lô (${[...c.fix, ...c.bad].join(' · ')})`); delete pend.items[k]; if (OUT[k]) OUT[k] = { ...OUT[k], pass: false, why: ['ipa: lệch Britfone/CMU (lưới cuối)'] }; stat.ipaDrop = (stat.ipaDrop || 0) + 1; } }
pend.n = Object.keys(pend.items).length;
if (WORDS) { fs.mkdirSync(new URL('reports/', ROOT), { recursive: true }); wr('reports/pilot-hard-out.json', JSON.stringify({ batch: BATCH, at: new Date().toISOString(), words: WORDS, items: OUT })); }
else { fs.mkdirSync(new URL('content/lexicon/expand/pending/', ROOT), { recursive: true });
if (pend.n) wr(PEND, JSON.stringify(pend, null, 0).replace(/,"(?=[^"]+#(n|v|adj|adv)":)/g, ',\n"') + '\n');
wr(QUEUE, JSON.stringify(queue, null, 1) + '\n');
{ const settled = new Set([...Object.keys(pend.items), ...queue.items.filter(q => q.src === 'lexicon-expand').map(q => q.id)]); // chỉ bỏ khỏi retry khi ĐÃ đạt hoặc vào hàng duyệt (hạ tầng hỏng → giữ; run 40080132264 xóa nhầm)
  retry.items = [...new Set([...retry.items.filter(k => !settled.has(k)), ...gaps])].sort();
  fs.mkdirSync(new URL('content/lexicon/expand/retry/', ROOT), { recursive: true }); wr(RETRY, JSON.stringify(retry, null, 1) + '\n'); } }
// độ phủ theo trường: nguồn người viết vs AI (mục ĐẠT của lượt này)
for (const x of items) { const e = pend.items[x.k]; if (!e || !e.src || !e.src.ex) continue; cov.def.wordnet++;
  for (const s of e.src.ex) cov.ex[s.startsWith('tatoeba') ? 'tatoeba' : s.startsWith('wordnet') ? 'wordnet' : s]++;
  for (const l of LANGS) { const t = (e.src.tr || {})[l]; if (t && e.m[l]) cov.tr[t] = (cov.tr[t] || 0) + 1; else cov.tr.none = (cov.tr.none || 0) + 1; } cov.vi[(e.src.tr || {}).vi === 'wiktionary' ? 'wiktionary' : 'ai']++;
  cov.col[e.col.length ? 'src' : 'none']++; cov.syn[e.syn.length ? 'wordnet' : 'none']++; cov.cefr[e.cefrSrc] = (cov.cefr[e.cefrSrc] || 0) + 1; }
const sec = (Date.now() - t0) / 1000, pass = Object.keys(pend.items).length;
const rep = { batch: BATCH, n: items.length, pass, yield: +(pass / Math.max(1, items.length - (why.infra || 0) - (why.gap || 0))).toFixed(3), lock: stat.lock, resense: stat.resense, wsd: stat.wsd, vi: stat.vi, tr: stat.tr, exAi: stat.exAi || 0, trBad: stat.trBad || 0, cov, tatoeba: Object.values(EXT).filter(v => v.ex.length >= 2).length, review: items.length - pass - (why.infra || 0) - (why.gap || 0), skipped: why.infra || 0, gap: why.gap || 0, pool: stat.pool || 'ok', why, calls: stat.calls, fail: stat.fail, retry: stat.retry || 0, ukMiss: stat.ukMiss, ukEspeak: stat.ukEspeak || 0, ipaFix: stat.ipaFix || 0, ipaBad: stat.ipaBad || 0, ipaDrop: stat.ipaDrop || 0, sec: Math.round(sec), perHour: Math.round(items.length / sec * 3600), models: { gen: mGen, a: mA, b: mB }, ai: { routes: [...used], ...AI.stats() }, topics: buildTopicSets(Object.entries(pend.items).map(([k, e]) => ({ k, e })), TAX()).stats };
AI.report('lexicon-expand'); fs.mkdirSync(new URL('reports/', ROOT), { recursive: true }); wr('reports/lexicon-expand.json', JSON.stringify(rep, null, 1));
console.log('✓ lexicon-expand ' + JSON.stringify(rep));
// kho AI cạn hoàn toàn (mọi mục bỏ qua hạ tầng, không mục nào vào hàng duyệt) = KHÔNG phải lỗi: lịch 3 giờ thử lại (27/10 – kho CF cửa sổ 24 giờ trượt)
if (!pass && (why.infra || 0) >= items.length && items.length) { console.log('::warning::lexicon-expand: kho AI cạn (' + (why.infra || 0) + '/' + items.length + ' bỏ qua hạ tầng) – lượt sau thử lại'); process.exit(0); }
if (!pass) { console.error('✗ lexicon-expand: 0 mục đạt' + (stat.pool ? ' – mọi tuyến AI hỏng/hết hạn mức (xem Quản trị › Khóa API › Sức chứa)' : '')); process.exit(1); }
