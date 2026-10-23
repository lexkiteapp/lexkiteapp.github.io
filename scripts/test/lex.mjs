// Kho từ một nguồn (web/js/lex.js + scripts/lexicon/shards.mjs): mảnh = INDEX của trình duyệt, chuẩn hóa, tách gốc, cụm động từ,
// nghĩa theo ngôn ngữ + dự phòng, phiên bản/hết hạn bộ đệm, gõ nhanh (1 lần tải/mảnh), âm thanh, IPA Anh/Mỹ cùng nguồn.
// Chạy: node scripts/test/lex.mjs   (npm test, mergecheck)
import fs from 'fs';
import os from 'os';
import path from 'path';
import vm from 'vm';
import { createRequire } from 'module';
import { writeShards, loadBrowserIndex } from '../lexicon/shards.mjs';

const ROOT = new URL('../../', import.meta.url).pathname, require = createRequire(import.meta.url);
let fail = 0, pass = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.error('✗ ' + m); } };
const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b), `${m}: ${JSON.stringify(a)?.slice(0, 160)} ≠ ${JSON.stringify(b)?.slice(0, 160)}`);

const OUT = fs.mkdtempSync(path.join(os.tmpdir(), 'lex-'));
const { stats, idx } = writeShards(OUT);
const { INDEX } = loadBrowserIndex();
ok(stats.coreBrMax <= 4096, `mảnh lõi ≤ 4 KB br (max ${stats.coreBrMax})`);
ok(stats.langBrMax + stats.coreBrMax <= 6144 && stats.coreBrMedian + stats.langBrMedian <= 5120, `1 lần tra lạnh (lõi + nghĩa) ≤ 5 KB br trung vị (${stats.coreBrMedian}+${stats.langBrMedian})`);
ok(stats.indexBr <= 3072, `mục lục ≤ 3 KB br (${stats.indexBr})`);
ok(stats.collisions === 0, `không trùng khóa sau chuẩn hóa (${stats.collisions})`);

// fetch giả: đọc tệp đã sinh, đếm lượt tải
let served = OUT, nets = [];
const fakeFetch = async u => { nets.push(u); const p = path.join(served, u.replace(/^https?:\/\/[^/]+/, '')); await new Promise(r => setTimeout(r, 2)); return fs.existsSync(p) ? { ok: true, status: 200, text: async () => fs.readFileSync(p, 'utf8'), json: async () => JSON.parse(fs.readFileSync(p, 'utf8')) } : { ok: false, status: 404 }; };
globalThis.LEX_BASE = '';
const Lex = require(path.join(ROOT, 'web/js/lex.js'));
Lex._setFetch(fakeFetch);

// 1) Mọi mục: mảnh = INDEX (cùng dữ liệu với mọi giao diện đang đọc IELTS_DATA.INDEX)
let diff = 0, n = 0;
for (const k of Object.keys(INDEX)) { const r = await Lex.get(k); n++; if (!r || JSON.stringify(r.entry) !== JSON.stringify(INDEX[k])) { if (diff++ < 3) console.error('  lệch:', k, r && r.via); } }
ok(diff === 0, `mảnh khớp INDEX cho ${n} từ (lệch ${diff})`);

// 2) Chuẩn hóa Unicode / hoa thường / dấu / ngoặc
const has = w => !!INDEX[w];
eq((await Lex.get('Sustainable'))?.key, 'sustainable', 'hoa thường');
eq((await Lex.get('  sustainable.  '))?.key, 'sustainable', 'dấu câu & khoảng trắng ở mép');
eq((await Lex.get('“sustainable”'))?.key, 'sustainable', 'ngoặc kép cong');
if (has('café')) {
  eq((await Lex.get('café'))?.key, 'café', 'NFD → NFC');
  eq((await Lex.get('CAFE'))?.entry.word, INDEX['café'].word, 'không dấu → có dấu (cafe → café)');
}
if (has('résumé') && has('resume')) { eq((await Lex.get('resume'))?.entry.word, INDEX.resume.word, 'resume ≠ résumé'); eq((await Lex.get('Résumé'))?.entry.word, INDEX['résumé'].word, 'résumé giữ dấu'); }
const curly = Object.keys(INDEX).find(k => k.includes("'"));
if (curly) eq((await Lex.get(curly.replace("'", '’')))?.key, curly, 'nháy cong ’ = nháy thẳng');
if (has('well-being')) eq((await Lex.get('well–being'))?.key, 'well-being', 'gạch nối en-dash');
eq(await Lex.get(''), null, 'rỗng');
eq(await Lex.get('constructor'), INDEX.constructor ? (await Lex.get('constructor')) : null, 'không nhầm thuộc tính prototype');
eq(await Lex.get('qwzxqwzx'), null, 'từ không có');

// 3) Biến tố & bất quy tắc & cụm động từ
const lemma = async (w, want) => { if (!has(want)) return; const r = await Lex.get(w); eq(r && r.entry.word.toLowerCase(), want, `${w} → ${want}`); };
await lemma('went', 'go'); await lemma('gone', 'go'); await lemma('children', 'child'); await lemma('studies', 'study'); await lemma('stopped', 'stop');
await lemma('making', 'make'); await lemma('running', 'run'); await lemma('analyses', 'analysis'); await lemma('bigger', 'big'); await lemma('happier', 'happy');
await lemma('mitigated', 'mitigate'); await lemma('implementing', 'implement'); await lemma('policies', 'policy');
const phr = Object.keys(INDEX).filter(k => /^[a-z]+ (up|out|off|on|down|back|over)$/.test(k) && INDEX[k.split(' ')[0]]);
const pv = phr.find(k => k.startsWith('look ')) || phr[0];
if (pv) { const [v, p] = pv.split(' '); await lemma(v + 'ed ' + p, pv); await lemma(v + 'ing it ' + p, pv); }
if (has('give up')) { await lemma('gave up', 'give up'); await lemma('gave it up', 'give up'); }
if (has('give up')) { const ps = await Lex.phrases('gave'); ok(ps && ps.some(p => p.word.toLowerCase() === 'give up' && p.vi === INDEX['give up'].vi), 'Lex.phrases("gave") có "give up" (đúng nghĩa kho)'); }
const went = await Lex.get('went'); ok(!went || went.via === 'irregular' && went.from === 'went', 'went: via=irregular, from=went');

// 4) Nghĩa theo ngôn ngữ + dự phòng + RTL dữ liệu
const ar = await Lex.get('sustainable', { lang: 'ar' });
ok(ar && ar.mean && /[؀-ۿ]/.test(ar.mean[0]), 'nghĩa tiếng Ả Rập có chữ Ả Rập (mảnh ar)');
const es = await Lex.get('sustainable', { lang: 'es' }); const P = JSON.parse(fs.readFileSync(path.join(ROOT, 'web/packs/es.json'), 'utf8'));
eq(es && es.mean, P['sustainable#adj'] || P.sustainable, 'nghĩa es = gói es (đúng từ loại)');
const pk = Object.keys(P).find(k => k.includes('#') && INDEX[k.split('#')[0]]);
if (pk) { const [w] = pk.split('#'); const r = await Lex.get(w, { lang: 'es' }); const gp = s => (/^(n|noun)\b/.test(s) ? 'n' : /^(phr ?v|phrasal)/.test(s) ? 'phrv' : /^(v|verb)\b/.test(s) ? 'v' : /^adj/.test(s) ? 'adj' : /^adv/.test(s) ? 'adv' : s); eq(r.mean, P[w + '#' + gp(String(INDEX[w].pos).toLowerCase())] || P[w], `từ nhiều từ loại (${w}) lấy nghĩa đúng từ loại`); }
eq((await Lex.get('sustainable', { lang: 'xx' })).mean, null, 'ngôn ngữ không có gói → mean null (giao diện dùng định nghĩa Anh)');
eq((await Lex.get('sustainable', { lang: 'vi' })).mean, null, 'vi → nghĩa vi trong mục, không dùng gói');

// 5) Gõ nhanh: nhiều lần hỏi cùng lúc → mỗi mảnh tải 1 lần; gợi ý theo tiền tố đúng & ổn định
Lex._reset(); nets = [];
const qs = ['s', 'su', 'sus', 'sust', 'susta', 'sustai', 'sustain', 'sustaina', 'sustainab', 'sustainabl', 'sustainable'];
const res = await Promise.all(qs.map(q => Lex.suggest(q, 6)));
const dup = nets.filter((u, i) => nets.indexOf(u) !== i);
ok(!dup.length, `gõ nhanh: không tải trùng (${dup.length} trùng / ${nets.length})`);
ok(res.at(-1).some(x => x.key === 'sustainable'), 'gợi ý "sustainable" có mục sustainable');
ok(res.every((r, i) => r.every(x => x.key.startsWith(qs[i]))), 'gợi ý luôn đúng tiền tố đang gõ');
const one = Object.keys(INDEX).filter(k => k.startsWith('co')).sort().slice(0, 6); eq((await Lex.suggest('co', 6)).map(x => x.key), one, 'gợi ý "co" = 6 khóa đầu theo thứ tự');

// 6) Phiên bản: kho đổi → mục lục mới → dữ liệu mới (không trả bản cũ), mảnh cũ không còn trong mục lục
const OUT2 = fs.mkdtempSync(path.join(os.tmpdir(), 'lex2-'));
fs.cpSync(OUT, OUT2, { recursive: true });
const i2 = JSON.parse(fs.readFileSync(path.join(OUT2, 'data/lex-index.json'), 'utf8'));
const si = i2.c.findIndex((x, i) => x[0] <= 'sustainable' && (!i2.c[i + 1] || i2.c[i + 1][0] > 'sustainable'));
const shP = path.join(OUT2, 'data/lex/c', i2.c[si][1] + '.json'), sh = JSON.parse(fs.readFileSync(shP, 'utf8'));
sh.e.sustainable = { ...sh.e.sustainable, vi: 'BẢN MỚI' }; i2.c[si][1] = 'ffffff'; i2.v = 'v2test';
fs.writeFileSync(path.join(OUT2, 'data/lex/c/ffffff.json'), JSON.stringify(sh)); fs.writeFileSync(path.join(OUT2, 'data/lex-index.json'), JSON.stringify(i2));
Lex._reset(); served = OUT; eq((await Lex.get('sustainable')).entry.vi, INDEX.sustainable.vi, 'trước khi đổi kho');
served = OUT2; await Lex.refresh();
eq(Lex.version(), 'v2test', 'mục lục mới được nhận'); eq((await Lex.get('sustainable')).entry.vi, 'BẢN MỚI', 'đổi kho → không trả dữ liệu cũ đã nhớ');

// 7) Dự phòng không có mảnh (web/ chạy thẳng, offline lần đầu): dùng IELTS_DATA.INDEX, cùng chuẩn hóa + tách gốc
Lex._reset(); Lex._setFetch(async () => { throw new Error('offline'); });
globalThis.IELTS_DATA = { INDEX }; globalThis.LK_VERBS = loadBrowserIndex().VERBS;
eq((await Lex.get('Sustainable')).entry, INDEX.sustainable, 'offline: INDEX dự phòng');
if (has('go')) eq((await Lex.get('went')).entry.word, 'go', 'offline: went → go');
if (has('café')) eq((await Lex.get('cafe')).entry.word, INDEX['café'].word, 'offline: cafe → café');
eq(Lex.version(), 'local', 'offline: version=local');
// mảnh lỗi giữa chừng (có mục lục, mất mạng) → vẫn trả từ INDEX
Lex._reset(); served = OUT; Lex._setFetch(fakeFetch); await Lex.ready(); Lex._setFetch(async u => (u.includes('lex-index') ? fakeFetch(u) : { ok: false, status: 503 }));
eq((await Lex.get('mitigate')).entry, INDEX.mitigate, 'mảnh lỗi 503 → dự phòng INDEX');
delete globalThis.IELTS_DATA; delete globalThis.LK_VERBS;

// 8) Âm thanh: cờ au chỉ cho từ có file Kokoro (web/audio/w/index.txt) → không gọi file 404 cho từ khác
Lex._reset(); Lex._setFetch(fakeFetch);
const AU = fs.readFileSync(path.join(ROOT, 'web/audio/w/index.txt'), 'utf8').split('\n').filter(Boolean);
eq((await Lex.get(AU[0])).au, true, `au: "${AU[0]}" có file`);
const noAu = Object.keys(INDEX).find(k => !AU.includes(k) && /^[a-z]+$/.test(k)); eq((await Lex.get(noAu)).au, false, `au: "${noAu}" không có file`);
const ui = fs.readFileSync(path.join(ROOT, 'web/js/ui.js'), 'utf8');
ok(/Lex\.peekAu/.test(ui), 'UI.speak hỏi cờ âm thanh Lex trước khi tải file từ (không 404 rồi mới đổi giọng máy)');

// 9) Dict (web/js/dictionary.js): từ trong kho hiện ngay không chờ mạng; IPA Mỹ theo kho (không ghép UK kho + US Wiktionary); went → go
{
  Lex._reset(); Lex._setFetch(fakeFetch);
  const net = [];
  const ctx = { console, setTimeout, clearTimeout, AbortController, TextEncoder, URL, Lex, fetch: async u => { net.push(u); return { ok: true, json: async () => (/wiktionary/.test(u) ? {} : /dictionaryapi/.test(u) ? [{ phonetics: [{ text: '/WRONG-US/', audio: 'x-us.mp3' }], meanings: [] }] : {}) }; } };
  ctx.self = ctx; vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'web/js/dictionary.js'), 'utf8'), ctx);
  const D = ctx.Dict, w = Object.keys(INDEX).find(k => INDEX[k].ipaUS && INDEX[k].def && /^[a-z]{6,}$/.test(k));
  const t0 = Date.now(), q = await D.quick(w);
  ok(q && q.vi === INDEX[w].vi && !net.length, `quick("${w}") từ kho: không gọi mạng (${net.length} lượt)`);
  ok(Date.now() - t0 < 200, 'quick từ kho < 200 ms trong Node');
  eq(q.ipaUS, INDEX[w].ipaUS, 'quick: IPA Mỹ = kho');
  const f = await D.lookup(w, { image: false, examples: false });
  eq([f.ipa, f.ipaUS], [INDEX[w].ipa, INDEX[w].ipaUS], 'lookup: IPA Anh/Mỹ cùng nguồn kho (bỏ US của nguồn ngoài)');
  const same = Object.keys(INDEX).find(k => INDEX[k].ipa && !INDEX[k].ipaUS && /^[a-z]{5,}$/.test(k));
  eq((await D.lookup(same, { image: false, examples: false })).ipaUS, '', `lookup: kho để trống US (= UK) → không lấy US lạ (${same})`);
  if (has('go')) { const g2 = await D.quick('went'); eq([g2.word, g2.from], ['go', 'went'], 'Dict.quick("went") → mục "go", from="went"'); }
}

// 10) Cổng nhất quán: build-lexicon (dict-consistency) gọi shards; add-on & các giao diện nạp Lex
const bg = fs.readFileSync(path.join(ROOT, 'extension/background.js'), 'utf8');
ok(/importScripts\([^)]*lex\.js/.test(bg), 'add-on service worker nạp lex.js (cùng kho với web)');
ok(fs.readFileSync(path.join(ROOT, 'scripts/build-web.sh'), 'utf8').includes('shards.mjs --out dist'), 'build-web sinh mảnh vào dist');

fs.rmSync(OUT, { recursive: true, force: true }); fs.rmSync(OUT2, { recursive: true, force: true });
console.log(`${fail ? '✗' : '✓'} lex: ${pass} đạt, ${fail} lỗi · ${stats.words} từ · ${stats.coreShards} mảnh lõi (br trung vị ${stats.coreBrMedian} B, max ${stats.coreBrMax} B) · mục lục ${stats.indexBr} B br`);
process.exit(fail ? 1 : 0);
