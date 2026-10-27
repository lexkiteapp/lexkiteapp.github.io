#!/usr/bin/env node
// 🌐 Trích Open English WordNet 2025 (CC BY 4.0, © Open English WordNet contributors, github.com/globalwordnet/english-wordnet) cho trang từ điển.
// Chỉ giữ từ đơn trong kho Lexkite: IPA Mỹ (variety US), đồng nghĩa (thành viên synset), trái nghĩa, họ từ (derivation), ≤ 3 nghĩa (gloss + 1 ví dụ) mỗi từ loại.
// Ra: content/dict/wordnet.json (commit – build.mjs đọc, không cần mạng). Chạy lại khi kho từ lớn thêm:
//   curl -sL -o oewn.zip https://github.com/globalwordnet/english-wordnet/releases/download/2025-edition/english-wordnet-2025-json.zip && unzip -q oewn.zip -d oewn
//   node scripts/dict/wordnet.mjs oewn
// Giấy phép: chữ WordNet hiện trong khối riêng có ghi công + link; KHÔNG tính vào số chữ "nội dung riêng" của ngưỡng index (docs/SEO-DICT-PAGES.md §5, §7).
import fs from 'node:fs'; import path from 'node:path';
import { loadBrowserIndex } from '../lexicon/shards.mjs';

const dir = process.argv[2]; if (!dir || !fs.existsSync(dir)) { console.error('dùng: node scripts/dict/wordnet.mjs <thư mục giải nén OEWN json>'); process.exit(1); }
const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
const entries = {}, synsets = {};
for (const f of files) { const j = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); Object.assign(/^entries-/.test(f) ? entries : synsets, /^entries-|frames/.test(f) ? (/^entries-/.test(f) ? j : {}) : j); }
const lemmaOf = id => id.slice(0, id.indexOf('%')).replace(/_/g, ' ');
const WNPOS = { n: ['n'], v: ['v'], adj: ['a', 's'], adv: ['r'] };
const { INDEX } = loadBrowserIndex();
const gp = p => { p = String(p || '').toLowerCase(); return /^(n|noun)\b/.test(p) ? 'n' : /^(v|verb)\b/.test(p) ? 'v' : /^adj/.test(p) ? 'adj' : /^adv/.test(p) ? 'adv' : ''; }; // = gpos() của build.mjs
const POS = new Map(Object.values(INDEX).filter(e => e && /^[a-z]{3,}$/.test(e.word)).map(e => [e.word, gp(e.pos)]));
const words = [...POS.keys()].sort();
const out = {};
for (const w of words) {
  const e = entries[w]; if (!e) continue;
  const r = {};
  for (const [p, ps] of Object.entries(WNPOS).filter(([p]) => p === POS.get(w))) { // chỉ từ loại của mục trong kho (trang nói về đúng nghĩa đó)
    const senses = ps.flatMap(x => (e[x] && e[x].sense) || []); if (!senses.length) continue;
    const s = [], syn = [], ant = [], der = [];
    for (const sn of senses) {
      const ss = synsets[sn.synset]; if (!ss) continue;
      if (s.length < 3 && ss.definition && ss.definition[0]) s.push([ss.definition[0], (ss.example || []).map(x => (typeof x === 'string' ? x : x.text || '')).find(x => x && x.length <= 140 && new RegExp(`\\b${w}`, 'i').test(x)) || '']);
      if (s.length <= 2) for (const m of ss.members || []) { const x = m.replace(/_/g, ' '); if (x !== w && !syn.includes(x) && syn.length < 6) syn.push(x); }
      for (const a of sn.antonym || []) { const x = lemmaOf(a); if (x !== w && !ant.includes(x) && ant.length < 3) ant.push(x); }
      for (const a of [...(sn.derivation || []), ...(sn.pertainym || [])]) { const x = lemmaOf(a); if (x !== w && !der.includes(x) && der.length < 5) der.push(x); }
    }
    if (s.length) r[p] = Object.fromEntries(Object.entries({ s, syn, ant, der }).filter(([, v]) => v.length));
  }
  const us = ((Object.values(e).find(x => x.pronunciation) || {}).pronunciation || []).find(x => x.variety === 'US');
  if (us) r.us = `/${us.value}/`;
  if (r[POS.get(w)]) out[w] = r;
}
const doc = { _source: 'Open English WordNet 2025 – CC BY 4.0 – https://github.com/globalwordnet/english-wordnet – trích bởi scripts/dict/wordnet.mjs', words: out };
fs.writeFileSync('content/dict/wordnet.json', JSON.stringify(doc) + '\n');
console.log(`wordnet: ${Object.keys(out).length}/${words.length} từ · ${(fs.statSync('content/dict/wordnet.json').size / 1024).toFixed(0)} KB`);
