// Câu hay rơi về giọng máy → hàng dựng Kokoro (scripts/sentence-audio/misses.mjs, docs/specs/kokoro-on-device.md §Số đo):
// khóa băm từ người dùng thật ghép đúng câu trong nội dung tĩnh, không bao giờ nhận văn bản lạ, corpus.mjs đọc misses.tsv, /api/vmiss chỉ cho CI ký HMAC.
import assert from 'node:assert/strict'; import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import vm from 'node:vm';
const M = await import('../sentence-audio/misses.mjs');
const c = { self: {} }; c.self = c; vm.createContext(c); vm.runInContext(fs.readFileSync('web/js/listen/kvoice.js', 'utf8'), c);
const key = (v, t) => c.KVoice.lineKey(v, t);
// Biến thể giống lúc app đọc: bỏ thẻ, tách câu như UI.tts
assert.ok([...M.variants('She <b>usually</b> walks. Then she runs!')].includes('She usually walks.') && [...M.variants('She <b>usually</b> walks. Then she runs!')].includes('Then she runs!'), 'variants: bỏ thẻ + tách câu');
// Quét nội dung tạm: chuỗi JS + JSON, tiếng Việt/mã bị bỏ
const d = fs.mkdtempSync(path.join(os.tmpdir(), 'vmiss-'));
fs.writeFileSync(path.join(d, 'a.js'), "const x = { ex: 'I would like a cup of tea, please.', vi: 'Tôi muốn một tách trà.', f: 'js/app.js' };");
fs.writeFileSync(path.join(d, 'b.json'), JSON.stringify({ items: [{ t: 'Where is the station? Turn left here.' }] }));
const want = new Set([key('af_heart', 'I would like a cup of tea, please.'), key('bf_emma', 'Turn left here.'), key('bf_emma', 'Tôi muốn một tách trà.'), 'zzzz']);
const found = M.match(want, [d]);
assert.deepEqual([...found.values()].map(r => r.voice + '|' + r.text).sort(), ['af_heart|I would like a cup of tea, please.', 'bf_emma|Turn left here.'], 'match: đúng giọng + câu; tiếng Việt/khóa lạ không khớp');
// Gộp: câu mới chưa có file thêm vào (nhiều lượt trước), câu đã có file bỏ, câu cũ cập nhật số lượt; khóa không khớp chỉ đếm vào tỉ lệ
const kTea = key('af_heart', 'I would like a cup of tea, please.'), kLeft = key('bf_emma', 'Turn left here.');
const res = M.merge(new Map(), [[kTea, 9], [kLeft, 4], ['zzzz', 7]], found, new Set([kLeft]));
assert.deepEqual([[...res.rows.keys()], res.added, res.hitAll, res.hitMatched], [[kTea], 1, 20, 13], 'merge: thêm câu chưa có file, bỏ câu đã có, tỉ lệ khớp');
const res2 = M.merge(res.rows, [[kTea, 2]], new Map(), new Set());
assert.equal(res2.rows.get(kTea).n, 2, 'merge: câu đã thêm giữ lại, số lượt = 14 ngày gần nhất');
const bad = M.merge(new Map(), [['k1', 3]], new Map([['k1', { voice: 'af_heart', text: 'Wrong text.' }]]), new Set());
assert.equal(bad.rows.size, 0, 'merge: khóa không khớp giọng|câu → không thêm');
// Ghi/đọc tsv + corpus đọc nhóm misses (chỉ dòng khóa khớp)
const f = path.join(d, 'misses.tsv'); M.writeTsv(res.rows, f);
assert.equal(M.readTsv(f).get(kTea).text, 'I would like a cup of tea, please.', 'tsv: ghi/đọc lại');
const corpus = fs.readFileSync('scripts/sentence-audio/corpus.mjs', 'utf8');
assert.ok(/web\/audio\/l\/misses\.tsv/.test(corpus) && /lineKey\(voice, text\) !== key/.test(corpus) && /tag\('misses', key\)/.test(corpus), 'corpus.mjs: nhóm misses, chỉ dòng khóa khớp');
assert.ok(fs.readFileSync('.github/workflows/audio.yml', 'utf8').includes("'web/audio/l/misses.tsv'"), 'audio.yml: đổi misses.tsv → render ngay');
fs.rmSync(d, { recursive: true, force: true });
// Endpoint: chỉ CI ký HMAC, chỉ op top, khoảng ngày có trần
const api = fs.readFileSync('functions/api/vmiss.js', 'utf8');
assert.ok(/cliVerify\(env, request, text\)/.test(api) && !/onRequestGet/.test(api), '/api/vmiss: chỉ POST ký HMAC');
const { since } = await import('../../functions/api/vmiss.js'), now = Date.parse('2026-11-22T00:00:00Z');
assert.deepEqual([since(now, 14), since(now, 999), since(now, 'x')], ['2026-11-08', '2026-10-23', '2026-11-08'], 'since: 1–30 ngày, mặc định 14');
const wf = fs.readFileSync('.github/workflows/voice-misses.yml', 'utf8');
assert.ok(/--from-api-to/.test(wf) && /--from \$RUNNER_TEMP\/top\.json/.test(wf), 'voice-misses.yml: gọi API 1 lần, commit-regen chạy lại từ số liệu đã lưu');
console.log('✓ voice-misses: khóa băm → câu trong nội dung → misses.tsv → corpus, endpoint chỉ CI');
