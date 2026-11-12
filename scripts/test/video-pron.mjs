// Shorts pronunciation (scripts/video/tpl/pron.mjs, docs/VIDEO-SERIES.md § Phát âm): on-screen IPA = audited bank IPA of the EXACT displayed taught token,
// Kokoro lexicon entries sourced, generated quiz/hook boards complete. Spoken (espeak) checks run in the video voice job, not here.
import fs from 'fs';
import { ipaFor, auditSpec, lexicon } from '../video/tpl/pron.mjs';
let bad = 0; const ok = (c, m) => { if (!c) { bad++; console.error('✗ ' + m); } };
ok((await ipaFor('waiting'))?.ipa === '/ˈweɪtɪŋ/', 'waiting -> /ˈweɪtɪŋ/ (inflected form, never the base /weɪt/)');
ok((await ipaFor('key'))?.ipa === '/kiː/', 'key -> /kiː/');
ok((await ipaFor('wait'))?.ipa !== (await ipaFor('waiting'))?.ipa, 'base and -ing differ');
const ph = await ipaFor('a lot of'); ok(!ph || !/eɪ l|ʌv/.test(ph.ipa), 'phrase never shows strong forms of function words: ' + (ph && ph.ipa));
for (const [w, e] of Object.entries(lexicon())) ok(e.ph && /^\/.+\/$/.test(e.ipa) && e.why && e.why.length > 20, `kokoro-lexicon ${w}: ph + ipa + sourced why`);
const D = 'content/video/cine/news/', files = [...['verb-patterns', 'common-mix-ups', 'real-life-english'].map(f => `${D}series-new/${f}.json`),   // samples re-rendered 28/10 (the other series-new samples predate the fix; their series/ specs are checked below)
  ...fs.readdirSync(D + 'series').filter(d => fs.statSync(D + 'series/' + d).isDirectory()).flatMap(d => fs.readdirSync(D + 'series/' + d).filter(f => /^[a-z]+_[0-9a-f]+\.json$/.test(f)).map(f => `${D}series/${d}/${f}`))];
for (const f of files) {
  const s = JSON.parse(fs.readFileSync(f, 'utf8')), R = await auditSpec(s, { spoken: false });
  for (const x of R.ipa) ok(x.ok && x.cmu_ok && x.token && x.taught !== false, `${f}: IPA "${x.token}" ${x.ipa} (bank ${x.want || 'none'})`);
  const q = s.pops.find(p => p.kind === 'quiz'); ok(q && q.q, `${f}: quiz pills keep the question`);
  const h = s.pops.find(p => p.role === 'hook'); ok(!(h && h.kind === 'rich' && h.rows.some(r => r.every(g => g[0].startsWith('@') || !g[0].trim()))), `${f}: no badge-only hook row`);
}
// Mọi workflow chạy cổng qc_v9 (trực tiếp hoặc qua qc_motion) phải sinh pron.json ở job giọng – thiếu thì pron_kokoro/ipa_token đỏ
// mọi PR chạm workflow đó (2/11: video-motion.yml + video-series.yml thiếu sau #181)
for (const f of fs.readdirSync('.github/workflows').filter(f => f.endsWith('.yml'))) {
  const y = fs.readFileSync('.github/workflows/' + f, 'utf8');
  if (/qc_v9\.py|qc_motion\.py/.test(y)) ok(/pron\.mjs audit-json/.test(y), `${f}: chạy qc_v9 → job giọng phải có \`node scripts/video/tpl/pron.mjs audit-json\` (pron.json)`);
}
const mix = fs.readFileSync('content/video/scripts/bank/mixups.jsonl', 'utf8').trim().split('\n').map(JSON.parse);
ok(mix.length >= 8 && mix.every(x => x.type === 'mix-up' && x.wrong !== x.right), 'curated mix-ups bank');
console.log(bad ? `video-pron: ${bad} fail(s)` : `✓ video-pron: ${files.length} specs, IPA = bank for the exact taught token`);
process.exit(bad ? 1 : 0);
