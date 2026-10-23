// Test [P2-1.2] ôn tập đa chế độ: quy đổi kết quả Gõ phản xạ / Nghe chọn nghĩa → mức Again/Hard/Good/Easy (0–3),
// tự chọn chế độ theo độ khó thẻ, cắt mềm câu ngữ cảnh, thẻ "Câu của bạn" luôn esc HTML. Chạy: node scripts/test/review-modes.mjs
import fs from 'node:fs'; import vm from 'node:vm';
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('✗', m); } };
const ctx = { console, Math, JSON, Date, t: (s, o) => s.replace(/\{(\w+)\}/g, (_, k) => (o || {})[k]), localStorage: { getItem: () => null, setItem() {} }, navigator: {}, document: { addEventListener() {}, getElementById: () => null, querySelector: () => null, querySelectorAll: () => [], createElement: () => ({ style: {} }), head: { appendChild() {} }, documentElement: { style: {} } }, addEventListener() {}, matchMedia: () => ({ matches: false, addEventListener() {} }) };
ctx.self = ctx; ctx.window = ctx; vm.createContext(ctx);
for (const f of ['data.js', 'core.js', 'ui.js', 'study-modes.js']) { vm.runInContext(fs.readFileSync(new URL('../../web/js/' + f, import.meta.url), 'utf8'), ctx); }
const M = ctx.StudyModes; ok(M, 'StudyModes nạp được');
const cards = {}; const mk = (word, vi, srs, x = {}) => (cards[word] = { word, vi, pos: 'n', srs: { reps: 3, lapses: 0, D: 3, S: 10, last: 1, ...srs }, contexts: [], ...x });
ctx.App = { state: { cards, settings: {} }, meanOf: w => w.vi };
// --- Gõ phản xạ → mức chấm ---
const T = r => M.gradeType({ dist: 0, len: 8, hints: 0, ms: 2000, gaveUp: false, ...r });
ok(T({}) === 3, 'gõ đúng, nhanh, không gợi ý → Easy');
ok(T({ ms: 60000 }) === 2, 'gõ đúng nhưng chậm → Good');
ok(T({ hints: 1 }) === 2, 'đúng với 1 gợi ý → Good');
ok(T({ hints: 2 }) === 1, 'đúng với ≥2 gợi ý → Hard');
ok(T({ dist: 1 }) === 1, 'sai 1 chữ (từ dài) → Hard (chấp nhận lỗi gõ nhỏ)');
ok(T({ dist: 2, len: 9 }) === 1, 'từ ≥8 chữ: sai 2 chữ vẫn là Hard');
ok(T({ dist: 3, len: 9 }) === 0, 'sai 3 chữ → Again');
ok(T({ dist: 1, len: 3 }) === 0, 'từ ngắn (<4) sai 1 chữ → Again');
ok(T({ gaveUp: true }) === 0, 'bấm "Không nhớ" → Again');
ok(M.dist('recieve', 'receive') === 2 && M.dist('cat', 'cat') === 0, 'khoảng cách Levenshtein');
// --- Nghe chọn nghĩa → mức chấm ---
const A = r => M.gradeAudio({ ok: true, replays: 0, ms: 2000, ...r });
ok(A({}) === 3, 'chọn đúng ngay, không nghe lại → Easy');
ok(A({ ms: 9000 }) === 2 && A({ replays: 1 }) === 2, 'đúng nhưng chậm / nghe lại 1 lần → Good');
ok(A({ replays: 2 }) === 1, 'nghe lại ≥2 lần → Hard');
ok(A({ ok: false }) === 0, 'chọn sai → Again');
for (const r of [{}, { ok: false }, { replays: 5 }]) ok([0, 1, 2, 3].includes(A(r)), 'mức chấm luôn trong 0–3');
// --- Tự chọn chế độ ---
const easy = mk('accomplish', 'hoàn thành', { reps: 4, D: 3 }), mid = mk('borrow', 'mượn', { reps: 1, D: 6 }), hard = mk('ubiquitous', 'phổ biến', { reps: 2, D: 8.5 }), leech = mk('vague', 'mơ hồ', { lapses: 4, D: 4 });
mk('table', 'cái bàn'); mk('river', 'dòng sông'); mk('window', 'cửa sổ');
ok(M.auto(hard) === 'flip' && M.auto(leech) === 'flip', 'thẻ khó / hay quên → lật (kèm câu ngữ cảnh)');
ok(M.auto(mid) === 'audio', 'thẻ vừa → nghe chọn nghĩa');
ok(['type', 'audio'].includes(M.auto(easy)), 'thẻ dễ → gõ phản xạ hoặc nghe');
ok(M.pick({ ...easy, srs: { reps: 0, last: null } }, 'type') === 'flip', 'thẻ mới luôn lật');
ok(M.pick(easy, 'type', true) === 'flip', 'chiều ngược luôn lật');
ok(M.pick(mid, 'type') === 'type', 'người học đổi tay → theo lựa chọn');
const a = M.pick(mid, 'audio'); ok(a === 'audio' && mid._opt.all.length === 4 && mid._opt.all[mid._opt.right] === 'mượn' && new Set(mid._opt.all).size === 4, 'nghe chọn nghĩa: 4 phương án khác nhau, có đáp án đúng');
ctx.App.state.cards = { borrow: mid }; ok(M.pick(mid, 'audio') === 'flip' || (ctx.IELTS_DATA && mid._opt), 'thiếu phương án nhiễu → không kẹt (lật hoặc lấy từ thư viện)');
ctx.App.state.cards = cards; ctx.App.state.settings.typeReview = false; ok(M.pick(easy, 'type') !== 'type', 'tắt Gõ trong Cài đặt → không gõ'); ctx.App.state.settings.typeReview = true;
// --- Thẻ "Câu của bạn" ---
const long = 'Lorem ipsum dolor sit amet '.repeat(10) + 'they accomplished the task ' + 'consectetur adipiscing elit '.repeat(10);
const tr = M.trim(long, 'accomplish'); ok(tr.length <= 202 && /accomplished/.test(tr) && tr.startsWith('…') && tr.endsWith('…'), 'câu dài: cắt mềm quanh từ, ≤200 ký tự');
ok(M.host('https://www.bbc.co.uk/news/x?y=1') === 'bbc.co.uk' && M.host('nytimes.com') === 'nytimes.com', 'chip nguồn chỉ hiện tên miền');
const own = M.ctx({ word: 'accomplish', ctx: 'We <b>accomplished</b> it <img src=x onerror=alert(1)>', src: 'example.com', contexts: [] });
ok(!/<img|<b>/.test(own) && /&lt;img/.test(own) && /<mark>accomplished<\/mark>/.test(own), 'câu HTML không an toàn luôn được esc, từ được tô sáng (cả biến thể)');
ok(/Câu của bạn/.test(own) && /rctx-src/.test(own) && /data-saysent=/.test(own) && /aria-label="Nghe cả câu"/.test(own), 'câu của bạn: nhãn + chip nguồn + nút nghe cả câu có aria-label');
const ex = M.ctx({ word: 'river', ex: 'The river is wide.', contexts: [] }); ok(/Ví dụ/.test(ex) && !/rctx-src/.test(ex), 'không có câu riêng → ví dụ thư viện, không chip nguồn');
ok(M.ctx({ word: 'x', contexts: [] }) === '', 'không có câu nào → không vẽ');
if (fails) { console.log(`✗ review-modes: ${fails} lỗi`); process.exit(1); }
console.log('✓ review-modes: quy đổi Gõ/Nghe → Again/Hard/Good/Easy, tự chọn chế độ, thẻ "Câu của bạn" an toàn');
