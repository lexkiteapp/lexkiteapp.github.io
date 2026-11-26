#!/usr/bin/env node
// Chủ đề sâu (docs/specs/topic-depth.md): content/topic-depth/<id>.json → gói lười web/cpack/topic/<id>.js.
// Từ đã có trong kho được GỘP đủ trường (ipa/vi/def/syn/emoji) từ INDEX (một nguồn); từ mới giữ trường của gói. --check: chỉ kiểm, không ghi.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadBrowserIndex } from './lexicon/shards.mjs';

const ROOT = fileURLToPath(new URL('../', import.meta.url)), SRC = path.join(ROOT, 'content/topic-depth'), OUT = path.join(ROOT, 'web/cpack/topic');
const CHECK = process.argv.includes('--check');
const FIELDS = ['word', 'ipa', 'ipaUS', 'pos', 'vi', 'def', 'ex', 'col', 'syn', 'level', 'emoji', 'sub', 'tip'];
const LV = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

export function build(raw, INDEX) {
  const errs = [], seen = new Set(), subs = new Set(raw.sub.map(s => s.id));
  const words = raw.words.map(w => {
    const k = w.word.toLowerCase(), base = INDEX[k] || {}, e = {};
    for (const f of FIELDS) { const v = w[f] != null && w[f] !== '' ? w[f] : base[f]; if (v != null && v !== '') e[f] = v; }
    e.col = e.col || []; e.syn = e.syn || [];
    e.topic = raw.topic; e.inKho = !!INDEX[k];
    if (seen.has(k)) errs.push(`trùng từ: ${w.word}`); seen.add(k);
    if (!subs.has(e.sub)) errs.push(`${w.word}: sub lạ ${e.sub}`);
    if (!LV.includes(e.level)) errs.push(`${w.word}: level ${e.level}`);
    for (const f of ['ipa', 'pos', 'vi', 'def', 'ex']) if (!e[f]) errs.push(`${w.word}: thiếu ${f}`);
    if (!e.col.length) errs.push(`${w.word}: thiếu col`);
    if (/[ăâđêôơưáàảãạéèẻẽẹíìỉĩịóòỏõọúùủũụýỳỷỹỵ]/i.test(e.ex || '')) errs.push(`${w.word}: ví dụ có tiếng Việt`);
    return e;
  });
  const lvs = new Set(words.map(w => w.level));
  if (words.length < 80) errs.push(`chỉ ${words.length} từ (< 80)`);
  if (['A2', 'B1', 'B2', 'C1'].some(l => !lvs.has(l))) errs.push('thiếu cấp CEFR (cần A2,B1,B2,C1)');
  for (const s of subs) { const n = words.filter(w => w.sub === s).length; if (n < 15) errs.push(`tiểu chủ đề ${s}: ${n} từ (< 15)`); if (!raw.dialogs.some(d => d.sub === s)) errs.push(`tiểu chủ đề ${s}: chưa có hội thoại`); }
  if (raw.phrases.length < 12) errs.push('cụm dùng ngay < 12');
  for (const d of raw.dialogs) if (d.lines.length < 2 || d.lines.length > 4) errs.push(`hội thoại ${d.id}: ${d.lines.length} câu (cần 2–4)`);
  return { errs, data: { topic: raw.topic, sub: raw.sub, words, phrases: raw.phrases, dialogs: raw.dialogs } };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { INDEX } = loadBrowserIndex();
  let bad = 0;
  for (const f of fs.readdirSync(SRC).filter(x => x.endsWith('.json'))) {
    const raw = JSON.parse(fs.readFileSync(path.join(SRC, f), 'utf8')), { errs, data } = build(raw, INDEX);
    const js = `/* Chủ đề sâu «${raw.topic}» – SINH bởi scripts/build-topic-depth.mjs từ content/topic-depth/${f}; không sửa tay. */\n(window.LK_TOPICX = window.LK_TOPICX || {})[${JSON.stringify(raw.topic)}] = ${JSON.stringify(data)};\n`;
    const out = path.join(OUT, raw.topic + '.js');
    if (errs.length) { bad++; console.error(`✗ topic-depth ${raw.topic}:\n  ` + errs.join('\n  ')); continue; }
    if (CHECK) { if (!fs.existsSync(out) || fs.readFileSync(out, 'utf8') !== js) { bad++; console.error(`✗ ${out} chưa sinh/khác nguồn – chạy node scripts/build-topic-depth.mjs`); } }
    else fs.writeFileSync(out, js);
    console.log(`✓ topic-depth ${raw.topic}: ${data.words.length} từ (${data.words.filter(w => !w.inKho).length} mới ngoài kho) · ${data.phrases.length} cụm · ${data.dialogs.length} hội thoại · ${(js.length / 1024).toFixed(0)} KB`);
  }
  process.exit(bad ? 1 : 0);
}
