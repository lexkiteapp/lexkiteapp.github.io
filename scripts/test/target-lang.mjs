// 🌍 Ngôn ngữ đích (docs/specs/target-language.md) – chạy MÃ THẬT web/js/target.js + core.js + audio.js:
// cờ bật/tắt (riêng từng ngôn ngữ: pt_pilot, es_course) · bảng giọng/lang ('en' = y hệt cũ) · không gian khóa thẻ (cùng chữ en/pt không đè) · hàng ôn/Sổ từ lọc theo tl · bộ từ mẫu đúng schema + bản sao app khớp.
// Chạy: node scripts/test/target-lang.mjs
import fs from 'node:fs';
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { validate, readJSON, seedPath, imgKeys, MEAN_LANGS, TL_RULES, coreFiles, nextCoreFile } from '../target/lib.mjs';

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
// ---------- 1b) es: cờ es_course RIÊNG, mặc định tắt (docs/specs/spanish-course.md W0) ----------
{
  const { sb, ls } = env(); load(sb, 'web/js/target.js'); const T = sb.Target;
  ok(T.LANGS.join() === 'en,pt,es' && !T.enabled('es') && T.avail().join() === 'en', 'es: mặc định tắt, chỉ chọn được en');
  T.set('es'); ok(T.cur() === 'en', 'cờ es tắt: chọn es vẫn ra en');
  ls.set('lk.pt', '1'); ok(T.cur() === 'en' && !T.enabled('es') && T.avail().join() === 'en,pt', 'bật pt KHÔNG bật es');
  ls.set('lk.es', '1'); ok(T.cur() === 'es' && T.avail().join() === 'en,pt,es', 'lk.es=1 → es');
  ls.delete('lk.es'); ls.delete('lk.pt'); ls.set('lk.cfg', JSON.stringify({ v: { es_course: true } })); ok(T.enabled() && T.enabled('es') && !T.enabled('pt') && T.cur() === 'es', 'cờ máy chủ es_course → es');
  ls.set('lk.cfg', JSON.stringify({ v: { es_course: '0', pt_pilot: '1' } })); ok(T.cur() === 'en' && T.enabled() && !T.enabled('es'), 'es_course=0 → es tắt (pt vẫn bật)');
  ok(/'es_course'/.test(rd('functions/api/config.js')) && /'es_course'/.test(rd('functions/api/admin.js')), 'es_course có trong PUBLIC_KEYS + CONFIG_KEYS');
  // bật theo bậc: es_course_pct theo nhóm thiết bị lk.esb · es_kill tắt mọi đường · cờ 0 rõ ràng thắng %
  const cfg = v => ls.set('lk.cfg', JSON.stringify({ v }));
  [...ls.keys()].forEach(k => ls.delete(k));
  ls.set('lk.esb', '9'); cfg({ es_course_pct: '10' }); ok(T.enabled('es'), 'pct=10, nhóm 9 → bật');
  ls.set('lk.esb', '10'); ok(!T.enabled('es'), 'pct=10, nhóm 10 → tắt (ranh giới)');
  ls.set('lk.esb', '0'); cfg({ es_course_pct: '0' }); ok(!T.enabled('es'), 'pct=0 → tắt cả nhóm 0');
  cfg({}); ok(!T.enabled('es'), 'không có pct → tắt');
  ls.set('lk.esb', '99'); cfg({ es_course_pct: '100' }); ok(T.enabled('es'), 'pct=100 → bật mọi nhóm');
  cfg({ es_course_pct: '100', es_kill: '1' }); ok(!T.enabled('es') && T.cur() === 'en', 'es_kill=1 thắng pct');
  ls.set('lk.es', '1'); ok(!T.enabled('es'), 'es_kill=1 thắng cả lk.es=1');
  ls.delete('lk.es'); cfg({ es_course: true, es_kill: 'true' }); ok(!T.enabled('es'), 'es_kill thắng cờ es_course=true');
  cfg({ es_course: '0', es_course_pct: '100' }); ok(!T.enabled('es'), 'es_course=0 rõ ràng thắng pct');
  ls.delete('lk.esb'); cfg({ es_course_pct: '50' }); T.enabled('es'); ok(/^\d{1,2}$/.test(ls.get('lk.esb')), 'nhóm lk.esb được tạo 1 lần (0–99)');
  ls.set('lk.tb', '1'); ls.set('lk.esb', '50'); cfg({ es_course_pct: '10' }); ok(!T.enabled('es'), 'lk.tb (cổng bot teacher-bubble) không ảnh hưởng nhóm lk.esb');
  ls.set('lk.esb', ''); cfg({ es_course_pct: '1' }); ok(!T.enabled('es') || /^\d{1,2}$/.test(ls.get('lk.esb')), 'lk.esb rỗng/hỏng → chọn lại nhóm hợp lệ');
  ls.set('lk.esb', '150'); T.enabled('es'); ok(/^\d{1,2}$/.test(ls.get('lk.esb')), 'lk.esb ngoài 0–99 → chọn lại');
  ls.set('lk.esb', '5'); for (const bad of ['abc', true, null, '', {}]) { cfg({ es_course_pct: bad }); ok(!T.enabled('es'), 'pct rác ' + JSON.stringify(bad) + ' → tắt'); }
  cfg({ es_course_pct: 100 }); ok(T.enabled('es'), 'pct số 100 → bật');
  ok(/'es_course_pct'/.test(rd('functions/api/config.js')) && /'es_course_pct'/.test(rd('functions/api/admin.js')) && /'es_kill'/.test(rd('functions/api/config.js')) && /'es_kill'/.test(rd('functions/api/admin.js')), 'es_course_pct + es_kill có trong PUBLIC_KEYS + CONFIG_KEYS');
  // một bảng, không nhánh code: không còn so sánh trực tiếp với 'pt'/'es' trong target.js + settings.js
  for (const f of ['web/js/target.js', 'web/js/settings.js']) ok(!/[!=]==?\s*'(pt|es)'|'(pt|es)'\s*[!=]==?|lk\.pt'|pt_pilot\b(?!',)/.test(rd(f).replace(/^\s*(\/\/|\*|\/\*).*$/gm, '').replace(/const TABLE = \{[\s\S]*?\n {2}\};/, '') /* dữ liệu bảng được phép */), f + ': không còn nhánh if (pt) – tra bảng');
}

// ---------- 1c) nhãn ngôn ngữ đích (W7a): en = rỗng; es = huy hiệu cờ+tên → Cài đặt; mark chèn đúng 1 lần ----------
{
  const { sb, ls } = env(); load(sb, 'web/js/target.js'); const T = sb.Target;
  ok(T.chip() === '' && T.chip('en') === '' && T.mark({ querySelector: () => null }) === null, 'chip: en = chuỗi rỗng, không chèn gì (từng byte như cũ)');
  const h = T.chip('es'); ok(/class="chip tl-chip"/.test(h) && /href="#\/settings"/.test(h) && /translate="no"/.test(h) && /lang="es"/.test(h) && !/<a [^>]*lang=/.test(h) && !/style=/.test(h) && /Español/.test(h) && /aria-label=/.test(h), 'chip es: cờ + tên, bấm → Cài đặt, không dịch, có nhãn đọc màn hình');
  ls.set('lk.es', '1'); T.set('es'); let n = 0, ins = '';
  const root = { querySelector: s => (s === '.tl-chip' ? (ins ? { x: 1 } : null) : { insertAdjacentHTML: (w, x) => { ins = x; n++; }, querySelector: () => ({ x: 2 }) }) };
  T.mark(root, 'main'); T.mark(root, 'main'); ok(n === 1 && /tl-chip/.test(ins), 'mark: chèn đúng 1 huy hiệu dù vẽ lại');
  ok(T.chip('<img onerror=1>') === '' && !/<img/.test(T.chip('es')), 'chip: tl lạ → rỗng, không chèn HTML thô');
  ok(/window\.Target \? Target\.chip\('es'\)/.test(rd('web/cpack/es-app/day-ui.js')), 'day-ui: Target chưa nạp không làm vỡ trang');
  for (const f of ['web/js/study.js', 'web/cpack/es-app/day-ui.js']) ok(/Target\.(mark|chip)\(/.test(rd(f)), `${f}: gắn nhãn ngôn ngữ đích`);
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
  // es: es-419 → dự phòng es-MX → es-US trước es-ES; không lẫn giọng khác tiếng
  ok(T.speechLang('es') === 'es-419' && T.speechLangs('es').join() === 'es-419,es-MX,es-US' && T.speechLangs('en').length === 0 && T.recLang('es', 'en-GB') === 'es-MX', 'es: es-419, dự phòng es-MX/es-US, nhận giọng es-MX');
  ok(T.kokoroVoice('es-419') === 'ef_dora' && T.teacherVoice('ama', 'es') === 'ef_dora' && T.teacherVoice('carlos', 'es') === 'em_alex' && T.wordVoice('es-419') === '' && T.prefixFor('es-MX') === 'es', 'es: Kokoro ef_dora (Ama) / em_alex (Carlos), chưa có file từ');
  const ev = [V('Jorge', 'es-ES'), V('Paulina', 'es-MX'), V('Ana', 'es-US'), V('Daniel', 'en-GB'), V('Luciana', 'pt-BR')];
  const es1 = LA.rank(ev, 'es-419').map(v => v.name), es2 = LA.rank([...ev, V('Sabina', 'es-419')], 'es-419').map(v => v.name);
  ok(es1.join() === 'Paulina,Ana,Jorge', 'audio: es-419 thiếu → es-MX, es-US, rồi es-ES: ' + es1);
  ok(es2[0] === 'Sabina' && !es2.includes('Daniel') && !es2.includes('Luciana'), 'audio: có es-419 → chọn trước, không lẫn en/pt: ' + es2);
  ok(LA.rank(ev, 'en-GB').map(v => v.name).join() === 'Daniel', 'audio: en-GB không đổi khi có giọng es');
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

// ---------- 4b) bộ từ mẫu es (W0): giống, số nhiều, IPA es-419 seseo, nghĩa 15 ngôn ngữ, ví dụ es+en ----------
{
  const deck = readJSON(seedPath('es')), err = validate(deck, { img: imgKeys() });
  ok(!err.length, 'seed es đúng schema + cổng: ' + err.slice(0, 5).join(' | '));
  ok(deck.words.length === 30 && deck.tl === 'es' && deck.variant === 'es-419', 'seed es = 30 từ, es-419');
  ok(deck.words.every(w => MEAN_LANGS.every(L => w.gl[L]) && w.gl.es === w.word && w.ex.es && w.ex.en), 'es: đủ nghĩa 15 ngôn ngữ, gl.es = từ, ví dụ es+en');
  ok(deck.words.every(w => w.pos !== 'n' || (w.gender && w.plural)), 'es: danh từ có giống + số nhiều');
  ok(deck.words.every(w => !/θ/.test(w.ipa)) && /^ˈsjelo$/.test(deck.words.find(w => w.word === 'cielo').ipa) && /^saˈpato$/.test(deck.words.find(w => w.word === 'zapato').ipa), 'es: seseo (cielo/zapato = /s/)');
  ok(deck.words.slice(0, 20).some(w => w.word === 'cielo') && deck.words.slice(0, 20).some(w => w.word === 'zapato'), 'es: cielo + zapato trong 20 từ lượt mẫu giọng');
  ok(TL_RULES.es.plural && TL_RULES.es.seseo && !TL_RULES.pt, 'luật riêng theo bảng TL_RULES');
  const bad = structuredClone(deck); delete bad.words[0].plural; bad.words[1].ipa = 'ˈθjelo'; bad.words[2].ex = { pt: 'O céu.', en: 'The sky.' }; bad.words[8].plural = 'comeres'; bad.words[3].ex.es = 'Sin la palabra.';
  const e2 = validate(bad, { img: imgKeys() });
  ok(e2.length >= 5 && e2.some(e => /plural/.test(e)) && e2.some(e => /θ/.test(e)), 'cổng es bắt đủ 5 lỗi cài sẵn: ' + e2.length);
  const sch = readJSON('content/target/es/schema.json'); ok(sch.properties.words.items.properties.plural && sch.properties.words.items.properties.ex.required.join() === 'es,en', 'schema es có plural + ex.es');
  try { execFileSync(process.execPath, ['scripts/target/build.mjs', 'es', '--check'], { stdio: 'pipe' }); ok(true); } catch (e) { ok(false, 'web/js/target-es-seed.json lệch seed.json: ' + String(e.stdout || e.stderr)); }
  // W1: lint chuẩn Mỹ Latinh trung tính (§8) – bắt vosotros/os/-áis/-éis/coger/từ chỉ TBN, KHÔNG bắt ustedes/país
  const lintE = sent => validate({ v: 1, tl: 'es', words: [{ ...deck.words[0], ex: { es: sent, en: 'x' } }] }).filter(e => /lệch chuẩn/.test(e)).length;
  ok(['¿Vosotros tenéis una casa?', 'Os doy la casa.', 'Habláis en casa.', 'Voy a coger la casa.', 'Mi casa tiene un ordenador.'].every(x => lintE(x) === 1), 'lint es bắt vosotros/os/-áis/coger/ordenador');
  ok(['Ustedes tienen una casa.', 'La casa del país.', 'Tomo el carro a casa.'].every(x => lintE(x) === 0), 'lint es không bắt nhầm ustedes/país/carro');
  // W1: sinh theo bảng TL_GEN (không nhánh/chuỗi pt cứng trong gen.mjs), lô core-NN, cổng LanguageTool + IPA espeak + Wiktionary nối trong workflow
  const { TL_GEN } = await import('../target/tl-gen.mjs');
  ok(TL_GEN.es.variant === 'es-419' && TL_GEN.pt.variant === readJSON(seedPath('pt')).variant && TL_GEN.es.lt === 'es' && TL_GEN.es.kaikki === 'Spanish' && /es_50k/.test(TL_GEN.es.source.url), 'tl-gen.mjs: dòng es (es-419, LanguageTool, kaikki, FrequencyWords es)');
  const gsrc = rd('scripts/target/gen.mjs'); ok(!/Brazilian|pt-BR'|pt_br/.test(gsrc) && /TL_GEN\[TL\]/.test(gsrc) && /LT_URL/.test(gsrc) && /nextCoreFile/.test(gsrc), 'gen.mjs: chỉ đọc bảng TL_GEN, cổng LanguageTool bắt buộc, ghi lô core-NN');
  ok(/^core-01\.json$/.test(path.basename(nextCoreFile('es'))) || coreFiles('es').length > 0, 'nextCoreFile es');
  const sc = structuredClone(deck); sc.words[0].gl.ja = 'casa'; sc.words[1].gl.vi = sc.words[1].word; const e3 = validate(sc);
  ok(e3.some(e => /ja sai chữ viết/.test(e)) && e3.some(e => /nghĩa vi = nguyên từ/.test(e)), 'cổng bắt nghĩa sai chữ viết + vi = nguyên từ');
  ok(/lexai: 0/.test(gsrc), 'gen.mjs không đi tuyến /api/lexai (chế độ cùng tên = lời nhắc tiếng Anh)');
  const tc = rd('.github/workflows/target-content.yml'); ok(!/git push/.test(tc) && ['tl_ipa_fill.py', 'wikt-check.mjs', 'conj-check.mjs', 'lt-up.sh', 'actions/bot-output', 'timeout-minutes', 'concurrency'].every(k => tc.includes(k)) && rd('scripts/ci/lt-up.sh').includes('languagetool'), 'target-content.yml: LT (lt-up.sh) + IPA espeak + Wiktionary + chia động từ + lô ra bot-output, không git push');
  // bảng giọng lượt mẫu: es = ef_dora/em_alex, espeak es-419, Whisper small, seseo; workflow chung có nhãn word-audio-es
  const V = readJSON('scripts/word-audio/tl-voices.json');
  ok(V.es.voices.join() === 'ef_dora,em_alex' && V.es.espeak === 'es-419' && V.es.asrModel === 'small' && V.es.seseo && /^es_MX-/.test(V.es.piper.name) && V.pt.voices.join() === 'pf_dora,pm_alex', 'tl-voices.json: es + pt');
  const wf = rd('.github/workflows/word-audio-tl.yml'); ok(/word-audio-es/.test(wf) && /timeout-minutes/.test(wf) && /concurrency/.test(wf) && /paths:/.test(wf), 'word-audio-tl.yml: nhãn es + timeout/concurrency/paths');
}

// ---------- 5) nối dây: shell nạp target.js trước core.js; package test ----------
{
  const html = rd('web/app/index.html'), a = html.indexOf('js/target.js'), b = html.indexOf('js/core.js');
  ok(a > 0 && a < b, 'index.html nạp target.js trước core.js');
  ok(/'\/js\/target\.js'/.test(rd('web/sw.js')), 'sw.js cache target.js');
}

console.log(fails ? `✗ target-lang: ${fails}/${n} lỗi` : `✓ target-lang: ${n}/${n} đạt`);
process.exit(fails ? 1 : 0);
