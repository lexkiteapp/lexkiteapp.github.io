#!/usr/bin/env node
// E1 – cân bằng vị trí đáp án (docs/CONTENT-WORLD-PLAN.md §7.3). Chỉ HOÁN VỊ phương án trong câu trắc nghiệm viết dạng literal một dòng
// `options: [...], a: N` (đáp án đúng giữ nguyên chữ, chỉ đổi chỗ) → vị trí đáp án đều ~25 % mỗi ô, không đổi nội dung nào.
// Bỏ qua câu có thể hỏng khi đổi chỗ: “all/none of the above”, “both”, “neither”, phương án tham chiếu chữ cái, lời giải nhắc “option B”.
// Tất định (không ngẫu nhiên): với mỗi nhóm (thư mục nguồn × số phương án) chọn ô đang ÍT đáp án nhất; chỉ đổi khi ô hiện tại đã dư.
// Dùng: node scripts/content-qa/bank-balance.mjs [--write]   (không --write = chỉ in kế hoạch). Kiểm đúng/sai: scripts/test/bank-balance.mjs.
import fs from 'node:fs'; import path from 'node:path';
import { ROOT } from '../lib/content-load.mjs';

const DIRS = ['js/grammar', 'cpack/grammar', 'js/toeic', 'cpack/toeic', 'js/toefl', 'cpack/toefl', 'js/listen', 'cpack/listen', 'cpack/cambridge', 'cpack/readings', 'js/readings.js', 'js/readtest', 'cpack/readtest'];
const STR = String.raw`(?:"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|\x60(?:[^\x60\\$]|\\.)*\x60)`; // "…" '…' hoặc `…` (không có ${})
const RE = new RegExp(String.raw`options:\s*\[((?:\s*${STR}\s*,?)+)\]\s*,\s*(a|answer):\s*(\d)\b`, 'g');
const LETTER = /(options?|choices?|answers?|đáp án|phương án|câu)\s+[A-E]\b|\([A-E]\)|(?:→|->|=>)\s*[A-E]\b/i; // lời giải chỉ cần tránh nhắc chữ cái phương án
const TOK = new RegExp(STR, 'g');
const RISKY = /\b(above|both|neither|none of|all of|either)\b|\b(options?|choices?|answers?)\s+[A-E]\b|\([A-E]\)/i;
const lettered = opts => opts.every((o, i) => new RegExp(`^${String.fromCharCode(65 + i)}[.)]?\\s`).test(o)); // phương án đã đánh sẵn chữ A,B,C… → đổi chỗ sẽ sai nhãn
const lit = t => (0, eval)(t); // chuỗi literal đã khớp STR → giá trị

export function files() {
  const out = [];
  const walk = p => { const s = fs.statSync(p); if (s.isDirectory()) for (const f of fs.readdirSync(p).sort()) walk(path.join(p, f)); else if (p.endsWith('.js')) out.push(p); };
  for (const d of DIRS) { const p = path.join(ROOT, 'web', d); if (fs.existsSync(p)) walk(p); }
  return out;
}

// Trả về { text, moved, eligible } cho một tệp; counts = Map(nhóm → [đếm theo ô]) giữ chung giữa các tệp để cân bằng toàn thư mục.
export function balanceText(text, group, counts) {
  let moved = 0, eligible = 0;
  const outText = text.replace(RE, (m, body, key, aStr, off) => {
    const toks = body.match(TOK) || [], opts = toks.map(lit), a = +aStr, n = opts.length;
    const ctx = text.slice(off, off + 700);
    const nextKeys = /^[^{}]*?\bexplain:\s*(?:"((?:[^"\\\n]|\\.)*)"|'((?:[^'\\\n]|\\.)*)'|\x60((?:[^\x60\\]|\\.)*)\x60)/.exec(m + text.slice(off + m.length, off + m.length + 900));
    const ex = nextKeys ? (nextKeys[1] || nextKeys[2] || nextKeys[3] || '') : '';
    const c = (counts.get(`${group}|${n}`) || counts.set(`${group}|${n}`, new Array(n).fill(0)).get(`${group}|${n}`));
    if (n < 3 || n > 5 || a >= n || opts.some(o => RISKY.test(o)) || lettered(opts) || LETTER.test(ex) || /\bwrong\s*:|\bwhy\s*:\s*\[|\boptsT?\s*:/.test(ctx.split('}')[0])) { if (a < n) c[a]++; return m; }
    eligible++;
    const min = Math.min(...c), target = c[a] === min ? a : c.indexOf(min);
    c[target]++;
    if (target === a) return m;
    moved++;
    const swapped = toks.slice(); [swapped[a], swapped[target]] = [swapped[target], swapped[a]];
    let i = 0; const nb = body.replace(TOK, () => swapped[i++]);
    return m.replace(body, nb).replace(new RegExp(String.raw`\b${key}:\s*\d\b$`), `${key}: ${target}`);
  });
  return { text: outText, moved, eligible };
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  const write = process.argv.includes('--write'), counts = new Map(); let moved = 0, eligible = 0, changed = 0;
  for (const f of files()) {
    const rel = path.relative(path.join(ROOT, 'web'), f), group = rel.split('/').slice(0, 2).join('/');
    const src = fs.readFileSync(f, 'utf8'), r = balanceText(src, group, counts);
    moved += r.moved; eligible += r.eligible;
    if (r.text !== src) { changed++; if (write) fs.writeFileSync(f, r.text); }
  }
  console.log(`bank-balance: ${eligible} câu đủ điều kiện, đổi chỗ ${moved} câu trong ${changed} tệp${write ? ' (đã ghi)' : ' (chưa ghi)'}`);
}
