#!/usr/bin/env node
// Thước đo SƯ PHẠM "Dễ học – dễ nhớ" (P0-H, docs/specs/learnability.md): 12 tiêu chí (a…l) có nghiên cứu → luật đo bằng máy, tầng 0 (0 token, chỉ đọc repo).
// Khác content-check/gate (ĐỘ ĐÚNG) và content-score (ĐỘ PHỦ): ở đây chấm từng bài/đơn vị xem có giúp người học nhớ lâu không.
// Mỗi tiêu chí 0…1; tiêu chí không áp dụng cho loại bài = null (không tính). Điểm đơn vị = trung bình có trọng số × 100; điểm mảng = trung bình đơn vị.
// Dùng: node scripts/content-qa/learnability.mjs          → content/pipeline/LEARN.md + reports/learnability.json
//       node scripts/content-qa/learnability.mjs --queue  → thêm: 25 bài yếu nhất của mảng thấp nhất vào content/pipeline/targets.json ("Dễ học – lô")
import fs from 'node:fs'; import vm from 'node:vm';
import { loadContent } from '../lib/content-load.mjs';
import { loadAllPlus } from '../lexicon/lib.mjs';
import { readIndex } from '../sentence-audio/lib.mjs';

const ARG = process.argv.slice(2), rd = p => fs.readFileSync(p, 'utf8'), ex = p => fs.existsSync(p);
const LV = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'], rank = l => LV.indexOf(String(l || '').slice(0, 2).toUpperCase()) + 1;
const clip = x => Math.max(0, Math.min(1, x)), words = s => String(s || '').match(/[A-Za-z][A-Za-z'’-]*/g) || [];
const plain = s => String(s || '').replace(/<<[^>]*>>/g, '').replace(/\[\[([^|\]]*)(\|[^\]]*)?\]\]/g, '$1').replace(/\{\{([^}]*)\}\}/g, '$1').replace(/<[^>]+>/g, '');
// Trọng số: truy hồi + phản hồi + lặp lại nặng nhất (hiệu ứng lớn nhất trong Dunlosky và cs. 2013, Hattie 2007)
export const CRIT = {
  a: ['Truy hồi chủ động', 14], b: ['Lặp lại giãn cách', 10], c: ['Tải nhận thức', 8], d: ['i+1 (từ không vượt cấp)', 10],
  e: ['Ví dụ + cặp ✗/✓', 10], f: ['Mã hoá kép (audio + hình)', 8], g: ['Phản hồi "vì sao"', 12], h: ['Xen kẽ luật cũ', 6],
  i: ['Ngữ cảnh (câu gốc)', 6], j: ['Đầu ra nói/viết', 8], k: ['Mẹo nhớ', 4], l: ['Thời lượng vừa vòng 30′', 4] };

// ---------- Từ điển cấp CEFR (kho từ một nguồn) cho i+1 ----------
const LEX = new Map();
const ROWS = await loadAllPlus();
for (const { row } of ROWS) { const w = String(row[0] || '').toLowerCase(), r = rank(row[8]); if (w && r && !w.includes(' ') && !(LEX.get(w) <= r)) LEX.set(w, r); }
const lvOf = w => { w = w.toLowerCase().replace(/’/g, "'").replace(/'s$/, ''); if (LEX.has(w)) return LEX.get(w);
  for (const [re, to] of [[/ies$/, 'y'], [/ied$/, 'y'], [/(ss|sh|ch|x|o)es$/, '$1'], [/s$/, ''], [/ed$/, ''], [/ed$/, 'e'], [/(.)\1ed$/, '$1'], [/ing$/, ''], [/ing$/, 'e'], [/(.)\1ing$/, '$1'], [/ly$/, ''], [/er$/, ''], [/est$/, '']]) {
    const b = w.replace(re, to); if (b !== w && LEX.has(b)) return LEX.get(b); }
  return 0; };
// i+1: tỉ lệ token (đã biết cấp) vượt cấp bài > 1 bậc; chuẩn Nation (2006) ≈ 98 % từ phải trong tầm → ≤ 2 % vượt = 1 điểm, 10 % = 0
export const overRate = (texts, level) => { const L = rank(level); if (!L) return null; let n = 0, o = 0;
  for (const t of texts) for (const w of words(plain(t))) { if (/^[A-Z]/.test(w) && !LEX.has(w.toLowerCase())) continue; const r = lvOf(w); if (!r) continue; n++; if (r > L + 1) o++; }
  return n ? o / n : null; };
const iPlus1 = (texts, level) => { const r = overRate(texts, level); return r == null ? null : clip(1 - (r - 0.02) / 0.08); };

// ---------- Âm thanh Kokoro dựng sẵn (cùng khóa scripts/sentence-audio/corpus.mjs) ----------
const KV = (() => { const c = { self: {} }; c.self = c; vm.createContext(c); vm.runInContext(rd('web/js/listen/kvoice.js'), c); return c.KVoice; })();
const { have: HAVE } = readIndex();
const voiced = (v, t) => { if (!t || !/[A-Za-z]/.test(t)) return null; if (HAVE.has(KV.lineKey(v, t))) return true; const s = KV.split(t); return s.length > 0 && s.every(x => HAVE.has(KV.lineKey(v, x))); };
const audioRate = (pairs) => { const r = pairs.map(([v, t]) => voiced(v, t)).filter(x => x != null); return r.length ? r.filter(Boolean).length / r.length : null; };

// ---------- Phản hồi: "vì sao" cụ thể = đủ dài và nhắc tới đáp án/ phương án sai (không chỉ "Đúng là B") ----------
export const specific = (why, keys = []) => { const w = plain(why).trim(); if (w.length < 25) return 0; const low = w.toLowerCase();
  const hit = keys.filter(Boolean).some(k => low.includes(String(k).toLowerCase().trim().slice(0, 24)));
  return hit || /vì|because|→|nên|do |khi |dùng|là /.test(low) ? 1 : 0.5; };
const arr = x => (x == null ? [] : [].concat(x));
const mean = a => { const x = a.filter(v => v != null); return x.length ? x.reduce((s, v) => s + v, 0) / x.length : null; };
// Thời lượng: phút ước tính so với khoảng [lo, hi]; ngoài khoảng giảm tuyến tính tới 0 ở gấp đôi
const fit = (min, lo, hi) => (min >= lo && min <= hi ? 1 : min < lo ? clip(min / lo) : clip(2 - min / hi));

const C = loadContent();
const units = [];
const add = (area, id, title, level, crit, fix) => {
  let W = 0, S = 0; for (const [k, v] of Object.entries(crit)) if (v != null && CRIT[k]) { W += CRIT[k][1]; S += CRIT[k][1] * clip(v); }
  units.push({ area, id, title, level, score: W ? Math.round(S / W * 1000) / 10 : 0, crit: Object.fromEntries(Object.entries(crit).map(([k, v]) => [k, v == null ? null : Math.round(clip(v) * 100) / 100])), fix: fix.filter(Boolean) });
};

// ================= 1. Ngữ pháp (77 bài) =================
const G = C.GRAMMAR || [], GC = C.GRAMMAR_CHECK || {};
const GRE = Object.fromEntries(Object.entries(GC).map(([id, a]) => [id, (Array.isArray(a) ? a : [a]).map(s => { try { return new RegExp(s, 'i'); } catch { return null; } }).filter(Boolean)]));
const gSent = g => [...(g.quiz || []).map(q => String(q.q || '').replace(/___/g, String((q.options || [])[q.answer] || ''))), ...(g.drills || []).map(d => arr(d.a)[0] || d.q || '')].map(plain);
const gEx = g => { const o = []; const walk = x => { if (!x || typeof x !== 'object') return; for (const [k, v] of Object.entries(x)) if (k === 'ex' && typeof v === 'string') o.push(v); else if (typeof v === 'object') walk(v); }; walk(g.blocks); return o; };
const SENT = Object.fromEntries(G.map(g => [g.id, gSent(g)]));
for (const g of G) {
  const B = g.blocks || [], Q = g.quiz || [], D = g.drills || [], by = t => B.filter(b => b.type === t);
  const uses = by('uses').flatMap(b => b.items || []), mist = by('mistake'), tips = by('tip'), exs = gEx(g);
  const readItems = B.length + uses.length, act = Q.length + D.length;
  // (b) cấu trúc bài này quay lại ở bài khác (máy nhận diện GRAMMAR_CHECK chạy trên câu của bài khác) – ôn giãn cách qua lộ trình
  const back = (GRE[g.id] || []).length ? G.filter(o => o.id !== g.id && SENT[o.id].some(s => GRE[g.id].some(re => re.test(s)))).length : null;
  // (h) bài này có trộn cấu trúc của bài khác (luật cũ) trong câu hỏi/tự luận
  const mixed = G.filter(o => o.id !== g.id && rank(o.level) <= rank(g.level) && (GRE[o.id] || []).length && SENT[g.id].some(s => GRE[o.id].some(re => re.test(s)))).length;
  const explainLen = mean([...tips.map(t => plain(t.text).length), ...mist.map(m => plain(m.why).length)]) || 0;
  const maxLen = [0, 160, 180, 220, 240, 280, 300][rank(g.level)] || 240;
  const fb = [...Q.map(q => specific(q.explain, [(q.options || [])[q.answer], ...(q.options || [])])), ...D.map(d => specific(d.ex, arr(d.a)))];
  const prod = D.filter(d => /rewrite|combine|form/.test(d.t)).length;
  const minutes = (plain(JSON.stringify(B)).length / 900) + Q.length * 0.35 + D.length * 0.7; // ~900 ký tự/phút đọc giải thích + 20 s/câu chọn + 40 s/câu tự luận
  const visual = by('timeline').length + by('diagram').length + by('scale').length + by('table').length + by('sort').length;
  const crit = {
    a: clip((act / (act + readItems)) / 0.6) * (Q.length >= 10 && D.length >= 10 ? 1 : 0.7),
    b: back == null ? 0.3 : clip(back / 3),
    c: (uses.length <= 7 ? 0.5 : 0.5 * 7 / uses.length) + 0.5 * clip(maxLen / Math.max(maxLen, explainLen)),
    d: iPlus1([...exs, ...SENT[g.id]], g.level),
    e: 0.5 * clip(exs.length / 3) + 0.5 * clip(mist.length / 2),
    f: 0.5 * clip(visual) + 0.5 * (audioRate(exs.map(t => ['bf_emma', t])) ?? 0),
    g: mean(fb) ?? 0,
    h: clip(mixed / 2),
    i: exs.length ? exs.filter(t => words(plain(t)).length >= 5).length / exs.length : 0,
    // đầu ra: câu tự viết lại/ghép (có kiểm soát) + nhiệm vụ TỰ DO cuối bài (tự đặt câu/nói về bản thân: drill t = own|say|free hoặc khối task)
    j: 0.4 * clip(prod / 5) + 0.6 * (D.some(d => /^(own|say|free|write)$/.test(d.t)) || by('task').length ? 1 : 0),
    k: clip(tips.length),
    l: fit(minutes, 6, 15) };
  add('grammar', g.id, g.title, g.level, crit, [
    crit.a < 0.8 && `truy hồi: ${act} câu tự làm / ${readItems} mục chỉ đọc → thêm bài tập`,
    crit.b < 1 && `lặp lại: cấu trúc chỉ quay lại ở ${back ?? '?'} bài khác (cần ≥ 3)${back == null ? ' – chưa có mẫu GRAMMAR_CHECK' : ''}`,
    crit.d != null && crit.d < 0.8 && `i+1: ${Math.round(overRate([...exs, ...SENT[g.id]], g.level) * 100)}% từ vượt ${g.level} > 1 bậc`,
    crit.e < 1 && `ví dụ: ${exs.length} câu, ${mist.length} cặp ✗/✓ (cần ≥ 3 và ≥ 2)`,
    crit.f < 0.8 && `mã hoá kép: ${visual ? '' : 'chưa có hình (timeline/sơ đồ/bảng) · '}audio ${Math.round((audioRate(exs.map(t => ['bf_emma', t])) ?? 0) * 100)}%`,
    crit.g < 0.9 && `phản hồi: ${fb.filter(x => x < 1).length}/${fb.length} giải thích chưa cụ thể`,
    crit.h < 1 && `xen kẽ: chỉ trộn ${mixed} cấu trúc cũ (cần ≥ 2)`,
    crit.j < 1 && `đầu ra: ${prod} câu viết lại/ghép, chưa có nhiệm vụ tự đặt câu/nói cuối bài`,
    crit.k < 1 && 'mẹo nhớ: chưa có khối tip',
    crit.l < 1 && `thời lượng ≈ ${Math.round(minutes)}′ (khung 6–15′)`]);
}

// ================= 2. Bài lộ trình (truyện + radio của #/lesson) =================
const ST = ex('content/lesson/stories.json') ? JSON.parse(rd('content/lesson/stories.json')).items || [] : [];
const SV = { ama: 'af_heart', carlos: 'am_michael' };
for (const s of ST) {
  const L = s.lines || [], K = s.checks || [], qs = K.filter(k => k.q || k.type === 'q');
  const crit = {
    a: clip((K.length / Math.max(1, L.length)) / 0.3), b: null, c: clip(12 / Math.max(12, L.length)),
    d: iPlus1(L.map(l => l.en), s.cefr), e: null, f: audioRate(L.map(l => [SV[l.who] || 'af_heart', l.en])) ?? 0,
    g: qs.length ? mean(qs.map(k => (k.why || k.explain ? specific(k.why || k.explain, k.options || []) : 0))) : null,
    h: null, i: 1, j: K.some(k => /say|speak|write|tap/.test(k.type || k.kind || '')) ? 1 : 0, k: null, l: fit(L.length * 0.15 + K.length * 0.3, 2, 6) };
  add('path', s.id, s.title, s.cefr, crit, [crit.a < 1 && `truy hồi: ${K.length} câu kiểm / ${L.length} câu thoại (cần ≥ 30 %)`, crit.f < 1 && `audio ${Math.round(crit.f * 100)}%`,
    crit.g != null && crit.g < 1 && 'phản hồi: câu hỏi hiểu chưa có "vì sao"', crit.j < 1 && 'đầu ra: chưa có bước nói lại / xếp câu']);
}

// ================= 3. Bộ từ (mỗi bộ = 1 đơn vị) =================
const IMG = ex('content/lexicon/img.json') ? JSON.parse(rd('content/lexicon/img.json')).items || {} : {};
const W3 = new Map((ex('web/audio/w/s3.tsv') ? rd('web/audio/w/s3.tsv') : '').split('\n').filter(Boolean).map(l => { const [w, ...x] = l.split('\t'); return [w, x]; }));
const GOLD = new Set([...rd('web/cpack/lesson/gold.js').matchAll(/"([^"]+)":\[\{"why"/g)].map(m => m[1].toLowerCase()));
// (k) nhóm dễ nhầm, tầng 0: hai từ cùng loại, dài ≥ 5, khác nhau ≤ 2 ký tự (affect/effect, adapt/adopt, complement/compliment) → cần mẹo/cách dùng (gold "why")
const lev = (a, b) => { if (Math.abs(a.length - b.length) > 2) return 9; let p = [...Array(b.length + 1).keys()]; for (let i = 1; i <= a.length; i++) { const c = [i]; for (let j = 1; j <= b.length; j++) c[j] = Math.min(p[j] + 1, c[j - 1] + 1, p[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); p = c; } return p[b.length]; };
// cùng họ từ / biến thể chính tả (connect–connector, stabilize–stabilise, labor–labour) không phải "dễ nhầm nghĩa" → loại
const SPELL = w => w.replace(/is(e|ed|es|ing|ation)$/, 'iz$1').replace(/isation/, 'ization').replace(/our/, 'or').replace(/tre$/, 'ter').replace(/ll(ed|ing)$/, 'l$1');
const SUF = /^(r|er|or|s|es|y|ly|al|ally|ist|ism|ity|ion|ive|ee|ian|ing|ed|ness|ment|ry|ics|ical|ic|cy|ce|e)$/;
export const sameFamily = (a, b) => { if (SPELL(a) === SPELL(b)) return true; const [s, l] = a.length <= b.length ? [a, b] : [b, a];
  const st = /e$/.test(s) ? s.slice(0, -1) : s; return st.length >= 4 && l.startsWith(st) && SUF.test(l.slice(st.length)); }; // gốc + hậu tố (connect→connector, use→user); county/country không cùng họ
export const CONF = (() => { const by = new Map(); for (const { row } of ROWS) { const w = String(row[0] || '').toLowerCase(); if (w.length < 5 || /[^a-z]/.test(w)) continue; const k = row[2] + ':' + w.slice(0, 1); if (!by.has(k)) by.set(k, new Set()); by.get(k).add(w); }
  const o = new Set(); for (const S of by.values()) { const a = [...S]; for (let i = 0; i < a.length; i++) for (let j = i + 1; j < a.length; j++) if (lev(a[i], a[j]) <= 2 && lev(a[i], a[j]) < Math.min(a[i].length, a[j].length) / 3 && !sameFamily(a[i], a[j])) { o.add(a[i]); o.add(a[j]); } } return o; })();
const cnt = {}; for (const e of ROWS) cnt[e.set] = (cnt[e.set] || 0) + 1;
const sets = new Map(); for (const e of ROWS) { const id = cnt[e.set] < 10 ? 'bộ lẻ (< 10 từ)' : e.set; if (!sets.has(id)) sets.set(id, []); sets.get(id).push(e.row); } // bộ mở rộng 1–9 từ gộp 1 đơn vị (không làm méo danh sách yếu nhất)
for (const [id, R] of sets) {
  const lv = LV[Math.round(mean(R.map(r => rank(r[8]) || 3))) - 1] || 'B1';
  const ctxOk = R.map(r => { const w = String(r[0] || '').toLowerCase().split(/\s+/)[0].slice(0, 4), s = String(r[5] || ''); return words(s).length >= 5 && s.toLowerCase().includes(w) ? 1 : 0; });
  const iOne = R.map(r => (r[5] ? iPlus1([r[5]], r[8] || lv) : null));
  const crit = {
    a: null, b: null, c: null, d: mean(iOne), e: mean(R.map(r => (String(r[6] || '').trim() ? 0.5 : 0) + (String(r[7] || '').trim() ? 0.5 : 0))),
    f: mean(R.map(r => { const k = `${String(r[0]).toLowerCase()}#${r[2]}`; return (IMG[k] || IMG[String(r[0]).toLowerCase()] ? 0.4 : 0) + ((W3.get(String(r[0]).toLowerCase()) || [])[0] === 'ok' ? 0.3 : 0) + (r[5] && voiced('bf_emma', r[5]) ? 0.3 : 0); })),
    g: null, h: null, i: mean(ctxOk), j: null, k: mean(R.filter(r => CONF.has(String(r[0]).toLowerCase())).map(r => (GOLD.has(String(r[0]).toLowerCase()) ? 1 : 0))), l: null };
  add('vocab', id, id, lv, crit, [crit.i < 0.9 && `ngữ cảnh: ${R.length - ctxOk.reduce((a, b) => a + b, 0)}/${R.length} từ chưa có câu gốc ≥ 5 từ chứa từ`,
    crit.d != null && crit.d < 0.8 && 'i+1: câu ví dụ dùng từ khó hơn từ đang học > 1 bậc', crit.f < 0.7 && `mã hoá kép ${Math.round(crit.f * 100)}% (ảnh/audio từ/audio câu)`,
    crit.k != null && crit.k < 0.5 && `mẹo nhớ cho từ dễ nhầm (gold "why"): ${Math.round(crit.k * 100)}%`, crit.e < 0.7 && 'ví dụ: thiếu collocation/đồng nghĩa']);
}

// ================= 4. Kỹ năng (nghe, đọc, nói, viết) =================
for (const p of C.LISTENING || []) {
  const items = (p.groups || []).flatMap(gr => gr.items || []), v = KV.voices(p);
  const lines = (p.script || []).filter(l => (l.say || l.t) && l.pause == null);
  const crit = { a: clip(items.length / 10), b: null, c: clip(8 / Math.max(8, Math.max(...(p.groups || []).map(gr => (gr.items || []).length), 0))),
    d: iPlus1(lines.map(l => l.say || l.t), p.level), e: null, f: audioRate(lines.map(l => [l.say ? v._narrator : (v[l.s] || v._narrator), l.say || l.t])) ?? 0,
    g: mean(items.map(it => specific(it.explain, [...arr(it.a), it.cue]))) ?? 0, h: null, i: clip((p.vocab || []).length / 5), j: null, k: null, l: fit(lines.length * 0.12 + items.length * 0.5, 4, 15) };
  add('skills', 'listen:' + p.id, p.title, p.level, crit, [crit.g < 0.9 && 'phản hồi: câu thiếu giải thích cụ thể', crit.f < 1 && `audio ${Math.round(crit.f * 100)}%`, crit.i < 1 && 'ngữ cảnh: < 5 từ khoá kèm nghĩa']);
}
for (const r of C.READINGS || []) {
  const Q = r.questions || [], txt = plain(r.text), n = words(txt).length;
  const crit = { a: clip(Q.length / 8), b: null, c: null, d: iPlus1([txt], r.level), e: null, f: audioRate(KV.split(r.text).map(s => ['bf_emma', s])) ?? 0,
    g: mean(Q.map(q => specific(q.explain, [q.answer]))) ?? 0, h: null, i: clip((r.keywords || []).length / 5), j: r.summaryEn ? 0.5 : 0, k: null, l: fit(n / 150 + Q.length, 5, 20) };
  add('skills', 'read:' + r.id, r.title, r.level, crit, [crit.a < 1 && `truy hồi: ${Q.length} câu hỏi (cần ≥ 8)`, crit.g < 0.9 && 'phản hồi: giải thích chưa cụ thể', crit.f < 1 && `audio ${Math.round(crit.f * 100)}%`,
    crit.d != null && crit.d < 0.8 && `i+1: ${Math.round(overRate([txt], r.level) * 100)}% từ vượt cấp`, crit.j < 1 && 'đầu ra: chưa có nhiệm vụ tóm tắt/nói lại']);
}
const SS = C.SPEAK_SAMPLES || {};
for (const s of C.SPEAK_MORE || []) {
  const qs = [...(s.p1 || []), s.p2 && s.p2.q, ...(s.p3 || [])].filter(Boolean), smp = qs.filter(q => SS[q]);
  const crit = { a: 1, b: null, c: clip(12 / Math.max(12, qs.length)), d: null, e: clip(smp.length / Math.max(1, qs.length)), f: audioRate(smp.flatMap(q => KV.split(SS[q].a).map(x => ['bf_emma', x]))) ?? 0,
    g: null, h: null, i: null, j: 1, k: null, l: null };
  add('skills', 'speak:' + s.topic, s.title, null, crit, [crit.e < 1 && `ví dụ: ${smp.length}/${qs.length} câu hỏi có câu trả lời mẫu`, crit.f < 1 && `audio mẫu ${Math.round(crit.f * 100)}%`]);
}
for (const m of C.MODELS || []) {
  const ann = (String(m.text || '').match(/\[\[[^\]]*\|[^\]]*\]\]/g) || []).length, roles = (String(m.text || '').match(/<<[^>]*>>/g) || []).length;
  // bài mẫu viết: kênh chữ (app không đọc to bài mẫu ở #/write) → f không áp dụng; mã hoá kép ở đây = nhãn vai trò câu tô màu (g)
  const crit = { a: null, b: null, c: null, d: null, e: clip(ann / 6), f: null, g: clip(roles / 4), h: null, i: null, j: 1, k: null, l: null };
  add('skills', 'write:' + m.id, m.id, null, crit, [crit.e < 1 && `ví dụ: ${ann} cụm có chú nghĩa (cần ≥ 6)`, crit.g < 1 && `vai trò câu: ${roles} nhãn <<…>> (cần ≥ 4)`]);
}

// ---------- Tổng hợp ----------
export const AREAS = { grammar: 'Ngữ pháp', path: 'Bài lộ trình', vocab: 'Bộ từ', skills: 'Kỹ năng' };
const out = {};
for (const [k, name] of Object.entries(AREAS)) {
  const U = units.filter(u => u.area === k), byC = {};
  for (const c of Object.keys(CRIT)) { const v = U.map(u => u.crit[c]).filter(x => x != null); byC[c] = v.length ? Math.round(mean(v) * 1000) / 10 : null; }
  out[k] = { name, units: U.length, score: U.length ? Math.round(mean(U.map(u => u.score)) * 10) / 10 : 0, crit: byC };
}
const total = Math.round(mean(Object.values(out).map(a => a.score)) * 10) / 10;
const weakest = [...units].sort((a, b) => a.score - b.score).slice(0, 30);
const lowArea = Object.entries(out).sort((a, b) => a[1].score - b[1].score)[0][0];
fs.mkdirSync('reports', { recursive: true });
fs.writeFileSync('reports/learnability.json', JSON.stringify({ total, areas: out, units }, null, 1) + '\n');
const md = ['# Dễ học – dễ nhớ (tự sinh – `node scripts/content-qa/learnability.mjs`, đừng sửa tay)', '',
  'Tiêu chí & nguồn nghiên cứu: `docs/specs/learnability.md` · kế hoạch P0-H `docs/CONTENT-WORLD-PLAN.md` §5. Mỗi tiêu chí 0–100, "–" = không áp dụng cho loại bài.', '',
  `**Tổng: ${total} / 100**`, '', `| Mảng | Đơn vị | Điểm | ${Object.keys(CRIT).join(' | ')} |`, `|---|---|---|${Object.keys(CRIT).map(() => '---').join('|')}|`,
  ...Object.values(out).map(a => `| ${a.name} | ${a.units} | **${a.score}** | ${Object.keys(CRIT).map(c => a.crit[c] ?? '–').join(' | ')} |`), '',
  Object.entries(CRIT).map(([k, [n]]) => `${k} = ${n}`).join(' · '), '',
  '## 30 bài yếu nhất', '', '| # | Mảng | Bài | Cấp | Điểm | Cần sửa |', '|---|---|---|---|---|---|',
  ...weakest.map((u, i) => `| ${i + 1} | ${AREAS[u.area]} | ${u.id} | ${u.level || '–'} | ${u.score} | ${u.fix.slice(0, 3).join(' · ') || '–'} |`), '',
  '## Lỗi theo tiêu chí (số đơn vị < 60 điểm ở tiêu chí đó)', '', '| Tiêu chí | ' + Object.values(AREAS).join(' | ') + ' |', '|---|' + Object.keys(AREAS).map(() => '---').join('|') + '|',
  ...Object.entries(CRIT).map(([c, [n]]) => `| ${c} ${n} | ${Object.keys(AREAS).map(k => { const U = units.filter(u => u.area === k && u.crit[c] != null); return U.length ? `${U.filter(u => u.crit[c] < 0.6).length}/${U.length}` : '–'; }).join(' | ')} |`), ''].join('\n');
fs.writeFileSync('content/pipeline/LEARN.md', md);
if (ARG.includes('--queue')) {
  const T = JSON.parse(rd('content/pipeline/targets.json'));
  const lot = units.filter(u => u.area === lowArea).sort((a, b) => a.score - b.score).slice(0, 25).map(u => ({ id: u.id, score: u.score, fix: u.fix }));
  T['Dễ học – lô'] = { _note: 'Hàng sửa P0-H (docs/specs/learnability.md): 25 bài yếu nhất của mảng điểm thấp nhất; sửa theo thang tầng 0 → 1 → 2, qua cổng QA, rồi chạy lại learnability.', area: lowArea, items: lot };
  fs.writeFileSync('content/pipeline/targets.json', JSON.stringify(T, null, 1) + '\n');
}
console.log(Object.values(out).map(a => `${a.name} ${a.score}`).join(' · ') + ` · Tổng ${total} (thấp nhất: ${AREAS[lowArea]})`);
