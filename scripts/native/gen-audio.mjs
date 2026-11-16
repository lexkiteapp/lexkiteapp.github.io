/* Native M2 – audio (C04) conformance vectors. Reference = the REAL web code:
 *   web/js/audio.js        genderOf · kokoro · genderFor · voiceScore · rank · pickVoice · fnv36 (node export of LKAudio)
 *   web/js/ui.js           the CDN block (AUDIO_BASES · baseAt · lk · audioUrls · audioFail), WAV suffix, the word-file key expression and ttsClean – their exact source
 *                          lines are sliced out and evaluated in node:vm (nothing re-typed here)
 *   web/js/listen/kvoice.js lineKey (sentence file key) + split (sentence segments) · web/js/target.js wordVoice (default Kokoro voice per accent)
 * Exports audioVectors() → JSON string for native/shared/gen/vectors/audio.json. Used by scripts/native/gen.mjs. */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const R = p => path.join(ROOT, p);
const rq = createRequire(import.meta.url);

function run(files, extra = {}) { const sb = { console, ...extra }; sb.self = sb; sb.window = sb; sb.globalThis = sb; vm.createContext(sb); for (const f of files) vm.runInContext(fs.readFileSync(R(f), 'utf8'), sb, { filename: f }); return sb; }

export function audioVectors() {
  const A = rq(R('web/js/audio.js')); // node: module.exports = api (no DOM)
  if (!A.pickVoice || !A.genderOf) throw new Error('gen-audio: web/js/audio.js did not export its pure API in node');
  const ui = fs.readFileSync(R('web/js/ui.js'), 'utf8');
  const slice = (from, toIncl) => { const a = ui.indexOf(from), b = ui.indexOf(toIncl, a); if (a < 0 || b < 0) throw new Error('gen-audio: ui.js block not found: ' + from); return ui.slice(a, ui.indexOf('\n', b)); };
  const cdnSrc = slice('let cdnFail = 0;', 'g.audioHas = ');
  const mkCdn = (fails, s2) => { const g = { LISTEN_AUDIO_S2: new Set(s2 || []) }; vm.runInContext(`(function (g) { ${cdnSrc}\n })`, vm.createContext({}))(g); for (let i = 0; i < fails; i++) g.audioFail(); return g; };
  const WAV = (/const WAV = '([^']*)';/.exec(ui) || [])[1];
  if (!WAV) throw new Error('gen-audio: WAV suffix not found in web/js/ui.js');
  const uiFnv = vm.runInNewContext('(' + /fnv36 = (s => \{[^\n]*?return h\.toString\(36\); \})/.exec(ui)[1] + ')'); // ui.js's own copy must equal audio.js's
  const wordExpr = /const wv = g\.Target \? g\.Target\.wordVoice\(accent\) : (accent === 'en-US' \? 'af_heart' : 'bf_emma');/.exec(ui);
  if (!wordExpr) throw new Error('gen-audio: word voice expression changed in web/js/ui.js speak()');
  if (!/g\.audioUrls\(fnv36\(v \+ '\|' \+ we\.word\.trim\(\) \+ WAV\), 'w'\)/.test(ui)) throw new Error('gen-audio: word file key expression changed in web/js/ui.js speak()');
  const cleanSrc = (() => { const a = ui.indexOf('const EMO = /[\\p{Extended_Pictographic}'), b = ui.indexOf('// tts(text, accent, rate, opts)'); if (a < 0 || b < 0) throw new Error('gen-audio: ttsClean block not found'); return ui.slice(a, b); })();
  const ttsClean = vm.runInNewContext(`(function () { const t = x => x; ${cleanSrc}\n return ttsClean; })()`);
  const KV = run(['web/js/listen/kvoice.js']).KVoice, Target = run(['web/js/target.js'], { navigator: { language: 'en' }, localStorage: { getItem: () => null, setItem() {} } }).Target;
  const Chars = run(['web/js/characters.js']).Chars;

  const o = { // the exact order of origins and what each failure does
    bases: mkCdn(0).AUDIO_BASES, wordSuffix: WAV,
    rules: {
      sentence: 'GET <base>/<key>.mp3 (kind l); cue version: <key>-ls.mp3. key = KVoice.lineKey(voice, text) = fnv36(voice + "|" + text.trim()). "-s2" is appended to <key> (not to <key>-ls) when the key is in LISTEN_AUDIO_S2.',
      word: 'GET <base with /l/ → /w/>/<key>.mp3, key = fnv36(voice + "|" + headword.trim() + wordSuffix) (voice = Target.wordVoice(accent): en-US af_heart, en-GB bf_emma). Headword = the dictionary entry word, case as stored.',
      origins: 'urls = bases.slice(baseAt) mapped to URLs, baseAt = min(bases.length-1, fails >> 1) (each origin gets 2 failures before the next is the first choice); a request that errors / 404s / takes > 7 s moves to the next URL in the list; list exhausted → system TTS. A blocked autoplay is NOT a miss.',
    },
  };
  const urlCase = (kind, key, fails, s2) => { const g = mkCdn(fails, s2); return { kind, key, fails, s2: s2 || [], urls: g.audioUrls(key, kind) }; };
  o.urls = [
    ...[0, 1, 2, 3, 4, 5, 6, 9].map(f => urlCase('l', 'abc123', f)), ...[0, 2, 4, 5].map(f => urlCase('w', 'k9z8', f)),
    urlCase('l', 'abc123', 0, ['abc123']), urlCase('l', 'abc123-ls', 0, ['abc123']), urlCase('l', 'abc123-ls', 2, ['abc123-ls']), urlCase('w', 'k9z8', 0, ['k9z8']),
  ];

  const fnvCases = ['', 'a', 'af_heart|consider|s3', 'bf_emma|key card|s3', 'af_heart|We decided to stay at home.', 'am_michael|Có dấu tiếng Việt', "af_heart|don't|s3"];
  o.fnv36 = fnvCases.map(s => { const out = A.fnv36(s); if (uiFnv(s) !== out) throw new Error('gen-audio: ui.js fnv36 differs from audio.js'); return { in: s, out }; });
  const voices = { ama: Chars.voice('ama'), carlos: Chars.voice('carlos') };
  const lines = ['Hi! What can I get for you?', 'Hi! Can I have a large coffee, please?', "It's so hot today.", 'We decided to stay at home tonight.', 'She said "hello" to everyone.', ' Padded sentence. '];
  o.voices = voices;
  o.sentence = Object.entries(voices).flatMap(([who, voice]) => lines.map(text => { const key = KV.lineKey(voice, text); return { who, voice, text, key, urls: mkCdn(0).audioUrls(key), cueUrls: mkCdn(0).audioUrls(key + '-ls') }; }));
  o.split = ['One. Two! Three?', 'Hello, how are you today? I am fine; thank you.', 'No punctuation here', '  Spaced   out.   text ', 'A very long sentence '.repeat(14) + 'ends here.', 'Dr. Smith said: go.'].map(text => ({ text, out: KV.split(text) }));
  o.word = ['en-US', 'en-GB'].flatMap(accent => ['consider', 'key card', 'Monday', "don't", 'ice-cream'].map(word => {
    const voice = Target.wordVoice(accent); // = the default expression asserted above when Target is absent
    const key = A.fnv36(voice + '|' + word.trim() + WAV); return { accent, word, voice, key, urls: mkCdn(0).audioUrls(key, 'w') };
  }));
  o.ttsClean = ['Hello world', '📚 curriculum /kəˈrɪkjələm/ UK US n 💬 Ví dụ Many people have a curriculum.', 'the US economy', '  spaced   out  ', '🎉 Great job!', 'It is /fine/ today', 'cat /kæt/ n', '💬 Ví dụ: She sells shells.', ''].map(s => ({ in: s, out: ttsClean(s) }));

  // ---- gender / voice picking (web/js/audio.js) ----
  const names = ['Samantha', 'Daniel', 'Karen', 'Moira', 'Fred', 'Alex', 'Microsoft Libby Online (Natural) - English (United Kingdom)', 'Microsoft Ryan Online (Natural) - English (United Kingdom)', 'Google UK English Female', 'Google US English', 'Siri Voice 2', 'Ava (Premium)', 'Evan (Enhanced)', 'Serena', 'Rishi', 'en-us-x-tpd-network', 'Male Voice', 'Female Voice', 'Unknown Voice', 'Daniel Samantha', 'Whisper', 'Zarvox'];
  o.genderOf = names.map(name => ({ name, out: A.genderOf(name) }));
  o.kokoro = ['af_heart', 'am_michael', 'bf_emma', 'bm_george', 'xx_foo', '', null, 'af'].map(id => ({ id, out: A.kokoro(id) }));
  o.genderFor = ['ama', 'carlos', 'f', 'm', 'af_heart', 'bm_george', 'nobody', '', null].map(who => ({ who, out: A.genderFor(who) }));
  const V = [
    ['Samantha', 'en-US', 1], ['Daniel', 'en-GB', 1], ['Karen', 'en-AU', 1], ['Moira', 'en-IE', 1], ['Fred', 'en-US', 1], ['Alex', 'en-US', 1], ['Serena (Premium)', 'en-GB', 1], ['Evan (Enhanced)', 'en-US', 1], ['Ava (Premium)', 'en-US', 1],
    ['Microsoft Libby Online (Natural) - English (United Kingdom)', 'en-GB', 0], ['Microsoft Ryan Online (Natural) - English (United Kingdom)', 'en-GB', 0], ['Google UK English Female', 'en-GB', 0], ['Google US English', 'en_US', 0],
    ['Thomas', 'fr-FR', 1], ['Anna', 'de-DE', 1], ['en-us-x-tpd-network', 'en-US', 0], ['en-gb-x-gbd-local', 'en-GB', 1], ['Rishi', 'en-IN', 1], ['Zarvox', 'en-US', 1],
  ].map(([name, lang, local]) => ({ name, lang, localService: !!local }));
  o.sampleVoices = V;
  const combos = [['en-GB', ''], ['en-GB', 'f'], ['en-GB', 'm'], ['en-US', ''], ['en-US', 'f'], ['en-US', 'm']];
  o.rank = combos.map(([accent, gender]) => ({ accent, gender, out: A.rank(V, accent, gender).map(v => v.name) }));
  o.pick = [...combos.map(([accent, gender]) => ({ accent, gender, want: '' })), { accent: 'en-GB', gender: 'm', want: 'Daniel' }, { accent: 'en-GB', gender: 'f', want: 'Daniel' }, { accent: 'en-US', gender: '', want: 'Fred' }, { accent: 'en-US', gender: 'f', want: 'Ava (Premium)' }, { accent: 'en-AU', gender: 'f', want: '' }]
    .map(c => { const v = A.pickVoice(V, c.accent, c.gender, c.want); return { ...c, out: v ? v.name : null }; });
  o.score = V.flatMap(v => [['en-GB', ''], ['en-US', 'f'], ['en-GB', 'm']].map(([accent, gender]) => ({ name: v.name, accent, gender, out: A.voiceScore(v, accent, gender) })));
  o._doc = 'Reference outputs of web/js/audio.js + the CDN/word-key/ttsClean source lines of web/js/ui.js + web/js/listen/kvoice.js (REAL code in node:vm). English accents only (web without Target tables). Schema: docs/specs/native-m2-vectors.md.';
  return JSON.stringify({ _doc: o._doc, ...Object.fromEntries(Object.entries(o).filter(([k]) => k !== '_doc')) }, null, 1) + '\n';
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) { const s = audioVectors(); console.log('audio vectors', Buffer.byteLength(s), 'B'); }
