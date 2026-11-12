// Luyện NÓI cặp từ (web/js/pron/pairs.js): chấm đúng/sai/không rõ, chuẩn hoá, chọn lượt thích ứng, lưu tiến bộ, dữ liệu cặp & IPA (đối chiếu CMUdict).
import fs from 'node:fs'; import vm from 'node:vm'; import assert from 'node:assert/strict';
const c = { localStorage: null }; vm.createContext(c); c.self = c;
vm.runInContext(fs.readFileSync('web/js/pron/pairs.js', 'utf8'), c);
vm.runInContext(fs.readFileSync('web/js/pron/skills.js', 'utf8') + fs.readFileSync('web/js/pron/sounds.js', 'utf8'), c);
const P = c.PronPairs; let n = 0; const ok = (v, m) => { assert.ok(v, m || "lỗi"); n++; }; const eq = (a, b, m) => { assert.equal(JSON.stringify(a), JSON.stringify(b), m || JSON.stringify(a)); n++; };
// 1. Chấm
eq(P.decide(['think'], 'think', 'sink').res, 'target');
eq(P.decide(['Sink.'], 'think', 'sink').res, 'other', 'viết hoa + dấu chấm');
eq(P.decide(['  SINK!! '], 'think', 'sink').res, 'other');
eq(P.decide(['pink', 'ink'], 'think', 'sink').res, 'neither');
eq(P.decide([], 'think', 'sink').res, 'neither', 'không có phương án');
eq(P.decide(['sink', 'think'], 'think', 'sink').res, 'other', 'phương án đầu quyết định');
eq(P.decide(['think sink', 'I think'], 'think', 'sink').res, 'target', 'phương án chứa cả 2 từ → xét phương án sau');
eq(P.decide(['cats'], 'cat', 'cats').res, 'other', 'không coi cats là cat');
eq(P.decide(['cat'], 'cats', 'cat').res, 'other');
eq(P.decide(['played'], 'play', 'played').res, 'other');
eq(P.decide(['3'], 'three', 'tree').res, 'target', 'số → chữ');
eq(P.decide(['some'], 'sum', 'thumb').res, 'target', 'đồng âm');
eq(P.decide(['Jell-O'], 'jello', 'yellow').res, 'target', 'gạch nối');
eq(P.decide(['they’re'], 'there', 'dare').res, 'target', 'nháy cong');
eq(P.decide('rise', 'rice', 'rise').res, 'other', 'chuỗi đơn');
eq(P.norm('Sink. Café'), ['sink', 'cafe']);
// 2. Dữ liệu
const MIN = { 'th-sounds': 8, 'final-consonants': 8, 'ed-endings': 8, 's-endings': 8, 'sh-ch-zh': 8, 'l-n-clusters': 8, 'iː': 8, 'ɪ': 8, 'æ': 8, 'e': 8, 'ʌ': 8, 'ɑː': 8, 'v': 8, 'b': 8, 'w': 8 };
for (const [id, m] of Object.entries(MIN)) { const k = P.forSkill(id).reduce((s, x) => s + P.pairsOf(x).length, 0); ok(k >= m, `${id}: ${k} cặp < ${m}`); ok(c.PRON.some(x => x.id === id), `không có bài ${id}`); }
const cmu = {}; for (const l of fs.readFileSync('content/lexicon/cmudict-subset.txt', 'utf8').split('\n')) { const m = l.match(/^([a-z'.-]+)(?:\(\d\))? (.+)$/); if (m) (cmu[m[1]] = cmu[m[1]] || []).push(m[2]); }
const V = { AA: 'ɑː', AE: 'æ', AO: 'ɔː', AW: 'aʊ', AY: 'aɪ', EH: 'e', EY: 'eɪ', IH: 'ɪ', IY: 'iː', OW: 'oʊ', OY: 'ɔɪ', UH: 'ʊ', UW: 'uː', B: 'b', CH: 'tʃ', D: 'd', DH: 'ð', F: 'f', G: 'ɡ', HH: 'h', JH: 'dʒ', K: 'k', L: 'l', M: 'm', N: 'n', NG: 'ŋ', P: 'p', R: 'r', S: 's', SH: 'ʃ', T: 't', TH: 'θ', V: 'v', W: 'w', Y: 'j', Z: 'z', ZH: 'ʒ' };
const flat = a => a.split(' ').map(p => { const m = p.match(/^([A-Z]+)(\d)?$/); return m[1] === 'AH' ? 'ə' : m[1] === 'ER' ? 'ɝ' : m[1] === 'IY' && m[2] === '0' ? 'i' : V[m[1]]; }).join('');
const skel = s => s.replace(/[\/ˈˌ]/g, '').replace(/ʌ|ə/g, 'ə').replace(/ɝː|ɚ/g, 'ɝ');
const CMU_SKIP = { parade: 'CMU ghi P ER0 EY1 D (ɚ + eɪ) = cùng chuỗi âm /pəˈreɪd/' };
const seen = new Set(); let cmuChecked = 0;
for (const x of P.CONTRASTS) {
  ok(P.TIPS[x.id] && P.label(x), `${x.id}: thiếu mẹo/nhãn`);
  for (const p of P.pairsOf(x)) {
    ok(p.words.length === 2 && p.words[0] !== p.words[1], `${x.id}: cặp lỗi ${p.words}`);
    const key = p.words.join('/'); ok(!seen.has(x.id + key), `${x.id}: trùng ${key}`); seen.add(x.id + key);
    p.words.forEach((w, i) => { ok(/^[a-z]+$/.test(w), `từ lạ ${w}`); ok(/^\/[^/ ]+\/$/.test(p.ipa[i]) && p.ipa[i].length > 2, `${w}: thiếu IPA`); ok(!/[ɒəʊ]ʊ|ɒ/.test(p.ipa[i]), `${w}: IPA kiểu Anh ${p.ipa[i]}`);
      if (cmu[w] && !CMU_SKIP[w]) { cmuChecked++; ok(cmu[w].some(a => skel(flat(a)) === skel(p.ipa[i])), `${w}: IPA ${p.ipa[i]} lệch CMU ${cmu[w].join(' | ')}`); } });
    for (const w of p.words) ok(P.decide([w], w, p.words.find(o => o !== w)).res === 'target', `đọc đúng ${w} phải đúng`);
  }
}
ok(cmuChecked > 200, `ít từ đối chiếu CMU: ${cmuChecked}`);
const BAD = /^(sex|kill|die|drug|gun|hell|damn|shit|fuck|ass|bitch|nigger|fag|gay|jew)$/;
for (const w of Object.keys(P.IPA)) ok(!BAD.test(w), `từ không phù hợp ${w}`);
// 3. Lượt thích ứng
let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const cs = P.forSkill('th-sounds'), s1 = P.buildSession(cs, {}, 10, rnd);
eq(s1.length, 10); ok(s1.every(i => i.words.includes(i.target) && i.words.includes(i.other) && i.target !== i.other));
ok(new Set(s1.map(i => i.side)).size === 2, 'trộn cả 2 từ của cặp');
for (let k = 1; k < s1.length; k++) ok(s1[k].words.join() !== s1[k - 1].words.join(), 'không lặp cặp liền nhau');
const weakStats = { 'th-s': { ok: 1, n: 10 }, 'th-t': { ok: 10, n: 10 }, 'dh-d': { ok: 10, n: 10 }, 'dh-z': { ok: 10, n: 10 } };
let cnt = 0; for (let r = 0; r < 30; r++) cnt += P.buildSession(cs, weakStats, 10, rnd).filter(i => i.c === 'th-s').length;
ok(cnt / 300 > 0.35, `đối lập yếu phải xuất hiện nhiều hơn (${(cnt / 300).toFixed(2)})`);
const q = P.buildSession(cs, {}, 10, rnd), miss = q[2]; P.adapt(q, 2, miss);
eq(q[5].c, miss.c, 'nói sai → 3 lượt sau gặp lại đối lập'); eq(q[5].side, miss.side, "cùng âm đích"); ok(q[5].words.join() !== miss.words.join(), "cặp khác"); ok(q[5].retry); eq(q.length, 10);
const q2 = P.buildSession(cs, {}, 10, rnd); P.adapt(q2, 9, q2[9]); eq(q2.length, 10, 'lượt cuối không thêm');
// 4. Lưu
const mem = { d: {}, getItem(k) { return this.d[k] || null; }, setItem(k, v) { this.d[k] = v; } };
const st = {}; P.record(st, 'th-s', true); P.record(st, 'th-s', false); P.record(st, 'r-l', false); P.record(st, 'r-l', false); P.record(st, 'ed', true); P.record(st, 'ed', true);
P.endSession(st, { 'th-s': { ok: 1, n: 2 } }, '2026-10-26');
ok(P.save(st, mem)); const back = P.load(mem);
eq(back['th-s'].n, 2); eq(back['th-s'].hist, [{ d: '2026-10-26', ok: 1, n: 2 }]);
eq(P.weak(back), ['r-l', 'th-s'], 'âm yếu: thấp nhất trước, bỏ âm ≥ 80 %');
for (let k = 0; k < 15; k++) P.endSession(back, { ed: { ok: 1, n: 1 } }, 'd' + k); eq(back.ed.hist.length, 12, 'giữ 12 phiên');
eq(P.load({ getItem() { return '{bad'; } }), {}, 'dữ liệu hỏng → rỗng');
eq(P.load({ getItem() { throw new Error('x'); } }), {}, 'localStorage chặn → rỗng');
ok(!P.save({}, { setItem() { throw new Error('quota'); } }));
console.log(`✓ pron-pairs: ${n} kiểm tra · ${P.CONTRASTS.length} đối lập · ${P.CONTRASTS.reduce((s, x) => s + P.pairsOf(x).length, 0)} cặp · ${cmuChecked} từ khớp CMU`);
