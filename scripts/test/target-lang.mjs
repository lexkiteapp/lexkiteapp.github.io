// 🌍 Ngôn ngữ đích (docs/specs/target-language.md) – chạy MÃ THẬT web/js/target.js + core.js + audio.js:
// cờ bật/tắt · bảng giọng/lang ('en' = y hệt cũ) · không gian khóa thẻ (cùng chữ en/pt không đè) · hàng ôn/Sổ từ lọc theo tl · bộ từ mẫu đúng schema + bản sao app khớp.
// Chạy: node scripts/test/target-lang.mjs
import fs from 'node:fs';
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';
import { validate, readJSON, seedPath, imgKeys, MEAN_LANGS } from '../target/lib.mjs';

let n = 0, fails = 0; const ok = (c, m) => { n++; if (!c) { fails++; console.log('✗', m); } };
const rd = f => fs.readFileSync(f, 'utf8');

// ---------- môi trường: localStorage + chrome.storage giả ----------
function env() {
  const ls = new Map(), mem = {};
  const sb = {
    localStorage: { getItem: k => (ls.has(k) ? ls.get(k) : null), setItem: (k, v) => ls.set(k, String(v)), removeItem: k => ls.delete(k) },
    chrome: { storage: { local: { get: async k => (typeof k === 'string' ? (k in mem ? { [k]: structuredClone(mem[k]) } : {}) : structuredClone(mem)), set: async o => { Object.assign(mem, structuredClone(o)); }, remove: async k => { delete mem[k]; } }, onChanged: { addListener() {} } } },
    console, setTimeout, clearTimeout, structuredClone, events: [],
  };
  sb.dispatchEvent = e => sb.events.push(e.detail); sb.CustomEvent = class { constructor(t, o) { this.type = t; this.detail = o && o.detail; } };
  sb.self = sb; sb.globalThis = sb; vm.createContext(sb);
  return { sb, ls, mem };
}
const load = (sb, f) => vm.runInContext(rd(f), sb, { filename: f });

// ---------- 1) cờ + ngôn ngữ hiện tại ----------
{
  const { sb, ls } = env(); load(sb, 'web/js/target.js'); const T = sb.Target;
  ok(T.cur() === 'en' && !T.enabled(), 'mặc định: en, cờ tắt');
  T.set('pt'); ok(T.cur() === 'en', 'cờ tắt: chọn pt vẫn ra en (thẻ pt ẩn)');
  ls.set('lk.pt', '1'); ok(T.enabled() && T.cur() === 'pt', 'lk.pt=1 → bật, cur = pt');
  ls.delete('lk.pt'); ls.set('lk.cfg', JSON.stringify({ v: { pt_pilot: '1' } })); ok(T.enabled() && T.cur() === 'pt', 'cờ máy chủ pt_pilot=1 → bật');
  ls.set('lk.cfg', JSON.stringify({ v: { pt_pilot: '0' } })); ok(!T.enabled() && T.cur() === 'en', 'cờ máy chủ 0 → tắt');
  ls.set('lk.pt', '1'); T.set('xx'); ok(T.cur() === 'en' && !ls.has('lk.tl'), 'ngôn ngữ lạ → en, xoá khóa');
  T.set('pt'); ok(sb.events.at(-1) === 'pt', 'đổi ngôn ngữ → sự kiện lk:tl');
  ok(/'pt_pilot'/.test(rd('functions/api/config.js')) && /'pt_pilot'/.test(rd('functions/api/admin.js')), 'pt_pilot có trong PUBLIC_KEYS + CONFIG_KEYS');
}

// ---------- 2) bảng giọng/lang: 'en' tái tạo đúng hành vi cũ ----------
{
  const { sb } = env(); load(sb, 'web/js/target.js'); const T = sb.Target;
  ok(T.kokoroVoice('en-US') === 'af_heart' && T.kokoroVoice('en-GB') === 'bf_emma' && T.kokoroVoice(undefined) === 'bf_emma' && T.kokoroVoice('en-AU') === 'bf_emma', 'Kokoro en như cũ (US af_heart, còn lại bf_emma)');
  ok(T.wordVoice('en-US') === 'af_heart' && T.wordVoice('en-GB') === 'bf_emma', 'file từ en như cũ');
  ok(T.accent('en-US') === 'en-US' && T.accent('en-GB') === 'en-GB', 'accent en = Cài đặt');
  ok(T.prefixFor('en-GB') === 'en' && T.prefixFor('fr-FR') === 'en' && T.prefixFor('') === 'en', 'lọc giọng: accent tiếng Anh/lạ → en như cũ');
  ok(T.recLang('en', 'en-US') === 'en-US' && T.recLang('en', undefined) === 'en-GB', 'nhận giọng en như cũ');
  ok(T.speechLang('pt') === 'pt-BR' && T.recLang('pt', 'en-GB') === 'pt-BR' && T.prefixFor('pt-BR') === 'pt' && T.kokoroVoice('pt-BR') === 'pf_dora', 'pt: pt-BR + pf_dora');
  ok(T.wordVoice('pt-BR') === '' && !T.isEn('pt-BR') && T.isEn('en-GB') && T.isEn(''), 'pt chưa có file từ → giọng máy; isEn');
  ok(T.teacherVoice('ama', 'pt') === 'pf_dora' && T.teacherVoice('carlos', 'pt') === 'pm_alex' && T.teacherVoice('ama', 'en') === '', 'giáo viên: Ama nữ pf_dora, Carlos nam pm_alex; en = Chars như cũ');
  // audio.js: giọng máy lọc theo tiền tố của bảng
  const A = env(); load(A.sb, 'web/js/target.js'); A.sb.module = { exports: {} }; load(A.sb, 'web/js/audio.js'); const LA = A.sb.module.exports && A.sb.module.exports.rank ? A.sb.module.exports : A.sb.LKAudio;
  const V = (name, lang) => ({ name, lang, localService: true });
  const voices = [V('Daniel', 'en-GB'), V('Samantha', 'en-US'), V('Luciana', 'pt-BR'), V('Joana', 'pt-PT'), V('Amélie', 'fr-CA')];
  const en = LA.rank(voices, 'en-GB').map(v => v.name), pt = LA.rank(voices, 'pt-BR').map(v => v.name);
  ok(en[0] === 'Daniel' && en.length === 2, 'audio: en-GB chỉ giọng en (như cũ): ' + en);
  ok(pt[0] === 'Luciana' && pt.includes('Joana') && !pt.includes('Daniel'), 'audio: pt-BR chỉ giọng pt, pt-BR trước: ' + pt);
}

// ---------- 3) thẻ: không gian khóa, lọc theo tl, tiếng Anh không đổi ----------
{
  const { sb, ls, mem } = env(); load(sb, 'web/js/target.js'); load(sb, 'web/js/core.js'); const { Core, Target: T } = sb;
  const C = Core.Cards;
  ok(Object.keys(C.make({ word: 'come' })).join() === 'word,ipa,ipaUS,pos,vi,def,ex,col,syn,level,topic,emoji,image,imageCredit,audio,sentences,contexts,note,added,srs', 'thẻ en: đúng trường cũ, không có tl');
  await C.add({ word: 'Come', pos: 'v', vi: 'đến' });
  await C.add({ word: 'come', pos: 'v', vi: 'ăn', tl: 'pt' });
  const all = await C.all();
  ok(Object.keys(all).sort().join() === 'come,pt:come', 'cùng chữ en/pt → 2 khóa: come + pt:come');
  ok(all.come.vi === 'đến' && !('tl' in all.come) && all['pt:come'].vi === 'ăn' && all['pt:come'].tl === 'pt', 'không đè nhau; thẻ en không có tl');
  ok(C.view(all, 'en') !== all && Object.keys(C.view(all, 'en')).join() === 'come' && C.view(all, 'en').come.vi === 'đến', 'Sổ từ en: chỉ thẻ en');
  ok(Object.keys(C.view(all, 'pt')).join() === 'come' && C.view(all, 'pt').come.tl === 'pt', 'Sổ từ pt: chỉ thẻ pt, khóa = từ');
  const enOnly = { a: { word: 'a', srs: {} } }; ok(C.view(enOnly, 'en') === enOnly, 'kho chỉ có thẻ en → view trả chính map (y hệt cũ)');
  ok(Core.keyOf('Café  Da') === 'café da' && Core.tlKey('Água', 'pt') === 'pt:água' && Core.tlKey('x', 'en') === 'x', 'tlKey');
  // hàng ôn: thẻ đến hạn của 2 ngôn ngữ → mỗi view chỉ thấy của mình
  mem.cards['come'].srs = { ...mem.cards['come'].srs, reps: 1, last: 1, due: 2 };
  mem.cards['pt:come'].srs = { ...mem.cards['pt:come'].srs, reps: 1, last: 1, due: 2 };
  await C.add({ word: 'casa', tl: 'pt', vi: 'nhà' });
  const m2 = await C.all();
  ok(C.dueList(C.view(m2, 'pt')).length === 1 && C.dueList(C.view(m2, 'pt'))[0].tl === 'pt' && C.dueList(C.view(m2, 'en')).length === 1 && !C.dueList(C.view(m2, 'en'))[0].tl, 'hàng ôn lọc theo tl');
  ok(C.dueCount(C.view(m2, 'pt'), Core.DEFAULT_SETTINGS).newCount === 1 && C.dueCount(C.view(m2, 'en'), Core.DEFAULT_SETTINGS).newCount === 0, 'thẻ mới lọc theo tl');
  // mine() theo ngôn ngữ đích hiện tại; patch/remove mặc định = ngôn ngữ đích hiện tại
  ok(Object.keys(await C.mine()).join() === 'come' && !(await C.mine()).come.tl, 'cờ tắt → mine() = thẻ en');
  ls.set('lk.pt', '1'); T.set('pt');
  ok(Object.keys(await C.mine()).sort().join() === 'casa,come' && (await C.mine()).come.tl === 'pt', 'pt → mine() = thẻ pt');
  await C.patch('come', c => { c.note = 'pt-note'; });
  ok((await C.all())['pt:come'].note === 'pt-note' && !(await C.all()).come.note, 'patch theo ngôn ngữ đích không đụng thẻ en');
  await C.patch('come', c => { c.note = 'en-note'; }, 'en'); ok((await C.all()).come.note === 'en-note', 'patch tl tường minh');
  await C.remove('come');
  const m3 = await C.all(), del = mem.deleted || {};
  ok(!m3['pt:come'] && m3.come && 'pt:come' in del && !('come' in del), 'xoá thẻ pt: giữ thẻ en, dấu xoá đúng khóa');
  const c = m3['pt:casa']; c.vi = 'ngôi nhà'; await C.update(c); ok((await C.all())['pt:casa'].vi === 'ngôi nhà' && !(await C.all()).casa, 'update theo khóa thẻ');
  // normalize không gộp pt:x vào x
  await C.save({ 'pt:sim': { word: 'sim', tl: 'pt' }, sim: { word: 'sim' } }); ok(Object.keys(await C.all()).sort().join() === 'pt:sim,sim', 'normalize giữ 2 khóa');
}

// ---------- 4) bộ từ mẫu pt ----------
{
  const deck = readJSON(seedPath('pt')), err = validate(deck, { img: imgKeys() });
  ok(!err.length, 'seed pt đúng schema + cổng: ' + err.slice(0, 5).join(' | '));
  ok(deck.words.length === 30, 'seed pt = 30 từ');
  ok(MEAN_LANGS.length === 15 && deck.words.every(w => MEAN_LANGS.every(L => w.gl[L])), 'đủ nghĩa 15 ngôn ngữ');
  ok(deck.words.every(w => w.pos !== 'n' || w.gender), 'danh từ có giống');
  // cổng phải BẮT lỗi (không phải cổng luôn xanh)
  const bad = structuredClone(deck); bad.words[0].gl.fr = 'nhà'; bad.words[1].img = 'nonexistent#n'; delete bad.words[2].gender; bad.words[3].ex.pt = 'Sem a palavra.'; bad.words[4].ipa = '/x/';
  const e2 = validate(bad, { img: imgKeys() });
  ok(e2.length >= 5, 'cổng bắt đủ 5 lỗi cài sẵn: ' + e2.length);
  const sch = readJSON('content/target/pt/schema.json'); ok(sch.properties.words.items.required.join() === 'word,pos,ipa,gl,ex', 'schema.json khớp');
  try { execFileSync(process.execPath, ['scripts/target/build.mjs', 'pt', '--check'], { stdio: 'pipe' }); ok(true); } catch (e) { ok(false, 'web/js/target-pt-seed.json lệch seed.json: ' + String(e.stdout || e.stderr)); }
}

// ---------- 5) nối dây: shell nạp target.js trước core.js; package test ----------
{
  const html = rd('web/app/index.html'), a = html.indexOf('js/target.js'), b = html.indexOf('js/core.js');
  ok(a > 0 && a < b, 'index.html nạp target.js trước core.js');
  ok(/'\/js\/target\.js'/.test(rd('web/sw.js')), 'sw.js cache target.js');
}

// ---------- 6) lát 2: ?pt=1, chỉ mục file giọng pt theo giáo viên, Thư viện/câu nhiễu pt (TLib), nghĩa theo ngôn ngữ giao diện ----------
const fnv36 = s => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(36); };
{
  const { sb, ls } = env(); sb.location = { search: '?x=1&pt=1' }; load(sb, 'web/js/target.js');
  ok(ls.get('lk.pt') === '1' && sb.Target.cur() === 'pt', '?pt=1 → bật thử + ngôn ngữ đích pt');
  const e2 = env(); e2.ls.set('lk.pt', '1'); e2.ls.set('lk.tl', 'pt'); e2.sb.location = { search: '?pt=0' }; load(e2.sb, 'web/js/target.js');
  ok(!e2.ls.has('lk.pt') && e2.sb.Target.cur() === 'en', '?pt=0 → tắt, về en');
  const e3 = env(); let calls = 0; e3.sb.fetch = async () => { calls++; return { ok: true, json: async () => ({}) }; }; load(e3.sb, 'web/js/target.js');
  ok(calls === 0, 'cờ tắt → không tải chỉ mục giọng pt');
}
{
  const { sb, ls } = env(); ls.set('lk.pt', '1'); ls.set('lk.tl', 'pt'); const asked = [];
  sb.fetch = async u => { asked.push(u); return { ok: true, json: async () => ({ pf_dora: ['casa', 'Minha casa é pequena.'], pm_alex: ['casa'] }) }; };
  load(sb, 'web/js/target.js'); const T = sb.Target; await new Promise(r => setTimeout(r, 0)); await new Promise(r => setTimeout(r, 0));
  ok(asked.join() === 'js/target-pt-audio.json', 'pt bật → tải đúng chỉ mục js/target-pt-audio.json');
  ok(T.fileKey('pf_dora', 'casa') === fnv36('pf_dora|casa|s3'), 'fileKey = fnv(giọng|chữ|s3) như audio/w tiếng Anh');
  ok(T.fileKey('pf_dora', ' Minha casa é pequena. '.normalize('NFD')) === fnv36('pf_dora|Minha casa é pequena.|s3'), 'fileKey chuẩn hoá NFC + cắt khoảng trắng');
  ok(T.fileKey('pm_alex', 'Minha casa é pequena.') === '' && T.fileKey('pf_dora', 'livro') === '', 'chữ chưa có file đạt → rỗng (giọng máy)');
  ok(T.voiceFor('ama') === 'pf_dora' && T.voiceFor('carlos') === 'pm_alex' && T.voiceFor('am_michael') === 'pm_alex' && T.voiceFor('af_heart') === 'pf_dora' && T.voiceFor('bm_george') === 'pm_alex' && T.voiceFor('') === 'pf_dora', 'giọng giáo viên: Ama nữ pf_dora, Carlos/giọng nam pm_alex');
  const ui = rd('web/js/ui.js');
  ok(/if \(!opts\.noTl && tlFile\(/.test(ui) && (ui.match(/noTl: true/g) || []).length >= 2, 'ui.js: tts/speak thử file pt trước, đường dự phòng noTl (không lặp vô hạn)');
}
{
  const { sb } = env(); const seed = readJSON('web/js/target-pt-seed.json');
  const core = { v: 1, tl: 'pt', words: [{ ...seed.words[0] }, { ...seed.words[1], word: 'zzteste', rank: 9 }, ...Array.from({ length: 31 }, (_, i) => ({ ...seed.words[2], word: 'palavra' + String.fromCharCode(97 + (i % 26)) + i, rank: 100 - i }))] };
  sb.fetch = async u => ({ ok: true, json: async () => structuredClone(/seed/.test(u) ? seed : core) });
  sb.App = { meanOf: x => x.gl.vi, need: async () => {} }; sb.t = (k, o) => k.replace('{n}', o && o.n);
  load(sb, 'web/js/target-lib.js'); const L = sb.TLib;
  const ws = await L.words('pt');
  ok(ws.length === seed.words.length + 32, 'TLib.words: seed + core, trùng từ#loại giữ bản seed');
  const ds = L.decks(ws); ok(ds[0].id === 'seed' && ds.length === 3 && ds[1].words.length === 30 && ds[1].words[0].rank === 9, 'bộ: seed rồi bộ lõi 30 từ/bộ theo thứ hạng');
  const c = L.cached('pt'); ok(c && c.length === ws.length && typeof c[0].ex === 'string' && c[0].tl === 'pt' && c[0].vi === seed.words[0].gl.vi, 'TLib.cached: dạng thẻ (ex chuỗi, tl) cho câu nhiễu');
  const acc = seed.words.find(w => /[ãçéêáíóõú]/.test(w.word));
  ok(!!acc, 'seed có từ mang dấu để kiểm gợi ý bỏ dấu');
  if (acc) { const r = await L.suggest('pt', acc.word.normalize('NFD').replace(/[\u0300-\u036f]/g, '').slice(0, 4), 8); ok(r.some(w => w.word === acc.word), 'gợi ý pt bỏ dấu: ' + acc.word); }
  ok(L.art({ pos: 'n', gender: 'f' }) === 'a ' && L.art({ pos: 'n', gender: 'm' }) === 'o ' && L.art({ pos: 'v' }) === '', 'mạo từ o/a thay nhãn giống');
}
{
  const app = rd('web/js/app.js'), line = app.split('\n').find(l => l.includes('App.meanOf = x =>'));
  const mk = (lang, mean) => { const s = { App: {}, I18N: { lang: () => lang, meanLang: () => mean } }; vm.createContext(s); vm.runInContext(line, s); return s.App.meanOf; };
  const w = { gl: { vi: 'nhà', en: 'house', ja: '家' } };
  ok(mk('ja', 'en')(w) === '家' && mk('vi', 'vi')(w) === 'nhà' && mk('en', 'en')(w) === 'house' && mk('ko', 'en')(w) === 'house', 'thẻ pt: nghĩa theo ngôn ngữ giao diện (ja → 家), thiếu → en');
  ok(/tlib: \['js\/target-lib\.js'\]/.test(app) && /routes\.library = function[^\n]*\n\s*if \(window\.Target && Target\.cur\(\) !== 'en'\) return App\.need\('tlib'\)/.test(app), 'Thư viện + gói tlib khi học ngôn ngữ đích');
  ok(/'lang:' \+ c\.tl/.test(rd('web/js/anki.js')) && /c\.ex && c\.tl\) \{ ex = c\.ex; exMeaning = c\.exEn/.test(rd('web/js/anki.js')), 'Anki/CSV: thẻ pt có nhãn lang:pt + nghĩa câu ví dụ');
  ok(/tlLib\(\) \|\| shuffle\(TOPICS/.test(rd('web/js/study.js')) && /TLib\.cached\(tl\)\) take/.test(rd('web/js/study-modes.js')), 'mini-game: câu nhiễu pt lấy từ bộ pt, không từ tiếng Anh');
}

console.log(fails ? `✗ target-lang: ${fails}/${n} lỗi` : `✓ target-lang: ${n}/${n} đạt`);
process.exit(fails ? 1 : 0);
