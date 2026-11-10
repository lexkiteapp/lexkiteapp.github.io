// O5 native-score: lõi chấm (giả lập ai-pool, không mạng) + chất lượng nguồn en gốc content/i18n/en-src/*.json.
// Chạy: node scripts/test/i18n-native-score.mjs
import fs from 'fs';
import { LANGS, GATE, FIX_MIN, loadEnSrc, buildItems, shardOf, scoreBatch, fixBatch, summarize, gate, sameMarks, packs, hash, SYS, lessonKeys, grammarFiles } from '../i18n-native-score.mjs';

let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('✗', m); } else console.log('✓', m); };
const VI = /[ăâđêôơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]/i;
// khóa tiếng Việt có thể chỉ mang dấu chung với tiếng Pháp/TBN (‘Xin phép’, ‘Phàn nàn’) – nhận đủ bộ dấu tiếng Việt cho khóa
const VI_KEY = /[ăâđêôơưàáạảãèéẹẻẽìíịỉĩòóọỏõùúụủũỳýỵỷỹấầẩẫậắằẳẵặếềểễệốồổỗộớờởỡợứừửữự]/i;

// ---- 1. nguồn en gốc ----
const { m: EN, clash } = loadEnSrc();
const keys = Object.keys(EN);
ok(keys.length >= 200, `en-src có ≥ 200 khóa (3 bài gold: be-am-is-are, question-tags-short-answers, hedging) – có ${keys.length}`);
ok(!clash.length, 'không có khóa trùng khác nội dung giữa các file en-src');
ok(keys.every(k => VI_KEY.test(k)), 'mọi khóa là chuỗi tiếng Việt đang hiển thị');
const viLeft = keys.filter(k => VI.test(EN[k]));
ok(!viLeft.length, 'bản en không còn chữ tiếng Việt' + (viLeft.length ? ': ' + viLeft.slice(0, 3).join(' | ') : ''));
const markBad = keys.filter(k => !sameMarks(k, EN[k]));
ok(!markBad.length, 'en giữ đúng (A)–(D), {biến}, thẻ, mũi tên như bản đang hiển thị' + (markBad.length ? ': ' + markBad.slice(0, 3).join(' | ') : ''));
ok(keys.every(k => EN[k].length <= Math.max(60, k.length * 2.2)), 'en không phình quá 2,2× bản gốc (không thêm ý)');
// khóa phải là chuỗi có thật trong bài ngữ pháp (khóa lạ = không bao giờ hiện)
const gram = grammarFiles().map(f => fs.readFileSync(f, 'utf8')).join('\n').replace(/\\'/g, "'").replace(/\s+/g, ' ');
// sổ mẫu câu (#/phrases) cũng dùng en-src (functions.json) – chuỗi nằm ở gói lười web/cpack/framework
const fw = ['web/cpack/framework/functions.js'].filter(f => fs.existsSync(f)).map(f => fs.readFileSync(f, 'utf8')).join('\n').replace(/\\'/g, "'").replace(/\s+/g, ' ');
const ghost = keys.filter(k => !gram.includes(k) && !fw.includes(k));
ok(!ghost.length, 'mọi khóa en-src có trong bài ngữ pháp (web/js/grammar + web/cpack/grammar) hoặc web/cpack/framework/functions.js' + (ghost.length ? ': ' + ghost.slice(0, 3).join(' | ') : ''));

const gold = await lessonKeys(['be-am-is-are', 'question-tags-short-answers', 'hedging']);
const gap = Object.values(gold).flatMap(l => (l || ['(thiếu bài)']).filter(k => !EN[k]));
ok(Object.values(gold).every(l => l && l.length > 40) && !gap.length, '3 bài gold: mọi chuỗi đang hiển thị đều có en gốc' + (gap.length ? ` – thiếu ${gap.length}: ` + gap.slice(0, 2).join(' | ') : ''));

// ---- 2. lõi chấm với pool giả ----
ok(LANGS.length === 13 && !LANGS.includes('vi') && !LANGS.includes('en'), '13 L1 (không gồm vi, en)');
ok(GATE.avg === 4.3 && GATE.min === 3.5 && FIX_MIN === 4, 'ngưỡng cổng 4,3 / 3,5, sửa < 4 (không hạ)');
ok(['nsback', 'nsjudge', 'nsgen'].every(m => typeof SYS[m]('ja') === 'string' && SYS[m]('ja').includes('Japanese')), 'lời nhắn cục bộ cho 3 vai, đúng tên ngôn ngữ');
const en = { 'Câu một.': 'Sentence one (A).', 'Câu hai.': 'Sentence two.', 'Câu ba.': 'Sentence three.' };
const pk = Object.fromEntries(LANGS.map(l => [l, { 'Câu một.': l + ' một (A)', 'Câu hai.': l + ' hai' }]));
const { items, missing } = buildItems(en, pk);
ok(items.length === 26 && missing.ja === 1, 'thiếu L1 → không chấm, đếm vào missing');
const sh = [1, 2, 3].map(i => shardOf(items, i, 3));
ok(sh.flat().length === items.length && new Set(sh.flat().map(x => x.h)).size === items.length, 'shard 3 phần phủ đủ, không trùng');
ok(hash('a', 'ja', 'b') !== hash('a', 'ja', 'c'), 'hash đổi khi L1 đổi → chấm lại');

const calls = [];
const fake = (score, famB = 'gem') => ({
  async judge(req, o = {}) {
    calls.push({ mode: req.mode, exclude: o.exclude || [], exM: o.excludeModels || [] });
    if (req.mode === 'nsback') return { out: Object.fromEntries(req.items.map(x => [x.k, { en: 'back ' + x.t }])), model: 'gpt-oss-120b', fam: 'gpt-oss' };
    if ((o.exclude || []).includes(famB)) return null;
    return { out: Object.fromEntries(req.items.map(x => [x.k, { s: score(x), why: 'ok' }])), model: 'gemini-2.5-flash', fam: famB };
  },
  async gen(req) { return { out: Object.fromEntries(req.items.map(x => [x.k, { t: 'native ' + x.src }])), model: 'gemini-2.5-flash', fam: 'gem' }; },
});
const ja = items.filter(x => x.lang === 'ja');
const r = await scoreBatch(fake(() => 5), 'ja', ja);
ok(Object.keys(r).length === ja.length && Object.values(r).every(x => x.s === 5 && x.back.startsWith('back ')), 'A dịch ngược, B chấm → mỗi mục có điểm + bản dịch ngược');
const jb = calls.find(c => c.mode === 'nsjudge');
ok(jb && jb.exclude.includes('gpt-oss') && jb.exM.includes('gpt-oss-120b'), 'B loại họ + mô hình của A');
const none = await scoreBatch(fake(() => 5, 'gpt-oss'), 'ja', ja);
ok(!Object.keys(none).length, 'không còn họ khác cho B → bỏ qua trung tính (không chấm bừa)');
const odd = await scoreBatch(fake(() => 9), 'ja', ja);
ok(!Object.keys(odd).length, 'điểm ngoài 1–5 bị bỏ');

// summarize + gate
const cache = {}; items.forEach((x, i) => { cache[x.h] = { s: i === 0 ? 3 : 5, back: 'b', why: 'w' }; });
const sum = summarize(items, cache, missing);
ok(sum.n === 26 && sum.min === 3 && sum.low.length === 1 && sum.byLang[items[0].lang].min === 3, 'gộp: n, min, byLang, low[] đúng');
ok(!gate(sum).ok && /< 3.5/.test(gate(sum).why), 'cổng chặn khi có mục < 3,5');
cache[items[0].h].s = 4;
ok(gate(summarize(items, cache)).ok, 'cổng qua khi avg ≥ 4,3 và mọi mục ≥ 3,5');
Object.values(cache).forEach(x => { x.s = 4; });
ok(!gate(summarize(items, cache)).ok, 'cổng chặn khi avg 4,0 < 4,3');
ok(gate(summarize(items, {})).ok && summarize(items, {}).n === 0, 'chưa chấm mục nào → bỏ qua trung tính');

// fix: soạn lại từ en, B khác họ người soạn
calls.length = 0;
const fx = await fixBatch(fake(x => (x.l1.startsWith('native') ? 5 : 2), 'groq'), 'ja', ja, Object.fromEntries(ja.map(x => [x.vi, 2])));
ok(Object.keys(fx).length === ja.length && Object.values(fx).every(v => v.l1.startsWith('native ') && v.s === 5), '--fix nhận bản viết lại ≥ 4 và hơn bản cũ');
ok(calls.filter(c => c.mode === 'nsjudge').every(c => c.exclude.includes('gem')), '--fix: giám khảo loại họ của mô hình soạn');
const fx2 = await fixBatch(fake(() => 3, 'groq'), 'ja', ja, {});
ok(!Object.keys(fx2).length, '--fix không nhận bản < 4');
ok(!sameMarks('Phần (A) sai', 'Part A is wrong') && sameMarks('(A) → is', '(A) → là'), 'giữ dấu (A)/→ khi viết lại');

// packs: bản đã sửa chỉ dùng khi en gốc chưa đổi
const read = (f, d) => (/native-fixed/.test(f) ? { ja: { 'Câu một.': { l1: 'FIX', en: hash(en['Câu một.']) }, 'Câu hai.': { l1: 'OLD', en: hash('khác') } } } : /\/ja\.json$/.test(f) ? { 'Câu một.': 'cdn1', 'Câu hai.': 'cdn2' } : d);
const P = packs(en, read);
ok(P.ja['Câu một.'] === 'FIX' && P.ja['Câu hai.'] === 'cdn2', 'native-fixed đè gói CDN chỉ khi hash en khớp');

// workflow + kết quả
const wf = fs.readFileSync('.github/workflows/i18n-native-score.yml', 'utf8');
ok(/workflow_dispatch/.test(wf) && /concurrency:/.test(wf) && /timeout-minutes:/.test(wf) && /--check/.test(wf), 'workflow: dispatch + concurrency + timeout + chạy cổng --check');
if (fs.existsSync('content/i18n-native-score.json')) { const s = JSON.parse(fs.readFileSync('content/i18n-native-score.json', 'utf8')); ok(typeof s.avg === 'number' && typeof s.n === 'number', 'content/i18n-native-score.json đúng khuôn (content-score đọc avg)'); }

console.log(fails ? `✗ i18n-native-score: ${fails} lỗi` : '✓ i18n-native-score: xanh');
process.exit(fails ? 1 : 0);
