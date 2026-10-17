// Test quy tắc giữ nguyên văn nội dung học tiếng Anh trong bản dịch giao diện (scripts/i18n-english.mjs – dùng chung cho gen-i18n.mjs & i18n-qa.mjs):
// trích đoạn (ngoặc kép, <i>/<b>, công thức +/…, câu ví dụ, chữ IN HOA, khóa toàn tiếng Anh), không bắt nhầm (thuộc tính HTML, chữ Việt không dấu,
// tên sản phẩm/nút, thuật ngữ thi), che → khôi phục nguyên văn, kiểm bản dịch chấp nhận mọi kiểu ngoặc, và toàn bộ kho bản dịch hiện tại phải đạt.
// Chạy: node scripts/test/i18n-english.mjs (không mạng)
import fs from 'node:fs';
import { englishSegments, isEnglishKey, missingSegments, protectEnglish } from '../i18n-english.mjs';
let fails = 0, n = 0; const ok = (c, m) => { n++; if (!c) { fails++; console.log('✗', m); } };
const segs = (k, en) => englishSegments(k, en);
const same = (a, b) => JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());

// 1. Trong ngoặc kép (chỉ phần có trong bản tiếng Anh)
ok(same(segs('“could of” → “could have”', '“could of” → “could have”'), ['could of', 'could have']), 'ngoặc kép: “could of” → “could have”');
ok(segs('Thêm câu tổng quan bắt đầu bằng “Overall, …” nêu 2 xu hướng.', 'Add an overview starting with “Overall, …” stating 2 trends.').includes('Overall, …'), 'ngoặc kép: “Overall, …”');
ok(!segs('“chiếm (tỉ lệ)” trong Task 1: “Gas accounted for 62% of…”.', '“make up (a share)” in Task 1: “Gas accounted for 62% of…”.').includes('make up (a share)'), 'trích dẫn tiếng Việt → phần tiếng Anh tương ứng được dịch tự do');
// 2. <i>/<b> chứa danh sách/câu mẫu, nhưng không bắt tên nút/sản phẩm
ok(segs('Dùng thêm collocation tự nhiên: <i>pose a threat, play a pivotal role…</i>', 'Use natural collocations: <i>pose a threat, play a pivotal role…</i>').includes('pose a threat, play a pivotal role…'), '<i> danh sách collocation');
ok(!segs('Bật <i>Developer mode</i> rồi bấm <i>Load unpacked</i>', 'Turn on <i>Developer mode</i>, then click <i>Load unpacked</i>').length, '<i> tên nút Chrome không bắt');
// 3. Công thức + neo
ok(segs('so + adj/adv + that; such (a/an) + adj + N + that.', 'x').length === 1 && isEnglishKey('so + adj/adv + that; such (a/an) + adj + N + that.'), 'khóa toàn công thức → giữ cả câu tiếng Anh');
ok(same(segs('the amount of + N không đếm được', 'the amount of + uncountable noun'), ['the amount of']), 'neo công thức: the amount of (N → noun vẫn được dịch)');
ok(!segs('the + adj-est / the most + adj; thường kèm “of/in” + nhóm so sánh.', 'the + adj-est / the most + adj; often followed by “of/in” + the group being compared.').includes('the'), 'neo "the" đã nằm trong công thức trọn vẹn → không che "+ the group"');
// 4. Câu ví dụ không ngoặc, nhóm a/b, chữ IN HOA
ok(segs('Một số động từ luôn đi với V-ING: enjoy, avoid… → I enjoy reading.', 'Some verbs take -ING: enjoy, avoid… → I enjoy reading.').includes('I enjoy reading'), 'câu ví dụ không ngoặc');
ok(segs('Sau want/need/would like, động từ tiếp theo cần “to”.', 'After want/need/would like, the next verb needs “to”.').includes('want/need/would like'), 'bỏ chữ Việt không dấu đứng đầu ("Sau …")');
ok(same(segs('YOUR = của bạn (your book); YOU’RE = you are.', 'YOUR shows possession (your book); YOU’RE = you are.'), ['your book', 'you are', 'YOUR', 'YOU’RE']), 'chữ IN HOA có dạng thường trong ví dụ / có dấu nháy');
ok(segs('FALSE = bài nói NGƯỢC lại; NOT GIVEN = bài KHÔNG nhắc tới.', 'FALSE = the passage says the OPPOSITE; NOT GIVEN = it is NOT mentioned.').includes('FALSE'), 'chữ IN HOA dạng định nghĩa "FALSE ="');
ok(!segs('Từ vựng học thuật (AWL + NAWL)', 'Academic vocabulary (AWL + NAWL)').length, 'từ viết tắt AWL/NAWL không bắt');
// 5. Không bắt nhầm
ok(!segs('Câu sai đã được ghi vào <a href="#/mistakes">Sổ lỗi sai</a>.', 'Wrong answers were added to your <a href="#/mistakes">Mistake log</a>.').length, 'thuộc tính href="…" không phải trích dẫn');
for (const [k, en] of [['Nghe ngay', 'Play now'], ['Trong IELTS:', 'In IELTS:'], ['Blog', 'Blog'], ['Collocation band 7+', 'Band 7+ collocations'], ['Add-on Chrome', 'Chrome add-on'],
  ['Mở web app để đăng nhập & đồng bộ', 'Open the web app to sign in & sync'], ['Thi thử Listening + Reading', 'Listening + Reading mock test'], ['60 phút · Task 1 + Task 2', '60 min · Task 1 + Task 2'],
  ['Máy này có dữ liệu.\n\nOK = gộp\nHủy = bỏ', 'This device has data.\n\nOK = merge\nCancel = skip'], ['Tra từ “%s” với Lexkite', 'Look up “%s” with Lexkite'], ['Dùng trên Chrome/Edge', 'Use on Chrome/Edge']])
  ok(!segs(k, en).length && !isEnglishKey(k), `không bắt nhầm: ${JSON.stringify(k)}`);
// 6. Che → khôi phục nguyên văn; kiểm bản dịch chấp nhận 「」 « » „“
{
  const k = '“could’ve / should’ve” nghe giống “of” nhưng phải viết là HAVE: could have + V3 (could have done).';
  const en = '“could’ve / should’ve” sounds like “of”, but it is written HAVE: could have + past participle (could have done).';
  const keep = []; const t = protectEnglish(k, en, keep);
  ok(!/could|should’ve|“of”/.test(t) && /\[\[\d+\]\]/.test(t), 'đoạn tiếng Anh được che bằng [[n]]');
  ok(t.replace(/\[\[(\d+)\]\]/g, (m, i) => keep[+i]) === en, 'khôi phục đúng nguyên văn');
  const k2 = 'Cụm này lặp ý (return đã có nghĩa “back”).', keep2 = [];
  ok(/“\[\[0\]\]”/.test(protectEnglish(k2, 'This repeats an idea (return already means “go back”).', keep2)) && keep2[0] === 'go back', 'trích dẫn rộng hơn (“go back”) được che cả cụm');
}
ok(!missingSegments('“could of” → “could have”', '“could of” → “could have”', '「could of」→「could have」').length, 'ngoặc 「」 hợp lệ');
ok(!missingSegments('Tránh chỉ “Yes/No”.', 'Avoid answering with just “Yes/No”.', 'Évitez de répondre seulement « Yes/No ».').length, 'ngoặc « » hợp lệ');
ok(!missingSegments('Tránh chỉ “Yes/No”.', 'Avoid answering with just “Yes/No”.', 'Antworten Sie nicht nur mit „Yes/No“.').length, 'ngoặc „“ hợp lệ');
ok(missingSegments('“could of” → “could have”', '“could of” → “could have”', '「できるかもしれない」→「できるかもしれない」').length === 2, 'phát hiện bản dịch mất tiếng Anh mẫu');
ok(missingSegments('It is clear/evident that …', 'It is clear/evident that …', 'それは明らか/明白です…').length === 1, 'khóa toàn tiếng Anh bị dịch → lỗi');

// 7. Kho hiện tại: mọi bản dịch giữ đủ tiếng Anh mẫu (giống i18n-qa.mjs nhưng chạy riêng được)
{
  const load = f => { const g = {}; new Function('self', fs.readFileSync(new URL(f, import.meta.url), 'utf8'))(g); return g.I18N_DICT; };
  const EN = load('../../web/js/i18n/en.js').en;
  const langs = fs.readFileSync(new URL('../i18n-langs.txt', import.meta.url), 'utf8').split('\n').map(s => s.trim()).filter(s => s && !s.startsWith('#'));
  let bad = 0, keys = 0;
  for (const k of Object.keys(EN)) if (englishSegments(k, EN[k]).length) keys++;
  for (const l of langs) { const D = load(`../../web/js/i18n/${l}.js`)[l]; for (const k of Object.keys(EN)) if (missingSegments(k, EN[k], D[k]).length) bad++; }
  ok(keys > 100, `kho có > 100 khóa chứa tiếng Anh mẫu (hiện ${keys})`);
  ok(bad === 0, `mọi bản dịch giữ nguyên tiếng Anh mẫu (đang lỗi ${bad})`);
}

if (fails) { console.log(`✗ i18n-english: ${fails}/${n} kiểm tra lỗi`); process.exit(1); }
console.log(`✓ i18n-english: ${n} kiểm tra – trích đoạn tiếng Anh mẫu, không bắt nhầm, che/khôi phục nguyên văn, ngoặc bản địa, kho bản dịch đạt`);
