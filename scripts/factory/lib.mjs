// Xưởng nội dung chung (docs/CONTENT-FACTORY.md) – MỘT lõi cho mọi mảng: scripts/factory/<mảng>.mjs chỉ khai báo LOẠI (kind).
// Mỗi lô (≤ 25 hạt giống): tầng 0 khuôn/luật (0 token) → tầng 1 soạn qua ai-pool (gem → groq → GrabCast; KHÔNG neuron CF – để cho ảnh,
// KHÔNG AI tài khoản chính) → tầng 2 judgePair (2 giám khảo khác họ hoặc cặp gpt-oss 120b/20b, mọi điểm ≥ 4, lệch ≤ 1) → lớp 6
// soát mẫu ≥ 5 % bằng giám khảo thứ ba khác mô hình (như scripts/lexicon/expand/audit.mjs; sai > 2 % → loại cả lô).
// Kết quả lô → out/<mảng>-<kind>-<shard>.json; scripts/factory/merge.mjs gom các lô của đêm thành MỘT PR bot.
// Hợp đồng kind: { area, kind, std, have(), seeds(): [{k, ...}], sys, rubric, view(item, seed), rules(item, seed) → [lỗi], apply(list) }
import fs from 'node:fs';
import crypto from 'node:crypto';
import { createPool, judgeKey, familyOf } from '../lib/ai-pool.mjs';

export const STATE = 'content/factory/state.json', OUTDIR = 'out/factory';
export const rd = p => fs.readFileSync(p, 'utf8'), ex = p => fs.existsSync(p), rj = (p, d) => (ex(p) ? JSON.parse(rd(p)) : d);
export const wj = (p, o) => { fs.mkdirSync(p.replace(/\/[^/]+$/, ''), { recursive: true }); fs.writeFileSync(p, JSON.stringify(o, null, 1) + '\n'); };
export const h8 = s => crypto.createHash('sha1').update(String(s)).digest('hex').slice(0, 8);
export const words = s => String(s || '').trim().split(/\s+/).filter(Boolean).length;
export const AREAS = ['comm', 'grammar']; // mảng có xưởng (đợt 2: skills, exam; đợt 3: vocab, i18n)
export const loadKinds = async area => (await import(`./${area}.mjs`)).KINDS;
export const MAX_TRIES = 2; // luật "dừng sau 2 lần trượt": hạt giống trượt 2 lần → hàng duyệt người, không sinh lại
export const chunks = (a, n) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n));

// ---------- luật tầng 0 dùng chung (tiếng Anh mẫu) ----------
const VI = /[ăâđêôơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]/i;
export function enLint(s, where = '') {
  const e = [], t = String(s ?? '');
  if (!t.trim()) e.push(`${where}: rỗng`);
  if (VI.test(t)) e.push(`${where}: lẫn tiếng Việt`);
  if (/\s{2,}|\s[,.!?;:]/.test(t)) e.push(`${where}: khoảng trắng sai`);
  if (/[\u{1F300}-\u{1FAFF}]/u.test(t)) e.push(`${where}: emoji`);
  if (/\b(lorem|TODO|placeholder|as an ai)\b/i.test(t)) e.push(`${where}: chữ giữ chỗ`);
  return e;
}
/** cấp CEFR → độ dài câu tối đa (P0.2 sense-check: A1 ≤ 8 … C1 ≤ 25) */
export const MAXW = { A1: 10, A2: 14, B1: 18, B2: 22, C1: 26, C2: 30 };

// ---------- trạng thái (tiếp tục được, không sinh lại thứ đã có) ----------
export function loadState() { return rj(STATE, { tries: {}, done: {}, nights: [] }); }

/** chọn hạt giống của shard: chưa xong, chưa trượt đủ 2 lần, chia theo băm k (tất định – shard không trùng nhau) */
export function pick(K, { n, shard = 0, shards = 1, state = loadState() }) {
  const tk = K.kind + ':';
  return K.seeds().filter(s => !state.done[tk + s.k] && (state.tries[tk + s.k] || 0) < MAX_TRIES && parseInt(h8(K.kind + s.k), 16) % shards === shard).slice(0, n);
}

export const JUDGE_SYS = rubric => 'You are a strict senior ELT editor (Cambridge/British Council level) reviewing NEW learning items written by another model for an English app used by learners of 15 languages. ' +
  'Score each item 1-5: 5 = publishable as is; 4 = correct and natural, tiny style issues only; 3 = one real problem; 1-2 = wrong, misleading or unnatural. ' +
  'Any factual/grammar error, wrong answer key, more than one defensible answer, wrong CEFR level, unnatural English or culturally offensive content caps the score at 3. ' + rubric +
  ' Return JSON {"<k>": {"s": <1-5>, "why": "short reason"}} with one key per item.';
const AUDIT_SYS = rubric => 'You are the final auditor of an English learning content batch. Flag ONLY real errors a teacher would correct (wrong answer, ambiguous key, ungrammatical or unnatural English, wrong level, wrong function/register). ' + rubric +
  ' Return JSON {"<k>": {"ok": true|false, "bad": ["field: short reason"]}} with one key per item.';
export const score = (o, k) => { const v = o && o[k], s = +(v && typeof v === 'object' ? v.s : v); return Number.isFinite(s) && s >= 1 && s <= 5 ? s : null; };
const verdict = (o, k) => { const v = o && o[k]; if (!v || typeof v !== 'object') return null; return v.ok === false || v.ok === 'false' ? [].concat(v.bad || 'lỗi') : v.ok === true || v.ok === 'true' ? [] : null; };

/** chạy MỘT lô cho kind K → { accepted, review, rejected, stats } (không ghi nguồn – merge.mjs ghi) */
export async function runBatch(K, { n = 25, shard = 0, shards = 1, pool, dry = false, log = console.log } = {}) {
  const state = loadState(), seeds = pick(K, { n, shard, shards, state });
  const st = { kind: K.kind, area: K.area, shard, seeds: seeds.length, gen: 0, rule: 0, judged: 0, low: 0, nojudge: 0, audit: 0, auditBad: 0, models: {} };
  const res = { accepted: [], review: [], rejected: [], stats: st };
  if (!seeds.length || dry) return res;
  const AI = pool || createPool({ budget: { lexai: 0, cf2: 0 }, prompt: req => ({ sys: req.mode === 'cfgen' ? K.sys : req.mode === 'cfaudit' ? AUDIT_SYS(K.rubric) : JUDGE_SYS(K.rubric), user: JSON.stringify(req.items), temp: req.mode === 'cfgen' ? 0.5 : 0.1 }) });
  const bySeed = new Map(seeds.map(s => [s.k, s]));
  const fail = (s, why, item) => { res.rejected.push({ k: s.k, why, item }); };
  // tầng 1: soạn theo lô nhỏ (GrabCast cắt câu trả lời dài)
  const made = [];
  for (const ch of chunks(seeds, K.genChunk || 5)) {
    const g = await AI.gen({ mode: 'cfgen', items: ch.map(s => K.prompt ? K.prompt(s) : s) });
    if (!g) { log(`⏸ ${K.kind}: không tuyến soạn nào trả lời – dừng lô (hạt giống giữ nguyên)`); break; }
    st.models[g.model] = (st.models[g.model] || 0) + ch.length;
    for (const s of ch) {
      const it = g.out[s.k]; st.gen += !!it;
      if (!it || typeof it !== 'object') { fail(s, 'không sinh'); continue; }
      const errs = K.rules(it, s); // tầng 0 sau sinh: khuôn + luật cứng
      if (errs.length) { st.rule++; fail(s, errs.slice(0, 3).join(' · '), it); continue; }
      made.push({ s, it, gen: g.model, fam: familyOf(g.model) });
    }
  }
  // tầng 2: hai giám khảo (khác họ mô hình soạn), lớp 3 CONTENT-QA
  const ok = [];
  for (const ch of chunks(made, K.judgeChunk || 6)) {
    const req = { mode: 'cfjudge', items: ch.map(m => ({ k: m.s.k, ...K.view(m.it, m.s) })) };
    const { a, b } = await AI.judgePair(req, { exclude: [ch[0].fam] });
    for (const m of ch) {
      const sa = a && score(a.out, m.s.k), sb = b && score(b.out, m.s.k);
      if (sa == null || sb == null) { st.nojudge++; continue; } // thiếu giám khảo = bỏ qua trung tính (không xuất, không tính lần trượt)
      st.judged++;
      const qa = { gen: m.gen, j: { [judgeKey(a.model)]: sa, [judgeKey(b.model)]: sb } };
      if (sa >= 4 && sb >= 4 && Math.abs(sa - sb) <= 1) ok.push({ ...m, qa, by: [a.model, b.model] });
      else { st.low++; res.review.push({ k: m.s.k, kind: K.kind, item: m.it, qa, why: [a.out[m.s.k]?.why, b.out[m.s.k]?.why].filter(Boolean).join(' | ').slice(0, 300) }); }
    }
  }
  // lớp 6: soát mẫu ≥ 5 % (≥ 1) bằng giám khảo thứ ba khác mô hình hai giám khảo trước; sai > 2 % → loại cả lô
  const N = Math.min(ok.length, Math.max(1, Math.ceil(ok.length * 0.05)));
  const sample = ok.slice().sort((x, y) => (h8(K.kind + x.s.k) < h8(K.kind + y.s.k) ? -1 : 1)).slice(0, N);
  const checked = [];
  for (const ch of chunks(sample, 5)) {
    const req = { mode: 'cfaudit', items: ch.map(m => ({ k: m.s.k, ...K.view(m.it, m.s) })) };
    const c = await AI.judge(req, { slot: 'C', excludeModels: [...new Set(ch.flatMap(m => m.by))] });
    for (const m of ch) { const v = c && verdict(c.out, m.s.k); if (v) { st.audit++; checked.push({ id: m.s.k, ok: !v.length, ...(v.length ? { note: v.slice(0, 2).join(' · ') } : {}), by: c.model }); } }
  }
  const bad = checked.filter(x => !x.ok).length;
  st.auditBad = bad;
  const batch = { id: `cf-${K.kind}-${new Date().toISOString().slice(0, 10)}-s${shard}`, source: 'content-factory', kind: K.kind, n: ok.length, checked, status: !ok.length ? 'empty' : checked.length < N ? 'pending' : bad / Math.max(1, checked.length) > 0.02 ? 'rejected' : 'accepted' };
  if (batch.status === 'accepted') for (const m of ok) res.accepted.push({ k: m.s.k, seed: m.s, item: K.finalize ? K.finalize(m.it, m.s) : m.it, qa: m.qa });
  else for (const m of ok) res.review.push({ k: m.s.k, kind: K.kind, item: m.it, qa: m.qa, why: `lô ${batch.status} (soát mẫu ${bad}/${checked.length} sai)` });
  res.batch = batch;
  log(`${K.area}/${K.kind} s${shard}: ${seeds.length} hạt → sinh ${st.gen} · trượt luật ${st.rule} · chấm ${st.judged} (thấp ${st.low}, thiếu GK ${st.nojudge}) · soát ${checked.length} (sai ${bad}) → lô ${batch.status}, nhận ${res.accepted.length}`);
  return res;
}

/** cập nhật trạng thái sau khi merge: nhận → done; trượt luật/thấp → tries++ (thiếu giám khảo không tính) */
export function settle(state, kind, r) {
  const tk = kind + ':';
  for (const a of r.accepted) state.done[tk + a.k] = 1;
  for (const x of [...r.rejected, ...r.review.filter(v => !/^lô (pending|empty)/.test(v.why || ''))]) state.tries[tk + x.k] = (state.tries[tk + x.k] || 0) + 1;
  return state;
}
