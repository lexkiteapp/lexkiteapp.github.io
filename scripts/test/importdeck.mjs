// 📥 Test Nhập tài liệu → bộ thẻ (web/js/importdeck.js, docs/specs/import-to-deck.md #5, lát M1)
// Lõi: parser SRT/VTT, ePub (zipWrite → zipOpen), PDF (bộ đọc giả: mẻ 50 trang, hủy được, nhường luồng), tách câu ≤ 25 từ, lọc từ (đã biết · top-1000 · tên riêng · số),
// xếp hạng, gộp biến cách theo từ điển, tạo thẻ + đánh dấu "chưa có nghĩa"; giao diện (jsdom): 4 bước, 30 từ chọn sẵn, bỏ/chọn, hoàn tác 10 s, cờ TẮT ẩn nút.
// Chạy: node scripts/test/importdeck.mjs
import fs from 'node:fs';
import { createRequire } from 'node:module';
import jsdom from 'jsdom';
const { JSDOM } = jsdom;
const require = createRequire(import.meta.url);
const rd = f => fs.readFileSync(new URL('../../web/' + f, import.meta.url), 'utf8');
let fails = 0, n = 0; const ok = (c, m) => { n++; if (!c) { fails++; console.log('✗', m); } };
const FIX = new URL('./fixtures/importdeck/', import.meta.url);
(0, eval)(rd('cpack/importdeck-app/freq-rank.js').replace(/^self\./m, 'globalThis.'));
const A = require('../../web/js/anki.js'); globalThis.AnkiKit = A;
const K = require('../../web/cpack/importdeck-app/importdeck.js');
const enc = new TextEncoder();
const uw = i => String.fromCharCode(97 + Math.floor(i / 26)) + String.fromCharCode(97 + i % 26);
const File_ = (parts, name, type = '') => new File(Array.isArray(parts) ? parts : [parts], name, { type });

// ---------- 1. Bảng hạng tần suất ----------
ok(K.rankOf('the') === 1 && K.rankOf('mitigate') === 0 && K.rankOf('walking') > 0 && K.rankOf('walking') <= 1000, 'hạng: the=1, mitigate không có, walking → walk (top 1000)');
ok(K.forms('studies').includes('study') && K.forms('stopped').includes('stop') && K.forms('making').includes('make'), 'dạng gốc: studies/stopped/making');

// ---------- 2. Phụ đề ----------
{
  const s = K.parseSubs(fs.readFileSync(new URL('sample.srt', FIX), 'utf8')), v = K.parseSubs(fs.readFileSync(new URL('sample.vtt', FIX), 'utf8'));
  ok(s === 'The ambiguous results left the committee deeply skeptical. Nobody could mitigate the risk.', 'SRT: bỏ số thứ tự/mốc giờ/thẻ/{\\an8}/gạch đầu dòng, dòng lặp liên tiếp: ' + s);
  ok(v === 'The ambiguous results left the committee deeply skeptical.', 'VTT: bỏ WEBVTT/NOTE/STYLE/cue settings/<c>, dòng lặp cuộn: ' + v);
  ok(K.parseSubs('﻿1\r\n00:00:01,000 --> 00:00:02,000\r\nHello world\r\n') === 'Hello world', 'SRT: BOM + CRLF');
}

// ---------- 3. Tách câu, từ đáng học ----------
const TEXT = `Dr. Maria Santos visited Paris in 2019 and 2020. The ambiguous results left the committee deeply skeptical about the 3rd experiment.
Nobody could mitigate the risk, but the ambiguous data stayed ambiguous. She said that the committee would reconvene on Monday.

NASA scientists praised the ephemeral beauty of the nebula. The ephemeral glow faded. We walked to the house and she made a good plan with the people there.
Skeptical readers doubted the claims, and a skeptical editor agreed. Xqzvtp is not a word.`;
{
  const m = K.createMiner({ known: new Set(['reconvene']) }); m.feed(TEXT); const r = m.result(), words = r.map(c => c.word);
  ok(words.includes('ambiguous') && words.includes('ephemeral') && words.includes('skeptical') && words.includes('mitigate'), 'giữ từ hiếm: ' + words.join(','));
  ok(!words.includes('reconvene'), 'bỏ từ đã có trong sổ');
  ok(!['the', 'and', 'said', 'house', 'people', 'good', 'plan', 'walked', 'made', 'there'].some(w => words.includes(w)), 'bỏ từ top-1000 (và biến cách walked/made)');
  ok(!['maria', 'santos', 'paris', 'monday', 'nasa'].some(w => words.includes(w)), 'bỏ tên riêng/viết tắt: ' + words.join(','));
  ok(!words.some(w => /\d/.test(w)) && !words.includes('rd'), 'bỏ số/3rd');
  const amb = r.find(c => c.word === 'ambiguous'), sk = r.find(c => c.word === 'skeptical');
  ok(amb.n === 3 && sk.n === 3, 'đếm tần suất: ' + amb.n + ',' + sk.n);
  ok(r.every(c => c.sentence.split(/\s+/).length <= 27), 'câu gốc ≤ 25 từ');
  ok(/ambiguous/.test(amb.sentence), 'câu gốc chứa từ');
  const x = words.indexOf('xqzvtp'); ok(x === -1 || x > words.indexOf('ambiguous'), 'chữ lạ 1 lần xếp sau từ lặp');
  ok(r.every((c, i) => !i || r[i - 1].score >= c.score), 'xếp theo điểm giảm dần');
  // Câu rất dài → cửa sổ ≤ 25 từ quanh từ đích
  const long = 'This is a very long sentence ' + 'that keeps going and going '.repeat(8) + 'until the ephemeral word finally appears ' + 'and then continues for a while longer '.repeat(5) + 'to the end.';
  const m2 = K.createMiner(); m2.feed(long); const e = m2.result().find(c => c.word === 'ephemeral');
  ok(e && /ephemeral/.test(e.sentence) && e.sentence.replace(/…/g, '').trim().split(/\s+/).length <= 25, 'câu dài → cắt cửa sổ ≤ 25 từ');
  // Nạp từng mẻ (câu bị cắt đôi giữa hai mẻ) cho cùng kết quả
  const m3 = K.createMiner({ known: new Set(['reconvene']) }); for (const part of TEXT.match(/\S+\s*/g).reduce((a, x, i) => ((a[i >> 2] = (a[i >> 2] || '') + x), a), [])) m3.feed(part);
  ok(JSON.stringify(m3.result().map(c => [c.word, c.n]).sort()) === JSON.stringify(r.map(c => [c.word, c.n]).sort()), 'nạp theo mẻ nhỏ = nạp một lần (câu bắc cầu giữa mẻ)');
}

// ---------- 4. Tra từ điển, gộp biến cách, chọn sẵn 30 ----------
{
  const m = K.createMiner(); m.feed('The committee mitigated the risk. They mitigate harm. Nobody mitigates doubt. An obscure gloop appeared. ' + Array.from({ length: 50 }, (_, i) => `The perspicacious quux${uw(i)} remained.`).join(' '));
  const DICT = { mitigated: { word: 'mitigate', meaning: 'giảm nhẹ', entry: { word: 'mitigate', vi: 'giảm nhẹ', pos: 'v', level: 'C1' }, level: 'C1' }, mitigate: { word: 'mitigate', meaning: 'giảm nhẹ', entry: { word: 'mitigate', vi: 'giảm nhẹ', level: 'C1' }, level: 'C1' }, mitigates: { word: 'mitigate', meaning: 'giảm nhẹ', entry: { word: 'mitigate', vi: 'giảm nhẹ', level: 'C1' }, level: 'C1' }, obscure: { word: 'obscure', meaning: 'mờ mịt', entry: { word: 'obscure', vi: 'mờ mịt', level: 'C1' }, level: 'C1' }, ship: { word: 'ship', meaning: 'tàu', entry: { word: 'ship' } } };
  const raw = m.result(), L = await K.enrich(raw, { lookup: w => DICT[w] || null, known: new Set() });
  const mit = L.filter(c => c.word === 'mitigate');
  ok(mit.length === 1 && mit[0].n === 3 && mit[0].meaning === 'giảm nhẹ', 'gộp mitigated/mitigate/mitigates → 1 từ gốc, n=3');
  ok(L.length > 40 && K.preselect(L).size === 30 && [...K.preselect(L)][0] === L[0].word, 'chọn sẵn đúng 30 từ đầu');
  const L2 = await K.enrich(raw, { lookup: w => DICT[w] || null, known: new Set(['mitigate']) });
  ok(!L2.some(c => c.word === 'mitigate'), 'từ gốc đã biết (sau khi tra) bị loại');
  let prog = 0; await K.enrich(raw, { lookup: () => null, onProgress: p => { prog = p; } }); ok(prog === 1, 'onProgress tới 1');
  let threw = null; try { await K.enrich(raw, { lookup: () => null, isCancelled: () => true }); } catch (e) { threw = e.code; } ok(threw === 'cancel', 'hủy giữa chừng tra từ điển');
}

// ---------- 5. Tạo thẻ ----------
{
  const C = { make: (e, x) => ({ word: e.word, vi: e.vi || '', def: e.def || '', topic: e.topic, srs: { reps: 0 }, contexts: [], ...x }) };
  const cards = K.makeCards(C, [{ word: 'mitigate', meaning: 'giảm nhẹ', entry: { word: 'mitigate', vi: 'giảm nhẹ' }, sentence: 'They mitigate harm.' }, { word: 'gloop', meaning: '', entry: null, sentence: 'A gloop appeared.' }], { deck: 'Sách hay', source: 'book.epub', now: 1000, vi: true });
  ok(cards[0].deck === 'Sách hay' && cards[0].ex === 'They mitigate harm.' && cards[0].contexts[0].title === 'book.epub' && !cards[0].nomean, 'thẻ có nghĩa: bộ riêng, câu gốc làm ví dụ + nguồn');
  ok(cards[1].nomean === 1 && cards[1].vi === '' && cards[1].topic === 'import', 'thẻ thiếu nghĩa đánh dấu nomean');
  ok(cards[0].added < cards[1].added, 'thứ tự thêm giữ nguyên');
  ok(K.deckName('Harry_Potter and the stone.v2.EPUB') === 'Harry Potter and the stone.v2' && K.deckName('') === '', 'tên bộ từ tên tệp');
}

// ---------- 6. ePub thật (zip tự dựng) ----------
{
  const xhtml = (t) => `<?xml version="1.0"?><html xmlns="http://www.w3.org/1999/xhtml"><head><title>x</title><style>p{color:red}</style></head><body><h1>Chapter</h1><p>${t}</p></body></html>`;
  const files = [
    { name: 'mimetype', data: enc.encode('application/epub+zip') },
    { name: 'META-INF/container.xml', data: enc.encode('<container><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>') },
    { name: 'OEBPS/content.opf', data: enc.encode('<package><manifest><item id="c2" href="text/ch2.xhtml" media-type="application/xhtml+xml"/><item id="c1" href="text/ch1.xhtml" media-type="application/xhtml+xml"/><item id="img" href="a.png"/></manifest><spine><itemref idref="c1"/><itemref idref="c2"/></spine></package>') },
    { name: 'OEBPS/text/ch1.xhtml', data: enc.encode(xhtml('The ephemeral glow &amp; the ambiguous haze.')) },
    { name: 'OEBPS/text/ch2.xhtml', data: enc.encode(xhtml('Skeptical readers doubted the ephemeral claim.')) },
  ];
  const bytes = await A.zipWrite(files), f = File_(bytes, 'My Book.epub'), seen = [];
  const m = K.createMiner(); const info = await K.readSource(f, m, { onProgress: p => seen.push(p) });
  const w = m.result().map(c => c.word);
  ok(info.kind === 'epub' && seen.length === 2 && seen[1] === 1, 'ePub: đọc 2 chương theo spine, báo tiến độ');
  ok(w.includes('ephemeral') && w.includes('ambiguous') && w.includes('skeptical') && !w.includes('color') , 'ePub: rút chữ từ XHTML');
  ok(!w.includes('color') && !w.includes('red'), 'ePub: bỏ <style>/<head>');
  ok(m.result().find(c => c.word === 'ephemeral').n === 2, 'ePub: đếm qua nhiều chương');
  { const big = await A.zipWrite([files[0], files[1], { name: 'OEBPS/content.opf', data: enc.encode('<package><manifest><item id="c" href="b.xhtml"/></manifest><spine><itemref idref="c"/></spine></package>') }, { name: 'OEBPS/b.xhtml', data: enc.encode(xhtml('Plain words here. '.repeat(3000) + 'Finally the quixotic ending arrives.')) }]); const mb = K.createMiner(); await K.readSource(File_(big, 'big.epub'), mb); ok(mb.result().some(c => c.word === 'quixotic'), 'ePub: chương > 20 000 ký tự không bị cắt'); }
  let t1 = null; try { await K.readSource(f, K.createMiner(), { isCancelled: () => true }); } catch (e) { t1 = e.code; } ok(t1 === 'cancel', 'ePub: hủy được');
  let t2 = null; try { await K.readSource(File_(await A.zipWrite([{ name: 'a.txt', data: enc.encode('x') }]), 'bad.epub'), K.createMiner()); } catch (e) { t2 = e.code; } ok(t2 === 'epub', 'ePub hỏng/DRM → lỗi epub');
}

// ---------- 7. PDF (bộ đọc giả): mẻ 50 trang, tối đa 200 trang, hủy được, nhường luồng ----------
{
  const pdfBytes = enc.encode('%PDF-1.4\n%fake');
  const mkLoader = (numPages, onPage) => async () => ({ getDocument: () => ({ promise: Promise.resolve({ numPages, getPage: async p => { onPage && onPage(p); return { getTextContent: async () => ({ items: [{ str: 'The ephemeral', hasEOL: false }, { str: 'glow of the nebula-', hasEOL: true }, { str: 'ing sky. ', hasEOL: true }] }), cleanup() {} }; }, destroy() { destroyed++; } }) }) });
  let destroyed = 0, pages = [], yields = 0; const orig = globalThis.setTimeout; globalThis.setTimeout = (f, ms, ...a) => { if (!ms) yields++; return orig(f, ms, ...a); };
  const m = K.createMiner(); const info = await K.readSource(File_(pdfBytes, 'paper.pdf'), m, { loader: mkLoader(260, p => pages.push(p)) });
  ok(info.kind === 'pdf' && pages.length === 200 && info.pages === 260, 'PDF 260 trang: chỉ đọc 200 đầu, báo tổng số trang');
  ok(yields >= 4, 'PDF: nhường luồng chính mỗi mẻ 50 trang (' + yields + ')');
  ok(destroyed === 1 && m.result().find(c => c.word === 'ephemeral').n === 200, 'PDF: giải phóng tài liệu, đếm đủ 200 lần');
  ok(m.result().some(c => c.word === 'nebulaing'), 'PDF: nối từ bị ngắt dòng "nebula-\\ning"');
  globalThis.setTimeout = orig;
  let pc = [], ct = null, stop = false;
  try { await K.readSource(File_(pdfBytes, 'paper.pdf'), K.createMiner(), { loader: mkLoader(500, p => { pc.push(p); if (p === 7) stop = true; }), isCancelled: () => stop }); } catch (e) { ct = e.code; }
  ok(ct === 'cancel' && pc.length === 7 && destroyed === 2, 'PDF: hủy giữa chừng, dừng ngay và vẫn destroy()');
  let ty = null; try { await K.readSource(File_(enc.encode('not a pdf'), 'fake.pdf'), K.createMiner(), { loader: mkLoader(1) }); } catch (e) { ty = e.code; } ok(ty === 'type', 'đuôi .pdf nhưng không phải PDF → lỗi type');
}

// ---------- 8. Giới hạn và loại tệp ----------
{
  let e1 = null; try { await K.readSource({ size: 21 * 1048576, name: 'big.pdf', slice: () => new Blob([enc.encode('%PDF')]) }, K.createMiner()); } catch (e) { e1 = e.code; } ok(e1 === 'toobig', 'tệp > 20 MB bị chặn');
  let e2 = null; try { await K.readSource(File_(enc.encode('MZ binary'), 'x.exe'), K.createMiner()); } catch (e) { e2 = e.code; } ok(e2 === 'type', 'loại tệp lạ bị từ chối');
  let e3 = null; try { await K.readSource('x'.repeat(4e6 + 1), K.createMiner()); } catch (e) { e3 = e.code; } ok(e3 === 'toobig', 'dán > 4 MB chữ bị chặn');
  const m = K.createMiner(); await K.readSource(File_(fs.readFileSync(new URL('sample.srt', FIX)), 'ep1.srt'), m);
  ok(m.result().map(c => c.word).includes('ambiguous'), 'tệp .srt qua readSource');
  const m2 = K.createMiner(); await K.readSource(File_(fs.readFileSync(new URL('sample.vtt', FIX)), 'ep1.vtt'), m2);
  ok(m2.result().find(c => c.word === 'skeptical').n === 1, '.vtt: dòng lặp cuộn chỉ đếm 1 lần');
}

// ---------- 9. Giao diện (jsdom) ----------
{
  const dom = new JSDOM('<!doctype html><html><head></head><body><main id="view"></main><div id="modal" hidden><div id="modalBox"></div></div><div id="toast"></div></body></html>', { url: 'https://lexkite.com/app/#/deck', runScripts: 'outside-only', pretendToBeVisual: true });
  const w = dom.window, d = w.document;
  for (const [k, v] of Object.entries({ TextEncoder, TextDecoder, Blob, File, Response, CompressionStream, DecompressionStream, crypto: globalThis.crypto })) Object.defineProperty(w, k, { value: v, configurable: true });
  w.matchMedia = () => ({ matches: false, addEventListener() {} });
  w.localStorage.setItem('vb.uiLang', 'en');
  for (const f of ['js/i18n.js', 'js/i18n/en.js', 'js/i18n/en/lazyui.js', 'js/kit.js']) w.eval(rd(f));
  const store = {}, keyOf = s => String(s || '').toLowerCase().replace(/\s+/g, ' ').trim(); let map = { abundant: { word: 'abundant', srs: {} } }, syncs = 0;
  w.Core = { keyOf, Store: { get: async (k, f) => store[k] ?? f, set: async (k, v) => { store[k] = v; } },
    Cards: { make: (e, x) => ({ word: e.word, vi: e.vi || '', def: e.def || '', topic: e.topic, srs: { reps: 0 }, contexts: [], ...x }), mutate: async fn => { map = fn({ ...map }); } } };
  w.App = { state: { cards: { abundant: { word: 'abundant' } } }, meanOf: e => e.vi || e.def || '', load: async () => { w.App.state.cards = { ...map }; }, updateChrome() {} };
  const DICT = { ephemeral: { word: 'ephemeral', vi: 'phù du', level: 'C1' }, ambiguous: { word: 'ambiguous', vi: 'mơ hồ', level: 'B2' }, skeptical: { word: 'skeptical', vi: 'hoài nghi', level: 'C1' } };
  w.Lex = { get: async x => DICT[x] ? { entry: DICT[x], key: x } : null };
  w.Sync = { schedule() { syncs++; } };
  w.eval(rd('js/ui.js')); w.AnkiKit = A;
  (0, w.eval)(rd('cpack/importdeck-app/freq-rank.js')); w.eval(rd('cpack/importdeck-app/importdeck.js'));
  const tick = (ms = 0) => new Promise(r => setTimeout(r, ms)), until = async (f, t = 3000) => { for (let i = 0; i < t / 10 && !f(); i++) await tick(10); return f(); };
  ok(typeof w.ImportDeck.open === 'function' && typeof w.App.importDeck === 'function', 'ImportDeck nạp được, gắn App.importDeck');
  await w.ImportDeck.open();
  const box = d.getElementById('modalBox'), q = s => box.querySelector(s);
  ok(box.getAttribute('aria-labelledby') === 'idTitle' && q('#idTitle') && q('.idk-step'), 'bước 1: hộp thoại có tiêu đề (aria-labelledby) + chỉ báo bước');
  ok(/\.pdf/.test(q('#idFile').accept) && q('#idText') && q('#idDrop'), 'bước 1: chọn tệp (có pdf) + dán chữ');
  ok(!/[ăđơư]|Nhập|tệp/.test(box.textContent), 'bước 1: giao diện tiếng Anh, không lẫn tiếng Việt');
  q('#idText').value = 'short'; q('#idGo').click(); await tick();
  ok(q('.idk-err'), 'dán quá ngắn → báo lỗi');
  const text = 'The ephemeral glow faded fast. An ambiguous haze remained, and the skeptical crew stayed quiet. Ephemeral joy is rare. ' + Array.from({ length: 40 }, (_, i) => `Then quux${uw(i)} appeared.`).join(' ');
  q('#idText').value = text; q('#idGo').click();
  ok(await until(() => q('.idk-list')), 'bước 2: danh sách từ hiện ra');
  const rows = [...box.querySelectorAll('.idk-row input')];
  ok(rows.length >= 3 && rows.every(i => i.closest('.idk-row').offsetHeight !== undefined), 'bước 2: có từ ứng viên');
  const first = rows[0].dataset.w; ok(first === 'ephemeral', 'bước 2: từ lặp + hiếm đứng đầu: ' + first);
  ok(rows.filter(i => i.checked).length === Math.min(30, rows.length) && /selected/.test(q('#idCount').textContent), 'bước 2: chọn sẵn tối đa 30 + đếm');
  ok(!rows.some(i => ['the', 'and', 'abundant'].includes(i.dataset.w)), 'bước 2: không có từ phổ biến/đã có');
  q('#idNone').click(); ok(q('#idNext').disabled, 'bỏ chọn hết → Tiếp tục bị khóa');
  q('#idTop').click(); ok(!q('#idNext').disabled, 'chọn lại 30 từ đầu');
  const ck = q('.idk-row input[data-w=skeptical]'); ck.click(); await tick();
  ok(!q('.idk-row input[data-w=skeptical]').checked, 'bỏ chọn một từ');
  q('.idk-row input[data-w=skeptical]').click(); await tick();
  q('#idNext').click(); await tick();
  ok(/Word meanings/.test(q('#idTitle').textContent) && /mơ hồ/.test(box.textContent) && /phù du/.test(box.textContent), 'bước 3: nghĩa từ từ điển có sẵn');
  ok(box.querySelectorAll('.idk-no').length >= 1 && /have no meaning/.test(box.textContent), 'bước 3: từ thiếu nghĩa đánh dấu "no meaning yet"');
  q('#idNext').click(); await tick();
  ok(q('#idDeck').value === 'Imported deck' && q('.idk-card') && box.querySelectorAll('.idk-card').length <= 5, 'bước 4: tên bộ mặc định + xem trước ≤ 5 thẻ');
  q('#idDeck').value = 'Chapter one'; q('#idDeck').dispatchEvent(new w.Event('input'));
  const want = Object.keys(map).length; q('#idSave').click();
  ok(await until(() => q('#idUndo')), 'lưu xong: nút Hoàn tác');
  const added = Object.values(map).filter(c => c.deck === 'Chapter one');
  ok(added.length >= 3 && added.every(c => c.topic === 'import' && c.contexts[0].title === 'Pasted text') && Object.keys(map).length > want, 'thẻ đã vào sổ với tên bộ vừa đặt');
  ok(added.find(c => c.word === 'ephemeral').vi === 'phù du' && added.some(c => c.nomean === 1), 'thẻ có nghĩa từ từ điển; thẻ thiếu nghĩa đánh dấu nomean');
  ok(/Created the deck/.test(q('#idTitle').textContent) && syncs === 0, 'chưa đồng bộ trong 10 s hoàn tác');
  q('#idUndo').click(); await until(() => !Object.values(map).some(c => c.deck === 'Chapter one'));
  ok(!Object.values(map).some(c => c.deck === 'Chapter one') && map.abundant, 'Hoàn tác: bỏ đúng thẻ vừa tạo, giữ thẻ cũ');
  ok(syncs === 0, 'Hoàn tác: không đẩy lên đồng bộ');
  w.eval('1'); // đóng hộp thoại, không rò hẹn giờ
  d.getElementById('modal').hidden = true;
  // Cờ TẮT: hộp Anki không hiện nút nhập tài liệu; BẬT: có
  const ankiSrc = rd('js/anki.js'); ok(/impOn\(\) \?/.test(ankiSrc) && /lk\.impdeck/.test(ankiSrc) && /v\.importdeck/.test(ankiSrc), 'anki.js: nút chỉ hiện khi cờ importdeck bật (mặc định TẮT)');
}

// ---------- 10. Cờ, bó tải, add-on ----------
{
  const app = rd('js/app.js'), cfg = fs.readFileSync(new URL('../../functions/api/config.js', import.meta.url), 'utf8'), adm = fs.readFileSync(new URL('../../functions/api/admin.js', import.meta.url), 'utf8');
  ok(/impdeck: \['cpack\/importdeck-app\/freq-rank\.js', 'cpack\/importdeck-app\/importdeck\.js'\]/.test(app), 'app.js: gói lười impdeck (khung app chỉ +1 dòng)');
  ok(/'importdeck'/.test(cfg) && /'importdeck'/.test(adm), 'importdeck có trong PUBLIC_KEYS + CONFIG_KEYS (mặc định tắt)');
  const src = rd('cpack/importdeck-app/importdeck.js');
  ok(!/fetch\([^)]*(post|POST)|sendBeacon|XMLHttpRequest/.test(src) && !/method:\s*['"]POST/.test(src), 'không gửi nội dung người dùng đi đâu (không POST/beacon)');
  ok(/integrity/.test(src) && /pdfjs-dist@3\.11\.174/.test(src), 'pdf.js ghim phiên bản + SRI');
}

console.log(fails ? `✗ ${fails}/${n} lỗi` : `✓ ${n} kiểm tra – importdeck`);
process.exit(fails ? 1 : 0);
