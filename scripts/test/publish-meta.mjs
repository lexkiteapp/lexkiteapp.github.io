// Cổng metadata lúc sản xuất (scripts/cine/publish_meta.py + qc_gate.py + bank2news.py): khối publish hợp lệ, chặn tiêu đề cụt/mẫu/id; mọi khối trong repo đạt.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
const py = `
import json, sys
sys.path.insert(0, 'scripts/cine')
import publish_meta as P
good = dict(title='Stop saying "discuss about"', keyword='discuss', value='Discuss takes a direct object.', hashtags=['#learnenglish', '#englishtips', '#a2english'], first_comment='You discuss something, but you talk about something. Try a quick quiz: {link}')
fcv = lambda fc, lang='en': P.validate({**good, 'first_comment': fc, 'lang': lang})
print(json.dumps(dict(
  good=P.validate(good), missing=P.validate(None),
  cut=P.validate({**good, 'title': 'Book a doctor: polite to'}),
  tpl=P.validate({**good, 'title': 'Discuss: are you saying it right?'}),
  idt=P.validate({**good, 'title': 'cine-news-shopping-stop-8cf065-en'}),
  glue=P.validate({**good, 'title': 'At the bank? bank phrases now'}),
  punct=P.validate({**good, 'value': 'Say "I agree.".'}),
  long=P.validate({**good, 'title': 'x' * 61}),
  tags=P.validate({**good, 'hashtags': ['learnenglish']}),
  bank=P.from_bank(dict(id='sb_068cf065', hook="Stop saying 'considering to'", wrong="I'm considering to buy a car.", why='After consider, use the -ing form.', memory='consider + -ING', topic='shopping', cefr='A2', quiz=dict(q="I'm considering ___ a new phone.", options=['buying', 'to buy'], answer=0, explain='Consider is followed by the -ing form.'))),
  bankfc=P.validate(P.from_bank(dict(id='sb_x', hook="Stop saying 'considering to'", wrong="I'm considering to buy a car.", why='After consider, use the -ing form.', memory='consider + -ING', topic='shopping', cefr='A2'))),
  nofc=P.validate({k: v for k, v in good.items() if k != 'first_comment'}),
  fc2link=fcv('Answer: discuss the plan. Practice: {link} and again {link}'),
  fcnolink=fcv('Answer: discuss the plan, not discuss about the plan. Practice it today.'),
  fcurl=fcv('Answer: discuss the plan. Practice at https://lexkite.com/app/ or here: {link}'),
  fcdomain=fcv('Answer: discuss the plan. More on lexkite.com every day, here: {link}'),
  fctag=fcv('Answer: discuss the plan. #learnenglish with us every day here: {link}'),
  fcspam=fcv('Answer: discuss the plan. Full lesson is free, link in bio for more: {link}'),
  fcshort=fcv('Learn: {link}'),
  fccaps=fcv('ANSWER: DISCUSS THE PLAN. PRACTICE IT FREE WITH A QUIZ HERE NOW: {link}'),
  fcemoji=fcv('Answer: discuss the plan 🔥🔥🔥 Practice it with a free quiz right here: {link}'),
  fcvi_bad=fcv('Dap an: discuss the plan. Luyen tap mien phi voi bai quiz o day: {link}', 'vi'),
  fcvi=fcv('Đáp án: discuss the plan. Luyện tập miễn phí với bài quiz ở đây: {link}', 'vi'),
  fcen_vi=fcv('Đáp án: discuss the plan. Luyện tập miễn phí với bài quiz ở đây: {link}', 'en'),
  fcja=fcv('答えは discuss the plan です。無料クイズで練習しよう: {link}', 'ja'),
  badlang=P.validate({**good, 'lang': 'english'}),
  longhook=P.from_bank(dict(hook='h' * 70, wrong='I am agree.', why='Agree is a verb, not an adjective.', memory='agree', topic='x', cefr='B1')),
)))`;
const r = JSON.parse(execFileSync('python3', ['-c', py], { encoding: 'utf8' }));
let fails = 0, n = 0; const ok = (c, m) => { n++; if (!c) { fails++; console.log('✗', m); } };
ok(!r.good.length, 'khối đúng đạt');
ok(r.missing.join() === 'missing', 'thiếu khối → chặn');
ok(r.cut.includes('title-cut'), 'tiêu đề cụt → chặn');
ok(r.tpl.includes('title-template') && r.idt.includes('title-template') && r.glue.includes('title-template'), 'tiêu đề mẫu, id, ghép gượng → chặn');
ok(r.punct.includes('value-punct') && r.long.some(x => /title-length/.test(x)) && r.tags.includes('hashtags'), 'dấu câu, độ dài, hashtag → chặn');
ok(r.bank.title === "Stop saying 'considering to'" && r.bank.value === 'After consider, use the -ing form.' && r.bank.keyword === 'consider + -ING' && r.bank.hashtags.includes('#shoppingenglish'), 'bank: lấy hook, why, memory người viết');
ok(r.nofc.includes('first-comment'), 'thiếu bình luận đầu → qc_gate chặn');
ok(r.fc2link.includes('first-comment-link') && r.fcnolink.includes('first-comment-link'), 'bình luận đầu phải có đúng 1 {link}');
ok(r.fcurl.includes('first-comment-raw-url') && r.fcdomain.includes('first-comment-raw-url'), 'không link trần/tên miền (link đếm click do autopilot gắn)');
ok(r.fctag.includes('first-comment-tag') && r.fcspam.includes('first-comment-spam'), 'không hashtag, không câu mồi "link in bio"');
ok(r.fcshort.some(x => /first-comment-length/.test(x)) && r.fccaps.includes('first-comment-caps') && r.fcemoji.includes('first-comment-emoji'), 'độ dài, chữ hoa, emoji');
ok(r.fcvi_bad.includes('first-comment-lang') && !r.fcvi.length && r.fcen_vi.includes('first-comment-lang') && !r.fcja.length, 'đúng ngôn ngữ của bài (vi có dấu, ja có chữ Nhật, en không lẫn tiếng khác)');
ok(r.badlang.includes('lang'), 'lang sai dạng → chặn');
ok(/^(Quiz answer|Did you get it\? It's|Answer): buying\. Consider is followed by the -ing form\. .*\{link\}$/.test(r.bank.first_comment), 'bank: bình luận đầu = đáp án quiz + giải thích của người viết');
ok(!r.bankfc.length, 'bank không có quiz → vẫn ra khối hợp lệ (dùng câu đúng + why)');
ok(r.longhook.title === 'Stop saying "I am agree"', 'hook quá dài → không cắt giữa câu');
execFileSync('python3', ['scripts/cine/publish_meta.py', '--check'], { stdio: 'pipe' }); n++; // exit 1 nếu có khối sai
const src = f => fs.readFileSync(f, 'utf8');
ok(/publish=PM\.from_bank\(b\)/.test(src('scripts/cine/bank2news.py')), 'bank2news ghi khối publish');
ok(/gate\('publish_meta'/.test(src('scripts/cine/qc_gate.py')), 'qc_gate chặn metadata');
console.log(fails ? `✗ publish-meta: ${fails}/${n} lỗi` : `✓ publish-meta: ${n} kiểm tra đạt`);
process.exit(fails ? 1 : 0);
