// Đối chiếu ngược gói nghĩa trên mạng (Google gtx, chạy trong word-packs.yml): với mẫu ngẫu nhiên mỗi ngôn ngữ, dịch NGƯỢC nghĩa → tiếng Anh
// và kiểm từ gốc có xuất hiện (bản dịch chính hoặc dịch ngược dt=bd) – xem backCheck ở scripts/lib/pack-gloss.mjs.
//   node scripts/pack-backcheck.mjs <lang|all> [--sample 60] [--max-bad 12] [--seed N]
// In danh sách mục nghi sai (để thêm vào content/wordlists/pack-fix.gloss.json); thoát 1 nếu tỉ lệ nghi sai > --max-bad (%).
import fs from 'fs';
import { backCheck } from './lib/pack-gloss.mjs';
const R = new URL('../', import.meta.url);
const A = process.argv, opt = (k, d) => { const i = A.indexOf(k); return i > 0 ? +A[i + 1] : d; };
const LANGS = fs.readFileSync(new URL('scripts/i18n-langs.txt', R), 'utf8').split('\n').map(s => s.trim()).filter(s => s && !s.startsWith('#'));
const arg = A[2] && !A[2].startsWith('--') ? A[2] : 'all', SAMPLE = opt('--sample', 60), MAXBAD = opt('--max-bad', 12);
let seed = opt('--seed', +new Date().toISOString().slice(0, 10).replace(/-/g, '')) >>> 0;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const tl = l => (l === 'zh' ? 'zh-CN' : l);
async function get(url) { for (let i = 0; i < 3; i++) { try { const r = await fetch(url); if (r.ok) return await r.json(); if (r.status === 429) await sleep(20000); } catch (e) { /* thử lại */ } await sleep(2000 * (i + 1)); } return null; }

let tot = 0, bad = 0, skipped = 0; const report = {};
for (const lang of arg === 'all' ? LANGS : [arg]) {
  const pack = JSON.parse(fs.readFileSync(new URL(`web/packs/${lang}.json`, R), 'utf8'));
  const keys = Object.keys(pack).filter(k => !k.includes('#') && !k.includes(' ')); // từ đơn: dịch ngược một từ ổn định
  for (let i = keys.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [keys[i], keys[j]] = [keys[j], keys[i]]; }
  const flagged = [];
  let n = 0;
  for (const k of keys.slice(0, SAMPLE)) {
    const term = pack[k][0].split(/[,;、，；]/)[0].replace(/\（.*?\）|\(.*?\)/g, '').trim();
    if (!term) continue;
    const j = await get(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=${tl(lang)}&tl=en&dt=t&dt=bd&q=${encodeURIComponent(term)}`);
    if (!j) { skipped++; break; }
    n++;
    if (!backCheck(k, j)) flagged.push([k, pack[k][0]]);
    await sleep(1200);
  }
  tot += n; bad += flagged.length;
  report[lang] = { checked: n, suspect: flagged.length, words: flagged };
  console.log(`${lang}: ${flagged.length}/${n} nghi sai` + (flagged.length ? ' → ' + flagged.slice(0, 15).map(x => x[0] + '=' + x[1]).join(' | ') : ''));
}
const pct = tot ? Math.round(1000 * bad / tot) / 10 : 0;
console.log(`Tổng: ${bad}/${tot} nghi sai (${pct}%) · bỏ dở ${skipped} ngôn ngữ do mạng/giới hạn`);
if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### Đối chiếu ngược gói nghĩa\n${bad}/${tot} nghi sai (${pct}%)\n\n` + Object.entries(report).map(([l, r]) => `- **${l}**: ${r.suspect}/${r.checked} — ${r.words.map(w => w[0] + '=' + w[1]).join(', ')}`).join('\n') + '\n');
if (tot && pct > MAXBAD) process.exit(1);
