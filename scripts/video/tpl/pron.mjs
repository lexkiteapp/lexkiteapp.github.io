#!/usr/bin/env node
// Video pronunciation source + checks (docs/VIDEO-SERIES.md § Phát âm). One place for the shorts' on-screen IPA and the Kokoro phoneme check.
// IPA comes ONLY from the app's audited word bank (scripts/lexicon: ipaUS cell, empty = same as UK, audited by ipa-audit vs CMUdict/Britfone):
//   1. exact bank entry for the displayed token (US accent – every host voice is American Kokoro);
//   2. an inflected form of a bank word (waiting, cards, played): CMUdict US form, accepted only when it starts with the bank base (bank-anchored);
//   3. a multi-word chunk (key card, a lot of): word by word, function words in their WEAK form (web/js/ui.js LK_WEAK, US column) as spoken in a phrase;
//   else none (never a guessed IPA).
// Kokoro speaks the espeak-ng (en-us) phonemes of kokoro-js; content/video/kokoro-lexicon.json overrides words espeak gets wrong.
//   node scripts/video/tpl/pron.mjs ipa '["waiting","key card"]'      -> {"waiting":{"ipa":"/ˈweɪtɪŋ/","src":"cmu-inflected:wait"},...}
//   node scripts/video/tpl/pron.mjs audit <spec.json|lines.json>...   -> per-word spoken (Kokoro) vs CMUdict + displayed IPA vs bank; exit 1 on a mismatch
//   node scripts/video/tpl/pron.mjs audit-json <spec.json> <out.json>  -> same audit as JSON (voice job; qc_v9 gates pron_kokoro + ipa_token)
//   node scripts/video/tpl/pron.mjs spoken <text>                      -> phonemes Kokoro will receive (lexicon applied)
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import { execFileSync } from 'child_process';
import { arpaToIpa } from '../../lexicon/ipa.mjs';

const ROOT = fileURLToPath(new URL('../../../', import.meta.url));
const rd = p => fs.readFileSync(ROOT + p, 'utf8');
export const LEXF = 'content/video/kokoro-lexicon.json';
export const norm = w => String(w).toLowerCase().replace(/’/g, "'").replace(/[^a-z0-9' -]/g, '').replace(/^['-]+|['-]+$/g, '').trim();

// ---------- sources
const CMU_URL = 'https://raw.githubusercontent.com/cmusphinx/cmudict/74790861f652b15e4ac49015a90074ad62a27690/cmudict.dict';   // pinned (BSD-2), inflected forms the subset lacks
let _cmu = null;
export function cmu() {   // word -> [arpabet variants]; the lexicon's CMUdict subset (BSD-2) + a full CMUdict when cached (.tools/cmudict.dict, pinned)
  if (_cmu) return _cmu; _cmu = new Map();
  const add = (txt, sep) => { for (const l of txt.split('\n')) { if (!l || l[0] === '#' || l.startsWith(';;;')) continue; const i = l.indexOf(sep); if (i < 1) continue;
    const w = l.slice(0, i).replace(/\(\d+\)$/, '').toLowerCase(), p = l.slice(i + 1).replace(/#.*$/, '').trim(); const a = _cmu.get(w) || _cmu.set(w, []).get(w); if (!a.includes(p)) a.push(p); } };
  add(fs.readFileSync(ROOT + 'content/lexicon/cmudict-subset.txt', 'latin1'), ' ');
  if (!fs.existsSync(ROOT + '.tools/cmudict.dict')) try { fs.mkdirSync(ROOT + '.tools', { recursive: true }); execFileSync('curl', ['-sfL', '--retry', '3', '-o', ROOT + '.tools/cmudict.dict', CMU_URL]); } catch { /* offline: subset only */ }
  if (fs.existsSync(ROOT + '.tools/cmudict.dict')) add(fs.readFileSync(ROOT + '.tools/cmudict.dict', 'latin1'), ' ');
  return _cmu;
}
let _bank = null;
async function bank() {   // word (lower) -> US IPA of the audited bank (row[10] ipaUS, empty = same as UK row[1]) – same rule as the app (web/js/ui.js ipaOf)
  if (_bank) return _bank;
  const { sources } = await import('../../scriptbank/lib.mjs'); const s = sources(); _bank = new Map();
  for (const [w, r] of s.byWord) if (r[10] || r[1]) _bank.set(w, r[10] || r[1]);
  return _bank;
}
let _weak = null;
export function weak() {   // function word -> US weak form (web/js/ui.js LK_WEAK block, PR #178); {} when the block is not there yet
  if (_weak) return _weak; _weak = {};
  const m = /LK_WEAK-START \*\/([\s\S]*?)\/\* LK_WEAK-END/.exec(rd('web/js/ui.js'));
  if (m) for (const x of m[1].matchAll(/(\w+): \['([^']*)', '([^']*)'/g)) _weak[x[1]] = x[3];
  return _weak;
}
const FUNC = new Set('a an the and but or as than that of to for from at can could would should must shall will am are is was were been have has had do does some them us him her his you your'.split(' '));
export const lexicon = () => (fs.existsSync(ROOT + LEXF) ? JSON.parse(rd(LEXF)).words || {} : {});

// ---------- phonemes (compare by phoneme, like scripts/lexicon/ipa-audit.mjs: stress, length and notation variants ignored)
const VOW = 'aeiouɑɒɔəɜɪʊʌæ', UNITS = ['tʃ', 'dʒ', 'eɪ', 'aɪ', 'ɔɪ', 'oʊ', 'aʊ'];
const canon = s => String(s).toLowerCase().normalize('NFD').replace(/[̩̍]/g, '')   // syllabic marks (n̩ l̩)
  .replace(/[/().‿\s-]/g, '').replace(/ɡ/g, 'g').replace(/ɹ/g, 'r').replace(/ɛ/g, 'e').replace(/ɐ/g, 'ʌ').replace(/ᵻ/g, 'ɪ').replace(/ɚ/g, 'ər').replace(/ɝ/g, 'ɜr')
  .replace(/əʊ/g, 'oʊ').replace(/ʔ/g, 't').replace(/oː(?=[rɹ])/g, 'ɔ').replace(/ɜː(?!r)/g, 'ɜr').replace(/ː/g, '').replace(/ɑ̃/g, 'ɑ').replace(/[ʲ]/g, 'j').replace(/rr/g, 'r');   // espeak en-us: oːɹ = ɔr (four, door), ɚɹ = ər
const isV = p => VOW.includes(p[0]);
export function phones(str) {   // [{p, s}] s = primary stress on that vowel
  const c = canon(str), out = []; let pend = false;
  for (let i = 0; i < c.length;) {
    if (c[i] === 'ˈ') { pend = true; i++; continue; } if (c[i] === 'ˌ') { i++; continue; }
    const u = UNITS.find(x => c.startsWith(x, i)) || c[i]; const v = isV(u); out.push({ p: v && !pend && u === 'ʌ' ? 'ə' : u, s: v && pend }); if (v) pend = false; i += u.length;   // unstressed ʌ (espeak ɐ) = ə
  }
  return out;
}
const WEAKV = new Set(['ə', 'ɪ', 'i', 'ʊ', 'u']);
function dist(a, b) {   // 0 = same word sound (dictionary variants), > 0 = a different sound
  const n = a.length, m = b.length, D = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  const sub = (x, y) => (x.p === y.p || (WEAKV.has(x.p) && WEAKV.has(y.p)) || (/^[əʌ]$/.test(x.p) && /^[əʌ]$/.test(y.p)) || (!x.s && !y.s && isV(x.p) && isV(y.p) && [x.p, y.p].includes('e') && (WEAKV.has(x.p) || WEAKV.has(y.p))) || (isV(x.p) && isV(y.p) && ((x.p === 'ə' && !y.s) || (y.p === 'ə' && !x.s) || (/^[ɑɔ]$/.test(x.p) && /^[ɑɔ]$/.test(y.p))))
    || ([x.p, y.p].includes('ɾ') && /^[tdɾ]$/.test(x.p) && /^[tdɾ]$/.test(y.p)) ? 0 : 1);   // US flap ɾ = t/d; cot-caught ɑ/ɔ
  const indel = x => (x.p === 'ə' ? 0 : 1);
  for (let i = 1; i <= n; i++) D[i][0] = D[i - 1][0] + indel(a[i - 1]);
  for (let j = 1; j <= m; j++) D[0][j] = D[0][j - 1] + indel(b[j - 1]);
  for (let i = 1; i <= n; i++) for (let j = 1; j <= m; j++) D[i][j] = Math.min(D[i - 1][j - 1] + sub(a[i - 1], b[j - 1]), D[i - 1][j] + indel(a[i - 1]), D[i][j - 1] + indel(b[j - 1]));
  return D[n][m];
}
const vowels = p => p.filter(x => isV(x.p));
export const stressAt = s => { const v = vowels(phones(s)); return v.length > 1 ? v.findIndex(x => x.s) : -1; };   // -1 = one syllable / no mark
export const same = (a, b) => dist(phones(a), phones(b)) === 0;
export const cmuIpa = w => (cmu().get(norm(w)) || []).map(p => '/' + arpaToIpa(p) + '/');

// ---------- ASR back-check: an ASR word that differs from the script still SOUNDS the same (homophone bored/board, US flap waiting/wading, keycard/key card)
const flap = ph => ph.map((x, i) => (/^[td]$/.test(x.p) && i > 0 && (isV(ph[i - 1].p) || ph[i - 1].p === 'r') && ph[i + 1] && isV(ph[i + 1].p) && !ph[i + 1].s ? { ...x, p: 'ɾ' } : x));
const prons = phrase => phrase.split(/\s+/).filter(Boolean).reduce((acc, w) => { const c = cmuIpa(w); return c.length ? acc.flatMap(a => c.slice(0, 3).map(x => a + x.replace(/\//g, ''))).slice(0, 27) : []; }, ['']);
export function soundsSame(a, b) {
  if (norm(a).replace(/[\s'-]/g, '') === norm(b).replace(/[\s'-]/g, '')) return true;   // keycard = key card
  const A = prons(norm(a)), B = prons(norm(b));
  return A.some(x => B.some(y => dist(flap(phones(x)), flap(phones(y))) === 0));
}

// ---------- IPA for a displayed token
export async function ipaFor(token) {
  const w = norm(token); if (!w) return null;
  const B = await bank(), LX = lexicon();
  if (LX[w] && LX[w].ipa) return { ipa: LX[w].ipa, src: 'kokoro-lexicon' };   // the host says the lexicon form (sourced US variant) -> show what is said
  if (B.has(w)) return { ipa: B.get(w), src: 'bank' };
  if (!/\s/.test(w)) {   // inflected form of a bank word: CMUdict US, only if it starts like the bank base (same sound, more phonemes)
    for (const [suf, rep] of [['ing', ''], ['ing', 'e'], ['ed', ''], ['ed', 'e'], ['d', ''], ['es', ''], ['s', ''], ['ies', 'y'], ['ied', 'y'], ["'s", ''], ['er', ''], ['est', '']]) {
      if (!w.endsWith(suf) || w.length - suf.length < 2) continue; let base = w.slice(0, -suf.length) + rep;
      if (!B.has(base) && /(.)\1$/.test(base) && B.has(base.slice(0, -1))) base = base.slice(0, -1);   // getting -> get
      if (!B.has(base)) continue;
      const bp = phones(B.get(base)).map(x => x.p).join('');
      const hit = cmuIpa(w).find(c => { const cp = phones(c).map(x => x.p).join(''); return cp.length > bp.length && dist(phones(c).slice(0, phones(B.get(base)).length), phones(B.get(base))) === 0; });
      if (hit && stressAt(hit) === stressAt(B.get(base)) || hit && stressAt(B.get(base)) < 0) return { ipa: hit, src: 'cmu-inflected:' + base };
    }
    const c = cmuIpa(w); if (c.length === 1 || (c.length > 1 && c.every(x => same(x, c[0]) && stressAt(x) === stressAt(c[0])))) return { ipa: c[0], src: 'cmu' };   // not in the bank: CMUdict US (the source the bank's US column is audited against), only when unambiguous
    return null;
  }
  const parts = w.split(/\s+/), W = weak(), out = [];   // multi-word chunk: each word from the bank; function words weak (as spoken in the phrase)
  if (!Object.keys(W).length && parts.some(p => FUNC.has(p))) return null;   // no weak-form table yet -> never show a strong form inside a phrase
  for (const p of parts) {
    if (W[p] && parts.length > 1) { out.push(W[p]); continue; }
    const r = await ipaFor(p); if (!r) return null; out.push(r.ipa.replace(/^\/|\/$/g, ''));
  }
  return { ipa: '/' + out.join(' ') + '/', src: 'bank-words' + (parts.some(p => W[p]) ? '+weak' : '') };
}

// ---------- what Kokoro says (kokoro-js: espeak-ng en-us per punctuation chunk, then r -> ɹ etc.)
let _ph = null;
async function espeak(text) {
  if (!_ph) { const req = createRequire((process.env.KOKORO_NODE_PATH || ROOT + 'node_modules') + '/'); try { _ph = (await import(req.resolve('phonemizer'))).phonemize; } catch { _ph = (await import('phonemizer')).phonemize; } }
  return (await _ph(text, 'en-us')).join(' ');
}
export async function spokenWords(text) {   // [{tok, w, ph, lex}] phonemes per script token
  const L = lexicon(), toks = text.split(/\s+/).filter(Boolean), out = [];
  for (const t of toks) {
    const w = norm(t); if (!w) { out.push({ tok: t, w, ph: '' }); continue; }
    if (L[w]) { out.push({ tok: t, w, ph: L[w].ph, lex: true }); continue; }
    out.push({ tok: t, w, ph: await espeak(w) });
  }
  return out;
}

// ---------- audit: spoken (Kokoro) vs CMUdict, displayed IPA vs bank + token
const CONTENT_MIN = 3;   // function words are checked by weak()/CMU variants too, but 1-2 letter words are skipped (a, I, to …)
export async function auditLine(text) {
  const bad = [];
  for (const x of await spokenWords(text)) {
    if (!x.w || x.w.length < CONTENT_MIN || /\d/.test(x.w)) continue;
    const ref = cmuIpa(x.w); if (!ref.length) continue;   // not in CMUdict: nothing to compare (reported as unchecked)
    if (x.lex) continue;   // curated lexicon word (dictionary source in kokoro-lexicon.json)
    const ok = ref.some(r => same(x.ph, r)) || (weak()[x.w] && same(x.ph, '/' + weak()[x.w] + '/'));
    if (!ok) bad.push({ word: x.w, kokoro: x.ph, cmu: ref, lex: !!x.lex });
    else if (!x.lex) { const sp = stressAt(x.ph), lem = x.w.replace(/(s|es|ed|ing)$/, ''), refs = ref.concat(lem !== x.w ? cmuIpa(lem) : []);
      if (sp >= 0 && !refs.some(r => stressAt(r) === sp || stressAt(r) < 0)) bad.push({ word: x.w, kokoro: x.ph, cmu: ref, stress: true }); }
  }
  return bad;
}
export async function auditSpec(spec, { spoken = true } = {}) {   // spoken = false: IPA/bank/token checks only (no espeak; npm test)
  const R = { spoken: [], ipa: [] };
  if (spoken) for (const l of spec.lines || []) if (l.text) for (const b of await auditLine(l.text)) R.spoken.push({ line: l.id, ...b });
  const txt = segs => segs.filter(g => Array.isArray(g) && typeof g[0] === 'string' && !g[0].startsWith('@')).map(g => g[0]).join('');
  const word = t => norm(String(t).replace(/[·“”"!?.,]/g, ' ').replace(/\s+/g, ' '));
  const walk = (o) => {   // IPA token = the words before it on its row (syllable-split rows → the word the same IPA had earlier), else the row above
    if (Array.isArray(o)) for (const v of o) walk(v);
    else if (o && typeof o === 'object') {
      if (typeof o.ipa === 'string' && o.word) R.ipa.push({ token: o.word, ipa: o.ipa });
      if (Array.isArray(o.lines)) o.lines.forEach((ln, r) => (ln.segs || []).forEach((g, i) => {
        if (!(Array.isArray(g) && typeof g[0] === 'string' && g[0].startsWith('@ipa:'))) return;
        const ipa = g[0].slice(5); let tok = word(txt(ln.segs.slice(0, i))), split = /·/.test(txt(ln.segs.slice(0, i)));
        if (split) { const p = R.ipa.find(x => x.ipa === ipa && x.token); tok = p ? p.token : null; }
        if (!tok && r > 0) tok = word(txt(o.lines[r - 1].segs || []));
        R.ipa.push({ token: tok || null, ipa, pop: o.id });
      }));
      for (const [k, v] of Object.entries(o)) if (k !== 'lines') walk(v);
    }
  };
  walk(spec.pops || []);
  const lit = new Set((spec.lines || []).flatMap(l => (l.text ? Object.values(l.key || {}).flat().map(i => norm(l.text.split(/\s+/)[i] || '')) : [])));   // words lit (red/green/yellow) in the script = what the lesson teaches
  for (const x of R.ipa) if (x.pop) x.taught = !!x.token && x.token.split(/\s+/).some(w => lit.has(w));   // a board IPA belongs to a taught word (not 'card' when the lesson is 'key')
  for (const x of R.ipa) {
    const want = x.token ? await ipaFor(x.token) : null;
    x.want = want && want.ipa; x.src = want && want.src;
    x.ok = !!want && want.ipa === x.ipa;
    const c = x.token && !/\s/.test(norm(x.token)) ? cmuIpa(x.token) : [];
    if (x.token && !spoken) x.spoken_ok = true;
    else if (x.token) { const sw = await spokenWords(x.token); x.spoken = sw.map(y => y.ph).join(' '); x.spoken_ok = same(x.spoken, x.ipa) && (stressAt(x.spoken) === stressAt(x.ipa) || stressAt(x.ipa) < 0 || stressAt(x.spoken) < 0 || /\s/.test(norm(x.token))); }   // Kokoro says what the board shows
    x.cmu_ok = !c.length || !!lexicon()[norm(x.token)] && lexicon()[norm(x.token)].ipa === x.ipa || c.some(r => same(r, x.ipa) && (stressAt(r) === stressAt(x.ipa) || stressAt(x.ipa) < 0 || stressAt(r) < 0));
  }
  return R;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === fs.realpathSync(process.argv[1])) {
  const [cmd, ...a] = process.argv.slice(2);
  if (cmd === 'ipa') { const o = {}; for (const w of JSON.parse(a[0])) o[w] = await ipaFor(w); console.log(JSON.stringify(o)); }
  else if (cmd === 'audit-json') {   // voice job: <spec> <out.json> -> render_v9 copies it into the timeline -> qc_v9 pron_kokoro / ipa_token
    const s = JSON.parse(fs.readFileSync(a[0], 'utf8')), R = await auditSpec(s), L = lexicon();
    R.lex = [...new Set(s.lines.filter(l => l.text).flatMap(l => l.text.split(/\s+/).map(norm)).filter(w => L[w]))];
    fs.writeFileSync(a[1], JSON.stringify(R, null, 1)); console.log(`pron: ${R.spoken.length} spoken mismatches, ${R.ipa.filter(x => !x.ok || !x.cmu_ok || !x.spoken_ok || x.taught === false).length}/${R.ipa.length} IPA off, lexicon ${R.lex.join(',') || '-'}`);
  }
  else if (cmd === 'same') console.log(JSON.stringify(JSON.parse(a[0]).map(([x, y]) => soundsSame(x, y))));   // qc_v9 asr_match: [[script, asr], ...] -> [true|false]
  else if (cmd === 'spoken') console.log(JSON.stringify(await spokenWords(a.join(' '))));
  else if (cmd === 'audit') {
    let fail = 0;
    for (const f of a) {
      const s = JSON.parse(fs.readFileSync(f, 'utf8')), R = await auditSpec(s), bi = R.ipa.filter(x => !x.ok || !x.cmu_ok || !x.spoken_ok || x.taught === false);
      if (R.spoken.length || bi.length) fail++;
      console.log(`${R.spoken.length || bi.length ? '✗' : '✓'} ${f}`);
      for (const b of R.spoken) console.log(`   spoken ${b.line} ${b.word}: kokoro ${b.kokoro} vs CMU ${b.cmu.join(' ')}${b.stress ? ' (stress)' : ''}`);
      for (const b of bi) console.log(`   ipa "${b.token}" ${b.ipa} -> bank ${b.want || 'none'} (${b.src || '-'})${b.cmu_ok ? '' : ' CMU/stress mismatch'}${b.spoken_ok ? '' : ' Kokoro says ' + b.spoken}${b.taught === false ? ' NOT a taught word' : ''}`);
    }
    process.exit(fail ? 1 : 0);
  } else { console.error('usage: pron.mjs ipa|spoken|audit'); process.exit(2); }
}
