// Cổng metadata lúc sản xuất (scripts/cine/publish_meta.py + qc_gate.py + bank2news.py): khối publish hợp lệ, chặn tiêu đề cụt/mẫu/id; mọi khối trong repo đạt.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
const py = `
import json, sys
sys.path.insert(0, 'scripts/cine')
import publish_meta as P
good = dict(title='Stop saying "discuss about"', keyword='discuss', value='Discuss takes a direct object.', hashtags=['#learnenglish', '#englishtips', '#a2english'])
print(json.dumps(dict(
  good=P.validate(good), missing=P.validate(None),
  cut=P.validate({**good, 'title': 'Book a doctor: polite to'}),
  tpl=P.validate({**good, 'title': 'Discuss: are you saying it right?'}),
  idt=P.validate({**good, 'title': 'cine-news-shopping-stop-8cf065-en'}),
  glue=P.validate({**good, 'title': 'At the bank? bank phrases now'}),
  punct=P.validate({**good, 'value': 'Say "I agree.".'}),
  long=P.validate({**good, 'title': 'x' * 61}),
  tags=P.validate({**good, 'hashtags': ['learnenglish']}),
  bank=P.from_bank(dict(hook="Stop saying 'considering to'", wrong="I'm considering to buy a car.", why='After consider, use the -ing form.', memory='consider + -ING', topic='shopping', cefr='A2')),
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
ok(r.longhook.title === 'Stop saying "I am agree"', 'hook quá dài → không cắt giữa câu');
execFileSync('python3', ['scripts/cine/publish_meta.py', '--check'], { stdio: 'pipe' }); n++; // exit 1 nếu có khối sai
const src = f => fs.readFileSync(f, 'utf8');
ok(/publish=PM\.from_bank\(b\)/.test(src('scripts/cine/bank2news.py')), 'bank2news ghi khối publish');
ok(/gate\('publish_meta'/.test(src('scripts/cine/qc_gate.py')), 'qc_gate chặn metadata');
console.log(fails ? `✗ publish-meta: ${fails}/${n} lỗi` : `✓ publish-meta: ${n} kiểm tra đạt`);
process.exit(fails ? 1 : 0);
