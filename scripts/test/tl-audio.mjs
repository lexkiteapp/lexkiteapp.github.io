// Âm thanh câu của ngôn ngữ đích (french-course.md §10 W6 · spanish-course.md §10 W2b): corpus theo bảng tl (scripts/sentence-audio/corpus-tl.mjs), công cụ dựng theo tl-voices.json (engine.mjs),
// app phát file dựng sẵn khi có / giọng máy khi chưa (UI.tts → Target.kokoroVoice → KVoice.lineKey ∈ LISTEN_AUDIO).
//  (a) công cụ: fr = Piper (giọng require = nhãn piper của dòng), es = Kokoro (không đổi)  (b) corpus fr: > 0, không trùng, đúng tiếng Pháp, không trộn tu/vous, khóa ổn định + tất định
//  (c) es: corpus giữ nguyên khóa + giọng ef_dora/em_alex  (d) ánh xạ phát (jsdom, ui.js thật): fr có file → phát file đúng khóa; chưa có → giọng máy fr-FR; Carlos không còn nhãn ở fr
// Chạy: node scripts/test/tl-audio.mjs
import fs from 'node:fs'; import path from 'node:path'; import vm from 'node:vm'; import jsdom from 'jsdom';
import { collectTl, TL_AUDIO, tlVoices } from '../sentence-audio/corpus-tl.mjs'; import { engineOf, VOICES } from '../sentence-audio/engine.mjs';
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.error('✗', m); } else console.log('✓', m); };
const rd = f => fs.readFileSync(f, 'utf8');
const ctx = { self: {} }; ctx.self = ctx; vm.createContext(ctx); for (const f of ['web/js/listen/kvoice.js', 'web/js/target.js']) vm.runInContext(rd(f), ctx);
const { KVoice, Target } = ctx, V = VOICES();

// (a) công cụ theo bảng
ok(TL_AUDIO.join() === 'es,fr' && engineOf('fr') === 'piper' && engineOf('es') === 'kokoro', 'engine: fr = Piper, es = Kokoro (theo tl-voices.json require)');
ok(V.fr.piper.name === 'fr_FR-siwis-medium' && V.fr.require.join() === V.fr.piper.label && !(V.fr.require || []).some(l => /gilles|tom/.test(l)), 'fr: giọng dùng thật = Piper fr_FR-siwis-medium, không giọng nam');
ok(tlVoices('fr').ama === 'fr_siwis' && !tlVoices('fr').carlos && tlVoices('es').ama === 'ef_dora' && tlVoices('es').carlos === 'em_alex', 'giọng theo Target: fr chỉ Ama (fr_siwis), es Ama/Carlos như cũ');

// (b) corpus fr
const A = collectTl('fr'), B = collectTl('fr'), texts = [...A.jobs.values()].map(j => j.text);
ok(A.jobs.size > 1000 && new Set(texts).size === A.jobs.size, `corpus fr: ${A.jobs.size} dòng > 0, không trùng chữ (khóa không đụng)`);
ok([...A.jobs.keys()].join() === [...B.jobs.keys()].join(), 'corpus fr tất định (hai lần dựng cùng khóa, cùng thứ tự)');
ok([...A.jobs].every(([k, j]) => j.voice === 'fr_siwis' && k === KVoice.lineKey('fr_siwis', j.text) && j.text === j.text.trim() && !/\s{2}/.test(j.text) && j.text.length <= 220), 'mọi dòng: giọng fr_siwis, khóa = KVoice.lineKey(giọng, chữ), gọn, ≤ 220 ký tự');
ok(KVoice.lineKey('fr_siwis', 'maison') === 'thtipq' && KVoice.lineKey('ef_dora', 'casa') === '1mmvfed', 'khóa ổn định: hàm băm + tiền tố giọng không đổi (đổi = mất toàn bộ file đã dựng)');
const P = { l: '\\p{L}' }, word = w => new RegExp(`(?<!\\p{L})(?:${w})(?!\\p{L})`, 'iu');
const EN = word('the|and|is|are|was|you|they|with|from|this|that|have|what|where|there'), ES = /[ñ¿¡]/, VI = /[ơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹđ]/i;
const FRW = word("le|la|les|un|une|des|de|du|et|est|je|tu|il|elle|on|nous|vous|ils|elles|ne|pas|ce|cet|cette|qui|que|à|au|aux|en|dans|sur|avec|pour|mon|ma|mes|ton|ta|son|sa|ses|notre|votre|leur|y|se|me|te|lui|sont|suis|es|êtes|sommes|ai|as|a|ont|avons|avez|quel|quelle|quels|quelles|bon|bonne|merci|ceci|cela|tout|tant|alors|ici|là|oui|non|très|plus|moins|si|ou|où|mais|donc|car|ni");
// mạo từ/đại từ lược âm (l' d' j' n' c' qu' s' m' t') dính liền chữ sau → không đòi ranh giới chữ phía sau như từ thường (hồi quy: "L'ambulance arrive rapidement.")
const ELI = /(?<!\p{L})(?:l|d|j|n|c|qu|s|m|t)['’]\p{L}/iu, FR = { test: t => FRW.test(t) || ELI.test(t) }, ACC = /[éèêëàâçîïôœùûü]/i;
ok(["L'ambulance arrive rapidement.", 'J’arrive demain matin.', "Qu'il vienne vite."].every(t => FR.test(t)) && !FR.test('Fast cars drive quickly.') && !FR.test("Rock'n roll tonight"), 'nhận dạng lược âm (l\' j’ qu\') mà không nhận nhầm câu không phải tiếng Pháp');
const notFr = texts.filter(t => EN.test(t) || ES.test(t) || VI.test(t)), long = texts.filter(t => t.split(/\s+/).length >= 3 && !FR.test(t) && !ACC.test(t));
ok(!notFr.length, 'không dòng nào chứa từ tiếng Anh/ký tự TBN/Việt' + (notFr.length ? ': ' + notFr.slice(0, 5).join(' | ') : ''));
ok(!long.length, 'mọi câu ≥ 3 chữ có từ chức năng/dấu tiếng Pháp' + (long.length ? ': ' + long.slice(0, 5).join(' | ') : ''));
const TU = word("tu|toi|ton|ta|tes|t['’]"), VOUS = word('vous|votre|vos'), mix = texts.filter(t => TU.test(t) && VOUS.test(t));
ok(!mix.length, 'không dòng nào trộn tu và vous' + (mix.length ? ': ' + mix.slice(0, 5).join(' | ') : ''));
ok(texts.some(t => /^[\p{L}]+$/u.test(t)) && texts.some(t => / /.test(t)) && texts.length === new Set(texts.map(t => t.normalize('NFC'))).size, 'có cả từ đơn lẫn câu; đã chuẩn NFC, không trùng');

// (c) es giữ nguyên
const E = collectTl('es');
ok(E.jobs.size > 1000 && new Set([...E.jobs.values()].map(j => j.voice)).size === 2 && [...E.jobs].every(([k, j]) => k === KVoice.lineKey(j.voice, j.text) && /^(ef_dora|em_alex)$/.test(j.voice)), `corpus es: ${E.jobs.size} dòng, giọng ef_dora/em_alex, khóa = lineKey`);
ok(![...E.jobs.keys()].some(k => A.jobs.has(k)), 'khóa es và fr không đụng nhau (không gian khóa theo giọng)');

// (d) ánh xạ phát: UI.tts thật trong jsdom
const dom = new jsdom.JSDOM('<!doctype html><body></body>', { url: 'http://localhost/', runScripts: 'outside-only' }), w = dom.window, said = [];
w.speechSynthesis = { speaking: false, paused: false, pending: false, getVoices: () => [], cancel() { }, pause() { }, resume() { }, addEventListener() { }, speak(u) { said.push({ text: u.text, lang: u.lang }); setTimeout(() => u.onend && u.onend(), 0); } };
w.SpeechSynthesisUtterance = function (t) { this.text = t; }; w.matchMedia = () => ({ matches: false, addEventListener() { }, addListener() { } });
w.App = { state: { settings: { accent: 'fr-FR', hqVoice: true } } }; w.Chars = { ids: ['ama', 'carlos'], voice: x => ({ ama: 'af_heart', carlos: 'am_michael' })[x] };
const sentence = [...A.jobs.values()].find(j => /^[A-ZÉ].{20,60}\.$/.test(j.text)).text, word1 = 'maison';
w.LISTEN_AUDIO = new Set([KVoice.lineKey('fr_siwis', sentence), KVoice.lineKey('fr_siwis', word1)]);
for (const f of ['web/js/listen/kvoice.js', 'web/js/target.js', 'web/js/audio.js', 'web/js/ui.js']) w.eval(rd(f));
const played = []; w.LKAudio.play = (urls, o) => { played.push(urls[0]); setTimeout(() => o && o.onEnd && o.onEnd(), 0); return { stop() { } }; }; w.LKAudio.preload = () => { };
const tick = () => new Promise(r => setTimeout(r, 20));
w.Target.cur = () => 'fr';
w.UI.tts(sentence, 'fr-FR'); await tick();
ok(played.length === 1 && played[0].endsWith('/' + KVoice.lineKey('fr_siwis', sentence) + '.mp3') && !said.length, 'fr-FR + câu có file: phát audio/l/<khóa fr_siwis>.mp3, không đọc giọng máy');
played.length = 0; w.UI.tts(word1, 'fr-CA'); await tick();
ok(played.length === 1 && played[0].endsWith('/' + KVoice.lineKey('fr_siwis', word1) + '.mp3'), 'fr-CA + từ đơn có file: cùng giọng fr_siwis');
played.length = 0; w.UI.tts('Je voudrais un café, s’il vous plaît.', 'fr-FR'); await tick();
ok(!played.length && said.length === 1 && said[0].lang === 'fr-FR', 'chưa có file: rơi về giọng máy fr-FR');
played.length = 0; said.length = 0; w.UI.tts(sentence, 'fr-FR', undefined, { voice: w.Target.teacherVoice('ama', 'fr') }); await tick();
ok(played.length === 1 && played[0].endsWith('/' + KVoice.lineKey('fr_siwis', sentence) + '.mp3'), 'giọng giáo viên Ama (opts.voice từ Target) → cùng file');
played.length = 0; w.UI.tts(sentence, 'fr-FR', undefined, { voice: w.Target.teacherVoice('carlos', 'fr') || w.Chars.voice('carlos') }); await tick();
ok(played.length === 1 && played[0].endsWith('/' + KVoice.lineKey('fr_siwis', sentence) + '.mp3') && w.Target.teacherVoice('carlos', 'fr') === '', 'fr không có Carlos: vai nam rơi về Ama, Target không gán nhãn Carlos');
ok(w.Target.kokoroVoice('fr-BE') === 'fr_siwis' && w.Target.wordVoice('fr-FR') === '' && w.Target.kokoroVoice('en-GB') === 'bf_emma' && w.Target.kokoroVoice('es-MX') === 'ef_dora', 'Target: fr-BE cùng giọng, wordFiles fr = giọng file câu (không audio/w), en/es không đổi');
ok(rd('web/js/target.js') === rd('extension/app/js/target.js'), 'extension/app/js/target.js khớp web/js/target.js');
console.log(fails ? `✗ ${fails} lỗi` : '✓ tl-audio'); process.exit(fails ? 1 : 0);
