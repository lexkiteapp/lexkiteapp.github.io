// Khối "dạng động từ" trên trang từ (scripts/lib/seo-words.mjs › verbForms): dữ liệu = bộ máy chia động từ của app; nhãn đủ 15 ngôn ngữ.
import { S, LANGS } from '../lib/seo-pages-i18n.mjs';
globalThis.self ??= globalThis; await import('../../web/js/verbs-core.js');
const V = globalThis.self.LK_VERBS, bad = [], ok = (c, m) => { if (!c) bad.push(m); };
for (const [w, p, pp, ing, s, irr] of [['take', 'took', 'taken', 'taking', 'takes', true], ['study', 'studied', 'studied', 'studying', 'studies', false], ['stop', 'stopped', 'stopped', 'stopping', 'stops', false], ['go', 'went', 'gone', 'going', 'goes', true]]) {
  const f = V.forms(w); ok(f.P === p && f.PP === pp && f.ING === ing && f.S === s && !!f.irregular === irr, `forms(${w}) = ${f.P}/${f.PP}/${f.ING}/${f.S}`);
}
for (const l of LANGS) for (const k of ['vfH', 'vfB', 'vfS', 'vfP', 'vfPP', 'vfG', 'vfIrr', 'vfReg']) ok(S[l][k], `S.${l}.${k} thiếu`);
for (const l of LANGS) ok(S[l].vfH.includes('{w}'), `S.${l}.vfH thiếu {w}`);
if (bad.length) { console.error('✗ seo-verb-forms:\n' + bad.join('\n')); process.exit(1); }
console.log('✓ seo-verb-forms: dạng động từ khớp bộ máy chia, nhãn đủ 15 ngôn ngữ');
