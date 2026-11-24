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
const ready = T => { T.TABLE.pt.ready = T.TABLE.fr.ready = T.TABLE.ja.ready = T.TABLE.ko.ready = true; return T; }; // các ca logic cờ/thẻ giả định khóa đã sẵn sàng; luật ready:false có khối riêng ở cuối tệp
const load = (sb, f) => vm.runInContext(rd(f), sb, { filename: f });

// ---------- 1) cờ + ngôn ngữ hiện tại ----------
{
  const { sb, ls } = env(); load(sb, 'web/js/target.js'); const T = ready(sb.Target);
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
  const { sb, ls } = env(); load(sb, 'web/js/target.js'); const T = ready(sb.Target);
  ok(T.LANGS.join() === 'en,pt,es,fr,ja,ko' && !T.enabled('es') && T.avail().join() === 'en', 'es: mặc định tắt, chỉ chọn được en');
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
  // quản trị (App.isAdmin ghi lk.adm=1): mọi ngôn ngữ beta bật như lk.<tl>=1 dù ngoài nhóm %/cờ 0; kill vẫn thắng; người thường không có lk.adm → không đổi
  cfg({ es_course_pct: '10' }); ls.set('lk.esb', '50'); ok(!T.enabled('es') && !T.enabled('fr') && !T.enabled('pt'), 'ngoài nhóm 10 %, không phải quản trị → tắt');
  ls.set('lk.adm', '1'); ok(T.enabled('es') && T.enabled('fr') && T.enabled('pt') && T.enabled('ja') && T.enabled('ko') && T.avail().join() === 'en,pt,es,fr,ja,ko', 'lk.adm=1 → es, fr, pt, ja, ko đều bật');
  cfg({ es_course: '0' }); ok(T.enabled('es'), 'quản trị thấy es kể cả cờ es_course=0');
  cfg({ es_kill: '1' }); ok(!T.enabled('es') && T.enabled('fr'), 'es_kill=1 vẫn tắt es cho quản trị (công tắc khẩn)');
  ls.delete('lk.adm'); ok(!T.enabled('fr'), 'bỏ lk.adm → fr tắt lại');
  ok(/lk\.adm/.test(rd('web/js/app.js')) && /TLPick\.exam/.test(rd('web/js/hubs.js')) && /data-xtl/.test(rd('web/cpack/tl-app/tl-pick.js')), 'App.isAdmin ghi lk.adm + chip kỳ thi (TLPick.exam) có bộ chọn ngôn ngữ đích, ngôn ngữ đứng trước kỳ thi');
  // nút cờ đầu thanh trên (#tlBtn): có trong HTML, bấm mở App.tlMenu; chọn khóa → Target.set + về trang chủ khóa (es ↔ en)
  ok(/id="tlBtn"/.test(rd('web/app/index.html')) && /#tlBtn/.test(rd('web/js/hubs.js')) && /App\.tlMenu = /.test(rd('web/js/settings.js')), 'nút chọn khóa học ở đầu thanh trên + menu tải lười');
  ok(/Target\.set\(b\.dataset\.tl\)[^}]*location\.hash = Target\.homeOf\(b\.dataset\.tl\) \|\| '#\/home'/.test(rd('web/js/settings.js')), 'chọn khóa học → vào trang chủ khóa đó');
  ls.set('lk.cfg', '{}'); ls.set('lk.es', '1'); ls.delete('lk.tl'); ok(T.set('es') === 'es' && T.homeOf('es') === '#/practice/esd', 'đổi en→es từ thanh trên'); ok(T.set('en') === 'en' && T.homeOf('en') === '', 'đổi es→en từ thanh trên'); ls.delete('lk.es');
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

// ---------- 1d) W7b chống rò tiếng Anh: tl≠en thì Hôm nay chuyển sang lộ trình của ngôn ngữ đó; mỗi dòng bảng có home ----------
{
  const ux = rd('web/js/ux1.js'), { sb } = env(); load(sb, 'web/js/target.js'); const T = ready(sb.Target);
  ok(/Target\.cur\(\) !== 'en'[^;]*Target\.homeOf\(Target\.cur\(\)\)/.test(ux) && /location\.replace\(tlHome\)/.test(ux), 'ux1.map: tl≠en → vào lộ trình của ngôn ngữ đích, không vẽ lộ trình IELTS');
  ok(T.LANGS.filter(k => k !== 'en').every(k => k === 'pt' || k === 'fr' || k === 'ja' || k === 'ko' /* fr, ja, ko: trang chủ = lộ trình ngày W4 */ || /^#\/practice\//.test(T.table(k).home || '')), 'mọi ngôn ngữ đích có trang chủ riêng (trừ pt thử nghiệm)');
}

// ---------- 1c) nhãn ngôn ngữ đích (W7a): en = rỗng; es = huy hiệu cờ+tên → Cài đặt; mark chèn đúng 1 lần ----------
{
  const { sb, ls } = env(); load(sb, 'web/js/target.js'); const T = ready(sb.Target);
  ok(T.chip() === '' && T.chip('en') === '', 'chip: en = chuỗi rỗng, không chèn gì (từng byte như cũ)');
  const h = T.chip('es'); ok(/class="chip tl-chip"/.test(h) && /href="#\/settings"/.test(h) && /translate="no"/.test(h) && /lang="es"/.test(h) && !/<a [^>]*lang=/.test(h) && !/style=/.test(h) && /Español/.test(h) && /aria-label=/.test(h), 'chip es: cờ + tên, bấm → Cài đặt, không dịch, có nhãn đọc màn hình');
  const st = T.chip('es', true); ok(/^<span class="chip tl-chip"/.test(st) && !/href=/.test(st), 'chip tĩnh (trong phiên học) không là liên kết');
  sb.t = x => '<' + x; ok(/aria-label="&lt;Ngôn ngữ đang học: Español"/.test(T.chip('es')), 'chip dùng g.t và escape nhãn');
  ok(T.chip('<img onerror=1>') === '' && !/<img/.test(T.chip('es')), 'chip: tl lạ → rỗng, không chèn HTML thô');
  ok(/window\.Target \? Target\.chip\(TL\)/.test(rd('web/cpack/es-app/day-ui.js')), 'day-ui: Target chưa nạp không làm vỡ trang');
  for (const f of ['web/js/study.js', 'web/cpack/es-app/day-ui.js']) ok(/Target\.chip\(/.test(rd(f)), `${f}: gắn nhãn ngôn ngữ đích`);
}

// ---------- 2) bảng giọng/lang: 'en' tái tạo đúng hành vi cũ ----------
{
  const { sb } = env(); load(sb, 'web/js/target.js'); const T = ready(sb.Target);
  ok(T.kokoroVoice('en-US') === 'af_heart' && T.kokoroVoice('en-GB') === 'bf_emma' && T.kokoroVoice(undefined) === 'bf_emma' && T.kokoroVoice('en-AU') === 'bf_emma', 'Kokoro en như cũ (US af_heart, còn lại bf_emma)');
  ok(T.wordVoice('en-US') === 'af_heart' && T.wordVoice('en-GB') === 'bf_emma', 'file từ en như cũ');
  ok(T.accent('en-US') === 'en-US' && T.accent('en-GB') === 'en-GB', 'accent en = Cài đặt');
  ok(T.prefixFor('en-GB') === 'en' && T.prefixFor('de-DE') === 'en' && T.prefixFor('') === 'en', 'lọc giọng: accent tiếng Anh/lạ → en như cũ');
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
  const { sb, ls, mem } = env(); load(sb, 'web/js/target.js'); load(sb, 'web/js/core.js'); const { Core, Target: T } = sb; T.TABLE.pt.ready = true; // ca lọc thẻ theo tl; luật ready:false: khối cuối tệp
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

// ---------- 4c) fr (W0): cờ RIÊNG fr_course/fr_course_pct/fr_kill (mặc định tắt) + bộ từ mẫu fr (giống, số nhiều, h muet/aspiré, tu/vous) ----------
{
  const { sb, ls } = env(); load(sb, 'web/js/target.js'); const T = ready(sb.Target), cfg = v => ls.set('lk.cfg', JSON.stringify({ v }));
  ok(!T.enabled('fr') && T.avail().join() === 'en', 'fr: mặc định tắt'); T.set('fr'); ok(T.cur() === 'en', 'cờ fr tắt: chọn fr vẫn ra en');
  ls.set('lk.es', '1'); ok(!T.enabled('fr') && T.avail().join() === 'en,es', 'bật es KHÔNG bật fr'); ls.delete('lk.es');
  ls.set('lk.fr', '1'); ok(T.cur() === 'fr' && T.avail().join() === 'en,fr', 'lk.fr=1 → fr'); ls.delete('lk.fr');
  cfg({ fr_course: true }); ok(T.enabled('fr') && T.cur() === 'fr', 'cờ máy chủ fr_course → fr');
  cfg({ fr_course: true, fr_kill: '1' }); ok(!T.enabled('fr') && T.cur() === 'en', 'fr_kill=1 thắng cờ');
  ls.set('lk.esb', '9'); cfg({ fr_course_pct: '10' }); ok(T.enabled('fr'), 'fr_course_pct=10, nhóm 9 → bật'); ls.set('lk.esb', '10'); ok(!T.enabled('fr'), 'nhóm 10 → tắt'); cfg({ fr_course: '0', fr_course_pct: '100' }); ok(!T.enabled('fr'), 'fr_course=0 thắng pct');
  for (const k of ['fr_course', 'fr_course_pct', 'fr_kill']) ok(rd('functions/api/config.js').includes(`'${k}'`) && rd('functions/api/admin.js').includes(`'${k}'`), k + ' có trong PUBLIC_KEYS + CONFIG_KEYS');
  ok(T.speechLang('fr') === 'fr-FR' && T.speechLangs('fr').join() === 'fr-FR,fr-CA,fr-BE' && T.recLang('fr', 'en-GB') === 'fr-FR' && T.kokoroVoice('fr-FR') === 'ff_siwis' && T.teacherVoice('ama', 'fr') === 'ff_siwis' && T.prefixFor('fr-CA') === 'fr', 'fr: fr-FR, dự phòng fr-CA/fr-BE, Kokoro ff_siwis');
  const deck = readJSON(seedPath('fr')), err = validate(deck, { img: imgKeys() });
  ok(!err.length, 'seed fr đúng schema + cổng: ' + err.slice(0, 5).join(' | '));
  ok(deck.words.length === 30 && deck.tl === 'fr' && deck.variant === 'fr-FR', 'seed fr = 30 từ, fr-FR');
  ok(deck.words.every(w => MEAN_LANGS.every(L => w.gl[L]) && w.gl.fr === w.word && w.ex.fr && w.ex.en), 'fr: đủ nghĩa 15 ngôn ngữ, gl.fr = từ, ví dụ fr+en');
  ok(deck.words.every(w => w.pos !== 'n' || (w.gender && w.plural)) && deck.words.find(w => w.word === 'ciel').plural === 'cieux' && deck.words.find(w => w.word === 'eau').plural === 'eaux', 'fr: danh từ có giống + số nhiều (bất quy tắc cieux/eaux)');
  ok(deck.words.find(w => w.word === 'homme').h === 'muet' && deck.words.find(w => w.word === 'haricot').h === 'aspire' && deck.words.every(w => /^h/i.test(w.word) === (w.h !== undefined)), 'fr: cờ h muet/aspiré đúng và chỉ ở từ mở đầu bằng h');
  ok(TL_RULES.fr.plural && TL_RULES.fr.hFlag && TL_RULES.fr.mix && !TL_RULES.es.hFlag, 'luật riêng fr theo bảng TL_RULES');
  const bad = structuredClone(deck); delete bad.words[0].plural; delete bad.words.find(w => w.word === 'haricot').h; bad.words[2].ex.fr = "Tu peux aider vos amis, le ciel est bleu."; bad.words[3].ex.fr = 'Cette bagnole est trop petite pour moi chaussure.'; bad.words[4].h = 'muet'; bad.words[5].ex.fr = 'Sans le mot.';
  const e2 = validate(bad, { img: imgKeys() });
  ok(e2.length >= 6 && e2.some(e => /h \(muet\|aspire\)/.test(e)) && e2.some(e => /tu \+ vous/.test(e)) && e2.some(e => /lệch chuẩn/.test(e)) && e2.some(e => /plural/.test(e)), 'cổng fr bắt đủ 6 lỗi cài sẵn (plural, h, tu+vous, bagnole, h thừa, thiếu từ): ' + e2.length);
  const sch = readJSON('content/target/fr/schema.json'); ok(sch.properties.variant.const === 'fr-FR' && sch.properties.words.items.properties.h.enum.join() === 'muet,aspire' && sch.properties.words.items.properties.ex.required.join() === 'fr,en', 'schema fr: variant, h, ex.fr');
  try { execFileSync(process.execPath, ['scripts/target/build.mjs', 'fr', '--check'], { stdio: 'pipe' }); ok(true); } catch (e) { ok(false, 'web/js/target-fr-seed.json lệch seed.json: ' + String(e.stdout || e.stderr)); }
  const V = readJSON('scripts/word-audio/tl-voices.json'); ok(V.fr.voices[0] === 'ff_siwis' && V.fr.espeak === 'fr-fr' && V.fr.asrLang === 'fr' && /^fr_FR-/.test(V.fr.piper.name) && V.es.espeak === 'es-419', 'tl-voices.json: fr (ff_siwis, espeak fr-fr)');
  ok(/word-audio-fr/.test(rd('.github/workflows/word-audio-tl.yml')), 'word-audio-tl.yml: nhãn word-audio-fr');
}

// ---------- 4d) ja (W0): cờ RIÊNG ja_course/ja_course_pct/ja_kill (mặc định tắt) + bộ từ mẫu ja (kana, romaji/IPA sinh từ kana, cao độ, JLPT, nhóm từ, thể lịch sự) ----------
{
  const { sb, ls } = env(); load(sb, 'web/js/target.js'); const T = ready(sb.Target), cfg = v => ls.set('lk.cfg', JSON.stringify({ v }));
  ok(!T.enabled('ja') && T.avail().join() === 'en', 'ja: mặc định tắt'); T.set('ja'); ok(T.cur() === 'en', 'cờ ja tắt: chọn ja vẫn ra en');
  ls.set('lk.fr', '1'); ok(!T.enabled('ja') && T.avail().join() === 'en,fr', 'bật fr KHÔNG bật ja'); ls.delete('lk.fr');
  ls.set('lk.ja', '1'); ok(T.cur() === 'ja' && T.avail().join() === 'en,ja', 'lk.ja=1 → ja'); ls.delete('lk.ja');
  cfg({ ja_course: true }); ok(T.enabled('ja') && T.cur() === 'ja', 'cờ máy chủ ja_course → ja');
  cfg({ ja_course: true, ja_kill: '1' }); ok(!T.enabled('ja') && T.cur() === 'en', 'ja_kill=1 thắng cờ');
  ls.set('lk.esb', '9'); cfg({ ja_course_pct: '10' }); ok(T.enabled('ja') && !T.enabled('fr') && !T.enabled('es'), 'ja_course_pct=10, nhóm 9 → chỉ ja bật'); ls.set('lk.esb', '10'); ok(!T.enabled('ja'), 'nhóm 10 → tắt'); cfg({ ja_course: '0', ja_course_pct: '100' }); ok(!T.enabled('ja'), 'ja_course=0 thắng pct');
  for (const k of ['ja_course', 'ja_course_pct', 'ja_kill']) ok(rd('functions/api/config.js').includes(`'${k}'`) && rd('functions/api/admin.js').includes(`'${k}'`), k + ' có trong PUBLIC_KEYS + CONFIG_KEYS');
  ok(T.speechLang('ja') === 'ja-JP' && T.speechLangs('ja').join() === 'ja-JP' && T.recLang('ja', 'en-GB') === 'ja-JP' && T.kokoroVoice('ja-JP') === 'jf_alpha' && T.teacherVoice('ama', 'ja') === 'jf_alpha' && T.teacherVoice('carlos', 'ja') === 'jm_kumo' && T.prefixFor('ja-JP') === 'ja' && T.wordVoice('ja-JP') === '', 'ja: ja-JP, Kokoro jf_alpha (Ama) / jm_kumo (Carlos), chưa có file từ');
  const deck = readJSON(seedPath('ja')), err = validate(deck, { img: imgKeys() });
  ok(!err.length, 'seed ja đúng schema + cổng: ' + err.slice(0, 5).join(' | '));
  ok(deck.words.length === 30 && deck.tl === 'ja' && deck.variant === 'ja-JP', 'seed ja = 30 từ, ja-JP');
  ok(deck.words.every(w => MEAN_LANGS.every(L => w.gl[L]) && w.gl.ja === w.word && w.ex.ja && w.ex.en && !w.gender && !w.plural), 'ja: đủ nghĩa 15 ngôn ngữ, gl.ja = từ, ví dụ ja+en, không giống/số nhiều');
  const by = x => deck.words.find(w => w.word === x);
  ok(by('食べる').vclass === 'ichidan' && by('飲む').vclass === 'godan' && by('来る').vclass === 'irregular' && by('大きい').aclass === 'i' && by('好き').aclass === 'na', 'ja: đủ 3 nhóm động từ + tính từ i/na');
  ok(['テーブル', 'パン', 'ジュース'].every(by) && by('学校').kana === 'がっこう' && by('牛乳').romaji === 'gyuunyuu' && by('電車').ipa === 'deɴɕa', 'ja: phủ katakana, っ, ゃゅょ, ー, ん');
  ok(by('水').pitch === 0 && by('猫').pitch === 1 && by('家').pitch === 2 && by('大きい').pitch === 3, 'ja: cao độ NHK (水 0 heiban, 猫 1, 家 2, 大きい 3)');
  ok(TL_RULES.ja.noGender && TL_RULES.ja.kana && TL_RULES.ja.sub && !TL_RULES.fr.kana && !TL_RULES.es.noGender, 'luật riêng ja theo bảng TL_RULES');
  // cổng phải BẮT lỗi cài sẵn
  const bad = structuredClone(deck), B = i => bad.words[i];
  B(0).romaji = 'iye'; B(1).ipa = 'mizu'; B(3).pitch = 9; B(4).jlpt = 6; // 空 から: một chữ kanji nhận mọi cách đọc ở cổng này → bắt bằng OpenJTalk (tl_ipa.py) + Wiktionary W1
  const W = x => bad.words.find(w => w.word === x); W('大きい').kana = 'おおきな'; W('話す').vclass = 'ichidan'; W('好き').aclass = 'i';
  B(5).ex.ja = '私の猫はよく寝る。'; B(6).ex.ja = 'この本はAです。'; B(7).gender = 'f'; delete W('食べる').kana; B(9).ex.ja = '公園に行きます。';
  const e2 = validate(bad, { img: imgKeys() }), has = re => e2.some(e => re.test(e));
  ok([/romaji iye/, /IPA mizu/, /không khớp chữ 大きい/, /pitch 9/, /jlpt/, /vclass/, /aclass/, /lịch sự/, /lệch chuẩn/, /không có giống/, /thiếu\/sai kana/, /không chứa/].every(has), 'cổng ja bắt đủ 12 lỗi cài sẵn (romaji, IPA, kana, pitch, jlpt, vclass, aclass, thể thường, romaji trong câu, gender, thiếu kana, câu thiếu từ): ' + e2.length);
  const es0 = structuredClone(readJSON(seedPath('es'))); es0.words[0].kana = 'かさ'; ok(validate(es0).some(e => /kana chỉ cho/.test(e)), 'trường ja (kana…) bị chặn ở ngôn ngữ khác');
  const sch = readJSON('content/target/ja/schema.json'); ok(sch.properties.variant.const === 'ja-JP' && sch.properties.words.items.required.includes('kana') && !sch.properties.words.items.properties.gender && sch.properties.words.items.properties.ex.required.join() === 'ja,en', 'schema ja: variant, kana bắt buộc, không gender, ex.ja');
  try { execFileSync(process.execPath, ['scripts/target/build.mjs', 'ja', '--check'], { stdio: 'pipe' }); ok(true); } catch (e) { ok(false, 'web/js/target-ja-seed.json lệch seed.json: ' + String(e.stdout || e.stderr)); }
  const web = readJSON('web/js/target-ja-seed.json'); ok(web.words.every(w => w.kana && w.romaji && Number.isInteger(w.pitch) && w.jlpt), 'bản sao app mang kana/romaji/pitch/jlpt');
  ok(/w\.kana \? \{ kana: w\.kana, romaji: w\.romaji, pitch: w\.pitch \}/.test(rd('web/js/settings.js')) && /tiếng Nhật vào Sổ từ/.test(rd('web/js/settings.js')), 'settings.js: thẻ ja giữ kana/romaji/pitch + thông báo tiếng Nhật');
  const V = readJSON('scripts/word-audio/tl-voices.json'); ok(V.ja.voices.join() === 'jf_alpha,jm_kumo' && V.ja.g2p === 'misaki-ja' && V.ja.say === 'kana' && V.ja.asrMatch === 'reading' && V.ja.cut === false && V.ja.require.join() === 'ojt_mei,ojt_m001' && V.ja.alts.every(a => a.engine === 'openjtalk' && /CC BY 3\.0/.test(a.name)) && V.ja.alts.find(a => a.label === 'ojt_m001').archive && V.fr.espeak === 'fr-fr', 'tl-voices.json: ja (Kokoro chỉ báo cáo; giọng dùng thật Open JTalk mei/m001 CC BY 3.0, đọc kana, chấm cách đọc)');
  ok(/word-audio-ja/.test(rd('.github/workflows/word-audio-tl.yml')) && /tl: \[pt, es, fr, ja[,\]]/.test(rd('.github/workflows/target-content.yml')), 'workflow: nhãn word-audio-ja + ma trận target-content có ja');
  const { TL_GEN } = await import('../target/tl-gen.mjs'); ok(TL_GEN.ja.variant === 'ja-JP' && TL_GEN.ja.kaikki === 'Japanese' && /open-anki-jlpt-decks/.test(TL_GEN.ja.source.url) && TL_GEN.ja.one.test('本'), 'tl-gen.mjs: dòng ja');
}
// ja-kana.mjs: kana → romaji (gõ IME) / IPA, mora, cao độ, furigana, chuẩn hoá chấm IME
{ const J = await import('../target/ja-kana.mjs');
  const R = [['がっこう', 'gakkou', 'gakkoː'], ['ぎゅうにゅう', 'gyuunyuu', 'gʲɯːɲɯː'], ['しんぶん', 'shinbun', 'ɕimbɯɴ'], ['きんようび', "kin'youbi", 'kʲiɴjoːbʲi'], ['まっちゃ', 'matcha', 'mattɕa'], ['コーヒー', 'koohii', 'koːçiː'], ['ティーシャツ', 'tiishatsu', 'tiːɕatsɯ'], ['ファイル', 'fairu', 'ɸaiɾɯ'], ['にほんご', 'nihongo', 'ɲihoŋgo'], ['せんせい', 'sensei', 'seɴseː'], ['あんない', 'annai', 'annai']];
  for (const [k, r, i] of R) ok(J.romaji(k) === r && J.ipa(k) === i, `ja-kana ${k}: ${J.romaji(k)} /${J.ipa(k)}/`);
  ok(J.ipa('おもう', { verb: true }) === 'omoɯ' && J.ipa('おもう') === 'omoː', 'う cuối động từ không thành trường âm (思う omoɯ)');
  ok(J.morae('きょう') === 2 && J.morae('がっこう') === 4 && J.morae('テーブル') === 4 && J.morae('ほん') === 2, 'đếm mora (ゃ nhập, っ/ー/ん = 1)');
  ok(J.pitchPattern('みず', 0).join('') === 'LHH' && J.pitchPattern('ねこ', 1).join('') === 'HLL' && J.pitchPattern('いえ', 2).join('') === 'LHL' && J.pitchPattern('たべる', 2).join('') === 'LHLL' && J.pitchPattern('ねこ', 3) === null, 'mẫu cao độ Tokyo (heiban/atamadaka/odaka/nakadaka)');
  ok(JSON.stringify(J.ruby('食べる', 'たべる')) === '[["食","た"],["べる",null]]' && JSON.stringify(J.ruby('今日', 'きょう')) === '[["今日","きょう"]]' && J.ruby('食べる', 'のむ') === null, 'furigana theo khối, okurigana tách đúng; sai cách đọc → null');
  ok(J.fold('ﾈｺ。') === 'ねこ' && J.fold('ネコ ') === 'ねこ' && J.fold('ねこ') === J.fold('ネコ'), 'chấm IME: bán độ rộng/katakana/dấu câu đều quy về hiragana');
  let thr = false; try { J.romaji('ねこa'); } catch { thr = true; } ok(thr, 'ký tự ngoài kana → lỗi (không đoán)'); }

// ---------- 4e) ko (W0): cờ RIÊNG ko_course/ko_course_pct/ko_kill (mặc định tắt) + bộ từ mẫu ko (pron/RR/IPA sinh từ chữ, TOPIK, lớp chia, hanja, 해요체) ----------
{
  const { sb, ls } = env(); load(sb, 'web/js/target.js'); const T = ready(sb.Target), cfg = v => ls.set('lk.cfg', JSON.stringify({ v }));
  ok(!T.enabled('ko') && T.avail().join() === 'en', 'ko: mặc định tắt'); T.set('ko'); ok(T.cur() === 'en', 'cờ ko tắt: chọn ko vẫn ra en');
  ls.set('lk.ja', '1'); ok(!T.enabled('ko') && T.avail().join() === 'en,ja', 'bật ja KHÔNG bật ko'); ls.delete('lk.ja');
  ls.set('lk.ko', '1'); ok(T.cur() === 'ko' && T.avail().join() === 'en,ko', 'lk.ko=1 → ko'); ls.delete('lk.ko');
  cfg({ ko_course: true }); ok(T.enabled('ko') && T.cur() === 'ko', 'cờ máy chủ ko_course → ko');
  cfg({ ko_course: true, ko_kill: '1' }); ok(!T.enabled('ko') && T.cur() === 'en', 'ko_kill=1 thắng cờ');
  ls.set('lk.esb', '9'); cfg({ ko_course_pct: '10' }); ok(T.enabled('ko') && !T.enabled('ja') && !T.enabled('es'), 'ko_course_pct=10, nhóm 9 → chỉ ko bật'); ls.set('lk.esb', '10'); ok(!T.enabled('ko'), 'nhóm 10 → tắt'); cfg({ ko_course: '0', ko_course_pct: '100' }); ok(!T.enabled('ko'), 'ko_course=0 thắng pct');
  for (const k of ['ko_course', 'ko_course_pct', 'ko_kill']) ok(rd('functions/api/config.js').includes(`'${k}'`) && rd('functions/api/admin.js').includes(`'${k}'`), k + ' có trong PUBLIC_KEYS + CONFIG_KEYS');
  ok(T.speechLang('ko') === 'ko-KR' && T.speechLangs('ko').join() === 'ko-KR' && T.recLang('ko', 'en-GB') === 'ko-KR' && T.prefixFor('ko-KR') === 'ko' && T.kokoroVoice('ko-KR') === '' && T.wordVoice('ko-KR') === '' && T.teacherVoice('ama', 'ko') === '' && T.kokoroVoice('en-GB') === 'bf_emma', 'ko: ko-KR, không có giọng Kokoro → "" (giọng máy), en không đổi');
  const deck = readJSON(seedPath('ko')), err = validate(deck, { img: imgKeys() });
  ok(!err.length, 'seed ko đúng schema + cổng: ' + err.slice(0, 5).join(' | '));
  ok(deck.words.length === 30 && deck.tl === 'ko' && deck.variant === 'ko-KR', 'seed ko = 30 từ, ko-KR');
  ok(deck.words.every(w => MEAN_LANGS.every(L => w.gl[L]) && w.gl.ko === w.word && w.ex.ko && w.ex.en && !w.gender && !w.plural && [1, 2].includes(w.topik)), 'ko: đủ nghĩa 15 ngôn ngữ, gl.ko = từ, ví dụ ko+en, không giống/số nhiều, TOPIK I');
  const by = x => deck.words.find(w => w.word === x), K = await import('../target/ko-hangul.mjs');
  ok(by('학교').pron === '학꾜' && by('한국어').pron === '한구거' && by('빨갛다').pron === '빨가타' && by('부엌').pron === '부억' && by('김밥').pron === '김빱' && by('김밥').pronX.tense.join() === '1', 'ko seed phủ căng hoá, nối âm, bật hơi ㅎ, âm cuối ㅋ, căng hoá theo từ (pronX)');
  ok(by('학교').romaja === 'hakgyo' && by('한국어').romaja === 'hangugeo' && by('김밥').romaja === 'gimbap' && by('빨갛다').romaja === 'ppalgata', 'ko RR: không ghi căng hoá, vị từ ghi bật hơi');
  ok(['reg', '하', '으', 'ㅎ', 'ㄷ'].every(c => deck.words.some(w => w.conj === c)) && deck.words.filter(w => w.conj).every(w => !/요$/.test(w.exForm || '') || w.exForm === K.conj(w.word, w.conj, 'haeyo')), 'ko seed: 5 lớp chia, exForm 해요 khớp bộ chia');
  ok(by('학교').hanja === '學校' && by('친구').hanja === '親舊' && !by('사과').hanja, 'ko hanja (tuỳ chọn) đủ âm tiết');
  ok(TL_RULES.ko.noGender && TL_RULES.ko.hangul && TL_RULES.ko.sub === 'lead' && !TL_RULES.ja.hangul && !TL_RULES.fr.hangul, 'luật riêng ko theo bảng TL_RULES');
  // cổng phải BẮT lỗi cài sẵn
  const bad = structuredClone(deck), W = x => bad.words.find(w => w.word === x);
  W('학교').pron = '학교'; W('한국어').romaja = 'hankukeo'; W('물').ipa = 'mul.'; W('책').topik = 7; W('먹다').conj = 'ㅂ'; delete W('마시다').conj; W('집').conj = 'reg';
  W('하늘').ex.ko = '오늘은 하늘이 정말 파랗다.'; W('신발').ex.ko = '이 신발은 very 작아요.'; W('개').gender = 'm'; W('태양').hanja = '太'; W('고양이').ex.ko = '강아지는 귀여워요.'; W('우유').pronX = { tense: [9] }; W('빵').word = '빵 ';
  const e2 = validate(bad, { img: imgKeys() }), has = re => e2.some(e => re.test(e)); if (process.env.KO_DBG) console.log(e2);
  ok([/pron 학교/, /romaja hankukeo/, /IPA mul\./, /topik/, /conj .*ㅂ/, /conj .*undefined/, /집: conj/, /lịch sự/, /lệch chuẩn/, /không có giống/, /hanja/, /không chứa/, /pronX sai/, /trọn âm tiết/].every(has), 'cổng ko bắt đủ 14 lỗi cài sẵn (pron, RR, IPA, topik, lớp chia sai/thiếu/thừa, thể thường, Latin trong câu, gender, hanja, câu thiếu từ, pronX, khoảng trắng): ' + e2.length);
  const ja0 = structuredClone(readJSON(seedPath('ja'))); ja0.words[0].pron = 'いえ'; ok(validate(ja0).some(e => /pron chỉ cho/.test(e)), 'trường ko (pron…) bị chặn ở ngôn ngữ khác');
  const sch = readJSON('content/target/ko/schema.json'), P = sch.properties.words.items; ok(sch.properties.variant.const === 'ko-KR' && ['pron', 'romaja', 'topik'].every(k => P.required.includes(k)) && !P.properties.gender && !P.properties.kana && P.properties.ex.required.join() === 'ko,en', 'schema ko: variant, pron/romaja/topik bắt buộc, không gender/kana, ex.ko');
  try { execFileSync(process.execPath, ['scripts/target/build.mjs', 'ko', '--check'], { stdio: 'pipe' }); ok(true); } catch (e) { ok(false, 'web/js/target-ko-seed.json lệch seed.json: ' + String(e.stdout || e.stderr)); }
  const web = readJSON('web/js/target-ko-seed.json'); ok(web.words.every(w => w.pron && w.romaja && w.topik) && web.words.filter(w => w.pos === 'v' || w.pos === 'adj').every(w => w.conj), 'bản sao app mang pron/romaja/topik/conj');
  ok(/w\.pron \? \{ pron: w\.pron, romaja: w\.romaja/.test(rd('web/js/settings.js')) && /tiếng Hàn vào Sổ từ/.test(rd('web/js/settings.js')), 'settings.js: thẻ ko giữ pron/romaja/conj + thông báo tiếng Hàn');
  const V = readJSON('scripts/word-audio/tl-voices.json'); ok(!V.ko.voices.length && V.ko.ipaCheck === 'pron' && V.ko.cut === false && V.ko.require.every(r => V.ko.alts.some(a => a.label === r)) && V.ko.alts.every(a => a.engine === 'supertonic' && /Open RAIL-M/.test(a.name)) && /g2pk2/.test(V.ko.pip), 'tl-voices.json: ko (không Kokoro; Supertonic 3 Open RAIL-M; phát âm seed ↔ g2pk2)');
  ok(/supertonic/.test(rd('scripts/word-audio/tl_piper.py')) && /ipaCheck'\) == 'pron'/.test(rd('scripts/word-audio/tl_ipa.py')) && /!VOICES\.length/.test(rd('scripts/word-audio/tl-sample.mjs')), 'lượt mẫu: động cơ supertonic, kiểm pron g2pk2, bỏ Kokoro khi bảng không có giọng');
  ok(/word-audio-ko/.test(rd('.github/workflows/word-audio-tl.yml')) && /tl: \[pt, es, fr, ja, ko\]/.test(rd('.github/workflows/target-content.yml')), 'workflow: nhãn word-audio-ko + ma trận target-content có ko');
  const { TL_GEN } = await import('../target/tl-gen.mjs'); ok(TL_GEN.ko.variant === 'ko-KR' && TL_GEN.ko.kaikki === 'Korean' && /ko_full/.test(TL_GEN.ko.source.url) && TL_GEN.ko.one.test('집') && !TL_GEN.ko.one.test('ㄱ'), 'tl-gen.mjs: dòng ko');
}
// ko-hangul.mjs: chữ Hangul (ghép/tách, IME), phát âm chuẩn, RR, IPA, tiểu từ, số + từ đếm, chia vị từ, chấm IME
{ const K = await import('../target/ko-hangul.mjs');
  ok(JSON.stringify(K.split('한')) === '{"l":"ㅎ","v":"ㅏ","t":"ㄴ"}' && K.join({ l: 'ㄱ', v: 'ㅘ', t: 'ㄴ' }) === '관' && K.split('a') === null, 'tách/ghép âm tiết');
  ok(K.compose('ㅅㅏㄱㅗㅏ') === '사과' && K.compose('ㄷㅏㄺㅣ') === '달기' && K.compose('ㅎㅏㄴㄱㅜㄱㅇㅓ') === '한국어' && K.compose('ㅇㅏㄴㄴㅕㅇ') === '안녕' && K.compose('ㅇㅣㅆㅇㅓ') === '있어', 'bộ gõ 2 hàng: jamo rời → âm tiết (nguyên âm kép, âm cuối nhảy, phụ âm kép)');
  const P = [['국물', '궁물'], ['학교', '학꾜'], ['같이', '가치'], ['굳이', '구지'], ['신라', '실라'], ['설날', '설랄'], ['종로', '종노'], ['협력', '혐녁'], ['값이', '갑씨'], ['닭이', '달기'], ['읽어', '일거'], ['좋아', '조아'], ['많아', '마나'], ['싫어', '시러'], ['축하', '추카'], ['입니다', '임니다'], ['먹는', '멍는'], ['꽃', '꼳'], ['부엌', '부억'], ['희망', '히망'], ['의사', '의사'], ['가져', '가저'], ['밖에', '바께'], ['있어요', '이써요'], ['괜찮아요', '괜차나요'], ['맛있어요', '마시써요'], ['놓는', '논는'], ['않네', '안네'], ['싫네', '실레'], ['밝히다', '발키다']];
  const pb = P.filter(([w, p]) => K.pron(w) !== p); ok(!pb.length, `phát âm chuẩn 30 ca (nối âm, ㅎ câm, vòm hoá, mũi/lỏng hoá, căng hoá, bật hơi, rút phụ âm kép, ㅢ/ㅕ): ${pb.map(([w]) => w + '→' + K.pron(w)).join(' ')}`);
  const VP = [['앉다', '안따'], ['넓다', '널따'], ['신다', '신따'], ['좋다', '조타'], ['맑다', '막따'], ['없다', '업따'], ['깨끗하다', '깨끄타다'], ['알다', '알다']];
  ok(VP.every(([w, p]) => K.pron(w, { verb: true }) === p), 'vị từ: căng hoá sau gốc ㄴ/ㄵ/ㄼ (안따, 널따, 신따), ㄹ đơn không căng (알다), ㅎ + ㄷ bật hơi');
  ok(K.pron('김밥', { x: { tense: [1] } }) === '김빱' && K.pron('담요', { x: { nIns: [1] } }) === '담뇨' && K.pron('의견란', { x: { nn: [2] } }) === '의견난' && K.pron('겉옷', { x: { noLiaison: [1] } }) === '거돋' && K.pron('밟다', { verb: true, x: { lbP: [0] } }) === '밥따', 'ngoại lệ theo từ: căng hoá 사이시옷, ㄴ 첨가, ㄴ+ㄹ → ㄴㄴ, trung hoà trước hình vị thực, 밟다');
  const R = [['한국', 'hanguk'], ['신라', 'silla'], ['종로', 'jongno'], ['국물', 'gungmul'], ['같이', 'gachi'], ['학교', 'hakgyo'], ['압구정', 'apgujeong'], ['묵호', 'mukho'], ['희망', 'huimang'], ['울릉', 'ulleung'], ['백마', 'baengma'], ['낙동강', 'nakdonggang'], ['해돋이', 'haedoji'], ['의자', 'uija']];
  ok(R.every(([w, r]) => K.romaja(w) === r) && K.romaja('좋고', { verb: true }) === 'joko', 'RR 2000 (ví dụ chính thức: Silla, Jongno, Apgujeong, Mukho, Haedoji, joko)');
  ok(K.ipa('학교') === 'hak̚k͈jo' && K.ipa('사과') === 'saɡwa' && K.ipa('친구') === 'tɕʰinɡu' && K.ipa('빨리') === 'p͈alli' && K.ipa('시') === 'ɕi' && K.ipa('쓰다', { verb: true }) === 's͈ɯda', 'IPA Seoul rộng (căng k͈, hữu thanh hoá giữa từ, ㄹㄹ = ll, ㅅ+i = ɕ)');
  ok(['사과', '책', '서울', '집'].map(n => [K.josa(n, 'topic'), K.josa(n, 'subj'), K.josa(n, 'obj'), K.josa(n, 'dir')].join()).join('|') === '사과는,사과가,사과를,사과로|책은,책이,책을,책으로|서울은,서울이,서울을,서울로|집은,집이,집을,집으로' && K.josa('학생', 'cop') === '학생이에요' && K.josa('의사', 'cop') === '의사예요', 'tiểu từ 은/는, 이/가, 을/를, (으)로 (ㄹ → 로), 이에요/예요');
  ok([0, 10, 16, 1000, 10000, 12345, 20000, 1e8, 2026].map(K.sino).join() === '영,십,십육,천,만,만이천삼백사십오,이만,일억,이천이십육' && [1, 2, 3, 4, 20, 21, 99].map(n => K.native(n, { attr: true })).join() === '한,두,세,네,스무,스물한,아흔아홉', 'số Hán-Hàn (십 không 일십, 만 không 일만) + thuần Hàn dạng định ngữ');
  ok(K.count(3, '개') === '세 개' && K.count(20, '살') === '스무 살' && K.count(2, '시') === '두 시' && K.count(30, '분') === '삼십 분' && K.count(5000, '원') === '오천 원' && K.count(6, '월') === '유월' && K.count(10, '월') === '시월', 'từ đếm chọn đúng hệ số (giờ thuần Hàn, phút Hán-Hàn, 유월/시월)');
  const C = [['가다', 'reg', '가요', '갔어요', '갑니다'], ['먹다', 'reg', '먹어요', '먹었어요', '먹습니다'], ['보다', 'reg', '봐요', '봤어요', '봅니다'], ['마시다', 'reg', '마셔요', '마셨어요', '마십니다'], ['되다', 'reg', '돼요', '됐어요', '됩니다'], ['공부하다', '하', '공부해요', '공부했어요', '공부합니다'],
    ['돕다', 'ㅂ', '도와요', '도왔어요', '돕습니다'], ['춥다', 'ㅂ', '추워요', '추웠어요', '춥습니다'], ['듣다', 'ㄷ', '들어요', '들었어요', '듣습니다'], ['낫다', 'ㅅ', '나아요', '나았어요', '낫습니다'], ['파랗다', 'ㅎ', '파래요', '파랬어요', '파랗습니다'], ['하얗다', 'ㅎ', '하얘요', '하얬어요', '하얗습니다'],
    ['모르다', '르', '몰라요', '몰랐어요', '모릅니다'], ['부르다', '르', '불러요', '불렀어요', '부릅니다'], ['쓰다', '으', '써요', '썼어요', '씁니다'], ['바쁘다', '으', '바빠요', '바빴어요', '바쁩니다'], ['살다', 'ㄹ', '살아요', '살았어요', '삽니다'], ['푸다', '우', '퍼요', '펐어요', '풉니다'], ['이르다', '러', '이르러요', '이르렀어요', '이릅니다'], ['아니다', '이', '아니에요', '아니었어요', '아닙니다']];
  const cb = C.filter(([w, c, h, p, f]) => !K.conjShape(w, c) || K.conj(w, c, 'haeyo') !== h || K.conj(w, c, 'past') !== p || K.conj(w, c, 'hamnida') !== f);
  ok(!cb.length, '해요/과khứ/합니다 cho 20 vị từ (quy tắc rút nguyên âm + bất quy tắc ㅂ ㄷ ㅅ ㅎ 르 러 으 ㄹ 우 이): ' + cb.map(x => x[0]).join(' '));
  ok(!K.conjShape('먹다', 'ㅂ') && !K.conjShape('좋다', 'ㅎ') && !K.conjShape('사과', 'reg') && K.conjShape('입다', 'reg'), 'lớp chia khớp hình thức gốc (좋다 không phải ㅎ bất quy tắc)');
  ok(K.same('사과', '사과') === 'ok' && K.same('사과'.normalize('NFD'), '사과') === 'ok' && K.same('ㅅㅏㄱㅗㅏ', '사과') === 'ok' && K.same('한국 어', '한국어') === 'spacing' && K.same('사가', '사과') === '' && K.same('', '사과') === '', 'chấm IME: NFD/jamo rời = đúng, sai cách chữ = nhận kèm nhắc, sai chữ = sai');
  let thr = false; try { K.pron('사과a'); } catch { thr = true; } ok(thr, 'ký tự ngoài Hangul → lỗi (không đoán)'); }

// W1 ja: ứng viên JLPT (csv có trích dẫn), derive (kana/jlpt theo nguồn, romaji/IPA sinh, cao độ ngoài khoảng → 0 + qa), gói web/packs/tl/ja khớp nguồn, longFold
{ const { csvRows, jlptCands, TL_GEN } = await import('../target/tl-gen.mjs'), J = await import('../target/ja-kana.mjs');
  ok(JSON.stringify(csvRows('a,b\n"x, y","say ""hi"""\n')) === JSON.stringify([['a', 'b'], ['x, y', 'say "hi"']]), 'csvRows: dấu phẩy + ngoặc kép trong trường');
  const fake = { 5: 'expression,reading,meaning,tags\n食べる,たべる,to eat,JLPT\n明日,あした、あす,tomorrow,JLPT\n〜時,じ,o-clock,JLPT\n', 4: 'expression,reading,meaning\n食べる,たべる,to eat\n運転,うんてん,driving\n' };
  const c = await jlptCands(u => Promise.resolve(fake[(/n(\d)\.csv$/.exec(u) || [])[1]] || 'expression,reading,meaning\n'));
  ok(c.map(x => x.form).join() === '食べる,明日,運転' && c[1].hint.kana === 'あした' && c[2].hint.jlpt === 4 && c[0].hint.jlpt === 5, 'jlptCands: N5 trước, trùng giữ cấp thấp, nhiều cách đọc → cách đầu, bỏ 〜');
  ok(TL_GEN.ja.lemma === false && TL_GEN.ja.cands === jlptCands && /JLPT/.test(TL_GEN.ja.source.name), 'TL_GEN.ja: nguồn JLPT, không quy lemma kaikki');
  const d = TL_RULES.ja.derive({ word: '話す', pos: 'v', gender: 'm', kana: 'はなし', romaji: 'x', ipa: 'x', pitch: 9, jlpt: 1, vclass: 'godan' }, { form: '話す', kana: 'はなす', jlpt: 5 });
  ok(d.kana === 'はなす' && d.jlpt === 5 && d.romaji === 'hanasu' && d.ipa === 'hanasɯ' && d.pitch === 0 && d.qa.pitchAi === 9 && !('gender' in d), 'derive: cách đọc + cấp theo nguồn, romaji/IPA sinh, cao độ ngoài khoảng → 0 + qa.pitchAi, bỏ gender');
  const d2 = TL_RULES.ja.derive({ word: '話し', pos: 'n', kana: 'はなし', pitch: 3, jlpt: 4 }, { form: '話す', kana: 'はなす', jlpt: 5 }); ok(d2.kana === 'はなし' && d2.jlpt === 4 && d2.pitch === 3, 'derive: người soạn đổi mục từ → không áp cách đọc nguồn');
  const g = rd('scripts/target/gen.mjs'); ok(/G\.cands \? await G\.cands\(\)/.test(g) && /R\.derive \? R\.derive\(o, hint\)/.test(g) && /G\.lemma === false/.test(g) && !/'ja'/.test(g), 'gen.mjs: nguồn/derive/lemma theo bảng, không nhánh ja');
  const tc = rd('.github/workflows/target-content.yml'); ok(/tl_ja_fill\.py --self/.test(tc) && tc.includes(`'.[$t].ipaCheck // ""' scripts/word-audio/tl-voices.json)" = "reading" ] && exit 0`), 'target-content: OpenJTalk cao độ/cách đọc cho ja, espeak không ghi đè IPA ja');
  ok(J.longFold('たいよう') === J.longFold('タイヨー') && J.longFold('がっこう') === J.longFold('ガッコー') && J.longFold('おもう') === 'おもー' && J.longFold('ちいさい') === 'ちーさい', 'longFold: trường âm viết kiểu nào cũng so được');
  const P = await import('../target/tl-pack.mjs'), b = P.build('ja');
  ok(!b.err.length && b.n === 30 && Object.keys(b.out).length === 15, 'tl-pack ja: seed (lô đã duyệt) × 15 ngôn ngữ');
  const vi = JSON.parse(b.out.vi), col = k => vi.cols.indexOf(k), w0 = vi.words.find(r => r[0] === '食べる');
  ok(!vi.cols.includes('gender') && w0[col('kana')] === 'たべる' && w0[col('gl')] === 'ăn' && w0[col('vclass')] === 'ichidan' && w0[col('exForm')] === '食べます', 'gói ja: cột theo dữ liệu (không gender), nghĩa đúng ngôn ngữ');
  try { execFileSync(process.execPath, ['scripts/target/tl-pack.mjs', 'ja', '--check'], { stdio: 'pipe' }); ok(true); } catch (e) { ok(false, 'web/packs/tl/ja lệch nguồn: ' + String(e.stderr)); } }

// W2 ja: bộ chia (conj-ja.mjs) – ichidan/godan/bất quy tắc, chữ + kana song song, ngoại lệ 行く/ある/kính ngữ, (…)来る/〜する; kiểm chéo Wiktionary ở CI
{ const C = await import('../target/conj-ja.mjs'), c = v => C.conjugate(v), wk = (v, f) => { const x = c(v)[f]; return x.w + '/' + x.k; };
  const tabe = { word: '食べる', kana: 'たべる', vclass: 'ichidan' }, kaku = { word: '書く', kana: 'かく', vclass: 'godan' }, kuru = { word: '来る', kana: 'くる', vclass: 'irregular' };
  ok(wk(tabe, 'masu') === '食べます/たべます' && wk(tabe, 'te') === '食べて/たべて' && wk(tabe, 'nai') === '食べない/たべない' && wk(tabe, 'pot') === '食べられる/たべられる' && wk(tabe, 'imp') === '食べろ/たべろ' && wk(tabe, 'ba') === '食べれば/たべれば', 'ichidan 食べる');
  ok(wk(kaku, 'masu') === '書きます/かきます' && wk(kaku, 'te') === '書いて/かいて' && wk(kaku, 'ta') === '書いた/かいた' && wk(kaku, 'nai') === '書かない/かかない' && wk(kaku, 'vol') === '書こう/かこう' && wk(kaku, 'pot') === '書ける/かける' && wk(kaku, 'ba') === '書けば/かけば', 'godan 書く');
  const te = (word, kana) => C.form({ word, kana, vclass: 'godan' }, 'te').k;
  ok([['買う', 'かう', 'かって'], ['待つ', 'まつ', 'まって'], ['帰る', 'かえる', 'かえって'], ['飲む', 'のむ', 'のんで'], ['遊ぶ', 'あそぶ', 'あそんで'], ['死ぬ', 'しぬ', 'しんで'], ['泳ぐ', 'およぐ', 'およいで'], ['話す', 'はなす', 'はなして'], ['行く', 'いく', 'いって']].every(([w, k, t]) => te(w, k) === t), 'て形 đủ 9 đuôi godan + ngoại lệ 行く→行って');
  ok(C.form({ word: '買う', kana: 'かう', vclass: 'godan' }, 'nai').k === 'かわない' && C.form({ word: 'ある', kana: 'ある', vclass: 'godan' }, 'nai').k === 'ない' && C.form({ word: 'いらっしゃる', kana: 'いらっしゃる', vclass: 'godan' }, 'masu').k === 'いらっしゃいます', 'う→わ, ある→ない, いらっしゃいます');
  ok(wk(kuru, 'nai') === '来ない/こない' && wk(kuru, 'masu') === '来ます/きます' && wk(kuru, 'ba') === '来れば/くれば' && wk(kuru, 'imp') === '来い/こい' && wk({ word: '持って来る', kana: 'もってくる', vclass: 'irregular' }, 'te') === '持って来て/もってきて', '来る đổi cách đọc gốc, (…)来る');
  ok(wk({ word: 'する', kana: 'する', vclass: 'irregular' }, 'pot') === 'できる/できる' && wk({ word: '勉強する', kana: 'べんきょうする', vclass: 'irregular' }, 'masu') === '勉強します/べんきょうします' && wk({ word: '勉強する', kana: 'べんきょうする', vclass: 'irregular' }, 'zu') === '勉強せず/べんきょうせず', 'する / 〜する');
  ok(C.FORMS.length === 20 && C.KNOWN.length >= 30 && C.KNOWN.some(v => v.vclass === 'irregular') && readJSON(seedPath('ja')).words.filter(w => w.pos === 'v').every(w => C.FORMS.every(f => c(w)[f].w && c(w)[f].k)), 'đủ 20 dạng cho mọi động từ seed');
  let thr = 0; try { c({ word: '猫', kana: 'ねこ', vclass: 'godan' }); } catch { thr = 1; } ok(thr, 'godan không tận cùng hàng u → lỗi (không đoán)');
  ok(/conj-ja-check\.mjs/.test(rd('.github/workflows/target-content.yml')), 'target-content: kiểm chéo chia ja ↔ Wiktionary trên PR'); }

// W3 ja: bài phát âm (content/target/ja/pron.json) – cặp tối thiểu KHÁC âm hoặc KHÁC cao độ, IPA + dấu hạ SINH từ kana, gói px khớp nguồn, đủ 15 ngôn ngữ, ví dụ giữ nguyên chữ Nhật
{ const J = await import('../target/ja-kana.mjs'), P = await import('../target/px-lib.mjs'), pr = readJSON('content/target/ja/pron.json'), R = pr.read, VN = /[ơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹđă]/i;
  ok(pr.topics.map(t => t.id).join() === P.TLX.ja.topics.join() && pr.topics.length === 8, 'ja pron: 8 chủ đề đúng thứ tự');
  const used = new Set(pr.topics.flatMap(t => [...t.ex, ...t.dict, ...t.say, ...t.pairs.flatMap(p => p.split('/'))]));
  ok([...used].every(w => R[w]) && Object.keys(R).every(w => used.has(w)), 'ja pron: mọi từ có read và mọi read được dùng');
  ok(Object.entries(R).every(([w, [k, p]]) => J.isKana(k) && (J.hasKanji(w) ? J.ruby(w, k) : J.hira(w) === J.hira(k)) && Number.isInteger(p) && p >= 0 && p <= J.morae(k)), 'ja pron: kana khớp chữ (furigana), cao độ trong 0…mora');
  const sig = w => J.ipa(R[w][0]) + '|' + R[w][1], bad = [];
  for (const t of pr.topics) for (const p of t.pairs) { const [a, b] = p.split('/'); if (a === b || sig(a) === sig(b)) bad.push(p); }
  ok(!bad.length, 'ja pron: mọi cặp tối thiểu KHÁC âm hoặc KHÁC cao độ (đồng âm đồng cao độ bị chặn)' + (bad.length ? ': ' + bad.join(', ') : ''));
  const pitchPairs = pr.topics.find(t => t.id === 'pitch').pairs; ok(pitchPairs.every(p => { const [a, b] = p.split('/'); return J.ipa(R[a][0]) === J.ipa(R[b][0]) && R[a][1] !== R[b][1]; }), 'ja pron: chủ đề cao độ = cặp CÙNG âm KHÁC cao độ');
  const longP = pr.topics.find(t => t.id === 'long').pairs.slice(0, 4); ok(longP.every(p => { const [a, b] = p.split('/'); return J.morae(R[a][0]) !== J.morae(R[b][0]) || J.ipa(R[a][0]) !== J.ipa(R[b][0]); }), 'ja pron: cặp trường âm khác độ dài');
  ok(J.accentKana('はし', 1) === 'はꜜし' && J.accentKana('はし', 2) === 'はしꜜ' && J.accentKana('はし', 0) === 'はし' && J.accentKana('きょう', 1) === 'きょꜜう' && J.accentKana('びよういん', 2) === 'びよꜜういん', 'accentKana: dấu hạ sau mora, ゃゅょ đi cùng mora trước');
  const src = P.buildPx('ja'); ok(src.topics.length === 8 && src.topics[5].p.every(p => p[1].includes('ꜜ') || p[3].includes('ꜜ')) && src.GX_LANGS.length === 15, 'buildPx ja: 8 chủ đề, IPA+dấu hạ sinh từ kana, 15 ngôn ngữ');
  const en = readJSON('content/target/ja/px/en.json'), qt = s => (s.match(/[「“][^」”]*[」”]/g) || []).join(); let miss = [];
  for (const l of src.GX_LANGS) { const d = readJSON(`content/target/ja/px/${l}.json`);
    for (const k of P.PX_UI) if (!d.ui[k] || (l !== 'vi' && VN.test(d.ui[k]))) miss.push(`${l}.ui.${k}`);
    for (const t of pr.topics) { const x = d.tp[t.id]; if (!x || !x.t || !x.x) miss.push(`${l}.tp.${t.id}`); else if (l !== 'vi' && VN.test(x.t + x.x)) miss.push(`${l}.tp.${t.id} lẫn tiếng Việt`); else if (!/[ぁ-んァ-ン一-龥]/.test(x.x)) miss.push(`${l}.tp.${t.id} thiếu ví dụ tiếng Nhật`); } }
  ok(!miss.length, 'ja px: đủ 15 ngôn ngữ × 8 chủ đề + 15 nhãn, ví dụ tiếng Nhật giữ nguyên' + (miss.length ? ': ' + miss.slice(0, 6).join(', ') : ''));
  void en; void qt;
  try { execFileSync(process.execPath, ['scripts/target/px-pack.mjs', 'ja', '--check'], { stdio: 'pipe' }); ok(true); } catch (e) { ok(false, 'web/packs/tl/ja/px* lệch nguồn: ' + String(e.stderr)); }
  ok(!/px\.js|JAX/.test(rd('web/cpack/tl-app/tl-pick.js')) && /--pron/.test(rd('.github/workflows/target-content.yml')), 'gói px ja ngoài cpack; CI đối chiếu OpenJTalk'); }

// ---------- 5) nối dây: shell nạp target.js trước core.js; package test ----------
{
  const html = rd('web/app/index.html'), a = html.indexOf('js/target.js'), b = html.indexOf('js/core.js');
  ok(a > 0 && a < b, 'index.html nạp target.js trước core.js');
  ok(/'\/js\/target\.js'/.test(rd('web/sw.js')), 'sw.js cache target.js');
}

// 19/11: ready:false (fr/pt chưa có khóa thật) – cờ vẫn quyết enabled(), nhưng chỉ quản trị chọn được; người thường cur() = en, avail() không có
{ const { sb, ls } = env(); load(sb, 'web/js/target.js'); const T = sb.Target;
  ls.set('lk.pt', '1'); T.set('pt'); ok(T.enabled('pt') && T.cur() === 'en' && T.avail().join() === 'en', 'pt ready:false: cờ bật nhưng người thường không chọn được (cur = en)');
  ls.set('lk.fr', '1'); T.set('fr'); ok(T.enabled('fr') && T.cur() === 'fr' && T.avail().includes('fr'), 'fr sẵn sàng (W7, french-course.md): cờ bật → người thường chọn được fr');
  ls.set('lk.ja', '1'); T.set('ja'); ok(T.enabled('ja') && T.cur() === 'en' && T.table('ja').ready === false, 'ja ready:false: như pt');
  ls.set('lk.ko', '1'); T.set('ko'); ok(T.enabled('ko') && T.cur() === 'en' && T.table('ko').ready === false, 'ko ready:false: như pt');
  ls.set('lk.adm', '1'); T.set('fr'); ok(T.cur() === 'fr' && T.avail().includes('fr') && T.homeOf('fr') === '#/practice/frd', 'quản trị chọn được fr → lộ trình ngày fr (W4, cùng engine es)');
  ls.set('lk.es', '1'); T.set('es'); ok(T.cur() === 'es', 'es ready → vẫn chọn được'); }

// gen.mjs quy dạng → lemma trước ai-pool (lô 11–24 mất 40–90 % lượt vì dạng chia trùng lemma): hàm thuần lemmaFromEntries
{ const { lemmaFromEntries: L } = await import('../target/lib.mjs');
  const fo = w => ({ form_of: [{ word: w }], tags: ['form-of'] });
  ok(JSON.stringify(L('hacemos', [{ pos: 'verb', senses: [fo('hacer')] }]).lemmas) === '["hacer"]', 'dạng chia → lemma (hacemos → hacer)');
  ok(JSON.stringify(L('traje', [{ pos: 'noun', senses: [{ glosses: ['suit'] }] }, { pos: 'verb', senses: [fo('traer')] }]).lemmas) === '["traje"]', 'dạng vừa là mục từ thật vừa là dạng chia → chỉ chính nó (traje; traer đến từ dạng của nó, đúng thứ hạng)');
  ok(L('york', [{ pos: 'name', senses: [{ glosses: ['York'] }] }]).name === true, 'trang chỉ tên riêng → bỏ trước AI');
  ok(JSON.stringify(L('xyz', []).lemmas) === '["xyz"]', 'không có trang → vẫn gửi AI (cổng phía sau giữ nguyên)'); }

console.log(fails ? `✗ target-lang: ${fails}/${n} lỗi` : `✓ target-lang: ${n}/${n} đạt`);
process.exit(fails ? 1 : 0);
