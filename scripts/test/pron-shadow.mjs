// Phát âm – "Nói đuổi liên tục" (web/js/pron/shadow.js): đoạn 3 câu dựng từ PronCoach.SENTENCES, tô từ/âm (Speak.align + phones), điểm đoạn,
// và Speak.score chuyển audio/phones từ mô hình âm vị trên máy (Gop). Luồng UI chạy ở smoke/e2e (cần trình duyệt). Chạy: node scripts/test/pron-shadow.mjs
import fs from 'node:fs'; import vm from 'node:vm'; import assert from 'node:assert/strict';
const c = { localStorage: null }; vm.createContext(c); c.self = c;
for (const f of ['pron/pairs', 'pron/coach', 'speak/score', 'pron/shadow']) vm.runInContext(fs.readFileSync(`web/js/${f}.js`, 'utf8'), c);
const S = c.PronShadow, C = c.PronCoach, Sp = c.Speak; let n = 0;
const ok = (v, m) => { assert.ok(v, m || 'lỗi'); n++; }, eq = (a, b, m) => { assert.deepEqual(JSON.parse(JSON.stringify(a)), JSON.parse(JSON.stringify(b)), m); n++; };

// 1. Đoạn: phủ đúng toàn bộ câu của bài nhịp câu (không biên soạn trùng), mỗi đoạn ≤ 3 câu
const P = S.passages(C.SENTENCES);
eq(P.flatMap(p => p.sents), C.SENTENCES.map(x => x.s), 'đủ và đúng thứ tự');
ok(P.every(p => p.sents.length >= 1 && p.sents.length <= 3) && P.length === Math.ceil(C.SENTENCES.length / 3));

// 2. Tô từ mức từ (không có mô hình âm vị): từ máy không nghe theo thứ tự là miss
const w = Sp.align('I want to go home.', 'I want go home');
eq(S.mark(w).map(x => x.st), ['ok', 'ok', 'miss', 'ok', 'ok']);
ok(S.mark(w).every(x => x.ph.length === 0), 'không phones → không có âm');

// 3. Tô âm: từ nghe được nhưng có âm < ngưỡng → weak; từ miss vẫn nêu âm; chỉ số sai / điểm null / phần tử null bị bỏ qua
const m = S.mark(w, [{ w: 0, p: 'AY', score: 90 }, { w: 3, p: 'HH', score: 30 }, { w: 3, p: 'OW', score: 49 }, { w: 2, p: 'T', score: 10 }, { w: 99, p: 'X', score: 1 }, null, { w: 1, p: 'W', score: null }, { w: 4, p: 'M', score: 50 }]);
eq(m.map(x => x.st), ['ok', 'ok', 'miss', 'weak', 'ok']);
eq([m[3].ph, m[2].ph], [['HH', 'OW'], ['T']]);
eq(S.mark(w, 'không phải mảng').map(x => x.st), ['ok', 'ok', 'miss', 'ok', 'ok'], 'phones sai kiểu → bỏ qua');
eq(S.mark(null), []);

// 4. Điểm đoạn: ok = 1, weak = 0,5, miss = 0; câu không nghe được (null) bỏ khỏi điểm; worst không trùng, không dấu câu
const s1 = S.summary([S.mark(Sp.align('a b c d', 'a b c d')), S.mark(Sp.align('Go home.', 'go'))]);
eq([s1.total, s1.ok, s1.miss, s1.weak, s1.score, s1.heardN, s1.worst, s1.band], [6, 5, 1, 0, 83, 2, ['home'], 'close']);
eq(S.summary([null, null]).heardN, 0); eq(S.summary([null]).score, 0);
const s2 = S.summary([m]);
eq([s2.score, s2.weak, s2.miss, s2.worst, s2.band], [70, 1, 1, ['to', 'go'], 'close']);
eq(S.summary([S.mark(Sp.align('Go home.', 'go home'))]).band, 'great');
eq(S.summary([S.mark(Sp.align('Go home. Go home.', ''))]).band, 'again');

// 5. Speak.score chuyển audio + phones từ Gop (mô hình trên máy); không có Gop thì không có phones (mức từ)
const run = withGop => new Promise(res => {
  c.UI = { recognize: (t, a, cb) => { setTimeout(() => { cb.start(); cb.result({ heard: 'go home', score: 90, audio: 'BLOB' }); cb.end(); }, 0); return { stop() {} }; } };
  c.Gop = withGop ? { score: () => ({ gop: 0.8, phones: [{ w: 1, p: 'HH', score: 20 }] }) } : undefined;
  Sp.score({ target: 'Go home.', mode: 'drill' }).then(res);
});
const a = await run(true), b = await run(false);
eq([a.engine, a.audio, a.phones], ['gop', 'BLOB', [{ w: 1, p: 'HH', score: 20 }]]);
eq([b.engine, b.phones === undefined, b.audio], ['webspeech', true, 'BLOB']);
eq(S.mark(a.words, a.phones).map(x => x.st), ['ok', 'weak']);
ok(typeof S.mount === 'function' && S.THR === 50 && S.KEY === 'vb.pron.shadow');
console.log(`pron-shadow: ${n} kiểm tra OK`);
