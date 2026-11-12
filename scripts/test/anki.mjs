// 🃏 Test liên thông Anki (web/js/anki.js): SQLite/ZIP tự viết, xuất .apkg → đọc lại, gói do Anki THẬT tạo (24.11: .anki21 cũ + .anki21b zstd),
// CSV/TSV khó (ngoặc kép, tab, BOM, HTML, xuống dòng trong ô), chặn XSS, lịch ôn FSRS → Anki, 10k thẻ trong giới hạn thời gian (lõi + giao diện jsdom).
// Kiểm thêm bằng Anki thật (thủ công, cần `pip install anki`): python3 scripts/test/anki-real-check.py <file.apkg>
// Chạy: node scripts/test/anki.mjs
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import jsdom from 'jsdom';
const { JSDOM } = jsdom;
const require = createRequire(import.meta.url);
const K = require('../../web/js/anki.js');
let fails = 0, n = 0; const ok = (c, m) => { n++; if (!c) { fails++; console.log('✗', m); } };
const FIX = new URL('./fixtures/anki/', import.meta.url);
const D = 86400000, NOW = Date.now();

// ---------- 1. SQLite: ghi → đọc lại (nhiều tầng b-tree, trang tràn, số âm/lớn, số thực) ----------
{
  const rows = []; for (let i = 1; i <= 6000; i++) rows.push({ rowid: i * 3, values: [null, 'row ' + i, i % 7 === 0 ? 'x'.repeat(9000 + i) : 'ngắn ✓ ' + i, -i * 1234567, 2 ** 40 + i, i / 7, i % 2 ? null : 0] });
  const db = K.sqliteWrite([{ name: 't', sql: 'CREATE TABLE t (id integer primary key, a text, b text, c integer, d integer, e real, f integer)', rows }, { name: 'empty', sql: 'CREATE TABLE empty (x text)', rows: [] }]);
  const r = K.sqliteOpen(db), back = r.rows('t');
  ok(back.length === 6000 && r.rows('empty').length === 0, 'SQLite: đọc lại đủ 6000 dòng + bảng rỗng');
  ok(back.every((o, i) => o.id === (i + 1) * 3 && o.a === 'row ' + (i + 1) && o.c === -(i + 1) * 1234567 && o.d === 2 ** 40 + i + 1 && Math.abs(o.e - (i + 1) / 7) < 1e-12 && o.f === ((i + 1) % 2 ? null : 0)), 'SQLite: rowid/khóa chính, số âm, số 48 bit, số thực, NULL/0 đúng');
  ok(back.filter((o, i) => (i + 1) % 7 === 0).every((o, i) => o.b.length === 9000 + (i + 1) * 7), 'SQLite: ô dài > 1 trang (trang tràn) đọc lại đúng độ dài');
  // Đối chiếu với sqlite3 thật nếu máy có (CI macOS/Linux thường có sẵn)
  try {
    const f = path.join(os.tmpdir(), 'lk-anki-test.db'); fs.writeFileSync(f, db);
    const out = execFileSync('sqlite3', [f, 'pragma integrity_check; select count(*), sum(length(b)) from t;'], { encoding: 'utf8' }).trim().split('\n');
    ok(out[0] === 'ok' && +out[1].split('|')[0] === 6000, 'sqlite3 thật: integrity_check = ok, đủ dòng');
    fs.unlinkSync(f);
  } catch (e) { if (e.code !== 'ENOENT') ok(false, 'sqlite3 thật: ' + e.message); }
}

// ---------- 2. Xuất .apkg → đọc lại bằng chính bộ nhập (round-trip) ----------
const items = [
  { word: 'abundant', ipa: '/əˈbʌndənt/', meaning: 'dồi dào, phong phú', def: 'existing in large quantities', ex: 'Fresh fruit is abundant in summer.', exMeaning: 'Trái cây tươi dồi dào vào mùa hè.', col: ['abundant evidence', 'abundant supply'], tags: ['lexkite', 'B2', 'topic one'], srs: { reps: 3, lapses: 1, interval: 12, due: NOW + 5 * D, S: 14.2, D: 5.3 } },
  { word: 'take & give', ipa: '', meaning: 'cho "và" nhận <b>', ex: 'They take & give.', tags: ['lexkite'], srs: { reps: 0, lapses: 0, due: NOW } },
  { word: 'naïve café', meaning: '天真 – ngây thơ 🙂', ex: 'Line one\nline two\tTab', tags: [], srs: { reps: 2, lapses: 0, interval: 30, due: NOW - 2 * D, S: 40, D: 3 } },
  { word: 'mitigate', meaning: 'giảm nhẹ', ex: '', tags: [], srs: { reps: 0, lapses: 2, S: 0.8, D: 7.1, due: NOW } },
];
{
  const r = await K.buildApkg(items, { deckName: 'Lexkite::Round trip', keepProgress: true, colLabel: 'Cụm hay gặp', now: NOW });
  ok(r.count === 4 && r.bytes[0] === 0x50 && r.bytes[1] === 0x4B, 'xuất .apkg: file ZIP, 4 ghi chú');
  const z = await K.zipOpen(r.bytes);
  ok(z.has('collection.anki2') && z.has('media') && new TextDecoder().decode(await z.get('media')) === '{}', 'gói có collection.anki2 + media {} (đúng chuẩn Anki cũ, mọi bản Anki nhập được)');
  const db = K.sqliteOpen(await z.get('collection.anki2')), col = db.rows('col')[0], models = JSON.parse(col.models), m = models[K.MODEL_ID];
  ok(col.ver === 11 && m && m.name === 'Lexkite (EN)' && m.flds.map(f => f.name).join() === K.FIELDS.join(), 'col.ver = 11, kiểu ghi chú "Lexkite (EN)" đủ trường Word, IPA, Meaning…');
  ok(/\{\{tts en_GB:Word\}\}/.test(m.tmpls[0].qfmt) && /\.nightMode/.test(m.css) && /#0F3D3E/.test(m.css) && /Cụm hay gặp/.test(m.tmpls[0].afmt), 'mẫu thẻ: phát âm TTS, màu thương hiệu, chế độ tối, nhãn cụm từ theo ngôn ngữ');
  const decks = JSON.parse(col.decks); ok(Object.values(decks).some(d => d.name === 'Lexkite::Round trip') && decks[1], 'bộ thẻ Lexkite::… + Default');
  const notes = db.rows('notes'), cards = db.rows('cards');
  ok(notes.length === 4 && cards.length === 4 && cards.every(c => notes.some(nn => nn.id === c.nid)), 'mỗi ghi chú 1 thẻ, nid khớp');
  ok(notes[0].guid === K.guidOf('abundant') && new Set(notes.map(x => x.guid)).size === 4, 'GUID cố định theo từ (xuất lại → Anki cập nhật, không trùng)');
  ok(notes[0].flds.split('\x1f')[4].includes('<b>abundant</b>') && notes[1].flds.split('\x1f')[0] === 'take &amp; give' && notes[1].flds.split('\x1f')[2] === 'cho &quot;và&quot; nhận &lt;b&gt;', 'trường HTML: tô đậm từ trong ví dụ, ký tự đặc biệt được mã hóa');
  ok(notes[0].tags === ' lexkite B2 topic_one ', 'tag Anki không chứa khoảng trắng');
  const [c0, c1, c2, c3] = cards;
  ok(c0.type === 2 && c0.queue === 2 && c0.due === K.CRT_BACK + 5 && c0.ivl === 12 && JSON.parse(c0.data).s === 14.2 && JSON.parse(c0.data).d === 5.3, 'giữ tiến độ: thẻ ôn, hạn +5 ngày, ivl 12, trạng thái nhớ FSRS s/d');
  ok(c1.type === 0 && c1.queue === 0 && c1.data === '', 'thẻ đang học dở → thẻ mới');
  ok(c2.type === 2 && c2.due === K.CRT_BACK - 2, 'thẻ quá hạn 2 ngày → hạn = hôm nay − 2');
  ok(c3.type === 2 && c3.due === K.CRT_BACK && c3.lapses === 2, 'thẻ quên (học lại) → thẻ ôn đến hạn hôm nay, giữ số lần quên');
  const today = K.ankiDay(NOW), crtDay = K.ankiDay(col.crt * 1000 + 4 * 3600000);
  ok(today - crtDay === K.CRT_BACK, 'ngày tạo bộ sưu tập (crt) cách hôm nay đúng CRT_BACK ngày → Anki tính hạn đúng');
  const plain = await K.buildApkg(items, { now: NOW });
  const pc = K.sqliteOpen(await (await K.zipOpen(plain.bytes)).get('collection.anki2')).rows('cards');
  ok(pc.every((c, i) => c.type === 0 && c.due === i + 1), 'mặc định (không giữ tiến độ): mọi thẻ là thẻ mới theo thứ tự');
  // Đọc lại bằng bộ nhập
  const set = await K.parseApkg(r.bytes), map = K.guessMap(set);
  ok(set.kind === 'apkg' && set.deck === 'Lexkite::Round trip' && set.columns.join() === K.FIELDS.join(), 'nhập lại: nhận đúng bộ thẻ và tên cột');
  ok(map.word === 0 && map.mean === 2 && map.ex === 4 && map.ipa === 1, 'nhập lại: tự ghép cột Word/Meaning/Example/IPA');
  const plan = await K.planImport(set, map);
  ok(plan.entries.length === 4 && plan.entries.map(e => e.word).join('|') === 'abundant|take & give|naïve café|mitigate', 'round-trip: đủ 4 từ, đúng thứ tự, giữ ký tự đặc biệt');
  ok(plan.entries[0].meaning === 'dồi dào, phong phú' && plan.entries[0].ipa === '/əˈbʌndənt/' && plan.entries[0].ex === 'Fresh fruit is abundant in summer.', 'round-trip: nghĩa, IPA, ví dụ (bỏ thẻ <b>) giống bản gốc');
  ok(plan.entries[1].meaning === 'cho "và" nhận ‹b›' && plan.entries[2].meaning === '天真 – ngây thơ 🙂', 'round-trip: ngoặc kép, Unicode, emoji; dấu < > thành ‹ › (không thành thẻ HTML)');
  ok(plan.entries[0].tags.includes('topic_one'), 'round-trip: giữ tag');
  const again = await K.planImport(set, map, { existing: new Set(['abundant', 'mitigate']) });
  ok(again.entries.length === 2 && again.dup === 2, 'chống trùng: từ đã có trong sổ bị bỏ qua');
}

// ---------- 3. Gói do Anki THẬT (24.11) tạo ----------
{
  const legacy = await K.parseApkg(new Uint8Array(fs.readFileSync(new URL('real-anki-legacy.apkg', FIX))));
  const modern = await K.parseApkg(new Uint8Array(fs.readFileSync(new URL('real-anki-modern.apkg', FIX))));
  for (const [name, s] of [['.anki21 (Support older Anki versions)', legacy], ['.anki21b (zstd, mặc định Anki mới)', modern]]) {
    ok(s.deck === 'Lexkite Fixture::IELTS' && s.columns.join() === 'Front,Back' && s.rows.length === 5 && s.models.includes('Basic'), `Anki thật ${name}: bộ thẻ, cột Front/Back, 5 ghi chú`);
    const p = await K.planImport(s, K.guessMap(s));
    const by = Object.fromEntries(p.entries.map(e => [e.word, e.meaning]));
    ok(by.abundant === 'dồi dào, phong phú' && by.mitigate === 'giảm nhẹ · làm dịu' && by['take & give'] === 'cho ‹và› nhận' && by['café'] === 'quán cà phê', `Anki thật ${name}: bỏ HTML/[sound:], giữ xuống dòng thành “·”, giải mã &amp;`);
    ok(by.xss === 'ok' && p.entries.every(e => !/[<>]/.test(e.word + e.meaning + e.ex)), `Anki thật ${name}: <img onerror>/<script> bị loại bỏ`);
    ok(s.rows[0].tags.join() === 'fixture,lexkite', `Anki thật ${name}: đọc tag`);
  }
}

// ---------- 4. CSV / TSV ----------
{
  const a = K.parseDelimited('﻿#separator:tab\n#html:true\n#columns:Front\tBack\tTags\n#tags column:3\n<b>apple</b>\t"quả <i>táo</i>\t(tab trong ô)"\tfruit food\n"multi\nline"\tnghĩa 2\t\n');
  ok(a.sep === '\t' && a.html && a.columns.join() === 'Front,Back,Tags' && a.rows.length === 2 && a.tagsIdx === 2, 'TSV Anki: BOM, #separator, #html, #columns, #tags column');
  ok(a.rows[0].cells[1] === 'quả <i>táo</i>\t(tab trong ô)' && a.rows[0].tags.join() === 'fruit,food' && a.rows[1].cells[0] === 'multi\nline', 'TSV: tab & xuống dòng trong ngoặc kép, tag theo cột');
  const b = K.parseDelimited('word,meaning,example\r\n"say ""hi""",chào,"Hello, world"\r\nresilient,kiên cường,\r\n\r\n');
  ok(b.sep === ',' && b.columns.join() === 'word,meaning,example' && b.rows.length === 2 && b.rows[0].cells[0] === 'say "hi"' && b.rows[0].cells[2] === 'Hello, world', 'CSV: dòng tiêu đề, "" thoát ngoặc, dấu phẩy trong ô, CRLF, bỏ dòng trống');
  const c = K.parseDelimited('dog;con chó\ncat;con mèo\n');
  ok(c.sep === ';' && c.rows.length === 2 && c.columns.every(x => x === ''), 'tự đoán dấu chấm phẩy, không nhầm dòng đầu là tiêu đề');
  const gm = K.guessMap(b); ok(gm.word === 0 && gm.mean === 1 && gm.ex === 2, 'đoán cột word/meaning/example theo tên');
  const pb = await K.planImport(b, gm); ok(pb.entries[0].word === 'say "hi"' && pb.entries[0].ex === 'Hello, world', 'CSV → thẻ đúng');
  const plainLt = await K.planImport(K.parseDelimited('a <x> c\tless < more\n'), { word: 0, mean: 1, ex: -1, ipa: -1 });
  ok(plainLt.entries[0].word === 'a ‹x› c' && plainLt.entries[0].meaning === 'less ‹ more', 'file văn bản không HTML: dấu < giữ nghĩa, không bị cắt mất chữ');
  const bad = await K.planImport(K.parseDelimited('\t\n12345\tnumber\n' + 'x'.repeat(90) + '\tlong\nok word\tfine\nOK WORD\tdup\n'), { word: 0, mean: 1, ex: -1, ipa: -1 });
  ok(bad.entries.length === 1 && bad.invalid === 2 && bad.dup === 1, 'bỏ qua dòng rỗng/không có chữ cái/quá dài, trùng trong file');
  // Xuất văn bản Anki & CSV → đọc lại
  const txt = K.buildAnkiText(items, { deckName: 'Lexkite::T' }), t2 = K.parseDelimited(txt);
  ok(/^#separator:tab\n#html:true\n#notetype:Basic\n#deck:Lexkite::T\n/.test(txt) && t2.rows.length === 4 && t2.columns.join() === 'Front,Back,Tags', 'xuất .txt cho Anki: tiêu đề chuẩn, đọc lại 4 dòng');
  ok(K.htmlToText(t2.rows[2].cells[1]).includes('Line one line two Tab'), 'xuất .txt: xuống dòng/tab trong ô không làm vỡ dòng');
  const csv = K.buildCsv(items), c3 = K.parseDelimited(csv);
  ok(csv.startsWith('﻿Word,IPA,Meaning') && c3.columns[0] === 'Word' && c3.rows.length === 4 && c3.rows[1].cells[2] === 'cho "và" nhận <b>' && c3.rows[2].cells[4] === 'Line one\nline two\tTab', 'xuất CSV (BOM cho Excel) → đọc lại đúng từng ô');
}

// ---------- 5. XSS ----------
const PAYLOADS = ['<img src=x onerror=alert(1)>', '<script>alert(1)</script>', '&lt;img src=x onerror=alert(1)&gt;', '<svg/onload=alert(1)>', '<a href="javascript:alert(1)">x</a>', '<iframe srcdoc="<script>alert(1)</script>">', '"><img src=x onerror=alert(1)>', '<img src=x onerror=alert(1)', '&#60;script&#62;alert(1)&#60;/script&#62;', '<<script>script>alert(1)<</script>/script>'];
for (const p of PAYLOADS) ok(!/[<>]/.test(K.htmlToText(p)), 'htmlToText không còn < >: ' + p);

// ---------- 6. Hiệu năng: 10.000 thẻ ----------
{
  const big = Array.from({ length: 10000 }, (_, i) => ({ word: 'word' + i, ipa: '/wɜːd/', meaning: 'nghĩa số ' + i, ex: `Example sentence number ${i} with <b>word${i}</b>.`, tags: ['lexkite'], srs: { reps: i % 2, interval: 3, due: NOW + D, S: 3, D: 5 } }));
  let t0 = performance.now(); const r = await K.buildApkg(big, { keepProgress: true }); const tExp = performance.now() - t0;
  t0 = performance.now(); const set = await K.parseApkg(r.bytes); const p = await K.planImport(set, K.guessMap(set), { existing: new Set(['word5']) }); const tImp = performance.now() - t0;
  ok(r.count === 10000 && p.entries.length === 9999 && p.dup === 1, '10k: xuất rồi nhập lại đủ thẻ');
  console.log(`  10k lõi: xuất ${Math.round(tExp)} ms · đọc+kiểm ${Math.round(tImp)} ms`);
  ok(tExp < 6000 && tImp < 6000, `10k: xuất ${Math.round(tExp)} ms, đọc+lập kế hoạch ${Math.round(tImp)} ms (< 6 s)`);
  let yields = 0; const orig = globalThis.setTimeout; globalThis.setTimeout = (f, ms) => { yields++; return orig(f, ms); };
  let cancelAt = 0; const pc = await K.planImport(set, K.guessMap(set), { isCancelled: () => ++cancelAt > 3 });
  globalThis.setTimeout = orig;
  ok(pc.cancelled && pc.entries.length === 0 && yields >= 2, '10k: chia lô nhường luồng chính, hủy được giữa chừng');
}

// ---------- 7. Giao diện (jsdom): mở hộp thoại, xem trước an toàn, nhập 10k dòng có thanh tiến độ, xuất .apkg ----------
{
  const rd = f => fs.readFileSync(new URL('../../web/' + f, import.meta.url), 'utf8');
  const dom = new JSDOM('<!doctype html><html><head></head><body><main id="view"></main><div id="modal" hidden><div id="modalBox"></div></div><div id="toast"></div></body></html>', { url: 'https://lexkite.com/app/#/deck', runScripts: 'outside-only', pretendToBeVisual: true });
  const w = dom.window, d = w.document;
  for (const [k, v] of Object.entries({ TextEncoder, TextDecoder, Blob, File, Response, CompressionStream, DecompressionStream, crypto: globalThis.crypto })) Object.defineProperty(w, k, { value: v, configurable: true, writable: true });
  w.matchMedia = () => ({ matches: false, addEventListener() {} });
  w.localStorage.setItem('vb.uiLang', 'en');
  for (const f of ['js/i18n.js', 'js/i18n/en.js', 'js/i18n/en/anki.js', 'js/kit.js']) w.eval(rd(f));
  let downloads = [], store = {}, saved = null;
  const keyOf = s => String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();
  w.Core = { keyOf, SRS: { retentionTarget: 0.9 }, Store: { get: async (k, f) => store[k] ?? f, set: async (k, v) => { store[k] = v; } },
    Cards: { all: async () => ({ ...(saved || { abundant: { word: 'abundant', srs: {} } }) }), save: async m => { saved = m; }, make: (e, x) => ({ word: e.word, ipa: e.ipa || '', vi: e.vi || '', def: e.def || '', ex: e.ex || '', topic: e.topic || 'mine', contexts: [], srs: { reps: 0, due: 1 }, ...x }) } };
  w.App = { state: { cards: { abundant: { word: 'abundant', vi: 'dồi dào', srs: { reps: 2, interval: 4, due: NOW + D, S: 4, D: 5 }, contexts: [] } } }, meanOf: c => c.vi || c.def || '', load: async () => { w.App.state.cards = saved; }, updateChrome() {} };
  w.eval(rd('js/ui.js'));
  w.UI.download = (blob, name) => downloads.push({ blob, name });
  w.eval(rd('js/anki.js'));
  const tick = (ms = 0) => new Promise(r => setTimeout(r, ms));
  ok(typeof w.AnkiUI.open === 'function' && typeof w.App.ankiOpen === 'function', 'AnkiUI nạp được, gắn App.ankiOpen');
  // Xuất
  await w.AnkiUI.open('export', { cards: Object.values(w.App.state.cards), name: 'My words' });
  const box = d.getElementById('modalBox');
  ok(!d.getElementById('modal').hidden && box.getAttribute('aria-labelledby') === 'akTitle' && box.querySelectorAll('[role=tab]').length === 2, 'hộp thoại: tiêu đề, 2 tab (role=tab)');
  ok(box.querySelectorAll('input[name=akFmt]').length === 3 && box.querySelector('#akKeep') && box.querySelector('.ak-prev'), 'xuất: 3 định dạng, tùy chọn giữ tiến độ, xem trước thẻ');
  ok(!/[ăđơư]|Xuất|Nhập|Định dạng/.test(box.textContent.replace(/dồi dào/g, '')), 'giao diện tiếng Anh không lẫn tiếng Việt');
  box.querySelector('#akKeep').click(); box.querySelector('#akGo').click();
  for (let i = 0; i < 50 && !downloads.length; i++) await tick(10);
  ok(downloads.length === 1 && /^lexkite-my-words-\d{4}-\d\d-\d\d\.apkg$/.test(downloads[0].name), 'bấm Tạo file → tải .apkg tên rõ ràng: ' + (downloads[0] || {}).name);
  const ex = await K.parseApkg(new Uint8Array(await downloads[0].blob.arrayBuffer()));
  ok(ex.rows.length === 1 && ex.rows[0].cells[0] === 'abundant', 'file tải về đọc lại được');
  await tick(20);
  ok(box.querySelector('.ak-done') && box.querySelectorAll('[data-plat]').length === 3 && box.querySelectorAll('.ak-steps li').length === 3, 'màn thành công: hướng dẫn mở trong Anki theo 3 nền tảng');
  box.querySelector('[data-plat=ios]').click(); ok(box.querySelector('[data-plat=ios]').getAttribute('aria-pressed') === 'true' && /AnkiMobile/.test(box.textContent), 'chọn iPhone → hướng dẫn AnkiMobile');
  // Nhập: 10k dòng + dòng độc hại
  box.querySelector('#akTabI').click();
  ok(box.querySelector('#akDrop') && box.querySelector('#akFile').getAttribute('accept').includes('.apkg'), 'tab nhập: vùng chọn/kéo thả file, nhận .apkg/.txt/.csv');
  const lines = ['#separator:tab', '#html:true', '#columns:Front\tBack\tExample', '<img src=x onerror="window.__pwned=1">evil\t<script>window.__pwned=2</script>nghĩa\t<b onmouseover=alert(1)>x</b>', 'abundant\tdồi dào\t'];
  for (let i = 0; i < 10000; i++) lines.push(`term${i}\tnghĩa ${i}\tExample ${i}`);
  const file = new File([lines.join('\n')], 'IELTS deck.txt', { type: 'text/plain' });
  const inp = box.querySelector('#akFile'); Object.defineProperty(inp, 'files', { value: [file] }); inp.dispatchEvent(new w.Event('change'));
  for (let i = 0; i < 100 && !box.querySelector('#akRows tr'); i++) await tick(10);
  ok(box.querySelector('#akDeck').value === 'IELTS deck' && box.querySelector('#akW').value === '0' && box.querySelector('#akM').value === '1' && box.querySelector('#akE').value === '2', 'nhập: tên bộ từ theo file, tự ghép cột');
  ok(box.querySelectorAll('#akRows tr').length === 10 && box.querySelector('.ak-tbl').getAttribute('tabindex') === '0', 'xem trước đúng 10 dòng, cuộn được bằng bàn phím');
  ok(!box.querySelector('#akRows img, #akRows script, #akRows b') && !w.__pwned && box.querySelector('#akRows tr td').textContent === 'evil', 'XSS: xem trước chỉ là chữ, không tạo thẻ <img>/<script>');
  ok(/1 already saved/.test(box.querySelector('#akCount').textContent) && box.querySelector('#akGo').textContent.includes('10,001') === false && /Import 10001 words/.test(box.querySelector('#akGo').textContent), 'đếm: từ mới / đã có, nút “Import N words”');
  ok([...box.querySelectorAll('label')].every(l => l.control || l.querySelector('input,select')), 'mọi ô chọn có nhãn');
  const t0 = performance.now(); box.querySelector('#akGo').click(); await tick(0);
  const bar = box.querySelector('[role=progressbar]'); ok(bar && box.querySelector('#akCancel'), 'đang nhập: thanh tiến độ (role=progressbar) + nút Hủy');
  let maxBlock = 0, last = performance.now();
  for (let i = 0; i < 600 && !box.querySelector('.ak-done'); i++) { await tick(1); const now = performance.now(); maxBlock = Math.max(maxBlock, now - last); last = now; }
  const took = performance.now() - t0;
  ok(box.querySelector('.ak-done') && saved && Object.keys(saved).length === 10002, `nhập 10.001 từ mới vào sổ (${Math.round(took)} ms)`);
  console.log(`  10k giao diện: nhập ${Math.round(took)} ms · khựng lâu nhất ${Math.round(maxBlock)} ms`);
  ok(took < 8000 && maxBlock < 1500, `10k không treo giao diện: tổng ${Math.round(took)} ms, khựng lâu nhất ${Math.round(maxBlock)} ms`);
  ok(saved.term42.deck === 'IELTS deck' && (saved.term42.vi || saved.term42.def) === 'nghĩa 42' && saved.term42.ex === 'Example 42' && saved.term42.srs.reps === 0, 'thẻ nhập: đúng bộ, nghĩa, ví dụ, lịch FSRS mới');
  ok(saved.evil && !/[<>]/.test(saved.evil.vi + saved.evil.ex) && saved.abundant.word === 'abundant' && !saved.abundant.deck, 'dữ liệu lưu không chứa thẻ HTML; từ đã có giữ nguyên');
  ok(/Imported 10001 words/.test(box.querySelector('.ak-done').textContent), 'màn hoàn tất tiếng Anh');
  // Hủy giữa chừng: không ghi gì
  const before = saved; box.querySelector('#akTabI').click(); w.AnkiUI.open('import', {}); await tick(0);
  const inp2 = d.querySelector('#akFile'); Object.defineProperty(inp2, 'files', { value: [new File([Array.from({ length: 5000 }, (_, i) => `zz${i}\tx`).join('\n')], 'b.tsv')] }); inp2.dispatchEvent(new w.Event('change'));
  for (let i = 0; i < 100 && !d.querySelector('#akRows tr'); i++) await tick(10);
  d.querySelector('#akGo').click(); await tick(0); d.querySelector('#akCancel').click();
  for (let i = 0; i < 200 && d.querySelector('#akCancel'); i++) await tick(5);
  ok(saved === before && d.querySelector('#akGo'), 'Hủy: không ghi dữ liệu, quay lại bước ghép cột');
  // File hỏng
  w.AnkiUI.open('import', {}); await tick(0);
  const inp3 = d.querySelector('#akFile'); Object.defineProperty(inp3, 'files', { value: [new File([new Uint8Array([0x50, 0x4B, 3, 4, 1, 2, 3])], 'bad.apkg')] }); inp3.dispatchEvent(new w.Event('change'));
  for (let i = 0; i < 100 && !d.querySelector('.ak-err'); i++) await tick(10);
  ok(d.querySelector('.ak-err') && /damaged|not an Anki/.test(d.querySelector('.ak-err').textContent), 'file hỏng → thông báo rõ ràng');
}

console.log(fails ? `✗ anki: ${fails}/${n} kiểm tra lỗi` : `✓ anki: ${n} kiểm tra đạt (SQLite/ZIP, .apkg xuất–nhập, Anki thật .anki21/.anki21b, CSV, XSS, 10k thẻ, giao diện)`);
process.exit(fails ? 1 : 0);
