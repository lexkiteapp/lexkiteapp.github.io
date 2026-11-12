// Say it like a native – reaction cards (docs/SAY-NATIVE.md): content/say-native/{series,meanings}.json -> web/data/say.json
//   node scripts/say-native/build.mjs [--check]     (--check: rebuild in memory and fail when web/data/say.json differs or a gate fails)
// Facts come from our own data only: IPA (US else UK) + English definition = audited lexicon row (scripts/scriptbank sources(), the same rule as
// the app and teach2d qc.py); meanings in 14 languages = meanings.json (hand-checked, sense-correct; web/packs idiom glosses are literal, never used).
// Gates: >= 3 series, 6-10 items each, every key in the lexicon with IPA, reg in polite|neutral|casual, dont.reg in blunt|rude, rude lines masked,
// all 14 meanings present + non-empty, no Vietnamese letters outside vi, quiz answer in range, pose in the teacher's registry clips, ids unique.
import fs from 'fs';
import { fileURLToPath } from 'url';
const ROOT = fileURLToPath(new URL('../../', import.meta.url)), R = p => ROOT + p;
const { sources } = await import(R('scripts/scriptbank/lib.mjs'));
export const LANGS = ['vi', 'ar', 'de', 'es', 'fr', 'hi', 'id', 'ja', 'ko', 'pt', 'ru', 'th', 'tr', 'zh'];   // + en (the card's own English) = 15
export const REG = ['polite', 'neutral', 'casual'];
const VI = /[ăđơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]/i;
export const mask = s => s.replace(/[A-Za-z]+/g, w => w[0] + '•'.repeat(w.length - 1));   // rude line: first letter + dots, never voiced
export const slug = s => s.toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export function build() {
  const S = JSON.parse(fs.readFileSync(R('content/say-native/series.json'), 'utf8'));
  const M = JSON.parse(fs.readFileSync(R('content/say-native/meanings.json'), 'utf8'));
  const CH = JSON.parse(fs.readFileSync(R('web/teach/characters.json'), 'utf8')).people;
  const lex = new Map(); for (const [, r] of sources().byWord) lex.set(r[0].toLowerCase(), r);
  const err = [], ids = new Set();
  if (S.series.length < 3) err.push('need >= 3 series');
  const out = { v: 1, series: [] };
  for (const s of S.series) {
    if (!CH[s.teacher]) err.push(`${s.id}: teacher ${s.teacher} not in registry`);
    if (s.items.length < 6 || s.items.length > 10) err.push(`${s.id}: ${s.items.length} items (6-10)`);
    const items = [];
    for (const it of s.items) {
      const id = slug(it.key), r = lex.get(it.key.toLowerCase()), m = { vi: r && r[3], ...(M[it.key.toLowerCase()] || {}) };   // vi = the audited lexicon gloss (lexai 'translate' has no vi)
      if (ids.has(s.id + '/' + id)) err.push(`dup ${s.id}/${id}`); ids.add(s.id + '/' + id);
      if (!r) { err.push(`${it.key}: not in lexicon`); continue; }
      const ipa = r[10] || r[1];
      if (!ipa) err.push(`${it.key}: no IPA`);
      if (!REG.includes(it.reg)) err.push(`${it.key}: reg ${it.reg}`);
      if (it.swap && !REG.includes(it.swap.reg)) err.push(`${it.key}: swap.reg ${it.swap.reg}`);
      if (it.dont && !['blunt', 'rude'].includes(it.dont.reg)) err.push(`${it.key}: dont.reg ${it.dont.reg}`);
      if (!CH[s.teacher].clips[it.pose]) err.push(`${it.key}: pose ${it.pose} not a ${s.teacher} clip`);
      const q = it.quiz; if (!q || !(q.answer >= 0 && q.answer < q.options.length)) err.push(`${it.key}: quiz`);
      for (const l of LANGS) {
        if (!(m[l] || '').trim()) err.push(`${it.key}: meaning ${l} missing`);
        else if (l !== 'vi' && VI.test(m[l])) err.push(`${it.key}: Vietnamese in ${l}`);
      }
      const dont = it.dont && { reg: it.dont.reg, text: it.dont.reg === 'rude' ? mask(it.dont.text) : it.dont.text, masked: it.dont.reg === 'rude' };
      if (q && dont && dont.masked && q.options.some(o => o.toLowerCase().includes(it.dont.text.toLowerCase().replace(/[!.?]$/, '')))) err.push(`${it.key}: rude line in quiz`);
      items.push({ id, key: r[0], say: it.say, ipa, reg: it.reg, def: r[4], mean: it.mean, when: it.when, swap: it.swap || null, dont: dont || null,
        pose: it.pose, quiz: q, cefr: r[8] || '', m: Object.fromEntries(LANGS.map(l => [l, m[l] || ''])) });
    }
    out.series.push({ id: s.id, title: s.title, topic: s.topic, teacher: s.teacher, items });
  }
  return { out, err };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === fs.realpathSync(process.argv[1])) {
  const { out, err } = build(), f = R('web/data/say.json'), txt = JSON.stringify(out) + '\n';
  if (err.length) { console.error('say-native: ' + err.length + ' error(s)\n  ' + err.slice(0, 40).join('\n  ')); process.exit(1); }
  if (process.argv.includes('--check')) {
    if (!fs.existsSync(f) || fs.readFileSync(f, 'utf8') !== txt) { console.error('say-native: web/data/say.json is stale – run node scripts/say-native/build.mjs'); process.exit(1); }
  } else fs.writeFileSync(f, txt);
  console.log(`say-native OK: ${out.series.length} series, ${out.series.reduce((a, s) => a + s.items.length, 0)} cards`);
}
